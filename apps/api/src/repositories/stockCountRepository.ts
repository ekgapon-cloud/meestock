import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { employeeRefSelect } from "./employeeRepository.js";

type Client = Prisma.TransactionClient | typeof prisma;

const stockCountInclude = {
  warehouse: true,
  editedBy: { select: employeeRefSelect },
  items: { include: { material: true } },
} satisfies Prisma.StockCountInclude;

export function findStockCounts(where: Prisma.StockCountWhereInput, skip: number, take: number) {
  return prisma.stockCount.findMany({
    where,
    skip,
    take,
    include: stockCountInclude,
    orderBy: { editedAt: "desc" },
  });
}

export function countStockCounts(where: Prisma.StockCountWhereInput) {
  return prisma.stockCount.count({ where });
}

export function findStockCountById(id: string, client: Client = prisma) {
  return client.stockCount.findUnique({ where: { id }, include: stockCountInclude });
}

export async function findLatestDocNoWithPrefix(prefix: string, client: Client = prisma) {
  const latest = await client.stockCount.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: "desc" },
    select: { docNo: true },
  });
  return latest?.docNo ?? null;
}

export function createStockCount(data: Prisma.StockCountCreateInput, client: Client = prisma) {
  return client.stockCount.create({ data, include: stockCountInclude });
}

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
