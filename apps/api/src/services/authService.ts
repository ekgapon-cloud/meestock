import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import {
  findEmployeeByEmail,
  findEmployeeWithPasswordById,
  updateEmployee,
} from "../repositories/employeeRepository.js";
import type { ChangePasswordInput, LoginInput } from "../validation/authSchema.js";

export async function login({ email, password }: LoginInput) {
  const employee = await findEmployeeByEmail(email);
  if (!employee || !employee.isActive) {
    throw new AppError("UNAUTHORIZED", "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, employee.passwordHash);
  if (!passwordMatches) {
    throw new AppError("UNAUTHORIZED", "Invalid email or password");
  }

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
