import type { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { createWithDocNoRetry } from "../lib/docNoRetry.js";
import { extractDocNoSuffix } from "../lib/docNoSequence.js";
import { findMaterialById, findMaterials } from "../repositories/materialRepository.js";
import {
  createTransaction,
  findTransactionsForCostReplay,
  groupBalanceByMaterialWarehouse,
  sumQuantityChange,
} from "../repositories/stockTransactionRepository.js";
import {
  countStockCounts,
  createStockCount,
  findLatestDocNoWithPrefix,
  findStockCountById,
  findStockCounts,
  runInTransaction,
} from "../repositories/stockCountRepository.js";
import type { CreateStockCountInput, ListStockCountsQuery } from "../validation/stockCountSchema.js";
import { assertWarehouseAccessible } from "./accessControlService.js";
import { replayWeightedAverageCost } from "./reportingService.js";

function buildWhere(query: ListStockCountsQuery, accessibleWarehouseIds: string[] | null): Prisma.StockCountWhereInput {
  if (query.warehouseId) return { warehouseId: query.warehouseId };
  if (accessibleWarehouseIds) return { warehouseId: { in: accessibleWarehouseIds } };
  return {};
}

export async function listStockCounts(query: ListStockCountsQuery, accessibleWarehouseIds: string[] | null) {
  if (query.warehouseId) {
    assertWarehouseAccessible(query.warehouseId, accessibleWarehouseIds);
  }
  if (accessibleWarehouseIds !== null && accessibleWarehouseIds.length === 0) {
    return { items: [], total: 0, page: query.page, limit: query.limit };
  }

  const where = buildWhere(query, accessibleWarehouseIds);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    findStockCounts(where, skip, query.limit),
    countStockCounts(where),
  ]);
  return { items, total, page: query.page, limit: query.limit };
}

/**
 * The list of materials to count in a warehouse: everything currently on the shelf (ledger
 * balance > 0), with the system quantity to compare against. Returns a trimmed material shape
 * (no cost fields) so there's nothing to redact.
 */
export async function getStockCountSheet(warehouseId: string, accessibleWarehouseIds: string[] | null) {
  assertWarehouseAccessible(warehouseId, accessibleWarehouseIds);

  const grouped = await groupBalanceByMaterialWarehouse({ warehouseId });
  const rows = grouped
    .map((g) => ({ materialId: g.materialId, systemQty: Number(g._sum.quantityChange ?? 0) }))
    .filter((r) => r.systemQty > 0);
  if (rows.length === 0) return [];

  const materials = await findMaterials({ id: { in: rows.map((r) => r.materialId) } }, 0, rows.length);
  const byId = new Map(materials.map((m) => [m.id, m]));

  return rows
    .filter((r) => byId.has(r.materialId))
    .map((r) => {
      const m = byId.get(r.materialId)!;
      return { materialId: r.materialId, systemQty: r.systemQty, material: { id: m.id, code: m.code, name: m.name, unit: m.unit } };
    })
    .sort((a, b) => a.material.code.localeCompare(b.material.code));
}

export async function getStockCount(id: string, accessibleWarehouseIds: string[] | null) {
  const count = await findStockCountById(id);
  if (!count) {
    throw new AppError("NOT_FOUND", "Stock count not found");
  }
  assertWarehouseAccessible(count.warehouseId, accessibleWarehouseIds);
  return count;
}

async function generateDocNo(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `SC-${datePart}-`;
  const latestDocNo = await findLatestDocNoWithPrefix(prefix);
  const latestSuffix = latestDocNo ? extractDocNoSuffix(latestDocNo, prefix) : 0;
  return `${prefix}${String(latestSuffix + 1).padStart(4, "0")}`;
}

/** Weighted-average unit cost of a material at a warehouse right now, replayed from its full ledger. */
async function getAvgCost(materialId: string, warehouseId: string): Promise<number> {
  const transactions = await findTransactionsForCostReplay(materialId, warehouseId);
  return replayWeightedAverageCost(transactions).avgCost;
}

export async function createStockCountWithValidation(
  input: CreateStockCountInput,
  editedById: string,
  ipAddress: string | undefined,
  accessibleWarehouseIds: string[] | null,
) {
  assertWarehouseAccessible(input.warehouseId, accessibleWarehouseIds);

  const materials = await Promise.all(input.items.map((item) => findMaterialById(item.materialId)));
  materials.forEach((material, index) => {
    if (!material) {
      throw new AppError("NOT_FOUND", `Material ${input.items[index]!.materialId} not found`);
    }
  });

  // Capture the current weighted-average cost per material *before* the count so any ADJUSTMENT row
  // is valued at the prevailing avg — a correction relocates/removes value at the current cost, it
  // doesn't revalue the remaining stock (see skills/site-costing.md).
  const avgCostByMaterialId = new Map<string, number>();
  for (const item of input.items) {
    avgCostByMaterialId.set(item.materialId, await getAvgCost(item.materialId, input.warehouseId));
  }

  return createWithDocNoRetry(async () => {
    const docNo = await generateDocNo();

    return runInTransaction(async (tx) => {
      // systemQty is the ledger balance *at count time*, computed inside the transaction so a
      // concurrent stock move can't leave a stale variance. The client never supplies it.
      const systemQtyByMaterialId = new Map<string, number>();
      for (const item of input.items) {
        const balanceResult = await sumQuantityChange(
          { materialId: item.materialId, warehouseId: input.warehouseId },
          tx,
        );
        systemQtyByMaterialId.set(item.materialId, Number(balanceResult._sum.quantityChange ?? 0));
      }

      // A discrepancy must carry a reason (docs/business-rules.md §5.2).
      for (const item of input.items) {
        const systemQty = systemQtyByMaterialId.get(item.materialId)!;
        if (item.actualQty !== systemQty && !item.reason) {
          throw new AppError("VALIDATION_ERROR", `A reason is required for material ${item.materialId} (counted ${item.actualQty} vs system ${systemQty})`);
        }
      }

      const stockCount = await createStockCount(
        {
          docNo,
          warehouse: { connect: { id: input.warehouseId } },
          editedBy: { connect: { id: editedById } },
          ...(ipAddress ? { ipAddress } : {}),
          items: {
            create: input.items.map((item) => ({
              materialId: item.materialId,
              systemQty: systemQtyByMaterialId.get(item.materialId)!,
              actualQty: item.actualQty,
              ...(item.reason ? { reason: item.reason } : {}),
            })),
          },
        },
        tx,
      );

      for (const item of input.items) {
        const systemQty = systemQtyByMaterialId.get(item.materialId)!;
        const delta = item.actualQty - systemQty;
        if (delta === 0) continue; // no variance — no ledger movement

        await createTransaction(
          {
            type: "ADJUSTMENT",
            quantityChange: delta,
            unitCost: avgCostByMaterialId.get(item.materialId) ?? 0,
            refDocType: "STOCK_COUNT",
            refDocId: stockCount.id,
            ...(item.reason ? { note: item.reason } : {}),
            material: { connect: { id: item.materialId } },
            warehouse: { connect: { id: input.warehouseId } },
            performedBy: { connect: { id: editedById } },
            ...(ipAddress ? { ipAddress } : {}),
          },
          tx,
        );
      }

      return stockCount;
    });
  });
}
