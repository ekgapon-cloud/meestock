import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  assignSiteAccess,
  createUser,
  getUser,
  listUsers,
  resetUserPassword,
  revokeSiteAccess,
  updateUser,
  updateUserRole,
} from "../services/userService.js";
import {
  assignSiteAccessSchema,
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  updateUserRoleSchema,
  updateUserSchema,
} from "../validation/userSchema.js";

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function listUsersHandler(req: Request, res: Response) {
  const query = listUsersQuerySchema.parse(req.query);
  const result = await listUsers(query);
  res.json(result);
}

export async function getUserHandler(req: Request, res: Response) {
  const user = await getUser(req.params["id"] as string);
  res.json(user);
}

export async function createUserHandler(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  const user = await createUser(input);
  res.status(201).json(user);
}

export async function updateUserHandler(req: Request, res: Response) {
  const actingUser = requireUser(req);
  const input = updateUserSchema.parse(req.body);
  const user = await updateUser(req.params["id"] as string, input, actingUser.id);
  res.json(user);
}

export async function updateUserRoleHandler(req: Request, res: Response) {
  const input = updateUserRoleSchema.parse(req.body);
  const user = await updateUserRole(req.params["id"] as string, input);
  res.json(user);
}

export async function resetUserPasswordHandler(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  const user = await resetUserPassword(req.params["id"] as string, input);
  res.json(user);
}

export async function assignSiteAccessHandler(req: Request, res: Response) {
  const input = assignSiteAccessSchema.parse(req.body);
  const user = await assignSiteAccess(req.params["id"] as string, input);
  res.status(201).json(user);
}

export async function revokeSiteAccessHandler(req: Request, res: Response) {
  const user = await revokeSiteAccess(req.params["id"] as string, req.params["warehouseId"] as string);
  res.json(user);
}
