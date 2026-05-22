---
phase: 98
plan: "02"
subsystem: db-sync
tags: [performance, batch-insert, sqlite, sync]
dependency_graph:
  requires: []
  provides: [batched-insert-pattern]
  affects: [sync-pipeline, rules-sync]
tech_stack:
  added: []
  patterns: [multi-row-VALUES-INSERT, chunk-batching-200-rows]
key_files:
  created:
    - tests/performance/batchInsert.test.ts
  modified:
    - src/db/queries/syncedUnitPoints.ts
    - src/db/queries/bsdataExtended.ts
    - tests/datasheet/pointsSchema.test.ts
decisions:
  - BATCH_SIZE=200 keeps SQLite parameter count well below the 32766 limit for all column counts
  - Empty array guard commits before returning to avoid partial-transaction state
  - COL_COUNT constant per function avoids magic numbers in placeholder builder
metrics:
  duration_minutes: 35
  completed_date: "2026-05-22"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 98 Plan 02: Batch INSERT for Sync Functions Summary

All 6 `replace*` sync functions converted from per-row INSERT loops to multi-row batched INSERT with 200-row chunking. N individual INSERTs per sync → ceil(N/200) INSERTs per sync.

## What Was Built

### Task 1: syncedUnitPoints.ts — 2 functions converted

`replaceSyncedUnitPoints` (COL_COUNT=4) and `replaceSyncedUnitPointTiers` (COL_COUNT=5) now build a single `INSERT INTO ... VALUES ($1, $2, ...), ($5, $6, ...)` statement per 200-row chunk using a placeholder builder and `flatMap` for params.

Transaction structure preserved: BEGIN TRANSACTION / DELETE / batched INSERT loop / COMMIT / ROLLBACK on error.

### Task 2: bsdataExtended.ts — 4 functions converted

- `replaceSyncedEnhancements`: COL_COUNT=5
- `replaceSyncedLoadoutOptions`: COL_COUNT=7 (boolean casts `? 1 : 0` preserved)
- `replaceSyncedModelCounts`: COL_COUNT=5
- `replaceSyncedLeaderTargets`: COL_COUNT=4

### Test coverage

`tests/performance/batchInsert.test.ts` — 7 tests:
- `replaceSyncedUnitPoints`: single INSERT for 2 rows, 0 INSERTs for empty, 2 INSERTs for 201 rows (chunk boundary)
- `replaceSyncedUnitPointTiers`: single INSERT for 2 rows, 0 INSERTs for empty
- `replaceSyncedEnhancements`: single INSERT for 2 rows, 0 INSERTs for empty

All 7 pass. `tests/datasheet/pointsSchema.test.ts` updated to expect 4 execute calls (batched) instead of 5 (per-row).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing test expected per-row INSERT behavior**
- **Found during:** Task 1
- **Issue:** `tests/datasheet/pointsSchema.test.ts` asserted `executeMock.toHaveBeenCalledTimes(5)` for 2 rows and expected 2 separate INSERT calls with individual params. After batching, it's 4 calls with 1 batched INSERT.
- **Fix:** Updated to `toHaveBeenCalledTimes(4)`, combined params array `["Intercessors", "SM", 80, "...", "Boyz", null, 70, "..."]`, and regex `/.toMatch(/VALUES.*\$1.*\$5/s)`.
- **Files modified:** `tests/datasheet/pointsSchema.test.ts`
- **Commit:** f3ee76f

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes.

## Self-Check

Files exist:
- `src/db/queries/syncedUnitPoints.ts` — FOUND (modified)
- `src/db/queries/bsdataExtended.ts` — FOUND (modified)
- `tests/performance/batchInsert.test.ts` — FOUND (created)

Commits:
- f3ee76f — feat(98-02): convert syncedUnitPoints replace* to batched multi-row INSERT
- b954cc6 — feat(98-02): convert bsdataExtended replace* to batched multi-row INSERT

## Self-Check: PASSED
