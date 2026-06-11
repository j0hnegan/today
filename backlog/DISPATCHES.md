# Dispatches

Append-only run log. `/standup` reads the latest entries.

---

## 2026-06-11 — builder run (cron, #2, quiet)
- 😴 **Quiet run — board unchanged since the last one.** Clean main, no open builder
  PRs to rebase (only #13 iOS is open — your WIP), nothing `iterating`/`preview`, no
  new feedback, no merges since #29.
- 🚧 **019 (Plaid → Chase sync) still blocked** — unchanged. Needs the 4-table
  migration + Plaid account + env vars before I can build/verify anything; already
  pinged you last run, so no new push this time. **018 stays gated** behind it.
- ⏳ **No new builds**: 018 is `ready` but gated on 019; no other `ready` auto/review
  items; no `discuss` item sits in `ready` to pre-digest.
- 🤔 **Still your call**: **011 search** remains `proposed`.

## 2026-06-11 — builder run (cron)
- 🚧 **Blocked 019 (Plaid → Chase sync) — needs you.** It's first in the queue, but
  the spec requires a net-new 4-table DB migration (`plaid_items`, `bank_accounts`,
  `bank_transactions`, `recurring_streams`) plus a Plaid account + env vars. Every
  route in the feature reads/writes those tables, so there's no slice I can build and
  verify without them — and the loop never writes or runs migrations. Parked at
  `blocked`, no branch opened. **To unblock:** (1) create a Plaid account + grab
  client_id/sandbox secret, (2) add `PLAID_CLIENT_ID`/`PLAID_SECRET`/`PLAID_ENV` to
  `.env.local` + Vercel, (3) author + run the migration (or green-light a live session
  to do the schema work), then flip 019 back to `ready` and I'll wire up the routes.
- ⛓️ **018 (Finance tab) stays gated** behind 019 — it consumes 019's balance +
  recurring-stream reads, so it can't start until 019 lands.
- 😴 **Nothing else to do**: clean main, no open builder PRs (only #13 iOS — your WIP),
  nothing `iterating`/`preview`, no new feedback, no merges since #29.
- 🤔 **Still your call**: **011 search** remains `proposed`.

## 2026-06-10 — builder run (cron, quiet)
- ✅ **Nothing needed me, nothing broke.** Clean main, no open builder PRs to rebase
  (only #13 iOS Capacitor is open — your WIP, not loop work), nothing `iterating`, no
  new feedback on any `preview` feature, no new merges since #29.
- ⏳ **No new builds**: backlog has no `ready` auto/review items. The only two open
  items are both `proposed` and need your verdict before they're buildable.
- 🤔 **Still your call** (unchanged from last run): **011 search** (scope) and **018
  finance tab** (list+select forecasts pitch). Both already pre-digested into proposals —
  one-tap "go" on either flips it to `review` and I build it next run.

## 2026-06-10 — builder run (cron)
- 🤔 **New proposal to rule on**: 018 Finance tab pre-digested into a `proposed` pitch
  (spec → Builder proposal). Picked the fuzzy open question: **(b) list + select forecasts,
  no migration** — aggregating balances across forecasts is mathematically wrong (each has its
  own starting balance/date), and a "primary" flag would need a column. Selected forecast →
  localStorage. Concrete layout (ending-balance + lowest-point summary, SVG balance sparkline,
  upcoming-costs list), read-only v1, all reuse of `lib/cashflow.ts`. **One-tap "go" → I build
  it as `review`.**
- 🧠 **Captured learnings** from the two PRs that merged since last run: 015 (#26) → restored
  layout must be applied via a pre-paint inline script writing a CSS var to avoid reload flash;
  017 (#29) → John prefers a compact status dot over inline preview text in dense rows.
- ⏳ **No new builds**: no `ready` auto/review items exist. Both open items (011 search, 018
  finance) are `proposed` and await your call — nothing buildable without your verdict.
- 🧹 **Nothing to rebase/iterate**: no open builder PRs, no `iterating`/`preview` features, no
  new feedback. 16 features shipped.

## 2026-06-08 — builder run (cron, quiet)
- ✅ **Nothing needed me, nothing broke.** No new feedback on 009 (#22), 012 (#23), or
  013 (#24) since the last builder commit — latest PR comments are my own status notes +
  Vercel. All three still **MERGEABLE/CLEAN**, waiting on you.
- 🧹 **No rebase churn**: the three branches are a few *docs-only* commits behind main
  (steward dashboard/health refreshes), but GitHub confirms clean merges — so I left the
  previews untouched rather than force-push and rebuild them mid-review.
- ⏳ **No new builds**: 3 features in preview (009, 012, 013) = WIP cap hit; 014 stays queued.
- 🤔 **Still your call** (unchanged): 002 personal-task agent (phased — "go on 002" for
  Phase 1), 011 search (scope). Both already pre-digested.

## 2026-06-08 — builder run (cron, later)
- 🧹 **Fixed a merge conflict**: PR #23 (012 panel drag) had gone CONFLICTING — a stray
  steward doc commit on the branch collided with backlog docs on main. Rebased onto main,
  dropped that commit (only app change left is `PagePanel.tsx`), CI green (tsc+lint+build),
  force-pushed. **Mergeable again** — your call to merge or send back.
- ✅ **No new feedback** on 009 (#22) or 013 (#24) since the last builder commit — both still
  clean/mergeable, waiting on you. Left their previews untouched (no needless rebuild).
- ⏳ **No new builds**: 3 features in preview (009, 012, 013) = WIP cap hit; 014 stays queued.
- 🤔 **Still your call**: 002 personal-task agent (phased proposal — "go on 002" for Phase 1),
  011 search (scope). Both already pre-digested — nothing new to triage.

## 2026-06-08 — builder run (cron)
- 👀 **Ready to preview**: 012 Today panel drag → PR #23, **reworked** per your rejection.
  Removed the grip handle; now edge-grab (cursor → grab near a panel's border, the whole
  panel drags) with a real drag image + drop-target ring. ⇄ toggle stays as fallback. CI green.
- ↪️ Deferred 012's date-header-stays-put refinement until 009 (#22) lands — 009 rewrites the
  Today task panel wholesale, so doing it now would be built twice.
- 🧹 Rebased open branches on main: 012, 009 (#22), 013 (#24) — all clean, previews refreshed.
- ⏳ **No new builds**: 3 features already await you in preview (009, 012, 013) — WIP cap hit.
- 🤔 **Still waiting on your call**: 002 personal-task agent (phased proposal — reply "go on 002"
  for Phase 1), 011 search (scope: whole-app vs docs-only).
- 📋 Queued: 014 carry-over empty-note guard (auto) — builds next run once preview queue clears.

## 2026-06-07 — builder run (manual)
- 🤔 **Proposed** (need John's go/no-go): 002 agentic research (read-only email slice
  first), 005 unify docs+notes (Step 1 presentation-only, no migration).
- 👀 **Ready to preview**: 003 Today task-list lag → PR #17 (server-rendered the rail).
- 📋 **Still queued**: 004 new-day carry-over, 006 highlight→doc, 007 date-clear sync
  (next run; WIP cap of 3 new builds/run reached).
- ✅ Earlier: 001 In Progress sections shipped (PR #16, merged).

## 2026-06-07 — builder run #2 (manual, on John's calls)
- ✅ **Shipped**: 003 task-list lag (PR #17, merged).
- ✅ **007 resolved by 003** — no separate code needed; the shared `/api/tasks` cache
  key from #17 removes the date-clear desync mechanism.
- 👀 **Ready to preview**: 004 new-day note carry-over → PR #18 (rollover trigger best
  confirmed in real use).
- ✅ **005 approved** for Step 1 (presentation unify, no migration) — queued; Step 2
  (the table merge / migration) deferred.
- ⏸ **002 parked** — John will unpack the agentic-research scope later.
- 🆕 **008 filed** (Today screen: swappable panels + drag parity + fix row X) — queued,
  relocated to main after it was created on a feature branch by mistake.
- 📋 **Queued**: 005 (Step 1), 006 highlight→doc, 008.

## 2026-06-07 — builder run #3 (manual)
- 🔧 Hardened /backlog + /standup to operate on main via worktree (any branch).
- 👀 Ready to preview: 006 highlight→add-to-document → PR #19.
- 📋 Queued: 005 Step 1 (presentation unify), 008 (held until 004 merges — shares files with it).

## 2026-06-07 — builder run #4 (manual)
- ✅ Shipped: 006 (#19, merged), 004 earlier (#18).
- 👀 Ready to preview: 008 parts 1+3 (swap panels + Not Today/Trash) → PR #20.
- 🆕 Filed 009 — cross-section drag parity (008 part 2), deferred to its own PR.
- 📋 Queued: 005 Step 1 (presentation unify), 009.

## 2026-06-07 — builder run #5 (manual)
- ✅ Shipped: 008 parts 1+3 (#20, merged).
- 👀 Ready to preview: 005 Step 1 (docs/notes presentation unify) → PR #21.
- 🤔 Proposed: 010 portable build-loop kit (Claude Code plugin + setup prompt).
- ⏳ 009 (cross-section drag) left queued — genuinely needs interactive drag-testing; not safe to build fully blind.

## 2026-06-07 — builder run #6 (manual)
- 👀 Ready to preview: 009 task drag (Today↔In Progress) → PR #22; 012 panel drag-to-swap → PR #23. Both interactive — drag-test on preview.
- 🤔 Awaiting go: 010 (kit-only), 002 (personal-task loop, phased), 011 (search, phased).

## 2026-06-09 — builder run (cron)
- 🟢 Quiet run — nothing needed building or fixing.
- ✅ Verified all 3 preview PRs are CLEAN/MERGEABLE on GitHub: #22 (009 task drag), #23 (012 panel drag), #24 (013 Notes-load perf). No rebase needed; no new John feedback newer than each branch's last commit.
- ⛔ Preview cap hit (≥3 features awaiting your review) → built nothing new. 014 (carry-over empty-note guard, auto) stays queued.
- 🤔 Still awaiting your go/no-go: 002 (personal-task agent loop, phased), 011 (search, scope). No `discuss` items sit in `ready`, so nothing to pre-digest.
- No merges since last run; LEARNINGS unchanged.

## 2026-06-09 — builder run (cron, #2)
- 🟢 Quiet run — nothing needed building or fixing.
- ✅ Re-verified the 3 preview PRs CLEAN/MERGEABLE: #22 (009 task drag), #23 (012 panel drag), #24 (013 Notes-load perf). All ahead of main only by their own app commits; behind only by backlog doc commits (no file overlap) → no rebase needed.
- 🔎 PR comments on #22/#23/#24 are all the builder's own update posts, not new John feedback; no change-requesting reviews → nothing to iterate.
- ⛔ Preview cap hit (≥3 awaiting your review) → built nothing new. 014 (carry-over empty-note guard, auto) stays queued.
- 🤔 Still awaiting your go/no-go: 002 (personal-task agent loop, phased), 011 (search, scope). No `discuss` items sit in `ready`, so nothing to pre-digest.
- No merges since last run; LEARNINGS unchanged. No push sent (nothing newly needs you).

## 2026-06-09 — mega-run (manual, John's batch)
- ✅ Shipped: 012 (#23 panel drag + 60% rule), 014 (#25 carry-over guard, auto-merged).
- 👀 Preview: 015 (#26 equal/resizable panels), 016 (#27 middleware auth cache — eyeball the security note).
- 🤖 002 LIVE: personal-agent playbook + daily routine (8:45am). Needs one manual "Run now" to pre-approve tools.
- 🚫 005 Step 2 staged: migration SQL + plan ready; blocked on John pasting SQL in Supabase, then builder does the code phase.
- 🤔 Still open: 011 search (go/no-go).

## 2026-06-09 (late) — John merged everything
- ✅ Shipped: 015 (#26 equal/resizable panels + pre-paint split), 016 (#27 middleware auth cache), 017 (#29 description dot), 005 Step 2 complete (#28), 014 (#25), 012 (#23).
- 🤖 Personal agent: hourly (8:41a–9:41p) with quick-exit precheck; first run done inline (11 tasks annotated, 2 drafts staged).
- Open: 011 (search) go/no-go — the only item left on the board.
