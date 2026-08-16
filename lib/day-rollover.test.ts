import assert from "node:assert/strict";
import test from "node:test";
import { createDayRolloverCandidate } from "./day-rollover";
import type { Note } from "./types";

const emptyToday: Note = {
  id: null,
  date: "2026-08-16",
  content: "",
  blocks: null,
};

const previousDay: Note = {
  id: 1,
  date: "2026-08-15",
  content: "",
  blocks: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Carry me" }] }],
  },
};

test("offers the previous day's blocks when today is empty", () => {
  assert.deepEqual(createDayRolloverCandidate(emptyToday, previousDay), {
    fromDate: "2026-08-15",
    blocks: previousDay.blocks,
  });
});

test("does not offer rollover after today has started", () => {
  const today = {
    ...emptyToday,
    blocks: { type: "doc", content: [{ type: "taskBlock", attrs: { taskId: 1 } }] },
  };

  assert.equal(createDayRolloverCandidate(today, previousDay), null);
});

test("does not offer rollover after a decision was recorded", () => {
  const today = { ...emptyToday, rollover_status: "dismissed" as const };

  assert.equal(createDayRolloverCandidate(today, previousDay), null);
});

test("does not offer an empty previous day", () => {
  const yesterday = {
    ...previousDay,
    blocks: { type: "doc", content: [{ type: "paragraph" }] },
  };

  assert.equal(createDayRolloverCandidate(emptyToday, yesterday), null);
});
