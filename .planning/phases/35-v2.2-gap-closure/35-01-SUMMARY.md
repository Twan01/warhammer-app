---
phase: 35-v2.2-gap-closure
plan: 01
subsystem: ui, hooks
tags: [react-query, cache-invalidation, zod, timezone, react-hook-form]

# Dependency graph
requires:
  - phase: 17-enrichment
    provides: todayISO() in @/lib/dates for timezone-safe date formatting
  - phase: 21-hobby-goals
    provides: goal-progress query key used for cache invalidation
provides:
  - BattleLogSheet uses timezone-safe todayISO from shared dates utility
  - useDeletePaintingSession invalidates goal-progress cache on delete
  - useUpdateUnit invalidates army-lists cache on update
  - PaintSheet purchase_date form field wired through Zod to mutation payload
affects: [dashboard, army-lists, hobby-goals, paint-inventory]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cache invalidation symmetry: create and delete mutations must invalidate the same query keys"

key-files:
  created: []
  modified:
    - src/features/battle-log/BattleLogSheet.tsx
    - src/hooks/useJournalSessions.ts
    - src/hooks/useUnits.ts
    - src/features/paints/paintSchema.ts
    - src/features/paints/PaintSheet.tsx

key-decisions:
  - "No new patterns introduced - all fixes follow existing codebase conventions"

patterns-established:
  - "Cache invalidation symmetry: if useCreate invalidates a key, useDelete must too"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-05-05
---

# Phase 35 Plan 01: v2.2 Gap Closure Summary

**4 surgical tech debt fixes: timezone-safe date import, two missing cache invalidations, and purchase_date form field wiring**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-05T19:25:46Z
- **Completed:** 2026-05-05T19:29:46Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- BattleLogSheet now uses todayISO() from @/lib/dates (local timezone) instead of a local UTC-based helper that could produce off-by-one dates
- useDeletePaintingSession now invalidates goal-progress cache, matching the pattern already established in useCreatePaintingSession
- useUpdateUnit now invalidates army-lists cache so the COALESCE chain in army list points calculation picks up tier confirm writes
- PaintSheet has a visible purchase_date date input field wired through Zod schema validation to the mutation payload

## Task Commits

Each task was committed atomically:

1. **Task 1: BattleLogSheet timezone fix + cache invalidation patches** - `24bf73f` (fix)
2. **Task 2: Wire PaintSheet purchase_date form field to mutation** - `d1c2550` (feat)

## Files Created/Modified
- `src/features/battle-log/BattleLogSheet.tsx` - Replaced local todayIso() with imported todayISO() from @/lib/dates
- `src/hooks/useJournalSessions.ts` - Added goal-progress cache invalidation in useDeletePaintingSession onSettled
- `src/hooks/useUnits.ts` - Added army-lists cache invalidation in useUpdateUnit onSuccess
- `src/features/paints/paintSchema.ts` - Added purchase_date field with YYYY-MM-DD regex validation
- `src/features/paints/PaintSheet.tsx` - Added purchase_date to DEFAULT_VALUES, buildDefaultValues, payload, and JSX form field

## Decisions Made
None - followed plan as specified. All 4 fixes were surgical edits matching existing codebase patterns.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All v2.2 tech debt items are closed
- Codebase is clean for v2.4 Premium Dashboard UX work (Phase 30+)
- 644 tests pass, 0 failures

## Self-Check: PASSED

All 5 modified files verified present. Both task commits (24bf73f, d1c2550) confirmed in git log.

---
*Phase: 35-v2.2-gap-closure*
*Completed: 2026-05-05*
