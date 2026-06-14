---
name: today
description: Your life-task command center. See what's going on with your real tasks in Hush — what the personal agent researched, which drafts are staged, what's waiting on your decision, what's due — and act on it. The life-task mirror of /standup (which is for the dev build loop). Triggers on "/today".
---

# /today — your life, caught up

`/standup` reports on the *build loop* (what got built in the Hush app). `/today`
reports on the *content* of Hush — John's actual tasks — and on what the
**personal-task agent** (`.claude/loops/personal-agent.md`) has been doing to them.
He runs `/today`, sees where everything stands, and acts: open a staged draft, send
one (with his explicit say-so), split a project, mark things done.

This is read-first. The agent never sends or completes anything; neither does this
skill unless John explicitly tells you to for that specific item.

## 1. Gather

Pull current state via the **Hush MCP** (the `…__list_today` / `…__list_tasks` /
`…__search_tasks` / `…__get_note` tools):

- `list_today` — the on-deck (Today) tasks.
- `list_tasks` with destination `upcoming` and `in_progress` — what's queued and active.
- For each task, read the **description** and parse the agent's annotation block(s):

  ```
  — 🤖 agent (YYYY-MM-DD) —
  Status: …
  Next: …
  Prepared: …
  ```

  The newest dated block is current. `Prepared:` is the signal that something is
  **staged and waiting** (a Gmail draft, a phone number, a plan). `Prepared: nothing
  needed` is not.

Don't fabricate. If a task has no agent block, it just hasn't been touched yet — say
that, don't invent a status.

## 2. Present the digest

One scannable block. Lead with what John's 30 seconds unlocks most. Suggested shape:

```
📋 Your tasks — <date>

🔴 Needs you (N): <task> — <the decision / the staged action>   (one line each)
💡 Researched: <task> — <what the agent found / next step>
⏳ In progress / waiting: <task> — <what it's waiting on>
📅 Due soon: <task> (due M/D)
🆕 Not yet touched: <task>   (agent hasn't run on these)
```

Skip empty sections. "Needs you" = tasks with a staged draft to send, a decision the
agent surfaced, or a project waiting for a "split it." Keep each line to the essential
fact + the one action. If nothing needs him, say so — don't pad.

## 3. Act on his reply

Translate natural language into actions. Honor the agent's hard rules — they bind this
skill too:

- **NEVER send an email/message, submit a form, make a purchase, or act outward**
  except when John explicitly approves *that specific action, this time*. "Send the
  Hathon reply" is such an approval; then open the staged Gmail draft, show him the
  exact recipient + subject + body, and send only after he confirms that content.
- **"show me the <X> draft"** → open the staged draft (Gmail `list_drafts`/`get_thread`)
  and show it. Read-only; no send.
- **"mark <X> done"** → `complete_task`. (Only on his explicit instruction — the agent
  never completes tasks; you do it because he asked.)
- **"split <X>"** → if the agent proposed an ordered plan in the annotation, create the
  sub-tasks via `create_task`, tagged so they're clearly the breakdown of X.
- **"snooze/reschedule <X> to <date>"** → `update_task` the due date / destination.
- **"what did the agent find on <X>?"** → surface that task's full annotation verbatim.

For anything in the Prohibited / Explicit-permission categories (sending, purchasing,
form submission, deleting), state what you're about to do and get his confirmation
first. When in doubt, stage and ask — same as the agent.

## Notes
- This reads John's real tasks and email. Pull out only what a task needs; never copy
  credentials or financial numbers into chat or task text.
- The amber/blue dots on task rows (017) encode the same thing visually: amber = an
  agent update you haven't opened. `/today` is the "read them all at once" view.
- Want it more often? The `hush-personal-agent` routine runs this same research on a
  schedule and posts its own standup; `/today` is the on-demand pull.
