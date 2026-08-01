import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TaskBlockView } from "./TaskBlockView";

// An embedded task: a live reference to a vault task by id. The doc stores
// only the id — title, status, due date, tags all render from the SWR cache,
// so the block stays in sync with the vault. Deleting the block never touches
// the task itself.
export const TaskBlock = Node.create({
  name: "taskBlock",
  group: "block",
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
    return [{ tag: "div[data-task-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-task-block": "" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskBlockView);
  },
});
