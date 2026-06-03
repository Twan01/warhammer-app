---
phase: 115-sub-faction-filter-fix
plan: "01"
subsystem: unit-database
tags: [bug-fix, filter, sub-faction, sql, tdd]
dependency_graph:
  requires: []
  provides: [correct-sub-faction-filter-behavior]
  affects: [unit-database-browser, army-list-unit-picker, collection-browser]
tech_stack:
  added: []
  patterns: [dual-site-fix, tdd-red-green]
key_files:
  created: []
  modified:
    - src/features/unit-database/applyUdbFilters.ts
    - src/db/queries/unitDatabase.ts
    - tests/unit-database/applyUdbFilters.test.ts
decisions:
  - "Dual-site fix: both SQL (getUdbUnitIdsBySubFaction) and client-side (applyUdbFilters) fixed independently since each serves different surfaces"
  - "No changes to hook layer, filter stores, or consumer components — fix confined to two one-line changes"
  - "Pre-existing test failures (DQ-02, DAS-06) confirmed unrelated and out of scope"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-03"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 115 Plan 01: Sub-faction Filter Fix Summary

**One-liner:** Dual-site fix (one SQL OR clause, one TypeScript condition) so selecting a sub-faction shows both sub-faction-tagged and generic parent-faction units.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Update tests for correct sub-faction filter semantics (RED) | 5bec013 | tests/unit-database/applyUdbFilters.test.ts |
| 2 | Fix applyUdbFilters and SQL query (GREEN) | e64b00a | src/features/unit-database/applyUdbFilters.ts, src/db/queries/unitDatabase.ts |

## What Was Built

**Problem:** Filtering by a sub-faction (e.g. "Ultramarines") excluded generic parent-faction units (where `sub_faction IS NULL`). A player selecting Ultramarines would not see Captain, Repulsor, or any other unit available to all Space Marines — only Ultramarines-exclusive units.

**Fix 1 — Client-side (SUB-01):** In `applyUdbFilters.ts`, expanded the sub-faction guard from a 2-part condition to 3-part:
- Before: exclude if `subFactionFilter !== null && unit.sub_faction !== filter`
- After: exclude if `subFactionFilter !== null && unit.sub_faction !== filter && unit.sub_faction !== null`

Units with `sub_faction === null` now pass through when any sub-faction filter is active.

**Fix 2 — SQL (SUB-02 + SUB-03):** In `getUdbUnitIdsBySubFaction`, changed:
- Before: `WHERE faction_id = $1 AND sub_faction = $2`
- After: `WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)`

This single SQL change fixes both the army list unit picker (SUB-02) and the collection browser (SUB-03) since both call `useUdbSubFactionUnitIds` which calls this query.

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

- `tests/unit-database/applyUdbFilters.test.ts`: all 13 tests pass (5 sub-faction tests, 8 other filters)
- `pnpm build`: TypeScript compilation succeeded (exit code 0)
- Full suite: 4 pre-existing failures (DQ-02 determinism x2, DAS-06 composition x2) — unrelated to this plan, out of scope

## Known Stubs

None.

## Threat Flags

None — no new trust boundaries introduced. SQL fix uses same parameterized query pattern with no new user-supplied inputs. The OR IS NULL clause widens results within the existing `faction_id` constraint with no cross-faction leakage.

## Self-Check: PASSED

- [x] `src/features/unit-database/applyUdbFilters.ts` exists and contains `unit.sub_faction !== null`
- [x] `src/db/queries/unitDatabase.ts` exists and contains `sub_faction = $2 OR sub_faction IS NULL`
- [x] `tests/unit-database/applyUdbFilters.test.ts` exists and contains `includes generic`
- [x] Commit 5bec013 exists (test RED phase)
- [x] Commit e64b00a exists (fix GREEN phase)
