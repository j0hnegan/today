# Agentic task research loop

## What
A scheduled Claude loop that reads my `today` + `upcoming` tasks (via the Hush MCP),
researches each one using the tools available (email, web), and stages the results so
each task is "ready for me to approve" — without ever contacting anyone.

## Detail
- Pull tasks from `today` + `upcoming` (Hush MCP `list_today` / `list_tasks`).
- For each task, research based on its title/description:
  - Search my Gmail (Gmail MCP) to figure out status / where we left off.
  - Find phone numbers, links, facts via web search.
  - **Draft** emails where useful — as drafts only.
- Write findings back onto the task (description / notes / subtasks) so when I open it,
  the legwork is done and I just review/approve/send.
- **Multi-step tasks:** break a big task into an ordered plan of sub-steps and surface
  it for approval. Example: "look into mom's hospital experience → lawsuit?" becomes
  (1) research medical-malpractice law, (2) find malpractice lawyers in the area,
  (3) RI Medical Board complaint process, etc.
- **HARD RULE (matches how the loops already operate):** never send an email, message,
  or place a call autonomously. Research + draft + stage only. I approve and send.

## Builder proposal (2026-06-07) — for John's go/no-go
This is big; I'd ship it in slices, not all at once. Proposed **first slice**:
- A new scheduled **"researcher" routine** (separate from the code builder) that reads
  `today` + `upcoming` tasks via the Hush MCP.
- For each task, search Gmail (Gmail MCP) for related threads and write a short
  **"where this stands"** summary into the task's description/notes — no drafting, no
  sending, nothing leaves the app.
- You open a task and the context is already there.

Deliberately **deferred to later slices:** drafting emails, phone/contact lookup, and
multi-step decomposition (e.g. the malpractice example). Those are bigger and worth
designing once the read-only research slice proves useful.

Reply **"go"** to build this first slice as `review`, or **"let's talk"** to shape it.

## Definition of done
First slice: the researcher routine annotates today/upcoming tasks with an email-status
summary on a schedule, touching no one. Later slices TBD.

## Notes
- Needs Gmail + web tools available in the run context.
- Builds on the loop infrastructure already in `.claude/loops/`.
- A first slice writes into existing task fields (no schema migration expected); deeper
  versions (real subtasks) may need a data change — flag if so.

## Refined direction (2026-06-07, John)
Go well beyond read-only. The agent should do whatever John could do at his own computer
to advance each task as far as possible with minimal input — read email, read iMessages,
drive the browser, search the web, etc. — then stage the results for him.
**HARD GUARDRAIL:** never send an email/message or otherwise act outward on his behalf
unless John explicitly approves that specific action. Large, multi-phase (tool access +
permissioning + the never-send rule); builder to propose a phased plan when unparked.

## Revised shape (2026-06-07, John) — UNPARKED
This is the same pattern as the build-loop (autonomous work on a schedule + dispatches/
standup), but pointed at John's REAL tasks instead of dev work ("less meta"). A scheduled
"personal-task agent" routine reads today/upcoming tasks, advances each as far as it can
using full computer-use (email, iMessage, browser, web), and gives John a standup-style
update. Same never-send guardrail. Build = write the agent playbook + create the routine;
builder to propose a phased plan (start narrow, expand capabilities).
