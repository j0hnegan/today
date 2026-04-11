import { z } from "zod";

export const createCheckinSchema = z.object({
  energy: z.enum(["low", "medium", "high"]),
});

export type CreateCheckinInput = z.infer<typeof createCheckinSchema>;
