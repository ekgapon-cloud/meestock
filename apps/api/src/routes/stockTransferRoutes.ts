import { Router, type Router as RouterType } from "express";
import {
  createStockTransferHandler,
  getStockTransferHandler,
  listStockTransfersHandler,
} from "../controllers/stockTransferController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const stockTransferRouter: RouterType = Router();

stockTransferRouter.use(authenticate);

stockTransferRouter.get("/", asyncHandler(listStockTransfersHandler));
stockTransferRouter.get("/:id", asyncHandler(getStockTransferHandler));
stockTransferRouter.post("/", requireRole("WAREHOUSE"), asyncHandler(createStockTransferHandler));
