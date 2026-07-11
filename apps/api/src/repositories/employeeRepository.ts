import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  accessLevel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  siteAccess: { include: { warehouse: true } },
} satisfies Prisma.EmployeeSelect;

/**
 * Excludes passwordHash — use this (not a bare `true`) whenever another model's Prisma `include`
 * references an Employee relation (requester, createdBy, performedBy, ...), otherwise the bcrypt
 * hash round-trips straight into the API response. See materialIssue/purchaseOrder/goodsReceive/
 * stockTransaction repositories for the pattern.
 */
export const employeeRefSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  accessLevel: true,
} satisfies Prisma.EmployeeSelect;

export function findEmployeeByEmail(email: string) {
  return prisma.employee.findUnique({ where: { email } });
}

/** Excludes passwordHash — safe to return directly in API responses. */
export function findEmployeeById(id: string) {
  return prisma.employee.findUnique({ where: { id }, select: employeeSelect });
}

/** Includes passwordHash — for verifying the current password on self-service change. Never return directly. */
export function findEmployeeWithPasswordById(id: string) {
  return prisma.employee.findUnique({ where: { id } });
}

export function findEmployees(where: Prisma.EmployeeWhereInput, skip: number, take: number) {
  return prisma.employee.findMany({ where, skip, take, select: employeeSelect, orderBy: { name: "asc" } });
}

export function countEmployees(where: Prisma.EmployeeWhereInput) {
  return prisma.employee.count({ where });
}

export function createEmployee(data: Prisma.EmployeeCreateInput) {
  return prisma.employee.create({ data, select: employeeSelect });
}

export function updateEmployee(id: string, data: Prisma.EmployeeUpdateInput) {
  return prisma.employee.update({ where: { id }, data, select: employeeSelect });
}
