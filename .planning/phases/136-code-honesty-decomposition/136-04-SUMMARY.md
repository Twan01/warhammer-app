---
phase: 136-code-honesty-decomposition
plan: 04
subsystem: hooks
tags: [hon-10, react-query, hook-hygiene, cache-invalidation, tdd]
dependency_graph:
  requires: ["136-01"]
  provides: ["HON-10"]
  affects: ["src/hooks/useEnhancements.ts", "src/hooks/useBsdataFaction.ts", "src/hooks/useArmyListSnapshots.ts", "src/hooks/useRecipes.ts", "src/hooks/useUnits.ts", "src/hooks/useArmyLists.ts"]
tech_stack:
  added: ["src/hooks/useEnhancements.ts", "src/hooks/useBsdataFaction.ts"]
  patterns: ["React Query KEY factory + enabled-guard hook pattern", "BSData staleTime/gcTime Infinity pattern", "prefix invalidation symmetry"]
key_files:
  created:
    - src/hooks/useEnhancements.ts
    - src/hooks/useBsdataFaction.ts
  modified:
    - src/hooks/useArmyListSnapshots.ts
    - src/hooks/useRecipes.ts
    - src/hooks/useUnits.ts
    - src/hooks/useArmyLists.ts
    - src/features/rules-hub/EnhancementsList.tsx
    - src/features/rules-hub/DatasheetPointsTab.tsx
    - src/features/dashboard/DashboardPage.tsx
    - src/features/army-lists/SnapshotCompareDialog.tsx
    - src/features/units/UnitDeleteDialog.tsx
    - tests/army-list/UnitDeleteDialog.test.tsx
    - tests/army-list/armyListHookInvalidations.test.ts
decisions:
  - "D-07: reused existing useRecipe for getRecipeById in DashboardPage (no duplicate hook created)"
  - "D-09: photo cleanup calls (getPhotoFilenamesByUnit/getPhotosByUnit/deleteUnitPhoto) left as direct imperative calls in UnitDeleteDialog.handleConfirm — correct justified exclusion"
  - "getArmyListsByUnitId imported from @/db/queries/armyLists (not units) in useUnits.ts — RESEARCH had wrong source, correct file used"
  - "2 residual useQuery calls in DatasheetPointsTab (usePointTiers + DatasheetDetail) are pre-existing local named helpers, not render-path bypasses; left in place (not in HON-10 bypass list)"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-17"
  tasks_completed: 3
  files_modified: 11
---

# Phase 136 Plan 04: HON-10 Hook-Layer Bypass Routing Summary

HON-10 complete: all 5 genuine render-path query bypasses converted to named React Query hooks with KEY factories, invalidation symmetry closed on unit-army-lists, no hook-in-loop regression, 5 justified exclusions documented.

## What Was Built

**Task 1 — BSData faction hooks + EnhancementsList/DatasheetPointsTab**

Created 2 new hook files:
- `src/hooks/useEnhancements.ts`: `ENHANCEMENTS_BY_FACTION_KEY` + `useEnhancementsByFaction` (staleTime/gcTime Infinity)
- `src/hooks/useBsdataFaction.ts`: `MODEL_COUNTS_KEY`/`LOADOUT_OPTIONS_KEY`/`LEADER_TARGETS_KEY` + 3 hooks (staleTime/gcTime Infinity, enabled on factionId)

Consumer updates:
- `EnhancementsList.tsx`: replaced inline `useQuery` with `useEnhancementsByFaction`; dropped `@tanstack/react-query` import entirely
- `DatasheetPointsTab.tsx`: replaced 3 inline BSData `useQuery` calls with `useModelCountsByFaction`/`useLoadoutOptionsByFaction`/`useLeaderTargetsByFaction`

**Task 2 — useRecipes + useArmyListSnapshots extensions + DashboardPage/SnapshotCompareDialog**

Extended 2 existing hook files:
- `useRecipes.ts`: added `RECIPE_NAMES_BY_UNIT_KEY` + `useRecipeNamesByUnitIds` (enabled on ids.length > 0); invalidation symmetry confirmed (4 recipe mutations already invalidate `["recipes","by-unit"]` prefix)
- `useArmyListSnapshots.ts`: added `SNAPSHOT_DATA_KEY` + `useSnapshotData(id, enabled)`

Consumer updates:
- `DashboardPage.tsx`: `getRecipeNamesByUnitIds` → `useRecipeNamesByUnitIds`; `getRecipeById` → `useRecipe` (D-07 reuse of existing hook); dropped `@tanstack/react-query` + query imports
- `SnapshotCompareDialog.tsx`: replaced 2 inline `useQuery` calls with `useSnapshotData(idA, open)` + `useSnapshotData(idB, open)`; dropped `@tanstack/react-query` + direct query import

**Task 3 — useUnitArmyLists + symmetry fix + UnitDeleteDialog (TDD)**

RED commit: failing tests for `useAddUnitToList` and `useRemoveUnitFromList` to invalidate `["unit-army-lists"]` prefix.

GREEN implementation:
- `useUnits.ts`: added `UNIT_ARMY_LISTS_KEY` + `useUnitArmyLists(unitId, enabled)` wrapping `getArmyListsByUnitId` (from `@/db/queries/armyLists`)
- `useArmyLists.ts`: added `qc.invalidateQueries({ queryKey: ["unit-army-lists"] })` to BOTH `useAddUnitToList.onSuccess` AND `useRemoveUnitFromList.onSuccess` (Pitfall C stale-membership gap closed)
- `UnitDeleteDialog.tsx`: replaced inline `useQuery` with `useUnitArmyLists(unit?.id ?? null, open)`; photo cleanup calls remain as direct imperative calls (D-09 justified exclusion documented)

## Deviations from Plan

### Minor Deviations (Auto-resolved)

**1. [Rule 1 - Bug] getArmyListsByUnitId source was wrong in PATTERNS.md**
- **Found during:** Task 3 — PATTERNS.md said "import from @/db/queries/units"
- **Issue:** `getArmyListsByUnitId` is actually in `@/db/queries/armyLists`, not `units`. The existing `UnitDeleteDialog.tsx` import confirmed the correct source.
- **Fix:** Used `@/db/queries/armyLists` as the import source in `useUnits.ts`.
- **Files modified:** `src/hooks/useUnits.ts`

**2. [Rule 3 - Scope] 2 pre-existing useQuery calls in DatasheetPointsTab not converted**
- **Found during:** Task 1 verification — `usePointTiers` (local file-private hook, lines ~40-53) and `DatasheetDetail` component (line ~81) have their own useQuery calls
- **Issue:** Plan acceptance criteria said `grep -c "useQuery" == 0` but these 2 calls existed before this plan and are NOT in the HON-10 bypass list (RESEARCH.md lists only 3 bypasses for this file: the BSData faction queries)
- **Fix:** Left them in place — they are local named helpers, not render-path bypasses in scope. Build passes and all 3 BSData bypasses are converted.
- **Files:** No additional change needed.

## Justified Exclusions (D-09 — documented, not wrapped)

| Call | Location | Reason |
|------|----------|--------|
| `getPhotoFilenamesByUnit` | `UnitDeleteDialog.handleConfirm` | Imperative cleanup step — no caching value |
| `getPhotosByUnit` | `UnitDeleteDialog.handleConfirm` | Imperative cleanup step — no caching value |
| `deleteUnitPhoto` | `UnitDeleteDialog.handleConfirm` | Write mutation, not a render-path read |
| `getSnapshotData` (in SnapshotHistorySheet.handleExportJson) | `SnapshotHistorySheet` | On-demand event handler, one-shot |
| `RecipeFormSheet.saveRecipeGraph` | `RecipeFormSheet` | Mutation/write, not a read |
| `DataManagementTab getAppSettings/upsertAppSetting` | `DataManagementTab` | Imperative settings I/O in handlers |
| `PlaybookTab getUdbUnitDetail/linkUdbUnit` | `PlaybookTab` | Imperative one-shots in handlePickerSelect |

## TDD Gate Compliance

- RED commit: `9b0624c2` — test(136-04): symmetry tests for unit-army-lists invalidation (FAILED as expected)
- GREEN commit: `23c5aa93` — feat(136-04): implementation makes all tests pass

## Known Stubs

None — this plan is a hooks-layer hygiene refactor with no UI stubs.

## Threat Flags

None — hooks-layer cache routing refactor only; no new network endpoints, auth paths, or schema changes introduced.

## Self-Check

### Created files exist:
- `src/hooks/useEnhancements.ts` — FOUND
- `src/hooks/useBsdataFaction.ts` — FOUND

### Commits:
- `493a85dd` — Task 1: BSData hooks + EnhancementsList/DatasheetPointsTab
- `bcae3934` — Task 2: useRecipeNamesByUnitIds + useSnapshotData + DashboardPage/SnapshotCompareDialog
- `9b0624c2` — RED: symmetry + consumer tests
- `23c5aa93` — GREEN: useUnitArmyLists + symmetry fix + UnitDeleteDialog re-point

## Self-Check: PASSED
