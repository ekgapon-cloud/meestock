import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { canViewCost, redactItemsCost } from "../services/costVisibilityService.js";
import {
  approveMaterialIssue,
  createMaterialIssue,
  fulfillMaterialIssue,
  getMaterialIssue,
  listMaterialIssues,
  rejectMaterialIssue,
} from "../services/materialIssueService.js";
import {
  approveMaterialIssueSchema,
  createMaterialIssueSchema,
  listMaterialIssuesQuerySchema,
  rejectMaterialIssueSchema,
} from "../validation/materialIssueSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function listMaterialIssuesHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = listMaterialIssuesQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const result = await listMaterialIssues(query, accessibleWarehouseIds);
  const items = canViewCost(user.accessLevel) ? result.items : result.items.map(redactItemsCost);
  res.json({ ...result, items });
}

export async function getMaterialIssueHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const issue = await getMaterialIssue(req.params["id"] as string, accessibleWarehouseIds);
  res.json(canViewCost(user.accessLevel) ? issue : redactItemsCost(issue));
}

export async function createMaterialIssueHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = createMaterialIssueSchema.parse(req.body);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const issue = await createMaterialIssue(input, user.id, req.ip, accessibleWarehouseIds);
  res.status(201).json(canViewCost(user.accessLevel) ? issue : redactItemsCost(issue));
}

export async function approveMaterialIssueHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = approveMaterialIssueSchema.parse(req.body);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const issue = await approveMaterialIssue(req.params["id"] as string, user.id, input, accessibleWarehouseIds);
  res.json(canViewCost(user.accessLevel) ? issue : redactItemsCost(issue));
}

export async function rejectMaterialIssueHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = rejectMaterialIssueSchema.parse(req.body);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const issue = await rejectMaterialIssue(req.params["id"] as string, user.id, input, accessibleWarehouseIds);
  res.json(canViewCost(user.accessLevel) ? issue : redactItemsCost(issue));
}

export async function fulfillMaterialIssueHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const issue = await fulfillMaterialIssue(req.params["id"] as string, user.id, req.ip, accessibleWarehouseIds);
  res.json(canViewCost(user.accessLevel) ? issue : redactItemsCost(issue));
}
