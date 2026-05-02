---
phase: 08-army-list-builder
plan: "00"
subsystem: army-lists / data-layer
tags: [query, tdd, wave-0, stub-tests, army-lists]
dependency_graph:
  requires: []
  provides:
    - getArmyListsByUnitId query (ARMY-05 pre-delete warning)
    - Wave 0 stub tests for UnitDeleteDialog (plan 04)
    - Wave 0 stub tests for ArmyListsPage (plan 04)
  affects:
    - src/db/queries/armyLists.ts
    - tests/army-list/ (new directory)
tech_stack:
  added: []
  patterns:
    - vi.mock("@/db/client") pattern for SQL query tests
    - describe.skip stub test pattern for Wave 0 scaffolding
key_files:
  created:
    - tests/army-list/armyListQueries.test.ts
    - tests/army-list/UnitDeleteDialog.test.tsx
    - tests/army-list/ArmyListsPage.test.tsx
  modified:
    - src/db/queries/armyLists.ts
decisions:
  - "SQL does not de-duplicate — if a unit appears in List A twice, caller sees List A twice. Plan 04 call site de-dups by id if needed for display."
  - "Stub tests use describe.skip (not it.todo) so vitest reports them as skipped, not pending — exit code 0 confirmed."
metrics:
  duration: "~8 minutes"
  completed: "2026-05-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 8 Plan 00: Wave 0 Foundation — Army List Data Layer + Stub Tests Summary

One-liner: `getArmyListsByUnitId` SQL query appended to armyLists.ts with 2 passing TDD tests, plus 5 describe.skip stub tests closing all Wave 0 gaps in 08-VALIDATION.md.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Append getArmyListsByUnitId + query tests (TDD) | 0881373 | src/db/queries/armyLists.ts, tests/army-list/armyListQueries.test.ts |
| 2 | Create Wave 0 stub test files | c8eb952 | tests/army-list/UnitDeleteDialog.test.tsx, tests/army-list/ArmyListsPage.test.tsx |

## What Was Built

### New Query: `getArmyListsByUnitId`

Appended to `src/db/queries/armyLists.ts` as the 10th export (all 9 pre-existing exports untouched):

```typescript
export async function getArmyListsByUnitId(
  unitId: number,
): Promise<{ id: number; name: string }[]>
```

SQL: `SELECT al.id, al.name FROM army_list_units alu JOIN army_lists al ON al.id = alu.list_id WHERE alu.unit_id = $1`

### Test Coverage

| File | Tests | Status |
|------|-------|--------|
| tests/army-list/armyListQueries.test.ts | 2 | Passing (real assertions) |
| tests/army-list/UnitDeleteDialog.test.tsx | 2 | Skipped (Wave 0 stubs for plan 04) |
| tests/army-list/ArmyListsPage.test.tsx | 3 | Skipped (Wave 0 stubs for plan 04) |
| **Total** | **7** | **2 passing + 5 skipped** |

Pre-existing test count: 171 → final count: 173 passing + 5 skipped = 178 total.

### Wave 0 Gaps Closed

All 3 files required by `08-VALIDATION.md §Wave 0 Requirements` now exist:
- `tests/army-list/armyListQueries.test.ts` — stubs for getArmyListsByUnitId (real tests)
- `tests/army-list/UnitDeleteDialog.test.tsx` — stubs for ARMY-05 warning state
- `tests/army-list/ArmyListsPage.test.tsx` — stubs for ARMY-06 empty/loading/populated states

## Verification Results

- `pnpm test -- --run tests/army-list/` — exit 0 (2 passing, 5 skipped)
- `pnpm test -- --run tests/foundation/` — exit 0 (regression, pre-existing tests unchanged)
- `pnpm tsc --noEmit` — 3 pre-existing errors (PlaybookTab.test.tsx unused import, migration004.test.ts node: modules) — not introduced by this plan

## Deviations from Plan

### Pre-existing tsc Errors (out of scope)

**Found during:** Task 1 tsc verification

**Issue:** `pnpm tsc --noEmit` returns exit code 2 with 3 errors:
- `tests/collection/PlaybookTab.test.tsx(12,26)` — `'within' is declared but its value is never read`
- `tests/foundation/migration004.test.ts(8,30)` — `Cannot find module 'node:fs'`
- `tests/foundation/migration004.test.ts(9,25)` — `Cannot find module 'node:path'`
- `tests/foundation/migration004.test.ts(11,26)` — `Cannot find name '__dirname'`

**Verification:** Confirmed pre-existing via `git stash` — same errors present before any changes in this plan.

**Action:** Logged to deferred-items. My changes actually reduced the error count by 1 (removed the `getArmyListsByUnitId is not exported` error). Not blocking — vitest runs and passes regardless of these tsc errors.

**Files modified:** None (out of scope per deviation rules)

## Self-Check

- [x] `src/db/queries/armyLists.ts` contains `export async function getArmyListsByUnitId(` — FOUND
- [x] `tests/army-list/armyListQueries.test.ts` exists — FOUND
- [x] `tests/army-list/UnitDeleteDialog.test.tsx` exists — FOUND
- [x] `tests/army-list/ArmyListsPage.test.tsx` exists — FOUND
- [x] Commit 0881373 exists — FOUND
- [x] Commit c8eb952 exists — FOUND
