import { Router, type Router as RouterType } from "express";
import { listWarehousesHandler } from "../controllers/warehouseController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";

export const warehouseRouter: RouterType = Router();

warehouseRouter.use(authenticate);

warehouseRouter.get("/", asyncHandler(listWarehousesHandler));
