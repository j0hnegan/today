# Unify Docs and Notes into one thing

## What
The Docs page currently shows two different kinds of content presented very
differently: standalone **documents** and per-day **notes**. They should be the same
thing — everything is a "note." A note tied to a day just has its title set to the date
(e.g. "Saturday, September 4"); a standalone note has a normal title. Unify both the
data model and the presentation so they look and behave identically.

## Detail
- Today, `Document` and `Note` are separate entities/tables. Merge them conceptually so
  docs and day-notes are one type with a single editor and a single directory/list
  presentation.
- Day-notes derive their title from their date; standalone notes have a user title.
- One consistent rendering everywhere (Docs list, editor, Today).

## Builder proposal (2026-06-07) — for John's go/no-go
The data merge needs a migration (manual gate), so I'd split this to de-risk:
- **Step 1 (no migration):** unify the *presentation* — make the Docs list, the editor,
  and day-notes render identically (shared component + styling), and title day-notes by
  their date. Documents and notes stay as separate tables underneath, but look/behave as
  one. Shippable now, fully reversible.
- **Step 2 (migration, manual):** actually merge `documents` + `notes` into one table.
  I'll write the plan + migration but **stop for you to apply it** — the loop never runs
  schema changes.

Recommend doing **Step 1 first** — you get the unified feel immediately without touching
the database. Reply **"go"** for Step 1, or **"let's talk"** to design the end state.

## Definition of done
Step 1: docs and day-notes look and behave identically (one editor, one list style),
day-notes titled by date. Step 2 (migration) handled separately.

## Notes
- **Almost certainly needs a DB migration** to merge documents + notes — the builder
  will stop and flag `blocked: needs migration` rather than touch the schema. Expect to
  do the migration manually.
- 006 (highlight → add to document) gets cleaner once this lands.
- Class: discuss (architectural).
