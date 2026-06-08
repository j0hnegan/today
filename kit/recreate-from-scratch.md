# Recreate prompt — FROM SCRATCH (no access to the source repo)

Paste this whole thing into a Claude Code session in the project where you want the
build-loop. It's self-contained — it describes the system and the files to create. Build
it, then help me wire up the project-specific bits.

---

I want you to set up an **autonomous build-loop** in this repo. It lets me keep a living
backlog; a scheduled agent builds features into draft PRs and pings me; I review/ship
from one chat. Here is the entire system — create it from this description.

## The idea
- A `backlog/` folder is the single source of truth: one folder per feature with a
  `spec.md` (intent) and `log.md` (state). **Docs live on `main`; feature code lives on
  branches.** Any actor (a scheduled run, or me in a live session) can open a feature
  folder and know what to build and where it stands.
- Two scheduled "loops": a **builder** (runs a few times a day) turns backlog items into
  draft PRs and iterates on feedback; a **steward** (daily) keeps the backlog + learnings
  healthy and writes a health report.
- Two skills I invoke: **`/backlog`** (add an item) and **`/standup`** (review what the
  loops did and act — ship/iterate/discuss — without touching GitHub).

## Folder structure to create
```
backlog/
  README.md            # dashboard (auto-maintained) + the conventions below
  LEARNINGS.md         # accumulated project "vibe" — seed it from this repo's CLAUDE.md/README
  _template/
    spec.md            # template: What / Detail / Definition of done / Notes
    log.md             # template: Status, Class, Branch, PR, Done, Open, Decisions log
.claude/skills/backlog/SKILL.md
.claude/skills/standup/SKILL.md
.claude/loops/builder.md
.claude/loops/steward.md
```

## Conventions (put these in backlog/README.md)
- **Status enum** (in each `log.md`): `ready` → `proposed` → `discussing` → `building` →
  `preview` → `iterating` → `blocked` → `shipped`.
- **Review classes** (the throttle — scope by *my review cost*, not build size):
  `auto` (merges on sight), `review` (I'll glance + likely accept), `discuss` (fuzzy /
  multi-round / expensive — capped).
- **WIP rules (pull, not push):** at most **1** `discussing` item at a time; at most ~3 new
  PRs per run; don't start new work if ≥3 features already sit in `preview` waiting on me.
  A `discuss` item is never built cold — the builder writes a "here's what I'd build"
  proposal and sets `proposed`; I reply "go" (→ build) or "let's talk" (→ discussing).
- **Hard rules the loops never break:** never commit to `main`; never merge (I'm the only
  merge gate); a feature can't reach `preview` until the CI gate is green; **never run a
  DB/schema migration** (set `blocked`, ping, stop); `log.md` + recent PR comments
  override `spec.md`; open PRs as **draft**.
- **Dashboard:** a table in README between `<!-- DASHBOARD:START -->` / `END` markers:
  columns # / Feature / Class / Status / Branch-PR, plus an "active discussion" line.

## The `/backlog` skill (intake)
Turns an idea (even a vague ramble) into a feature folder, filtered through `LEARNINGS.md`
so it matches the project's vibe. Steps: read LEARNINGS; understand the item (don't over-
interrogate); infer the review class (default toward `review`, not `discuss`); write the
spec; create `backlog/<NNN>-<slug>/{spec,log}.md` (next zero-padded number); add a
dashboard row; confirm. **Critical rule:** backlog files live on `main`; if the current
branch isn't `main`, do all writes through a throwaway git worktree
(`git worktree add /tmp/kit-main main` → edit → commit → push → remove) — never
`git checkout main` in my working dir.

## The `/standup` skill (command center)
My single window into the loops; I never open GitHub. Steps: sync `main` (via worktree if
not on main); read the dashboard + every `log.md` + `HEALTH.md`; `gh pr list` and
reconcile against the logs (GitHub is authoritative). **Self-heal** mechanical drift on
read (e.g. log says `preview` but the PR merged) and commit the fix. Present a tight
dispatch: shipped / ready-to-preview (with PR links) / proposals needing go-no-go /
active discussion / blocked / steward notes. Then act on my reply: "ship X" → mark ready
+ squash-merge + set shipped; "tweak X: …" → append to the log + set `iterating`; "let's
talk X" → `discussing`; go/no-go on proposals; settle learnings contradictions.

## The builder loop (.claude/loops/builder.md)
Runs on a schedule. Procedure: (0) exit if `backlog/PAUSED` exists; clean `main`. (1)
rebase open `auto/*` branches; reconcile statuses vs `gh`. (2) iterate any feature in
`iterating` / with PR comments newer than the last bot commit. (3) pre-digest `discuss`
items into `proposed` proposals (don't build them). (4) build new `ready` items within
the WIP caps: branch `auto/<NNN>-<slug>`, implement per spec (thin spec → lean on
LEARNINGS), **stop + `blocked` if a DB migration is needed**, run the CI gate, and if
green open a **draft** PR and set `preview`. (5) on merges, append a dated lesson to
LEARNINGS. (6) update the dashboard, append to `backlog/DISPATCHES.md`, and push a
notification only if something needs me.

## The steward loop (.claude/loops/steward.md)
Runs daily, never touches app code. Learnings hygiene (mechanical fixes auto; contra-
dictions → keep newer, mark older superseded, surface for me — never delete history);
backlog audit (orphans, missing files, status vs `gh`); flag items untouched >30 days;
refresh the dashboard; write `backlog/HEALTH.md` (the snapshot `/standup` surfaces).

## Now do this
1. Create all the files above with the behavior described. Write a real CI gate in
   builder.md using THIS stack's actual commands (inspect `package.json`/Makefile/etc.).
2. Seed `backlog/LEARNINGS.md` from this repo's conventions (read CLAUDE.md/README).
3. Tell me which deploy/preview provider this project uses so previews work (if Vercel:
   preview deployments need their own env vars scoped to "Preview", and Supabase-style
   auth needs the preview URL added to the OAuth redirect allowlist). Tell me what I need
   to set.
4. Offer to create the two scheduled routines (builder a few times/day, steward daily),
   pointing each at its playbook — after I confirm.
5. Commit the scaffold to `main` and summarize what's set up + what's left to me.
