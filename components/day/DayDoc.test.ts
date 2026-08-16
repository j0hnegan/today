import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDoc, taskParagraphs } from "./DayDoc";

test("normalizes a task pill with one non-breaking separator after it", () => {
  const doc = normalizeDoc({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "taskBlock", attrs: { taskId: 7 } }],
      },
    ],
  });

  assert.deepEqual(doc, {
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

test("normalization is idempotent and converts a regular leading space", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "taskBlock", attrs: { taskId: 7 } },
          { type: "text", text: " hello" },
        ],
      },
    ],
  };

  const normalized = normalizeDoc(doc);
  assert.deepEqual(normalized, {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "taskBlock", attrs: { taskId: 7 } },
          { type: "text", text: "\u00a0hello" },
        ],
      },
    ],
  });
  assert.deepEqual(normalizeDoc(normalized), normalized);
});

test("new task paragraphs include the separator", () => {
  assert.deepEqual(taskParagraphs([7]), [
    {
      type: "paragraph",
      content: [
        { type: "taskBlock", attrs: { taskId: 7 } },
        { type: "text", text: "\u00a0" },
      ],
    },
  ]);
});

test("normalization does not mutate the saved document object", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "taskBlock", attrs: { taskId: 7 } },
          { type: "text", text: " hello" },
        ],
      },
    ],
  };

  normalizeDoc(doc);

  assert.equal(doc.content[0].content[1].text, " hello");
});
