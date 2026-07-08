import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { canViewCost, redactCost } from "../services/costVisibilityService.js";
import { adjustStock, getStockBalance, getStockLedger, receiveStock } from "../services/stockLedgerService.js";
import {
  adjustStockSchema,
  receiveStockSchema,
  stockBalanceQuerySchema,
  stockLedgerQuerySchema,
} from "../validation/stockSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function getStockBalanceHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = stockBalanceQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const balance = await getStockBalance(query, accessibleWarehouseIds);
  res.json({ items: balance });
}

export async function getStockLedgerHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = stockLedgerQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const result = await getStockLedger(query, accessibleWarehouseIds);
  const items = canViewCost(user.accessLevel) ? result.items : result.items.map(redactCost);
  res.json({ ...result, items });
}

export async function receiveStockHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = receiveStockSchema.parse(req.body);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const transaction = await receiveStock(input, user.id, req.ip, accessibleWarehouseIds);
  res.status(201).json(canViewCost(user.accessLevel) ? transaction : redactCost(transaction));
}

export async function adjustStockHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = adjustStockSchema.parse(req.body);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const transaction = await adjustStock(input, user.id, req.ip, accessibleWarehouseIds);
  res.status(201).json(canViewCost(user.accessLevel) ? transaction : redactCost(transaction));
}
