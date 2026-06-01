---
phase: 108-build-script-hardening-schema-foundation
plan: 01
subsystem: build-pipeline
tags: [shared-lib, determinism, normalization, aliases, refactor]
dependency_graph:
  requires: []
  provides: [scripts-lib-modules, name-normalization, alias-table, sub-faction-map, deterministic-builds]
  affects: [build-unit-db, update-unit-database]
tech_stack:
  added: []
  patterns: [shared-lib-extraction, sorted-file-reads, multi-pass-name-matching-foundation]
key_files:
  created:
    - scripts/lib/types.ts
    - scripts/lib/parseCsv.ts
    - scripts/lib/parseXml.ts
    - scripts/lib/normalize.ts
    - scripts/lib/factionMap.ts
    - scripts/data/aliases.json
  modified:
    - scripts/build-unit-db.ts
    - scripts/update-unit-database.ts
    - .gitignore
decisions:
  - "SUB_FACTION_MAP covers 17 entries: 11 SM chapters, 4 CSM warbands, 2 Aeldari sub-factions"
  - "aliases.json starts empty; will be populated iteratively after Plan 02 coverage analysis"
  - "Added .gitignore exception for aliases.json since scripts/data/ is globally ignored"
metrics:
  duration: "7 minutes"
  completed: "2026-06-01T09:47:04Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 3
  lines_removed: 650
  lines_added: 508
---

# Phase 108 Plan 01: Shared Library Extraction & Build Determinism Summary

Extracted ~500 lines of duplicated parsing logic from two build scripts into five shared modules under scripts/lib/, added sorted file reads for deterministic output, and created the name normalization + alias table foundation for multi-pass matching.

## Task Completion

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create scripts/lib/ shared modules and aliases.json | 83f0c47 | scripts/lib/*.ts, scripts/data/aliases.json |
| 2 | Refactor build-unit-db.ts and update-unit-database.ts to use shared lib | 49f9b5d | scripts/build-unit-db.ts, scripts/update-unit-database.ts |

## What Was Built

### Shared Library Modules (scripts/lib/)
- **types.ts** -- All shared TypeScript interfaces (PointsTier, BsdataUnitPoints, BsdataModelCount, Udb*Row, UnitDatabaseJson)
- **parseCsv.ts** -- parseWahapediaCsv() and readCsv() for pipe-delimited Wahapedia CSV parsing
- **parseXml.ts** -- extractTiers(), parseCatXml(), extractModelCounts() for BSData XML parsing
- **normalize.ts** -- normalizeName() for smart quotes/special chars/whitespace handling, loadAliases() for JSON alias table loading
- **factionMap.ts** -- FACTION_MAP (38 entries) and SUB_FACTION_MAP (17 entries) constants

### Build Script Refactoring
- build-unit-db.ts: 767 -> 475 lines (-292 lines, -38%)
- update-unit-database.ts: 937 -> 652 lines (-285 lines, -30%)
- Both scripts now import from scripts/lib/ instead of inlining shared logic
- Both scripts apply .sort() on readdirSync results for deterministic output

### Determinism Verification
- Two consecutive builds produce byte-for-byte identical output (excluding built_at timestamp)
- File ordering is now alphabetical regardless of filesystem ordering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] .gitignore excluded aliases.json**
- **Found during:** Task 1
- **Issue:** scripts/data/ was globally gitignored, preventing aliases.json from being committed
- **Fix:** Added negation pattern `!scripts/data/aliases.json` to .gitignore; used `git add -f` for initial add
- **Files modified:** .gitignore

## Verification Results

- All 5 shared lib modules import successfully via `node --experimental-strip-types`
- normalizeName("Intercessor   Squad") returns "intercessor squad"
- loadAliases returns {} for both empty and missing files
- FACTION_MAP has 38 entries, SUB_FACTION_MAP has 17 entries
- build-unit-db.ts produces 1711 units, 25 factions, valid JSON output
- Two consecutive builds produce identical output (determinism confirmed)

## Self-Check: PASSED
