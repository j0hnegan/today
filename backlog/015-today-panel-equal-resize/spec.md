# Today screen — equal-width panels by default, resizable, 460px min each

## What
On the Today screen, make the Notes and Tasks panels **equal width by default**
(currently Tasks `flex-[7]` / Notes `flex-[5]`), and let John drag a divider
between them to resize. Neither panel may go below **460px**.

## Detail
- Layout lives in `components/focus/PagePanel.tsx` (the `md:flex-row` container,
  ~line 295). Today: Tasks `flex-[7]`, Notes `flex-[5]`. Change the default split
  to **50/50**.
- Add a **draggable divider** between the two panels (md+ only) that resizes them.
  Persist the chosen split in `localStorage`, the same way the side-swap is
  persisted (`focus-today-swapped`, ~line 206-213) — use a sibling key e.g.
  `focus-today-split`. No DB, no settings UI.
- **Min width 460px for either panel.** Clamp the drag so neither side shrinks
  below 460px. On viewports too narrow to honor 2×460 + gap at md+, let it degrade
  gracefully (panels shrink toward the min / the existing mobile stack at `<md`
  takes over) — don't force horizontal overflow.
- Implementation: prefer the shadcn **resizable** primitive
  (`react-resizable-panels`) since it matches our shadcn/Radix conventions, handles
  touch + keyboard a11y, and gives clean persistence hooks. A small custom drag
  handle storing a flex-basis in localStorage is acceptable if you'd rather not add
  the dep — your call, but keep it simple (two panels, one handle).
- Must coexist with the existing **side-swap** (`md:flex-row-reverse`,
  shipped in 008): swapping sides should keep each panel's width with it. The
  divider handle, drag affordance, and focus ring must use design tokens and look
  right in light + dark.
- Mobile (`<md`) still stacks vertically — resize is a md+ concern only.

## Definition of done
- Today opens with Notes and Tasks at equal width.
- A divider between them drags to resize; the split persists across reloads.
- Neither panel can be dragged narrower than 460px.
- Side-swap still works and preserves widths; looks right in both themes; mobile
  still stacks. CI gate green.

## Notes
needs migration? No.
relates to 012 (Today panel drag-to-swap, in preview) — both touch the Today
flex container; coordinate so the resize divider and the swap don't fight. Not a
hard block: the swap base (008) is already on main.
