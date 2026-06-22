---
phase: 144-live-link-re-sync
plan: "01"
subsystem: data-layer
tags: [sqlite, resync, tdd, migration, fnd-03, link-01]
dependency_graph:
  requires: [141-01, 141-02, 143-01]
  provides: [LINK-01-engine, migration-052, resyncTechniqueInstances, getNonDetachedInstanceCount]
  affects: [recipe_sections, recipe_steps, unit_recipe_step_progress]
tech_stack:
  added: []
  patterns: [single-db-handle-no-begin, update-by-pk-fnd03, instance-wide-step-lookup-pitfall5]
key_files:
  created:
    - src-tauri/migrations/052_technique_resync.sql
    - src/db/queries/recipeTechniqueResync.ts
    - tests/data-layer/technique-resync.test.ts
  modified:
    - src-tauri/src/lib.rs
decisions:
  - "Orphan removal strategy: technique_steps ON DELETE SET NULL leaves recipe_steps.technique_step_id=NULL; resync deletes these NULL rows in instance sections (not per technique_step_id which is already gone)"
  - "Instance-wide step lookup (Pitfall 5): query all recipe_steps for instance across all sections keyed by technique_step_id to handle cross-section moves via UPDATE not DELETE+INSERT"
  - "Unused syncInstance param renamed _techniqueId to satisfy noUnusedParameters strict TS"
metrics:
  duration_minutes: 21
  completed_date: "2026-06-22T15:44:33Z"
  tasks_completed: 3
  files_created: 3
  files_modified: 1
---

# Phase 144 Plan 01: Live-Link Resync Engine Summary

**One-liner:** SQLite resync engine with migration 052 (technique_section_id FK + step index), 7-case data-layer test suite (reorder/add/remove/slot/multi-recipe/cross-section/teeth), and UPDATE-by-PK survivor semantics preserving unit_recipe_step_progress integrity.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Migration 052 — technique_section_id + resync index + lib.rs | 2438a54c | 052_technique_resync.sql, lib.rs |
| 2 | RED — technique-resync test scaffold (7 LINK-01 cases) | 204c2ddc | tests/data-layer/technique-resync.test.ts |
| 3 | GREEN — resyncTechniqueInstances + getNonDetachedInstanceCount | 0697f13e | src/db/queries/recipeTechniqueResync.ts, test (bridge cast fix) |

## Verification

- `pnpm check:version`: `[version] OK`, `[migration-count] OK: 52 .sql files === 52 Migration{} entries`, `[cr-byte] OK`
- `pnpm test -- tests/data-layer/technique-resync.test.ts`: 7/7 GREEN
- `pnpm test -- tests/data-layer/technique-progress-identity.test.ts`: 6/6 GREEN (FND-03 non-regression)
- `pnpm build`: TypeScript check + Vite build clean

## Key Design Decisions

### Orphan removal strategy (removed technique steps)

When `saveTechniqueGraph` deletes a `technique_steps` row, SQLite fires `ON DELETE SET NULL` on `recipe_steps.technique_step_id`. By the time `resyncTechniqueInstances` runs, those recipe_steps rows have `technique_step_id = NULL` — there is no ID to look up. The resync deletes recipe_steps rows in technique-instance-owned sections (via `INNER JOIN recipe_sections sec ON rs.section_id = sec.id WHERE sec.technique_instance_id = $1`) where `technique_step_id IS NULL`. The `ON DELETE CASCADE` on `unit_recipe_step_progress.recipe_step_id` then fires automatically (Pitfall 7 two-step path).

### Instance-wide step lookup (Pitfall 5 — cross-section move)

Rather than querying recipe_steps per section, the resync queries ALL recipe_steps for the entire instance and keys them by `technique_step_id`. This ensures a technique_step moved from section A to section B is matched and UPDATEd (section_id + order_index) rather than DELETE+INSERTed — which would lose the `unit_recipe_step_progress` row (FND-03).

### Single db handle contract

`resyncTechniqueInstances(db, techniqueId)` receives the db handle from the caller and never calls `getDb()` internally. `getNonDetachedInstanceCount(techniqueId)` is standalone and MAY call `getDb()` since it is not embedded in `saveTechniqueGraph`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused `techniqueId` parameter in `syncInstance`**
- **Found during:** Task 3 — `pnpm build` strict TS (`noUnusedParameters`)
- **Issue:** `syncInstance` signature included `techniqueId: number` but the inner function uses the pre-fetched data (passed via other params); the raw ID was never used inside
- **Fix:** Renamed to `_techniqueId: number` (conventional TypeScript underscore-prefix for intentionally unused params)
- **Files modified:** `src/db/queries/recipeTechniqueResync.ts`
- **Commit:** 0697f13e

**2. [Rule 1 - Bug] Type mismatch in test: `bridge` typed as bridge literal, not `Database`**
- **Found during:** Task 3 — `pnpm build` TS error 2345
- **Issue:** `resyncTechniqueInstances` typed as `(db: DbHandle, ...)` where `DbHandle = Awaited<ReturnType<typeof getDb>>` = the full Tauri `Database` type. The test bridge only implements `{ select, execute }`, which is missing `path` and `close`. Pattern: `apply-technique.test.ts` uses `createDbBridge(db) as never` for `mockResolvedValue`; resync test passes bridge directly to the function
- **Fix:** Added `as never` cast at all 5 call sites in the test: `resyncTechniqueInstances(bridge as never, techniqueId)`
- **Files modified:** `tests/data-layer/technique-resync.test.ts`
- **Commit:** 0697f13e

## Known Stubs

None — all exports are fully implemented and tested.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes beyond the planned `recipe_sections.technique_section_id` column (nullable FK, ON DELETE SET NULL — zero new trust boundary surface).

## Self-Check: PASSED

- `src-tauri/migrations/052_technique_resync.sql` — FOUND
- `src/db/queries/recipeTechniqueResync.ts` — FOUND
- `tests/data-layer/technique-resync.test.ts` — FOUND
- Commit 2438a54c — FOUND (migration + lib.rs)
- Commit 204c2ddc — FOUND (RED test scaffold)
- Commit 0697f13e — FOUND (GREEN implementation)
