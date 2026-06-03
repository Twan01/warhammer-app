---
phase: 114-pipeline-fixes-database-rebuild
plan: 01
subsystem: build-pipeline
tags: [bugfix, csv-parsing, weapon-data, tdd]
dependency_graph:
  requires: []
  provides: [correct-weapon-range, correct-weapon-keywords, correct-weapon-grouping]
  affects: [unit_database.json, coverage-report.json]
tech_stack:
  added: []
  patterns: [extracted-helper-for-testability, direct-csv-column-mapping]
key_files:
  created:
    - scripts/lib/weaponMapping.ts
    - tests/build-pipeline/weaponParsing.test.ts
  modified:
    - scripts/build-unit-db.ts
decisions:
  - "Extracted mapWeaponRow helper from inline build-unit-db.ts logic for testability"
  - "weaponGroupTracker counter removed entirely; weapon_group and line_order now use CSV columns directly"
metrics:
  duration: 5m30s
  completed: 2026-06-03
  tasks_completed: 2
  tasks_total: 2
  test_count: 6
---

# Phase 114 Plan 01: Fix Systematic CSV Weapon Parsing Bugs Summary

Fixed three systematic CSV column mapping bugs in build-unit-db.ts that affected all 2,472+ weapons: range read wrong-cased column, keywords read wrong column name, and weapon_group used a faulty counter instead of CSV line/line_in_wargear values.

## What Was Done

### Task 1: Create weapon parsing tests (TDD RED)
- Created `tests/build-pipeline/weaponParsing.test.ts` with 6 test cases
- Extracted `mapWeaponRow` helper to `scripts/lib/weaponMapping.ts` with buggy implementation
- Tests defined correct behavior; 4 failed against buggy code (range and keywords bugs)
- Commit: `0cead77`

### Task 2: Fix three systematic CSV parsing bugs (TDD GREEN)
- **Fix 1 (D-01):** Changed `row["Range"]` to `row["range"]` -- CSV header is lowercase
- **Fix 2 (D-02):** Changed `row["keywords"]` to `row["description"]` -- correct column for weapon special rules
- **Fix 3 (D-04):** Removed `weaponGroupTracker` counter; `weapon_group = parseInt(row["line"])`, `line_order = parseInt(row["line_in_wargear"])`
- Updated `build-unit-db.ts` to use extracted `mapWeaponRow` helper
- All 6 tests pass, full suite green (2442 tests)
- Commit: `1e2f7a7`

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: `test(114-01)` commit `0cead77` -- 4 tests failing on range/keywords bugs
- GREEN gate: `feat(114-01)` commit `1e2f7a7` -- all 6 tests passing
- REFACTOR gate: not needed -- code is clean after extraction

## Verification

- `pnpm test -- tests/build-pipeline/weaponParsing.test.ts`: 6/6 pass
- `pnpm test`: 2442 pass, 0 fail
- No occurrence of `weaponGroupTracker` in `scripts/build-unit-db.ts`
- `row["range"]` (lowercase) confirmed in `scripts/lib/weaponMapping.ts`
- `row["description"]` confirmed in `scripts/lib/weaponMapping.ts`

## Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| 1 | `0cead77` | test | Add failing tests for weapon CSV column mapping |
| 2 | `1e2f7a7` | feat | Fix three systematic CSV weapon parsing bugs |
