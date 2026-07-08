import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { findEmployeeByEmail } from "../repositories/employeeRepository.js";
import type { LoginInput } from "../validation/authSchema.js";

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
