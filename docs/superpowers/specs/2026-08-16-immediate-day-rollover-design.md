# Immediate Day Rollover Design

## Goal

Show the new-day carry-over prompt as soon as the Today page becomes interactive, without weakening the existing cross-device write safety.

## Architecture

Add a shared server fetcher that loads the requested day and the preceding day in one `documents` query. It returns the requested day's full note shape plus an optional rollover candidate containing only the preceding date and normalized blocks. The candidate exists only when the requested day is empty, has no rollover decision, and the preceding day has meaningful content.

The Today Server Component calls this fetcher during its existing parallel page load, hydrates the requested note into SWR, and passes the candidate directly to `DayDocPanel`. This lets a fresh sign-in open the prompt on the first client effect without making a second browser request.

When an already-open tab crosses midnight, the panel requests the same day-context shape from a thin API route. That single response updates the SWR note cache, advances the selected date, and opens the returned candidate. Focus and visibility events remain the triggers because browsers throttle background tabs.

The existing `POST /api/notes/rollover` RPC remains the only way to carry or dismiss. It continues to make the final decision atomically, so a stale prompt cannot overwrite work or reverse a decision made on another device.

## Components

- `lib/server-fetchers.ts`: define the day-context return type and the shared two-date fetcher.
- `app/api/notes/context/route.ts`: authenticate, validate the requested date, call the shared fetcher, and return its result.
- `app/(main)/day/page.tsx`: prefetch day context and tasks in parallel, hydrate today's note, and pass the initial candidate into the client panel.
- `components/day/DayDocPanel.tsx`: consume the initial candidate immediately and replace the current sequential rollover checks with the single context request for midnight/refocus.

## Data Flow

### Fresh page load

1. The server computes the local calendar date.
2. One database query retrieves today and yesterday.
3. The server derives an optional candidate and renders the page with it.
4. `DayDocPanel` opens the prompt immediately after hydration when a candidate exists.

### Open tab crossing midnight

1. Focus, visibility, or the existing interval detects the date change.
2. The panel fetches `/api/notes/context?date=YYYY-MM-DD` once.
3. The response updates today's note cache and supplies the optional candidate.
4. The panel advances to today and opens the prompt when eligible.

## Error Handling and Races

- If the context request fails, keep the user on the newly selected day and do not show a stale prompt. A later focus/visibility event may retry.
- Ignore a response if the user navigated away from the target day before it completed.
- The rollover RPC remains authoritative if another device changes today's note or records a decision after context was fetched.
- Do not fetch or include yesterday's attachments; they are irrelevant to eligibility and carrying blocks.

## Testing

- Unit-test candidate derivation for an empty day, an already-started day, a decided day, and an empty previous day.
- Verify the shared fetcher requests both dates in one documents query.
- Test that the panel can display a server-provided candidate without waiting for a client fetch.
- Run the focused tests, lint, and the production build.

## Non-Goals

- Changing carry-over copy or modal styling.
- Changing the rollover database function or write semantics.
- Refactoring unrelated note, task, or attachment fetching.
