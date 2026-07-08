import type { Request, Response } from "express";
import {
  createCategoryWithValidation,
  deleteCategoryWithValidation,
  listCategories,
  updateCategoryWithValidation,
} from "../services/categoryService.js";
import { createCategorySchema, updateCategorySchema } from "../validation/categorySchema.js";

export async function listCategoriesHandler(_req: Request, res: Response) {
  const categories = await listCategories();
  res.json(categories);
}

export async function createCategoryHandler(req: Request, res: Response) {
  const input = createCategorySchema.parse(req.body);
  const category = await createCategoryWithValidation(input);
  res.status(201).json(category);
}

export async function updateCategoryHandler(req: Request, res: Response) {
  const input = updateCategorySchema.parse(req.body);
  const category = await updateCategoryWithValidation(req.params["id"] as string, input);
  res.json(category);
}

export async function deleteCategoryHandler(req: Request, res: Response) {
  await deleteCategoryWithValidation(req.params["id"] as string);
  res.status(204).send();
}
