import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

const rowSchema = z.object({
  id: z.string().max(100),
  date: z.union([isoDate, z.literal("")]),
  description: z.string().max(500),
  amount_in: z.number().finite(),
  amount_out: z.number().finite(),
  locked: z.boolean(),
});

export const upsertCashFlowSchema = z.object({
  title: z.string().max(200).optional().default("Cash Flow Forecast"),
  starting_balance: z.number().finite().optional().default(0),
  starting_date: z.union([isoDate, z.literal("")]).nullable().optional(),
  rows: z.array(rowSchema).max(500).optional().default([]),
});

export type UpsertCashFlowInput = z.infer<typeof upsertCashFlowSchema>;
