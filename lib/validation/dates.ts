import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const datesRangeQuerySchema = z
  .object({
    from: isoDate,
    to: isoDate,
  })
  .refine((v) => v.from <= v.to, { message: "from must be <= to" });

export type DatesRangeQuery = z.infer<typeof datesRangeQuerySchema>;
