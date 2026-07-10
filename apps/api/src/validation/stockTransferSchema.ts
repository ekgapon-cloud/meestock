import { z } from "zod";

export const createStockTransferSchema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  items: z
    .array(
      z.object({
        materialId: z.string().min(1),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1),
});

export const listStockTransfersQuerySchema = z.object({
  warehouseId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;
export type ListStockTransfersQuery = z.infer<typeof listStockTransfersQuerySchema>;
