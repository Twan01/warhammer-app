---
phase: 106-army-list-simplification
plan: 01
subsystem: army-lists
tags: [points-resolution, fk-migration, data-layer, cleanup]
dependency_graph:
  requires: [udb_units, udb_unit_points]
  provides: [fk-based-points-resolution, synced-cache-removal]
  affects: [army-lists, dashboard, diagnostics, rules-sync, loadout-builder]
tech_stack:
  added: []
  patterns: [FK-based SQL joins, 5-level COALESCE chain]
key_files:
  created:
    - src-tauri/migrations/040_drop_synced_points.sql
  modified:
    - src/db/queries/armyLists.ts
    - src/db/queries/units.ts
    - src/db/queries/dashboard.ts
    - src/db/queries/diagnostics.ts
    - src/db/queries/unitRulesMapping.ts
    - src/lib/resolveUnitPoints.ts
    - src/types/armyList.ts
    - src/types/unit.ts
    - src/hooks/useLoadoutOptions.ts
    - src/hooks/useRulesSync.ts
    - src/hooks/useArmyLists.ts
    - src/components/common/DbHealthGate.tsx
    - src/features/army-lists/ArmyListUnitRow.tsx
    - src/features/army-lists/LoadoutBuilderSheet.tsx
    - src/features/army-lists/PointsSourceChip.tsx
    - src/features/data-health/TableCountsGrid.tsx
    - src/features/rules-hub/DatasheetPointsTab.tsx
    - src/features/units/UnitFormOptional.tsx
    - src/features/units/UnitTableColumns.tsx
  deleted:
    - src/db/queries/syncedUnitPoints.ts
decisions:
  - FK-based points resolution via udb_unit_points replaces name-based synced_unit_points cache
  - EXPECTED_SCHEMA_VERSION bumped from 38 to 40 (migration 040 drops synced tables)
  - Ambiguity detection in ArmyListUnitRow hardcoded to 0 (no longer relevant with FK joins)
metrics:
  duration: ~45min
  completed: 2026-05-30
---

# Phase 106 Plan 01: FK-Based Points Resolution Summary

FK-based points resolution via udb_unit_points replacing name-based synced cache, plus full deletion of syncedUnitPoints module across 17 call sites

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Rewrite SQL queries to FK-based JOINs | f490fbe | armyLists.ts, resolveUnitPoints.ts, armyList.ts, unit.ts, dashboard.ts, units.ts |
| 2 | Delete syncedUnitPoints module and clean up call sites | 81def2e | syncedUnitPoints.ts (deleted), useRulesSync.ts, useLoadoutOptions.ts, DbHealthGate.tsx, diagnostics.ts, 040_drop_synced_points.sql |

## What Changed

### Task 1: FK-Based Query Rewrite
- Rewrote `getArmyListWithUnits` SQL from 3 old JOINs (unit_rules_mapping, synced_unit_points, synced_unit_point_tiers) to 3 new JOINs (udb_units, udb_unit_points udb_tier, udb_unit_points udb_base)
- Added GROUP_CONCAT subquery for udb_keywords
- Updated COALESCE chain: `COALESCE(alu.points_override, udb_tier.points, udb_base.points, uo.points, u.points, 0)`
- Updated `getArmyReadinessByFaction` with same FK-based pattern
- Updated `getUnitsWithPoints` with FK-based join
- Rewrote `resolveUnitPoints`: removed "synced" source, added "database" source, renamed parameter
- Updated `ArmyListUnitRow` type: removed canonical_name/synced_points, added udb_base_points/udb_role/udb_keywords/udb_unit_id
- Updated `EnrichedUnit` type: synced_points -> udb_base_points, is_synced -> is_linked
- Updated `PointsSourceChip`: "synced" -> "database" in labels and colors

### Task 2: Module Deletion and Cleanup
- Deleted `src/db/queries/syncedUnitPoints.ts` entirely (replaceSyncedUnitPoints, replaceSyncedUnitPointTiers, getPointTiersByFaction, etc.)
- Removed ~40 lines from useRulesSync pipeline (cache population removed)
- Rewrote `useLoadoutOptions`: useTiersByUnitName -> useTiersByUdbUnitId (queries udb_unit_points by unit_id)
- Rewrote `DbHealthGate`: removed ~70-line synced repair block, bumped EXPECTED_SCHEMA_VERSION 38 -> 40
- Removed findMatchingDatasheets from unitRulesMapping
- Updated diagnostics: getAmbiguousPointMatches now checks `udb_unit_id IS NULL`
- Removed "Synced Points" from TableCountsGrid (4 columns, not 5)
- Rewrote DatasheetPointsTab to query udb_unit_points directly
- Removed ambiguity detection useQuery from ArmyListUnitRow
- Created migration 040_drop_synced_points.sql (DROP TABLE synced_unit_points, synced_unit_point_tiers)
- Updated 25 test files to match new APIs and field names

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Unused import in addToCollectionFlow.test.tsx**
- Found during: Task 2
- Issue: Pre-existing unused `beforeEach` import causing TS6133 with `noUnusedLocals`
- Fix: Removed unused import from the import statement
- Files modified: tests/collection/addToCollectionFlow.test.tsx

**2. [Rule 3 - Blocking] Missing udb_unit_id in ArmyListUnitRow SQL projection**
- Found during: Task 2
- Issue: LoadoutBuilderSheet needed `unit.udb_unit_id` for FK tier lookup, but getArmyListWithUnits did not select it
- Fix: Added `u.udb_unit_id` to the SELECT projection in armyLists.ts
- Files modified: src/db/queries/armyLists.ts

## Verification Results

- `pnpm build`: PASSED (clean TypeScript compilation + Vite build)
- `pnpm test`: All plan-related tests pass (19 pre-existing failures in unrelated files: spending, wishlist, painting, hobby-journal)
- Zero `syncedUnitPoints` imports remain in `src/`
- One intentional removal comment in useRulesSync.ts referencing the old module

## Known Stubs

None -- all data paths are fully wired through FK joins.

## Self-Check: PASSED
