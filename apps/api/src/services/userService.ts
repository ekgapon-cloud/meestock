import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import {
  countEmployees,
  createEmployee,
  findEmployeeByEmail,
  findEmployeeById,
  findEmployees,
  updateEmployee,
} from "../repositories/employeeRepository.js";
import { countLoginEvents, findLoginEvents } from "../repositories/loginEventRepository.js";
import { createSiteAccess, deleteSiteAccess } from "../repositories/userSiteAccessRepository.js";
import { findWarehouseById } from "../repositories/warehouseRepository.js";
import type {
  AssignSiteAccessInput,
  CreateUserInput,
  ListLoginEventsQuery,
  ListUsersQuery,
  ResetPasswordInput,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "../validation/userSchema.js";

function buildWhere(query: ListUsersQuery): Prisma.EmployeeWhereInput {
  return {
    ...(query.role ? { role: query.role } : {}),
    ...(query.accessLevel ? { accessLevel: query.accessLevel } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function listUsers(query: ListUsersQuery) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([findEmployees(where, skip, query.limit), countEmployees(where)]);
  return { items, total, page: query.page, limit: query.limit };
}

export async function getUser(id: string) {
  const user = await findEmployeeById(id);
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }
  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await findEmployeeByEmail(input.email);
  if (existing) {
    throw new AppError("CONFLICT", "Email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
  return createEmployee({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    accessLevel: input.accessLevel,
  });
}

export async function updateUser(id: string, input: UpdateUserInput, actingUserId: string) {
  await getUser(id);

  if (id === actingUserId) {
    if (input.accessLevel && input.accessLevel !== "ADMIN") {
      throw new AppError("VALIDATION_ERROR", "Cannot remove your own ADMIN access level");
    }
    if (input.isActive === false) {
      throw new AppError("VALIDATION_ERROR", "Cannot deactivate your own account");
    }
  }

  if (input.email) {
    const existing = await findEmployeeByEmail(input.email);
    if (existing && existing.id !== id) {
      throw new AppError("CONFLICT", "Email already exists");
    }
  }

  return updateEmployee(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.accessLevel !== undefined ? { accessLevel: input.accessLevel } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });
}

/**
 * Admin resets a user's password to a new value. This is a *set*, not a reveal — the existing
 * password is a one-way bcrypt hash and cannot be recovered or shown; it can only be replaced.
 */
export async function resetUserPassword(id: string, input: ResetPasswordInput) {
  await getUser(id);
  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
  return updateEmployee(id, { passwordHash });
}

export async function updateUserRole(id: string, input: UpdateUserRoleInput) {
  await getUser(id);
  return updateEmployee(id, { role: input.role });
}

export async function assignSiteAccess(id: string, input: AssignSiteAccessInput) {
  await getUser(id);
  const warehouse = await findWarehouseById(input.warehouseId);
  if (!warehouse) {
    throw new AppError("NOT_FOUND", "Warehouse not found");
  }
  await createSiteAccess(id, input.warehouseId);
  return getUser(id);
}

export async function revokeSiteAccess(id: string, warehouseId: string) {
  await getUser(id);
  await deleteSiteAccess(id, warehouseId);
  return getUser(id);
}

export async function listLoginEvents(query: ListLoginEventsQuery) {
  const where: Prisma.LoginEventWhereInput = {
    ...(query.success !== undefined ? { success: query.success === "true" } : {}),
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: "insensitive" } },
            { employee: { is: { name: { contains: query.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    findLoginEvents(where, skip, query.limit),
    countLoginEvents(where),
  ]);
  return { items, total, page: query.page, limit: query.limit };
}
