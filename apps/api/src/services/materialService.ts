import type { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import {
  countMaterials,
  createMaterial,
  findDistinctUnits,
  findMaterialByBarcode,
  findMaterialByCode,
  findMaterialById,
  findMaterials,
  updateMaterial,
} from "../repositories/materialRepository.js";
import { groupBalanceByMaterial } from "../repositories/stockTransactionRepository.js";
import type { CreateMaterialInput, ListMaterialsQuery, UpdateMaterialInput } from "../validation/materialSchema.js";

export async function listMaterials(query: ListMaterialsQuery, accessibleWarehouseIds: string[] | null) {
  const where: Prisma.MaterialWhereInput = {
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.includeInactive ? {} : { isActive: true }),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { code: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([findMaterials(where, skip, query.limit), countMaterials(where)]);

  const balanceGroups = await groupBalanceByMaterial({
    materialId: { in: items.map((item) => item.id) },
    ...(accessibleWarehouseIds ? { warehouseId: { in: accessibleWarehouseIds } } : {}),
  });
  const remainingQtyByMaterialId = new Map(
    balanceGroups.map((group) => [group.materialId, Number(group._sum.quantityChange ?? 0)]),
  );

  const itemsWithBalance = items.map((item) => ({
    ...item,
    remainingQty: remainingQtyByMaterialId.get(item.id) ?? 0,
  }));

  return { items: itemsWithBalance, total, page: query.page, limit: query.limit };
}

/** Distinct units already used by existing materials, for the create/edit form's unit dropdown. */
export async function listMaterialUnits() {
  const rows = await findDistinctUnits();
  return rows.map((row) => row.unit);
}

export async function getMaterial(id: string) {
  const material = await findMaterialById(id);
  if (!material) {
    throw new AppError("NOT_FOUND", "Material not found");
  }
  return material;
}

/**
 * Exact-match lookup for the barcode-scan input, where fuzzy `search` could match more than one material.
 * Tries the manufacturer barcode first (what a real scanner produces), then falls back to our own `code`
 * (SKU) for materials that don't have a recorded barcode yet, or manual entry.
 */
export async function getMaterialByCode(value: string) {
  const material = (await findMaterialByBarcode(value)) ?? (await findMaterialByCode(value));
  if (!material) {
    throw new AppError("NOT_FOUND", "Material not found");
  }
  return material;
}

export async function createMaterialWithValidation(input: CreateMaterialInput) {
  const existing = await findMaterialByCode(input.code);
  if (existing) {
    throw new AppError("CONFLICT", "Material code already exists");
  }
  if (input.barcode) {
    const existingBarcode = await findMaterialByBarcode(input.barcode);
    if (existingBarcode) {
      throw new AppError("CONFLICT", "Material barcode already exists");
    }
  }

  return createMaterial({
    code: input.code,
    ...(input.barcode ? { barcode: input.barcode } : {}),
    name: input.name,
    unit: input.unit,
    standardCost: input.standardCost,
    ...(input.reorderPoint !== undefined ? { reorderPoint: input.reorderPoint } : {}),
    ...(input.safetyStock !== undefined ? { safetyStock: input.safetyStock } : {}),
    ...(input.leadTimeDays !== undefined ? { leadTimeDays: input.leadTimeDays } : {}),
    category: { connect: { id: input.categoryId } },
    ...(input.supplierId ? { supplier: { connect: { id: input.supplierId } } } : {}),
  });
}

export async function updateMaterialWithValidation(id: string, input: UpdateMaterialInput) {
  const current = await getMaterial(id);

  if (input.barcode !== undefined && input.barcode !== null && input.barcode !== current.barcode) {
    const existingBarcode = await findMaterialByBarcode(input.barcode);
    if (existingBarcode) {
      throw new AppError("CONFLICT", "Material barcode already exists");
    }
  }

  const data: Prisma.MaterialUpdateInput = {
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.standardCost !== undefined ? { standardCost: input.standardCost } : {}),
    ...(input.reorderPoint !== undefined ? { reorderPoint: input.reorderPoint } : {}),
    ...(input.safetyStock !== undefined ? { safetyStock: input.safetyStock } : {}),
    ...(input.leadTimeDays !== undefined ? { leadTimeDays: input.leadTimeDays } : {}),
    ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
    ...(input.supplierId ? { supplier: { connect: { id: input.supplierId } } } : {}),
  };

  return updateMaterial(id, data);
}

export async function deactivateMaterial(id: string) {
  await getMaterial(id);
  return updateMaterial(id, { isActive: false });
}
