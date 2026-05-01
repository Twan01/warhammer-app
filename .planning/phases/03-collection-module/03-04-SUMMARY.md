---
phase: 03-collection-module
plan: 04
subsystem: ui
tags: [react, tanstack-query, zustand, tanstack-table, radix-ui, tailwind]

# Dependency graph
requires:
  - phase: 03-collection-module
    provides: UnitTable, UnitFilters, UnitDetailSheet, applyUnitFilters, collectionFilters, StatusPopover (plans 03-01..03)
  - phase: 02-data-layer-entity-crud
    provides: UnitSheet, UnitDeleteDialog, useUnits, useFactions hooks
provides:
  - CollectionPage container wiring all five Phase 3 sub-components end-to-end
  - /collection route (src/app/collection/page.tsx) replaced from placeholder to real page
  - Complete Phase 3 collection module assembled and build-verified
affects: [04-army-lists, 05-dashboard, any future feature using collection state]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - selectedUnitId pattern (store ID, derive unit via useMemo) for post-refetch freshness (Pitfall 6)
    - sibling Sheet/Dialog portal pattern — avoid nested Radix portals (Pitfall 4)
    - key prop on Sheet/Dialog for fresh mount when switching entities (POLISH-04)

key-files:
  created:
    - src/features/units/CollectionPage.tsx
  modified:
    - src/app/collection/page.tsx

key-decisions:
  - "CollectionPage owns all state (selectedUnitId, editingUnit, deletingUnit) while sub-components remain purely presentational"
  - "selectedUnitId pattern preferred over selectedUnit to avoid stale data after optimistic cache updates (Pitfall 6 from RESEARCH.md)"
  - "UnitDetailSheet, UnitSheet, UnitDeleteDialog mounted as siblings at page level — avoids nested Radix Portal z-index/stacking issues (Pitfall 4)"

patterns-established:
  - "Page container pattern: fetch data -> read Zustand filters -> derive filteredUnits via useMemo -> pass to table"
  - "Error boundary pattern: unitsError renders inline error text; loading/empty handled inside UnitTable"

requirements-completed: [COLL-01, COLL-08, COLL-09, COLL-12, COLL-13, POLISH-01, POLISH-03, POLISH-04]

# Metrics
duration: 12min
completed: 2026-05-01
---

# Phase 3 Plan 04: Collection Page Assembly Summary

**CollectionPage container wired with Zustand filter pipeline, selectedUnitId state model, and all five Phase 3 sub-components mounted as siblings — production build green, 28 tests passing**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-01T09:30:00Z
- **Completed:** 2026-05-01T10:00:00Z
- **Tasks:** 3 of 3 complete (Task 3 human-verify checkpoint approved by user)
- **Files modified:** 2

## Accomplishments

- Created CollectionPage.tsx: state owner for selectedUnitId/editingUnit/deletingUnit, reads Zustand filter store, runs applyUnitFilters pipeline, renders all 5 sub-components as siblings
- Replaced src/app/collection/page.tsx placeholder with real CollectionPage (mirrors factions/page.tsx pattern)
- All 28 Phase 3 unit tests pass; pnpm build produces dist/index.html bundle with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Build CollectionPage container** - `a3f8ea4` (feat)
2. **Task 2: Replace placeholder route with CollectionPage** - `a56de63` (feat)
3. **Task 3: Human-verify all 6 Phase 3 success criteria** - APPROVED (all 25 checks passed)

**Plan metadata:** `a31ff66` (docs: complete CollectionPage assembly plan checkpoint)

## Files Created/Modified

- `src/features/units/CollectionPage.tsx` - Page container: fetches units + factions, owns all UI state, applies filters, renders UnitFilters + UnitTable + UnitDetailSheet + UnitSheet + UnitDeleteDialog as siblings
- `src/app/collection/page.tsx` - Route entry: replaces PlaceholderPage with CollectionPage (pattern mirrors factions/page.tsx)

## CollectionPage State Model

```
selectedUnitId: number | null   -- store ID only, derive unit via useMemo (Pitfall 6)
selectedUnit: Unit | null       -- derived: units.find(u => u.id === selectedUnitId)

editSheetOpen: boolean          -- UnitSheet open flag
editingUnit: Unit | null        -- null = create mode, Unit = edit mode

deleteDialogOpen: boolean       -- UnitDeleteDialog open flag
deletingUnit: Unit | null       -- which unit is being deleted
```

All three Sheet/Dialog components receive `key` props to force fresh mount when switching entities (POLISH-04).
All three are rendered as top-level siblings in the JSX return — not nested inside SheetContent (Pitfall 4).

## Decisions Made

- selectedUnitId pattern (not selectedUnit) ensures detail Sheet always shows post-refetch data when StatusPopover updates cache (Pitfall 6 from RESEARCH.md)
- Error message copy: "Failed to load your collection. Try refreshing the app." (from UI-SPEC Copywriting Contract)
- handleCloseDelete also closes detail Sheet if the deleted unit was the currently-selected one — prevents stale "open but gone" state

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. TypeScript passed first try, all 28 tests green, build succeeded without additional fixes.

## Human-Verify Results

**Task 3 human-verify APPROVED by user on 2026-05-01.**

All 25 verification checks passed covering:
- COLL-01 through COLL-13: All collection requirements confirmed in running app
- POLISH-01 through POLISH-05: All cross-cutting polish requirements confirmed
- All 6 Phase 3 ROADMAP success criteria observed end-to-end

## Build Verification

- `pnpm tsc --noEmit`: 0 errors
- `pnpm vitest run`: 28 tests passing (4 suites: collectionFilters:7, unitFilters:13, UnitTable:4, StatusPopover:4)
- `pnpm build`: Vite production bundle compiled successfully — dist/index.html + assets/index-*.js (735kB) + assets/index-*.css (67kB)

## Next Phase Readiness

- /collection route fully functional and production-build verified
- Phase 3 (Collection Module) complete — all 5 plans (03-00 through 03-04) executed and human-verified
- All COLL-* and POLISH-* requirements confirmed observable in the running app
- Phase 4 (Kanban Board / army lists) can begin; consumes units + factions data layer already in place

## Self-Check: PASSED

- `src/features/units/CollectionPage.tsx`: FOUND
- `src/app/collection/page.tsx`: FOUND (modified)
- Commit `a3f8ea4`: FOUND (Task 1)
- Commit `a56de63`: FOUND (Task 2)
- Commit `a31ff66`: FOUND (plan docs)

---
*Phase: 03-collection-module*
*Completed: 2026-05-01*
