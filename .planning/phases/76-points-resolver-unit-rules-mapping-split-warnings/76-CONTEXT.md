# Phase 76: Points Resolver + Unit Rules Mapping + Split Warnings - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase centralizes the fragmented points resolution logic into a single `resolveUnitPoints()` function in `src/lib/`, builds the full TypeScript query/hook/UI layer for the `unit_rules_mapping` table (migration 026 already created in Phase 73), and separates list-level warnings from unit-level warnings in the army list UI.

Three deliverables:
1. **Points resolver** — a pure function that wraps the existing COALESCE fallback chain with source labeling ("synced", "manual override", "unknown")
2. **Unit-rules mapping** — types, queries, hooks, and inline UI for confirming or overriding the auto-matched rules datasheet per unit
3. **Warning split** — refactor `computeUnitWarnings` to cleanly separate list-level conditions (points exceeded, stale source) from unit-level conditions (not painted, not assembled, unknown points)

</domain>

<decisions>
## Implementation Decisions

### Points Resolver Function
- **D-01:** Keep the COALESCE chain in SQL for the actual fallback computation. The `resolveUnitPoints()` function in `src/lib/` is a pure JS function that takes the individual column values (points_override, sup_points, uo_points, unit_points, effective_points) and returns `{ points: number; source: "override" | "synced" | "user-override" | "base" | "unknown" }`.
- **D-02:** SQL queries must expose intermediate columns so the resolver can determine which COALESCE level provided the effective value. `getArmyListWithUnits` already returns `unit_points` and `points_override`; it must also add `sup.points AS synced_points` and `uo.points AS override_points` as separate SELECT columns.
- **D-03:** Source labeling logic: if `points_override IS NOT NULL` → "override"; if `synced_points IS NOT NULL` → "synced"; if `override_points IS NOT NULL` → "user-override"; if `unit_points IS NOT NULL` → "base"; else → "unknown". The resolver returns a typed result consumed by UI components for the source chip display.

### COALESCE Site-3 Resolution (Dashboard)
- **D-04:** `getArmyReadinessByFaction` in `dashboard.ts` currently uses `COALESCE(u.points, 0)` (2-level). This must be upgraded to a 4-level chain: `COALESCE(sup.points, uo.points, u.points, 0)` with LEFT JOINs on `synced_unit_points` and `unit_overrides`. The army list `points_override` (from `army_list_units`) does NOT apply here because this query aggregates by faction, not by army list.
- **D-05:** The resolver function is consumed by army list UI and Game Day for source display. Dashboard uses the aligned SQL COALESCE for correct aggregation but does not need source labeling (it shows aggregate totals, not per-unit chips).

### Unit-Rules Mapping Layer
- **D-06:** New type file `src/types/unitRulesMapping.ts` following the Entity/CreateInput/UpdateInput pattern. `match_status` is typed as `"auto" | "confirmed" | "manual"`.
- **D-07:** New query file `src/db/queries/unitRulesMapping.ts` with CRUD: `getUnitRulesMapping(unitId)`, `getUnitRulesMappings()` (all), `upsertUnitRulesMapping(input)` (INSERT OR REPLACE on unit_id UNIQUE), `deleteUnitRulesMapping(unitId)`.
- **D-08:** New hook file `src/hooks/useUnitRulesMapping.ts` following the existing key/useQuery/useMutation pattern.
- **D-09:** UI: unit rows in army lists show a small inline indicator — a badge or icon showing match status (confirmed = checkmark, needs review = warning icon, manual = edit icon). Clicking the indicator opens a Sheet where the user can see the current auto-match, confirm it, or search/select a different rules datasheet entry.
- **D-10:** Ambiguous/duplicate matches are flagged with a visible indicator. Detection logic: when `rules_datasheet_id` is NULL or `match_status = 'auto'` and multiple rules datasheets share the unit's name → show "needs review" indicator with a count of possible matches.

### Warning Split
- **D-11:** Extract list-level warnings into a new `computeListWarnings()` function in `src/lib/computeUnitWarnings.ts`. List-level: points exceeded, stale data source. These appear once in the summary bar, not per-unit.
- **D-12:** `computeUnitWarnings()` keeps only unit-level conditions: not painted, not assembled, manual override, unknown points. Remove the list-level "Points exceeded" check from this function.
- **D-13:** `ArmyListSummaryBar` renders list-level warnings directly from `computeListWarnings()` output. Unit-level warnings remain attached to individual `ArmyListUnitRow` components. The "Warnings: N" tooltip in the summary bar distinguishes between "N list warnings, M unit warnings" instead of the current "N critical, M informational".

### Claude's Discretion
- Source chip styling and exact badge variants (color, size, position)
- Sheet layout for rules mapping confirmation
- Ambiguity detection query specifics (exact matching logic against rules.db datasheets)
- Error handling for missing rules.db data (graceful degradation when rules aren't synced)
- Whether to show a batch "confirm all" action for auto-matched units

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema
- `src-tauri/migrations/026_unit_rules_mapping.sql` — Table definition (unit_id UNIQUE, match_status, rules_datasheet_id TEXT)
- `src-tauri/migrations/024_points_import_history.sql` — synced_unit_points table (cross-DB reference pattern)

### Points resolution (3 COALESCE sites to align)
- `src/db/queries/armyLists.ts` — Lines 52-73: 5-level COALESCE in `getArmyListWithUnits`; Lines 221-243: 5-level COALESCE in `getArmyListReadiness`
- `src/db/queries/dashboard.ts` — Lines 86-100: 2-level COALESCE in `getArmyReadinessByFaction` (DIVERGENT — must upgrade)
- `src/db/queries/syncedUnitPoints.ts` — Cache management functions (replace + map)

### Warning system
- `src/lib/computeUnitWarnings.ts` — Current warning classification (hard/soft split, list-level mixed into per-unit)
- `src/features/army-lists/ArmyListSummaryBar.tsx` — Summary bar consuming `computeListHealthStats`
- `src/features/army-lists/ArmyListUnitRow.tsx` — Per-unit row display

### Type patterns
- `src/types/armyList.ts` — ArmyListUnitRow interface (effective_points, unit_points fields)
- `src/types/unitOverride.ts` — COALESCE documentation in types

### Requirements
- `.planning/REQUIREMENTS.md` — PV-01 through PV-07

### Accumulated decisions
- `.planning/STATE.md` §Accumulated Context — COALESCE site-3 divergence, points resolver location, transaction rules
- `.planning/phases/73-schema-foundation-version-parity/73-CONTEXT.md` — D-01..D-03 schema decisions for unit_rules_mapping

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/computeUnitWarnings.ts` — Pure function pattern, already classifies hard/soft; needs refactoring but structure is reusable
- `src/lib/syncFreshness.ts` — SyncFreshness type used in warning context
- `src/features/army-lists/PointsFreshnessBadge.tsx` — Existing freshness badge component
- `src/components/ui/status-badge.tsx` — Badge component for status indicators (reuse for match_status indicator)
- `src/db/queries/syncedUnitPoints.ts` — Cache table patterns (replace + map), same pattern for new mapping queries

### Established Patterns
- Entity/CreateInput/UpdateInput type convention in `src/types/`
- Query file per entity in `src/db/queries/` with positional `$1, $2` params
- Hook file per entity in `src/hooks/` with KEY + useQuery + useMutation
- Sheet-based CRUD for entity editing (UnitSheet, RecipeSheet, ArmyListSheet)
- Inline status indicators on table rows (StatusBadge, PointsFreshnessBadge)
- COALESCE in SQL, NOT in JS — effective_points is always computed at the query level

### Integration Points
- `getArmyListWithUnits` SQL needs new SELECT columns (synced_points, override_points) for source labeling
- `ArmyListUnitRow` needs mapping indicator + source chip
- `ArmyListSummaryBar` needs list-level warning display refactor
- `getArmyReadinessByFaction` needs COALESCE upgrade + LEFT JOINs
- Game Day unit displays may need source chip (GameDayReadinessPanel)

</code_context>

<specifics>
## Specific Ideas

- Source chip format: "95 pts - synced", "100 pts - manual override", "-- unknown - needs review" per success criteria SC-2
- Match status indicator should be subtle (small icon) to avoid cluttering the unit row, but clearly visible when action is needed
- The resolver function signature should be simple: takes row data, returns `{ points, source, label }` — no async, no DB access

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 76-Points Resolver + Unit Rules Mapping + Split Warnings*
*Context gathered: 2026-05-14*
