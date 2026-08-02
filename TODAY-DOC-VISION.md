# Today Doc — Vision & Thinking

Captured from a brainstorm on 2026-08-01. The v1 build is in progress; this file
holds the full thinking so we can come back to the deeper ideas later.

## The root problem

A due-date-sorted Today list is a **push system**: the app decides what your day
is and presents it as an assignment. That creates the "boss nagging you"
dynamic — resentment, avoidance, feeling behind the eight ball even when the
tasks themselves are fine. Meanwhile the real driver of the day (humidity spiked,
migraine hit, money landed, inspiration struck) lives in your head and has no
representation in the app. Every morning there's a fight between what the app
says today is and what today actually is.

John works by **pull**: "what's alive today? what feels urgent or inspiring
right now?" The same task can feel like work one day and play another — mostly
depending on whether it was chosen or assigned.

## The reframe

**The vault is memory, the doc is attention.** The old Today view made memory
dictate attention. The new one lets attention query memory.

- The day starts as a **blank doc**. Nothing is assigned.
- You declare what today is about (freeform text, headings), then **pull in**
  the tasks that belong to it, create new ones inline, and write notes around
  them.
- Embedded tasks are **live references** (by task id), not copies. Task-level
  actions (complete, reschedule, edit) write through to the vault. Block-level
  actions (remove from doc, reorder) are doc-local — deleting a block never
  deletes the task.
- **No rollover.** Unfinished pulls just stay in the vault, neutral. A fresh
  doc each day is the anti-guilt mechanism.
- **Due-today tray**: the one bit of push worth keeping. A quiet collapsed
  strip showing genuinely-due items so real deadlines can't silently vanish.
  Discipline: due dates mean real deadlines, not priority signals.

## v1 scope (building now)

- New route (`/day`) alongside the existing Today page — old view untouched,
  this is a test.
- Tiptap editor; doc JSON stored in the existing `documents.blocks` column
  (day-note row per date; old view keeps using `content` HTML).
- Live task blocks (node views): check off, due date, open full edit modal,
  remove from doc.
- `/add` → picker modal: search across title + description + tag names,
  filter by tag/destination, multi-select insert.
- `/task` → create a real vault task inline, embedded as a block.
- Due-today tray at the top.

## Later / bigger ideas (not v1)

### Rethink the vault sections (Linear-style custom views)
The vault currently hard-codes sections dictated by destination/due date.
Idea: user-defined grouping — "group by due date / category / size /
consequence", saved views, maybe just one flat list with filters when no
grouping applied. The app shouldn't decide priority; it should let you slice.
Open question: what does the default no-filter view look like?

### Auto-triage is the nagging engine
`lib/triage.ts` moves anything due today into on_deck automatically — an agent
pushing tasks at you. In the doc-first model, "due today" is a *fact you query*
(the tray), not a *location tasks get moved into*. Eventually `on_deck` as a
destination may not survive; the doc itself becomes the record of "what I chose
today". Not touched in v1.

### MCP as the doc's remote control
The end state: the MCP doesn't just read/write tasks, it **drives the Today
doc**. From the phone, by voice, via Claude:

- "I want to tackle migraine stuff — what tasks do I have?" → search, dedupe,
  pull blocks into today's doc.
- "Add a note under that task" → dictation *into the document*, organized.
- Gather notes/context around a theme across days, take actions, propose
  cleanups (duplicates, stale tasks).

Current MCP gripes: too limited, and takes useless initiative (drafts emails
nobody asked for). Fix direction: give it doc read/write tools + tighter tool
descriptions, so intelligence = operating on *your* stated intent for the day,
not inventing work.

### Context intelligence in the doc
- Highlight freeform text near a task block → "add to task description"
  (EditorContextMenu already has a similar flow to docs).
- The doc knows which notes sit under which task — structure the MCP can use.

### Search intelligence
v1 search is substring across title/description/tags. Shipped next: a hidden
`keywords text[]` column on tasks (migration `20260801000000_add_task_keywords.sql`)
searched by the picker, the slash menu, and MCP `search_tasks`. An agent fills
keywords via MCP `update_task` — e.g. "get Tylenol" keyworded {migraine, health} —
so search finds tasks by meaning without embeddings. The enrichment routine
itself runs as a scheduled Claude session against the MCP (not in-app; the app
has no Anthropic API key). True semantic search stays a later option.
