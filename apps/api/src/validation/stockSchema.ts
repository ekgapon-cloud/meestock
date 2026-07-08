import { z } from "zod";

export const stockBalanceQuerySchema = z.object({
  warehouseId: z.string().min(1).optional(),
  materialId: z.string().min(1).optional(),
});

export const stockLedgerQuerySchema = stockBalanceQuerySchema.extend({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const receiveStockSchema = z.object({
  warehouseId: z.string().min(1),
  materialId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
});

export const adjustStockSchema = z.object({
  warehouseId: z.string().min(1),
  materialId: z.string().min(1),
  quantityChange: z.coerce.number().refine((val) => val !== 0, "quantityChange must not be zero"),
  unitCost: z.coerce.number().nonnegative(),
  reason: z.string().min(1),
});

export type StockBalanceQuery = z.infer<typeof stockBalanceQuerySchema>;
export type StockLedgerQuery = z.infer<typeof stockLedgerQuerySchema>;
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
