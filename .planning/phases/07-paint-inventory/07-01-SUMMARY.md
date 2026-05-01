---
phase: 07-paint-inventory
plan: 01
subsystem: ui
tags: [zustand, typescript, vitest, paint-inventory, filters]

# Dependency graph
requires:
  - phase: 06-foundation
    provides: PaintWithRecipeCount type, Paint interface with 0|1 SQLite boolean fields

provides:
  - usePaintInventoryFilters Zustand store (brands/types/colorFamilies/runningLow/wishlist)
  - applyPaintFilters pure helper function with AND-combined filter semantics
  - PaintFilters interface

affects:
  - 07-02 (PaintsPage will import usePaintInventoryFilters and applyPaintFilters)
  - 07-03 (filter UI components will bind to usePaintInventoryFilters store)
  - 07-04 (PaintsPage wires store + filter helper together)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Idempotent toggle pattern for multi-select arrays (includes-then-filter-or-spread)
    - SQLite 0|1 boolean discipline — all integer comparisons use === 1, never truthy
    - Zustand store structural copy of useCollectionFilters (swap fields, same shape)

key-files:
  created:
    - src/features/paints/paintInventoryFilters.ts
    - src/features/paints/applyPaintFilters.ts
    - tests/paint-inventory/paintInventoryFilters.test.ts
    - tests/paint-inventory/applyPaintFilters.test.ts
  modified: []

key-decisions:
  - "07-01: usePaintInventoryFilters is a direct structural copy of useCollectionFilters — five fields (brands/types/colorFamilies as arrays, runningLow/wishlist as booleans), same idempotent toggle pattern."
  - "07-01: applyPaintFilters uses p.running_low !== 1 and p.wishlist !== 1 guards — never truthy checks — enforcing the codebase SQLite 0|1 integer discipline."
  - "07-01: Pre-existing tsc error in tests/foundation/migration004.test.ts (node:fs / __dirname) is out-of-scope tech debt; confirmed present before this plan's changes."

patterns-established:
  - "Paint filter store pattern: five-field Zustand store, same structural shape as useCollectionFilters"
  - "applyPaintFilters AND-combination: each active filter narrows the set; inactive filters (empty arrays, false) are no-ops"

requirements-completed: [PINV-02, PINV-03, PINV-04]

# Metrics
duration: 7min
completed: 2026-05-01
---

# Phase 7 Plan 01: Paint Inventory Filter State Summary

**Zustand store `usePaintInventoryFilters` and pure helper `applyPaintFilters` with 12 unit tests covering five-field filter state and AND-combined SQLite 0|1 discipline**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-01T21:28:15Z
- **Completed:** 2026-05-01T21:35:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `usePaintInventoryFilters` Zustand store with five filter fields (brands/types/colorFamilies multi-select + runningLow/wishlist booleans) matching the useCollectionFilters structural template exactly
- Created `applyPaintFilters` pure helper that AND-combines all five filter dimensions using explicit `=== 1` SQLite integer checks (never truthy) for running_low and wishlist
- 12 unit tests pass (7 store + 5 filter helper): toggle add/remove, boolean flips, clearAll, no-op pass-through, AND-combination

## Task Commits

Each task was committed atomically:

1. **Task 1: usePaintInventoryFilters Zustand store + 7 tests** - `54d1508` (feat)
2. **Task 2: applyPaintFilters pure helper + 5 tests** - `0f0fd88` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks had RED (failing import) then GREEN (implementation passing) phases._

## Files Created/Modified

- `src/features/paints/paintInventoryFilters.ts` - Zustand store with five filter fields and toggle/clear actions
- `src/features/paints/applyPaintFilters.ts` - Pure filter helper with PaintFilters interface, AND-combines five dimensions
- `tests/paint-inventory/paintInventoryFilters.test.ts` - 7 unit tests: initial state, 3 toggle add/remove, runningLow flip, wishlist flip, clearAll
- `tests/paint-inventory/applyPaintFilters.test.ts` - 5 unit tests: no-filter pass-through, brand filter, runningLow === 1, wishlist === 1, AND-combination

## Decisions Made

- `usePaintInventoryFilters` is a direct structural copy of `useCollectionFilters` — five fields instead of the collection store's five, same idempotent toggle pattern throughout
- `applyPaintFilters` uses `p.running_low !== 1` and `p.wishlist !== 1` guards — never truthy checks — enforcing the codebase SQLite 0|1 integer discipline from PITFALLS.md
- Pre-existing `tsc` error in `tests/foundation/migration004.test.ts` (node:fs / `__dirname` types missing) is out-of-scope tech debt; confirmed present before this plan's changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in `tests/foundation/migration004.test.ts`:
- `Cannot find module 'node:fs'` / `Cannot find name '__dirname'`
- Present before this plan (confirmed via `git stash` verification)
- Out of scope — logged but not fixed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 07-02 can import `usePaintInventoryFilters` from `@/features/paints/paintInventoryFilters`
- Plan 07-04 can import `applyPaintFilters` from `@/features/paints/applyPaintFilters`
- `PaintFilters` interface is exported and ready for use in filter UI components
- All 154 tests green (12 new from this plan)

---
*Phase: 07-paint-inventory*
*Completed: 2026-05-01*
