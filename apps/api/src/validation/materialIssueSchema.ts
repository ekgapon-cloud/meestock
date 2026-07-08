import { IssueStatus } from "@prisma/client";
import { z } from "zod";

export const createMaterialIssueSchema = z.object({
  projectId: z.string().min(1),
  warehouseId: z.string().min(1),
  items: z
    .array(
      z.object({
        materialId: z.string().min(1),
        requestedQty: z.coerce.number().positive(),
      }),
    )
    .min(1),
});

export const listMaterialIssuesQuerySchema = z.object({
  status: z.nativeEnum(IssueStatus).optional(),
  warehouseId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const approveMaterialIssueSchema = z.object({
  note: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().min(1),
        approvedQty: z.coerce.number().nonnegative(),
      }),
    )
    .optional(),
});

export const rejectMaterialIssueSchema = z.object({
  reason: z.string().min(1),
});

export type CreateMaterialIssueInput = z.infer<typeof createMaterialIssueSchema>;
export type ListMaterialIssuesQuery = z.infer<typeof listMaterialIssuesQuerySchema>;
export type ApproveMaterialIssueInput = z.infer<typeof approveMaterialIssueSchema>;
export type RejectMaterialIssueInput = z.infer<typeof rejectMaterialIssueSchema>;
