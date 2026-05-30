---
phase: 106-army-list-simplification
plan: 02
subsystem: army-lists
tags: [validation, battleline, role-warnings, drop-migration]
dependency_graph:
  requires: [106-01]
  provides: [battleline-count-validation, role-based-list-warnings]
  affects: [army-lists, computeUnitWarnings]
tech_stack:
  added: []
  patterns: [BATTLELINE threshold validation, case-insensitive role matching]
key_files:
  created: []
  modified:
    - src/lib/computeUnitWarnings.ts
    - src/features/army-lists/ArmyListSummaryBar.tsx
    - tests/lib/computeUnitWarnings.test.ts
decisions:
  - BATTLELINE count uses 10th edition thresholds (3 for 2000pt, 2 for 1000pt, 1 below)
  - Ghost/unlinked units (unit_id = null) excluded from role counting
  - computeListWarnings uses optional second parameter (units array) for backward compatibility
metrics:
  duration: ~5min
  completed: 2026-05-30
---

# Phase 106 Plan 02: Role-Based Validation and DROP Migration Summary

BATTLELINE count validation using udb_role with 10th edition thresholds, plus TDD test coverage for all threshold scenarios

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 (RED) | Add failing tests for role/BATTLELINE validation | 3aacdbd | tests/lib/computeUnitWarnings.test.ts |
| 1 (GREEN) | Implement BATTLELINE count validation | 6ae5b58 | src/lib/computeUnitWarnings.ts, ArmyListSummaryBar.tsx, tests/ |
| 2 | DROP migration for synced cache tables | N/A (already created in Plan 01) | src-tauri/migrations/040_drop_synced_points.sql |

## What Changed

### Task 1: Role-Based Validation (TDD)

**RED phase:** Added 8 new tests covering:
- Unlinked units (udb_role = null) skip role validation
- Ghost units (unit_id = null) skip role validation
- BATTLELINE threshold: 3 required at 2000pt
- BATTLELINE threshold: 2 required at 1000pt
- No warning when threshold is met
- Skips check when pointsLimit is null
- Case-insensitive role matching
- Ghost/unlinked units excluded from battleline count

**GREEN phase:** Extended `computeListWarnings` with a second parameter `units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id">>` (default `[]` for backward compatibility). Counts linked units with `udb_role?.toLowerCase() === "battleline"` against 10th edition thresholds. Updated `computeListHealthStats` to forward units to `computeListWarnings`. Updated `ArmyListSummaryBar` caller to pass units array.

Updated 2 existing tests that now need battleline-meeting unit fixtures to maintain correct warning counts.

### Task 2: DROP Migration (No-Op)

Migration `040_drop_synced_points.sql` was already created during Plan 01 execution (commit 81def2e). It correctly contains `DROP TABLE IF EXISTS synced_unit_points`, `DROP TABLE IF EXISTS synced_unit_point_tiers`, and `PRAGMA user_version = 40`. No additional work needed.

## Deviations from Plan

### Task 2 Already Complete

**Task 2 was a no-op** -- migration 040_drop_synced_points.sql was created during Plan 01 (Task 2, commit 81def2e). The plan included it as a separate task, but the prior wave already delivered it. No code changes needed.

### Test Fixture Updates

Two existing `computeListHealthStats` tests needed updated fixtures to provide 3 battleline units, since the new BATTLELINE count validation now fires on all lists with a pointsLimit. This is expected behavior -- the existing tests were asserting specific soft warning counts that changed with the new validation.

## Verification Results

- `pnpm build` (tsc --noEmit): PASSED
- `pnpm test -- tests/lib/computeUnitWarnings.test.ts`: 45/45 tests pass
- Migration 040 exists with correct DROP TABLE statements

## TDD Gate Compliance

1. RED gate: `test(106-02)` commit 3aacdbd -- 4 tests failing as expected
2. GREEN gate: `feat(106-02)` commit 6ae5b58 -- all 45 tests passing
3. REFACTOR gate: Not needed -- implementation is minimal and clean

## Known Stubs

None -- all validation paths are fully implemented.

## Self-Check: PASSED
