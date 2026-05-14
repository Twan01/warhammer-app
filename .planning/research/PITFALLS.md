# Pitfalls Research

**Domain:** Data integrity hardening, diagnostics, backup, centralized resolvers, and UX improvements on existing Tauri 2 + SQLite desktop app (v0.2.13)
**Researched:** 2026-05-14
**Confidence:** HIGH (all findings grounded in direct inspection of `src/db/queries/*.ts`, `src-tauri/src/lib.rs`, `src-tauri/migrations/*.sql`, `src/features/army-lists/`, `src/lib/computeUnitWarnings.ts`, `src/features/game-day/gameDayStore.ts`, and `.planning/PROJECT.md` Key Decisions table)

---

## Critical Pitfalls

### 1. Data Migration: order_index Key Becomes Ambiguous After Step Reorder

**What goes wrong:**
`unit_recipe_step_progress` uses `(assignment_id, order_index)` as its composite unique key — not `recipe_step_id`. When the recipe is saved with steps reordered (e.g., step at order_index 2 moved to order_index 0), all existing progress rows are still keyed to the old integer positions. The row that was "step 2, completed" now silently claims "step 0 (which is now a different step) is completed." The user sees incorrect progress percentages and completed-step ticks on the wrong steps.

The migration to `recipe_step_id` must be done with a data back-fill, not just a schema change. The back-fill requires matching the existing `order_index` values in `unit_recipe_step_progress` to the current `recipe_steps.id` values at the time of migration. If a recipe has ever been saved with the non-destructive save path (post-v0.2.11) AND reordered between the original progress-creation and the migration, the back-fill mapping is ambiguous: two steps may have swapped `order_index` values, making the correct match unknowable without additional data.

**Why it happens:**
The original design intentionally used `order_index` as the key because non-destructive saves did not yet exist (DELETE-all + re-INSERT destroyed step IDs on every save). Once non-destructive saves preserve IDs, the stable `recipe_step_id` FK becomes viable — but the migration to adopt it must handle existing data that was authored under the old model.

**How to avoid:**
- The migration SQL must: (1) add `recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL` to `unit_recipe_step_progress`; (2) back-fill via `UPDATE ursp SET recipe_step_id = (SELECT id FROM recipe_steps rs WHERE rs.recipe_id = ura.recipe_id AND rs.order_index = ursp.order_index ... JOIN unit_recipe_assignments ura ON ura.id = ursp.assignment_id)`. The JOIN must also filter by section to handle per-section order_index reuse.
- CRITICAL: the back-fill JOIN needs `rs.section_id = (SELECT section_id FROM recipe_steps WHERE id = ...)` or similar to break ties when two steps in different sections share an `order_index`. Without section disambiguation, the back-fill may link progress to the wrong step.
- After the migration, `upsertStepProgress` must switch to keying on `recipe_step_id` instead of `order_index`, and the `UNIQUE(assignment_id, order_index)` constraint must be replaced with `UNIQUE(assignment_id, recipe_step_id)`.
- Write a data-layer test that: creates a recipe with 2 sections × 2 steps (both sections have steps at order_index 0 and 1), marks all 4 as complete, runs the migration, then reads progress and asserts each row has the correct `recipe_step_id`.

**Warning signs:**
- The migration SQL back-fill does not JOIN on `recipe_sections` to disambiguate `order_index` per-section.
- After migration, `upsertStepProgress` still passes `orderIndex` as the conflict key instead of `recipe_step_id`.
- Progress percentage shows 50% when user marked 3 of 4 steps complete in a 2-section recipe.

**Phase to address:** The migration identity hardening phase. Must be the first phase; all subsequent progress reads depend on the stable key being established.

---

### 2. Transactional Recipe Save: tauri-plugin-sql Nested Transactions Are Not Supported

**What goes wrong:**
`tauri-plugin-sql` does not support savepoints or nested transactions. `BEGIN TRANSACTION` after an already-active transaction throws a Rust-level error, not a graceful JS rejection. The existing codebase already uses `BEGIN / COMMIT` in several query functions (`bulkCreateAssignments`, `reorderRecipeSections`, `replaceSyncedUnitPoints`, `duplicateRecipe`). If the transactional recipe save calls any of these helper functions inside its own outer transaction, the inner `BEGIN TRANSACTION` will corrupt the outer transaction state.

The current `RecipeFormSheet` save path uses DELETE-all + re-INSERT sequentially without an explicit transaction wrapper. Adding a transaction wrapper is the right fix, but it must not call any helper that issues its own `BEGIN`.

**Why it happens:**
`tauri-plugin-sql` wraps `sqlx`'s connection pool. Each `db.execute("BEGIN TRANSACTION")` call acquires a connection and begins a transaction on it. A second `BEGIN` on the same logical "savepoint stack" fails because the pool may or may not return the same physical connection, and even if it does, SQLite does not support nested `BEGIN` (only `SAVEPOINT`). The plugin exposes no `SAVEPOINT` API.

**How to avoid:**
- The transactional recipe save must be implemented as a single flat sequence of `db.execute()` calls between one `BEGIN TRANSACTION` and one `COMMIT` — no calls to other query-module functions that have their own `BEGIN / COMMIT` inside.
- All the section/step CRUD operations needed during save (delete removed, update existing, insert new) must be inlined as raw SQL calls within the save function, not delegated to `createRecipeSection`, `updateRecipeSection`, etc.
- Alternatively, expose a new Tauri Rust command for the atomic recipe save (mirroring `bulk_sync_rules`), which uses a real sqlx transaction that supports the full save graph. This is more complex but eliminates the nested-transaction problem entirely.
- Never call `bulkCreateAssignments`, `reorderRecipeSections`, or `duplicateRecipe` from inside a transaction block.

**Warning signs:**
- The save function calls `createRecipeSection(...)` or `updateRecipeSection(...)` inside a `BEGIN / COMMIT` block — those functions contain their own `BEGIN`.
- Integration test throws "cannot start a transaction within a transaction" or similar SQLite error.
- Recipe saves silently succeed but DB is left in a half-committed state when the window loses focus mid-save.

**Phase to address:** Transactional recipe save phase. The flat-SQL pattern must be documented as a constraint for the implementor.

---

### 3. SQLite Backup During WAL Mode: File Copy Produces Corrupt Backup

**What goes wrong:**
`hobbyforge.db` is opened by `tauri-plugin-sql` in default journal mode (not explicitly WAL-mode — see `client.ts` which sets only `PRAGMA foreign_keys = ON`). Even in default rollback journal mode, a naive file copy (`fs.copy(hobbyforge.db, backup.db)`) while the app is running can copy the main file without its `-wal` or `-journal` sidecar file, producing a backup that is either corrupted or missing committed transactions.

If the user or a future phase enables WAL mode on `hobbyforge.db` (rules.db already uses WAL per `lib.rs`), the risk is higher: the WAL file (`hobbyforge.db-wal`) can be several MB and must be checkpointed into the main file before a safe copy. A file-system copy without checkpointing produces a backup that appears valid (SQLite can recover it) but is missing all transactions still in the WAL.

**Why it happens:**
WAL mode is set per-connection in `rules.db` via the sqlx options in `bulk_sync_rules`. `hobbyforge.db` does not explicitly set a journal mode, so it uses SQLite's default (DELETE journal). Developers seeing WAL mode work in `rules.db` may assume `hobbyforge.db` uses WAL too and design the backup accordingly.

The correct cross-platform backup approach for SQLite is the `VACUUM INTO 'backup_path'` SQL command (SQLite 3.27+), which writes a fresh, fully-checkpointed backup file regardless of journal mode. The alternative is the SQLite Online Backup API, not accessible via `tauri-plugin-sql`.

**How to avoid:**
- Use `db.execute("VACUUM INTO $1", [backupPath])` (or via a Tauri Rust command calling `VACUUM INTO` via sqlx) — this produces a clean, self-contained copy with all committed data, regardless of WAL state.
- Never use `tauri-plugin-fs` to copy the raw `.db` file while the app is running. A file copy is only safe after `PRAGMA wal_checkpoint(FULL)` and only if no write transaction is open.
- For the restore path: close the `hobbyforge.db` connection (`_dbPromise = null` via `__resetDbForTesting` pattern), overwrite the file, then force a reconnect. The app must be restarted or the singleton must be reset.
- Add a `PRAGMA integrity_check` after `VACUUM INTO` to verify the backup before presenting a success toast.

**Warning signs:**
- Backup implementation uses `tauri-plugin-fs` `copyFile()` on the raw `.db` file path.
- Restore path does not reset `_dbPromise` in `client.ts` and does not force a reconnect.
- Backup file size is suspiciously small compared to the live DB (WAL not checkpointed into backup).
- `PRAGMA integrity_check` on the restored backup returns errors.

**Phase to address:** Backup/export phase. The `VACUUM INTO` approach must be the only accepted implementation pattern.

---

### 4. Centralized Points Resolver: COALESCE Chain Broken at One of Three Query Sites

**What goes wrong:**
The 5-level COALESCE chain — `COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)` — currently appears in three distinct query sites:
1. `getArmyListWithUnits` in `armyLists.ts` (line 63) — per-unit row with LEFT JOINs to `unit_overrides` and `synced_unit_points`
2. `getArmyListReadiness` in `armyLists.ts` (line 229) — aggregate SUM for the dashboard readiness card
3. `getArmyReadinessByFaction` in `dashboard.ts` (line 93) — uses only `COALESCE(u.points, 0)`, NOT the full 5-level chain

Site 3 is already diverged: it reads `u.points` directly without the `sup.points` (synced) or `uo.points` (override) layers. This means the dashboard readiness card shows different totals than the army list detail view for the same army when synced or overridden points are in effect.

When a "centralized points resolver" is introduced — whether as a SQL view, a shared query fragment, or a JS helper — the risk is: sites 1 and 2 are updated to use it, site 3 is missed or intentionally left with the old 2-level chain. The divergence persists silently because both produce numeric results with no type error.

**Why it happens:**
Site 3 (`getArmyReadinessByFaction`) predates the `synced_unit_points` and `unit_overrides` tables (it was written in v0.2.4 before those tables existed in v0.2.6/v0.2.10). It was never backported. The pattern of "three query sites" was documented in Project.md as "applied atomically" for PI-05, but site 3 is a faction-level aggregate that uses `units` directly, not `army_list_units`, so it does not have `alu.points_override` — the full chain requires a different approach at that site.

**How to avoid:**
- Audit all `COALESCE.*points` patterns in `src/db/queries/*.ts` before adding the resolver. Currently: `armyLists.ts` lines 63 and 229 (full chain), `dashboard.ts` line 93 (2-level chain), `units.ts` line 55 (COALESCE on write, not read).
- `getArmyReadinessByFaction` cannot use `alu.points_override` because it does not JOIN `army_list_units`. Decide explicitly: either (A) accept that faction readiness uses `u.points` + override + synced (no list-level override), which is a valid semantic choice, or (B) leave faction readiness as a simple `u.points` sum and document the divergence.
- Whatever the decision, it must be documented in a comment on `getArmyReadinessByFaction` explaining which chain it uses and why.
- The centralized resolver (if implemented as a SQL view) must be named clearly (e.g., `unit_effective_points_v`) and tested by running the same unit through all three calling sites and asserting they agree.

**Warning signs:**
- The army list detail view shows 1000 pts for a list, but the ArmyReadinessCard on the dashboard shows 950 pts for the same faction (using old `u.points` without synced data).
- The resolver refactor PR touches `armyLists.ts` but not `dashboard.ts`.
- A grep for `COALESCE.*points` after the change still finds the old 2-level pattern in `dashboard.ts`.

**Phase to address:** Centralized points resolver phase. The site-3 divergence must be resolved (or explicitly accepted) in the same phase that introduces the resolver.

---

### 5. Unit-to-Rules Name Matching: Duplicate datasheet_name Rows in synced_unit_points

**What goes wrong:**
`synced_unit_points` is keyed on `(unit_name, faction_id)`. The `getArmyListWithUnits` LEFT JOIN matches via `sup.unit_name = u.name AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))`. If Wahapedia has two `rw_datasheet_points` rows for the same `datasheet_name` (e.g., different point costs for different model counts, or a cross-faction entry), the `replaceSyncedUnitPoints` loop inserts both, but the table has no UNIQUE constraint on `(unit_name, faction_id)`. The LEFT JOIN then returns multiple rows for one `army_list_units` row, multiplying the `effective_points` result.

The unit-to-rules mapping/confirmation layer will face the same issue: fuzzy name matching (e.g., "Intercessors" vs "Intercessor Squad") can produce multiple candidate rules.db rows, and without deduplication the mapping table will have spurious duplicates that break the JOIN.

**Why it happens:**
Wahapedia's points CSV can contain multiple rows per unit (e.g., separate rows for different squad sizes). The `replaceSyncedUnitPoints` function does a DELETE-all + re-INSERT loop without deduplication. The LEFT JOIN in `getArmyListWithUnits` returns one result row per matching `synced_unit_points` row. With two matching rows, SQLite emits two result rows for the same `army_list_units` row, causing `SUM(effective_points)` in aggregate queries to double-count.

**How to avoid:**
- Add a `UNIQUE(unit_name, faction_id)` constraint to `synced_unit_points` (migration). The `replaceSyncedUnitPoints` loop should use `INSERT OR REPLACE` (or `INSERT OR IGNORE` for a keep-first-seen strategy).
- If multiple points values genuinely exist for the same unit (squad-size tiers), the cache must store only the canonical/minimum value or the first encountered, not all rows.
- The unit-to-rules mapping table (new for v0.2.13) must also enforce a UNIQUE constraint on `(unit_id, datasheet_id)` to prevent join fan-out.
- Test: import a points CSV with duplicate `datasheet_name` rows, run `replaceSyncedUnitPoints`, assert the table has exactly one row per `(unit_name, faction_id)` pair.

**Warning signs:**
- `synced_unit_points` table has more rows than expected after a sync (count > unique unit names).
- `getArmyListWithUnits` returns more rows than there are units in the list.
- Army list total points is double (or more) of expected value after a sync.
- The migration for `synced_unit_points` does not include a UNIQUE constraint.

**Phase to address:** Centralized points resolver / unit-to-rules mapping phase. The UNIQUE constraint migration must precede any query that relies on the 1:1 join assumption.

---

### 6. Data Health Diagnostic Queries Blocking the React Event Loop

**What goes wrong:**
Diagnostic queries for a Data Health page (orphaned steps, orphaned sessions, missing FK targets, stale override counts, etc.) are JOIN-heavy and must scan multiple large tables. `tauri-plugin-sql` executes all queries on the JS thread via IPC bridge — there is no worker thread or background task. A single diagnostic query that takes 200ms will block React rendering and cause visible jank. Worse, if the page runs 8 diagnostic checks sequentially via `await db.select(...)` in a loop, the total blocking time is 8 × query_time.

**Why it happens:**
`tauri-plugin-sql` serializes all DB calls through the Tauri IPC layer. Unlike direct SQLite access, each query has both the JS → Rust IPC overhead and the SQLite execution time. For simple CRUD queries this is imperceptible. For full-table JOINs across 5 tables (e.g., counting orphaned `unit_recipe_step_progress` rows against the full `recipe_steps` set), the latency can be 50–200ms per query.

**How to avoid:**
- Run all diagnostic queries in parallel via `Promise.all([diag1(), diag2(), ...])` — the Tauri IPC serializes them internally but the JS side does not block between launches.
- Each diagnostic query must return only aggregate counts (e.g., `SELECT COUNT(*) AS orphaned_steps FROM ...`), not full row sets. Never `SELECT *` for diagnostic purposes.
- Use a dedicated React Query key (`["data-health"]`) with `staleTime: 0` (always re-run on mount) but do NOT put diagnostic queries in `getDashboardStats` or any hook that runs on every navigation.
- Show a loading skeleton for the Data Health page — users expect a brief wait for a "run diagnostics" action. Do not block the sidebar or other navigation while diagnostics run.
- The Rust-side `bulk_sync_rules` pattern (single `sqlx` connection, all queries in one request) is a viable escape hatch for expensive diagnostic work that must be atomic.

**Warning signs:**
- Diagnostic queries run inside `getDashboardStats` or a hook used on the main layout.
- The health check loop `await diag1(); await diag2(); ...` is sequential, not `Promise.all`.
- Queries return full row sets (`SELECT *`) instead of counts.
- The Data Health page is mounted on the dashboard, not as a separate lazy-loaded page.

**Phase to address:** Data Health / Diagnostics page phase. Parallel aggregates, lazy loading, and the React Query `["data-health"]` key must be part of the initial design, not retrofitted.

---

### 7. Dashboard Aggregation N+1 Query Pattern via React Query Hook Composition

**What goes wrong:**
The dashboard currently has five distinct React Query hooks: `useDashboardStats`, `useArmyReadiness`, `useRecentActivity`, `useLatestUnitPhotos`, and `useWorkflowPositions`. These were carefully kept separate to avoid full-dashboard re-fetches on narrow cache invalidations. When "command center / next action" UX requires combining data from two more sources (e.g., applied recipe progress summary, upcoming hobby goals), the temptation is to add two more hooks to the dashboard page component. Each new hook fires its own `db.select` on mount. With 7 hooks, every dashboard mount triggers 7 IPC round-trips in rapid succession.

The subtler N+1: `useLatestUnitPhotos` was deliberately called once at page level and prop-drilled (Key Decisions: "useLatestUnitPhotos called once in DashboardPage"). If a developer moves a photo lookup into a card-level component and adds `useUnitPhoto(unitId)` per card, 5+ parallel hook calls replace the single batched call.

**Why it happens:**
React Query hooks are easy to add and composing them feels clean. The cost is invisible in development (fast local SQLite) but compounds at runtime with 7+ simultaneous IPC calls. Each call competes for the tauri-plugin-sql connection pool.

**How to avoid:**
- New dashboard data requirements must first check whether they can be derived from data already fetched by an existing hook (e.g., recipe progress counts can come from a `getRecipeAssignmentSummary` query added to `getDashboardStats` or a new batch query, not per-unit hooks).
- Maintain the "hooks called at page level, prop-drilled to panels" pattern established in v0.2.4.
- For any new dashboard data that genuinely requires a separate query, add it to `getDashboardStats` as an additional field if it reads from `units` or `factions` tables (already fetched), or add it to a `useDashboardExtended` hook that batches the new queries with `Promise.all`.
- Apply the "batch GROUP BY" pattern (established in `getStepCountsByRecipe`) to any count that would otherwise require per-item queries.

**Warning signs:**
- A new card-level component in the dashboard imports and calls a `useXxx(unitId)` hook where `unitId` comes from a prop.
- `DashboardPage.tsx` grows beyond 6 `useQuery` / `useMutation` hook calls.
- The Dashboard's React Query invalidation set expands to include 3+ new cache keys that each independently re-fetch the full page.

**Phase to address:** Dashboard command center / next action UX phase. The data architecture must be planned before building any new card components.

---

### 8. Game Day After-Action State: Zustand Persist Schema Breaks on Adding Fields

**What goes wrong:**
`gameDayStore.ts` uses `zustand/persist` with `name: "game-day-state"`. The persisted shape is `Record<string, GameDayListState>` keyed by list ID. If "after-action" features (forgotten_rules, MVP units) add new fields to `GameDayListState`, localStorage already holds serialized objects that lack those fields. On next load, Zustand's `persist` middleware merges the stored JSON with the initial state via a shallow merge — nested objects (like `checklistItems`) are replaced wholesale with the stored version, but new top-level fields in the loaded sub-objects are simply absent (not merged). TypeScript types claim the fields exist; runtime accesses return `undefined`.

An example: `GameDayListState` gains `afterAction: { mvpUnits: string[]; forgottenRules: string[] }`. The stored objects have no `afterAction` key. The default value from `getListState()` provides it on first access, but any code that reads `cur.afterAction.mvpUnits` before `setListState` is called will throw "Cannot read properties of undefined" because `cur` was loaded from storage without `afterAction`.

**Why it happens:**
Zustand `persist` does a `JSON.parse` of the stored string and sets it directly. It does not recursively merge with the initial state's shape. The Zustand docs recommend a custom `merge` function or the `partialize` option to handle schema evolution — most developers skip this until they hit the error.

**How to avoid:**
- Add a `version` number to the persist config and a `migrate` function that handles old schema versions: `persist({ name: "game-day-state", version: 2, migrate: (persisted, version) => { ... } })`.
- Or: use optional chaining for every access to newly-added nested fields and ensure `getListState()` always merges the stored partial with the full default shape (`{ ...DEFAULT_STATE, ...storedState }` deep merge).
- Before adding after-action fields, write a test that deserializes a v1 stored string and asserts the v2 store returns non-null values for all new fields.
- Keep after-action data (forgotten rules, MVP units) as top-level arrays on `GameDayListState`, not nested objects — top-level fields survive shallow merge with the default better than nested objects.

**Warning signs:**
- `GameDayListState` gains a nested object field (not a primitive or top-level array).
- `gameDayStore.ts` has no `version` or `migrate` in the persist config.
- After adding a new field, opening the app after previously playing a Game Day session throws a runtime error on the Game Day page.
- `getListState` merges stored state with `{ ...DEFAULT_STATE }` using only a shallow spread.

**Phase to address:** Game Day after-action phase. Schema migration must be planned before the first new field is added.

---

### 9. Warning Split: Breaking computeUnitWarnings Pure Function Callers

**What goes wrong:**
`computeUnitWarnings` in `src/lib/computeUnitWarnings.ts` is called from three sites:
1. `ArmyListUnitRow.tsx` — renders per-unit warning pills
2. `ArmyListSummaryBar.tsx` — aggregates counts via `computeListHealthStats`
3. `GameDayReadinessPanel.tsx` — pre-game readiness checks

If "split list-level vs unit-level warnings" refactors `computeUnitWarnings` to return only unit-scoped warnings (removing the `"Points exceeded"` hard warning — which is a list-level condition), and `computeListHealthStats` is not updated simultaneously, the aggregate `hardWarningCount` will undercount. The ArmyListSummaryBar will show 0 hard warnings even when points are exceeded.

The current code in `computeListHealthStats` already has a special-case guard (`warnings.hard.filter((w) => w !== "Points exceeded")`) to avoid double-counting the list-level warning. This guard reveals the design tension — the list-level warning was already artificially embedded in the per-unit function and then filtered out at the aggregation level.

**Why it happens:**
The "Points exceeded" hard warning lives in `computeUnitWarnings` because that was the only warning function at the time. It was always a list-level condition (the total exceeds the limit, not any single unit), but embedding it in the per-unit function was expedient. The filter in `computeListHealthStats` is a code smell that documents the mismatch.

**How to avoid:**
- The refactor must be purely additive first: create `computeListWarnings(context: WarningContext): UnitWarnings` that returns the list-level warnings only. Do not remove "Points exceeded" from `computeUnitWarnings` in the same PR.
- Then update `computeListHealthStats` to call `computeListWarnings` for list-level warnings and `computeUnitWarnings` for per-unit warnings. Only then remove "Points exceeded" from `computeUnitWarnings`.
- Run the existing pure-function tests after each step — if `hardWarningCount` changes between steps, the refactor is not yet correct.
- GameDayReadinessPanel must be audited: does it call `computeUnitWarnings` per unit and expect "Points exceeded" to appear in the results? If so, it must be updated to call `computeListWarnings` separately for the list-level check.

**Warning signs:**
- `computeUnitWarnings` no longer mentions "Points exceeded" but `computeListHealthStats` still has the `.filter((w) => w !== "Points exceeded")` guard (now a no-op, masking a bug if the list warning was not moved correctly).
- After the refactor, a list that exceeds its points limit shows `hardWarningCount: 0` in the SummaryBar.
- Only `ArmyListUnitRow.tsx` was updated; `GameDayReadinessPanel.tsx` was not.

**Phase to address:** List-level vs unit-level warnings split phase. The three call sites must be updated atomically with the function signature change.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Back-fill order_index → recipe_step_id without section disambiguation | Simpler migration SQL | Progress rows linked to wrong steps in multi-section recipes after any step reorder | Never acceptable — the JOIN must include section_id to break ties |
| Sequential diagnostic queries (`await` loop instead of `Promise.all`) | Simpler error handling | 8 × query latency blocks React render; dashboard jank visible to user | Never acceptable for diagnostic pages — all checks must parallelize |
| File copy for backup instead of `VACUUM INTO` | One-line implementation | Corrupt backup if WAL file not checkpointed; useless in a data-loss scenario | Never acceptable — `VACUUM INTO` is the only safe SQLite online backup approach |
| Adding new `GameDayListState` fields without a persist migration | No extra code | Existing localStorage state deserialized without new fields; runtime undefined access | Never acceptable for nested objects; acceptable for top-level primitives with `?? default` guards |
| Inlining the 5-level COALESCE at each call site instead of a shared view | Copy-paste consistency | Any future tier addition (e.g., a 6th source of truth) must be updated in all sites; divergence guaranteed | Acceptable if sites are < 3 and well-documented; must be revisited when a third site appears (we are already at 3) |
| `computeUnitWarnings` embedding list-level "Points exceeded" warning | Single function for all warnings | Aggregation must filter it out to avoid double-counting; every new caller must know about the exception | Never acceptable in new code — the filter in computeListHealthStats is the debt marker |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `tauri-plugin-sql` transactions | Calling a query helper that issues `BEGIN` inside an outer `BEGIN / COMMIT` block | Inline all SQL statements for the save as flat `db.execute()` calls; no nested BEGIN |
| SQLite `VACUUM INTO` | Passing a relative path for the backup destination | Use `app.path().app_data_dir()` resolved to absolute path; `VACUUM INTO` requires an absolute path |
| Zustand `persist` schema migration | Adding a nested object field to `GameDayListState` without a `version` bump | Add `version: N` and a `migrate` function; or use `{ ...DEFAULT_STATE, ...persisted }` deep merge in `getListState` |
| `synced_unit_points` LEFT JOIN | No UNIQUE constraint → join fan-out when CSV has duplicate unit names | Add `UNIQUE(unit_name, faction_id)` constraint; use `INSERT OR REPLACE` in replaceSyncedUnitPoints |
| React Query cache invalidation for new diagnostic hook | Invalidating `["data-health"]` from inside `useCreateUnit` (too broad) | Only invalidate `["data-health"]` from a manual "re-run diagnostics" button, not from every mutation |
| `VACUUM INTO` and active writes | Running backup while a write transaction is open | Issue `PRAGMA wal_checkpoint(FULL)` first; or use the Tauri Rust command path where you control the connection lifecycle |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential diagnostic `await` loop | Dashboard jank; DevTools shows 400ms+ gap between React renders | `Promise.all([diag1, diag2, ...])` parallel execution | Any page with 4+ diagnostic queries run on mount |
| Per-unit photo hook in dashboard cards | 5 IPC round-trips on dashboard mount instead of 1 | Call `useLatestUnitPhotos` once at page level; prop-drill result map | When adding new cards that read unit photos |
| Full `SELECT *` for health diagnostic page | Returns 10,000-row result set for a "how many orphans?" check | `SELECT COUNT(*) AS n` aggregate queries only | Scales to current data (hundreds of rows); would visibly degrade at 10k+ sessions |
| `getArmyListWithUnits` called with no list ID guard | 0-row query still incurs IPC overhead | Always guard on `listId !== null` before calling | Not a current issue; relevant if list ID comes from transient URL state |
| `VACUUM INTO` on large DB during sync | Backup takes 2–5 seconds on a 50MB DB | Run backup in a Tauri async command; show progress spinner; never block the JS thread | Current DB is small (< 5MB); would be noticeable at 50MB+ with many photo paths stored |

---

## "Looks Done But Isn't" Checklist

- [ ] **Migration back-fill:** `unit_recipe_step_progress` rows have non-null `recipe_step_id` after the migration — confirmed by `SELECT COUNT(*) FROM unit_recipe_step_progress WHERE recipe_step_id IS NULL` returning 0 for any existing progress data
- [ ] **Migration back-fill accuracy:** Each back-filled `recipe_step_id` points to the step with the matching `order_index` AND matching `section_id` — not just any step with that `order_index` in the recipe
- [ ] **Transaction atomicity:** Saving a recipe with sections + steps that fails midway (simulated by throwing after section insert) leaves the DB unchanged — not in a partial state
- [ ] **Backup integrity:** `PRAGMA integrity_check` on the `VACUUM INTO` backup file returns `ok` — not just that the file was created
- [ ] **Backup restore:** After restoring a backup, the app relaunches cleanly with the restored data — `_dbPromise` was reset before overwriting the file
- [ ] **COALESCE site 3 addressed:** `getArmyReadinessByFaction` in `dashboard.ts` is either updated to include `synced_unit_points` and `unit_overrides` in its JOIN, or has a comment documenting the intentional divergence
- [ ] **synced_unit_points uniqueness:** After a sync with a CSV containing duplicate unit names, `SELECT COUNT(*) FROM synced_unit_points` equals the count of distinct `(unit_name, faction_id)` pairs
- [ ] **Diagnostic parallelism:** Data Health page network tab shows all diagnostic queries firing simultaneously, not sequentially
- [ ] **GameDay persist migration:** After upgrading from v0.2.12 localStorage state, the Game Day page opens without throwing a runtime error and all new after-action fields have default values
- [ ] **Warning split completeness:** `ArmyListSummaryBar` still shows `hardWarningCount: 1` when list points exceed the limit after `computeUnitWarnings` no longer emits "Points exceeded"
- [ ] **Warning split GameDay:** `GameDayReadinessPanel` correctly shows the points-exceeded warning after the split (it was calling `computeUnitWarnings` — verify the call site was updated)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| order_index back-fill linked to wrong step | HIGH | Manual SQL to re-run the back-fill with corrected JOIN; user must re-mark any incorrectly-attributed completed steps |
| Nested transaction crash during recipe save | MEDIUM | The DB is in a partially-written state; user sees blank recipe on reload; recovery is to re-enter the lost sections/steps |
| Corrupt backup from file copy | HIGH | Backup is unusable; data loss if the live DB was also damaged; only prevention works |
| Zustand persist undefined field access | LOW | Clear localStorage key `game-day-state`; user loses current game session state (CP, checklist); acceptable for a Game Day tool |
| COALESCE chain diverged at dashboard site | LOW | Fix `getArmyReadinessByFaction` SQL; no data migration needed |
| Diagnostic queries blocking render | LOW | Move queries out of render path to a lazy-loaded page with explicit "run" button; no data loss |
| Warning split leaves hardWarningCount wrong | LOW | Fix `computeListHealthStats` to use the new list-level warning function; no data changes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 order_index back-fill ambiguity | Applied recipe identity migration phase | Data-layer test: 2-section recipe, mark all steps complete, run migration, assert recipe_step_id FK correct per section |
| #2 Nested transaction in tauri-plugin-sql | Transactional recipe save phase | Integration test: mid-save throw leaves DB unchanged; no "cannot start a transaction" error |
| #3 SQLite backup file corruption | Backup/export phase | PRAGMA integrity_check passes on backup; restore + relaunch succeeds |
| #4 COALESCE chain diverged at site 3 | Centralized points resolver phase | Dashboard readiness matches army list detail view for the same faction/list |
| #5 synced_unit_points join fan-out | Centralized points resolver / unit mapping phase | Duplicate CSV rows → UNIQUE constraint violation caught; army list total correct |
| #6 Diagnostic queries blocking render | Data Health page phase | Diagnostics run in parallel; no visible jank; page is lazy-loaded |
| #7 Dashboard N+1 hook proliferation | Dashboard command center phase | DashboardPage has ≤ 6 useQuery calls; no per-unit hook calls inside card components |
| #8 GameDay persist schema break | Game Day after-action phase | Upgrading from v0.2.12 localStorage produces no undefined errors; new fields have defaults |
| #9 Warning split breaks aggregation | List-level warnings split phase | hardWarningCount correct for points-exceeded list; all 3 call sites updated atomically |

---

## Sources

- `src/db/queries/armyLists.ts` — 5-level COALESCE chain at lines 63 and 229; `getArmyListReadiness` batch query; full-replacement UPDATE for `army_list_units`
- `src/db/queries/dashboard.ts` — 2-level `COALESCE(u.points, 0)` at line 93 (site 3 divergence); `getDashboardStats` parallel Promise.all pattern
- `src/db/queries/recipeAssignments.ts` — `unit_recipe_step_progress` schema with `UNIQUE(assignment_id, order_index)` key; `upsertStepProgress` using order_index; `bulkCreateAssignments` own `BEGIN / COMMIT`
- `src/db/queries/syncedUnitPoints.ts` — `replaceSyncedUnitPoints` DELETE-all + loop; no UNIQUE constraint documented
- `src/db/queries/recipeSections.ts` — `reorderRecipeSections` own `BEGIN / COMMIT`; `bulkCreateAssignments` own `BEGIN / COMMIT`
- `src/db/queries/recipes.ts` — `duplicateRecipe` own `BEGIN / COMMIT`; section-aware step ordering via LEFT JOIN
- `src/db/client.ts` — singleton pattern; `PRAGMA foreign_keys = ON` only (no WAL mode on hobbyforge.db); `__resetDbForTesting` reset pattern
- `src/lib/computeUnitWarnings.ts` — `computeUnitWarnings` embedding "Points exceeded" list-level warning; filter guard in `computeListHealthStats`; three caller sites
- `src/features/army-lists/ArmyListSummaryBar.tsx` — `computeListHealthStats` aggregate; `hardWarningCount` display
- `src/features/game-day/gameDayStore.ts` — `zustand/persist` with `name: "game-day-state"`; no `version` or `migrate`; `getListState` default merge
- `src-tauri/src/lib.rs` — `bulk_sync_rules` real sqlx transaction pattern (reference for escaping tauri-plugin-sql limitations); WAL mode on rules.db only
- `src-tauri/migrations/021_applied_recipe_assignments.sql` — `unit_recipe_step_progress` with `UNIQUE(assignment_id, order_index)` — the constraint that must change
- `.planning/PROJECT.md` — Key Decisions (useLatestUnitPhotos single call; COALESCE in SQL; Game Day Zustand persist; non-destructive save five-phase diff; PI-05 "applied atomically across all 3 query sites")

---
*Pitfalls research for: v0.2.13 Data Integrity, Diagnostics & Product Coherence*
*Researched: 2026-05-14*
