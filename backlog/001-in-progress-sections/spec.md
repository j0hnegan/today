# In Progress as a section — vault + today

## What
Bring "In Progress" task handling into the vault (My Tasks) as its own section, and
convert the Today panel's In Progress *tab* into a *section* so both screens use the
same sectioned layout. Right now In Progress only exists on the Today panel, behind a
tab, and none of it carries over to the vault.

## Detail

Two parts. Reuse existing patterns — don't build parallel ones.

**Part A — Vault: add an "In Progress" section.**
- `destination: in_progress` already exists in the model; the Today panel's
  `LongPressCheck` (750ms hold) already moves tasks there. The vault just doesn't
  surface it.
- In `VaultView.tsx`, `grouped` currently lumps `in_progress` into Someday via the
  catch-all `else` (line ~230). Fix that: add an `inProgress` group
  (`destination === "in_progress"`, not done) so those tasks stop landing in Someday.
- Add an `In Progress` entry to `VAULT_SECTIONS` (place it right after Today / before
  Upcoming). Wire it everywhere the other sections are wired: `filteredGrouped`,
  `taskSectionMap`, `sortKeys` default, the `getBody` drag-target map
  (`{ destination: "in_progress", status: "active" }`), the same-section reorder key
  map, `reorderSectionByIndex`, and the move toast names.
- Carry over the **hold-to-set-in-progress** interaction the user wants: the vault
  row's check circle should support the same long-press → In Progress gesture the
  Today panel has (and from the In Progress section, hold → back to Today/on_deck).
  Reuse the `LongPressCheck` approach from `TaskListPanel.tsx` rather than rewriting
  it — extract/share it if that's the clean move.

**Part B — Today panel: tab → section.**
- Replace the `activeTab` ("today" | "in_progress") tabs in `TaskListPanel.tsx` with
  two stacked sections using the same section header/collapse pattern as the vault
  (`VaultSection`), so the two screens feel consistent.
- Preserve everything that works today: long-press Today row → In Progress;
  long-press In Progress row → back to Today; mark done; the "Add task" input under
  the Today section; size filter + sort; the count badges.

## Definition of done
- Vault shows In Progress as its own section; you can drag a task into it AND
  hold-to-set-in-progress; `in_progress` tasks no longer appear under Someday.
- Today panel shows Today and In Progress as sections (no tab toggle), with all
  current interactions intact.
- Looks right in light and dark, uses existing design tokens, no regressions to
  drag/drop or reorder on either screen. CI green (`tsc --noEmit`, lint, build).

## Notes
- No DB / schema migration — `in_progress` destination already exists.
