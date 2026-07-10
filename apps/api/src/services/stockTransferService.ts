import type { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { createWithDocNoRetry } from "../lib/docNoRetry.js";
import { extractDocNoSuffix } from "../lib/docNoSequence.js";
import { findMaterialById } from "../repositories/materialRepository.js";
import {
  createTransaction,
  findTransactionsForCostReplay,
  sumQuantityChange,
} from "../repositories/stockTransactionRepository.js";
import {
  countStockTransfers,
  createStockTransfer,
  findLatestDocNoWithPrefix,
  findStockTransferById,
  findStockTransfers,
  findTransferOutCosts,
  runInTransaction,
} from "../repositories/stockTransferRepository.js";
import type { CreateStockTransferInput, ListStockTransfersQuery } from "../validation/stockTransferSchema.js";
import { assertWarehouseAccessible } from "./accessControlService.js";
import { replayWeightedAverageCost } from "./reportingService.js";

function buildWhere(
  query: ListStockTransfersQuery,
  accessibleWarehouseIds: string[] | null,
): Prisma.StockTransferWhereInput {
  // A transfer touches two warehouses; it's visible if *either* endpoint is accessible.
  const scope: Prisma.StockTransferWhereInput = query.warehouseId
    ? { OR: [{ fromWarehouseId: query.warehouseId }, { toWarehouseId: query.warehouseId }] }
    : accessibleWarehouseIds
      ? { OR: [{ fromWarehouseId: { in: accessibleWarehouseIds } }, { toWarehouseId: { in: accessibleWarehouseIds } }] }
      : {};
  return scope;
}

export async function listStockTransfers(query: ListStockTransfersQuery, accessibleWarehouseIds: string[] | null) {
  if (query.warehouseId) {
    assertWarehouseAccessible(query.warehouseId, accessibleWarehouseIds);
  }
  if (accessibleWarehouseIds !== null && accessibleWarehouseIds.length === 0) {
    return { items: [], total: 0, page: query.page, limit: query.limit };
  }

  const where = buildWhere(query, accessibleWarehouseIds);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    findStockTransfers(where, skip, query.limit),
    countStockTransfers(where),
  ]);
  return { items, total, page: query.page, limit: query.limit };
}

export async function getStockTransfer(id: string, accessibleWarehouseIds: string[] | null) {
  const transfer = await findStockTransferById(id);
  if (!transfer) {
    throw new AppError("NOT_FOUND", "Stock transfer not found");
  }
  // Visible if the viewer can see either endpoint.
  if (accessibleWarehouseIds !== null) {
    const canSee =
      accessibleWarehouseIds.includes(transfer.fromWarehouseId) ||
      accessibleWarehouseIds.includes(transfer.toWarehouseId);
    if (!canSee) {
      throw new AppError("FORBIDDEN_SITE", "No access to this warehouse/site");
    }
  }

  // The moved value is captured on the TRANSFER_OUT ledger rows; surface it per item so the detail
  // view/PDF can show cost. Redaction for STAFF happens at the controller layer (canViewCost).
  const costRows = await findTransferOutCosts(transfer.id);
  const costByMaterialId = new Map(costRows.map((row) => [row.materialId, row.unitCost]));
  return {
    ...transfer,
    items: transfer.items.map((item) => ({ ...item, unitCost: costByMaterialId.get(item.materialId) ?? null })),
  };
}

async function generateDocNo(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `TR-${datePart}-`;
  const latestDocNo = await findLatestDocNoWithPrefix(prefix);
  const latestSuffix = latestDocNo ? extractDocNoSuffix(latestDocNo, prefix) : 0;
  return `${prefix}${String(latestSuffix + 1).padStart(4, "0")}`;
}

/** Weighted-average unit cost of a material at a warehouse right now, replayed from its full ledger. */
async function getSourceAvgCost(materialId: string, warehouseId: string): Promise<number> {
  const transactions = await findTransactionsForCostReplay(materialId, warehouseId);
  return replayWeightedAverageCost(transactions).avgCost;
}

export async function createStockTransferWithValidation(
  input: CreateStockTransferInput,
  createdById: string,
  ipAddress: string | undefined,
  accessibleWarehouseIds: string[] | null,
) {
  // Both endpoints must be accessible to the mover — you can't push stock into, or pull it out of,
  // a warehouse you're not allowed to see.
  assertWarehouseAccessible(input.fromWarehouseId, accessibleWarehouseIds);
  assertWarehouseAccessible(input.toWarehouseId, accessibleWarehouseIds);

  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new AppError("VALIDATION_ERROR", "Source and destination warehouses must be different");
  }

  const materials = await Promise.all(input.items.map((item) => findMaterialById(item.materialId)));
  materials.forEach((material, index) => {
    if (!material) {
      throw new AppError("NOT_FOUND", `Material ${input.items[index]!.materialId} not found`);
    }
  });

  // Capture the source warehouse's weighted-average cost per material *before* the move so both the
  // TRANSFER_OUT and TRANSFER_IN ledger rows carry it — a transfer relocates inventory value, it
  // doesn't create or revalue it (see skills/site-costing.md).
  const avgCostByMaterialId = new Map<string, number>();
  for (const item of input.items) {
    avgCostByMaterialId.set(item.materialId, await getSourceAvgCost(item.materialId, input.fromWarehouseId));
  }

  return createWithDocNoRetry(async () => {
    const docNo = await generateDocNo();

    return runInTransaction(async (tx) => {
      // Re-check the live balance inside the transaction so two concurrent transfers can't both
      // drain the same stock below zero.
      for (const item of input.items) {
        const balanceResult = await sumQuantityChange(
          { materialId: item.materialId, warehouseId: input.fromWarehouseId },
          tx,
        );
        const balance = Number(balanceResult._sum.quantityChange ?? 0);
        if (item.quantity > balance) {
          throw new AppError(
            "INSUFFICIENT_STOCK",
            `Only ${balance} of material ${item.materialId} available at the source warehouse`,
          );
        }
      }

      const transfer = await createStockTransfer(
        {
          docNo,
          fromWarehouse: { connect: { id: input.fromWarehouseId } },
          toWarehouse: { connect: { id: input.toWarehouseId } },
          createdBy: { connect: { id: createdById } },
          ...(ipAddress ? { ipAddress } : {}),
          items: { create: input.items.map((item) => ({ materialId: item.materialId, quantity: item.quantity })) },
        },
        tx,
      );

      for (const item of input.items) {
        const unitCost = avgCostByMaterialId.get(item.materialId) ?? 0;
        await createTransaction(
          {
            type: "TRANSFER_OUT",
            quantityChange: -item.quantity,
            unitCost,
            refDocType: "STOCK_TRANSFER",
            refDocId: transfer.id,
            material: { connect: { id: item.materialId } },
            warehouse: { connect: { id: input.fromWarehouseId } },
            performedBy: { connect: { id: createdById } },
            ...(ipAddress ? { ipAddress } : {}),
          },
          tx,
        );
        await createTransaction(
          {
            type: "TRANSFER_IN",
            quantityChange: item.quantity,
            unitCost,
            refDocType: "STOCK_TRANSFER",
            refDocId: transfer.id,
            material: { connect: { id: item.materialId } },
            warehouse: { connect: { id: input.toWarehouseId } },
            performedBy: { connect: { id: createdById } },
            ...(ipAddress ? { ipAddress } : {}),
          },
          tx,
        );
      }

      return transfer;
    });
  });
}
