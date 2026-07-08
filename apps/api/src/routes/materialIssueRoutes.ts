import { Router, type Router as RouterType } from "express";
import {
  approveMaterialIssueHandler,
  createMaterialIssueHandler,
  fulfillMaterialIssueHandler,
  getMaterialIssueHandler,
  listMaterialIssuesHandler,
  rejectMaterialIssueHandler,
} from "../controllers/materialIssueController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const materialIssueRouter: RouterType = Router();

materialIssueRouter.use(authenticate);

materialIssueRouter.get("/", asyncHandler(listMaterialIssuesHandler));
materialIssueRouter.get("/:id", asyncHandler(getMaterialIssueHandler));
materialIssueRouter.post("/", requireRole("REQUESTER"), asyncHandler(createMaterialIssueHandler));
materialIssueRouter.post("/:id/approve", requireRole("APPROVER"), asyncHandler(approveMaterialIssueHandler));
materialIssueRouter.post("/:id/reject", requireRole("APPROVER"), asyncHandler(rejectMaterialIssueHandler));
materialIssueRouter.post("/:id/fulfill", requireRole("WAREHOUSE"), asyncHandler(fulfillMaterialIssueHandler));
