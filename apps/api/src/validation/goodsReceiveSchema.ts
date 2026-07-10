import { z } from "zod";

export const createGoodsReceiveSchema = z.object({
  warehouseId: z.string().min(1),
  purchaseOrderId: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitCost: z.coerce.number().nonnegative(),
      }),
    )
    .min(1),
});

export const listGoodsReceivesQuerySchema = z.object({
  warehouseId: z.string().min(1).optional(),
  purchaseOrderId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateGoodsReceiveInput = z.infer<typeof createGoodsReceiveSchema>;
export type ListGoodsReceivesQuery = z.infer<typeof listGoodsReceivesQuerySchema>;
