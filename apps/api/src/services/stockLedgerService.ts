import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import {
  countTransactions,
  createTransaction,
  findTransactions,
  groupBalanceByMaterialWarehouse,
  sumQuantityChange,
} from "../repositories/stockTransactionRepository.js";
import type {
  AdjustStockInput,
  ReceiveStockInput,
  StockBalanceQuery,
  StockLedgerQuery,
} from "../validation/stockSchema.js";
import { assertWarehouseAccessible } from "./accessControlService.js";

function buildWhere(
  query: StockBalanceQuery,
  accessibleWarehouseIds: string[] | null,
): Prisma.StockTransactionWhereInput {
  return {
    ...(query.warehouseId
      ? { warehouseId: query.warehouseId }
      : accessibleWarehouseIds
        ? { warehouseId: { in: accessibleWarehouseIds } }
        : {}),
    ...(query.materialId ? { materialId: query.materialId } : {}),
  };
}

export async function getStockBalance(query: StockBalanceQuery, accessibleWarehouseIds: string[] | null) {
  if (query.warehouseId) {
    assertWarehouseAccessible(query.warehouseId, accessibleWarehouseIds);
  }
  if (accessibleWarehouseIds !== null && accessibleWarehouseIds.length === 0) {
    return [];
  }

  const where = buildWhere(query, accessibleWarehouseIds);
  const grouped = await groupBalanceByMaterialWarehouse(where);

  return grouped.map((row) => ({
    materialId: row.materialId,
    warehouseId: row.warehouseId,
    balance: row._sum.quantityChange ?? 0,
  }));
}

export async function getStockLedger(query: StockLedgerQuery, accessibleWarehouseIds: string[] | null) {
  if (query.warehouseId) {
    assertWarehouseAccessible(query.warehouseId, accessibleWarehouseIds);
  }
  if (accessibleWarehouseIds !== null && accessibleWarehouseIds.length === 0) {
    return { items: [], total: 0, page: query.page, limit: query.limit };
  }

  const where = buildWhere(query, accessibleWarehouseIds);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    findTransactions(where, skip, query.limit),
    countTransactions(where),
  ]);

  return { items, total, page: query.page, limit: query.limit };
}

async function getCurrentBalance(materialId: string, warehouseId: string): Promise<number> {
  const result = await sumQuantityChange({ materialId, warehouseId });
  return Number(result._sum.quantityChange ?? 0);
}

export async function receiveStock(
  input: ReceiveStockInput,
  performedById: string,
  ipAddress: string | undefined,
  accessibleWarehouseIds: string[] | null,
) {
  assertWarehouseAccessible(input.warehouseId, accessibleWarehouseIds);

  const id = randomUUID();
  return createTransaction({
    id,
    type: "RECEIVE",
    quantityChange: input.quantity,
    unitCost: input.unitCost,
    refDocType: "STOCK_RECEIVE",
    refDocId: id,
    ...(ipAddress ? { ipAddress } : {}),
    material: { connect: { id: input.materialId } },
    warehouse: { connect: { id: input.warehouseId } },
    performedBy: { connect: { id: performedById } },
  });
}

export async function adjustStock(
  input: AdjustStockInput,
  performedById: string,
  ipAddress: string | undefined,
  accessibleWarehouseIds: string[] | null,
) {
  assertWarehouseAccessible(input.warehouseId, accessibleWarehouseIds);

  if (input.quantityChange < 0) {
    const currentBalance = await getCurrentBalance(input.materialId, input.warehouseId);
    if (currentBalance + input.quantityChange < 0) {
      throw new AppError("INSUFFICIENT_STOCK", "Adjustment would make stock balance negative");
    }
  }

  const id = randomUUID();
  return createTransaction({
    id,
    type: "ADJUSTMENT",
    quantityChange: input.quantityChange,
    unitCost: input.unitCost,
    refDocType: "STOCK_ADJUSTMENT",
    refDocId: id,
    note: input.reason,
    ...(ipAddress ? { ipAddress } : {}),
    material: { connect: { id: input.materialId } },
    warehouse: { connect: { id: input.warehouseId } },
    performedBy: { connect: { id: performedById } },
  });
}
