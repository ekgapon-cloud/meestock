import { Router, type Router as RouterType } from "express";
import { getExecutiveDashboardHandler } from "../controllers/dashboardController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireAccessLevel, requireRole } from "../middleware/requireRole.js";

export const dashboardRouter: RouterType = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/executive",
  requireRole("EXECUTIVE"),
  requireAccessLevel("MANAGER", "ADMIN"),
  asyncHandler(getExecutiveDashboardHandler),
);
