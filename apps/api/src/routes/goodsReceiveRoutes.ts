import { Router, type Router as RouterType } from "express";
import {
  createGoodsReceiveHandler,
  getGoodsReceiveHandler,
  listGoodsReceivesHandler,
} from "../controllers/goodsReceiveController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const goodsReceiveRouter: RouterType = Router();

goodsReceiveRouter.use(authenticate);

goodsReceiveRouter.get("/", asyncHandler(listGoodsReceivesHandler));
goodsReceiveRouter.get("/:id", asyncHandler(getGoodsReceiveHandler));
goodsReceiveRouter.post("/", requireRole("WAREHOUSE"), asyncHandler(createGoodsReceiveHandler));
