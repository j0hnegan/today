import { z } from "zod";

const positiveInt = z.number().int().positive();
const idArray = z.array(positiveInt).max(100);

export const createDocSchema = z.object({
  title: z.string().trim().max(200).optional().default("Untitled"),
  content: z.string().max(1_000_000).optional().default(""),
  category_ids: idArray.optional().default([]),
  goal_ids: idArray.optional().default([]),
});

export const updateDocSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(1_000_000).optional(),
    sort_order: z.number().int().optional(),
    category_ids: idArray.optional(),
    goal_ids: idArray.optional(),
  })
  .refine(
    (v) => Object.keys(v).length > 0,
    { message: "At least one field is required" }
  );

export type CreateDocInput = z.infer<typeof createDocSchema>;
export type UpdateDocInput = z.infer<typeof updateDocSchema>;
