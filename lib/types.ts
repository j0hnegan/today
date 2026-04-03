export type View = "focus" | "vault" | "tags" | "docs";
export const VALID_VIEWS: View[] = ["focus", "vault", "tags", "docs"];

export type Destination = "on_deck" | "someday" | "in_progress";
export type Consequence = "none" | "soft" | "hard";
export type Size = "xs" | "small" | "medium" | "large";
export type TaskStatus = "active" | "done";
export type EnergyLevel = "low" | "medium" | "high";
export type TimeAvailable = "xs" | "small" | "medium" | "large";
export type SnoozeReason =
  | "out_of_energy"
  | "waiting"
  | "deadline_moved"
  | "dont_want_to";

export interface Category {
  id: number;
  name: string;
  color: string;
}

// Backward compat alias
export type Tag = Category;

export interface Goal {
  id: number;
  title: string;
  description: string;
  category_id: number | null;
  category?: Category;
  status: "active" | "done";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  destination: Destination;
  consequence: Consequence;
  size: Size;
  status: TaskStatus;
  due_date: string | null;
  snoozed_until: string | null;
  snooze_reason: string | null;
  done_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Document {
  id: number;
  title: string;
  content: string;
  sort_order: number;
  categories?: Category[];
  goals?: Goal[];
  created_at: string;
  updated_at: string;
}

export type BlockType =
  | "text"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet-list"
  | "numbered-list"
  | "quote"
  | "divider"
  | "task-list"
  | "document"
  | "attachment"
  | "goal"
  | "category";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  meta?: Record<string, unknown>;
}

export interface Note {
  id: number | null;
  date: string;
  content: string;
  blocks?: Block[];
  attachments?: Attachment[];
  created_at?: string;
  updated_at?: string;
}

export interface Attachment {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  entity_type: "note" | "document" | "task";
  entity_id: number;
  thumbnail?: string;
  created_at: string;
}

export interface CheckIn {
  id: number;
  energy: EnergyLevel;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

/** Normalize consequence to binary: soft is treated as hard (has consequences) */
export function normalizeConsequence(c: Consequence): "none" | "hard" {
  return c === "none" ? "none" : "hard";
}
