import type { Block, BlockType } from "./types";

let counter = 0;

/** Generate a unique block ID */
export function blockId(): string {
  counter += 1;
  return `b${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a new block */
export function createBlock(
  type: BlockType,
  content = "",
  meta?: Record<string, unknown>
): Block {
  return { id: blockId(), type, content, ...(meta ? { meta } : {}) };
}

const MIN_LINES = 20;

/** Pad blocks with empty text lines to fill the panel */
export function padBlocks(blocks: Block[], minLines = MIN_LINES): Block[] {
  const count = blocks.length;
  if (count >= minLines) return blocks;
  const padded = [...blocks];
  for (let i = count; i < minLines; i++) {
    padded.push(createBlock("text"));
  }
  return padded;
}

/** Strip trailing empty text blocks for clean storage */
export function stripTrailingEmpty(blocks: Block[]): Block[] {
  const result = [...blocks];
  while (result.length > 1) {
    const last = result[result.length - 1];
    if (last.type === "text" && last.content === "") {
      result.pop();
    } else {
      break;
    }
  }
  return result;
}

/** Move a block from one index to another (to = insertion index before removal) */
export function moveBlock(blocks: Block[], from: number, to: number): Block[] {
  const result = [...blocks];
  const [removed] = result.splice(from, 1);
  // After removing, adjust insertion index if it was after the removed item
  const insertAt = to > from ? to - 1 : to;
  result.splice(insertAt, 0, removed);
  return result;
}

/** Parse HTML content into blocks (migration from raw HTML notes) */
export function htmlToBlocks(html: string): Block[] {
  if (!html || !html.trim()) {
    return [createBlock("text")];
  }

  // Use a temporary DOM element to parse
  const div = document.createElement("div");
  div.innerHTML = html;

  const blocks: Block[] = [];

  for (let i = 0; i < div.childNodes.length; i++) {
    const node = div.childNodes[i];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? "";
      if (text) {
        blocks.push(createBlock("text", text));
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Slash block (task list embeds, on-deck/someday)
    if (el.hasAttribute("data-slash-block")) {
      // Skip — these are legacy slash-block embeds, not used in new system
      continue;
    }

    // Inline file embeds
    if (el.hasAttribute("data-inline-file")) {
      const filename = el.getAttribute("data-filename") || "";
      const attachmentId = el.getAttribute("data-attachment-id");
      const mime = el.querySelector("img") ? "image/" : "application/";
      blocks.push(createBlock("attachment", "", {
        filename,
        attachmentId: attachmentId ? parseInt(attachmentId, 10) : undefined,
        mime_type: mime,
      }));
      continue;
    }

    // Embedded doc/task references
    if (el.hasAttribute("data-embed-type")) {
      const embedType = el.getAttribute("data-embed-type");
      const embedId = el.getAttribute("data-embed-id");
      if (embedType === "doc" && embedId) {
        blocks.push(createBlock("document", el.textContent?.replace(/^📄\s*/, "") || "", {
          docId: parseInt(embedId, 10),
        }));
      }
      continue;
    }

    // Headings
    if (tag === "h1" || el.classList.contains("slash-h1")) {
      blocks.push(createBlock("heading1", el.textContent?.replace(/\u200B/g, "") || ""));
      continue;
    }
    if (tag === "h2" || el.classList.contains("slash-h2")) {
      blocks.push(createBlock("heading2", el.textContent?.replace(/\u200B/g, "") || ""));
      continue;
    }
    if (tag === "h3" || el.classList.contains("slash-h3")) {
      blocks.push(createBlock("heading3", el.textContent?.replace(/\u200B/g, "") || ""));
      continue;
    }

    // Lists
    if (tag === "ul") {
      const items = el.querySelectorAll("li");
      items.forEach((li) => {
        blocks.push(createBlock("bullet-list", li.textContent?.replace(/\u200B/g, "") || ""));
      });
      continue;
    }
    if (tag === "ol") {
      const items = el.querySelectorAll("li");
      items.forEach((li) => {
        blocks.push(createBlock("numbered-list", li.textContent?.replace(/\u200B/g, "") || ""));
      });
      continue;
    }

    // Blockquote
    if (tag === "blockquote" || el.classList.contains("slash-quote")) {
      blocks.push(createBlock("quote", el.textContent?.replace(/\u200B/g, "") || ""));
      continue;
    }

    // Divider
    if (tag === "hr") {
      blocks.push(createBlock("divider"));
      continue;
    }

    // BR — skip empty line breaks
    if (tag === "br") {
      continue;
    }

    // Default: treat as text paragraph
    const text = el.textContent?.replace(/\u200B/g, "").trim() ?? "";
    if (text) {
      blocks.push(createBlock("text", text));
    }
  }

  // Ensure at least one block
  if (blocks.length === 0) {
    blocks.push(createBlock("text"));
  }

  return blocks;
}

/** Render blocks back to HTML (for backward compat / search) */
export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "text":
          return block.content ? `<div>${escapeHtml(block.content)}</div>` : "";
        case "heading1":
          return `<h1>${escapeHtml(block.content)}</h1>`;
        case "heading2":
          return `<h2>${escapeHtml(block.content)}</h2>`;
        case "heading3":
          return `<h3>${escapeHtml(block.content)}</h3>`;
        case "bullet-list":
          return `<ul><li>${escapeHtml(block.content)}</li></ul>`;
        case "numbered-list":
          return `<ol><li>${escapeHtml(block.content)}</li></ol>`;
        case "quote":
          return `<blockquote>${escapeHtml(block.content)}</blockquote>`;
        case "divider":
          return "<hr>";
        case "task-list":
          return ""; // rendered by React, not in HTML
        case "document":
          return `<span data-embed-type="doc" data-embed-id="${block.meta?.docId}">📄 ${escapeHtml(block.content)}</span>`;
        case "attachment":
          return `<span data-inline-file data-filename="${block.meta?.filename}"></span>`;
        case "goal":
          return `<span data-block-goal="${block.meta?.goalId}">${escapeHtml(block.content)}</span>`;
        case "category":
          return `<span data-block-category="${block.meta?.categoryId}">${escapeHtml(block.content)}</span>`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
