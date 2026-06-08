# Recreate prompt — LOCAL (Hush repo available on this machine)

Paste this into a Claude Code session opened in the project you want to add the
build-loop to. It assumes the Hush repo is checked out locally.

---

You are setting up the autonomous build-loop system in THIS project by copying it from
my Hush repo, which is checked out on this machine (find it — likely `/Users/Shared/hush`
or ask me for the path).

Do this:

1. **Locate the source.** Confirm the Hush repo path and that it has `.claude/skills/backlog`,
   `.claude/skills/standup`, `.claude/loops/`, and `backlog/`. If you can't find it, ask me.

2. **Copy the system files** into this project (overwrite nothing without asking):
   - `.claude/skills/backlog/SKILL.md`
   - `.claude/skills/standup/SKILL.md`
   - `.claude/loops/builder.md`
   - `.claude/loops/steward.md`
   - `backlog/README.md` (the dashboard + conventions) — but **reset the dashboard table
     to empty** and update the project name/links.
   - `backlog/_template/spec.md` and `backlog/_template/log.md`
   - **Do NOT copy** `backlog/LEARNINGS.md`, the numbered feature folders, `DISPATCHES.md`,
     or `HEALTH.md` — those are Hush-specific. Instead create a fresh `backlog/LEARNINGS.md`
     with only this project's conventions (read this repo's `CLAUDE.md`/README to seed it).

3. **Parameterize for this project** (don't carry Hush's values):
   - The **CI gate** in `.claude/loops/builder.md` — detect this stack's real commands
     (look at `package.json` scripts / Makefile / etc.) and replace the typecheck/lint/
     build commands accordingly.
   - The **repo/owner** references — update to this repo (`gh repo view`).
   - The **deploy/preview provider** — if this project uses Vercel, note the preview
     env-var gotcha (preview deployments need their own env vars scoped to "Preview", and
     for Supabase-style auth the OAuth redirect allowlist needs the preview wildcard). If
     it's a different provider, adjust how previews are produced.

4. **Confirm the operating rules carried over** (they're in `backlog/README.md`): docs on
   `main` / code on branches; the `/backlog` + `/standup` skills operate on `main` via a
   worktree from any branch; WIP/pull caps; review-class throttle; "log is truth";
   never run DB migrations (flag + stop); CI gate is a wall; open draft PRs only.

5. **Offer to create the two scheduled routines** (builder a few times a day, steward
   daily) the way Hush does — but only after I confirm.

6. **Commit** the scaffold to `main` and tell me what you set up + what I still need to do
   (e.g., add preview env vars, confirm the schedule).
