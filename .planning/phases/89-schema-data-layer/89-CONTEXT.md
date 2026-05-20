# Phase 89: Schema + Data Layer - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers all database migrations and query-layer changes needed by the entire v0.2.18 Army Lists 3.0 milestone. No UI work. After this phase, the database and TypeScript data layer fully support: ghost/planned units, warlord designation, enhancement assignment, leader attachment, model count tier selection, and stable unit ordering. Downstream phases build UI on top of these foundations.

</domain>

<decisions>
## Implementation Decisions

### Enhancement Storage Model
- **D-01:** Enhancements use a dedicated join table `army_list_enhancements` (not columns on `army_list_units`). Cleaner for max-3-per-list validation queries, avoids wasted NULLs on non-character units. Columns: `id`, `list_id FK`, `army_list_unit_id FK`, `enhancement_name TEXT`, `enhancement_points INTEGER`, `created_at`. Enhancement name and points are TEXT/INTEGER copies (not FK to synced_enhancements) per the established denormalization pattern — synced tables are DELETE-all + re-INSERT on every sync (Pitfall 1, 2).
- **D-02:** Enhancement points are tracked separately from the COALESCE chain. They are summed at the list level (SUM of `army_list_enhancements.enhancement_points` for the list) and added to the summary bar total alongside the per-unit effective_points sum. They do NOT flow through the per-unit COALESCE expression.

### Leader Attachment
- **D-03:** Leader attachment is a column on `army_list_units`: `leader_attached_to_id INTEGER REFERENCES army_list_units(id) ON DELETE SET NULL`. This is a 1:1 relationship (one leader attaches to one target unit row). SET NULL so removing the target unit row unlinks the leader rather than cascading a delete. No separate join table needed.

### Ghost / Planned Units
- **D-04:** Ghost units use nullable `unit_id` on `army_list_units` plus a `ghost_unit_name TEXT` column. When `unit_id IS NULL` and `ghost_unit_name IS NOT NULL`, the row is a planned entry. A CHECK constraint enforces `CHECK (unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL)` so rows always have identity.
- **D-05:** The `unit_id` FK constraint changes from `NOT NULL REFERENCES units(id) ON DELETE RESTRICT` to nullable `REFERENCES units(id) ON DELETE RESTRICT`. SQLite does not support ALTER COLUMN — this requires recreating `army_list_units` via the rename-create-copy-drop pattern in a migration.
- **D-06:** Ghost unit points resolve from synced data via name-based join (same pattern as existing `sup.unit_name = u.name`). For ghost units, `ghost_unit_name` is used for the synced_unit_points join. The COALESCE chain uses CASE WHEN to branch: real units join via `u.name`, ghost units join via `ghost_unit_name`.
- **D-07:** Ghost units do NOT appear in Collection, Dashboard stats, or Kanban. This is enforced by the existing query patterns — those queries read from `units` table directly, not through `army_list_units`. No additional filtering needed.

### COALESCE Chain Extension
- **D-08:** Add `selected_model_count INTEGER` column on `army_list_units` (nullable — NULL means default/min tier). Join to `synced_unit_point_tiers` to resolve tier-specific points. New 6-level chain: `COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)` where `tier.points` comes from a LEFT JOIN on `synced_unit_point_tiers` matching `(unit_name, faction_id, selected_model_count)`.
- **D-09:** The COALESCE chain update MUST be applied atomically across all 3 query sites in the same commit: `getArmyListWithUnits`, `getArmyListReadiness`, and `resolveUnitPoints()`. Grep for `COALESCE(alu.points_override` to find all sites.

### Warlord Flag
- **D-10:** Add `is_warlord INTEGER NOT NULL DEFAULT 0` column on `army_list_units`. Enforcement of one-per-list is in the mutation function (deselect-then-select pattern matching `activateLoadout`), not via SQL trigger. The mutation sets all rows in the list to `is_warlord = 0` then sets the target row to `1`.

### Stable Insertion Order
- **D-11:** The `getArmyListWithUnits` query already uses `ORDER BY alu.created_at ASC` (armyLists.ts line 72). Verify this produces stable ordering. If `created_at` has second-level granularity (datetime('now')), rapid inserts within the same second may not be stable. If needed, add `ORDER BY alu.id ASC` as tiebreaker (autoincrement IDs are monotonically increasing).

### Migration Strategy
- **D-12:** Single migration file `031_army_list_v3.sql` containing all schema changes for Phase 89. The table recreation (for nullable unit_id) and all new columns/tables go in one migration. Must be registered in `lib.rs` immediately.
- **D-13:** New nullable columns added to `army_list_units` that the user should be able to clear back to NULL each get a dedicated clear function (following `clearArmyListDetachment` pattern from Pitfall 5/14).

### Claude's Discretion
- Query function naming and signature design
- Whether to extend `resolveUnitPoints()` lib function or keep it SQL-only
- TypeScript type design for new interfaces (ghost unit type unions, enhancement types)
- Test fixture design for the COALESCE chain validation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Army List Data Layer
- `src/db/queries/armyLists.ts` — Current CRUD functions, COALESCE chain (3 sites), clearArmyListDetachment/clearArmyListPointsLimit patterns
- `src/types/armyList.ts` — ArmyList, ArmyListUnit, ArmyListUnitRow interfaces, TACTICAL_ROLES
- `src/hooks/useArmyLists.ts` — React Query hooks, cache key definitions, invalidation patterns

### Schema References
- `src-tauri/migrations/001_core_schema.sql` — Original army_lists + army_list_units table definitions
- `src-tauri/migrations/025_tactical_role.sql` — Added tactical_role to army_list_units
- `src-tauri/migrations/029_synced_point_tiers.sql` — synced_unit_point_tiers structure
- `src-tauri/migrations/030_bsdata_extended.sql` — synced_enhancements, synced_loadout_options, synced_model_counts, synced_leader_targets

### Points Resolution
- `src/lib/resolveUnitPoints.ts` — Centralized pure function for points computation (PV-01)

### Research
- `.planning/research/FEATURES.md` — Feature landscape, 10th ed rules summary, dependency graph
- `.planning/research/PITFALLS.md` — 14 pitfalls with prevention strategies (critical: Pitfall 1-5)
- `.planning/research/ARCHITECTURE.md` — Architecture analysis

### Project Context
- `.planning/REQUIREMENTS.md` — DL-03, DL-04 are this phase's requirements
- `.planning/ROADMAP.md` — Phase 89 success criteria (5 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `clearArmyListDetachment()` / `clearArmyListPointsLimit()`: Template for dedicated NULL-clear functions for new nullable columns
- `activateLoadout()` in `unitLoadouts.ts`: Deselect-then-select pattern reusable for warlord toggle
- `replaceSynced*()` functions in `bsdataExtended.ts`: Understanding these is critical — they DELETE-all + re-INSERT, which is why all references to synced tables must be TEXT copies
- `getArmyListReadiness()`: Second COALESCE site that must be updated atomically

### Established Patterns
- TEXT denormalization for cross-DB and synced-table references (weapon_name, detachment_name pattern)
- Full-replacement UPDATE for army_list_units (NOT COALESCE) — points_override must be clearable to NULL
- COALESCE UPDATE for army_lists with dedicated clear functions for nullable columns
- Cache invalidation symmetry: every mutation invalidates `ARMY_LISTS_KEY`, `ARMY_LIST_KEY(id)`, `ARMY_LIST_UNITS_KEY(id)`, `["dashboard-stats"]`, `["army-list-readiness"]`
- Migration registration in `src-tauri/src/lib.rs` — mandatory for every new .sql file

### Integration Points
- `getArmyListWithUnits()` (armyLists.ts:52-76): Main query that must be extended for ghost units (UNION or CASE WHEN), tier points (new LEFT JOIN), warlord flag, leader attachment
- `getArmyListReadiness()` (armyLists.ts:223-245): Must mirror COALESCE chain changes
- `ArmyListUnitRow` interface (armyList.ts:43-54): Must be extended with new fields
- `useAddUnitToList` hook: Will need a parallel `useAddGhostUnitToList` or unified mutation accepting nullable unit_id

</code_context>

<specifics>
## Specific Ideas

- Enhancement points snapshot: store `enhancement_points INTEGER` at assignment time so the list total remains stable even if synced data changes on next sync. Display a "stale" badge if current synced price differs from stored price.
- Ghost unit identity: `ghost_unit_name` should match the BSData/Wahapedia canonical name exactly (from rw_datasheets.name or synced_unit_points.unit_name) so points resolve correctly via the existing name-based join pattern.
- The table recreation migration for nullable unit_id must preserve all existing data and existing columns (including tactical_role from migration 025). Use the standard SQLite rename-create-copy-drop pattern.

</specifics>

<deferred>
## Deferred Ideas

- Loadout option storage (selected wargear choices) — Phase 90 concern, display-only since wargear is free
- Enhancement validation UI (max 3, no duplicates, character-only) — Phase 91
- Leader attachment visual grouping — Phase 92
- DatasheetBrowserDialog for adding ghost units — Phase 93
- `canonical_name TEXT` on `unit_rules_mapping` for better BSData name matching (Pitfall 9) — consider for Phase 90

None — discussion stayed within phase scope

</deferred>

---

*Phase: 89-Schema + Data Layer*
*Context gathered: 2026-05-20*
