---
phase: 23-display-features
plan: "01"
subsystem: ui
tags: [zustand, filter, react, collection, tdd]

# Dependency graph
requires: []
provides:
  - battleReady boolean toggle in CollectionFiltersState Zustand store
  - applyUnitFilters condition for status_assembly=1 AND status_painting=Completed
  - Battle Ready toggle button in UnitFilters filter bar
  - battleReady wired into CollectionPage hasActiveFilters + filteredUnits
affects: [collection, filters, unit-table, unit-gallery]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD RED-GREEN for filter extension, activeOnly toggle button pattern reused for battleReady]

key-files:
  created: []
  modified:
    - src/features/units/collectionFilters.ts
    - src/features/units/applyUnitFilters.ts
    - src/features/units/UnitFilters.tsx
    - src/features/units/CollectionPage.tsx
    - tests/collection/collectionFilters.test.ts
    - tests/collection/unitFilters.test.ts

key-decisions:
  - "battleReady filter condition placed BEFORE activeOnly in applyUnitFilters to short-circuit cheaper check first"
  - "clearAll resets battleReady: false alongside all other filter fields — consistent with activeOnly pattern"

patterns-established:
  - "Quick-filter toggle buttons follow activeOnly pattern: variant default/outline + aria-pressed"
  - "All filter fields included in both hasAny (UnitFilters) and hasActiveFilters (CollectionPage) for Clear button visibility"

requirements-completed: [DISP-01]

# Metrics
duration: 6min
completed: 2026-05-05
---

# Phase 23 Plan 01: Battle Ready Quick-Filter Summary

**Zustand battleReady toggle + applyUnitFilters condition that keeps only status_assembly=1 AND status_painting=Completed units, wired into filter bar and CollectionPage with full TDD coverage**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-05T17:57:51Z
- **Completed:** 2026-05-05T18:03:16Z
- **Tasks:** 2 (Task 1 TDD, Task 2 UI wiring)
- **Files modified:** 6

## Accomplishments
- Added `battleReady: boolean` + `toggleBattleReady` to CollectionFiltersState with proper clearAll reset
- Extended `UnitFiltersInput` with `battleReady` and added filter condition checking both assembly AND painting completion
- Added Battle Ready toggle button in UnitFilters bar immediately after Active only, using identical variant/aria-pressed pattern
- Wired battleReady into CollectionPage's `hasActiveFilters` check and `applyUnitFilters` call with correct useMemo dependency
- 8 new tests added (3 store, 5 filter logic); full suite 618/618 passing, build clean

## Task Commits

Each task was committed atomically:

1. **Test RED: add failing tests for battleReady filter** - `e28453c` (test)
2. **Feat GREEN: implement battleReady in store + applyUnitFilters** - `7c131ea` (feat)
3. **Feat: wire Battle Ready toggle into UnitFilters UI + CollectionPage** - `69f4598` (feat)

_Note: TDD task has RED commit then GREEN commit; REFACTOR phase not needed (code was clean)_

## Files Created/Modified
- `src/features/units/collectionFilters.ts` - Added battleReady field, toggleBattleReady action, clearAll reset
- `src/features/units/applyUnitFilters.ts` - Added battleReady to UnitFiltersInput, filter condition before activeOnly
- `src/features/units/UnitFilters.tsx` - Added battleReady/toggleBattleReady selectors, hasAny guard, Battle Ready button JSX
- `src/features/units/CollectionPage.tsx` - Added battleReady selector, included in hasActiveFilters and applyUnitFilters call + useMemo deps
- `tests/collection/collectionFilters.test.ts` - Added battleReady to initial object; 3 new tests (starts false, toggles, clearAll)
- `tests/collection/unitFilters.test.ts` - Added battleReady to empty object; 5-test describe block covering all filter behaviors

## Decisions Made
- Placed battleReady filter condition before activeOnly in applyUnitFilters for logical ordering (most restrictive quick-filter first)
- clearAll includes `battleReady: false` alongside all existing resets — maintains parity with activeOnly pattern
- Fixed test assertion in RED phase: read store state via `getState()` after toggle rather than referencing stale snapshot

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale Zustand state reference in test**
- **Found during:** Task 1 GREEN phase verification
- **Issue:** Test asserted `s.battleReady` (stale snapshot from initial `getState()` call) instead of reading live store state after `toggleBattleReady()` mutated it
- **Fix:** Changed test to call `useCollectionFilters.getState().battleReady` after each toggle
- **Files modified:** tests/collection/collectionFilters.test.ts
- **Verification:** All 618 tests pass
- **Committed in:** 7c131ea (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in test assertion)
**Impact on plan:** Minor test fix. No scope creep. All plan artifacts delivered exactly as specified.

## Issues Encountered
None beyond the stale state reference in the test (auto-fixed above).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Battle Ready filter is fully operational; composing additively with all existing filters
- UnitFiltersInput interface now requires battleReady — any future callers must pass the field (breaking in TypeScript)
- Ready for 23-02 (next display feature plan if any) or Phase 30

---
*Phase: 23-display-features*
*Completed: 2026-05-05*
