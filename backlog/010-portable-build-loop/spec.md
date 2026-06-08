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

## Builder proposal (2026-06-07) — for John's go/no-go
Recommended shape: **a Claude Code plugin in its own repo** (outside Hush), with a thin
setup prompt for the parts a plugin can't do.
- **The plugin** ships the reusable system: `/backlog` + `/standup` skills, the builder
  + steward loop playbooks, and `backlog/` templates (README/dashboard, blank LEARNINGS
  seed, spec/log templates, DISPATCHES/HEALTH). Installs into any repo via Claude Code's
  plugin mechanism — no copy-paste.
- **A short setup prompt** (shipped with the plugin) handles the per-project wiring a
  plugin can't infer: detect the stack's CI commands, confirm the deploy/preview
  provider, scaffold `backlog/`, and create the two scheduled routines.
- **Lives outside Hush** as its own repo so every project (not just this one) pulls from
  one source of truth; updates propagate instead of drifting per-copy.
- First slice = extract the current skills/playbooks/templates into the plugin repo,
  parameterized + Hush-LEARNINGS stripped; the setup prompt second.

Reply **"go"** to build it this way, or **"let's talk"** to weigh plugin vs. template-repo
vs. paste-prompt.

## Definition of done
TBD after John picks the shape. Minimally: a documented, parameterized way to recreate
backlog + standup + builder + steward in a new project, Hush-specific content stripped.

## Notes
- No app code / no DB migration — this is meta/tooling about the loop system itself.
- Likely the cleanest home is a Claude Code plugin or a template repo *outside* this
  project; the builder should weigh that in its proposal.
- Class: discuss (the shape is the open question).
