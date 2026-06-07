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

## Definition of done
TBD after discussion. Standalone docs and day-notes are one unified type, look
identical, and live in one list/editor.

## Notes
- **Almost certainly needs a DB migration** to merge documents + notes — the builder
  will stop and flag `blocked: needs migration` rather than touch the schema. Expect to
  do the migration manually.
- 006 (highlight → add to document) gets cleaner once this lands.
- Class: discuss (architectural).
