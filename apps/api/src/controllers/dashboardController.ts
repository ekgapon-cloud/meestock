import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { getExecutiveDashboard, getStaffDashboard } from "../services/reportingService.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function getExecutiveDashboardHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const dashboard = await getExecutiveDashboard(accessibleWarehouseIds);
  res.json(dashboard);
}

export async function getStaffDashboardHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const dashboard = await getStaffDashboard(accessibleWarehouseIds);
  res.json(dashboard);
}
