import type Database from "better-sqlite3";

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
 * Moves tasks from someday → on_deck so they show up in the Today column.
 */
function promoteDueTodayTasks(
  db: Database.Database
): { count: number; titles: string[] } {
  const today = new Date().toISOString().split("T")[0];

  const txn = db.transaction(() => {
    const dueToday = db
      .prepare(
        `
      SELECT title FROM tasks
      WHERE destination = 'someday'
        AND status = 'active'
        AND due_date IS NOT NULL
        AND due_date <= ?
    `
      )
      .all(today) as { title: string }[];

    const result = db
      .prepare(
        `
      UPDATE tasks
      SET destination = 'on_deck', updated_at = datetime('now')
      WHERE destination = 'someday'
        AND status = 'active'
        AND due_date IS NOT NULL
        AND due_date <= ?
    `
      )
      .run(today);

    return { count: result.changes, titles: dueToday.map((t) => t.title) };
  });

  return txn();
}

/**
 * Auto-update past due dates to today for undone tasks.
 * If a task is overdue, bump its due_date to today so it stays current.
 */
function bumpOverdueDates(db: Database.Database): number {
  const today = new Date().toISOString().split("T")[0];

  const result = db
    .prepare(
      `
    UPDATE tasks
    SET due_date = ?, updated_at = datetime('now')
    WHERE status != 'done'
      AND due_date IS NOT NULL
      AND due_date < ?
  `
    )
    .run(today, today);

  return result.changes;
}

function escalateUrgentTasks(db: Database.Database): number {
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  const cutoff = twoDaysFromNow.toISOString().split("T")[0];

  const result = db
    .prepare(
      `
    UPDATE tasks
    SET consequence = 'hard', updated_at = datetime('now')
    WHERE destination = 'on_deck'
      AND status = 'active'
      AND consequence = 'none'
      AND due_date IS NOT NULL
      AND due_date <= ?
  `
    )
    .run(cutoff);

  return result.changes;
}

function moveStaleToSomeday(
  db: Database.Database
): { count: number; titles: string[] } {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = fourteenDaysAgo.toISOString();

  const txn = db.transaction(() => {
    const stale = db
      .prepare(
        `
      SELECT title FROM tasks
      WHERE destination = 'on_deck'
        AND status = 'active'
        AND due_date IS NULL
        AND updated_at <= ?
    `
      )
      .all(cutoff) as { title: string }[];

    const result = db
      .prepare(
        `
      UPDATE tasks
      SET destination = 'someday', updated_at = datetime('now')
      WHERE destination = 'on_deck'
        AND status = 'active'
        AND due_date IS NULL
        AND updated_at <= ?
    `
      )
      .run(cutoff);

    return { count: result.changes, titles: stale.map((t) => t.title) };
  });

  return txn();
}

function expireSnoozes(db: Database.Database): number {
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `
    UPDATE tasks
    SET snoozed_until = NULL, snooze_reason = NULL, updated_at = datetime('now')
    WHERE snoozed_until IS NOT NULL
      AND snoozed_until <= ?
  `
    )
    .run(now);

  return result.changes;
}

export function runAutomation(db: Database.Database): AutomationResult {
  // Bump overdue dates to today first
  const bumpedOverdue = bumpOverdueDates(db);
  // Promote due-today tasks from someday → today
  const { count: promotedTasks, titles: promotedTaskTitles } =
    promoteDueTodayTasks(db);
  const upgradedTasks = escalateUrgentTasks(db);
  const { count: staledTasks, titles: staledTaskTitles } =
    moveStaleToSomeday(db);
  const unsnoozedTasks = expireSnoozes(db);

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
