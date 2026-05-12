# Pitfalls Research

**Domain:** Warhammer hobby management — applied recipes, points import, list validation
**Researched:** 2026-05-12
**Confidence:** HIGH (all findings grounded in direct codebase inspection of migrations, query modules, Key Decisions table, and established patterns)

---

## Critical Pitfalls

### 1. Template-Instance Confusion: Progress Rows Reference Step IDs That No Longer Exist

**What goes wrong:**
`unit_recipe_step_progress` stores `recipe_step_id` FKs. The recipe editor uses DELETE-all + re-INSERT for saves (confirmed in migration 018 and the `duplicateRecipe` pattern in `recipes.ts`). If the user edits a recipe after assigning it to units, every step row is destroyed and recreated with new `lastInsertId` values. All progress FK rows then point at orphaned IDs — or if ON DELETE CASCADE is applied, all progress is silently wiped.

**Why it happens:**
The DELETE-all + re-INSERT pattern was the correct choice for recipe sections (ordering is clean, no diff algorithm needed). But it becomes a landmine the moment any other table stores FKs to `recipe_steps.id`, because those IDs change on every save, not just on explicit step deletion. The `painting_sessions` table already encountered this and solved it with denormalization (`section_name TEXT` copy instead of `section_id FK` — migration 020 comment).

**How to avoid:**
Two options — pick one before writing migration 021:
- Option A (recommended): Progress rows reference `(recipe_id, order_index)` as a stable composite key, not `recipe_step_id`. Order-index is stable across edits unless the user reorders. A reorder clears only the steps whose index changed (acceptable). This mirrors the `section_name` denormalization already used in `painting_sessions`.
- Option B: When `unit_recipe_assignments` exist for a recipe, gate the DELETE-all + re-INSERT path and switch to update-in-place + orphan-cleanup. Adds complexity; only warranted if step_name lookup by progress row is required at query time.

**Warning signs:**
- Progress disappears silently after recipe edits without any step being explicitly deleted.
- `unit_recipe_step_progress` rows exist for `recipe_step_id` values not present in `recipe_steps`.
- Completed-step count shows 0 after a recipe is renamed or reordered.

**Phase to address:** AR-01 — the schema decision locks in; changing it after requires a migration and data backfill.

---

### 2. Points Data Written to the Wrong Database

**What goes wrong:**
`imported_unit_points` (PI-01) is written to `rules.db`. The Rust `bulk_sync_rules` command runs DELETE + re-INSERT in a single transaction. Any table in `rules.db` is completely destroyed on every sync. All user-imported points data is permanently lost on every Wahapedia sync.

**Why it happens:**
`rules.db` feels like the right home for "game rules data." But the project's Key Decisions table states explicitly: "User data in hobbyforge.db, never rules.db — rules.db is destroyed on every sync." Migration 017 comment repeats this: "CRITICAL: Lives in hobbyforge.db." `imported_unit_points` is user-curated data (manually imported, versioned, with freshness metadata). It belongs in hobbyforge.db alongside `unit_overrides`.

Cross-DB references are handled via TEXT denormalization (`detachment_name`, `weapon_name`, `section_name` — all TEXT copies in hobbyforge.db). The same pattern applies: store `datasheet_name TEXT` or link to `units.id` (FK into hobbyforge.db) in `imported_unit_points`.

**How to avoid:**
Migration 021+ must CREATE TABLE `imported_unit_points` in hobbyforge.db. Verify by checking which `getDb()` call the query module uses — `src/db/client.ts` import for hobbyforge.db, `src/db/rules-client.ts` for rules.db.

**Warning signs:**
- Points data vanishes after any sync operation.
- PI-03 freshness badges stop showing history after a re-sync.
- PI-04 deltas show all units as "new" on every import cycle.
- The query module imports from `rules-client.ts` instead of `client.ts`.

**Phase to address:** PI-01 — wrong DB choice here requires a migration to move the table and rewrite all query modules.

---

### 3. COALESCE Chain Extension Breaking Consistency Across Query Modules

**What goes wrong:**
The new PI-05 requirement defines a 5-level chain: `list override > loadout override > imported > unit default > unknown`. The existing chain in `getArmyListWithUnits` is: `COALESCE(alu.points_override, uo.points, u.points, 0)`. Adding `imported_unit_points` as a third tier requires a LEFT JOIN to the new table. If the JOIN is INNER instead of LEFT, units without imported points are excluded from results entirely.

A related risk: `getArmyListReadiness` in `armyLists.ts` duplicates the COALESCE expression at line 197. When the chain is extended, both queries must be updated atomically. Missing one produces inconsistent totals between the army list detail view and the readiness card.

A third location: `getArmyReadinessByFaction` in `dashboard.ts` uses `COALESCE(u.points, 0)` directly — no override tier at all. This query may or may not need the full 5-level chain (dashboard simplification may be intentional), but the decision must be made explicitly.

**How to avoid:**
- Search the codebase for ALL occurrences of `COALESCE(alu.points_override` before shipping PI-05 — every hit must be updated or explicitly documented as intentionally omitting the new tier.
- Write the new COALESCE expression in a SQL comment at the top of `armyLists.ts` as a canonical reference, then copy it to all affected queries.
- LEFT JOIN the new `imported_unit_points` table: `LEFT JOIN imported_unit_points iup ON iup.unit_id = u.id`.

**Warning signs:**
- Army list total differs from dashboard readiness total for the same list.
- Units with imported points show 0 in some views and correct values in others.
- Grep reveals the old `COALESCE(alu.points_override, uo.points, u.points` expression still present in any query after PI-05 ships.

**Phase to address:** PI-05, with a pre-ship audit pass across `armyLists.ts` and `dashboard.ts`.

---

### 4. N+1 Query Trap on Tactical Tag Aggregation

**What goes wrong:**
LV-02 adds per-unit tactical role tags. LV-03 aggregates them to list level. The naive implementation reads `unit_tactical_tags` per unit inside a map/forEach over `army_list_units` — this fires one query per unit. A 2000pt list with 15 units fires 15 queries for tag lookup alone.

This pattern has been explicitly avoided in this codebase: `useLatestUnitPhotos` was moved to page-level (documented in Key Decisions); `getStepCountsBySection()` uses GROUP BY; the annotations page uses `Map<compositeKey, T>` built via useMemo for O(1) per-card lookup; `getRecipeNamesByUnitIds` uses dynamic IN placeholders.

**How to avoid:**
- Batch query: `SELECT unit_id, tag FROM unit_tactical_tags WHERE unit_id IN ($1, $2, ...)` with dynamic positional placeholders (established pattern in `getArmyListReadiness` lines 192–194).
- Build a `Map<unit_id, string[]>` in the hook, not the component.
- Do not define a `useTacticalTags(unitId)` hook called inside a list-rendering loop.

**Warning signs:**
- Army list validation panel is slow to appear for lists with 10+ units.
- A `getTacticalTagsByUnit` function exists and is called inside a `.map()`.
- The `useTacticalTags` hook accepts a single `unitId` parameter.

**Phase to address:** LV-02 — design the batch query interface before building the UI layer.

---

### 5. Applied Recipe Delete/Edit Leaves Orphaned Progress With Stale Cache

**What goes wrong:**
When a user deletes a recipe that has active `unit_recipe_assignments`, the assignments and progress rows are removed via CASCADE. But the Kanban card and CurrentFocusCard still display "In Progress" / "Next Step" badges until the cache is invalidated. If `useDeleteRecipe` only invalidates `["recipes"]` and not `["applied-recipes"]` / `["unit-recipe-progress"]`, the Kanban shows stale progress — including a next-step prompt for a step that no longer exists.

This is the cache invalidation symmetry rule violation, documented in Key Decisions: "If useCreate invalidates a key, useDelete must too."

Similarly, `useDeleteRecipeSection` must invalidate progress keys because section delete cascades to steps, which cascades to progress rows.

**How to avoid:**
- In `useDeleteRecipe`, invalidate `["applied-recipes"]` and `["unit-recipe-progress"]` keys alongside `["recipes"]`.
- In `useDeleteRecipeSection`, also invalidate progress keys.
- Add a comment to the hook's `onSuccess` block documenting the full invalidation contract, mirroring the `RECIPE_SESSIONS_KEY` conditional invalidation comment in the session hooks.

**Warning signs:**
- Kanban card shows next-step prompt from a deleted recipe.
- CurrentFocusCard progress bar shows nonzero after recipe deletion.
- `useDeleteRecipe` onSuccess only invalidates `RECIPES_KEY` with no mention of applied recipe keys.

**Phase to address:** AR-01 (define CASCADE contract), AR-05/AR-06 (wire cache invalidation when Kanban integration is built).

---

### 6. Bulk Apply Creates Shared Progress Rows Instead of Per-Unit Instances

**What goes wrong:**
AR-07 (bulk apply) assigns the same recipe to multiple selected units. The mistake is inserting one `unit_recipe_assignments` row and one set of `unit_recipe_step_progress` rows shared by all units via a single `assignment_id`. Marking step 3 complete for "Intercessors Squad A" then shows step 3 complete for "Intercessors Squad B" — because they share the same progress row.

The army list builder already documents the precedent: "addUnitToList allows the same unit_id multiple times in one list — no UNIQUE constraint on (list_id, unit_id) — intentional." Applied recipe assignments must use the same per-instance logic: each unit gets its own assignment row with its own progress rows.

**How to avoid:**
- Schema: each `unit_recipe_assignments` row is fully independent. Progress rows FK on `assignment_id`, not `recipe_id`.
- Bulk apply: INSERT one `unit_recipe_assignments` row per selected unit in a sequential loop (consistent with the bulk wishlist add pattern: sequential `mutateAsync`, not `Promise.all`).
- No UNIQUE constraint on `(unit_id, recipe_id)` unless "one active recipe per unit" is the intended design — and if so, document that constraint explicitly.

**Warning signs:**
- Completing a step on one unit automatically marks it complete on other units assigned the same recipe.
- `unit_recipe_step_progress` has `recipe_step_id` but no `assignment_id` column.
- Bulk apply uses a single INSERT for assignments instead of a loop.

**Phase to address:** AR-01 (schema design) — structural constraint; cannot be retrofitted without a migration.

---

### 7. Stale Points Detection Firing False Positives After Every Sync

**What goes wrong:**
LV-01 includes "stale source" as a hard warning. If stale detection compares `imported_unit_points.import_date` against `sync_meta.last_synced_at` from `rules.db`, a freshly synced rules set will show all user-imported points as stale — the Wahapedia sync timestamp always post-dates the last points import. This triggers the stale warning on every army list immediately after any sync, even when points were imported last week.

The `StaleDataBanner` in Army Lists 2.0 (Phase 54) already uses Wahapedia sync metadata. Applying the same time-comparison logic to points freshness will cause it to misfire on the same cadence as syncs.

**How to avoid:**
- Stale threshold: compare `imported_unit_points.source_version` (a string like "Balance Dataslate 2025-Q1") against a user-set "current edition identifier" — a mismatch, not a time comparison.
- Or: stale = user has explicitly signaled a new edition is in effect (an import with a different `source_version`), which generates a delta.
- The freshness badge (PI-03) should display "points last updated [date] · [source version]" so the user can judge freshness contextually, without the system making the stale/fresh judgment automatically.

**Warning signs:**
- Every army list shows a stale-points warning immediately after a Wahapedia sync.
- PI-03 badge is always red/amber regardless of recent import date.
- Stale logic contains a comparison like `import_date < last_synced_at`.

**Phase to address:** PI-03 (freshness semantics must be defined before PI-01 schema, because `source_version` and staleness columns depend on it).

---

### 8. Migration Backfill Omissions Causing "Never Imported" Confusion

**What goes wrong:**
New tables for applied recipes and points have no existing rows for current users — which is correct. But if `unit_tactical_tags` (LV-02) uses INNER JOIN in the coverage aggregation, it silently excludes untagged units from the role coverage analysis. A list of 10 units where 7 have no tags appears to have coverage for only 3 units, which looks like a data bug.

Additionally, PI-04 delta detection will show all units as "no import" rather than "unchanged" on first use. If the UI displays this as a warning delta badge, every unit appears to need attention even though nothing has changed.

**How to avoid:**
- All LV-03 aggregation queries: LEFT JOIN `unit_tactical_tags`, not INNER JOIN.
- PI-04 first-use state: distinguish "never imported" (grey/neutral, no action needed) from "changed since last import" (yellow/delta). Store a `first_import_at` timestamp in a metadata row to detect the first-use case.
- Document in migration SQL comments whether a backfill is intentionally absent (e.g.: "no backfill: users start with no imported points; existing u.points fallback in COALESCE chain is correct").

**Warning signs:**
- Coverage analysis shows 0 units with any role on first load of a populated list.
- Every unit shows a delta badge on first import despite no points change.
- LV-03 query uses `JOIN unit_tactical_tags` without `LEFT`.

**Phase to address:** PI-01 and LV-02 schema migrations.

---

## Technical Debt Patterns

### TD-1: Progress Stored as Booleans Must Follow the 0|1 Cast Convention

SQLite stores booleans as `0 | 1` integers. `unit_recipe_step_progress.completed` will return as a number from tauri-plugin-sql. The project convention is to cast on read (Key Decisions: "0|1 literal types for SQLite booleans"). Every component or hook reading progress must cast: `Boolean(row.completed)` or `!!row.completed`. The bug is subtle: 1 reads as truthy correctly, but 0 reads as falsy — so uncompleted steps display correctly, and the bug only manifests when testing "mark complete / then unmark," which is the less common path in early testing.

### TD-2: Duplicate COALESCE Expressions Across Query Modules

The points COALESCE expression already appears in `getArmyListWithUnits`, `getArmyListReadiness`, and `getArmyReadinessByFaction`. Adding the 5-level variant creates a fourth occurrence. There is no SQL fragment-sharing mechanism (no ORM). A comment in each query module referencing the canonical COALESCE contract — as `armyLists.ts` already does — is the only mitigation. Mark each site with a `// POINTS-CHAIN:` comment for grepping.

### TD-3: Bulk Apply Section Save Loop Is Not Transactional

`duplicateRecipe` and the section-save path use sequential `db.execute()` calls without an explicit transaction. If the Tauri window closes mid-bulk-apply, partial progress rows are written. For 1–3 unit bulk apply this risk is low. For 10+ units selected, consider wrapping in BEGIN/COMMIT if tauri-plugin-sql exposes transaction control. If not, document the partial-write risk and add a cleanup query on app startup that removes orphaned `unit_recipe_step_progress` rows with no matching `unit_recipe_assignments` parent.

---

## UX Pitfalls

### UX-1: Kanban Card Shows Both Template Hint and Applied Progress Simultaneously

Kanban cards (Phase 60) show "current workflow / next step" from workflow metadata. After AR-06, the same card must conditionally show either (a) template-level workflow position hint, or (b) applied recipe progress position, depending on whether an active assignment exists. Displaying both creates visual noise and confuses the user about whether the badge reflects actual completion or just template metadata. The card needs an explicit render branch: `hasAppliedRecipe ? <ProgressBadge /> : <WorkflowHint />`.

### UX-2: Validation Warnings That Fire on Every List Cause Warning Fatigue

LV-01 hard validation warnings include "unknown points" — units with `u.points = 0` and no imported row. Many players intentionally omit points from proxy or WIP entries. If every list with any 0-point unit shows a red hard warning, the validation panel becomes noise that users learn to dismiss reflexively. Reserve red/hard warnings for: points limit exceeded, stale source version detected. Use yellow/soft warnings for: unknown points, unbuilt/unpainted units below readiness threshold.

### UX-3: Recipe Picker for Apply Shows All Recipes Without Faction Filtering

AR-02 offers a recipe picker when assigning to a unit. Without filtering, the picker lists every recipe in the system — faction-wide, other-faction, unrelated miniatures. With 40+ recipes, the picker is unusable. Pre-filter by `painting_recipes.faction_id = unit.faction_id`, or show a "Suggested" group (faction-matched) before an "All Recipes" expansion toggle. The `getRecipeNamesByUnitIds` batch query already filters by `unit_id` — a faction-filtered variant is a small SQL extension.

### UX-4: Points Delta Detection Running on Every Army List Load

PI-04 (delta detection) compares current imported points against a prior snapshot. Running this comparison on every `ArmyListPage` mount is wasteful — most loads have no new import. The delta is only meaningful after a new points import event. Trigger delta detection only on: (a) first mount after a new import (store `last_import_id` in Zustand or a query key), or (b) explicit user request. Cache the delta result with React Query keyed on `["points-delta", lastImportId]`.

---

## "Looks Done But Isn't" Checklist

- [ ] Applied recipe progress persists across recipe edits (not silently wiped by DELETE-all + re-INSERT on recipe_steps)
- [ ] Bulk-applied recipes have independent progress rows per unit (not shared via single assignment_id)
- [ ] `imported_unit_points` migration uses `getDb()` from `src/db/client.ts`, not `rules-client.ts`
- [ ] All COALESCE chain occurrences updated atomically when 5-level chain is added (grep: `COALESCE(alu.points_override`)
- [ ] `getArmyListReadiness` and `getArmyListWithUnits` return consistent totals for the same list with the same chain
- [ ] `getArmyReadinessByFaction` on dashboard: explicitly decided whether it uses simplified or full 5-level chain
- [ ] Stale-points badge does NOT fire after a Wahapedia sync if points source_version has not changed
- [ ] Tactical tag aggregation uses a batch IN query, not per-unit hook calls in a list-rendering loop
- [ ] `useDeleteRecipe` onSuccess invalidates `["applied-recipes"]` and `["unit-recipe-progress"]` keys
- [ ] `unit_recipe_step_progress.completed` is cast to boolean on read (`!!row.completed` or `Boolean(row.completed)`)
- [ ] Untagged units appear in LV-03 coverage analysis (LEFT JOIN on unit_tactical_tags, not INNER JOIN)
- [ ] PI-04 "never imported" state displays differently from "changed since last import"
- [ ] Migration SQL files include a comment explaining whether backfill is intentionally absent

---

## Pitfall-to-Phase Mapping

| Phase / Requirement | Pitfall to Watch | Mitigation |
|---|---|---|
| AR-01 (applied recipe data model) | #1 Template-instance confusion, #6 Shared progress on bulk apply | Stable composite key (recipe_id, order_index) for progress; one assignment row per unit |
| AR-02 (assignment UX) | UX-3 Recipe picker lists all recipes | Pre-filter by faction_id; "Suggested" group first |
| AR-03 (per-unit step completion) | #5 Orphaned progress after recipe edit, TD-1 Boolean cast | Cache invalidation in useDeleteRecipe; cast completed on read |
| AR-05/AR-06 (Kanban/CurrentFocus) | #5 Stale cache, UX-1 Template vs instance display mode | Symmetry rule in useDeleteRecipe; explicit render branch per mode |
| AR-07 (bulk apply) | #6 Shared progress rows, TD-3 Non-transactional loop | Sequential mutateAsync loop; one assignment row per unit |
| PI-01 (points data layer) | #2 Wrong database | CREATE TABLE in migration using client.ts (hobbyforge.db) |
| PI-03 (freshness tracking) | #7 False positive stale after sync | Staleness = source_version mismatch, not time comparison against last_synced_at |
| PI-04 (delta detection) | UX-4 Eager delta on every load, #8 "never imported" confusion | Event-triggered detection keyed on lastImportId; neutral badge for never-imported |
| PI-05 (points resolution chain) | #3 COALESCE inconsistency across query modules | Grep all occurrences; update atomically; LEFT JOIN imported_unit_points |
| LV-01 (hard validation warnings) | #7 False positive stale, UX-2 Warning fatigue | Red = exceeded/stale only; yellow = unknown points |
| LV-02 (tactical tags) | #4 N+1 query trap | Batch IN query; Map<unit_id, string[]> built in hook |
| LV-03 (role coverage) | #4 N+1, #8 Untagged units excluded | LEFT JOIN; GROUP BY in SQL not JS reduce |
| Migration 021+ | #2 Wrong DB, #8 Missing backfill | Verify getDb() import; comment intentional no-backfill in SQL |

---

## Sources

- `src/db/queries/armyLists.ts` — Existing 3-level COALESCE chain, full-replacement UPDATE pattern, N+1 avoidance via IN placeholders and GROUP BY
- `src/db/queries/recipeSections.ts` — DELETE-all + re-INSERT save pattern, ON DELETE CASCADE chain documentation
- `src/db/queries/recipes.ts` — duplicateRecipe sectionIdMap pattern, recipe_steps CASCADE on delete
- `src/db/queries/paintingSessions.ts` — ON DELETE SET NULL for session-recipe FKs, section_name denormalization as the established FK-avoidance pattern
- `src/db/queries/unitOverrides.ts` — hobbyforge.db placement decision for user-curated data surviving syncs
- `src/db/queries/dashboard.ts` — `getArmyReadinessByFaction` uses simplified COALESCE (u.points only) — diverges from army list chain
- `src-tauri/migrations/017_unit_overrides.sql` — "CRITICAL: Lives in hobbyforge.db" comment
- `src-tauri/migrations/018_recipe_sections.sql` — DELETE-all + re-INSERT save pattern, CASCADE chain documented
- `src-tauri/migrations/020_workflow_metadata.sql` — section_name denormalization rationale
- `.planning/PROJECT.md` — Key Decisions table (COALESCE chain evolution, cache invalidation symmetry rule, Boolean 0|1 discipline, wrong-DB history), v0.2.10 requirement list (AR-01 through GD-01)
