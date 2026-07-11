import { AccessLevel, EmployeeRole } from "@prisma/client";
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(EmployeeRole),
  accessLevel: z.nativeEnum(AccessLevel).default("STAFF"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(EmployeeRole).optional(),
  accessLevel: z.nativeEnum(AccessLevel).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(EmployeeRole),
});

/** Admin sets a new password for a user (a reset — the old one is never seen, only replaced). */
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export const listUsersQuerySchema = z.object({
  role: z.nativeEnum(EmployeeRole).optional(),
  accessLevel: z.nativeEnum(AccessLevel).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const assignSiteAccessSchema = z.object({
  warehouseId: z.string().min(1),
});

export const listLoginEventsQuerySchema = z.object({
  // "true"/"false" string rather than z.coerce.boolean() — coercion treats "false" as true.
  success: z.enum(["true", "false"]).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type AssignSiteAccessInput = z.infer<typeof assignSiteAccessSchema>;
export type ListLoginEventsQuery = z.infer<typeof listLoginEventsQuerySchema>;
