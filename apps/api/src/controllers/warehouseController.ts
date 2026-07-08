import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { listWarehouses } from "../services/warehouseService.js";

export async function listWarehousesHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(req.user.id, req.user.accessLevel);
  const warehouses = await listWarehouses(accessibleWarehouseIds);
  res.json(warehouses);
}
