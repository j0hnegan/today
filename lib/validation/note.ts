import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

// `blocks` holds the Day view's Tiptap doc JSON (arbitrary nested structure).
// Cap serialized size to keep the JSON column from growing unbounded.
const blocksSchema = z
  .unknown()
  .refine((v) => JSON.stringify(v).length <= 1_000_000, "blocks too large");

export const upsertNoteSchema = z.object({
  date: isoDate,
  content: z.string().max(1_000_000).optional(),
  blocks: blocksSchema.nullable().optional(),
});

export const noteQuerySchema = z.object({
  date: isoDate,
});

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;
