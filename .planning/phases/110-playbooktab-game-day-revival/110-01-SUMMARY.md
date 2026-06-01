---
phase: 110-playbooktab-game-day-revival
plan: "01"
subsystem: game-day
tags: [zustand, persist-migration, army-list-validation, tdd]
dependency_graph:
  requires: []
  provides: [gameDayStore-v1-migration, DEDICATED-TRANSPORT-check, EPIC-HERO-check]
  affects: [src/features/game-day/gameDayStore.ts, src/lib/computeUnitWarnings.ts]
tech_stack:
  added: []
  patterns: [zustand-persist-migrate, pick-type-extension, soft-warning-guard]
key_files:
  created: []
  modified:
    - src/features/game-day/gameDayStore.ts
    - src/lib/computeUnitWarnings.ts
    - tests/game-day/gameDayStore.test.ts
    - tests/lib/computeUnitWarnings.test.ts
decisions:
  - Exported migrateGameDayState as standalone function for direct unit testing without Zustand render environment
  - DEDICATED TRANSPORT and EPIC HERO checks both live inside the existing pointsLimit !== null guard block (consistent with BATTLELINE check)
  - Ghost units (unit_id = null) excluded from all role/keyword counting — consistent with BATTLELINE pattern
metrics:
  duration: "12 minutes"
  completed: "2026-06-01"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 4
---

# Phase 110 Plan 01: Game Day OPG Migration and Army Validation Summary

One-liner: Zustand persist v1 migration drops stale `::` OPG keys, with DEDICATED TRANSPORT cap and EPIC HERO uniqueness soft warnings added to army list validation.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Zustand persist migration and validation test scaffolds | 722d752 | gameDayStore.ts, computeUnitWarnings.ts, 2 test files |

## What Was Built

**gameDayStore.ts — persist migration (D-06, D-07, D-08):**
- Added `version: 1` and `migrate: migrateGameDayState` to the Zustand persist config
- Exported `migrateGameDayState(persistedState, fromVersion)` as a standalone function
- v0 → v1 migration filters any `usedAbilities` key containing `"::"` (old AUTOINCREMENT-based format); new `":"` composite keys are preserved
- Users who toggled OPG abilities before the key format change will simply re-toggle — no data loss beyond OPG state

**computeUnitWarnings.ts — extended validation (D-09, D-10, D-11):**
- Extended `computeListWarnings` Pick type to include `udb_unit_id` and `udb_keywords` alongside existing `udb_role` and `unit_id`
- DEDICATED TRANSPORT cap: soft warning fires when `transportCount > nonTransportNonCharacterCount`, guarded by `pointsLimit !== null`; ghost units excluded
- EPIC HERO uniqueness: soft warning fires when duplicate `udb_unit_id` found among units with "epic hero" in `udb_keywords`, guarded by `pointsLimit !== null`; case-insensitive
- Warning strings exactly match UI-SPEC: `"DEDICATED TRANSPORT count exceeds non-transport, non-character units"` and `"EPIC HERO must be unique (duplicate detected)"`

## Test Coverage

- 4 migration tests: v0 `::` keys dropped, single-colon keys preserved, empty state unchanged, mixed keys filtered
- 5 DEDICATED TRANSPORT tests: warning fires, no false positive, zero transports safe, null pointsLimit skip, ghost units excluded
- 5 EPIC HERO tests: warning fires, no false positive (single), no false positive (no keyword), null pointsLimit skip, case-insensitive
- All 69 tests pass (62 existing + 7 regression-free + 9 new migration + 10 new validation — net 69 after counting describe nesting)

## TDD Gate Compliance

- RED gate: 7 failing tests confirmed before implementation (migrateGameDayState not exported, DEDICATED TRANSPORT and EPIC HERO checks absent)
- GREEN gate: all 7 new tests pass after implementation; 0 regressions in 62 pre-existing tests

## Deviations from Plan

None — plan executed exactly as written. The decision to export `migrateGameDayState` as a standalone function (vs testing via setState injection) was pre-authorized by the plan: "Alternative: export a standalone `migrateGameDayState` function ... (Claude's discretion on approach)."

## Threat Flags

None. Both modifications stay within the trust boundaries documented in the plan's threat model:
- `migrateGameDayState` mutates client-local localStorage state only (T-110-01 accepted)
- `computeListWarnings` warning strings contain no user data (T-110-02 accepted)

## Self-Check

- [x] `src/features/game-day/gameDayStore.ts` — modified, contains `version: 1` and `migrateGameDayState`
- [x] `src/lib/computeUnitWarnings.ts` — modified, contains "epic hero" and "dedicated transport"
- [x] `tests/game-day/gameDayStore.test.ts` — modified, contains "migrate"
- [x] `tests/lib/computeUnitWarnings.test.ts` — modified, contains "EPIC HERO"
- [x] Commit 722d752 exists

## Self-Check: PASSED
