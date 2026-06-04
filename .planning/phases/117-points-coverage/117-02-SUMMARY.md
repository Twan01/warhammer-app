---
phase: 117-points-coverage
plan: 02
subsystem: build-pipeline
tags: [bsdata-removal, dependency-cleanup, coverage-threshold]
dependency_graph:
  requires: [117-01]
  provides: [clean-pipeline-no-bsdata]
  affects: [build-unit-db, update-unit-database, audit-faction, types, package.json]
tech_stack:
  added: []
  patterns: [wahapedia-only-pipeline]
key_files:
  created: []
  modified:
    - scripts/build-unit-db.ts
    - scripts/update-unit-database.ts
    - scripts/audit-faction.ts
    - scripts/lib/types.ts
    - package.json
    - pnpm-lock.yaml
  deleted:
    - scripts/lib/bsdata.ts
    - scripts/lib/parseXml.ts
    - scripts/lib/normalize.ts
    - scripts/data/aliases.json
    - tests/build-pipeline/normalize.test.ts
    - tests/build-pipeline/parseXml.test.ts
    - tests/build-pipeline/matchUnit.test.ts
decisions:
  - Removed CROSS_FACTION_MAP unused imports alongside BSData cleanup (dead code)
  - Removed BSData-specific test files that tested deleted modules
metrics:
  duration: ~12m
  completed: 2026-06-04
---

# Phase 117 Plan 02: BSData Removal & Coverage Threshold Summary

Complete BSData pipeline removal: deleted 4 library/data files, cleaned 3 scripts of all BSData imports/code, removed @xmldom/xmldom dependency, raised coverage threshold to 90%, simplified coverage report format.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove BSData files, clean libraries, remove dependency | 2d5e960 | scripts/lib/bsdata.ts (DEL), scripts/lib/parseXml.ts (DEL), scripts/lib/normalize.ts (DEL), scripts/data/aliases.json (DEL), scripts/lib/types.ts, package.json, pnpm-lock.yaml |
| 2 | Clean BSData imports and dead code from scripts, raise threshold | 4675a29 | scripts/build-unit-db.ts, scripts/update-unit-database.ts, scripts/audit-faction.ts, tests/build-pipeline/{normalize,parseXml,matchUnit}.test.ts (DEL) |

## Verification Results

- `grep -r "xmldom" scripts/ package.json` returns no results
- `grep -ri "bsdata" scripts/build-unit-db.ts scripts/update-unit-database.ts scripts/audit-faction.ts` returns no results
- `pnpm build` passes (TypeScript clean)
- `build-unit-db.ts` exits 0 with 99.8% coverage (1697/1701 units), well above 90% threshold
- `update-unit-database.ts` exits 0 with "No changes detected" (identical output)
- Coverage report outputs simplified columns: Faction, Units, WithPts, Coverage (no Exact/Norm/Alias)
- Sub-faction count: 372 units (preserved from Plan 01)
- MIN_COVERAGE_PCT raised from 58 to 90

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deleted BSData test files that prevented TypeScript compilation**
- **Found during:** Task 2 verification (`pnpm build`)
- **Issue:** `tests/build-pipeline/normalize.test.ts`, `parseXml.test.ts`, and `matchUnit.test.ts` imported from deleted modules (`scripts/lib/normalize.ts`, `scripts/lib/parseXml.ts`, `@xmldom/xmldom`), causing TS2307 errors
- **Fix:** Deleted all 3 test files (they tested only BSData-specific functionality that no longer exists)
- **Files deleted:** tests/build-pipeline/normalize.test.ts, tests/build-pipeline/parseXml.test.ts, tests/build-pipeline/matchUnit.test.ts
- **Commit:** 4675a29

**2. [Rule 2 - Dead code] Removed unused CROSS_FACTION_MAP imports**
- **Found during:** Task 2 import cleanup
- **Issue:** `CROSS_FACTION_MAP` was imported but never used in both build-unit-db.ts and update-unit-database.ts
- **Fix:** Removed from import statements in both files
- **Commit:** 4675a29

## Decisions Made

1. **BSData test files**: Deleted rather than refactored, since the modules they test (normalize.ts, parseXml.ts, matchUnit) no longer exist in the codebase
2. **CROSS_FACTION_MAP**: Removed unused import (was a BSData-era artifact for cross-faction catalogue matching)

## Known Stubs

None.

## Self-Check: PASSED
