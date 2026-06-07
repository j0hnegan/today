# Backlog — the autonomous build loop

This folder is the single source of truth for what gets built in Hush and where
each thing stands. Three actors read and write it:

- **`/backlog` skill** (you, interactively) — intake. Turns an idea into a feature folder + spec.
- **builder routine** (cron, every few hours) — builds drafts, iterates on feedback, ships PRs.
- **steward routine** (cron, daily) — keeps learnings + structure healthy; refreshes the dashboard below.

The rule that makes it all work: **docs live here on `main`, code lives on feature
branches.** Anyone — a cron run or you in a live session at 11pm — opens a feature
folder and instantly knows the intent (`spec.md`) and the state (`log.md`). The
folder is the baton; loop and live session pass it back and forth.

---

<!-- DASHBOARD:START — the steward rewrites everything between these markers. Don't hand-edit. -->

## Dashboard

🔴 **Active discussion:** _none_

| # | Feature | Class | Status | Branch / PR |
|---|---------|-------|--------|-------------|
| 001 | In Progress as a section — vault + today | review | ✅ shipped | [PR #16](https://github.com/j0hnegan/today/pull/16) (merged) |
| 002 | Agentic task research loop | discuss | ⏸ parked (unpack later) | — |
| 003 | Today task-list lag + app performance | review | ✅ shipped | [PR #17](https://github.com/j0hnegan/today/pull/17) (merged) |
| 004 | Carry over notes on a new day | review | 👀 preview | [PR #18](https://github.com/j0hnegan/today/pull/18) |
| 005 | Unify Docs + Notes — Step 1 (presentation, no migration) | review | ready | — |
| 006 | Highlight → add selection to a document | review | ready | — |
| 007 | Today ↔ My Tasks date-clear sync bug | review | ✅ shipped | resolved by #17 |
| 008 | Today screen — swappable panels + task-panel parity | review | ready | — |

_Last run: 2026-06-07 (builder run)_

<!-- DASHBOARD:END -->

---

## How it works

### Each feature is a folder

```
backlog/
  001-weekly-review/
    spec.md     # the PRD — intent. Short or detailed; length = how much latitude the agent has.
    log.md      # the state — status, what's done, decisions, feedback. THIS is truth.
```

Folders starting with `_` (like `_template/`) are ignored by both loops.

### Status enum (in `log.md`)

| Status | Meaning | Who acts next |
|--------|---------|---------------|
| `ready` | specced, builder may start | builder |
| `proposed` | a `discuss` item the builder pre-digested into a "here's what I'd build" pitch | **you** (one-tap: "go" → demote to build, or "let's talk") |
| `discussing` | the one active back-and-forth | **you** (cap = 1) |
| `building` | builder has a branch open, draft in progress | builder |
| `preview` | draft pushed, Vercel preview up, waiting on you | **you** (merge, or comment to send back) |
| `iterating` | you left feedback; builder will address it next run | builder |
| `blocked` | needs something the loop won't do alone (see note) | **you** |
| `shipped` | merged, live | — |

### Review classes — the throttle

Build effort is free; **your** review attention is the bottleneck, and it's bimodal.
So we scope by *review cost*, not size. The `/backlog` skill infers the class at intake; you override.

- **`auto`** — bug, copy, obvious small thing. Merges on sight. Flows freely.
- **`review`** — a real feature you'll glance at and probably accept with light notes.
- **`discuss`** — fuzzy, "know it when I see it," expect rounds. Expensive. **Capped.**

### WIP rules (pull, not push)

The loop builds to *your* review capacity, sized to one sitting:

```
discuss in flight (discussing): MAX 1   # one conversation at a time, ever
max new PRs per run:            3
don't start new work if ≥3 features are already in `preview` waiting on you
```

A `discuss` item never grabs the conversation slot cold. The builder first writes a
proposal and sets `proposed`. Most get a 10-second "go" → they reclassify to
`review`/`auto` and flow through the pipeline, **never spending the discussion slot.**
Only what survives triage enters `discussing`.

### Hard rules the loops never break

- Never commit to `main`. Never merge. **You** are the only merge gate.
- A feature can't reach `preview` until the CI gate is green (typecheck + lint + test + build).
- **Never run a DB / schema migration.** If a feature needs one → set `blocked`, ping, stop.
- `log.md` (and PR comments newer than the last bot commit) **override** `spec.md`.
  Recent decisions win; the builder will not "fix" code back toward a stale spec.
- Open PRs as **draft**. Marking ready / merging is your signal.

### Kill switch

Create an empty file `backlog/PAUSED` and the builder exits immediately on its next run.
Delete it to resume.

### Learnings

`LEARNINGS.md` is the flywheel — the accumulated "Hush vibe" that lets specs get
thinner over time. The builder reads it before building and appends to it after a
merge. The steward keeps it from rotting (dedupes, supersedes, flags contradictions).
