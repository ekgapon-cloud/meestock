import { Router, type Router as RouterType } from "express";
import {
  getIssueHistoryReportHandler,
  getSiteFinancialSummaryHandler,
  getStockValueReportHandler,
} from "../controllers/reportController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireAccessLevel } from "../middleware/requireRole.js";

export const reportRouter: RouterType = Router();

reportRouter.use(authenticate);
reportRouter.use(requireAccessLevel("MANAGER", "ADMIN"));

reportRouter.get("/stock-value", asyncHandler(getStockValueReportHandler));
reportRouter.get("/issue-history", asyncHandler(getIssueHistoryReportHandler));
reportRouter.get("/site-summary", asyncHandler(getSiteFinancialSummaryHandler));
