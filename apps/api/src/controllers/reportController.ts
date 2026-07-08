import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { getIssueHistoryReport, getStockValueReport } from "../services/reportingService.js";
import { issueHistoryQuerySchema, stockValueQuerySchema } from "../validation/reportingSchema.js";

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
