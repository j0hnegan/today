# Search

## What
Add search. Open question (the reason this is `discuss`): **whole-app** search vs.
**docs/notes-only** search.

## Detail
Two candidate scopes:
- **Docs/notes search** — a search box on the Docs page that filters the list by title
  + content. Small, and slots right next to the All / Date docs / Subject docs filter we
  just shipped (005). Likely the cheapest first slice.
- **Global omnisearch** — a ⌘K-style palette across tasks, notes, docs (and maybe
  goals), jumping you to the result. Bigger; a real feature.

Builder should propose the scope (probably: ship docs/notes search first, then expand to
global) rather than build cold.

## Definition of done
TBD after scope decision. Minimally: you can search docs/notes by title + content and
filter the list.

## Notes
- No schema migration — search is over existing data (client-side filter for the docs
  list; a search endpoint if/when it goes global).
- Builds on 005 (unified Docs list + filter toggle).
- Class: discuss (scope is the open question).
