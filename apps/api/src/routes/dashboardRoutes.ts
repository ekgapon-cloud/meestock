import { Router, type Router as RouterType } from "express";
import { getExecutiveDashboardHandler, getStaffDashboardHandler } from "../controllers/dashboardController.js";
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

// Open to every authenticated user (including STAFF) — the response has no cost/value fields at all.
dashboardRouter.get("/staff", asyncHandler(getStaffDashboardHandler));
