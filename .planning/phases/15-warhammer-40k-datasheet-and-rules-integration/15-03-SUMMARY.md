---
phase: 15-warhammer-40k-datasheet-and-rules-integration
plan: "03"
subsystem: data-layer
tags: [sqlite, tanstack-query, rules-db, hobbyforge-db, cross-db, datasheet-queries, hooks]
dependency_graph:
  requires: ["15-01"]
  provides: ["15-04", "15-05"]
  affects: ["src/db/rules-client.ts", "src/db/queries/datasheets.ts", "src/hooks/useDatasheet.ts"]
tech_stack:
  added: []
  patterns: ["dual-db singleton", "cross-db query module", "staleTime: Infinity hook factory", "select-then-insert/update upsert"]
key_files:
  created:
    - src/db/rules-client.ts
    - src/db/queries/datasheets.ts
    - src/hooks/useDatasheet.ts
  modified:
    - tests/datasheet/datasheetQueries.test.ts
    - tests/datasheet/useDatasheet.test.tsx
decisions:
  - "Cross-DB query module: getDatasheetsByFaction/getFullDatasheet/getRulesSyncMeta/upsertSyncMeta use getRulesDb(); getDatasheetIdForUnit/upsertDatasheetLink use getDb() — keeps datasheet feature logic cohesive despite touching two DB connections"
  - "try/catch in getRulesSyncMeta swallows 'no such table' error — tolerates empty rules.db before first sync (Pitfall 3)"
  - "upsertDatasheetLink uses select-then-insert/update pattern (mirrors strategyNotes.ts) — unit_strategy_notes has no UNIQUE INDEX on unit_id so ON CONFLICT is unavailable"
  - "useDatasheet.test.tsx ships 3 tests instead of 2 stubs — added defensive no-link branch (getDatasheetIdForUnit returns null → hook returns null without calling getFullDatasheet)"
metrics:
  duration_minutes: 4
  completed_date: "2026-05-04"
  tasks_completed: 3
  files_changed: 5
---

# Phase 15 Plan 03: Data Layer — rules-client, datasheets queries, useDatasheet hooks Summary

**One-liner:** sqlite:rules.db singleton + 6-function cross-DB query module (rules.db reads + hobbyforge.db link write) + 3 TanStack Query hook factories with staleTime: Infinity; 7 stubs flipped to passing.

## What Was Built

### src/db/rules-client.ts (new — 28 lines)

Singleton paralleling `src/db/client.ts` with `sqlite:rules.db` connection string. Exports `getRulesDb()` (async singleton with `PRAGMA foreign_keys = ON`) and `__resetRulesDbForTesting()` (test-only reset helper).

### src/db/queries/datasheets.ts (new — 153 lines)

Cross-DB query module spanning both database connections. Six exports:

- `getDatasheetsByFaction(factionId)` — SELECT id, name, role from rw_datasheets WHERE faction_id = $1, ordered by name ASC (rules.db)
- `getFullDatasheet(datasheetId)` — 5 sequential selects joined into FullDatasheet; filters Wargear/Wargear profile/Fortification abilities; applies stripHtml to ability name + description (rules.db)
- `getRulesSyncMeta()` — single rw_sync_meta row, try/catch returns null when table absent (rules.db)
- `getDatasheetIdForUnit(unitId)` — reads datasheet_id from unit_strategy_notes (hobbyforge.db)
- `upsertDatasheetLink(input)` — select-then-insert/update on unit_strategy_notes.datasheet_id (hobbyforge.db)
- `upsertSyncMeta(input)` — INSERT OR REPLACE into rw_sync_meta (rules.db)

### src/hooks/useDatasheet.ts (new — 68 lines)

Three TanStack Query hooks mirroring useStrategyNote.ts pattern:

- `useDatasheet(unitId)` — resolves datasheet_id via getDatasheetIdForUnit then fetches FullDatasheet; enabled: false when unitId undefined; staleTime: Infinity
- `useDatasheetsByFaction(factionId)` — faction-pre-filtered list for picker; enabled: false when factionId undefined; staleTime: Infinity
- `useRulesSyncMeta()` — single rw_sync_meta row; staleTime: Infinity

Three KEY exports: `DATASHEET_KEY`, `DATASHEETS_BY_FACTION_KEY`, `RULES_SYNC_META_KEY`

### tests/datasheet/datasheetQueries.test.ts (flipped — 4 tests)

Replaced 4 `it.skip` stubs with real assertions. Uses dual-db mock pairs (hobbyforgeSelectMock/hobbyforgeExecuteMock + rulesSelectMock/rulesExecuteMock). Covers DS-04, DS-07 (with stripHtml integration check), DS-02+DS-03 (try/catch), DS-06 (hobbyforge.db write verification).

### tests/datasheet/useDatasheet.test.tsx (flipped — 3 tests)

Replaced 2 `it.skip` stubs with 3 `it()` tests (added no-link defensive branch). Uses renderHook + QueryClientProvider wrapper. Covers enabled:false guard for undefined unitId, full FullDatasheet payload resolution, null return when link absent.

## Test Results

- datasheetQueries.test.ts: 4/4 passing
- useDatasheet.test.tsx: 3/3 passing
- Combined: 7/7 passing
- Full suite: 295 passing, 4 skipped (DatasheetPicker + DatasheetImportDialog stubs remain for Plan 15-04)

## Deviations from Plan

### Added Test Case (Rule 2 — Missing Coverage)

**Found during:** Task 3
**Issue:** Wave 0 stub had 2 it.skip blocks; plan called for flipping both. Added a 3rd test "returns null when no link" to cover the getDatasheetIdForUnit → null branch (getFullDatasheet never called). This is defensive coverage for the DS-04+DS-06 no-link path.
**Fix:** 3 it() tests shipped instead of 2.
**Files modified:** tests/datasheet/useDatasheet.test.tsx
**Commit:** b7f050f

None of the core plan tasks deviated — all 5 files written exactly per spec.

## Commits

| Hash | Description |
|------|-------------|
| 7e6d361 | feat(15-03): create rules-client.ts singleton and datasheets.ts query module |
| 2582634 | feat(15-03): create useDatasheet.ts hooks and flip datasheetQueries tests to passing |
| b7f050f | feat(15-03): flip useDatasheet.test.tsx to passing — 3 tests (added no-link branch) |

## Self-Check: PASSED

- FOUND: src/db/rules-client.ts
- FOUND: src/db/queries/datasheets.ts
- FOUND: src/hooks/useDatasheet.ts
- FOUND: tests/datasheet/datasheetQueries.test.ts
- FOUND: tests/datasheet/useDatasheet.test.tsx
- FOUND: commit 7e6d361
- FOUND: commit 2582634
- FOUND: commit b7f050f
