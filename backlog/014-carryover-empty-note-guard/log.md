Status: ready
Class: auto
Branch: —
PR: —

## Done
<checklist the builder ticks off>

## Open
- Gate the carry-over modal on real text content (strip HTML/entities), not
  raw-HTML `.trim()`.

## Decisions / feedback log
- [2026-06-07 john] Intake via /backlog. Modal shows even when previous note is
  empty because placeholder HTML (`<p></p>`/`<br>`/`&nbsp;`) survives `.trim()`.
