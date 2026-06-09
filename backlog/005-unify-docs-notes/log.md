Status: shipped
Class: review
Branch: —
PR: —

## Done

## Open
- Architectural + likely a migration. Builder should pre-digest into a proposal and
  flag the migration; don't build cold.

## Decisions / feedback log
- [2026-06-07 intake] Created via /backlog. Merge documents + day-notes into one
  unified "note" type with consistent presentation; day-notes titled by date. Likely
  needs a migration. Class: discuss.

## Decisions / feedback log
- [2026-06-07 builder] Pre-digested into a proposal (Step 1 presentation-only, no migration). Awaiting John go/no-go.

- [2026-06-07 John] Approved **Step 1** (presentation unify, no migration). Build it. Step 2 (the documents+notes table merge / migration) deferred — unpack later.

Branch: auto/005-unify-docs-notes-presentation
PR: #21 (draft, Step 1) — https://github.com/j0hnegan/today/pull/21

- [2026-06-07 builder] Built Step 1: one shared DocRow unifies docs + day-note presentation. No migration. Step 2 (table merge) still deferred. CI green. PR #21.

- [2026-06-07 John→builder] Preview feedback applied: "Last updated" label, removed row icons, removed task rail from Docs page, added All/Date docs/Subject docs filter.

- [2026-06-09 builder] Step 2 staged: migration SQL written (step2-migration.sql) + code-phase plan in spec. BLOCKED on John applying the SQL (loop never runs DDL; needs Supabase SQL editor). Step 1 remains live. Say "migration applied" to trigger 2b.

- [2026-06-09 John] Applied step2-migration.sql in Supabase.
- [2026-06-09 builder] Step 2b shipped as hotfix (#28): all note paths repointed at documents; reads + upsert verified against the live migrated DB. notes_legacy retained as rollback — drop it in a few weeks.
