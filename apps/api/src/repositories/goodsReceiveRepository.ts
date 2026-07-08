import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { employeeRefSelect } from "./employeeRepository.js";

type Client = Prisma.TransactionClient | typeof prisma;

const goodsReceiveInclude = {
  warehouse: true,
  supplier: true,
  purchaseOrder: true,
  createdBy: { select: employeeRefSelect },
  items: { include: { material: true } },
} satisfies Prisma.GoodsReceiveInclude;

export function findGoodsReceives(where: Prisma.GoodsReceiveWhereInput, skip: number, take: number) {
  return prisma.goodsReceive.findMany({
    where,
    skip,
    take,
    include: goodsReceiveInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function countGoodsReceives(where: Prisma.GoodsReceiveWhereInput) {
  return prisma.goodsReceive.count({ where });
}

export function findGoodsReceiveById(id: string, client: Client = prisma) {
  return client.goodsReceive.findUnique({ where: { id }, include: goodsReceiveInclude });
}

export async function findLatestDocNoWithPrefix(prefix: string, client: Client = prisma) {
  const latest = await client.goodsReceive.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: "desc" },
    select: { docNo: true },
  });
  return latest?.docNo ?? null;
}

export function createGoodsReceive(data: Prisma.GoodsReceiveCreateInput, client: Client = prisma) {
  return client.goodsReceive.create({ data, include: goodsReceiveInclude });
}

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
