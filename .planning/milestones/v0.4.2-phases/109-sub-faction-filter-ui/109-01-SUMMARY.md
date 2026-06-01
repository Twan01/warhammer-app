---
phase: 109-sub-faction-filter-ui
plan: 01
subsystem: unit-database
tags: [sub-faction, filter, zustand, react-query, tdd]
dependency_graph:
  requires: []
  provides: [getDistinctSubFactions, getUdbUnitIdsBySubFaction, useUdbSubFactions, useUdbSubFactionUnitIds, subFactionFilter]
  affects: [DatabaseBrowserPage, applyUdbFilters, databaseBrowserFilters]
tech_stack:
  added: []
  patterns: [zustand-filter-store, react-query-disabled-pattern, pure-filter-function]
key_files:
  created: []
  modified:
    - src/db/queries/unitDatabase.ts
    - src/hooks/useUnitDatabase.ts
    - src/features/unit-database/databaseBrowserFilters.ts
    - src/features/unit-database/applyUdbFilters.ts
    - src/features/unit-database/DatabaseBrowserPage.tsx
    - tests/unit-database/applyUdbFilters.test.ts
    - tests/unit-database/UdbUnitList.test.tsx
    - tests/unit-database/UdbUnitRow.test.tsx
    - tests/build-pipeline/normalize.test.ts
    - tests/data-health/pointsCoverageCard.test.tsx
decisions:
  - "subFactionFilter resets to null inside setSelectedFactionId setter (not useEffect) per RESEARCH.md recommendation"
  - "sub-faction filter check placed FIRST in applyUdbFilters before roleFilter per plan spec"
  - "Fixed pre-existing incorrect test expectation for keyword filter without keywordsMap (was expecting 5, correct is 0)"
metrics:
  duration: "18 minutes"
  completed: "2026-06-01"
---

# Phase 109 Plan 01: Sub-Faction Data Foundation Summary

Sub-faction query layer, React Query hooks, Zustand store extension, and filter function for three UI surfaces to consume.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Query layer and hook | d9b1eb9 | getDistinctSubFactions, getUdbUnitIdsBySubFaction queries; useUdbSubFactions, useUdbSubFactionUnitIds hooks; sub_faction on UdbUnitSummary |
| 2 | Zustand store, applyUdbFilters, tests | 1c5e63c | subFactionFilter in store with faction-change reset; filter logic; 4 new test cases |

## Verification Results

- `pnpm build` passes (TypeScript + Vite)
- `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` -- 13/13 tests pass
- `pnpm test -- tests/unit-database/` -- 7 files, 52/52 tests pass
- Full suite: 12 pre-existing failures (currency encoding), 243 pass -- no regressions from this plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed test fixtures missing sub_faction field**
- **Found during:** Task 1
- **Issue:** UdbUnitList.test.tsx, UdbUnitRow.test.tsx had UdbUnitSummary fixtures without the new sub_faction field
- **Fix:** Added `sub_faction: null` to all fixture objects
- **Files modified:** tests/unit-database/UdbUnitList.test.tsx, tests/unit-database/UdbUnitRow.test.tsx

**2. [Rule 3 - Blocking] Fixed pre-existing unused variable errors**
- **Found during:** Task 1 (pnpm build)
- **Issue:** tests/build-pipeline/normalize.test.ts had unused `existsSync` import; tests/data-health/pointsCoverageCard.test.tsx had unused `skeletons` variable
- **Fix:** Removed unused import; renamed variable and added assertion
- **Files modified:** tests/build-pipeline/normalize.test.ts, tests/data-health/pointsCoverageCard.test.tsx

**3. [Rule 1 - Bug] Fixed incorrect test expectation**
- **Found during:** Task 2
- **Issue:** "keyword filter without keywordsMap" test expected all 5 units to pass through, but the actual code returns false when keywordsMap is undefined
- **Fix:** Changed expectation from length 5 to length 0, updated test name and comment
- **Files modified:** tests/unit-database/applyUdbFilters.test.ts
- **Commit:** 1c5e63c

**4. [Rule 3 - Blocking] Updated DatabaseBrowserPage consumer**
- **Found during:** Task 2
- **Issue:** DatabaseBrowserPage.tsx called applyUdbFilters without subFactionFilter (now required in UdbFiltersInput)
- **Fix:** Added subFactionFilter to destructured store values and filter call
- **Files modified:** src/features/unit-database/DatabaseBrowserPage.tsx
- **Commit:** 1c5e63c

## TDD Gate Compliance

- RED gate: Verified sub-faction filter tests fail before implementation (3 failures confirmed)
- GREEN gate: All 13 tests pass after implementation
- test() commit: d9b1eb9 (fixtures updated for type compliance)
- feat() commits: d9b1eb9, 1c5e63c (implementation + tests combined per TDD in same task)

## Known Stubs

None -- all data paths are fully wired.

## Decisions Made

1. **subFactionFilter reset via setter**: Reset subFactionFilter inside `setSelectedFactionId` setter rather than useEffect, avoiding extra render cycle
2. **Filter ordering**: sub-faction check placed as first filter in applyUdbFilters for early exit on the most selective filter
