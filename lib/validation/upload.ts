import { z } from "zod";

const entityTypeEnum = z.enum(["note", "document", "task"]);

export const uploadsQuerySchema = z.object({
  entity_type: entityTypeEnum,
  entity_id: z
    .string()
    .regex(/^\d+$/, "Must be a positive integer")
    .transform((s) => parseInt(s, 10))
    .refine((n) => n > 0, "Must be > 0"),
});

export const uploadFormSchema = z.object({
  entity_type: entityTypeEnum,
  entity_id: z
    .string()
    .regex(/^\d+$/, "Must be a positive integer")
    .transform((s) => parseInt(s, 10))
    .refine((n) => n > 0, "Must be > 0"),
});

export type UploadsQuery = z.infer<typeof uploadsQuerySchema>;
