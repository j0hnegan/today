import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TaskBlockView } from "./TaskBlockView";

// An embedded task: a live reference to a vault task by id. The doc stores
// only the id — title, status, due date, tags all render from the SWR cache,
// so the pill stays in sync with the vault. Deleting the pill never touches
// the task itself.
//
// INLINE node: a task pill flows with text, so you can click to its right and
// type on the same line, hit Enter to push it around, and drag it between
// lines like a word.
export const TaskBlock = Node.create({
  name: "taskBlock",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      taskId: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-task-id");
          return raw ? Number(raw) : null;
        },
        renderHTML: (attrs: { taskId: number | null }) => ({
          "data-task-id": attrs.taskId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-task-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-task-block": "" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskBlockView);
  },
});
