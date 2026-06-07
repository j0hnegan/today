---
name: backlog
description: Add an item to the build backlog. Talk through a feature or bug, and this creates the feature folder with a spec the builder loop can act on. Triggers on "/backlog" or when the user wants to capture something to build later.
---

# /backlog — intake

Turn an idea (a feature, a bug, or a loose description) into a backlog feature
folder that the builder loop can pick up. Your job is to translate what the user
says — even a vague ramble — into a clean spec, **filtered through the accumulated
vibe in `backlog/LEARNINGS.md`** so even a one-liner produces something that feels
like Hush.

## Where to write — always `main`, never switch this session's branch

Backlog files live on `main`. The user may be mid-edit on a feature branch, so do
**not** run `git checkout main` in their working directory — it can fail or clobber
their work, and creating the folder on a feature branch is exactly the bug this avoids.

- If `git branch --show-current` is already `main`: work in place, then commit + push.
- Otherwise, do every backlog write through a throwaway worktree:
  ```
  git worktree add /tmp/hush-backlog main
  # create/edit files under /tmp/hush-backlog/backlog/, then:
  git -C /tmp/hush-backlog add backlog/
  git -C /tmp/hush-backlog commit -m "backlog: add NNN-<slug>"
  git -C /tmp/hush-backlog push origin main
  git worktree remove /tmp/hush-backlog
  ```
  Read existing folders for numbering from the worktree too. This makes `/backlog`
  land correctly no matter which branch the session is on.

## Steps

1. **Read `backlog/LEARNINGS.md` first.** It's the lens for everything below.

2. **Understand the item.** If the user gave a one-liner and said "just go," don't
   interrogate — write the spec and move on. If it's fuzzy, ask only what you
   genuinely can't infer. Keep it light; this is intake, not a planning meeting.

3. **Infer the review class** (the user can override):
   - `auto` — bug, copy change, obvious small feature. Merges on sight.
   - `review` — a real feature, will be glanced at and probably accepted.
   - `discuss` — fuzzy / "know it when I see it" / multiple rounds expected.
   Default conservative items toward `review`, not `discuss` — the builder will
   pre-digest borderline `discuss` items into a proposal anyway. Over-tagging
   `discuss` is the thing we're trying to avoid (see LEARNINGS process notes).

4. **Write the spec through the learnings.** Copy `backlog/_template/spec.md`. Fill
   it in. Bake relevant learnings directly into the Detail section so the builder
   doesn't have to re-derive them. Spec length = autonomy throttle: write only as
   much as the user actually cares to pin down.

5. **Create the folder.** Next zero-padded number after the highest existing
   `NNN-*` folder (ignore `_template`). Slugify the title:
   `backlog/<NNN>-<slug>/spec.md` and `log.md` (from `_template/log.md`). Set
   `Status: ready` and `Class:` to the inferred class.

6. **Add it to the dashboard** in `backlog/README.md` (the table between the
   DASHBOARD markers).

7. **Confirm** to the user: number, title, class, one-line summary, and that the
   builder will pick it up on its next run (or offer to kick a run now).

## Notes

- If the item clearly needs a DB/schema migration, say so and note it in the
  spec — the builder will stop and flag rather than touch the DB.
- If it depends on another item, add `blocked by: NNN` to the spec Notes.
- Don't open a branch or write code here. Intake only.
