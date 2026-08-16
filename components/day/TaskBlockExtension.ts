import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { TaskBlockView } from "./TaskBlockView";
import { TASK_BLOCK_SEPARATOR } from "./taskBlockSpacing";

export function createTaskBlockSpacingPlugin(nodeName: string) {
  return new Plugin({
    appendTransaction(_transactions, _oldState, newState) {
      const separatorPositions: number[] = [];

      newState.doc.descendants((node, pos) => {
        if (node.type.name !== nodeName) return;

        const after = pos + node.nodeSize;
        const next = newState.doc.resolve(after).nodeAfter;
        if (!next?.isText || !next.text?.startsWith(TASK_BLOCK_SEPARATOR)) {
          separatorPositions.push(after);
        }
      });

      if (separatorPositions.length === 0) return null;

      const transaction = newState.tr;
      for (const pos of separatorPositions.reverse()) {
        const next = transaction.doc.resolve(pos).nodeAfter;
        if (next?.isText && next.text?.startsWith(" ")) {
          transaction.insertText(TASK_BLOCK_SEPARATOR, pos, pos + 1);
        } else {
          transaction.insertText(TASK_BLOCK_SEPARATOR, pos);
        }
      }
      return transaction;
    },

    props: {
      handleClick(view, pos) {
        const boundary = view.state.doc.resolve(pos);
        const task = boundary.nodeBefore;
        const next = boundary.nodeAfter;
        if (
          task?.type.name !== nodeName ||
          !next?.isText ||
          !next.text?.startsWith(TASK_BLOCK_SEPARATOR)
        ) {
          return false;
        }

        view.dispatch(
          view.state.tr.setSelection(TextSelection.create(view.state.doc, pos + 1))
        );
        return true;
      },

      handleKeyDown(view, event) {
        const { selection, doc } = view.state;
        if (event.key !== "Backspace" || !selection.empty || selection.from < 2) {
          return false;
        }

        const separatorStart = selection.from - 1;
        const boundary = doc.resolve(separatorStart);
        const task = boundary.nodeBefore;
        const next = boundary.nodeAfter;
        if (
          task?.type.name !== nodeName ||
          !next?.isText ||
          !next.text?.startsWith(TASK_BLOCK_SEPARATOR)
        ) {
          return false;
        }

        view.dispatch(
          view.state.tr.setSelection(
            NodeSelection.create(doc, separatorStart - task.nodeSize)
          )
        );
        return true;
      },

      decorations(state) {
        const { from, to, empty } = state.selection;
        if (empty) return null;
        const decos: Decoration[] = [];
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.type.name === nodeName) {
            decos.push(
              Decoration.node(pos, pos + node.nodeSize, { class: "pill-in-selection" })
            );
          }
        });
        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}

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
    return [createTaskBlockSpacingPlugin(this.name)];
  },
});
