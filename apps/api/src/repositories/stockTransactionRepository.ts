import type { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { employeeRefSelect } from "./employeeRepository.js";

type Client = Prisma.TransactionClient | typeof prisma;

export function sumQuantityChange(where: Prisma.StockTransactionWhereInput, client: Client = prisma) {
  return client.stockTransaction.aggregate({ where, _sum: { quantityChange: true } });
}

export function groupBalanceByMaterialWarehouse(where: Prisma.StockTransactionWhereInput) {
  return prisma.stockTransaction.groupBy({
    by: ["materialId", "warehouseId"],
    where,
    _sum: { quantityChange: true },
  });
}

export function groupBalanceByMaterial(where: Prisma.StockTransactionWhereInput) {
  return prisma.stockTransaction.groupBy({
    by: ["materialId"],
    where,
    _sum: { quantityChange: true },
  });
}

export function findTransactions(where: Prisma.StockTransactionWhereInput, skip: number, take: number) {
  return prisma.stockTransaction.findMany({
    where,
    skip,
    take,
    include: { material: true, warehouse: true, performedBy: { select: employeeRefSelect } },
    orderBy: { date: "desc" },
  });
}

export function countTransactions(where: Prisma.StockTransactionWhereInput) {
  return prisma.stockTransaction.count({ where });
}

export function createTransaction(data: Prisma.StockTransactionCreateInput, client: Client = prisma) {
  return client.stockTransaction.create({ data });
}

/** Ordered chronologically so weighted-average cost can be replayed transaction by transaction. */
export function findTransactionsForCostReplay(materialId: string, warehouseId: string) {
  return prisma.stockTransaction.findMany({
    where: { materialId, warehouseId },
    select: { quantityChange: true, unitCost: true, date: true, createdAt: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export function groupIssuedQuantityByMaterial(where: Prisma.StockTransactionWhereInput, take: number) {
  return prisma.stockTransaction.groupBy({
    by: ["materialId"],
    where: { ...where, type: "ISSUE" },
    _sum: { quantityChange: true },
    orderBy: { _sum: { quantityChange: "asc" } },
    take,
  });
}

export function findTransactionsByTypeForCosting(where: Prisma.StockTransactionWhereInput, type: TransactionType) {
  return prisma.stockTransaction.findMany({
    where: { ...where, type },
    select: { warehouseId: true, quantityChange: true, unitCost: true },
  });
}
