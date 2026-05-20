---
phase: 89-schema-data-layer
plan: 01
subsystem: data-layer
tags: [migration, typescript, schema, army-lists, ghost-units, enhancements, warlord]
dependency_graph:
  requires: []
  provides:
    - migration-031-army-list-v3
    - types-army-list-unit-v3
    - resolve-unit-points-tier
  affects:
    - src/features/army-lists
    - src/features/game-day
    - src/db/queries/armyLists.ts
    - src/hooks/useArmyLists.ts
tech_stack:
  added: []
  patterns:
    - rename-create-copy-drop (SQLite table recreation)
    - TEXT-copy denormalization (army_list_enhancements)
    - strict-null-check points resolution (tier_points != null)
key_files:
  created:
    - src-tauri/migrations/031_army_list_v3.sql
  modified:
    - src-tauri/src/lib.rs
    - src/types/armyList.ts
    - src/lib/resolveUnitPoints.ts
    - src/features/army-lists/PointsSourceChip.tsx
    - src/features/army-lists/ArmyListUnitRow.tsx
    - src/features/game-day/UnitAbilityCard.tsx
    - tests/lib/resolveUnitPoints.test.ts
    - tests/data-layer/db-helpers.ts
    - tests/foundation/migration027.test.ts
    - tests/foundation/migration028.test.ts
    - tests/army-lists/ArmyListSummaryBar.test.tsx
    - tests/game-day/GameDayReadinessPanel.test.tsx
    - tests/game-day/UnitAbilityCards.test.tsx
    - tests/lib/computeUnitWarnings.test.ts
    - tests/types/armyList.test.ts
    - tests/workshop-play/armyListReadinessPanel.test.tsx
decisions:
  - "Ghost units use nullable unit_id + ghost_unit_name with CHECK identity invariant"
  - "6-level COALESCE: points_override > tier_points > synced > user-override > base > 0"
  - "tier shown as cyan-500 in PointsSourceChip to distinguish from synced (emerald)"
  - "unit_id null-to-undefined conversion at hook call sites (not changing hook signatures)"
metrics:
  duration: 1375s
  completed: "2026-05-20"
  tasks: 2
  files_created: 1
  files_modified: 16
---

# Phase 89 Plan 01: Migration 031 + TypeScript Contracts Summary

**One-liner:** SQLite migration 031 recreates army_list_units for nullable unit_id (ghost units), adds enhancements join table, and extends TypeScript types + resolveUnitPoints with tier_points at priority level 2.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration 031 + lib.rs registration | af40a55 | 031_army_list_v3.sql, lib.rs |
| 2 | TypeScript types + resolveUnitPoints extension | 9ac6c0e | armyList.ts, resolveUnitPoints.ts + 15 files |

## What Was Built

### Task 1: Migration 031

`src-tauri/migrations/031_army_list_v3.sql` uses the rename-create-copy-drop pattern to:
- Make `unit_id` nullable (was `NOT NULL`) to support ghost/planned units
- Add `ghost_unit_name TEXT` with `CHECK (unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL)` identity invariant
- Add `is_warlord INTEGER NOT NULL DEFAULT 0` for warlord designation
- Add `selected_model_count INTEGER` (nullable, for tier resolution)
- Add `leader_attached_to_id INTEGER REFERENCES army_list_units(id) ON DELETE SET NULL`
- Preserve `tactical_role TEXT DEFAULT NULL` from migration 025

Creates `army_list_enhancements` join table with TEXT/INTEGER copies of enhancement name and points (denormalized, survives rules.db re-sync).

Registered as version 31 in `src-tauri/src/lib.rs`.

### Task 2: TypeScript Contracts

**`src/types/armyList.ts`** extended:
- `ArmyListUnit.unit_id`: `number` → `number | null`
- New fields: `ghost_unit_name`, `is_warlord`, `selected_model_count`, `leader_attached_to_id`
- `ArmyListUnitRow`: nullable `faction_id`, `status_assembly`, `status_painting`, `painting_percentage` for ghost units; new `tier_points: number | null`
- New interfaces: `AddGhostUnitToListInput`, `ArmyListEnhancement`, `AddEnhancementInput`

**`src/lib/resolveUnitPoints.ts`** extended:
- `PointsSource` union: added `"tier"` between `"override"` and `"synced"`
- New `tier_points: number | null` parameter at priority level 2
- Strict `!= null` check preserves 0-as-valid-value contract

**`src/features/army-lists/PointsSourceChip.tsx`**: added `tier` → `bg-cyan-500` dot and `"tier"` label.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PointsSourceChip missing "tier" entry in Record<PointsSource, string>**
- **Found during:** Task 2 (`pnpm build`)
- **Issue:** Both `SOURCE_DOT_CLASS` and `SOURCE_LABEL` use `Record<PointsSource, string>` — adding "tier" to the union required entries in both records.
- **Fix:** Added `tier: "bg-cyan-500"` and `tier: "tier"` to the respective maps.
- **Files modified:** `src/features/army-lists/PointsSourceChip.tsx`
- **Commit:** 9ac6c0e

**2. [Rule 3 - Blocking] ArmyListUnitRow.tsx — hooks expect number | undefined, unit_id now number | null**
- **Found during:** Task 2 (`pnpm build`)
- **Issue:** `useUnitPointTiers`, `useUnitLoadouts`, `useUnitRulesMapping` accept `number | undefined` but `unit.unit_id` is now `number | null`.
- **Fix:** Added `unitIdOrUndefined = unit.unit_id ?? undefined` local and used it for all three hooks.
- **Files modified:** `src/features/army-lists/ArmyListUnitRow.tsx`
- **Commit:** 9ac6c0e

**3. [Rule 3 - Blocking] ArmyListUnitRow.tsx — MatchStatusIndicator and RulesMappingSheet expect non-null unitId/factionId**
- **Found during:** Task 2 (`pnpm build`)
- **Issue:** `MatchStatusIndicator.unitId: number` and `RulesMappingSheet.unitId/factionId: number` — now both can be null for ghost units.
- **Fix:** Wrapped both render sites in `unit.unit_id != null` guards; added `unit.faction_id != null` guard for RulesMappingSheet.
- **Files modified:** `src/features/army-lists/ArmyListUnitRow.tsx`
- **Commit:** 9ac6c0e

**4. [Rule 3 - Blocking] ArmyListUnitRow.tsx — updateUnit.mutate passes unit_id as id**
- **Found during:** Task 2 (`pnpm build`)
- **Issue:** `UpdateUnitInput.id: number` but `unit.unit_id` is now `number | null`.
- **Fix:** Added `unit.unit_id == null` guard to early-return before `updateUnit.mutate`.
- **Files modified:** `src/features/army-lists/ArmyListUnitRow.tsx`
- **Commit:** 9ac6c0e

**5. [Rule 3 - Blocking] UnitAbilityCard.tsx — hooks expect number | undefined, status_painting now string | null**
- **Found during:** Task 2 (`pnpm build`)
- **Issue:** `useDatasheet` and `useStrategyNote` accept `number | undefined`; `getPaintingBadgeVariant` expects `string`.
- **Fix:** Added `unitIdOrUndefined = unit.unit_id ?? undefined`; added `?? ""` and `?? "—"` guards for null status_painting.
- **Files modified:** `src/features/game-day/UnitAbilityCard.tsx`
- **Commit:** 9ac6c0e

**6. [Rule 3 - Blocking] Test fixtures missing new ArmyListUnit/ArmyListUnitRow fields**
- **Found during:** Task 2 (`pnpm build`)
- **Issue:** 5 test files had `makeUnit` or `mockUnit` fixtures missing `ghost_unit_name`, `is_warlord`, `selected_model_count`, `leader_attached_to_id`, `tier_points`.
- **Fix:** Added all new fields (null/0 defaults) to all affected fixtures.
- **Files modified:** 5 test files
- **Commit:** 9ac6c0e

**7. [Rule 3 - Blocking] migration-parity test db-helpers missing migrations 029-031**
- **Found during:** Task 2 (test run)
- **Issue:** `HOBBYFORGE_MIGRATIONS` array stopped at 028; migration-parity test expected count to match lib.rs.
- **Fix:** Added 029, 030, 031 to the array and updated count comment.
- **Files modified:** `tests/data-layer/db-helpers.ts`
- **Commit:** 9ac6c0e

**8. [Rule 3 - Blocking] migration027/028 tests had hard-coded "max version = 28" assertion**
- **Found during:** Task 2 (test run)
- **Issue:** Both tests expected `Math.max(...versions) === 28` which fails after adding migration 031.
- **Fix:** Relaxed to `versions.contains(28)` + `Math.max(...versions) >= 28` (these tests verify migration 027/028 presence and structure, not that they're the last migration).
- **Files modified:** `tests/foundation/migration027.test.ts`, `tests/foundation/migration028.test.ts`
- **Commit:** 9ac6c0e

## Known Stubs

None — this plan creates only schema/type contracts. No UI or query stubs present.

## Threat Surface Scan

Migration 031 modifies `army_list_units` (user data, local SQLite only) and creates `army_list_enhancements`. No network endpoints or new trust boundaries introduced. T-89-01 (identity CHECK constraint) and T-89-03 (atomic table recreation) mitigations are in place as specified.

## Self-Check: PASSED

- `src-tauri/migrations/031_army_list_v3.sql`: FOUND
- `src/types/armyList.ts` contains `ghost_unit_name`: FOUND (4 occurrences)
- `src/lib/resolveUnitPoints.ts` contains `tier`: FOUND (5 occurrences)
- `grep -c "version: 31" src-tauri/src/lib.rs`: 1
- `pnpm build` exits 0: VERIFIED
- Commits af40a55, 9ac6c0e: VERIFIED (git log)
