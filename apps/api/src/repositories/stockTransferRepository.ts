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

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
