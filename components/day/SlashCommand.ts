import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  SquareCheck,
  type LucideIcon,
} from "lucide-react";

// Actions the editor's host component provides for modal-based commands.
export interface SlashContext {
  openPicker: () => void;
  openNewTask: () => void;
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

export const SLASH_ITEMS: SlashItem[] = [
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

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) => item.label.toLowerCase().includes(q) || item.id.includes(q)
  );
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
