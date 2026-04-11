import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

// Block content is nested user data; cap each block size and total count to
// keep the JSON column from growing unbounded.
const blockSchema = z.object({
  id: z.string().max(100),
  type: z.string().max(50),
  content: z.string().max(50_000),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const upsertNoteSchema = z.object({
  date: isoDate,
  content: z.string().max(1_000_000).optional().default(""),
  blocks: z.array(blockSchema).max(500).nullable().optional(),
});

export const noteQuerySchema = z.object({
  date: isoDate,
});

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;
