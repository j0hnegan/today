import assert from "node:assert/strict";
import test from "node:test";
import { getSchema, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { createTaskBlockSpacingPlugin, TaskBlock } from "./TaskBlockExtension";

const schema = getSchema([StarterKit, TaskBlock]);

function createState(text = "") {
  const content: JSONContent[] = [
    { type: "taskBlock", attrs: { taskId: 7 } },
  ];
  if (text) content.push({ type: "text", text });

  return EditorState.create({
    schema,
    doc: schema.nodeFromJSON({
      type: "doc",
      content: [{ type: "paragraph", content }],
    }),
    plugins: [createTaskBlockSpacingPlugin("taskBlock")],
  });
}

test("repairs a missing separator after a live editor transaction", () => {
  const state = createState();
  const nextState = state.applyTransaction(state.tr.setMeta("test", true)).state;

  assert.deepEqual(JSON.parse(JSON.stringify(nextState.doc.toJSON())), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "taskBlock", attrs: { taskId: 7 } },
          { type: "text", text: "\u00a0" },
        ],
      },
    ],
  });
});

test("clicking at the pill boundary puts the caret after the separator", () => {
  let state = createState("\u00a0");
  const view = {
    get state() {
      return state;
    },
    dispatch(transaction: Parameters<EditorView["dispatch"]>[0]) {
      state = state.apply(transaction);
    },
  } as EditorView;

  const plugin = state.plugins[0];
  const handled = plugin.props.handleClick?.call(
    plugin,
    view,
    2,
    {} as MouseEvent
  );

  assert.equal(handled, true);
  assert.ok(state.selection instanceof TextSelection);
  assert.equal(state.selection.from, 3);
});

test("Backspace after an empty separator selects the pill", () => {
  let state = createState("\u00a0");
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 3)));
  const view = {
    get state() {
      return state;
    },
    dispatch(transaction: Parameters<EditorView["dispatch"]>[0]) {
      state = state.apply(transaction);
    },
  } as EditorView;

  const plugin = state.plugins[0];
  const handled = plugin.props.handleKeyDown?.call(
    plugin,
    view,
    { key: "Backspace" } as KeyboardEvent
  );

  assert.equal(handled, true);
  assert.ok(state.selection instanceof NodeSelection);
  assert.equal(state.selection.from, 1);
});
