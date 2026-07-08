import { Router, type Router as RouterType } from "express";
import {
  createCategoryHandler,
  deleteCategoryHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from "../controllers/categoryController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const categoryRouter: RouterType = Router();

categoryRouter.use(authenticate);

categoryRouter.get("/", asyncHandler(listCategoriesHandler));
categoryRouter.post("/", requireRole("WAREHOUSE"), asyncHandler(createCategoryHandler));
categoryRouter.patch("/:id", requireRole("WAREHOUSE"), asyncHandler(updateCategoryHandler));
categoryRouter.delete("/:id", requireRole("WAREHOUSE"), asyncHandler(deleteCategoryHandler));
