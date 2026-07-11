import { Router, type Router as RouterType } from "express";
import {
  assignSiteAccessHandler,
  createUserHandler,
  getUserHandler,
  listLoginEventsHandler,
  listUsersHandler,
  resetUserPasswordHandler,
  revokeSiteAccessHandler,
  updateUserHandler,
  updateUserRoleHandler,
} from "../controllers/userController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireAccessLevel } from "../middleware/requireRole.js";

export const userRouter: RouterType = Router();

userRouter.use(authenticate);
userRouter.use(requireAccessLevel("ADMIN"));

userRouter.get("/", asyncHandler(listUsersHandler));
// Registered before "/:id" so the literal path isn't captured as an id param.
userRouter.get("/login-events", asyncHandler(listLoginEventsHandler));
userRouter.get("/:id", asyncHandler(getUserHandler));
userRouter.post("/", asyncHandler(createUserHandler));
userRouter.patch("/:id", asyncHandler(updateUserHandler));
userRouter.patch("/:id/role", asyncHandler(updateUserRoleHandler));
userRouter.patch("/:id/password", asyncHandler(resetUserPasswordHandler));
userRouter.post("/:id/site-access", asyncHandler(assignSiteAccessHandler));
userRouter.delete("/:id/site-access/:warehouseId", asyncHandler(revokeSiteAccessHandler));
