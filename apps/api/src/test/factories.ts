import type { AccessLevel, EmployeeRole, WarehouseType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export function createEmployee(overrides: { role: EmployeeRole; accessLevel?: AccessLevel; email?: string }) {
  return prisma.employee.create({
    data: {
      name: unique("Employee"),
      email: overrides.email ?? `${unique("employee")}@test.local`,
      role: overrides.role,
      accessLevel: overrides.accessLevel ?? "STAFF",
      passwordHash: "not-used-in-tests",
    },
  });
}

export async function createProjectWarehouse(type: WarehouseType = "SITE") {
  const customer = await prisma.customer.create({ data: { name: unique("Customer") } });
  const project = await prisma.project.create({
    data: {
      code: unique("PRJ"),
      name: unique("Project"),
      customerId: customer.id,
      startDate: new Date(),
      contractValue: 100000,
    },
  });
  const warehouse = await prisma.warehouse.create({
    data: { name: unique("Warehouse"), type, ...(type === "SITE" ? { projectId: project.id } : {}) },
  });
  return { customer, project, warehouse };
}

export async function createMaterial(overrides?: { standardCost?: number }) {
  const category = await prisma.category.create({ data: { name: unique("Category") } });
  return prisma.material.create({
    data: {
      code: unique("MAT"),
      name: unique("Material"),
      categoryId: category.id,
      unit: "unit",
      standardCost: overrides?.standardCost ?? 10,
    },
  });
}

export function grantSiteAccess(employeeId: string, warehouseId: string) {
  return prisma.userSiteAccess.create({ data: { employeeId, warehouseId } });
}
