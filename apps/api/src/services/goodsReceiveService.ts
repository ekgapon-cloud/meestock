import type { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { createWithDocNoRetry } from "../lib/docNoRetry.js";
import { extractDocNoSuffix } from "../lib/docNoSequence.js";
import { findMaterialById } from "../repositories/materialRepository.js";
import {
  countGoodsReceives,
  createGoodsReceive,
  findGoodsReceiveById,
  findGoodsReceives,
  findLatestDocNoWithPrefix,
  runInTransaction,
} from "../repositories/goodsReceiveRepository.js";
import {
  findPurchaseOrderById,
  updatePurchaseOrder,
  updatePurchaseOrderItem,
} from "../repositories/purchaseOrderRepository.js";
import { createTransaction } from "../repositories/stockTransactionRepository.js";
import type { CreateGoodsReceiveInput, ListGoodsReceivesQuery } from "../validation/goodsReceiveSchema.js";
import { assertWarehouseAccessible } from "./accessControlService.js";

function buildWhere(
  query: ListGoodsReceivesQuery,
  accessibleWarehouseIds: string[] | null,
): Prisma.GoodsReceiveWhereInput {
  return {
    ...(query.warehouseId
      ? { warehouseId: query.warehouseId }
      : accessibleWarehouseIds
        ? { warehouseId: { in: accessibleWarehouseIds } }
        : {}),
    ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
  };
}

export async function listGoodsReceives(query: ListGoodsReceivesQuery, accessibleWarehouseIds: string[] | null) {
  if (query.warehouseId) {
    assertWarehouseAccessible(query.warehouseId, accessibleWarehouseIds);
  }
  if (accessibleWarehouseIds !== null && accessibleWarehouseIds.length === 0) {
    return { items: [], total: 0, page: query.page, limit: query.limit };
  }

  const where = buildWhere(query, accessibleWarehouseIds);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    findGoodsReceives(where, skip, query.limit),
    countGoodsReceives(where),
  ]);
  return { items, total, page: query.page, limit: query.limit };
}

export async function getGoodsReceive(id: string, accessibleWarehouseIds: string[] | null) {
  const goodsReceive = await findGoodsReceiveById(id);
  if (!goodsReceive) {
    throw new AppError("NOT_FOUND", "Goods receive not found");
  }
  assertWarehouseAccessible(goodsReceive.warehouseId, accessibleWarehouseIds);
  return goodsReceive;
}

async function generateDocNo(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `GR-${datePart}-`;
  const latestDocNo = await findLatestDocNoWithPrefix(prefix);
  const latestSuffix = latestDocNo ? extractDocNoSuffix(latestDocNo, prefix) : 0;
  return `${prefix}${String(latestSuffix + 1).padStart(4, "0")}`;
}

export async function createGoodsReceiveWithValidation(
  input: CreateGoodsReceiveInput,
  createdById: string,
  ipAddress: string | undefined,
  accessibleWarehouseIds: string[] | null,
) {
  assertWarehouseAccessible(input.warehouseId, accessibleWarehouseIds);

  if (!input.purchaseOrderId && !input.supplierId) {
    throw new AppError("VALIDATION_ERROR", "supplierId or purchaseOrderId is required for a goods receive");
  }

  const materials = await Promise.all(input.items.map((item) => findMaterialById(item.materialId)));
  materials.forEach((material, index) => {
    if (!material) {
      throw new AppError("NOT_FOUND", `Material ${input.items[index]!.materialId} not found`);
    }
  });

  const purchaseOrder = input.purchaseOrderId ? await findPurchaseOrderById(input.purchaseOrderId) : null;
  if (input.purchaseOrderId && !purchaseOrder) {
    throw new AppError("NOT_FOUND", "Purchase order not found");
  }

  if (purchaseOrder) {
    if (purchaseOrder.status !== "ORDERED" && purchaseOrder.status !== "PARTIALLY_RECEIVED") {
      throw new AppError(
        "INVALID_WORKFLOW_STATE",
        `Purchase order must be ORDERED or PARTIALLY_RECEIVED to receive against it, currently ${purchaseOrder.status}`,
      );
    }

    for (const item of input.items) {
      const poItem = purchaseOrder.items.find((i) => i.materialId === item.materialId);
      if (!poItem) {
        throw new AppError("VALIDATION_ERROR", `Material ${item.materialId} is not part of this purchase order`);
      }
      const remaining = Number(poItem.orderedQty) - Number(poItem.receivedQty);
      if (item.quantity > remaining) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Received quantity for material ${item.materialId} (${item.quantity}) exceeds remaining ordered quantity (${remaining})`,
        );
      }
    }
  }

  const itemsData: Prisma.GoodsReceiveItemUncheckedCreateWithoutGoodsReceiveInput[] = input.items.map((item) => ({
    materialId: item.materialId,
    quantity: item.quantity,
    unitCost: item.unitCost,
  }));

  return createWithDocNoRetry(async () => {
    const docNo = await generateDocNo();

    return runInTransaction(async (tx) => {
      const goodsReceive = await createGoodsReceive(
        {
          docNo,
          warehouse: { connect: { id: input.warehouseId } },
          createdBy: { connect: { id: createdById } },
          ...(input.supplierId ? { supplier: { connect: { id: input.supplierId } } } : {}),
          ...(input.purchaseOrderId ? { purchaseOrder: { connect: { id: input.purchaseOrderId } } } : {}),
          ...(ipAddress ? { ipAddress } : {}),
          items: { create: itemsData },
        },
        tx,
      );

      for (const item of input.items) {
        await createTransaction(
          {
            type: "RECEIVE",
            quantityChange: item.quantity,
            unitCost: item.unitCost,
            refDocType: "GOODS_RECEIVE",
            refDocId: goodsReceive.id,
            material: { connect: { id: item.materialId } },
            warehouse: { connect: { id: input.warehouseId } },
            performedBy: { connect: { id: createdById } },
            ...(ipAddress ? { ipAddress } : {}),
          },
          tx,
        );
      }

      if (purchaseOrder) {
        for (const item of input.items) {
          const poItem = purchaseOrder.items.find((i) => i.materialId === item.materialId)!;
          await updatePurchaseOrderItem(poItem.id, { receivedQty: { increment: item.quantity } }, tx);
        }

        const refreshedPo = await findPurchaseOrderById(purchaseOrder.id, tx);
        const allReceived = refreshedPo!.items.every((i) => Number(i.receivedQty) >= Number(i.orderedQty));
        const anyReceived = refreshedPo!.items.some((i) => Number(i.receivedQty) > 0);
        const newStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : purchaseOrder.status;
        await updatePurchaseOrder(purchaseOrder.id, { status: newStatus }, tx);
      }

      return goodsReceive;
    });
  });
}
