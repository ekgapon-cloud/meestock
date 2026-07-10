import { z } from "zod";

export const createStockCountSchema = z.object({
  warehouseId: z.string().min(1),
  items: z
    .array(
      z.object({
        materialId: z.string().min(1),
        // A physical count is an absolute, whole quantity on the shelf — never negative or fractional.
        actualQty: z.coerce.number().int().min(0),
        reason: z.string().trim().min(1).optional(),
      }),
    )
    .min(1),
});

export const listStockCountsQuerySchema = z.object({
  warehouseId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateStockCountInput = z.infer<typeof createStockCountSchema>;
export type ListStockCountsQuery = z.infer<typeof listStockCountsQuerySchema>;
