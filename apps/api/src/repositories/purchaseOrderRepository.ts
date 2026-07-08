import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { employeeRefSelect } from "./employeeRepository.js";

type Client = Prisma.TransactionClient | typeof prisma;

const purchaseOrderInclude = {
  supplier: true,
  createdBy: { select: employeeRefSelect },
  items: { include: { material: true } },
} satisfies Prisma.PurchaseOrderInclude;

export function findPurchaseOrders(where: Prisma.PurchaseOrderWhereInput, skip: number, take: number) {
  return prisma.purchaseOrder.findMany({
    where,
    skip,
    take,
    include: purchaseOrderInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function countPurchaseOrders(where: Prisma.PurchaseOrderWhereInput) {
  return prisma.purchaseOrder.count({ where });
}

export function findPurchaseOrderById(id: string, client: Client = prisma) {
  return client.purchaseOrder.findUnique({ where: { id }, include: purchaseOrderInclude });
}

export async function findLatestDocNoWithPrefix(prefix: string, client: Client = prisma) {
  const latest = await client.purchaseOrder.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: "desc" },
    select: { docNo: true },
  });
  return latest?.docNo ?? null;
}

export function createPurchaseOrder(data: Prisma.PurchaseOrderCreateInput) {
  return prisma.purchaseOrder.create({ data, include: purchaseOrderInclude });
}

export function updatePurchaseOrder(id: string, data: Prisma.PurchaseOrderUpdateInput, client: Client = prisma) {
  return client.purchaseOrder.update({ where: { id }, data, include: purchaseOrderInclude });
}

export function updatePurchaseOrderItem(
  id: string,
  data: Prisma.PurchaseOrderItemUpdateInput,
  client: Client = prisma,
) {
  return client.purchaseOrderItem.update({ where: { id }, data });
}
