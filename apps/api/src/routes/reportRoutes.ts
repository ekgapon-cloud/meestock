import { Router, type Router as RouterType } from "express";
import {
  getIssueHistoryReportHandler,
  getLowStockReportHandler,
  getSiteFinancialSummaryHandler,
  getSiteProgressReportHandler,
  getStockValueReportHandler,
} from "../controllers/reportController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireAccessLevel } from "../middleware/requireRole.js";

export const reportRouter: RouterType = Router();

reportRouter.use(authenticate);

// Cost-bearing reports — MANAGER/ADMIN accessLevel only (see costVisibilityService).
reportRouter.get("/stock-value", requireAccessLevel("MANAGER", "ADMIN"), asyncHandler(getStockValueReportHandler));
reportRouter.get("/issue-history", requireAccessLevel("MANAGER", "ADMIN"), asyncHandler(getIssueHistoryReportHandler));
reportRouter.get("/site-summary", requireAccessLevel("MANAGER", "ADMIN"), asyncHandler(getSiteFinancialSummaryHandler));

// No cost data — safe for every authenticated user, including STAFF.
reportRouter.get("/low-stock", asyncHandler(getLowStockReportHandler));
reportRouter.get("/site-progress", asyncHandler(getSiteProgressReportHandler));
