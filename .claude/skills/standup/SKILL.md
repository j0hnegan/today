---
name: standup
description: Your build-loop command center. Catch up on what the loops did — what shipped, what's ready to preview, what needs your go/no-go, the steward's health report — and act on it (ship, iterate, discuss) without touching GitHub. Triggers on "/standup".
---

# /standup — dispatches from the field

This is John's single window into the autonomous build loop. He never opens GitHub;
he runs `/standup`, gets caught up, and acts from here. Your job: gather the true
current state, present it as a tight dispatch, then do what he says.

## 1. Sync & gather

- `git -C` the repo: `git checkout main && git pull --ff-only` (read-only on the loops).
- Read `backlog/README.md` (the dashboard) and every `backlog/NNN-*/log.md`.
- Read `backlog/HEALTH.md` if present — the steward's latest daily report.
- `gh pr list --state open` and, for each `auto/*` PR, note draft/ready state and
  whether there are comments/reviews newer than the last bot commit. GitHub is
  authoritative for live PR state — reconcile against the logs.
- **Self-heal mechanical drift as you read.** If a log/dashboard entry disagrees with
  GitHub (e.g. status `preview` but the PR is merged, or a branch/PR that no longer
  exists), fix it now and commit to `main` — don't wait for the steward. This makes
  every `/standup` current regardless of when the steward last ran. Leave judgment
  calls (contradictory learnings, stale-item triage) to the steward's report.

## 2. Present the dispatch

One scannable block, only what's actionable. Suggested shape:

```
📡 Dispatch — <date>

✅ Shipped since last time: <merged features>
👀 Ready to preview (N): <feature> → <PR/preview link>   (one line each)
🤔 Needs your go/no-go (N): <proposed feature> — <one-line pitch>
🗣  Active discussion: <feature or "none">   (cap 1)
⛔ Blocked: <feature> — <why (e.g. needs migration)>
🩺 Steward: <key lines from HEALTH.md — contradictions to settle, stale items>
```

Skip empty sections. If nothing needs him, say so plainly — don't pad.

## 3. Act on his reply

Translate his natural-language response into actions. He should never have to touch git/GitHub.

- **"ship X" / "approve X"** → `gh pr ready` then `gh pr merge --squash` the feature's
  PR; set the log + dashboard to `shipped`. Confirm it's deploying.
- **"tweak X: <note>"** → append the note to that feature's `log.md` decisions log and
  set status `iterating`; the builder picks it up next run (or offer to do it now).
- **"let's talk about X"** → set X to `discussing` (only if the discuss slot is free)
  and start the conversation right here.
- **go/no-go on a `proposed` item** → "go": set it `ready`, reclass to `review`/`auto`;
  "let's talk": set `discussing`.
- **settle a steward contradiction** → apply his call to `LEARNINGS.md` (supersede,
  don't delete) per the steward's proposal.

Commit any doc/state changes to `main` (docs only — never app code on main). Keep
the loop's source of truth honest.
