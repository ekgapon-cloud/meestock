import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { canViewCost, redactItemsCost } from "../services/costVisibilityService.js";
import {
  createGoodsReceiveWithValidation,
  getGoodsReceive,
  listGoodsReceives,
} from "../services/goodsReceiveService.js";
import { createGoodsReceiveSchema, listGoodsReceivesQuerySchema } from "../validation/goodsReceiveSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function listGoodsReceivesHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = listGoodsReceivesQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const result = await listGoodsReceives(query, accessibleWarehouseIds);
  const items = canViewCost(user.accessLevel) ? result.items : result.items.map(redactItemsCost);
  res.json({ ...result, items });
}

export async function getGoodsReceiveHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const goodsReceive = await getGoodsReceive(req.params["id"] as string, accessibleWarehouseIds);
  res.json(canViewCost(user.accessLevel) ? goodsReceive : redactItemsCost(goodsReceive));
}

export async function createGoodsReceiveHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createGoodsReceiveSchema.parse(req.body);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const goodsReceive = await createGoodsReceiveWithValidation(input, user.id, req.ip, accessibleWarehouseIds);
  res.status(201).json(canViewCost(user.accessLevel) ? goodsReceive : redactItemsCost(goodsReceive));
}
