import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(1),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
