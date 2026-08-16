import type { JSONContent } from "@tiptap/core";

export const TASK_BLOCK_SEPARATOR = "\u00a0";

export function addTaskBlockSeparators(node: JSONContent): JSONContent {
  if (!node.content) return node;

  const children = node.content.map(addTaskBlockSeparators);
  const content: JSONContent[] = [];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    content.push(child);

    if (child.type !== "taskBlock") continue;

    const next = children[index + 1];
    if (next?.type === "text" && next.text?.startsWith(TASK_BLOCK_SEPARATOR)) {
      continue;
    }

    if (next?.type === "text" && next.text?.startsWith(" ")) {
      content.push({ ...next, text: TASK_BLOCK_SEPARATOR + next.text.slice(1) });
      index += 1;
      continue;
    }

    content.push({ type: "text", text: TASK_BLOCK_SEPARATOR });
  }

  return { ...node, content };
}
