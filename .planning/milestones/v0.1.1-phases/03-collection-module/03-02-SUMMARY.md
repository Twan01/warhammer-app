---
phase: 03-collection-module
plan: "02"
subsystem: ui
tags: [zustand, vitest, tdd, react, tanstack-query, radix-ui, lucide-react]

# Dependency graph
requires:
  - phase: 03-01
    provides: collectionFilters.ts Zustand store (useCollectionFilters, CollectionFiltersState shape)
  - phase: 03-00
    provides: unitFilters.test.ts stub with vitest globals configuration
provides:
  - applyUnitFilters(units, filters): pure filter function covering COLL-02..06 verified by 13 automated tests
  - UnitFilters component: filter bar with search + 3 multi-select popovers + active toggle + clear button
  - UnitFiltersInput type: typed filter shape decoupled from Zustand store
affects:
  - 03-04 (page assembly — imports UnitFilters and applyUnitFilters to wire into collection page)
  - 03-03 (kanban view — can reuse applyUnitFilters for pre-filtering before column grouping)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-filter pattern: applyUnitFilters(units, filterState) called on page before passing to table/view"
    - "TDD red-green: test import fails first (RED), then implementation added (GREEN), 13/13 pass"
    - "Zustand selector-per-value pattern: each filter value accessed via individual selector to minimise re-renders"
    - "categoryOptions derived from units prop via useMemo to avoid extra fetch; page owns data fetching"
    - "MultiSelectPopover: reusable internal component for Faction/Status/Category with Command+Popover"

key-files:
  created:
    - src/features/units/applyUnitFilters.ts
    - src/features/units/UnitFilters.tsx
  modified:
    - tests/collection/unitFilters.test.ts

key-decisions:
  - "applyUnitFilters accepts UnitFiltersInput (not the full CollectionFiltersState) so it stays decoupled from Zustand"
  - "null category is always excluded when categories filter is non-empty (explicit COLL-05 behavior contract)"
  - "categoryOptions derived from units prop on UnitFilters component — page owns the data fetch (cleaner separation)"
  - "MultiSelectPopover is a file-private component (not exported) — no accidental re-use concerns"

patterns-established:
  - "Pattern: pre-filter before table — page calls applyUnitFilters(units, filterState) then passes result to UnitTable"
  - "Pattern: UnitFiltersInput decouples pure logic from store shape — enables testing without mocking Zustand"

requirements-completed: [COLL-02, COLL-03, COLL-04, COLL-05, COLL-06]

# Metrics
duration: 3min
completed: 2026-05-01
---

# Phase 03 Plan 02: Filter Bar and Pure Filter Function Summary

**applyUnitFilters pure function (13 TDD tests) + UnitFilters component wiring COLL-02..06 via Zustand + Radix Popovers**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-01T07:28:12Z
- **Completed:** 2026-05-01T07:31:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Implemented `applyUnitFilters` pure function with AND-composition of 5 filter predicates, fully tested in isolation from UI
- 13 vitest tests across 6 describe groups (search, faction, status, category, active, composition) — all green
- Built `UnitFilters` component with search Input, 3 multi-select Popovers (Faction/Status/Category), active-only Button, and Clear filters ghost button
- All UI-SPEC copywriting honored verbatim; all Zustand store actions wired correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Build pure applyUnitFilters function with TDD** - `0fdcf11` (feat + test)
2. **Task 2: Build UnitFilters component** - `2334d20` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/features/units/applyUnitFilters.ts` — Pure filter function exporting `applyUnitFilters` and `UnitFiltersInput` type
- `src/features/units/UnitFilters.tsx` — Filter bar component: search + Faction/Status/Category multi-selects + active toggle + clear button
- `tests/collection/unitFilters.test.ts` — 13 tests across 6 describe groups; replaces Wave 0 it.skip stubs

## Decisions Made

- `applyUnitFilters` accepts `UnitFiltersInput` (not `CollectionFiltersState`) to stay decoupled from Zustand — enables pure unit testing without store mocking
- Null category is explicitly excluded when categories filter is non-empty (COLL-05 contract), not treated as a wildcard match
- `categoryOptions` derived from `units` prop via `useMemo` — page owns the data fetch, component stays stateless for data
- `MultiSelectPopover` is file-private (not exported) — reusable within the file, no unintended coupling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Open Items for Plan 03-04 (Page Assembly)

Plan 03-04 (collection page assembly) should:

1. Import both exports: `import { UnitFilters } from "@/features/units/UnitFilters"` and `import { applyUnitFilters } from "@/features/units/applyUnitFilters"`
2. Get raw units from `useUnits()` query
3. Get filter state snapshot: `const filterState = useCollectionFilters()` (full store object matches `UnitFiltersInput` shape)
4. Derive filtered data: `const filteredUnits = useMemo(() => applyUnitFilters(units ?? [], filterState), [units, filterState])`
5. Render `<UnitFilters units={units ?? []} />` above the table
6. Pass `filteredUnits` as `data` prop to `<UnitTable data={filteredUnits} />`

## Next Phase Readiness

- COLL-02..06 filter requirements fully backed by passing automated tests on the pure function
- UnitFilters component ready for integration into the collection page (03-04)
- applyUnitFilters can be reused in 03-03 (Kanban view) before column grouping

---
*Phase: 03-collection-module*
*Completed: 2026-05-01*
