# Carry-over modal — only show when the previous day actually has notes

## What
The new-day "Carry over your notes?" modal (feature 004, in
`components/focus/PagePanel.tsx`) should only appear when the previous day has
real note content. If yesterday's note is empty, don't show the modal at all.

## Detail
- The trigger is in `checkRollover()` (`PagePanel.tsx`, ~line 80-90):
  ```
  const prevContent = noteRef.current?.content ?? "";
  if (prevContent.trim()) setCarryover({ fromDate: prevToday, content: prevContent });
  ```
- The bug: `content` is **HTML**, so an "empty" note still carries placeholder
  markup (`<p></p>`, `<br>`, `&nbsp;`, whitespace-only paragraphs). `"<p></p>".trim()`
  is truthy, so the modal fires even when there's nothing to carry over.
- Fix: gate on actual **text** content, not raw HTML. Strip tags + entities and
  check the result is non-empty before setting `carryover` — e.g. a tiny local
  helper that removes HTML tags, decodes `&nbsp;`, and trims, then checks length.
  No DOM-parsing dependency needed; a small regex strip is fine for this and keeps
  it edge/SSR-safe.
- Apply the same emptiness check to `handleCarryOver`'s merge guard if it helps,
  but the modal-suppression is the actual ask.

## Definition of done
- Rolling into a new day with an empty/whitespace/placeholder-only previous note
  shows **no** carry-over modal.
- A previous note with real text still prompts as before, and "Carry over" still
  merges that content.
- CI gate green.

## Notes
needs migration? No.
