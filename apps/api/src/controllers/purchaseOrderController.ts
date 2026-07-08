import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  createPurchaseOrderWithValidation,
  getPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrderStatus,
} from "../services/purchaseOrderService.js";
import {
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  updatePurchaseOrderStatusSchema,
} from "../validation/purchaseOrderSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function listPurchaseOrdersHandler(req: Request, res: Response) {
  const query = listPurchaseOrdersQuerySchema.parse(req.query);
  const result = await listPurchaseOrders(query);
  res.json(result);
}

export async function getPurchaseOrderHandler(req: Request, res: Response) {
  const po = await getPurchaseOrder(req.params["id"] as string);
  res.json(po);
}

export async function createPurchaseOrderHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createPurchaseOrderSchema.parse(req.body);
  const po = await createPurchaseOrderWithValidation(input, user.id, req.ip);
  res.status(201).json(po);
}

export async function updatePurchaseOrderStatusHandler(req: Request, res: Response) {
  const input = updatePurchaseOrderStatusSchema.parse(req.body);
  const po = await updatePurchaseOrderStatus(req.params["id"] as string, input);
  res.json(po);
}
