import type { NextFunction, Request, Response } from "express";
import type { AccessLevel, EmployeeRole } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

/** ADMIN and MANAGER accessLevel always bypass role checks — both act as full-permission tiers for action gating (accessLevel-gated endpoints like /users stay ADMIN-only via requireAccessLevel). */
export function requireRole(...roles: EmployeeRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required");
    }
    if (req.user.accessLevel === "ADMIN" || req.user.accessLevel === "MANAGER" || roles.includes(req.user.role)) {
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
