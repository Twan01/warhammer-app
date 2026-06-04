---
phase: 117-points-coverage
plan: 01
subsystem: build-pipeline
tags: [points, csv, sub-faction, pipeline]
dependency_graph:
  requires: []
  provides: [cost-csv-points, keyword-sub-faction, extractModelCount]
  affects: [build-unit-db, update-unit-database, parseCsv]
tech_stack:
  added: []
  patterns: [datasheet_id-join, keyword-sub-faction-matching]
key_files:
  created: []
  modified:
    - scripts/lib/parseCsv.ts
    - scripts/build-unit-db.ts
    - scripts/update-unit-database.ts
    - src-tauri/data/unit_database.json
decisions:
  - Moved readCsvFile from bsdata.ts to parseCsv.ts (single source for CSV utilities)
  - Used description.match(/\d+/g) with sum for extractModelCount (handles all patterns)
  - Simplified coverage table to remove BSData match method columns
  - Kept legacy BSData imports behind comments for Plan 02 cleanup
metrics:
  duration: ~4m
  completed: 2026-06-04
---

# Phase 117 Plan 01: Cost CSV Points & Keyword Sub-faction Summary

Wahapedia cost CSV-based points resolution via datasheet_id join, plus keyword-based sub-faction assignment replacing BSData catalogue matching. Coverage jumped from ~60% to 99.8%.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Relocate readCsvFile to parseCsv.ts and add extractModelCount | 65dc0d9 | scripts/lib/parseCsv.ts |
| 2 | Add cost CSV points step and keyword sub-faction to build-unit-db.ts | 3b16b82 | scripts/build-unit-db.ts, src-tauri/data/unit_database.json |
| 3 | Mirror cost CSV + sub-faction changes to update-unit-database.ts | 080f60b | scripts/update-unit-database.ts |

## Verification Results

- build-unit-db.ts: 1697/1701 units matched (99.8% coverage), 784 tier entries, 372 sub-faction assignments
- update-unit-database.ts: produces identical output (0 diff in dry-run mode)
- extractModelCount: "1 Spanner and 4 Burna Boyz" -> 5, "10 models" -> 10, "" -> fallback to line

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **readCsvFile location**: Moved to parseCsv.ts (co-located with parseWahapediaCsv it wraps)
2. **extractModelCount regex**: Used `/\d+/g` to find all numbers then sum -- handles "N models", "N TypeA and N TypeB", "N TypeA, N TypeB and N TypeC"
3. **Coverage table simplification**: Removed Exact/Norm/Alias BSData columns, replaced with WithPts column
4. **Legacy BSData imports**: Kept as separate import block with comment "removed in Plan 02" so files still compile

## Self-Check: PASSED
