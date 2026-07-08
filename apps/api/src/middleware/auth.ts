import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { findEmployeeById } from "../repositories/employeeRepository.js";
import { asyncHandler } from "./asyncHandler.js";

interface JwtPayload {
  sub: string;
}

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid or expired token");
  }

  const employee = await findEmployeeById(payload.sub);
  if (!employee || !employee.isActive) {
    throw new AppError("UNAUTHORIZED", "Account not found or inactive");
  }

  req.user = {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    accessLevel: employee.accessLevel,
  };
  next();
});
