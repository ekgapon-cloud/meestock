import type { AccessLevel } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { findWarehouseIdsForEmployee } from "../repositories/userSiteAccessRepository.js";

/** null means "no restriction" — admin sees every warehouse/site. */
export async function getAccessibleWarehouseIds(
  employeeId: string,
  accessLevel: AccessLevel,
): Promise<string[] | null> {
  if (accessLevel === "ADMIN") {
    return null;
  }
  return findWarehouseIdsForEmployee(employeeId);
}

export function assertWarehouseAccessible(warehouseId: string, accessibleWarehouseIds: string[] | null): void {
  if (accessibleWarehouseIds === null) {
    return;
  }
  if (!accessibleWarehouseIds.includes(warehouseId)) {
    throw new AppError("FORBIDDEN_SITE", "No access to this warehouse/site");
  }
}
