# Architecture Research

**Domain:** Tauri 2 desktop app — data integrity hardening, diagnostics, backup, and UX improvements for existing Warhammer hobby management app
**Researched:** 2026-05-14
**Confidence:** HIGH (codebase directly inspected)

---

## Existing Architecture (Baseline)

```
UI components  (src/features/**/*)
      ↓
React Query hooks  (src/hooks/use*.ts)
      ↓
Query modules  (src/db/queries/*.ts)
      ↓
DB client singleton  (src/db/client.ts)
      ↓
tauri-plugin-sql → SQLite (hobbyforge.db)

Pure functions  (src/lib/*.ts)
      ↑↓  (called from hooks/components; no DB/React deps)

Rust backend  (src-tauri/src/lib.rs)
      → bulk_sync_rules Tauri command → SQLite (rules.db via sqlx)
```

Key invariants to preserve:
- `src/db/queries/*.ts` are the only callers of `getDb()` / `getRulesDb()`
- Components never call query functions directly — hooks only (RecipeFormSheet is a narrow, accepted exception for write orchestration)
- Pure functions in `src/lib/` have no React or DB dependencies
- Cache invalidation symmetry rule: if `useCreate` invalidates key K, `useDelete` must also invalidate K
- Tauri plugin-sql uses `$1, $2` positional syntax; no TypeScript-accessible transaction rollback; no ATTACH DATABASE

---

## v0.2.13 Feature Integration Map

### 1. Transactional Recipe Graph Save

**Current state:** Five-phase diff logic lives entirely inside `RecipeFormSheet.tsx::onSubmit()`. Each section/step operation is an individual `await db.execute(...)` call at the component level with no wrapping transaction. Failure mid-save leaves the recipe in a partial state (e.g. some sections deleted, new ones not yet inserted).

**Integration approach:** Move the entire diff execution into a new query function `saveRecipeGraph(recipeId, sections, existingSteps, existingSections)` in `src/db/queries/recipes.ts`. The function wraps all five phases in a single `BEGIN TRANSACTION / COMMIT / ROLLBACK`. `RecipeFormSheet` calls this one function instead of orchestrating the sequential await chain.

**Transaction pattern already proven in the codebase:** `duplicateRecipe`, `bulkCreateAssignments`, and `replaceSyncedUnitPoints` all use the `await db.execute("BEGIN TRANSACTION", [])` pattern — no new API surface required.

**What changes:**
- `src/db/queries/recipes.ts` — add `saveRecipeGraph(recipeId, draftSections, existingSteps, existingSections)` (new export)
- `src/features/recipes/RecipeFormSheet.tsx` — `onSubmit` builds `DraftSection[]` (unchanged), then calls `saveRecipeGraph()`, then fires React Query invalidation on success
- `src/db/queries/recipeSections.ts` and `src/db/queries/recipePaints.ts` — no change; `saveRecipeGraph` imports from them internally

**Data flow:**
```
RecipeFormSheet.onSubmit
    → build DraftSection[] from form state (unchanged)
    → saveRecipeGraph(recipeId, sections, existingSteps, existingSections)
        BEGIN TRANSACTION
          phase 1: updateRecipe metadata
          phase 2: deleteRecipeSection for removed sections (CASCADE removes steps)
          phase 3: updateRecipeSection for existing sections
          phase 4: createRecipeSection for new sections (build sectionIdMap)
          phase 5: delete/update/insert steps with mapped section_id
        COMMIT on success / ROLLBACK on any error (rethrows)
    → invalidate RECIPE_PAINTS_KEY, RECIPE_SECTIONS_KEY, etc. (unchanged)
```

---

### 2. Centralized Points Resolver

**Current state:** The 5-level COALESCE chain is duplicated in three SQL query sites:
- `armyLists.ts::getArmyListWithUnits` — per-unit effective_points
- `armyLists.ts::getArmyListReadiness` — SUM for readiness aggregate
- `dashboard.ts::getArmyReadinessByFaction` — uses `u.points` only (simplified, no synced/override chain)

The chain is: `COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)` where `sup` is `synced_unit_points` and `uo` is `unit_overrides`.

**Integration approach:** Two components — a SQL snippet constant for aggregate queries + a TypeScript pure function for per-unit display with source labeling.

**A. SQL constant** in `src/db/queries/_pointsHelper.ts` (new, underscore = internal module):
```typescript
export const EFFECTIVE_POINTS_EXPR =
  `COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)`;
export const POINTS_JOINS = `
  LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
  LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
    AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))`;
```

Aggregate queries (`getArmyListReadiness`, `getArmyReadinessByFaction`) import and interpolate the constant — single source of truth, no behavior change.

**B. TypeScript resolver** in `src/lib/resolveUnitPoints.ts` (new pure function):
```typescript
export type PointsSource = "list_override" | "synced" | "unit_override" | "unit" | "unknown";
export interface ResolvedPoints { points: number; source: PointsSource; synced_at: string | null; }
export function resolveUnitPoints(row: {
  points_override: number | null;
  sup_points: number | null;
  sup_synced_at: string | null;
  uo_points: number | null;
  u_points: number | null;
}): ResolvedPoints { ... }
```

**What changes:**
- New: `src/db/queries/_pointsHelper.ts`, `src/lib/resolveUnitPoints.ts`
- Modified: `src/db/queries/armyLists.ts` — `getArmyListWithUnits` SELECTs `sup.points AS sup_points`, `uo.points AS uo_points`, `sup.synced_at AS sup_synced_at` in addition to the computed `effective_points` (backward compatible — existing callers still read `effective_points`)
- Modified: `src/features/army-lists/ArmyListSheet.tsx` — per-unit row passes extra columns to `resolveUnitPoints()` to drive freshness/source badge
- No change to aggregate queries beyond importing the SQL constant

---

### 3. Unit-to-Rules Mapping Layer

**Current state:** Units have a `datasheet_id` TEXT column (migration 007) holding a denormalized copy of `rw_datasheets.id`. This was established for the DatasheetImportDialog auto-populate flow. No explicit "this unit is confirmed as datasheet X" table exists. The mapping is implicit and unconfirmable.

**Integration approach:** New table + new query module + new UI section. Follows the established denormalized-name pattern.

**New migration (`026_unit_rules_mapping.sql`):**
```sql
CREATE TABLE IF NOT EXISTS unit_rules_mappings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id         INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    datasheet_id    TEXT NOT NULL,   -- copy of rw_datasheets.id (rules.db, destroyed on sync)
    datasheet_name  TEXT NOT NULL,   -- copy of rw_datasheets.name for display after sync wipe
    confirmed_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(unit_id)                  -- one confirmed mapping per unit
);
```

Denormalization rationale: `rw_datasheets` lives in rules.db which is destroyed on re-sync. This follows `detachment_name` on `army_lists`, `weapon_name` on `unit_loadout_wargear`, `section_name` on `painting_sessions`.

**New files:**
- `src-tauri/migrations/026_unit_rules_mapping.sql`
- `src/db/queries/unitRulesMapping.ts` — `getMappingByUnit(unitId)`, `upsertMapping(unitId, datasheetId, datasheetName)`, `deleteMapping(unitId)`
- `src/hooks/useUnitRulesMapping.ts` — React Query key `["unit-rules-mapping", unitId]`; exports `useUnitRulesMapping(unitId)`, `useSetMapping()`, `useDeleteMapping()`

**Modified files:**
- `src/features/units/UnitDetailSheet.tsx` — add Rules Link section (or tab) showing current mapping + DatasheetPicker for change/confirm; `useUnitRulesMapping(unit.id)` drives the display
- `src/features/units/DatasheetImportDialog.tsx` — on successful import, call `upsertMapping()` to auto-confirm the link (user just chose the datasheet; intent is clear)
- `src-tauri/src/lib.rs` — register migration 026

**Data flow:**
```
UnitDetailSheet (Rules section)
    → useUnitRulesMapping(unitId) → getMappingByUnit
    → unlinked: shows DatasheetPicker + "Confirm" button
    → linked: shows datasheet_name, "Change" (re-opens picker), "Clear" button
    → on confirm: upsertMapping() → invalidate ["unit-rules-mapping", unitId]
    → on clear: deleteMapping() → invalidate

DatasheetImportDialog (on success)
    → upsertMapping(unitId, datasheetId, datasheetName)
    → invalidate ["unit-rules-mapping", unitId]
```

---

### 4. Data Health Page

**Current state:** No diagnostics UI. Schema version is readable via `SELECT max(version) FROM __tauri_plugin_sql_migrations` (tauri-plugin-sql internal table, confirmed accessible via getDb()). Orphan detection requires hand-crafted queries. Sync status is already aggregated in `useRulesSyncMeta` (rules.db hook). Data counts are scattered across feature hooks.

**Integration approach:** New page + new query module. All queries are read-only SELECTs. No schema changes needed.

**New files:**
- `src/db/queries/dataHealth.ts` — diagnostic read queries:
  - `getSchemaVersion()` — `SELECT max(version) FROM __tauri_plugin_sql_migrations`
  - `getOrphanCounts()` — returns `{ orphanedSteps, orphanedSessions, brokenAssignments }` via three COUNT queries in Promise.all; orphaned = FK target missing (defends against future migration gaps)
  - `getTableRowCounts()` — single query returning per-table counts for the 8 main tables (units, factions, recipes, paints, army_lists, battle_logs, painting_sessions, recipe_steps)
  - `getPointsFreshness()` — reads `synced_at` from `synced_unit_points` to derive stale/fresh/never
- `src/hooks/useDataHealth.ts` — React Query key `["data-health"]`, `staleTime: 0` (always re-fetches on navigate so results are live)
- `src/features/data-health/DataHealthPage.tsx` — new page, expandable sections: Schema Version / Collection Health / Recipe Integrity / Rules Sync Status

**Modified files:**
- `src/app/router.tsx` — add `/data-health` route
- Sidebar navigation — add entry under Management group

**Data flow:**
```
DataHealthPage
    → useDataHealth() runs parallel Promise.all([
        getSchemaVersion(),
        getOrphanCounts(),
        getTableRowCounts(),
        getPointsFreshness(),
        getRulesSyncMeta()         // existing hook, reused
      ])
    → renders 4 sections with status badges (OK / Warning / Error)
    → each section expandable to show raw counts and fix guidance
```

**No new Rust command.** All queries run via the existing `getDb()` tauri-plugin-sql connection. The `__tauri_plugin_sql_migrations` table is a standard internal table accessible from the same DB connection.

---

### 5. Backup / Export / Restore

**Current state:** `hobbyforge.db` lives at `%APPDATA%\com.hobbyforge.app\hobbyforge.db`. `tauri-plugin-fs` and `tauri-plugin-dialog` are both already registered in `lib.rs`. `tauri-plugin-process` is already registered (used by auto-update). No backup logic exists — noted as "deferred" in PROJECT.md Out of Scope.

**Integration approach:** New Rust command for atomic file copy + TypeScript UI orchestration. SQL dump is rejected — fragile against schema changes, requires DDL reconstruction, no benefit over binary copy for a local-only app.

**New Rust command:**
```rust
#[tauri::command]
async fn backup_database(app: tauri::AppHandle, dest_path: String) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let src = app_data_dir.join("hobbyforge.db");
    std::fs::copy(&src, &dest_path)
        .map_err(|e| format!("copy failed: {e}"))?;
    Ok(())
}
```

rules.db is excluded from backup by default — reconstructable from re-sync. A separate `backup_rules_database` command can be added if needed, but is not required for v0.2.13.

**Restore:** User selects a `.db` file → TypeScript copies it to `appDataDir/hobbyforge.db` using `tauri-plugin-fs` (already has write permission) → calls `relaunch()` via `tauri-plugin-process`. The DB is only read at startup so replacing the file before relaunch is safe.

**New files:**
- `src/db/queries/backup.ts` — thin `invoke` wrapper: `backupDatabase(destPath: string)`, `restoreDatabase(srcPath: string)` (restore uses fs.copyFile from TypeScript side)
- `src/features/settings/BackupSection.tsx` — "Backup Now" button (opens save dialog, calls backupDatabase), "Restore" button (opens open dialog, confirm destructive warning, copies file, calls relaunch), last backup timestamp from localStorage

**Modified files:**
- `src-tauri/src/lib.rs` — add `backup_database` command to `invoke_handler!`, no new plugins needed
- `src/app/router.tsx` — add `/settings` route (or embed `BackupSection` in `DataHealthPage` if a full settings page is out of scope)

**Data flow:**
```
BackupSection
    → "Backup" → openDialog(save, .db filter)
    → backupDatabase(destPath) [Rust: std::fs::copy]
    → toast("Backup saved") + set lastBackupAt in localStorage

BackupSection
    → "Restore" → openDialog(open, .db filter)
    → confirm dialog ("This will replace all data. Restart required.")
    → fs.copyFile(srcPath, appDataDir/hobbyforge.db)  [TypeScript fs plugin]
    → relaunch()
```

---

### 6. Dashboard Command Center (Next-Action Aggregation)

**Current state:** `DashboardPage` fetches units, factions, army readiness, recent activity, photos, workflow positions, and applied recipe progress for the active-project unit. `CurrentFocusCard` shows one unit's applied recipe progress. No cross-unit "what to do next" signal exists — the user must mentally aggregate across Kanban + army lists + recipes.

**Integration approach:** New pure function + one new query, no new tables. Builds on existing data already in the query layer.

**New query in `src/db/queries/dashboard.ts`** — `getAppliedProgressSummary()`:
```sql
SELECT
  ura.unit_id,
  u.name AS unit_name,
  pr.name AS recipe_name,
  COUNT(rs.id) AS total_steps,
  SUM(CASE WHEN COALESCE(p.completed, 0) = 1 THEN 1 ELSE 0 END) AS completed_steps
FROM unit_recipe_assignments ura
JOIN painting_recipes pr ON pr.id = ura.recipe_id
JOIN units u ON u.id = ura.unit_id
JOIN recipe_steps rs ON rs.recipe_id = ura.recipe_id
LEFT JOIN unit_recipe_step_progress p
  ON p.assignment_id = ura.id AND p.order_index = rs.order_index
GROUP BY ura.id, ura.unit_id, u.name, pr.name
HAVING completed_steps < total_steps   -- only incomplete assignments
ORDER BY completed_steps DESC           -- most progress first (near-completion)
```

**New pure function `src/lib/computeNextActions.ts`:**
```typescript
export type NextActionType = "finish_recipe" | "army_near_ready" | "sync_stale" | "log_overdue";
export interface NextAction { type: NextActionType; priority: number; label: string; unitId?: number; listId?: number; }
export function computeNextActions(data: { ... }): NextAction[]
```

**New UI component `src/features/dashboard/NextActionsPanel.tsx`** — renders top 3-5 prioritized actions as interactive cards with primary CTA buttons (e.g. "Open Unit", "View List", "Sync Rules").

**Modified files:**
- `src/hooks/useDashboardStats.ts` — add `useAppliedProgressSummary()` hook with key `["applied-progress-summary"]`
- `src/features/dashboard/DashboardPage.tsx` — calls `useAppliedProgressSummary`, passes result through `computeNextActions`, renders `NextActionsPanel`

**Data flow:**
```
DashboardPage
    → existing hooks (unchanged)
    → useAppliedProgressSummary() → getAppliedProgressSummary()
    → computeNextActions({ units, progressSummary, armyReadiness, syncFreshness, lastSessionDate })
    → NextActionsPanel renders top actions with CTA buttons
```

---

### 7. Game Day After-Action Loop

**Current state:** `gameDayStore` (Zustand + localStorage persist) holds `cp`, `prevCp`, `startingCp`, `checklistItems`, `usedAbilities` per list ID. All state is ephemeral — no game record is created. Battle log exists but is disconnected from Game Day. The user must manually create a battle log entry after a game.

**Integration approach:** Extend `battle_logs` table via new migration + new sheet component. No new table needed — all game day data fits in new nullable columns on `battle_logs`.

**New migration (`027_battle_log_game_day.sql`):**
```sql
ALTER TABLE battle_logs ADD COLUMN army_list_id     INTEGER REFERENCES army_lists(id) ON DELETE SET NULL;
ALTER TABLE battle_logs ADD COLUMN starting_cp      INTEGER;
ALTER TABLE battle_logs ADD COLUMN ending_cp        INTEGER;
ALTER TABLE battle_logs ADD COLUMN stratagems_used  TEXT;   -- JSON array of stratagem names
ALTER TABLE battle_logs ADD COLUMN game_notes       TEXT;   -- post-game reflections
```

`army_list_id` links the game day session to a specific list — the key connection. All columns nullable for backward compatibility with existing battle log rows and manual entry flow.

**New files:**
- `src-tauri/migrations/027_battle_log_game_day.sql`
- `src/features/game-day/AfterActionSheet.tsx` — form pre-filled from gameDayStore; captures result, opponent faction, game_notes; submits via `useCreateBattleLog`

**Modified files:**
- `src/db/queries/battleLogs.ts` — extend `CreateBattleLogInput` to accept `army_list_id`, `starting_cp`, `ending_cp`, `stratagems_used`, `game_notes`; extend `createBattleLog` INSERT
- `src/hooks/useBattleLogs.ts` — extend `useCreateBattleLog` mutation input type (additive, all new fields optional)
- `src/features/game-day/GameDayHeader.tsx` — add "End Game" button that opens `AfterActionSheet`; passes gameDayStore values as props
- `src/features/game-day/gameDayStore.ts` — add `resetGameDay(listId)` action to clear CP/checklist after recording
- `src-tauri/src/lib.rs` — register migration 027

**Data flow:**
```
GameDayHeader
    → "End Game" button clicked
    → AfterActionSheet opens, pre-filled with:
        starting_cp: listState.startingCp
        ending_cp: listState.cp
        stratagems_used: JSON.stringify(listState.usedAbilities)
        army_list_id: listId (from route param)
    → user fills: result (Win/Loss/Draw), opponent_faction, game_notes
    → submit → createBattleLog({ ..., all game_day fields })
    → toast("Game recorded") → resetGameDay(listId) → navigate("/battle-log")
```

---

## Suggested Build Order

```
Phase 1 — Schema Foundation (unblocks all)
  026_unit_rules_mapping.sql
  027_battle_log_game_day.sql
  lib.rs: register migrations 26-27
  Update migration parity test to cover 26, 27

Phase 2 — Transactional Recipe Graph Save (self-contained refactor, high correctness value)
  recipes.ts: saveRecipeGraph() with BEGIN/COMMIT/ROLLBACK
  RecipeFormSheet.tsx: call saveRecipeGraph() instead of sequential awaits
  Add/extend test: saveRecipeGraph round-trip, atomic failure case

Phase 3 — Points Resolver + Unit Rules Mapping (same data domain, ship together)
  _pointsHelper.ts: SQL constant
  resolveUnitPoints.ts: TypeScript pure function
  armyLists.ts: getArmyListWithUnits adds sup_points, uo_points columns
  ArmyListSheet.tsx: per-unit freshness label
  unitRulesMapping.ts + useUnitRulesMapping.ts: mapping CRUD
  UnitDetailSheet.tsx: Rules Link section
  DatasheetImportDialog.tsx: auto-create mapping on import

Phase 4 — Data Health Page (all reads, no schema changes)
  dataHealth.ts: orphan/version/count queries
  useDataHealth.ts: React Query wrapper
  DataHealthPage.tsx: diagnostics UI
  router.tsx + sidebar: new route

Phase 5 — Backup / Export / Restore (Rust command, requires Tauri rebuild)
  backup_database Rust command in lib.rs
  backup.ts: invoke wrapper
  BackupSection.tsx: backup + restore UI
  router.tsx: /settings route (or embed in DataHealthPage)

Phase 6 — Dashboard Next-Action + Game Day After-Action (builds on Phases 1-5)
  getAppliedProgressSummary() query
  useAppliedProgressSummary() hook
  computeNextActions.ts: pure function
  NextActionsPanel.tsx: dashboard UI
  DashboardPage.tsx: wire in next-actions
  AfterActionSheet.tsx: end-of-game form
  GameDayHeader.tsx: "End Game" button
  gameDayStore.ts: resetGameDay()
  battleLogs.ts + useBattleLogs.ts: accept game_day columns
```

**Ordering rationale:**
- Phase 1 first: both migrations must be registered before any code that reads those columns is deployed; doing migrations early means no Tauri rebuild mid-feature
- Phase 2 before Phase 6: `saveRecipeGraph` must be proven stable before the dashboard reads recipe assignment progress (trust in the write path)
- Phase 5 last-ish: requires Tauri rebuild; cleanest to batch it with no unrelated Tauri changes pending
- Phase 6 last: depends on Phase 1 (migration 027 for after-action) and benefits from Phase 2 write integrity

---

## Component Boundaries for New Work

| New Component | Layer | Responsibility |
|---------------|-------|---------------|
| `saveRecipeGraph()` | `src/db/queries/recipes.ts` | Atomic multi-table recipe persistence — single call site for all section+step writes |
| `_pointsHelper.ts` | `src/db/queries/` | SQL constant for COALESCE chain — shared by query files only |
| `resolveUnitPoints()` | `src/lib/` | TypeScript-side points resolution with source metadata — pure function |
| `computeNextActions()` | `src/lib/` | Pure aggregation of next-action signals from existing data shapes |
| `dataHealth.ts` | `src/db/queries/` | All diagnostic read queries — schema version, orphan counts, table row counts |
| `unitRulesMapping.ts` | `src/db/queries/` | CRUD for unit-to-datasheet confirmation mapping |
| `useDataHealth.ts` | `src/hooks/` | React Query wrapper, staleTime: 0 |
| `useUnitRulesMapping.ts` | `src/hooks/` | React Query wrapper for mapping CRUD |
| `backup.ts` | `src/db/queries/` | Thin invoke wrapper for backup_database Rust command |
| `DataHealthPage.tsx` | `src/features/data-health/` | Read-only diagnostics UI |
| `AfterActionSheet.tsx` | `src/features/game-day/` | End-of-game capture form, pre-fills from gameDayStore |
| `NextActionsPanel.tsx` | `src/features/dashboard/` | Next-action rendering with CTA buttons |
| `BackupSection.tsx` | `src/features/settings/` | Backup/restore UI |
| `backup_database` (Rust) | `src-tauri/src/lib.rs` | OS-level file copy to user-chosen path |

---

## Architectural Patterns Reused

**Denormalized text copy for cross-DB references** — `unit_rules_mappings.datasheet_name` follows `detachment_name` on `army_lists`, `weapon_name` on `unit_loadout_wargear`, `section_name` on `painting_sessions`. rules.db destroyed on re-sync; display names must be copied to hobbyforge.db at link time.

**Pure functions in src/lib/** — `resolveUnitPoints` and `computeNextActions` follow `computeWorkflowPosition`, `computeUnitWarnings`, `computeAssignmentProgress`. No React, no DB, unit-testable in isolation.

**BEGIN/COMMIT/ROLLBACK via db.execute string** — used in `duplicateRecipe`, `bulkCreateAssignments`, `replaceSyncedUnitPoints`. `saveRecipeGraph` follows exactly this pattern.

**Parallel Promise.all in query modules** — used in `getDashboardStats`, `getRecentActivity`. `useDataHealth` wraps multiple diagnostic SELECTs in `Promise.all` for minimal load time.

**staleTime: 0 for live-state data** — `useDataHealth` re-fetches on every navigate; mirrors the pattern justified for sync status hooks.

**Page-level hook aggregation, prop-drilled to panels** — `DashboardPage` calls all hooks once, props drill to `NextActionsPanel`. Prevents N+1 hook instances.

---

## Anti-Patterns to Avoid

**Five-phase diff as UI layer orchestration without a transaction.**
Current: `RecipeFormSheet.onSubmit` calls individual query functions sequentially. Partial failure corrupts recipe state. Fix: `saveRecipeGraph()` in query layer — one transaction, one call site.

**COALESCE chain duplicated across query files.**
Current: Three SQL strings in `armyLists.ts` and `dashboard.ts` contain the same 5-level COALESCE expression. Fix: SQL constant in `_pointsHelper.ts`; aggregate queries import and interpolate.

**Game Day state never persisting to battle log.**
Current: CP delta, stratagems used, OPG toggles live only in localStorage. No game record created automatically. Fix: `AfterActionSheet` pre-fills from gameDayStore and writes to `battle_logs` on submit.

**Backup via SQL dump.**
Why rejected: Requires iterating all tables and reconstructing DDL. Fragile against schema changes. No benefit over binary copy for a local-only single-file SQLite app. Fix: `std::fs::copy` in Rust — atomic, exact, format-stable.

**Calling query functions from React components.**
The existing narrow exception (RecipeFormSheet write orchestration) is acceptable. Do not expand this pattern to new features — new features use hooks.

---

## New vs Modified: Complete File List

| File | Status | Change |
|------|--------|--------|
| `src/db/queries/recipes.ts` | Modified | Add `saveRecipeGraph()` |
| `src/features/recipes/RecipeFormSheet.tsx` | Modified | `onSubmit` calls `saveRecipeGraph()` instead of sequential awaits |
| `src/db/queries/_pointsHelper.ts` | New | SQL COALESCE constant + joins snippet |
| `src/lib/resolveUnitPoints.ts` | New | Pure TypeScript points resolver with source metadata |
| `src/db/queries/armyLists.ts` | Modified | `getArmyListWithUnits` adds `sup_points`, `uo_points`, `sup_synced_at` SELECTs |
| `src/features/army-lists/ArmyListSheet.tsx` | Modified | Per-unit freshness/source label via `resolveUnitPoints` |
| `src-tauri/migrations/026_unit_rules_mapping.sql` | New | Unit-to-datasheet confirmation mapping table |
| `src/db/queries/unitRulesMapping.ts` | New | Mapping CRUD |
| `src/hooks/useUnitRulesMapping.ts` | New | React Query wrapper |
| `src/features/units/UnitDetailSheet.tsx` | Modified | Rules Link section showing current mapping + picker |
| `src/features/units/DatasheetImportDialog.tsx` | Modified | Auto-create mapping row on successful import |
| `src/db/queries/dataHealth.ts` | New | Orphan counts, schema version, table row counts, points freshness |
| `src/hooks/useDataHealth.ts` | New | React Query wrapper, staleTime: 0 |
| `src/features/data-health/DataHealthPage.tsx` | New | Diagnostics page |
| `src/app/router.tsx` | Modified | Add `/data-health` and `/settings` routes |
| `src/db/queries/backup.ts` | New | Thin invoke wrapper for backup_database Rust command |
| `src/features/settings/BackupSection.tsx` | New | Backup/restore UI with dialog integration |
| `src-tauri/migrations/027_battle_log_game_day.sql` | New | Extend battle_logs with game_day columns (all nullable) |
| `src/db/queries/battleLogs.ts` | Modified | Accept `army_list_id`, `starting_cp`, `ending_cp`, `stratagems_used`, `game_notes` |
| `src/hooks/useBattleLogs.ts` | Modified | Extend `useCreateBattleLog` mutation input type (additive) |
| `src/features/game-day/AfterActionSheet.tsx` | New | End-of-game capture form |
| `src/features/game-day/GameDayHeader.tsx` | Modified | Add "End Game" button |
| `src/features/game-day/gameDayStore.ts` | Modified | Add `resetGameDay(listId)` action |
| `src/lib/computeNextActions.ts` | New | Pure next-action aggregation |
| `src/features/dashboard/NextActionsPanel.tsx` | New | Next-action display with CTA buttons |
| `src/features/dashboard/DashboardPage.tsx` | Modified | Add next-action data fetch and panel |
| `src-tauri/src/lib.rs` | Modified | Register migrations 026-027, add `backup_database` to invoke_handler |

**Unchanged (verified):**
- `src/db/client.ts` — singleton + FK pragma pattern is correct and stable
- `src/db/queries/recipeSections.ts` — no changes required for v0.2.13 scope (REC-03 was fixed in v0.2.11)
- `src/features/game-day/gameDayStore.ts` read selectors — additive only (new `resetGameDay` action)
- All rules.db query files — read-only for this milestone
- `unit_recipe_step_progress` keying on `order_index` — deliberate design from migration 021; not changed by v0.2.13 work

---

## Sources

- Direct inspection: `src-tauri/src/lib.rs` — migration list (versions 1-25), `bulk_sync_rules` Rust command structure
- Direct inspection: `src/db/queries/recipes.ts` — `duplicateRecipe` transaction pattern; `createRecipe`, `updateRecipe`
- Direct inspection: `src/db/queries/armyLists.ts` — 5-level COALESCE at lines 63, 229; `getArmyListWithUnits` JOIN structure
- Direct inspection: `src/db/queries/recipeAssignments.ts` — `unit_recipe_step_progress` keying on `order_index`
- Direct inspection: `src/db/queries/syncedUnitPoints.ts` — `replaceSyncedUnitPoints` transaction pattern
- Direct inspection: `src/features/recipes/RecipeFormSheet.tsx` — five-phase diff orchestration in `onSubmit` (lines 237-332)
- Direct inspection: `src/features/game-day/gameDayStore.ts` — Zustand persist structure, listStates shape
- Direct inspection: `src/lib/computeUnitWarnings.ts` — pure function pattern for domain computations
- Direct inspection: `src-tauri/migrations/021_applied_recipe_assignments.sql` — composite key design rationale
- Confidence: HIGH — all findings from direct code analysis of v0.2.12 codebase

---

*Architecture research for: HobbyForge v0.2.13 Data Integrity, Diagnostics & Product Coherence*
*Researched: 2026-05-14*
