import { AppError } from "../errors/AppError.js";
import {
  createCategory,
  deleteCategory,
  findCategories,
  findCategoryById,
  findCategoryByName,
  updateCategory,
} from "../repositories/categoryRepository.js";
import { countMaterialsByCategory } from "../repositories/materialRepository.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "../validation/categorySchema.js";

export function listCategories() {
  return findCategories();
}

export async function getCategory(id: string) {
  const category = await findCategoryById(id);
  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found");
  }
  return category;
}

export async function createCategoryWithValidation(input: CreateCategoryInput) {
  const existing = await findCategoryByName(input.name);
  if (existing) {
    throw new AppError("CONFLICT", "Category name already exists");
  }
  return createCategory({ name: input.name });
}

export async function updateCategoryWithValidation(id: string, input: UpdateCategoryInput) {
  const current = await getCategory(id);

  if (input.name !== current.name) {
    const existing = await findCategoryByName(input.name);
    if (existing) {
      throw new AppError("CONFLICT", "Category name already exists");
    }
  }

  return updateCategory(id, { name: input.name });
}

export async function deleteCategoryWithValidation(id: string) {
  await getCategory(id);

  const materialCount = await countMaterialsByCategory(id);
  if (materialCount > 0) {
    throw new AppError("CONFLICT", "Category still has materials assigned to it and cannot be deleted");
  }

  await deleteCategory(id);
}
