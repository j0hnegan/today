# Portable build-loop kit — recreate this system in other projects

## What
Produce a reusable artifact that recreates *this whole flow* — the `/backlog` and
`/standup` skills, the builder + steward loop playbooks, the `backlog/` structure
(dashboard, LEARNINGS, templates, DISPATCHES/HEALTH), the scheduled routines, and all
the conventions — so it can be stood up in a different project with minimal effort.
Part of this may mean lifting it **out of Hush entirely** into its own home.

## Detail
The form is open — that's the main thing to decide. Candidate shapes:
- **A single setup prompt** John can paste into a fresh project's Claude session that
  scaffolds everything (skills, playbooks, folder, dashboard) and wires the routines.
- **A Claude Code plugin / skills bundle** (`.claude/skills` + `.claude/loops` +
  templates) that installs into any repo — the most reusable, least copy-paste.
- **A standalone template repo / tool** living outside Hush that new projects clone or
  reference.

Whatever the shape, it must **parameterize the project-specific bits** that are
hard-coded today: repo/owner (`j0hnegan/today`), the CI gate commands
(`tsc/lint/build` — varies per stack), deploy/preview provider (Vercel + the env-scope
gotcha), any MCP/integrations, and the notification channel. The Hush-specific
LEARNINGS should *not* travel — only the system + a blank learnings seed.

Also capture the **hard-won operational lessons** so a new setup doesn't re-learn them:
worktree-based skills (operate on main from any branch), the WIP/pull model, the
review-class throttle, "log is truth," migration-stop, preview env-var scoping, etc.

## Definition of done
TBD after the builder proposes a shape. Minimally: a documented, parameterized way to
recreate backlog + standup + builder + steward in a new project, with the Hush-specific
content stripped out.

## Notes
- No app code / no DB migration — this is meta/tooling about the loop system itself.
- Likely the cleanest home is a Claude Code plugin or a template repo *outside* this
  project; the builder should weigh that in its proposal.
- Class: discuss (the shape is the open question).
