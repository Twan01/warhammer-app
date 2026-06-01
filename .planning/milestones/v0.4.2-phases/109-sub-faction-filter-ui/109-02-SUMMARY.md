---
phase: 109-sub-faction-filter-ui
plan: 02
subsystem: unit-database
tags: [sub-faction, filter, select-dropdown, conditional-ui]
dependency_graph:
  requires: [getDistinctSubFactions, getUdbUnitIdsBySubFaction, useUdbSubFactions, useUdbSubFactionUnitIds, subFactionFilter]
  provides: [sub-faction-dropdown-db-browser, sub-faction-dropdown-unit-picker, sub-faction-dropdown-collection]
  affects: [UdbFilterBar, DatabaseBrowserPage, UnitPickerDialog, CollectionPage, UnitFilters, collectionFilters]
tech_stack:
  added: []
  patterns: [conditional-select-rendering, set-membership-filtering, faction-id-resolution]
key_files:
  created: []
  modified:
    - src/features/unit-database/UdbFilterBar.tsx
    - src/features/unit-database/DatabaseBrowserPage.tsx
    - src/features/army-lists/UnitPickerDialog.tsx
    - src/features/units/collectionFilters.ts
    - src/features/units/UnitFilters.tsx
    - src/features/units/CollectionPage.tsx
decisions:
  - "Sub-faction dropdown positioned as first filter in DB browser (before Role), consistent with Plan 01 filter ordering"
  - "Unit picker uses full-width sub-faction dropdown between description and budget section"
  - "Collection browser shows sub-faction only when exactly 1 faction selected, uses two-step filtering (preFilteredUnits then filteredUnits)"
metrics:
  duration: "13 minutes"
  completed: "2026-06-01"
---

# Phase 109 Plan 02: Sub-Faction Filter UI Dropdowns Summary

Sub-faction Select dropdowns wired into database browser, army list unit picker, and collection browser with conditional rendering based on data availability.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Database browser sub-faction dropdown | 724579c | subFactions prop on DatabaseBrowserFilters; conditional Select before Role; useUdbSubFactions in page |
| 2 | Army list unit picker sub-faction filter | 9f956b2 | Numeric-to-UDB faction ID resolution; sub-faction Select in dialog; Set-based udb_unit_id filtering; reset on open/faction change |
| 3 | Collection browser sub-faction filter | b244749 | subFactionFilter in collectionFilters store; conditional Select in UnitFilters; two-step filtering in CollectionPage; only when 1 faction selected |

## Verification Results

- `npx tsc --noEmit` -- zero errors in src/ (pre-existing test-only errors in tests/)
- `npx vite build` -- passes successfully
- `pnpm test` -- 2358 pass, 19 pre-existing failures (currency encoding), no regressions from this plan

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all data paths are fully wired. Sub-faction dropdowns render from live hook data and filter real unit lists.

## Decisions Made

1. **DB browser dropdown position**: First filter before Role, matching Plan 01's filter ordering in applyUdbFilters
2. **Unit picker dropdown width**: Full-width (w-full) for consistency within the narrow dialog
3. **Collection two-step filtering**: preFilteredUnits (existing filters) then filteredUnits (sub-faction Set) to avoid coupling sub-faction logic into applyUnitFilters

## Self-Check: PASSED

- [x] 724579c exists in git log
- [x] 9f956b2 exists in git log
- [x] b244749 exists in git log
- [x] All 6 modified files exist on disk
- [x] No unexpected file deletions
