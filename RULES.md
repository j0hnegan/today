# Focus — Task Selection & Organization Rules

## Vault Columns

| Column | Condition |
|--------|-----------|
| **On Deck** | `destination = "on_deck"` AND `status = "active"` |
| **Someday** | `destination = "someday"` AND `status = "active"` |
| **Done** | `status = "done"` (any destination) |

Within each column, tasks are sorted by `updated_at DESC` (most recently edited first).

---

## Focus View — Which Task Gets Shown

The Focus view picks **one task** from On Deck based on your energy level. Only considers tasks that are `active` and **not snoozed**.

### Low Energy
1. Hard consequence + due within **1 day** — pick the top one
2. Otherwise: **rest** ("Nothing critical today.")

### Medium Energy
First asks: "How much time do you have?" (via slider)
- **1-15 min:** Only xs-sized tasks
- **15-30 min:** xs + small tasks
- **30-60 min:** xs + small + medium tasks
- **60+ min:** Any task

Then:
1. Hard consequence + due within **5 days** — pick the top one (overrides time filter)
2. Filter by time available, pick top task by priority
3. If time filter yields nothing, fall back to **any available task**, sorted by priority

### High Energy
First asks: "How much time do you have?" (via buttons)
- **1-15 min:** Only xs-sized tasks
- **15-30 min:** xs + small tasks
- **30-60 min:** xs + small + medium tasks
- **60+ min:** Any task

Then picks the top task by priority from the filtered set.

### Priority Sort Order (within each tier)
1. **Consequence** — hard consequence first
2. **Due date** — earliest due date first (no due date = last)
3. **Size** — xs < small < medium < large

---

## Snooze

| Reason | Duration |
|--------|----------|
| Out of energy | +1 day (9am) |
| Waiting on something | +3 days (9am) |
| Deadline moved | +7 days (9am) |
| Don't want to | +1 day (9am) |

Snoozed tasks are invisible to Focus view until the snooze expires.

---

## Automation (runs hourly)

### 1. Escalate Urgent Tasks
- **Finds:** On Deck tasks with NO consequence that have a due date within 2 days
- **Action:** Sets consequence to `hard`
- **Effect:** Makes them visible at low/medium energy

### 2. Move Stale Tasks to Someday
- **Finds:** On Deck tasks with NO due date that haven't been updated in 14+ days
- **Action:** Moves them to Someday
- **Effect:** Clears mental clutter from On Deck

### 3. Expire Snoozes
- **Finds:** Any task where snooze time has passed
- **Action:** Clears snooze, task becomes selectable again

---

## Weekly Nudge

- Shows on the configured day (default: Sunday)
- Message: "Weekly check-in: anything in Someday become real?"
- Dismissible per session

---

## Task Properties

| Field | Values | Default |
|-------|--------|---------|
| destination | `on_deck`, `someday` | `someday` |
| consequence | `none`, `soft`, `hard` | `none` |
| size | `xs`, `small`, `medium`, `large` | `small` |
| status | `active`, `done` | `active` |
| due_date | date or null | null |

Note: `soft` and `hard` consequences are treated identically in selection logic (both count as "has consequences").
