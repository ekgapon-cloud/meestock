import { POStatus } from "@prisma/client";
import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  items: z
    .array(
      z.object({
        materialId: z.string().min(1),
        orderedQty: z.coerce.number().positive(),
        unitCost: z.coerce.number().nonnegative(),
      }),
    )
    .min(1),
});

export const listPurchaseOrdersQuerySchema = z.object({
  status: z.nativeEnum(POStatus).optional(),
  supplierId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(["ORDERED", "CANCELLED"]),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>;
