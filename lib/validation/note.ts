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

export const dayRolloverSchema = z
  .object({
    from_date: isoDate,
    to_date: isoDate,
    action: z.enum(["carried", "dismissed"]),
  })
  .refine(
    ({ from_date, to_date }) => {
      const from = Date.parse(`${from_date}T00:00:00Z`);
      const to = Date.parse(`${to_date}T00:00:00Z`);
      return to - from === 24 * 60 * 60 * 1000;
    },
    { message: "Rollover dates must be consecutive" }
  );

export type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;
