Status: shipped
Class: discuss
Branch: —
PR: —

## Done

## Open
- Open question is the *shape* (setup prompt vs Claude Code plugin vs standalone
  template repo). Builder should pre-digest into a proposal, not build cold.

## Decisions / feedback log
- [2026-06-07 intake] Created via /backlog. Make the backlog+standup+builder+steward
  system portable/reusable across projects — possibly extracted out of Hush entirely.
  Parameterize the project-specific bits; strip Hush LEARNINGS. Class: discuss.

- [2026-06-07 builder] Pre-digested into a proposal: a Claude Code plugin (its own repo, outside Hush) + a thin setup prompt. Awaiting John go/no-go.

- [2026-06-08 builder] Shipped: kit/ with two recreation prompts (local file-grab + self-contained from-scratch) + README. Docs/tooling, no app code → committed to main directly.
