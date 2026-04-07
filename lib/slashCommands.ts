import {
  Heading1,
  FileText,
  CheckSquare,
  Sun,
  Cloud,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Paperclip,
  type LucideIcon,
} from "lucide-react";
import type { Task } from "./types";

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface SlashCommand {
  id: string;
  /** Alternative ids that also match this command (e.g. "img", "files") */
  aliases?: string[];
  label: string;
  description: string;
  icon: LucideIcon;
  /** 'insert' inserts HTML directly; 'picker' opens the item picker modal; 'file' opens file picker */
  action: "insert" | "picker" | "file";
  /** For 'insert' — returns HTML to inject at cursor */
  getHTML?: (ctx: SlashCommandContext) => string;
  /** For 'picker' — which picker to show */
  pickerType?: "doc" | "task";
}

export interface SlashCommandContext {
  onDeckTasks: Task[];
  somedayTasks: Task[];
}

function taskListHTML(tasks: Task[], heading: string): string {
  const h = escapeHTML(heading);
  if (tasks.length === 0) {
    return `<div data-slash-block contenteditable="false" class="slash-block"><div class="slash-block-heading">${h}</div><div class="slash-block-empty">No tasks</div></div><br>`;
  }
  const rows = tasks
    .map(
      (t) =>
        `<div class="slash-block-row">${escapeHTML(t.title)}${t.due_date ? ` <span class="slash-block-meta">${escapeHTML(t.due_date)}</span>` : ""}</div>`
    )
    .join("");
  return `<div data-slash-block contenteditable="false" class="slash-block"><div class="slash-block-heading">${h}</div>${rows}</div><br>`;
}

export function buildEmbedHTML(
  type: "doc" | "task",
  items: { id: number; title: string }[]
): string {
  return items
    .map(
      (item) =>
        `<span data-embed-type="${escapeHTML(type)}" data-embed-id="${item.id}" contenteditable="false" class="slash-embed">${type === "doc" ? "\u{1F4C4}" : "\u2705"} ${escapeHTML(item.title)}</span>`
    )
    .join(" ");
}

export interface InlineUpload {
  id?: number;
  filename: string;
  original_name: string;
  mime_type: string;
  naturalWidth?: number;
  naturalHeight?: number;
  /** Thumbnail filename for doc/PDF previews */
  thumbnail?: string;
}

function isDocMime(mime: string): boolean {
  return (
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.ms-excel" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function getDocIcon(mime: string): string {
  if (mime === "application/pdf") return "\u{1F4C4}";
  if (mime.includes("word") || mime === "application/msword") return "\u{1F4DD}";
  if (mime.includes("sheet") || mime.includes("excel")) return "\u{1F4CA}";
  return "\u{1F4CE}";
}

/** Build inline HTML for uploaded files/images */
export function buildInlineFileHTML(uploads: InlineUpload[]): string {
  return (
    uploads
      .map((u) => {
        const idAttr = u.id ? ` data-attachment-id="${u.id}"` : "";

        const fname = escapeHTML(u.filename);
        const origName = escapeHTML(u.original_name);

        if (u.mime_type.startsWith("image/")) {
          const nw = u.naturalWidth || 300;
          const initialW = Math.min(300, nw);
          return `<span data-inline-file data-filename="${fname}"${idAttr} data-natural-w="${nw}" data-natural-h="${u.naturalHeight || 300}" data-current-w="${initialW}" contenteditable="false" class="slash-inline-file" style="width:${initialW}px"><img src="/uploads/${fname}" alt="${origName}" class="slash-inline-img" /></span>`;
        }

        if (isDocMime(u.mime_type)) {
          const thumbName = u.thumbnail ? escapeHTML(u.thumbnail) : "";
          const previewInner = u.thumbnail
            ? `<img src="/uploads/${thumbName}" alt="${origName}" class="slash-doc-preview-thumb" />`
            : `<div class="slash-doc-preview-icon">${getDocIcon(u.mime_type)}</div>`;
          return `<span data-inline-file data-filename="${fname}"${idAttr} contenteditable="false" class="slash-inline-file slash-inline-doc-preview">${previewInner}<span class="slash-doc-preview-name">${origName}</span></span>`;
        }

        return `<span data-inline-file data-filename="${fname}"${idAttr} contenteditable="false" class="slash-inline-file-link">${getDocIcon(u.mime_type)} ${origName}</span>`;
      })
      .join(" ") + "<br>"
  );
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "h1",
    label: "Heading 1",
    description: "Large heading",
    icon: Heading1,
    action: "insert",
    getHTML: () => `<h1 class="slash-h1">\u200B</h1>`,
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium heading",
    icon: Heading2,
    action: "insert",
    getHTML: () => `<h2 class="slash-h2">\u200B</h2>`,
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small heading",
    icon: Heading3,
    action: "insert",
    getHTML: () => `<h3 class="slash-h3">\u200B</h3>`,
  },
  {
    id: "ul",
    label: "Bullet List",
    description: "Unordered list",
    icon: List,
    action: "insert",
    getHTML: () => `<ul><li>\u200B</li></ul>`,
  },
  {
    id: "ol",
    label: "Numbered List",
    description: "Ordered list",
    icon: ListOrdered,
    action: "insert",
    getHTML: () => `<ol><li>\u200B</li></ol>`,
  },
  {
    id: "quote",
    label: "Quote",
    description: "Block quote",
    icon: Quote,
    action: "insert",
    getHTML: () => `<blockquote class="slash-quote">\u200B</blockquote>`,
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule",
    icon: Minus,
    action: "insert",
    getHTML: () => `<hr class="slash-divider"><br>`,
  },
  // Pickers before bulk-insert commands so "/task" matches embed first
  {
    id: "task",
    label: "Task",
    description: "Embed a task link",
    icon: CheckSquare,
    action: "picker",
    pickerType: "task",
  },
  {
    id: "doc",
    label: "Document",
    description: "Embed a document link",
    icon: FileText,
    action: "picker",
    pickerType: "doc",
  },
  {
    id: "today",
    label: "Today's Tasks",
    description: "Insert on-deck task list",
    icon: Sun,
    action: "insert",
    getHTML: (ctx) => taskListHTML(ctx.onDeckTasks, "On Deck"),
  },
  {
    id: "someday",
    label: "Someday Tasks",
    description: "Insert someday task list",
    icon: Cloud,
    action: "insert",
    getHTML: (ctx) => taskListHTML(ctx.somedayTasks, "Someday"),
  },
  {
    id: "attach",
    aliases: ["files", "img", "image"],
    label: "Attach Image or Files",
    description: "Upload and insert files inline",
    icon: Paperclip,
    action: "file",
  },
];
