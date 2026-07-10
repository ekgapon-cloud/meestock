import { z } from "zod";

export const PROJECT_STATUSES = ["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const createProjectSchema = z
  .object({
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    // Either link an existing customer or create one inline — exactly one.
    customerId: z.string().min(1).optional(),
    newCustomerName: z.string().trim().min(1).optional(),
    newCustomerContact: z.string().trim().min(1).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    contractValue: z.coerce.number().nonnegative(),
    materialBudget: z.coerce.number().nonnegative().optional(),
    laborBudget: z.coerce.number().nonnegative().optional(),
    otherBudget: z.coerce.number().nonnegative().optional(),
    // Name for the SITE warehouse created alongside the project; defaults to the project name.
    warehouseName: z.string().trim().min(1).optional(),
  })
  .refine((v) => Boolean(v.customerId) !== Boolean(v.newCustomerName), {
    message: "Provide either an existing customerId or a newCustomerName, not both",
    path: ["customerId"],
  });

export const updateProjectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  contractValue: z.coerce.number().nonnegative().optional(),
  materialBudget: z.coerce.number().nonnegative().nullable().optional(),
  laborBudget: z.coerce.number().nonnegative().nullable().optional(),
  otherBudget: z.coerce.number().nonnegative().nullable().optional(),
});

export const listProjectsQuerySchema = z.object({
  status: z.enum(PROJECT_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
