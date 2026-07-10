import { prisma } from "../lib/prisma.js";

export function findCustomers() {
  return prisma.customer.findMany({ orderBy: { name: "asc" } });
}

export function findCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}
