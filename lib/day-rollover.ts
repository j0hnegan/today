import type { Note } from "./types";

export interface DayRolloverCandidate {
  fromDate: string;
  blocks: unknown;
}

export interface DayContext {
  note: Note;
  rolloverCandidate: DayRolloverCandidate | null;
}

function docHasContent(blocks: unknown): boolean {
  if (typeof blocks !== "object" || blocks === null) return false;

  const node = blocks as { type?: unknown; text?: unknown; content?: unknown };
  if (node.type === "taskBlock") return true;
  if (node.type === "text" && typeof node.text === "string" && node.text.trim()) return true;
  return Array.isArray(node.content) && node.content.some(docHasContent);
}

export function createDayRolloverCandidate(
  today: Note,
  previousDay: Note | null
): DayRolloverCandidate | null {
  if (today.rollover_status || docHasContent(today.blocks) || !previousDay) return null;
  if (!docHasContent(previousDay.blocks)) return null;

  return { fromDate: previousDay.date, blocks: previousDay.blocks };
}
