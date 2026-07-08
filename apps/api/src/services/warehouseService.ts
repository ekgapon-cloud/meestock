import type { Prisma } from "@prisma/client";
import { findWarehouses } from "../repositories/warehouseRepository.js";

export function listWarehouses(accessibleWarehouseIds: string[] | null) {
  const where: Prisma.WarehouseWhereInput = accessibleWarehouseIds ? { id: { in: accessibleWarehouseIds } } : {};
  return findWarehouses(where);
}
