import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findWarehouseById(id: string) {
  return prisma.warehouse.findUnique({ where: { id } });
}

export function findWarehousesByIds(ids: string[]) {
  if (ids.length === 0) {
    return Promise.resolve([]);
  }
  return prisma.warehouse.findMany({ where: { id: { in: ids } } });
}

export function findWarehouses(where: Prisma.WarehouseWhereInput) {
  return prisma.warehouse.findMany({ where, include: { project: true }, orderBy: { name: "asc" } });
}
