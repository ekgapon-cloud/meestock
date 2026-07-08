import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export function findCategoryByName(name: string) {
  return prisma.category.findFirst({ where: { name } });
}

export function findCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export function createCategory(data: Prisma.CategoryCreateInput) {
  return prisma.category.create({ data });
}

export function updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
  return prisma.category.update({ where: { id }, data });
}

export function deleteCategory(id: string) {
  return prisma.category.delete({ where: { id } });
}
