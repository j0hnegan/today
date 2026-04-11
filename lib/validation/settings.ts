import { z } from "zod";

/**
 * Allowlist of settings keys the API will accept on PATCH.
 * Adding a new setting? Add the key here AND seed it in scripts/supabase-schema.sql.
 *
 * Without this allowlist, /api/settings PATCH was a textbook mass-assignment
 * vulnerability — any caller could write arbitrary keys into the table.
 */
export const WRITABLE_SETTINGS_KEYS = [
  "user_name",
  "checkin_interval_hours",
  "weekly_nudge_day",
  "vault_show_size",
  "vault_show_dates",
  "vault_show_goals",
] as const;

export type WritableSettingKey = (typeof WRITABLE_SETTINGS_KEYS)[number];

const settingValue = z
  .union([z.string().max(1000), z.number(), z.boolean()])
  .optional();

// Strict object — every key must be one of WRITABLE_SETTINGS_KEYS, all optional,
// at least one required. Unknown keys are rejected by .strict().
export const updateSettingsSchema = z
  .strictObject({
    user_name: settingValue,
    checkin_interval_hours: settingValue,
    weekly_nudge_day: settingValue,
    vault_show_size: settingValue,
    vault_show_dates: settingValue,
    vault_show_goals: settingValue,
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one setting is required",
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
