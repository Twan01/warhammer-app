---
phase: 105-collection-integration
plan: "01"
subsystem: data-layer
tags: [migration, types, queries, hooks, tests, collection, unit-database]
dependency_graph:
  requires: [103-01, 104-01]
  provides: [udb_unit_id FK column, wahapedia_faction_id bridge, ownership query, diagnostic query, invalidation cascade]
  affects: [units table, factions table, diagnostics, react-query cache]
tech_stack:
  added: []
  patterns: [nullable FK with ON DELETE SET NULL, GROUP_CONCAT for semantic status aggregation, staleTime 0 for dynamic ownership data]
key_files:
  created:
    - src-tauri/migrations/039_collection_udb_link.sql
    - tests/collection/udbCollectionLink.test.ts
    - tests/data-health/unlinkedUnitsDiagnostic.test.ts
  modified:
    - src-tauri/src/lib.rs
    - src/types/unit.ts
    - src/types/faction.ts
    - src/db/queries/units.ts
    - src/db/queries/unitDatabase.ts
    - src/db/queries/diagnostics.ts
    - src/hooks/useUnitDatabase.ts
    - src/hooks/useUnits.ts
    - src/features/units/UnitSheet.tsx
    - src/features/factions/FactionSheet.tsx
    - tests/data-layer/db-helpers.ts
    - "28 test fixture files (udb_unit_id: null / wahapedia_faction_id: null)"
decisions:
  - GROUP_CONCAT used instead of MIN for status aggregation (MIN is alphabetical on TEXT, not semantic)
  - staleTime 0 for useUdbOwnership (ownership is dynamic, unlike static UDB reference data)
  - udb_unit_id uses no COALESCE in updateUnit — NULL is valid (unlinked), callers must always provide
  - wahapedia_faction_id defaults to null on faction create (migration handles backfill)
metrics:
  duration: "~45 minutes"
  completed_date: "2026-05-30"
  tasks_completed: 4
  files_changed: 40
---

# Phase 105 Plan 01: Schema, Types, Query Layer, Hooks Summary

Schema migration, type extensions, query layer, React Query hooks, and test scaffolds for the collection-to-unit-database FK link. Establishes the data foundation consumed by Plan 02 UI components.

## Tasks Completed

| Task | Name | Commit | Key Outputs |
|------|------|--------|-------------|
| 0 | Test scaffolds (COL-02 through COL-06) | 909c160 | udbCollectionLink.test.ts, unlinkedUnitsDiagnostic.test.ts |
| 1 | Migration 039 + Rust registration | 901e250 | 039_collection_udb_link.sql, lib.rs migration 39 |
| 2 | Type extensions and query layer | 7516c0f | Unit/Faction types, createUnit/updateUnit, getUdbOwnershipByFaction, getUnlinkedUnitsCount |
| 3 | React Query hooks + invalidation cascade | d8674ca | useUdbOwnership (staleTime:0), UDB_OWNERSHIP_KEY, 3x invalidateQueries |

## What Was Built

**Migration 039** adds two ALTER TABLE statements (factions.wahapedia_faction_id, units.udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL), two best-effort backfill UPDATE statements using case-insensitive name matching, and an index on units.udb_unit_id.

**Type extensions** add `udb_unit_id: string | null` to Unit interface and `wahapedia_faction_id: string | null` to Faction interface. createUnit gains a 23rd positional param; updateUnit gains a 27th positional param without COALESCE (NULL = unlinked).

**Ownership query** `getUdbOwnershipByFaction(factionId)` uses GROUP_CONCAT(status_painting, '|') rather than MIN to aggregate painting statuses — MIN on TEXT is alphabetical (not semantic). Returns UdbOwnershipEntry[] with udb_unit_id, owned_count, and all_statuses.

**Diagnostic query** `getUnlinkedUnitsCount()` returns a warning-severity DiagnosticFlag when any units lack a udb_unit_id link. Integrated into getDiagnosticFlags() Promise.all.

**useUdbOwnership hook** uses staleTime: 0 (not Infinity like other UDB hooks) because ownership data changes on unit create/delete. Follows the disabled pattern from useUdbUnits.

**Cache invalidation** added to all three unit mutations (useCreateUnit, useUpdateUnit, useDeleteUnit) via invalidateQueries({ queryKey: ['udb-ownership'] }).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 28 test fixture files missing udb_unit_id / wahapedia_faction_id**
- **Found during:** Task 2 pnpm build run
- **Issue:** Adding required fields to Unit and Faction interfaces broke all test fixtures that constructed inline object literals without the new fields
- **Fix:** Added `udb_unit_id: null` and `wahapedia_faction_id: null` to all affected test fixtures across 28 test files
- **Files modified:** tests/army-list/UnitDeleteDialog, tests/army-lists/UnitPickerDialog, tests/collection/showcaseMode, tests/collection/unitFilters, tests/collection/UnitGallery, tests/collection/UnitTable, tests/dashboard/*, tests/enrichment/UnitDetailSheet.enrichment, tests/foundation/useUnits, tests/painting-mode/entryPoints, tests/painting/KanbanBoard, tests/painting/KanbanCard, tests/painting/RecipeCard, tests/painting/kanbanUtils, tests/painting/logSessionSheet, tests/spending/SpendingPage, tests/spending/computeSpendingStats, tests/theming/FactionSummaryCard, tests/theming/useActiveFaction, tests/units/UnitFormRequired, tests/units/UnitSheet.decomposition
- **Commit:** 7516c0f

**2. [Rule 1 - Bug] FactionSheet and UnitSheet not passing new fields**
- **Found during:** Task 2 pnpm build run
- **Issue:** FactionSheet.createFaction and UnitSheet.createUnit calls did not include wahapedia_faction_id and udb_unit_id respectively
- **Fix:** FactionSheet passes `wahapedia_faction_id: null` (migration handles backfill); UnitSheet passes `udb_unit_id: (unit as Unit).udb_unit_id ?? null` to preserve existing links
- **Commit:** 7516c0f

**3. [Rule 1 - Bug] Migration parity test failing after adding migration 039**
- **Found during:** Task 3 verification
- **Issue:** tests/data-layer/db-helpers.ts HOBBYFORGE_MIGRATIONS array did not include 039_collection_udb_link.sql, causing the lib.rs migration count check to fail
- **Fix:** Added "039_collection_udb_link.sql" to HOBBYFORGE_MIGRATIONS and updated count comment from 38 to 39
- **Commit:** d8674ca

## Known Stubs

None — all queries return real data from the database.

## Threat Flags

No new security-relevant surface introduced beyond what the plan's threat model covers. All query parameters use $N positional params (T-105-01 mitigated, T-105-02 mitigated).

## Test Status

- **getUdbOwnershipByFaction tests:** PASS (3/3)
- **PAINTING_STATUS_ORDER contract:** PASS (1/1)
- **getUnlinkedUnitsCount tests:** PASS (4/4)
- **resolveWorstStatus tests:** FAIL (3/3) — intentional RED, Plan 02 Task 1 implements these exports
- **resolveReadinessDotClass tests:** FAIL (6/6) — intentional RED, Plan 02 Task 1 implements these exports
- **migration-parity tests:** PASS (4/4)
- **pnpm build:** PASS — no TypeScript errors

## Self-Check: PASSED

- src-tauri/migrations/039_collection_udb_link.sql: FOUND
- src/types/unit.ts contains udb_unit_id: FOUND
- src/types/faction.ts contains wahapedia_faction_id: FOUND
- src/db/queries/unitDatabase.ts exports getUdbOwnershipByFaction: FOUND
- src/db/queries/diagnostics.ts exports getUnlinkedUnitsCount: FOUND
- src/hooks/useUnitDatabase.ts exports useUdbOwnership + UDB_OWNERSHIP_KEY: FOUND
- Commits 909c160, 901e250, 7516c0f, d8674ca: FOUND
