import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import {
  findEmployeeByEmail,
  findEmployeeWithPasswordById,
  updateEmployee,
} from "../repositories/employeeRepository.js";
import { createLoginEvent } from "../repositories/loginEventRepository.js";
import type { ChangePasswordInput, LoginInput } from "../validation/authSchema.js";

/** Request-derived context recorded on each login attempt for the admin audit trail. */
export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

async function recordLoginEvent(
  email: string,
  employeeId: string | null,
  success: boolean,
  context: LoginContext,
) {
  await createLoginEvent({
    email,
    employeeId,
    success,
    ipAddress: context.ipAddress ?? null,
    userAgent: context.userAgent ?? null,
  });
}

export async function login({ email, password }: LoginInput, context: LoginContext = {}) {
  const employee = await findEmployeeByEmail(email);
  if (!employee || !employee.isActive) {
    await recordLoginEvent(email, employee?.id ?? null, false, context);
    throw new AppError("UNAUTHORIZED", "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, employee.passwordHash);
  if (!passwordMatches) {
    await recordLoginEvent(email, employee.id, false, context);
    throw new AppError("UNAUTHORIZED", "Invalid email or password");
  }

  await recordLoginEvent(email, employee.id, true, context);

  const expiresIn = env.JWT_EXPIRES_IN as NonNullable<jwt.SignOptions["expiresIn"]>;
  const token = jwt.sign({ sub: employee.id }, env.JWT_SECRET, { expiresIn });

  return {
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      accessLevel: employee.accessLevel,
    },
  };
}

/** Self-service: a user changes their own password after proving they know the current one. */
export async function changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordInput) {
  const employee = await findEmployeeWithPasswordById(userId);
  if (!employee) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }

  const currentMatches = await bcrypt.compare(currentPassword, employee.passwordHash);
  if (!currentMatches) {
    throw new AppError("UNAUTHORIZED", "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await updateEmployee(userId, { passwordHash });
  return { message: "Password changed" };
}
