import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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

  // Browsers don't paint ::selection over node views, so a text selection
  // (drag, cmd+A) would sweep past pills invisibly. Decorate every pill
  // inside the selection range so it highlights like the text around it.
  addProseMirrorPlugins() {
    const name = this.name;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const { from, to, empty } = state.selection;
            if (empty) return null;
            const decos: Decoration[] = [];
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.type.name === name) {
                decos.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: "pill-in-selection" })
                );
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
