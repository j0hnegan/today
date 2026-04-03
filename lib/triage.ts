/**
 * Returns true if the given due date string (YYYY-MM-DD) is today or in the past.
 * Tasks due today belong in the Today section.
 */
export function isDueToday(dueDateStr: string): boolean {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  return dueDateStr <= todayStr;
}
