import { z } from "zod";

export const createMaterialSchema = z.object({
  code: z.string().min(1),
  barcode: z.string().min(1).nullable().optional(),
  name: z.string().min(1),
  categoryId: z.string().min(1),
  unit: z.string().min(1),
  standardCost: z.coerce.number().nonnegative(),
  supplierId: z.string().min(1).optional(),
  reorderPoint: z.coerce.number().nonnegative().optional(),
  safetyStock: z.coerce.number().nonnegative().optional(),
  leadTimeDays: z.coerce.number().int().nonnegative().optional(),
});

export const updateMaterialSchema = createMaterialSchema.partial();

export const listMaterialsQuerySchema = z.object({
  categoryId: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  includeInactive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type ListMaterialsQuery = z.infer<typeof listMaterialsQuerySchema>;
