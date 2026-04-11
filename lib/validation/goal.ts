import { z } from "zod";

const goalStatus = z.enum(["active", "done"]);

export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  status: goalStatus.optional().default("active"),
});

export const updateGoalSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(10_000).nullable().optional(),
    category_id: z.number().int().positive().nullable().optional(),
    status: goalStatus.optional(),
    sort_order: z.number().int().optional(),
  })
  .refine(
    (v) => Object.keys(v).length > 0,
    { message: "At least one field is required" }
  );

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
