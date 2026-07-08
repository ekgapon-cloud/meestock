import type { NextFunction, Request, Response } from "express";
import type { AccessLevel, EmployeeRole } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

/** Admin accessLevel always bypasses role checks — it is the system's superuser tier. */
export function requireRole(...roles: EmployeeRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required");
    }
    if (req.user.accessLevel === "ADMIN" || roles.includes(req.user.role)) {
      next();
      return;
    }
    throw new AppError("FORBIDDEN_ROLE", "Role does not have permission for this action");
  };
}

export function requireAccessLevel(...levels: AccessLevel[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required");
    }
    if (!levels.includes(req.user.accessLevel)) {
      throw new AppError("FORBIDDEN_ROLE", "Access level does not have permission for this action");
    }
    next();
  };
}
