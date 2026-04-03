import type {
  Task,
  EnergyLevel,
  Consequence,
  Size,
  TimeAvailable,
} from "./types";
import { normalizeConsequence } from "./types";

export interface TaskSelectorInput {
  energy: EnergyLevel;
  timeAvailable?: TimeAvailable;
  onDeckTasks: Task[];
}

export interface TaskSelectorResult {
  task: Task | null;
  message?: string;
  showRest: boolean;
}

function consequenceScore(c: Consequence): number {
  // Binary: has consequences (hard/soft) = 3, no consequences = 1
  return normalizeConsequence(c) === "hard" ? 3 : 1;
}

function sizeScore(s: Size): number {
  return { xs: 1, small: 2, medium: 3, large: 4 }[s];
}

function isDueWithinDays(task: Task, days: number): boolean {
  if (!task.due_date) return false;
  const due = new Date(task.due_date + "T23:59:59");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return due <= cutoff;
}

function hasConsequence(task: Task): boolean {
  return normalizeConsequence(task.consequence) === "hard";
}

function isSnoozed(task: Task): boolean {
  if (!task.snoozed_until) return false;
  return new Date(task.snoozed_until) > new Date();
}

function compareTasks(a: Task, b: Task): number {
  // Higher consequence first
  const cDiff = consequenceScore(b.consequence) - consequenceScore(a.consequence);
  if (cDiff !== 0) return cDiff;

  // Earlier due date first (nulls last)
  if (a.due_date && b.due_date) {
    const dDiff =
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (dDiff !== 0) return dDiff;
  } else if (a.due_date) return -1;
  else if (b.due_date) return 1;

  // Smaller size first
  return sizeScore(a.size) - sizeScore(b.size);
}

function filterByTime(tasks: Task[], timeAvailable?: TimeAvailable): Task[] {
  let filtered = tasks;

  if (timeAvailable === "xs") {
    filtered = tasks.filter((t) => t.size === "xs");
  } else if (timeAvailable === "small") {
    filtered = tasks.filter((t) => t.size === "xs" || t.size === "small");
  } else if (timeAvailable === "medium") {
    filtered = tasks.filter(
      (t) => t.size === "xs" || t.size === "small" || t.size === "medium"
    );
  }
  // large / undefined = no filter

  // If time filter eliminated everything, fall back to all tasks
  if (filtered.length === 0) {
    filtered = tasks;
  }

  return filtered;
}

export function selectTask(input: TaskSelectorInput): TaskSelectorResult {
  const { energy, timeAvailable, onDeckTasks } = input;

  // Pre-filter: active, not snoozed
  const available = onDeckTasks.filter(
    (t) => t.status === "active" && !isSnoozed(t)
  );

  if (available.length === 0) {
    return {
      task: null,
      message: "Nothing on deck right now. Rest without guilt.",
      showRest: true,
    };
  }

  if (energy === "low") {
    return selectLowEnergy(available);
  } else if (energy === "medium") {
    return selectMediumEnergy(available, timeAvailable);
  } else {
    return selectHighEnergy(available, timeAvailable);
  }
}

function selectLowEnergy(tasks: Task[]): TaskSelectorResult {
  // 1. Has consequences + due within 1 day
  const urgentConsequence = tasks
    .filter((t) => hasConsequence(t) && isDueWithinDays(t, 1))
    .sort(compareTasks);

  if (urgentConsequence.length > 0) {
    return { task: urgentConsequence[0], showRest: false };
  }

  // 2. Nothing critical — rest
  return {
    task: null,
    message: "Nothing critical today. Rest.",
    showRest: true,
  };
}

function selectMediumEnergy(
  tasks: Task[],
  timeAvailable?: TimeAvailable
): TaskSelectorResult {
  // 1. Has consequences + due within 5 days
  const urgentConsequence = tasks
    .filter((t) => hasConsequence(t) && isDueWithinDays(t, 5))
    .sort(compareTasks);

  if (urgentConsequence.length > 0) {
    return { task: urgentConsequence[0], showRest: false };
  }

  // 2. Filter by time available, then pick top by priority
  const filtered = filterByTime(tasks, timeAvailable);

  const sorted = [...filtered].sort(compareTasks);
  if (sorted.length > 0) {
    return { task: sorted[0], showRest: false };
  }

  return {
    task: null,
    message: "All clear. Enjoy your day.",
    showRest: true,
  };
}

function selectHighEnergy(
  tasks: Task[],
  timeAvailable?: TimeAvailable
): TaskSelectorResult {
  const filtered = filterByTime(tasks, timeAvailable);

  const sorted = filtered.sort(compareTasks);

  if (sorted.length > 0) {
    return { task: sorted[0], showRest: false };
  }

  return {
    task: null,
    message: "All clear. Enjoy your day.",
    showRest: true,
  };
}

// Pick a random energy-appropriate task (for "give me something anyway" on rest screen)
export function selectRandomTask(input: TaskSelectorInput): Task | null {
  const { energy, timeAvailable, onDeckTasks } = input;

  const available = onDeckTasks.filter(
    (t) => t.status === "active" && !isSnoozed(t)
  );

  if (available.length === 0) return null;

  let pool: Task[];

  if (energy === "low") {
    // Low energy: only xs and small tasks
    pool = available.filter((t) => t.size === "xs" || t.size === "small");
  } else {
    // Medium/high: respect time filter if set
    pool = filterByTime(available, timeAvailable);
  }

  // Fall back to all available if filter emptied the pool
  if (pool.length === 0) pool = available;

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Smart pull ranking: size (smaller first) → consequence (yes first) → due date (sooner first).
 * Used when pulling a task from the someday pool for "I'm ready" or auto-pull.
 */
function comparePullTasks(a: Task, b: Task): number {
  // Smaller size first
  const sDiff = sizeScore(a.size) - sizeScore(b.size);
  if (sDiff !== 0) return sDiff;

  // Higher consequence first
  const cDiff =
    consequenceScore(b.consequence) - consequenceScore(a.consequence);
  if (cDiff !== 0) return cDiff;

  // Earlier due date first (nulls last)
  if (a.due_date && b.due_date) {
    const dDiff =
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (dDiff !== 0) return dDiff;
  } else if (a.due_date) return -1;
  else if (b.due_date) return 1;

  return 0;
}

/**
 * Select the best task to pull from the someday pool (or any pool).
 * Ranking: smallest size first, with consequences prioritized, then due date.
 */
export function selectPullTask(tasks: Task[]): Task | null {
  const available = tasks.filter(
    (t) => t.status === "active" && !isSnoozed(t)
  );
  if (available.length === 0) return null;

  const sorted = [...available].sort(comparePullTasks);
  return sorted[0];
}

// Check if there are remaining urgent tasks (used for completion screen messaging)
export function hasRemainingUrgentTasks(
  tasks: Task[],
  excludeTaskId: number
): boolean {
  return tasks.some(
    (t) =>
      t.id !== excludeTaskId &&
      t.status === "active" &&
      !isSnoozed(t) &&
      hasConsequence(t) &&
      isDueWithinDays(t, 1)
  );
}
