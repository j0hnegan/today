import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

const isoDateTime = z.string().datetime({ offset: true });

const positiveInt = z.number().int().positive();

const tagIds = z.array(positiveInt).max(50);

export const destinationEnum = z.enum(["on_deck", "someday", "in_progress"]);
export const consequenceEnum = z.enum(["none", "soft", "hard"]);
export const sizeEnum = z.enum(["xs", "small", "medium", "large"]);
export const taskStatusEnum = z.enum(["active", "done"]);
const snoozeReasonEnum = z.enum([
  "out_of_energy",
  "waiting",
  "deadline_moved",
  "dont_want_to",
]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).optional().default(""),
  destination: destinationEnum.optional(),
  consequence: consequenceEnum.optional().default("none"),
  size: sizeEnum.optional().default("small"),
  due_date: isoDate.nullable().optional(),
  tag_ids: tagIds.optional().default([]),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(10_000).optional(),
    destination: destinationEnum.optional(),
    consequence: consequenceEnum.optional(),
    size: sizeEnum.optional(),
    status: taskStatusEnum.optional(),
    due_date: isoDate.nullable().optional(),
    snoozed_until: isoDateTime.nullable().optional(),
    snooze_reason: snoozeReasonEnum.nullable().optional(),
    sort_order: z.number().int().optional(),
    tag_ids: tagIds.optional(),
    category_ids: tagIds.optional(),
  })
  .refine(
    (v) => Object.keys(v).length > 0,
    { message: "At least one field is required" }
  );

export const reorderTasksSchema = z.object({
  task_ids: z.array(positiveInt).min(1).max(1000),
});

export const taskListQuerySchema = z.object({
  destination: destinationEnum.optional(),
  status: taskStatusEnum.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
