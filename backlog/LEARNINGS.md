# Learnings — the Hush vibe

Accumulated preferences so the agent can build "the Hush way" from a thin spec.
Append dated entries. Don't delete a contradicted entry — mark it superseded and
keep it, so we can audit why behavior changed. Recency breaks ties only after a
real contradiction is found.

Format:
```
- [YYYY-MM-DD] <the learning>. (source: PR #N / conversation)
  [superseded YYYY-MM-DD by: <what changed>]   ← only when overturned
```

---

## Design & interaction

- [2026-06-07] Match complexity to a personal app for one user. No enterprise
  patterns, no speculative abstraction, no feature flags or back-compat shims. (source: CLAUDE.md)
- [2026-06-07] Use design tokens for color/spacing/font — never raw values or magic
  numbers. Follow existing Tailwind + Radix + shadcn/ui patterns already in the codebase. (source: CLAUDE.md)
- [2026-06-07] Dark mode is first-class (next-themes). Anything new must look right in both themes. (source: CLAUDE.md)

## Code patterns

- [2026-06-07] Reads go through `lib/server-fetchers.ts` — the single source of
  truth for every read shape. A new read endpoint means editing the fetcher; the
  route and SSR follow. Don't duplicate query shapes. (source: CLAUDE.md)
- [2026-06-07] Validate at boundaries with Zod (`lib/validation/*`); trust internal
  code. API routes run edge except `/api/cron/*` and `/api/mcp/*` (Node). (source: CLAUDE.md)
- [2026-06-07] Proper TypeScript types — no `any` unless truly unavoidable. (source: CLAUDE.md)
- [2026-06-07] Don't add comments that restate code; only comment non-obvious "why". (source: CLAUDE.md)

## Process preferences

- [2026-06-07] Specs should get thinner over time as these learnings cover more of
  the vibe. When John demotes a `proposed` item with "go," that's a signal the agent
  over-tagged it `discuss` — note the pattern so intake stops over-consulting. (source: design conversation)
