import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { employeeRefSelect } from "./employeeRepository.js";

type Client = Prisma.TransactionClient | typeof prisma;

const stockTransferInclude = {
  fromWarehouse: true,
  toWarehouse: true,
  createdBy: { select: employeeRefSelect },
  items: { include: { material: true } },
} satisfies Prisma.StockTransferInclude;

export function findStockTransfers(where: Prisma.StockTransferWhereInput, skip: number, take: number) {
  return prisma.stockTransfer.findMany({
    where,
    skip,
    take,
    include: stockTransferInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function countStockTransfers(where: Prisma.StockTransferWhereInput) {
  return prisma.stockTransfer.count({ where });
}

export function findStockTransferById(id: string, client: Client = prisma) {
  return client.stockTransfer.findUnique({ where: { id }, include: stockTransferInclude });
}

export async function findLatestDocNoWithPrefix(prefix: string, client: Client = prisma) {
  const latest = await client.stockTransfer.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: "desc" },
    select: { docNo: true },
  });
  return latest?.docNo ?? null;
}

export function createStockTransfer(data: Prisma.StockTransferCreateInput, client: Client = prisma) {
  return client.stockTransfer.create({ data, include: stockTransferInclude });
}

/**
 * The per-item captured cost lives on the TRANSFER_OUT ledger rows, not on StockTransferItem
 * (refDoc is polymorphic, so there's no Prisma relation to `include`). One TRANSFER_OUT row exists
 * per material moved, all carrying the source warehouse's weighted-average cost at move time.
 */
export function findTransferOutCosts(transferId: string, client: Client = prisma) {
  return client.stockTransaction.findMany({
    where: { refDocType: "STOCK_TRANSFER", refDocId: transferId, type: "TRANSFER_OUT" },
    select: { materialId: true, unitCost: true },
  });
}

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
