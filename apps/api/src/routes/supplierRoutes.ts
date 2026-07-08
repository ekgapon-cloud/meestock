import { Router, type Router as RouterType } from "express";
import { listSuppliersHandler } from "../controllers/supplierController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";

export const supplierRouter: RouterType = Router();

supplierRouter.use(authenticate);

supplierRouter.get("/", asyncHandler(listSuppliersHandler));
