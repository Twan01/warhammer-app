---
phase: 47-v2.6-gap-closure
plan: 01
subsystem: rules-sync
tags: [diff, snapshot, per-field, ovrd-06, pure-function]
dependency_graph:
  requires: [46-02]
  provides: [computeSyncDiff with modified array, enriched SNAPSHOT_TABLES]
  affects: [src/hooks/useRulesSync.ts, Plan 47-02 UI layer]
tech_stack:
  added: []
  patterns: [per-field comparison with groupBy, options-object extension pattern]
key_files:
  created: []
  modified:
    - src/db/queries/rulesSnapshot.ts
    - src/lib/computeSyncDiff.ts
    - src/hooks/useRulesSync.ts
    - tests/datasheet/computeSyncDiff.test.ts
decisions:
  - "ExtendedSnapshotData options object used instead of 8-param signature to keep computeSyncDiff call sites readable and backward-compatible"
  - "Renamed datasheets excluded from modified via persistedIds filter (same id AND same name) — no double-counting"
  - "Multi-line model field labels include model name in parens (e.g. W (Sergeant)) only when datasheet has > 1 model line"
  - "rw_datasheets_wargear remains query:null — out of OVRD-06 scope per prior user decision"
  - "Record<string, unknown>[] generic type used for rulesSnapshot select() to accommodate both simple id+name and composite-PK row shapes"
metrics:
  duration: 5m
  completed: "2026-05-08"
  tasks: 2
  files_modified: 4
---

# Phase 47 Plan 01: Per-Field Diff Algorithm and Snapshot Enrichment Summary

Extended snapshot storage and diff algorithm to detect per-field changes (stats, keywords, abilities) for datasheets that persist between Wahapedia syncs, closing the OVRD-06 gap where only added/removed/renamed were previously visible.

## What Was Built

### Task 1: Extended SNAPSHOT_TABLES and SyncDiff types (commit e0a278c)

**rulesSnapshot.ts** — Three formerly `query: null` entries now have rich SELECT queries:
- `rw_datasheet_models`: captures all 9 stat columns (M, T, Sv, inv_sv, W, Ld, OC) plus datasheet_id/line/name
- `rw_datasheet_abilities`: captures datasheet_id, line, ability_id, name, description, type
- `rw_datasheet_keywords`: captures datasheet_id, keyword, is_faction_keyword
- `rw_datasheets_wargear`: remains `query: null` (out of scope)

The `capturePreSyncSnapshot` select() generic was widened to `Record<string, unknown>[]` to support both simple `{id, name}` rows and composite-PK full-row shapes.

**computeSyncDiff.ts** — New exported interfaces: `FieldChange`, `ModifiedDatasheet`, `ExtendedSnapshotData`. Extended `SyncDiff` with `modified: ModifiedDatasheet[]`. The function now accepts an optional `extended` parameter that drives three private comparison helpers: `compareModels`, `compareKeywords`, `compareAbilities`. The `persistedIds` set ensures renamed datasheets are not double-counted in `modified`. `total_changed` now includes `modified.length`.

**useRulesSync.ts** — Fallback `SyncDiff` literal updated to include `modified: []`.

### Task 2: Unit tests for per-field diff (commit 69d60f2)

Added a new `describe("computeSyncDiff — per-field diff (Phase 47)")` block with 14 test cases to `tests/datasheet/computeSyncDiff.test.ts`:

- Stat change: T from 5 to 6 produces FieldChange `{field: "T", oldValue: "5", newValue: "6"}`
- Multiple stat changes on single model line
- Multi-line model label: `"W (Sergeant)"` when datasheet has >1 model line
- Keyword added: `{field: "CORE", oldValue: "", newValue: "CORE"}`
- Keyword removed: `{field: "IMPERIUM", oldValue: "IMPERIUM", newValue: ""}`
- Ability added/removed
- Mixed stats + keywords + abilities merged into one ModifiedDatasheet
- Null extended data → empty modified
- No extended param → empty modified (backward compat)
- `total_changed` includes `modified.length`
- Added datasheets excluded from modified (no double-count)
- Renamed datasheets excluded from modified (no double-count)
- Identical extended data → empty modified

All 22 tests pass: 8 existing + 14 new.

## Verification

- `pnpm build` exits 0 — TypeScript compiles cleanly
- `pnpm exec vitest run tests/datasheet/computeSyncDiff.test.ts` — 22/22 pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical fix] Updated SyncDiff literal in useRulesSync.ts**
- **Found during:** Task 1 — pnpm build reported `modified` missing from fallback SyncDiff
- **Issue:** `useRulesSync.ts` line 181 had a hardcoded `{ added: [], removed: [], renamed: [], total_changed: 0 }` literal that no longer satisfied the updated `SyncDiff` interface
- **Fix:** Added `modified: []` to the literal
- **Files modified:** `src/hooks/useRulesSync.ts`
- **Commit:** e0a278c (included in Task 1 commit)

**2. [Rule 2 - Missing critical fix] Updated existing test toEqual assertion**
- **Found during:** Task 1 — pnpm build reported type error in existing test
- **Issue:** The first test in `computeSyncDiff.test.ts` used `toEqual<SyncDiff>({...})` without `modified: []`, making it a TypeScript error
- **Fix:** Added `modified: []` to the toEqual expectation
- **Files modified:** `tests/datasheet/computeSyncDiff.test.ts`
- **Commit:** e0a278c (included in Task 1 commit)

**3. [Rule 3 - Type widening] Generic type for rulesSnapshot select()**
- **Found during:** Task 1 implementation
- **Issue:** `select<{ id: string; name: string }[]>` is incorrect for composite-PK queries that return rows like `{datasheet_id, line, name, M, T, ...}`
- **Fix:** Changed to `select<Record<string, unknown>[]>` — the result is passed directly to `JSON.stringify()` so the shape only matters at runtime, not compile-time
- **Files modified:** `src/db/queries/rulesSnapshot.ts`
- **Commit:** e0a278c

## Self-Check: PASSED

Files exist:
- `src/db/queries/rulesSnapshot.ts` — FOUND (modified)
- `src/lib/computeSyncDiff.ts` — FOUND (modified)
- `tests/datasheet/computeSyncDiff.test.ts` — FOUND (modified)

Commits exist:
- `e0a278c` — FOUND (feat(47-01): extend snapshot queries...)
- `69d60f2` — FOUND (test(47-01): add 14 per-field diff unit tests...)
