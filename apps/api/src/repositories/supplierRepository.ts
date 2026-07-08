import { prisma } from "../lib/prisma.js";

export function findSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}
