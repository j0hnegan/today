import { z } from "zod";

// Hex color (#fff or #ffffff). Conservative: anything else is rejected.
const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color");

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: hexColor.optional().default("#6366f1"),
});

export const updateTagSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    color: hexColor.optional(),
  })
  .refine(
    (v) => Object.keys(v).length > 0,
    { message: "At least one field is required" }
  );

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
