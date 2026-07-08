import { Router, type Router as RouterType } from "express";
import {
  createPurchaseOrderHandler,
  getPurchaseOrderHandler,
  listPurchaseOrdersHandler,
  updatePurchaseOrderStatusHandler,
} from "../controllers/purchaseOrderController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const purchaseOrderRouter: RouterType = Router();

purchaseOrderRouter.use(authenticate);

purchaseOrderRouter.get("/", asyncHandler(listPurchaseOrdersHandler));
purchaseOrderRouter.get("/:id", asyncHandler(getPurchaseOrderHandler));
purchaseOrderRouter.post("/", requireRole("PURCHASING"), asyncHandler(createPurchaseOrderHandler));
purchaseOrderRouter.patch("/:id/status", requireRole("PURCHASING"), asyncHandler(updatePurchaseOrderStatusHandler));
