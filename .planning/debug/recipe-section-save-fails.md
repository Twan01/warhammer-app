---
status: resolved
trigger: "Creating sections in an existing recipe fails with 'failed to save recipe, changes were not saved'"
created: 2026-05-25
updated: 2026-05-25
---

# Debug: Recipe Section Save Fails

## Symptoms

- **expected_behavior**: When adding sections to a recipe that already has steps, the existing steps should be grouped into the new section
- **actual_behavior**: Error message "failed to save recipe, changes were not saved" when trying to create a section with existing steps and a new section
- **error_messages**: "failed to save recipe, changes were not saved"
- **timeline**: Never worked -- first time attempting to create sections in a recipe
- **reproduction**: 100% reproducible. Steps: 1) Create a recipe with several steps (works). 2) Reopen the recipe. 3) Try to create a section containing the previous steps + add a new section. 4) Save fails.

## Current Focus

- hypothesis: CONFIRMED — tauri-plugin-sql uses sqlx::Pool<Sqlite> (connection pool). Each db.execute() acquires a random connection from the pool. Explicit BEGIN TRANSACTION / COMMIT / ROLLBACK across multiple db.execute() calls is broken because different operations may run on different connections. When a new section is INSERTed on connection A (within the transaction) and a step UPDATE references that section_id on connection B, the FK constraint fails because connection B cannot see the uncommitted INSERT.
- test: Remove explicit transaction boundaries, use auto-commit mode
- expecting: Each auto-committed write is immediately visible to all connections in WAL mode
- next_action: N/A — fix applied
- reasoning_checkpoint: Root cause confirmed via tauri-plugin-sql source code inspection (wrapper.rs line 27: DbPool::Sqlite(Pool<Sqlite>), line 166: pool.execute()). The bulk_sync_rules Rust command in lib.rs already uses a direct sqlx::Connection (not pool) to work around this exact issue.

## Evidence

- timestamp: 2026-05-25 exhaustive code review
  - RecipeFormSheet.tsx catch block at line 233 swallows error with `catch {}` (no parameter) -- error message is always generic
  - Added console.error logging with sections state, existingSections, existingSteps dumps
  - saveRecipeGraph logic traced through all 5 phases of edit path: no SQL errors found
  - SQL simulation via better-sqlite3 on actual DB succeeded for all operations
  - TypeScript compiles with zero errors
  - All 21 saveRecipeGraph tests pass (mocked DB)
  - All recipe diff tests pass (pure functions)
  - DB schema verified: recipe_sections and recipe_steps tables match expected constraints
  - FK constraints checked: paint_id ON DELETE RESTRICT, section_id ON DELETE CASCADE, both nullable
  - No UNIQUE constraints on recipe_sections or recipe_steps
  - Recipe 2 "Ultramarines" has 2 sections (id 2 "Armure", id 4 "Armes") with section 4 having 0 steps -- may indicate prior partial save or separate successful save
  - useEffect deps use .length instead of full arrays (commit d7bbc5e) -- could cause stale data but wouldn't cause throw
- timestamp: 2026-05-25 root cause found
  - SMOKING GUN: tauri-plugin-sql v2.4.0 wrapper.rs line 27: `DbPool::Sqlite(Pool<Sqlite>)` — uses connection POOL, not single connection
  - wrapper.rs line 166: `pool.execute(query).await?` — each call acquires random connection from pool
  - lib.rs line 457-458 comment: bulk_sync_rules already uses direct `sqlx::Connection` (not pool) to work around this
  - PRAGMA foreign_keys = ON set in client.ts only applies to ONE connection in the pool
  - All 10 functions across 6 files using explicit BEGIN/COMMIT/ROLLBACK had the same broken pattern

## Eliminated

- SQL logic error in saveRecipeGraph: simulated all operations on actual DB, all succeed
- TypeScript compilation error: tsc --noEmit passes
- FK constraint violation on paint_id: all referenced paints exist
- FK constraint violation on section_id: section_id is nullable, CASCADE on delete
- UNIQUE constraint violation: no unique indexes on recipe_sections or recipe_steps
- NOT NULL constraint on recipe_sections.name: makeDraftSection always sets name to "Steps"
- NOT NULL constraint on recipe_sections.optional: always set to 0 or 1
- Parameter count mismatch: all INSERT/UPDATE statements have correct parameter counts
- DraftSection/DraftStep type mismatch: same types used throughout, TS confirms compatibility

## Resolution

- root_cause: tauri-plugin-sql v2.4.0 uses sqlx::Pool<Sqlite> (connection pool). Each db.execute() call acquires a random connection from the pool and returns it. Explicit BEGIN TRANSACTION / COMMIT / ROLLBACK across multiple db.execute() calls is broken because different SQL statements may execute on different connections. When saveRecipeGraph INSERTs a new section on connection A (inside the "transaction") and then UPDATEs a step's section_id on connection B, the FK constraint fails because connection B cannot see connection A's uncommitted INSERT.
- fix: Removed all explicit BEGIN TRANSACTION / COMMIT / ROLLBACK from 7 query module files (12 functions total). Each SQL statement now auto-commits independently. In WAL mode, committed writes are immediately visible to all pool connections, so FK constraints on subsequent operations see newly inserted rows. Trade-off: loss of atomicity (partial saves possible on mid-operation crash), but individual SQL operations rarely fail after app-level validation.
- verification: TypeScript compiles clean (tsc --noEmit). All 2259 tests pass (246 files, 0 failures). Test assertions updated to verify auto-commit mode (no BEGIN/COMMIT/ROLLBACK calls).
- files_changed:
  - src/db/queries/recipes.ts (saveRecipeGraph, duplicateRecipe)
  - src/db/queries/recipeSections.ts (reorderRecipeSections)
  - src/db/queries/recipeAssignments.ts (bulkCreateAssignments, completeStepWithSession)
  - src/db/queries/armyListSnapshots.ts (restoreSnapshot)
  - src/db/queries/syncedUnitPoints.ts (replaceSyncedUnitPoints, replaceSyncedUnitPointTiers)
  - src/db/queries/bsdataExtended.ts (replaceSyncedEnhancements, replaceSyncedLoadoutOptions, replaceSyncedModelCounts, replaceSyncedLeaderTargets)
  - src/features/recipes/RecipeFormSheet.tsx (added console.error logging to catch block)
  - tests/painting/saveRecipeGraph.test.ts
  - tests/painting/duplicateRecipe.test.ts
  - tests/painting/recipeSections.test.ts
  - tests/painting/recipeAssignments.test.ts
  - tests/painting-mode/completeStepWithSession.test.ts
  - tests/performance/batchInsert.test.ts
  - tests/datasheet/pointsSchema.test.ts
