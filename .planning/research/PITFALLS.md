# Domain Pitfalls

**Domain:** Smart army list builder — loadout configuration, rules linking, list export, version snapshots, "unowned" unit planning added to dual-database HobbyForge
**Milestone:** v0.2.18 Army Lists 3.0
**Researched:** 2026-05-20
**Confidence:** HIGH — all pitfalls derived directly from reading the live codebase: armyLists.ts, unitLoadouts.ts, unitRulesMapping.ts, syncedUnitPoints.ts, bsdataExtended.ts, datasheets.ts, rulesExtended.ts, rulesSnapshot.ts, and the full migration chain through migration 030.

---

## Critical Pitfalls

Mistakes that cause data loss on sync, silent corruption, or rewrites.

---

### Pitfall 1: Storing loadout choices as FK references to synced tables

**What goes wrong:** A new `army_list_unit_loadout_choices` table stores `loadout_option_id INTEGER REFERENCES synced_loadout_options(id)`. On the next Wahapedia sync, `replaceSyncedLoadoutOptions()` executes `DELETE FROM synced_loadout_options` inside a transaction, then re-INSERTs every row. All stored integer IDs are now invalid — either pointing at rows with different auto-increment values, or pointing at nothing. SQLite FK enforcement is OFF by default; hobbyforge.db only enables it via `PRAGMA foreign_keys = ON` on each connection (client.ts). The synced tables themselves have no FK references *from* them, so the dangling references in the new table are not caught at write time either.

**Why it happens:** The four BSData-derived tables in hobbyforge.db — `synced_enhancements`, `synced_loadout_options`, `synced_model_counts`, `synced_leader_targets` — are all managed by `replaceSynced*` functions that do DELETE-all + re-INSERT (see bsdataExtended.ts). Their auto-increment IDs reset after each sync. Any column storing an ID from these tables is a time bomb.

**Consequences:** User builds a loadout "Intercessors: Bolt Rifle, Power Fist". After next sync, the stored `loadout_option_id` values point at new rows that map to different options, or return NULL on LEFT JOIN. The army list silently shows the wrong wargear or points.

**Prevention:** Follow the established `weapon_name TEXT` copy pattern from `unit_loadout_wargear` (migration 011, line 33: "weapon_name mirrors rw_datasheets_wargear.name (TEXT copy, not FK -- cross-DB)"). Store `group_name TEXT` and `option_name TEXT` as denormalized copies. The composite natural key `(unit_name, faction_id, group_name, option_name)` has a UNIQUE constraint on `synced_loadout_options` — use it for lookup at read time, not as a stored reference.

**Detection:** Before writing any new schema column referencing `synced_*` tables: check whether the target table is managed by a `replaceSynced*` function. If yes, the only safe reference is a TEXT copy of a business-meaningful field.

**Phase:** Schema design phase — before any migration is written.

---

### Pitfall 2: Enhancement assignment stored as detachment_id INTEGER/TEXT from rules.db

**What goes wrong:** Per-unit enhancement assignment stores `detachment_id TEXT` referencing `rw_detachments.id` in rules.db. After the next Wahapedia sync, that detachment ID may no longer exist (rules.db is fully deleted and recreated on every sync). The enhancement name and its points vanish from the army list total.

**Why it happens:** `army_lists` already solved this correctly for the list-level detachment by storing `detachment_name TEXT` as a denormalized copy (armyLists.ts lines 81–83 and `clearArmyListDetachment`). But when implementing per-unit enhancement assignment, it is tempting to store only the `rw_detachments.id` reference from the current session because the picker already has that ID available.

**Consequences:** After sync, the enhancement silently disappears from points totals. The only symptom is a discrepancy between the stored army list points and the displayed total — a hard bug to trace.

**Prevention:** Store enhancement assignment as `enhancement_name TEXT` (denormalized copy from `synced_enhancements.name`) and `enhancement_points INTEGER` (snapshot of points at assignment time). At render time, look up the current row in `synced_enhancements` for comparison; if not found, display the stored name with a "stale" badge rather than hiding the row. This mirrors the `detachment_name` pattern on `army_lists`.

**Detection warning sign:** Any column referencing `rw_detachments`, `rw_stratagems`, or any `rw_*` table in rules.db must survive `DELETE FROM rw_*` — which means only TEXT copies.

**Phase:** Schema design phase. The enhancement column on `army_list_units` must be TEXT, not a reference ID.

---

### Pitfall 3: Breaking the 5-level COALESCE chain when adding loadout points

**What goes wrong:** The effective points computation is currently:
```sql
COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)
```
This expression appears in three places: `getArmyListWithUnits` (armyLists.ts line 65), `getArmyListReadiness` (armyLists.ts line 232), and `resolveUnitPoints()` in `src/lib/`. A loadout points adjustment (e.g., a `loadout_points_delta INTEGER` column on `army_list_units`) is inserted in the wrong priority position in one call site but not the others, or the adjustment is computed in JavaScript rather than SQL — causing Dashboard readiness points to disagree with army list totals.

**Why it happens:** Adding a new points source to three independent SQL expressions requires updating all three consistently. The COALESCE divergence bug pattern is documented in CONTEXT.md under `resolveUnitPoints()` (Key Decisions row for PV-01). Missing one call site is easy.

**Consequences:** Army list detail shows one total; Game Day pre-game panel shows another; Dashboard ArmyReadinessCard shows a third. All are reading from the same data but using different COALESCE expressions.

**Prevention:** Search for `COALESCE(alu.points_override` across all `.ts` files before writing the new column. Every occurrence must be updated atomically in the same phase. Then update `resolveUnitPoints()` in `src/lib/` to match. Add a test asserting that all three query sites return the same `effective_points` for a fixture that exercises the new points source.

**Detection:** After implementing loadout points, compare effective_points between the army list page, Game Day mode, and Dashboard for the same unit. Any disagreement = divergent COALESCE.

**Phase:** Points computation phase. Treat the COALESCE extension as an atomic multi-file change with no partial commits.

---

### Pitfall 4: "Planned" unowned units stored as phantom rows in the `units` table

**What goes wrong:** To support adding rules-only datasheets to an army list (units the user does not own yet), a developer INSERTs a `units` row with a hypothetical `is_owned = 0` flag. This phantom row immediately appears in the Collection page, the Kanban board, Dashboard stats ("4 unbuilt units"), and all painting/readiness calculations. The "battle-ready percentage" drops because phantom rows count as not-painted.

**Why it happens:** `army_list_units.unit_id` is a NOT NULL FK to `units(id)`. The path of least resistance to add a non-collection unit is to create a `units` row for it. But every hook and query reading `units` — `useUnits`, `getDashboardStats`, `getKanbanUnits`, etc. — will pick up phantom rows without any filter.

**Consequences:** Collection page shows units the user never bought. Dashboard stats are wrong. The `getArmyListsByUnitId` delete-prevention check fires for phantom units. These are foundational data integrity bugs that corrupt the hobby tracking purpose of the app.

**Prevention:** Do not use `units` rows for planned entries. Add a nullable `planned_datasheet_id TEXT` and `planned_datasheet_name TEXT` to `army_list_units` alongside a nullable `unit_id`. When `unit_id IS NULL` and `planned_datasheet_name IS NOT NULL`, the row is a "planned" entry. `getArmyListWithUnits` becomes a UNION of real units (JOIN units) and planned units (no JOIN, use denormalized fields). A CHECK constraint `CHECK (unit_id IS NOT NULL OR planned_datasheet_name IS NOT NULL)` prevents both being NULL.

**Detection:** Before any INSERT into `units`, ask: "Should this row appear in the Collection page?" If no, it does not belong in `units`.

**Phase:** Schema design phase for the unowned-unit feature. This is a foundational modeling decision that must be locked before any UI is built on top.

---

### Pitfall 5: COALESCE blocking NULL-clear on new nullable columns added to army_lists

**What goes wrong:** New columns added to `army_lists` in this milestone — for example, `list_format TEXT`, `enhancement_budget INTEGER` — are added to `updateArmyList`'s existing COALESCE UPDATE:
```sql
SET enhancement_budget = COALESCE($N, enhancement_budget)
```
This means the user can never clear `enhancement_budget` back to NULL. The COALESCE always preserves the old value when `null` is passed.

**Why it happens:** This exact class of bug already produced two remediation functions: `clearArmyListDetachment` (armyLists.ts lines 119–129) and `clearArmyListPointsLimit` (lines 133–145). Both exist because `updateArmyList` uses COALESCE which blocks NULL passthrough. Adding new nullable columns to the same COALESCE UPDATE without adding a corresponding clear function repeats the bug.

**Prevention:** For every nullable column added to `army_lists` in this milestone: if the user should be able to clear it to NULL, add a dedicated `clearArmyList[Field](id: number)` function immediately in the same commit. Do not add it to the COALESCE UPDATE. The existing pattern in armyLists.ts is the template.

**Phase:** Schema extension phase — any phase that adds a nullable column to `army_lists` or `army_list_units`.

---

## Moderate Pitfalls

---

### Pitfall 6: Version snapshot bloat from JSON blob storage

**What goes wrong:** Each version snapshot serializes the complete army list state — all units, loadout choices, enhancement assignments, points — as a single TEXT blob in a `snapshot_data` column. After 10–20 versions per list, the table is large and comparisons require deserializing two blobs and diffing them in JavaScript.

**Why it happens:** The `rules_snapshot` table (rulesSnapshot.ts) already demonstrates this pattern and caps it at 3 groups via `cleanOldSnapshots(3)`. A naive list version implementation without a cap or normalization strategy grows unboundedly and makes SQL-level diffing impossible.

**Consequences:** Comparing "v2 vs v3" of a list requires fetching and deserializing both blobs. Adding a unit in v3 shows as "all units changed" if diffing by array index rather than stable ID. The data structure cannot be queried without deserialization.

**Prevention:** Normalize snapshots: a `army_list_versions` parent table with an `id`, `list_id`, `name`, and `created_at`, plus a child `army_list_version_units` table (one row per unit entry: `unit_name TEXT`, `effective_points INTEGER`, `loadout_summary TEXT`, `enhancement_name TEXT`, `unit_order INTEGER`). Store points as integers at snapshot time so they don't need re-computation. Cap at 10 versions per list using the same `cleanOldSnapshots` pattern. Key diffs by `unit_order` (stable position in the list) or by a `snapshot_unit_key TEXT` (e.g., `unit_name + slot_index` for de-duplication).

**Detection warning:** Any `snapshot_data TEXT` column holding a serialized object longer than a single denormalized string.

**Phase:** Version snapshot schema design phase — decide normalization strategy before writing the migration.

---

### Pitfall 7: Version snapshot diff using array index instead of stable key

**What goes wrong:** The version comparison UI renders "before" and "after" unit lists by array index. A unit is removed from position 2, causing all subsequent units to shift. The diff shows every unit after position 2 as "changed" even though only one was removed.

**Why it happens:** Array-index diffing is the naive approach. The established pattern in this codebase is identity-based tracking: `recipe_step_id` keys step progress (migration 028, DI-01), not `order_index`. The same principle applies to list snapshots.

**Prevention:** Build `Map<stableKey, snapshotRow>` for each version and compare by key. For unit rows where the same unit can appear multiple times in one list (no UNIQUE constraint on `(list_id, unit_id)` per armyList.ts line 8), use `(unit_name + slot_position)` as the composite key, or assign a stable `slot_id TEXT` (UUID) at first insertion and carry it through snapshots.

**Phase:** Version snapshot comparison UI phase.

---

### Pitfall 8: PDF export expecting browser-grade print support in Tauri WebView2

**What goes wrong:** The developer uses `window.print()` or a `@media print` CSS stylesheet to generate export PDFs. In Tauri's WebView2 on Windows, `window.print()` opens the system Windows print dialog and cannot: auto-save to a file path, control filenames, or guarantee print CSS fidelity. The output often truncates at page boundaries and the dialog UX is jarring inside a desktop app.

**Why it happens:** In a browser, `window.print()` is acceptable for print-to-PDF. In a Tauri WebView, the behavior is identical to the OS print system with no programmatic control — the existing `VACUUM INTO` Rust command was introduced precisely because similar limitations blocked JS-side SQLite operations. The same constraint applies here.

**Consequences:** "Export to PDF" delivers a poor UX: system dialog appears, formatting breaks on page breaks, file cannot be auto-saved. The feature feels unfinished.

**Prevention:** Prioritize export in this order: (1) Text/clipboard — `navigator.clipboard.writeText()`, no Tauri API needed, ships fastest. (2) Plain-text file — `@tauri-apps/plugin-dialog` `save()` to get a path, `@tauri-apps/plugin-fs` `writeTextFile()`. (3) Print/PDF — only via a new Rust Tauri command using a headless HTML-to-PDF Rust crate (e.g., `headless_chrome` or `wkhtmltopdf` wrapper), or `window.print()` with explicit documentation of its limitations. Do not promise "save to PDF" without the Rust command.

**Detection:** Prototype `window.print()` in the actual Tauri window (not `pnpm dev` Vite mode) before committing to the feature. The system dialog behavior is only visible in the Tauri context.

**Phase:** Export phase. Decide output format scope before building any export UI.

---

### Pitfall 9: Loadout option lookup failing on unit name variants

**What goes wrong:** `synced_loadout_options` is keyed by `unit_name TEXT`. The loadout builder looks up options via `WHERE unit_name = u.name`. If the user named their collection unit "Intercessors Squad" or "Primaris Intercessors" while BSData stores it as "Intercessors", the lookup returns zero results silently. No error is raised — LEFT JOIN returns NULL rows.

**Why it happens:** The same name-matching problem exists in `getArmyListWithUnits` for `synced_unit_points` — the join is `ON sup.unit_name = u.name` (armyLists.ts line 69). Points fallback gracefully to `u.points`; loadout options have no fallback value, so the result is simply "no options available."

**Prevention:** Route loadout option lookups through `unit_rules_mapping.rules_datasheet_id` when available. The datasheet record in rules.db has the canonical name matching BSData. Add a `canonical_name TEXT` column to `unit_rules_mapping` populated at mapping confirmation time, and use that as the join key for all BSData lookups instead of the user-facing collection unit name.

**Detection:** Test loadout option display on a unit whose collection name differs from the BSData name by any substring (e.g., "Intercessors" vs "Primaris Intercessors"). Zero results from the lookup is the symptom.

**Phase:** Loadout data layer phase — extend `unit_rules_mapping` before building the loadout UI.

---

### Pitfall 10: Nested Sheet/Dialog for the loadout builder

**What goes wrong:** The loadout builder is implemented as a Dialog opened from inside the ArmyList Sheet (the unit configuration row triggers a Dialog, while the Sheet is still open). Radix UI portals do not compose cleanly when nested — z-index stacking, focus trapping, scroll locking, and Escape key handling all break in ways that are WebView2-specific and difficult to diagnose.

**Why it happens:** This is a known established pitfall in the codebase (CONTEXT.md Key Decisions: "Sibling Sheet/Dialog portal pattern" and "PlaybookTab SheetHeader/Footer outside Tabs"). Nested Radix portals cause z-index and context issues. The temptation is to put the loadout Dialog inside the army list Sheet because that is where the trigger lives.

**Prevention:** Follow the established sibling portal pattern: the loadout Dialog and the army list Sheet are siblings in the React tree, both rendered at the page level. The unit row emits an `onConfigureLoadout(unitRowId)` callback to the page. The page holds `configureLoadoutRowId: number | null` in state. The Dialog renders at page level, not inside the Sheet. This is the same pattern used across all existing Sheet/Dialog interactions.

**Detection:** If any `<Dialog>` or `<Sheet>` appears inside the render output of another `<Sheet>` or `<Dialog>`, stop and refactor to the sibling pattern.

**Phase:** Loadout builder UI phase.

---

### Pitfall 11: Missing cache invalidation for new army-list-adjacent mutations

**What goes wrong:** A new `useAssignEnhancement` mutation invalidates `["army-lists", listId]` but forgets `["army-list-readiness"]` and `["dashboard-stats"]`. The army list detail updates correctly but the Dashboard ArmyReadinessCard still shows stale points until the user navigates away and back.

**Why it happens:** The cache invalidation symmetry rule (CONTEXT.md Key Decisions: "Cache invalidation symmetry rule — If useCreate invalidates a key, useDelete must too") applies across all mutations touching army list data. With this milestone, there are at least four dependent cache keys: `["army-lists", listId]`, `["army-list-readiness"]`, `["dashboard-stats"]`, and any new `["army-list-versions"]` key. Missing any one produces stale data on the surfaces that read from it.

**Prevention:** Before writing any mutation hook in this milestone, enumerate all cache keys that read from `army_list_units` or any new table affecting army list totals. Put the complete list in the phase plan as a checklist. Every mutation that writes to these tables must invalidate the full set. Treat the invalidation set audit as a mandatory step, not an afterthought.

**Detection:** After implementing any mutation, check the Dashboard ArmyReadinessCard and Game Day points panel without navigating away. Stale values = missing invalidation.

**Phase:** Every phase that adds a mutation hook.

---

## Minor Pitfalls

---

### Pitfall 12: Forgetting to register new migrations in lib.rs

**What goes wrong:** A new `031_army_list_versions.sql` migration file is created in `src-tauri/migrations/` but not registered in `lib.rs`'s `get_migrations()` vector. The app builds without error. On first launch with an empty data directory, the `army_list_versions` table does not exist and the first INSERT returns a "no such table" error toast.

**Why it happens:** This exact bug was fixed in Phase 68 (MIG-01) for migrations 018–021. The fix is not structural — every new migration file requires a corresponding manual entry in `lib.rs`.

**Prevention:** After creating any `.sql` migration file, immediately add the entry in `lib.rs` before closing the change. Treat the SQL file and the `lib.rs` entry as a single atomic change. The next version number is `(current highest) + 1` — currently 30, so the next is 31.

**Phase:** Any phase adding a migration.

---

### Pitfall 13: Loadout exclusivity not enforced in the mutation function

**What goes wrong:** `synced_loadout_options.is_exclusive` flags mutually exclusive options within a group (e.g., only one weapon type per model). The UI shows a radio/select, but if a second exclusive option is selected programmatically or via a race condition, two rows with `is_exclusive = 1` for the same `(army_list_unit_id, group_name)` exist in the choices table. Points are now double-counted.

**Why it happens:** Exclusivity is a business rule that UI guards alone cannot guarantee — especially when bulk operations or future programmatic list construction bypass the UI.

**Prevention:** Enforce the exclusivity rule in the mutation function, not just the UI. When `is_exclusive = 1`, DELETE all other selections for the same `(army_list_unit_id, group_name)` before inserting the new one. This is the same two-step deactivate-then-activate pattern used in `activateLoadout` (unitLoadouts.ts lines 68–77).

**Phase:** Loadout builder data layer phase.

---

### Pitfall 14: updateArmyList COALESCE blocks clearing detachment when switching lists

**What goes wrong:** This is an existing caveat, not a new one, but it is relevant when the loadout builder adds more columns. `updateArmyList` uses COALESCE for all fields (lines 88–112). The `clearArmyListDetachment` and `clearArmyListPointsLimit` escape hatches exist specifically because COALESCE blocks NULL passthrough. When the loadout builder or enhancement feature introduces new nullable columns on `army_lists` or `army_list_units`, re-reading the existing pattern must happen first to avoid repeating the mistake.

**Prevention:** Read armyLists.ts lines 119–145 before adding any nullable column. If the user should be able to clear it, add the clear function immediately.

**Phase:** Schema extension phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Schema design (new tables) | Pitfall 1: FK to DELETE-able synced tables | TEXT denormalized copies for all synced-data references |
| Schema design (unowned units) | Pitfall 4: Phantom units in collection | Planned entries on army_list_units level, not units table |
| Schema design (nullable columns) | Pitfall 5 + 14: COALESCE blocks NULL-clear | Dedicated clearArmyList[Field]() for every new nullable column |
| Migration files | Pitfall 12: Missing lib.rs entry | SQL file + lib.rs entry = single atomic change |
| Points computation | Pitfall 3: COALESCE divergence | Grep all COALESCE call sites, update atomically with test |
| Enhancement assignment | Pitfall 2: detachment_id stored instead of name | Store enhancement_name TEXT + points INTEGER snapshot |
| Version snapshots | Pitfall 6: JSON blob | Normalize as rows, cap at 10 per list |
| Version snapshot diff | Pitfall 7: Index-based diff | Key by stable unit identity, not array position |
| Loadout builder UI | Pitfall 10: Nested Sheet/Dialog | Sibling portal pattern at page level |
| Loadout data layer | Pitfall 9: Name variant mismatch | Route through unit_rules_mapping canonical_name |
| Loadout data layer | Pitfall 13: Exclusivity not in mutation | DELETE-then-INSERT in mutation function |
| Export | Pitfall 8: PDF from Tauri | Text/file first; print only with explicit WebView2 limitation acceptance |
| Any new mutation hook | Pitfall 11: Missing cache invalidation | Enumerate all dependent cache keys before writing any mutation |

---

## Sources

- `src/db/queries/armyLists.ts` — COALESCE chain, clearArmyListDetachment, clearArmyListPointsLimit patterns
- `src/db/queries/unitLoadouts.ts` — activateLoadout two-step pattern, weapon_name TEXT copy
- `src/db/queries/unitRulesMapping.ts` — rules_datasheet_id TEXT copy, name-based matching
- `src/db/queries/syncedUnitPoints.ts` — DELETE-all + re-INSERT pattern for synced tables
- `src/db/queries/bsdataExtended.ts` — replaceSynced* functions for all four BSData tables
- `src/db/queries/datasheets.ts` — cross-DB lookup patterns, getFullDatasheet
- `src/db/queries/rulesSnapshot.ts` — cleanOldSnapshots pattern
- `src-tauri/migrations/011_point_tiers_loadouts.sql` — weapon_name TEXT copy comment
- `src-tauri/migrations/026_unit_rules_mapping.sql` — rules_datasheet_id TEXT copy comment
- `src-tauri/migrations/029_synced_point_tiers.sql` — synced table structure
- `src-tauri/migrations/030_bsdata_extended.sql` — synced_enhancements, synced_loadout_options schema
- `.planning/PROJECT.md` — Key Decisions log (COALESCE chain, detachment_name, weapon_name, sibling portal, cache invalidation symmetry, resolveUnitPoints, updateArmyListUnit full-replacement)

---
*Pitfalls research for: Army Lists 3.0 (smart list builder) features added to HobbyForge v0.2.18*
*Researched: 2026-05-20*
