import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
  CalendarClock,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  SquareCheck,
  Sun,
  Tag as TagIcon,
  type LucideIcon,
} from "lucide-react";
import type { Task } from "@/lib/types";

// Actions and data the editor's host component provides.
export interface SlashContext {
  openPicker: () => void;
  openNewTask: () => void;
  getTasks: () => Task[];
  insertTasks: (ids: number[]) => void;
}

export interface SlashItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  run: (editor: Editor, range: Range, ctx: SlashContext) => void;
}

const clearSlash = (editor: Editor, range: Range) =>
  editor.chain().focus().deleteRange(range);

const insertList = (dest: Task["destination"]) =>
  (editor: Editor, range: Range, ctx: SlashContext) => {
    clearSlash(editor, range).run();
    const ids = ctx
      .getTasks()
      .filter((t) => t.status === "active" && t.destination === dest)
      .map((t) => t.id);
    ctx.insertTasks(ids);
  };

const STATIC_ITEMS: SlashItem[] = [
  {
    id: "add",
    label: "Add tasks",
    description: "Pull tasks from the vault into today",
    icon: SquareCheck,
    run: (editor, range, ctx) => {
      clearSlash(editor, range).run();
      ctx.openPicker();
    },
  },
  {
    id: "task",
    label: "New task",
    description: "Create a task and embed it here",
    icon: Plus,
    run: (editor, range, ctx) => {
      clearSlash(editor, range).run();
      ctx.openNewTask();
    },
  },
  {
    id: "h1",
    label: "Heading 1",
    description: "Big section heading",
    icon: Heading1,
    run: (editor, range) => clearSlash(editor, range).setNode("heading", { level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    run: (editor, range) => clearSlash(editor, range).setNode("heading", { level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    run: (editor, range) => clearSlash(editor, range).setNode("heading", { level: 3 }).run(),
  },
  {
    id: "ul",
    label: "Bullet list",
    description: "Simple bullet list",
    icon: List,
    run: (editor, range) => clearSlash(editor, range).toggleBulletList().run(),
  },
  {
    id: "ol",
    label: "Numbered list",
    description: "Ordered list",
    icon: ListOrdered,
    run: (editor, range) => clearSlash(editor, range).toggleOrderedList().run(),
  },
  {
    id: "quote",
    label: "Quote",
    description: "Block quote",
    icon: Quote,
    run: (editor, range) => clearSlash(editor, range).toggleBlockquote().run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule",
    icon: Minus,
    run: (editor, range) => clearSlash(editor, range).setHorizontalRule().run(),
  },
];

// "/migraine" → one entry per tag or keyword matching the query, with its task
// count, inserting that whole cluster as blocks.
function termItems(query: string, ctx: SlashContext): SlashItem[] {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  const active = ctx.getTasks().filter((t) => t.status === "active");

  const tasksByTerm = new Map<string, Set<number>>();
  const collect = (term: string, taskId: number) => {
    const key = term.toLowerCase();
    if (!key.includes(q)) return;
    if (!tasksByTerm.has(key)) tasksByTerm.set(key, new Set());
    tasksByTerm.get(key)!.add(taskId);
  };
  for (const t of active) {
    for (const tag of t.tags ?? []) collect(tag.name, t.id);
    for (const kw of t.keywords ?? []) collect(kw, t.id);
  }

  return Array.from(tasksByTerm.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5)
    .map(([term, ids]) => ({
      id: `term:${term}`,
      label: term,
      description: `${ids.size} ${ids.size === 1 ? "task" : "tasks"} — insert all`,
      icon: TagIcon,
      run: (editor, range, runCtx) => {
        clearSlash(editor, range).run();
        // Recompute at run time so counts and membership are fresh.
        const fresh = runCtx
          .getTasks()
          .filter(
            (t) =>
              t.status === "active" &&
              ((t.tags ?? []).some((tag) => tag.name.toLowerCase() === term) ||
                (t.keywords ?? []).some((kw) => kw.toLowerCase() === term))
          )
          .map((t) => t.id);
        runCtx.insertTasks(fresh);
      },
    }));
}

export function filterSlashItems(query: string, ctx: SlashContext): SlashItem[] {
  const active = ctx.getTasks().filter((t) => t.status === "active");
  const count = (dest: Task["destination"]) =>
    active.filter((t) => t.destination === dest).length;

  const listItems: SlashItem[] = [];
  const todayCount = count("on_deck");
  if (todayCount > 0) {
    listItems.push({
      id: "today",
      label: `Today's tasks (${todayCount})`,
      description: "Insert every Today task as its own block",
      icon: Sun,
      run: insertList("on_deck"),
    });
  }
  const upcomingCount = count("upcoming");
  if (upcomingCount > 0) {
    listItems.push({
      id: "upcoming",
      label: `Upcoming tasks (${upcomingCount})`,
      description: "Insert every Upcoming task as its own block",
      icon: CalendarClock,
      run: insertList("upcoming"),
    });
  }

  const all = [...STATIC_ITEMS.slice(0, 2), ...listItems, ...STATIC_ITEMS.slice(2)];
  const q = query.toLowerCase();
  const filtered = q
    ? all.filter((item) => item.label.toLowerCase().includes(q) || item.id.includes(q))
    : all;

  // Tag/keyword matches lead when the user is typing a term.
  return [...termItems(query, ctx), ...filtered];
}

export const SlashCommand = Extension.create<{
  suggestion: Omit<SuggestionOptions<SlashItem>, "editor">;
}>({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
      } as Omit<SuggestionOptions<SlashItem>, "editor">,
    };
  },

  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
  },
});
