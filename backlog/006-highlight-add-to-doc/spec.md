# Highlight a selection → add it to a document

## What
In a note/doc, let me highlight a section, right-click (or use the quick-action menu),
and "Add to document…" — which copies that selected content into another document I
pick (e.g. a master "Moving" doc). Example: I'm jotting moving ideas in today's note,
highlight them, and send them to my "Moving" doc.

## Detail
- Build on the existing highlight / slash quick-actions in the editor
  (`components/focus/EditorContextMenu.tsx` and related).
- On a text selection, offer "Add to document" → pick a target document → append the
  selected content to that document. Primarily a highlight/right-click action (less so
  slash).
- Original note is left unchanged (copy, not move) unless specified.

## Definition of done
Select text in a note, choose "Add to document," pick a target, and the content is
appended to that doc; the source note is unchanged. Light + dark, existing menu styling.

## Notes
- Related to 005 (docs/notes unification) — cleaner once those are one type, but can be
  built against the current model too.
- No schema migration expected (appending content to an existing doc).
- Class: review.
