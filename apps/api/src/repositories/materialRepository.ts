import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findMaterials(where: Prisma.MaterialWhereInput, skip: number, take: number) {
  return prisma.material.findMany({
    where,
    skip,
    take,
    include: { category: true, supplier: true },
    orderBy: { name: "asc" },
  });
}

export function countMaterials(where: Prisma.MaterialWhereInput) {
  return prisma.material.count({ where });
}

export function countMaterialsByCategory(categoryId: string) {
  return prisma.material.count({ where: { categoryId } });
}

export function findMaterialById(id: string) {
  return prisma.material.findUnique({ where: { id }, include: { category: true, supplier: true } });
}

export function findMaterialByCode(code: string) {
  return prisma.material.findUnique({ where: { code }, include: { category: true, supplier: true } });
}

export function findMaterialByBarcode(barcode: string) {
  return prisma.material.findUnique({ where: { barcode }, include: { category: true, supplier: true } });
}

export function findActiveMaterialsWithReorderPoint() {
  return prisma.material.findMany({ where: { isActive: true, reorderPoint: { not: null } } });
}

export function findDistinctUnits() {
  return prisma.material.findMany({
    distinct: ["unit"],
    select: { unit: true },
    orderBy: { unit: "asc" },
  });
}

export function createMaterial(data: Prisma.MaterialCreateInput) {
  return prisma.material.create({ data, include: { category: true, supplier: true } });
}

export function updateMaterial(id: string, data: Prisma.MaterialUpdateInput) {
  return prisma.material.update({ where: { id }, data, include: { category: true, supplier: true } });
}
