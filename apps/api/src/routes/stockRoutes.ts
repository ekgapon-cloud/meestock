import { Router, type Router as RouterType } from "express";
import {
  adjustStockHandler,
  getStockBalanceHandler,
  getStockLedgerHandler,
  receiveStockHandler,
} from "../controllers/stockController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const stockRouter: RouterType = Router();

stockRouter.use(authenticate);

stockRouter.get("/balance", asyncHandler(getStockBalanceHandler));
stockRouter.get("/ledger", asyncHandler(getStockLedgerHandler));
stockRouter.post("/receive", requireRole("WAREHOUSE"), asyncHandler(receiveStockHandler));
stockRouter.post("/adjust", requireRole("WAREHOUSE"), asyncHandler(adjustStockHandler));
