import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import {
  getActiveProjectValuePercentageBreakdown,
  getIssueHistoryReport,
  getLowStockMaterials,
  getSiteFinancialSummary,
  getStockValueReport,
} from "../services/reportingService.js";
import {
  issueHistoryQuerySchema,
  lowStockQuerySchema,
  siteFinancialSummaryQuerySchema,
  stockValueQuerySchema,
} from "../validation/reportingSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function getStockValueReportHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = stockValueQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const report = await getStockValueReport(query, accessibleWarehouseIds);
  res.json(report);
}

export async function getIssueHistoryReportHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = issueHistoryQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const report = await getIssueHistoryReport(query, accessibleWarehouseIds);
  res.json(report);
}

export async function getSiteFinancialSummaryHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = siteFinancialSummaryQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const report = await getSiteFinancialSummary(accessibleWarehouseIds, query);
  res.json(report);
}

/** No cost data — open to all authenticated users, unlike the reports above (see reportRoutes.ts). */
export async function getLowStockReportHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = lowStockQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const items = await getLowStockMaterials(accessibleWarehouseIds, query.warehouseId);
  res.json({ items });
}

/** Percentage-only, no cost data — open to all authenticated users. */
export async function getSiteProgressReportHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const report = await getActiveProjectValuePercentageBreakdown(accessibleWarehouseIds);
  res.json(report);
}
