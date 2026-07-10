import { Router, type Router as RouterType } from "express";
import {
  createProjectHandler,
  getProjectHandler,
  listCustomersHandler,
  listProjectsHandler,
  updateProjectHandler,
  updateProjectStatusHandler,
} from "../controllers/projectController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireAccessLevel } from "../middleware/requireRole.js";

export const projectRouter: RouterType = Router();

// Projects carry contract value / budgets — the whole area is MANAGER/ADMIN only.
projectRouter.use(authenticate);
projectRouter.use(requireAccessLevel("MANAGER", "ADMIN"));

projectRouter.get("/", asyncHandler(listProjectsHandler));
// Static paths before the "/:id" param route so they aren't swallowed by it.
projectRouter.get("/customers", asyncHandler(listCustomersHandler));
projectRouter.get("/:id", asyncHandler(getProjectHandler));
projectRouter.post("/", asyncHandler(createProjectHandler));
projectRouter.patch("/:id", asyncHandler(updateProjectHandler));
projectRouter.patch("/:id/status", asyncHandler(updateProjectStatusHandler));
