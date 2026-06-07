# Carry over notes when a new day starts

## What
If a Today tab is left open and the day rolls over, the view switches to the new
(empty) day and yesterday's notes aren't visible — I have to click back to find them.
When a new day starts in an open tab, prompt me (a quick modal) to carry over the
previous day's notes.

## Detail
- Detect date rollover in an open Today view: the displayed date no longer matches the
  actual current date (e.g. on tab focus / at midnight).
- Show a small modal: "New day — carry over yesterday's notes?" with carry-over /
  dismiss.
- Carry-over copies the previous day's note content into today's note. If today is
  empty, copy it in; if today already has content, append under a divider (decide the
  cleaner behavior).

## Definition of done
Leaving the tab open across midnight (or focusing it on a new day) prompts once;
carry-over brings yesterday's content into today; dismiss leaves today untouched.
Works in light + dark, uses existing modal/design tokens.

## Notes
- Notes are one row per date (`date` UNIQUE). No schema migration.
