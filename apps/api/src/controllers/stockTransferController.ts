import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { canViewCost, redactItemsCost } from "../services/costVisibilityService.js";
import {
  createStockTransferWithValidation,
  getStockTransfer,
  listStockTransfers,
} from "../services/stockTransferService.js";
import { createStockTransferSchema, listStockTransfersQuerySchema } from "../validation/stockTransferSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function listStockTransfersHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = listStockTransfersQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const result = await listStockTransfers(query, accessibleWarehouseIds);
  const items = canViewCost(user.accessLevel) ? result.items : result.items.map(redactItemsCost);
  res.json({ ...result, items });
}

export async function getStockTransferHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const transfer = await getStockTransfer(req.params["id"] as string, accessibleWarehouseIds);
  res.json(canViewCost(user.accessLevel) ? transfer : redactItemsCost(transfer));
}

export async function createStockTransferHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createStockTransferSchema.parse(req.body);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const transfer = await createStockTransferWithValidation(input, user.id, req.ip, accessibleWarehouseIds);
  res.status(201).json(transfer);
}
