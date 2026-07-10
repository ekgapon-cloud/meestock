import { Router, type Router as RouterType } from "express";
import {
  createStockCountHandler,
  getStockCountHandler,
  getStockCountSheetHandler,
  listStockCountsHandler,
} from "../controllers/stockCountController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const stockCountRouter: RouterType = Router();

stockCountRouter.use(authenticate);

stockCountRouter.get("/", asyncHandler(listStockCountsHandler));
// Static path must be registered before the "/:id" param route or it would be swallowed by it.
stockCountRouter.get("/count-sheet", requireRole("WAREHOUSE"), asyncHandler(getStockCountSheetHandler));
stockCountRouter.get("/:id", asyncHandler(getStockCountHandler));
stockCountRouter.post("/", requireRole("WAREHOUSE"), asyncHandler(createStockCountHandler));
