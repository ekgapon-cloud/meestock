import { Router, type Router as RouterType } from "express";
import {
  assignSiteAccessHandler,
  createUserHandler,
  getUserHandler,
  listUsersHandler,
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
userRouter.get("/:id", asyncHandler(getUserHandler));
userRouter.post("/", asyncHandler(createUserHandler));
userRouter.patch("/:id", asyncHandler(updateUserHandler));
userRouter.patch("/:id/role", asyncHandler(updateUserRoleHandler));
userRouter.post("/:id/site-access", asyncHandler(assignSiteAccessHandler));
userRouter.delete("/:id/site-access/:warehouseId", asyncHandler(revokeSiteAccessHandler));
