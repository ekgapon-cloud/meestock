import { Router, type Router as RouterType } from "express";
import { loginHandler, logoutHandler, meHandler } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { loginRateLimiter } from "../middleware/rateLimit.js";

export const authRouter: RouterType = Router();

authRouter.post("/login", loginRateLimiter, asyncHandler(loginHandler));
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", authenticate, asyncHandler(meHandler));
