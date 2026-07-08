import { prisma } from "../lib/prisma.js";

export async function findWarehouseIdsForEmployee(employeeId: string): Promise<string[]> {
  const rows = await prisma.userSiteAccess.findMany({
    where: { employeeId },
    select: { warehouseId: true },
  });
  return rows.map((row) => row.warehouseId);
}

export function createSiteAccess(employeeId: string, warehouseId: string) {
  return prisma.userSiteAccess.upsert({
    where: { employeeId_warehouseId: { employeeId, warehouseId } },
    update: {},
    create: { employeeId, warehouseId },
  });
}

export function deleteSiteAccess(employeeId: string, warehouseId: string) {
  return prisma.userSiteAccess.deleteMany({ where: { employeeId, warehouseId } });
}
