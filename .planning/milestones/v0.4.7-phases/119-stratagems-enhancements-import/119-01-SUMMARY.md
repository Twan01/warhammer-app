---
phase: 119-stratagems-enhancements-import
plan: "01"
subsystem: data-pipeline
tags: [stratagems, enhancements, csv-parsing, migration, typescript, unit-database]
dependency_graph:
  requires: [118-02]
  provides: [119-02]
  affects: [src-tauri/data/unit_database.json, scripts/lib/types.ts]
tech_stack:
  added: []
  patterns: [csv-parsing, legends-filter, nullable-fk-conversion, content-hash]
key_files:
  created:
    - src-tauri/migrations/043_udb_stratagems_enhancements.sql
  modified:
    - scripts/lib/types.ts
    - scripts/build-unit-db.ts
    - scripts/update-unit-database.ts
    - src-tauri/data/unit_database.json
decisions:
  - Empty string faction_id/detachment_id converted to null in stratagem parsing (consistent with nullable FK schema)
  - Legends filter uses boolean check (row["legend"] === "1" || row["legend"] === "true") matching Datasheets.csv pattern
  - update-unit-database.ts receives identical changes to build-unit-db.ts for pipeline parity
metrics:
  duration: "15 min"
  completed: "2026-06-04"
  tasks_completed: 2
  files_modified: 4
---

# Phase 119 Plan 01: TypeScript Pipeline Extension for Stratagems & Enhancements Summary

TypeScript types, migration DDL, and build pipeline extended to parse Stratagems.csv and Enhancements.csv, producing a rebuilt unit_database.json with 1482 stratagems and 927 enhancements ready for Rust import in Plan 02.

## What Was Built

**Task 1 — TypeScript types and migration DDL**
- Added `UdbStratagemRow` interface to `scripts/lib/types.ts` with nullable `faction_id` and `detachment_id` (for universal/core stratagems like Boarding Actions)
- Added `UdbEnhancementRow` interface with non-nullable `faction_id` (always faction-specific)
- Extended `UnitDatabaseJson` interface with `stratagems: UdbStratagemRow[]` and `enhancements: UdbEnhancementRow[]`
- Verified migration `043_udb_stratagems_enhancements.sql` (pre-created): `udb_stratagems` with `ON DELETE SET NULL` on both FKs, `udb_enhancements` with `ON DELETE CASCADE` on `faction_id`, 4 CREATE INDEX statements

**Task 2 — Build script extension and JSON rebuild**
- Added `Stratagems.csv` and `Enhancements.csv` to `REQUIRED_CSVs` in both build scripts
- Added Step 12: Stratagems.csv parsing with legends filter and `"" → null` FK conversion
- Added Step 13: Enhancements.csv parsing with legends filter, skip rows missing `faction_id`
- Extended hash computation and output object in both scripts
- Rebuilt `unit_database.json`: 1482 stratagems (28 universal with `faction_id: null`), 927 enhancements

## Verification Results

```
Stratagems: 1482  Enhancements: 927  Universal(null FK): 28
OK
```

All acceptance criteria passed:
- Stratagems >= 1300 (actual: 1482)
- Enhancements >= 800 (actual: 927)
- Universal stratagems with null faction_id >= 1 (actual: 28)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | c28cfe2 | feat(119-01): add UdbStratagemRow, UdbEnhancementRow types and migration 043 DDL |
| Task 2 | d408157 | feat(119-01): extend build scripts with stratagem and enhancement parsing, rebuild JSON |

## Known Stubs

None — all data is fully wired. The JSON payload is ready for Plan 02 (Rust importer).

## Threat Flags

No new security-relevant surface introduced. All changes are dev-side build pipeline only (CSV parsing, JSON generation). No user-facing attack surface added.

## Self-Check: PASSED

- scripts/lib/types.ts: exports UdbStratagemRow and UdbEnhancementRow — FOUND
- src-tauri/migrations/043_udb_stratagems_enhancements.sql: DDL exists with correct schema — FOUND
- src-tauri/data/unit_database.json: contains stratagems (1482) and enhancements (927) arrays — FOUND
- Commits c28cfe2 and d408157 — FOUND
