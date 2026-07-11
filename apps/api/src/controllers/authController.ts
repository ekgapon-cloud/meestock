import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { changePassword, login } from "../services/authService.js";
import { changePasswordSchema, loginSchema } from "../validation/authSchema.js";

export async function loginHandler(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  // The browser talks to the Next BFF, which forwards the real client IP/UA on to us; take the
  // first X-Forwarded-For entry (original client) and fall back to req.ip.
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress =
    (typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : undefined) || req.ip;
  const userAgent = req.headers["user-agent"];
  const result = await login(input, {
    ...(ipAddress ? { ipAddress } : {}),
    ...(typeof userAgent === "string" ? { userAgent } : {}),
  });
  res.json(result);
}

export function logoutHandler(_req: Request, res: Response) {
  res.json({ message: "Logged out" });
}

export async function changePasswordHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  const input = changePasswordSchema.parse(req.body);
  res.json(await changePassword(req.user.id, input));
}

export async function meHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }

  const accessibleWarehouseIds = await getAccessibleWarehouseIds(req.user.id, req.user.accessLevel);

  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    accessLevel: req.user.accessLevel,
    siteAccess: accessibleWarehouseIds === null ? "ALL" : accessibleWarehouseIds,
  });
}
