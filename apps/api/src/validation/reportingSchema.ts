import { z } from "zod";

export const stockValueQuerySchema = z.object({
  warehouseId: z.string().min(1).optional(),
  materialId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
});

export const issueHistoryQuerySchema = z.object({
  warehouseId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type StockValueQuery = z.infer<typeof stockValueQuerySchema>;
export type IssueHistoryQuery = z.infer<typeof issueHistoryQuerySchema>;
