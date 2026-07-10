import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { findCustomers } from "../repositories/customerRepository.js";
import {
  createProjectWithWarehouse,
  getProject,
  listProjects,
  updateProjectDetail,
  updateProjectStatus,
} from "../services/projectService.js";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
  updateProjectStatusSchema,
} from "../validation/projectSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function listProjectsHandler(req: Request, res: Response) {
  requireUser(req);
  const query = listProjectsQuerySchema.parse(req.query);
  res.json(await listProjects(query));
}

export async function listCustomersHandler(req: Request, res: Response) {
  requireUser(req);
  res.json(await findCustomers());
}

export async function getProjectHandler(req: Request, res: Response) {
  requireUser(req);
  res.json(await getProject(req.params["id"] as string));
}

export async function createProjectHandler(req: Request, res: Response) {
  requireUser(req);
  const input = createProjectSchema.parse(req.body);
  res.status(201).json(await createProjectWithWarehouse(input));
}

export async function updateProjectStatusHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const input = updateProjectStatusSchema.parse(req.body);
  res.json(await updateProjectStatus(req.params["id"] as string, input, user.accessLevel));
}

export async function updateProjectHandler(req: Request, res: Response) {
  requireUser(req);
  const input = updateProjectSchema.parse(req.body);
  res.json(await updateProjectDetail(req.params["id"] as string, input));
}
