import type { Prisma, ProjectStatus } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import {
  countProjects,
  createProject,
  findProjectById,
  findProjectByCode,
  findProjects,
  updateProject,
} from "../repositories/projectRepository.js";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
  UpdateProjectStatusInput,
} from "../validation/projectSchema.js";

/** A project can only receive new material issues while it is still open. */
const OPEN_STATUSES: ProjectStatus[] = ["PLANNING", "IN_PROGRESS"];

const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function listProjects(query: ListProjectsQuery) {
  const where: Prisma.ProjectWhereInput = query.status ? { status: query.status } : {};
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([findProjects(where, skip, query.limit), countProjects(where)]);
  return { items, total, page: query.page, limit: query.limit };
}

export async function getProject(id: string) {
  const project = await findProjectById(id);
  if (!project) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  return project;
}

export async function createProjectWithWarehouse(input: CreateProjectInput) {
  const existing = await findProjectByCode(input.code);
  if (existing) {
    throw new AppError("CONFLICT", `Project code ${input.code} already exists`);
  }

  const customer: Prisma.ProjectCreateInput["customer"] = input.customerId
    ? { connect: { id: input.customerId } }
    : { create: { name: input.newCustomerName!, ...(input.newCustomerContact ? { contact: input.newCustomerContact } : {}) } };

  // One Prisma create with nested writes is atomic — project, its inline customer (if new), and its
  // SITE warehouse are all created together or not at all.
  return createProject({
    code: input.code,
    name: input.name,
    startDate: input.startDate,
    ...(input.endDate ? { endDate: input.endDate } : {}),
    contractValue: input.contractValue,
    ...(input.materialBudget !== undefined ? { materialBudget: input.materialBudget } : {}),
    ...(input.laborBudget !== undefined ? { laborBudget: input.laborBudget } : {}),
    ...(input.otherBudget !== undefined ? { otherBudget: input.otherBudget } : {}),
    status: "PLANNING",
    customer,
    warehouses: { create: [{ name: input.warehouseName ?? input.name, type: "SITE" }] },
  });
}

export async function updateProjectStatus(id: string, input: UpdateProjectStatusInput) {
  const project = await findProjectById(id);
  if (!project) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  if (project.status === input.status) {
    return project;
  }
  if (!ALLOWED_TRANSITIONS[project.status].includes(input.status)) {
    throw new AppError("INVALID_WORKFLOW_STATE", `Cannot transition project from ${project.status} to ${input.status}`);
  }

  // Stamp the end date when a project completes, if one wasn't set manually.
  const data: Prisma.ProjectUpdateInput = { status: input.status };
  if (input.status === "COMPLETED" && !project.endDate) {
    data.endDate = new Date();
  }
  return updateProject(id, data);
}

export async function updateProjectDetail(id: string, input: UpdateProjectInput) {
  const project = await findProjectById(id);
  if (!project) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  return updateProject(id, input as Prisma.ProjectUpdateInput);
}

/** Throws if the project is closed (COMPLETED/CANCELLED) — used to block new material issues to it. */
export async function assertProjectAcceptsIssues(projectId: string) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  if (!OPEN_STATUSES.includes(project.status)) {
    throw new AppError("INVALID_WORKFLOW_STATE", `Project ${project.code} is ${project.status}; new issues are not allowed`);
  }
}
