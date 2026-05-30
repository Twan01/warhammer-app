# Phase 106: Army List Simplification - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase rewires army list points resolution from the 6-level COALESCE chain (which uses `synced_unit_points` + `synced_unit_point_tiers` name-based lookups) to a direct FK join through `units.udb_unit_id` → `udb_points`. It updates army list validation to use database-sourced keywords and roles for structural checks (CHARACTER, BATTLELINE, etc.), and removes the `synced_unit_points` cache table along with all code that populated and consumed it. No rules.db changes (Phase 107), no schema changes to `udb_*` tables, no UI layout changes.

</domain>

<decisions>
## Implementation Decisions

### Points Resolution — Simplified COALESCE Chain
- **D-01:** The current 6-level chain `COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)` is replaced with a 5-level chain: `COALESCE(alu.points_override, udb_tier.points, udb_base.points, uo.points, u.points, 0)`. The two `synced_unit_points`/`synced_unit_point_tiers` name-based LEFT JOINs are replaced by FK-based LEFT JOINs through `u.udb_unit_id` → `udb_points`.
- **D-02:** Tier-based points join: `LEFT JOIN udb_points udb_tier ON udb_tier.unit_id = u.udb_unit_id AND udb_tier.model_count = alu.selected_model_count`. This replaces the name-based `synced_unit_point_tiers` join.
- **D-03:** Base points join (no model count match — fallback for units without tier selection): `LEFT JOIN udb_points udb_base ON udb_base.unit_id = u.udb_unit_id AND udb_base.model_count = (SELECT MIN(model_count) FROM udb_points WHERE unit_id = u.udb_unit_id)`. This replaces the name-based `synced_unit_points` join. Claude's discretion on whether the MIN subquery or a different approach is most efficient.
- **D-04:** Ghost units (`unit_id IS NULL`, therefore no `udb_unit_id` path) resolve to 0 via the final COALESCE fallback. Users can still set `points_override` on ghost units for manual point assignment. No new handling needed.
- **D-05:** The same COALESCE chain change must be applied to both `getArmyListWithUnits()` and `getArmyListReadiness()` in `armyLists.ts` — they use the same 6-level pattern today.

### Validation — Database Keywords and Roles
- **D-06:** Army list validation is enhanced to use `udb_units.role` and `udb_keywords` for structural checks. The `getArmyListWithUnits()` query is enriched to include the unit's database role (from `udb_units.role` via FK join) and a flag or list of keywords from `udb_keywords`.
- **D-07:** `computeUnitWarnings()` is extended with new warnings based on database role: at minimum, flag units where the database role doesn't match the army list's expected composition (e.g., too few BATTLELINE units, CHARACTER keyword for warlord validation). The exact warning conditions follow the existing pattern (soft warnings in the `warnings` array).
- **D-08:** `computeListWarnings()` is extended with a new list-level warning for BATTLELINE count: minimum 3 BATTLELINE units for standard 2000pt lists (following 10th edition army construction rules). The threshold is parameterized so it can be adjusted.
- **D-09:** For unlinked units (`udb_unit_id IS NULL`), keyword/role validation is skipped — no database data available. These units only get the existing warnings (not painted, not assembled, etc.).

### synced_unit_points Removal
- **D-10:** The `synced_unit_points` table and `synced_unit_point_tiers` table are removed via a new migration that DROPs both tables.
- **D-11:** The `src/db/queries/syncedUnitPoints.ts` query module is deleted entirely. The `replaceSyncedUnitPoints()` function and all related code are removed.
- **D-12:** All LEFT JOINs to `synced_unit_points` and `synced_unit_point_tiers` across the codebase are removed (primarily in `armyLists.ts` and `unitRulesMapping.ts`).
- **D-13:** The sync pipeline code that populated `synced_unit_points` after Wahapedia sync is cleaned up. Any hooks or triggers that called `replaceSyncedUnitPoints()` are removed. The broader sync pipeline teardown (rules.db elimination) is Phase 107 scope.
- **D-14:** The `unit_overrides` table and its query layer remain — they serve a different purpose (user manual overrides, not sync cache).

### unit_rules_mapping Simplification
- **D-15:** The `unit_rules_mapping` bridge table's role in points resolution is reduced. Currently it provides `datasheet_name` as the join key for `synced_unit_points`. With the FK-based join through `udb_unit_id`, the mapping is no longer needed for points. Its other uses (if any beyond points) are preserved; if it's only used for points, it can be cleaned up in this phase.
- **D-16:** The `findMatchingDatasheets()` function in `unitRulesMapping.ts` that searches `synced_unit_points` for ambiguity detection is updated or removed based on whether it has remaining callers after the FK-based approach.

### Claude's Discretion
- Exact SQL optimization for the base points subquery (MIN model_count vs. a simpler approach)
- Whether to use a subquery, CTE, or window function for enriching rows with keywords
- Migration number (likely 040, but confirm latest migration sequence)
- Whether `unit_rules_mapping` can be fully removed in this phase or just simplified
- Exact warning message text for BATTLELINE count and role validation
- Whether to add a points freshness indicator (the existing "stale points" warning may need updating since synced_unit_points was the freshness source)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Points Resolution (primary target)
- `src/db/queries/armyLists.ts` — `getArmyListWithUnits()` (line 60-93) and `getArmyListReadiness()`: contain the 6-level COALESCE chain and synced_unit_points LEFT JOINs that must be rewritten
- `src/db/queries/syncedUnitPoints.ts` — Query module for synced_unit_points CRUD — entire file to be deleted
- `src/db/queries/unitRulesMapping.ts` — Bridge table queries; `findMatchingDatasheets()` searches synced_unit_points

### Validation
- `src/lib/computeUnitWarnings.ts` — `computeUnitWarnings()`, `computeListWarnings()`, `computeListHealthStats()` — pure functions to extend with keyword/role validation
- `src/types/armyList.ts` — `ArmyListUnitRow` type must be extended with database role and keyword fields

### Database Schema (FK join targets)
- `src-tauri/migrations/038_udb_schema.sql` — `udb_units` (has `role` column), `udb_points` (has `unit_id` + `model_count` + `points`), `udb_keywords` (has `unit_id` + `keyword`)
- `src-tauri/migrations/029_synced_point_tiers.sql` — Tables being removed: `synced_unit_points`, `synced_unit_point_tiers`
- `src-tauri/migrations/039_collection_udb_link.sql` — `units.udb_unit_id` FK column (the join path)

### Collection FK (from Phase 105)
- `src/types/unit.ts` — Unit interface with `udb_unit_id: string | null`
- `src/db/queries/units.ts` — Collection unit CRUD with udb_unit_id support

### Prior Phase Context
- `.planning/phases/103-data-acquisition-schema/103-CONTEXT.md` — D-03/D-04: Wahapedia string IDs for udb_units, D-11/D-12: import transaction pattern
- `.planning/phases/105-collection-integration/105-CONTEXT.md` — D-01/D-02: FK schema, D-08: faction ID mapping

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` § "Army List Integration" — ALI-01 through ALI-03
- `.planning/ROADMAP.md` § "Phase 106" — Success criteria (3 items)
- `.planning/STATE.md` § "Key Decisions (v0.4.0)" — Phase ordering, FK nullable decision

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getArmyListWithUnits()`: Primary query to rewrite — well-structured with clear JOIN chain. The LEFT JOIN pattern just needs different targets (udb_points instead of synced_unit_points).
- `computeUnitWarnings()` / `computeListWarnings()`: Pure functions with existing warning pattern — extend with new warning types, same return shape.
- `ArmyListUnitRow` type: Already includes `synced_points`, `override_points`, `tier_points` projections — replace with database-sourced equivalents.

### Established Patterns
- `$1, $2` positional params for all SQL
- COALESCE for nullable fallback chains — same pattern, just different sources
- Pure warning functions that take enriched row data and return `{ type, severity, message }` arrays
- React Query invalidation symmetry across create/update/delete

### Integration Points
- `src/db/queries/armyLists.ts`: Rewrite 2 queries (`getArmyListWithUnits`, `getArmyListReadiness`)
- `src/db/queries/syncedUnitPoints.ts`: Delete entire module
- `src/db/queries/unitRulesMapping.ts`: Remove synced_unit_points references
- `src/lib/computeUnitWarnings.ts`: Extend with role/keyword validation
- `src/types/armyList.ts`: Extend `ArmyListUnitRow` with database role/keywords
- `src/hooks/useArmyLists.ts`: May need cache invalidation updates if query shape changes
- Sync pipeline caller of `replaceSyncedUnitPoints()`: Remove invocation

</code_context>

<specifics>
## Specific Ideas

- The points resolution change should be transparent to the UI — `effective_points` computation moves from name-based lookup to FK-based lookup, but the result column name and meaning stay the same.
- BATTLELINE validation should use the standard 10th edition thresholds: 3 BATTLELINE minimum for 2000pt games, scaled down for smaller point levels.
- Points freshness warning ("Stale points data") may need to reference `udb_meta.version` instead of sync timestamp, since the sync cache is being removed.
- The migration that DROPs synced_unit_points tables should run after the code changes are deployed — but since this is a desktop app with atomic updates, the migration and code ship together.

</specifics>

<deferred>
## Deferred Ideas

- rules.db elimination and dead sync code removal — Phase 107 (CLN-01 through CLN-04)
- Enhancement data from canonical database — v2 scope (EXT-02)
- Leader attachment validation using database data — v2 scope (EXT-01)
- Detachment rules validation — future enhancement
- Points comparison view (old vs new) — nice-to-have, not in ALI-01–03

None — discussion stayed within phase scope

</deferred>

---

*Phase: 106-Army List Simplification*
*Context gathered: 2026-05-30*
