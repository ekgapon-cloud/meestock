import { Router, type Router as RouterType } from "express";
import {
  createMaterialHandler,
  deleteMaterialHandler,
  getMaterialByCodeHandler,
  getMaterialHandler,
  listMaterialsHandler,
  updateMaterialHandler,
} from "../controllers/materialController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const materialRouter: RouterType = Router();

materialRouter.use(authenticate);

materialRouter.get("/", asyncHandler(listMaterialsHandler));
materialRouter.get("/by-code/:code", asyncHandler(getMaterialByCodeHandler));
materialRouter.get("/:id", asyncHandler(getMaterialHandler));
materialRouter.post("/", requireRole("WAREHOUSE"), asyncHandler(createMaterialHandler));
materialRouter.patch("/:id", requireRole("WAREHOUSE"), asyncHandler(updateMaterialHandler));
materialRouter.delete("/:id", requireRole(), asyncHandler(deleteMaterialHandler));
