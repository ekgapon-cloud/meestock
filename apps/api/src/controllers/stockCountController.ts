import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { canViewCost, redactItemsCost } from "../services/costVisibilityService.js";
import {
  createStockCountWithValidation,
  getStockCount,
  getStockCountSheet,
  listStockCounts,
} from "../services/stockCountService.js";
import { createStockCountSchema, listStockCountsQuerySchema } from "../validation/stockCountSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function listStockCountsHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = listStockCountsQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const result = await listStockCounts(query, accessibleWarehouseIds);
  const items = canViewCost(user.accessLevel) ? result.items : result.items.map(redactItemsCost);
  res.json({ ...result, items });
}

export async function getStockCountSheetHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const warehouseId = req.query["warehouseId"];
  if (typeof warehouseId !== "string" || warehouseId.length === 0) {
    throw new AppError("VALIDATION_ERROR", "warehouseId is required");
  }
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const rows = await getStockCountSheet(warehouseId, accessibleWarehouseIds);
  res.json(rows);
}

export async function getStockCountHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const count = await getStockCount(req.params["id"] as string, accessibleWarehouseIds);
  res.json(canViewCost(user.accessLevel) ? count : redactItemsCost(count));
}

export async function createStockCountHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createStockCountSchema.parse(req.body);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const count = await createStockCountWithValidation(input, user.id, req.ip, accessibleWarehouseIds);
  res.status(201).json(count);
}
