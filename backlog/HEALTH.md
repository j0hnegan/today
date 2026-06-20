# Health — steward snapshot

_Last run: 2026-06-20 (steward). Overwritten each run; latest state only._

## Status counts (19 features)
- ✅ **shipped:** 16 — 001–010, 012–017 (all merged, #16–#29)
- 🤔 **proposed (your go/no-go):** 1 — 011 (search, scope is the open question)
- 📥 **ready (builder's queue):** 1 — 018 (Finance tab, gated behind 019 by design)
- 🚫 **blocked (needs you):** 1 — 019 (Plaid→Chase sync; 4-table migration + Plaid account/env vars)
- 🏗 building / 💬 discussing / 👀 preview / 🔁 iterating: 0

**Waiting on you:** 2 (011 proposal + 019 unblock). **In flight:** 0. **Queued for builder:** 1.

## Fixed this run
- Nothing mechanical to fix. Dashboard "Last run" line updated only.

## Needs John

### Standing (no change from prior runs)

- **[Draft PR #13](https://github.com/j0hnegan/today/pull/13) "Native iOS app shell (Capacitor) [WIP]"**
  (`feat/ios-capacitor`) — now **20 days** open (since 2026-05-31), no backlog folder. Your options:
  1. **Track it** — create `020-ios-app-shell/` seeded from the PR description.
  2. **Park it** — minimal folder, `status: blocked` (needs Xcode/signing).
  3. **Close it** — close the PR if this is on indefinite hold.

- **019 Plaid→Chase sync stays blocked** — needs the 4-table migration + Plaid account + env vars. 018 Finance tab queued right behind it.

- **011 search** — `proposed`, awaiting your one-tap go/no-go.

## Healthy
- All 19 folders have `spec.md` + `log.md`. All `Status:`/`Class:` values valid.
- Every `Status:` agrees with GitHub: #16–#29 merged → shipped; 011/018/019 have no branch/PR → consistent with proposed/ready/blocked.
- Dashboard ↔ folders are 1:1 (001–019). No orphans except the manual iOS PR above.
- LEARNINGS.md clean — no contradictions, no dupes, all cited paths verified. Unchanged.
- Nothing `building`/`discussing` → no builder race.
- No features untouched >30 days (oldest log activity 2026-06-07, item 011 — 13 days ago).

## Cleanup candidates (not the steward's to delete)
- Remote branch `claude/task-duplication-bug-Mrona` — bug fix commit from 2026-06-01, no PR filed, 19 days old. The fix (task duplication in optimistic cache) looks useful; consider opening a PR or cherry-picking to main.
- Local branches `claude/wonderful-einstein`, `claude/wonderful-goodall`, `ios-app` — zero commits ahead of main, safe to delete.
- Stale `origin/auto/005-step2b-code`, `origin/auto/014-carryover-empty-guard` — PRs merged, harmless leftovers.
