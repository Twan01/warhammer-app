---
phase: 06-foundation
plan: "03"
subsystem: db-queries
tags: [sqlite, queries, army-lists, strategy-notes, paints, testing]
dependency_graph:
  requires: [06-02]
  provides: [getPaintsWithRecipeCount, getStrategyNote, upsertStrategyNote, getArmyLists, getArmyListById, getArmyListWithUnits, createArmyList, updateArmyList, deleteArmyList, addUnitToList, removeUnitFromList, updateArmyListUnit]
  affects: [06-04, phase-07, phase-08, phase-09]
tech_stack:
  added: []
  patterns: [select-then-upsert, full-replacement-UPDATE, SQL-COALESCE-effective-points, mocked-getDb-test-pattern]
key_files:
  created:
    - src/db/queries/strategyNotes.ts
    - src/db/queries/armyLists.ts
  modified:
    - src/db/queries/paints.ts
    - tests/foundation/strategyNoteQueries.test.ts
    - tests/foundation/armyListQueries.test.ts
decisions:
  - "updateArmyListUnit uses full-replacement SET (no COALESCE) so points_override can be cleared to NULL"
  - "addUnitToList uses plain INSERT — no INSERT OR IGNORE — duplicate (list_id, unit_id) pairs intentionally allowed"
  - "upsertStrategyNote uses select-then-insert/update because no UNIQUE INDEX exists on unit_strategy_notes.unit_id"
  - "getArmyListWithUnits computes COALESCE(alu.points_override, u.points, 0) AS effective_points in SQL — never in JS"
  - "getPaintsWithRecipeCount uses LEFT JOIN + COUNT(rp.id) in SQL — never recalculated in JS (N+1 guard)"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-05-01"
  tasks_completed: 3
  files_modified: 5
---

# Phase 6 Plan 03: Query Layer — getPaintsWithRecipeCount, StrategyNote, ArmyList CRUD Summary

One-liner: SQL query layer for v0.2.0 — LEFT JOIN recipe count, select-then-upsert strategy notes, and 8-function army list CRUD with NULL-passthrough update and duplicate-allowed unit membership.

## Delivered

### 9 New Exported Functions

**paints.ts (1 added, 5 preserved)**
- `getPaintsWithRecipeCount()` — SELECT p.*, COUNT(rp.id) AS recipe_count FROM paints LEFT JOIN recipe_paints GROUP BY p.id

**strategyNotes.ts (new file, 2 functions)**
- `getStrategyNote(unitId)` — SELECT * FROM unit_strategy_notes WHERE unit_id = $1 LIMIT 1; returns null if none
- `upsertStrategyNote(input)` — select-then-insert/update; no ON CONFLICT (no UNIQUE index exists)

**armyLists.ts (new file, 8 functions)**
- `getArmyLists()` — SELECT * FROM army_lists ORDER BY name ASC
- `getArmyListById(id)` — SELECT * FROM army_lists WHERE id = $1
- `getArmyListWithUnits(listId)` — JOIN units + COALESCE(alu.points_override, u.points, 0) AS effective_points
- `createArmyList(input)` — INSERT INTO army_lists; returns lastInsertId
- `updateArmyList(input)` — COALESCE partial update (same as updateUnit/updatePaint)
- `deleteArmyList(id)` — CASCADE removes army_list_units automatically
- `addUnitToList(input)` — plain INSERT; allows duplicate (list_id, unit_id) pairs
- `removeUnitFromList(armyListUnitId)` — DELETE FROM army_list_units WHERE id = $1
- `updateArmyListUnit(input)` — full-replacement: SET points_override=$2, notes=$3 (NOT COALESCE)

### Tests Replaced (wave-0 stubs → real assertions)

**strategyNoteQueries.test.ts** (5 tests, all green, no skipped):
- getStrategyNote returns null when no row
- getStrategyNote returns full 18-column row
- upsertStrategyNote INSERT path verifies SQL + params
- upsertStrategyNote UPDATE path verifies SQL + params
- save column INTEGER type assertion

**armyListQueries.test.ts** (9 tests, all green, no skipped):
- getArmyLists SELECT string assertion
- getArmyListWithUnits JOIN + COALESCE SQL assertion
- createArmyList INSERT + lastInsertId
- updateArmyList COALESCE pattern match
- deleteArmyList exact call assertion
- addUnitToList duplicate-allowed (no INSERT OR IGNORE, no ON CONFLICT)
- removeUnitFromList exact call assertion
- updateArmyListUnit exact SQL string (no COALESCE)
- updateArmyListUnit NULL passthrough (both params null)

## Critical Contract Tests (All Green)

| Contract | Test Assertion | Result |
|---|---|---|
| updateArmyListUnit NOT COALESCE | `expect(sql).toBe("UPDATE army_list_units SET points_override=$2, notes=$3 WHERE id=$1")` | PASS |
| updateArmyListUnit NULL passthrough | `expect(params).toEqual([7, null, null])` | PASS |
| addUnitToList no ON CONFLICT | `expect(sql).not.toMatch(/ON CONFLICT/i)` | PASS |
| getArmyListWithUnits COALESCE in SQL | `expect(sql).toMatch(/COALESCE\(alu\.points_override, u\.points, 0\)/)` | PASS |
| upsertStrategyNote select-then-upsert | SELECT then conditional INSERT/UPDATE | PASS |
| save INTEGER (not string) | `expect(typeof params[3]).toBe("number")` | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Created/Modified

- `src/db/queries/paints.ts` — FOUND (getPaintsWithRecipeCount appended)
- `src/db/queries/strategyNotes.ts` — FOUND (new file)
- `src/db/queries/armyLists.ts` — FOUND (new file)
- `tests/foundation/strategyNoteQueries.test.ts` — FOUND (stubs replaced)
- `tests/foundation/armyListQueries.test.ts` — FOUND (stubs replaced)

### Commits

- `73d5d7c` — feat(06-03): append getPaintsWithRecipeCount() to paints.ts
- `93728bc` — feat(06-03): create strategyNotes.ts and replace strategyNoteQueries stubs
- `6c75f36` — feat(06-03): create armyLists.ts and replace armyListQueries stubs

## Self-Check: PASSED
