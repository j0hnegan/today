import { SupabaseClient } from "@supabase/supabase-js";

export interface AutomationResult {
  promotedTasks: number;
  promotedTaskTitles: string[];
  bumpedOverdue: number;
  upgradedTasks: number;
  staledTasks: number;
  unsnoozedTasks: number;
  staledTaskTitles: string[];
}

/**
 * Promote someday tasks to today when due date is today or past.
 */
async function promoteDueTodayTasks(supabase: SupabaseClient): Promise<{ count: number; titles: string[] }> {
  const today = new Date().toISOString().split("T")[0];

  const { data: dueToday } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("destination", "someday")
    .eq("status", "active")
    .not("due_date", "is", null)
    .lte("due_date", today);

  if (!dueToday || dueToday.length === 0) return { count: 0, titles: [] };

  const ids = dueToday.map((t) => t.id);
  await supabase
    .from("tasks")
    .update({ destination: "on_deck", updated_at: new Date().toISOString() })
    .in("id", ids);

  return { count: dueToday.length, titles: dueToday.map((t) => t.title) };
}

/**
 * Auto-update past due dates to today for undone tasks.
 */
async function bumpOverdueDates(supabase: SupabaseClient): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data: overdue } = await supabase
    .from("tasks")
    .select("id")
    .neq("status", "done")
    .not("due_date", "is", null)
    .lt("due_date", today);

  if (!overdue || overdue.length === 0) return 0;

  const ids = overdue.map((t) => t.id);
  await supabase
    .from("tasks")
    .update({ due_date: today, updated_at: new Date().toISOString() })
    .in("id", ids);

  return overdue.length;
}

async function escalateUrgentTasks(supabase: SupabaseClient): Promise<number> {
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  const cutoff = twoDaysFromNow.toISOString().split("T")[0];

  const { data: urgent } = await supabase
    .from("tasks")
    .select("id")
    .eq("destination", "on_deck")
    .eq("status", "active")
    .eq("consequence", "none")
    .not("due_date", "is", null)
    .lte("due_date", cutoff);

  if (!urgent || urgent.length === 0) return 0;

  const ids = urgent.map((t) => t.id);
  await supabase
    .from("tasks")
    .update({ consequence: "hard", updated_at: new Date().toISOString() })
    .in("id", ids);

  return urgent.length;
}

async function moveStaleToSomeday(supabase: SupabaseClient): Promise<{ count: number; titles: string[] }> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = fourteenDaysAgo.toISOString();

  const { data: stale } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("destination", "on_deck")
    .eq("status", "active")
    .is("due_date", null)
    .lte("updated_at", cutoff);

  if (!stale || stale.length === 0) return { count: 0, titles: [] };

  const ids = stale.map((t) => t.id);
  await supabase
    .from("tasks")
    .update({ destination: "someday", updated_at: new Date().toISOString() })
    .in("id", ids);

  return { count: stale.length, titles: stale.map((t) => t.title) };
}

async function expireSnoozes(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();

  const { data: snoozed } = await supabase
    .from("tasks")
    .select("id")
    .not("snoozed_until", "is", null)
    .lte("snoozed_until", now);

  if (!snoozed || snoozed.length === 0) return 0;

  const ids = snoozed.map((t) => t.id);
  await supabase
    .from("tasks")
    .update({ snoozed_until: null, snooze_reason: null, updated_at: new Date().toISOString() })
    .in("id", ids);

  return snoozed.length;
}

export async function runAutomation(supabase: SupabaseClient): Promise<AutomationResult> {
  const bumpedOverdue = await bumpOverdueDates(supabase);
  const { count: promotedTasks, titles: promotedTaskTitles } = await promoteDueTodayTasks(supabase);
  const upgradedTasks = await escalateUrgentTasks(supabase);
  const { count: staledTasks, titles: staledTaskTitles } = await moveStaleToSomeday(supabase);
  const unsnoozedTasks = await expireSnoozes(supabase);

  return {
    promotedTasks,
    promotedTaskTitles,
    bumpedOverdue,
    upgradedTasks,
    staledTasks,
    unsnoozedTasks,
    staledTaskTitles,
  };
}
