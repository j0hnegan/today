import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SWRConfig } from "swr";
import { TodayLayout } from "./TodayLayout";

// tsx uses the classic JSX transform for this project's preserve setting.
Object.assign(globalThis, { React });

test("Today keeps the notes editor beside only active Today and In Progress tasks", () => {
  const tasks = [
    { id: 1, title: "Today task", destination: "on_deck", status: "active" },
    { id: 2, title: "Ongoing task", destination: "in_progress", status: "active" },
    { id: 3, title: "Future task", destination: "upcoming", status: "active" },
    { id: 4, title: "Finished task", destination: "on_deck", status: "done" },
  ].map((task) => ({ ...task, size: "small", consequence: "soft", tags: [] }));
  const html = renderToStaticMarkup(
    <SWRConfig value={{ provider: () => new Map(), fallback: { "/api/tasks": tasks, "/api/tags": [] } }}>
      <TodayLayout><div>Existing notes editor</div></TodayLayout>
    </SWRConfig>
  );
  for (const text of ["Existing notes editor", "Today task", "In Progress", 'role="tablist"']) {
    assert.ok(html.includes(text), text);
  }
  for (const label of ["Due date", "Not today", "Delete task"]) {
    assert.ok(html.includes(`aria-label="${label}"`), label);
  }
  assert.ok(html.includes("lucide-arrow-right"));
  assert.ok(html.includes("+ Add a task"));
  assert.ok(!html.includes("15-30 min"));
  assert.ok(!html.includes("lucide-grip-vertical"));
  assert.ok(!html.includes("Ongoing task"));
  assert.ok(!html.includes("Future task"));
  assert.ok(!html.includes("Finished task"));
  assert.ok(html.indexOf('data-today-panel="notes"') < html.indexOf('data-today-panel="tasks"'));
});
