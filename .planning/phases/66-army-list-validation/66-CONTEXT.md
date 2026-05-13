# Phase 66: Army List Validation - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds comprehensive health validation to army lists so users know exactly what needs attention before playing. It delivers: hard/soft validation warnings per unit and at the list level, user-assignable tactical role tags on army list units, aggregated role coverage visualization, and a health summary panel consolidating points total, ownership %, readiness %, freshness status, and warning count. No new pages are created — everything integrates into the existing ArmyListDetailSheet and ArmyListSummaryBar surfaces. Depends on Phase 65 (points import pipeline) for the 5-level COALESCE chain and freshness infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Warning System (LV-01)
- **D-01:** Warnings surface at two levels: **inline per-unit icons** on each ArmyListUnitRow (specific issue visible at the unit level) AND a **consolidated warning count** in the health summary panel (at-a-glance total). This matches the existing pattern where ArmyListSummaryBar already lists not-ready units.
- **D-02:** Two severity levels: **hard warnings** (points exceeded when points_limit is set, unowned units i.e. units not in the collection) and **soft warnings** (unpainted, not battle-ready, stale points via PointsFreshnessBadge, manual override in use via alu.points_override IS NOT NULL, unknown points where effective_points = 0). Hard = list cannot legally be played as-is; soft = informational for hobby preparation.
- **D-03:** Warning computation is **SQL-derived** — extend `getArmyListWithUnits` to return the fields needed for warning classification (assembly status, painting status, effective_points, points_override presence). Warning categorization logic lives in a **pure TypeScript function** (e.g., `computeUnitWarnings`) for testability, following the `computeWorkflowPosition` pattern.
- **D-04:** Points-exceeded warning triggers when the sum of effective_points across all units exceeds `army_lists.points_limit`. When `points_limit` is NULL (no limit set), the points-exceeded warning is suppressed entirely.

### Tactical Role Tags (LV-02)
- **D-05:** Tactical role tags live on **army_list_units** (the join table), not on the unit itself. A unit's tactical role varies by list context — same unit can be an objective holder in one list and a screening unit in another. This follows the existing pattern where `points_override` and `notes` are already per-list-per-unit.
- **D-06:** Schema extension: add a `tactical_role` TEXT column to `army_list_units` (nullable, default NULL = unassigned). Migration 021.
- **D-07:** Fixed enum of role tags: `anti_tank`, `screening`, `objective_holder`, `fire_support`, `melee_threat`, `utility`, `transport`. Defined as a `TACTICAL_ROLES` const array in `src/types/armyList.ts` (same pattern as `PAINTING_STATUS_ORDER`). Users assign from a dropdown on the unit row, not free text.
- **D-08:** Multiple tags per unit are NOT supported in v1 — single role assignment keeps the schema simple (TEXT column, not a join table). If multi-role is needed later, migrate to a separate table.

### Role Coverage Visualization (LV-03)
- **D-09:** Role coverage displayed as **horizontal indicators per role** — each of the 7 roles shows a label + count of assigned units. Compact, scannable, consistent with the dashboard card aesthetic. Not a chart — simple visual density.
- **D-10:** Coverage logic: **gap = zero units assigned** to a role; **covered = 1+ units**. No "recommended minimum" thresholds — the user decides what matters for their play style. Gaps are visually distinct (dimmed/outlined vs filled).
- **D-11:** Role coverage section appears inside the extended health summary panel, below the points/readiness stats. Only visible when at least one unit in the list has a tactical role assigned (progressive disclosure — no empty role grid on lists where tags haven't been used).

### Health Summary Panel (LV-04)
- **D-12:** **Extend ArmyListSummaryBar** into a full health summary section rather than creating a separate panel. The summary bar already shows points total and readiness % — adding ownership %, freshness status, and warning count keeps army list health consolidated in one place.
- **D-13:** Health summary displays: (a) points total with `X / Y pts` format when points_limit is set, color-coded red when exceeded; (b) ownership % (units in collection vs total); (c) readiness % (battle-ready units, already exists); (d) freshness status (reuse PointsFreshnessBadge); (e) warning count badge (hard + soft totals).
- **D-14:** The `points_limit` column already exists on `army_lists` — this phase activates it. The army list form (ArmyListSheet) needs a points limit input field. When no limit is set, the points display shows just the total without the `/ Y` denominator.
- **D-15:** Ownership % is computed as: `(units where unit exists in hobbyforge.db units table) / (total units in list) * 100`. Since all army list units reference existing units via FK, ownership is effectively always 100% in the current schema. However, the health panel should still show it as a stat for completeness, and future phases could introduce "wishlist" units not yet owned.

### Claude's Discretion
- Exact icon choices for inline warning indicators (e.g., AlertTriangle for hard, Info for soft)
- Visual treatment of the role coverage indicators (dots, bars, pill badges — whatever fits the card layout)
- Whether to show a summary tooltip on the warning count badge listing the breakdown
- Loading/skeleton states for the health summary while data loads
- Order of stats in the health summary panel (points → readiness → ownership → freshness → warnings, or reorder as fits the layout)
- Whether the tactical role dropdown appears as an inline select on the unit row or as part of the unit edit flow

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Army List Queries (MUST READ — all COALESCE sites + warning data source)
- `src/db/queries/armyLists.ts` — getArmyListWithUnits (line 52), getArmyListReadiness (line 205), updateArmyListUnit (line 158). All 3 COALESCE sites. Warning fields derived from existing columns.
- `src/types/armyList.ts` — ArmyListUnitRow type (line 43), ArmyListUnit type, ArmyList type with points_limit field

### Army List Components (MUST READ — integration targets)
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Main detail view hosting SummaryBar, unit table, detachment picker
- `src/features/army-lists/ArmyListSummaryBar.tsx` — Current readiness display (lines 33-84), to be extended into health summary
- `src/features/army-lists/ArmyListUnitRow.tsx` — Unit row with inline points override and status badges, gets inline warnings + role tag dropdown

### Army List Form (READ for points_limit activation)
- `src/features/army-lists/ArmyListSheet.tsx` — Create/edit form, needs points_limit input field
- `src/features/army-lists/armyListSchema.ts` — Zod schema for army list form validation

### Freshness Infrastructure (READ for context)
- `src/lib/syncFreshness.ts` — SyncFreshness type, FRESHNESS_DOT_CLASS — reuse for health panel freshness
- `src/features/army-lists/PointsFreshnessBadge.tsx` — Self-contained freshness badge, reuse in health panel

### Pure Function Pattern (READ for warning computation approach)
- `src/lib/computeWorkflowPosition.ts` — Established pattern for pure computation functions with full test coverage

### Points Import Design (READ for COALESCE chain context)
- `.planning/points-import-design.md` — COALESCE chain design, points override interaction

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ArmyListSummaryBar` (src/features/army-lists/): Already shows points total + readiness % — extend with ownership, freshness, warnings
- `PointsFreshnessBadge` (src/features/army-lists/): Self-contained freshness component — embed in health panel
- `StaleDataBanner` (src/features/army-lists/): Existing stale data warning — may overlap with freshness in health panel
- `StatusBadge` (src/components/ui/): Consistent status display — reuse for warning severity badges
- `computeWorkflowPosition` (src/lib/): Pattern for pure testable computation — follow for `computeUnitWarnings`
- `PAINTING_STATUS_ORDER` (src/types/): Const array pattern — follow for `TACTICAL_ROLES`

### Established Patterns
- Per-list-per-unit data on `army_list_units` join table (points_override, notes) — tactical_role follows same pattern
- Full-replacement UPDATE for army_list_units — must preserve tactical_role alongside points_override and notes
- SQL-computed effective_points via COALESCE — warning thresholds derived from same query, no JS reimplementation
- Pure function + unit tests for computation (computeWorkflowPosition has 12 tests) — warning logic follows same approach
- Progressive disclosure thresholds (e.g., workflow metadata hidden when no data set) — role coverage hidden when no tags assigned

### Integration Points
- `getArmyListWithUnits` SQL: extend SELECT to include tactical_role from army_list_units
- `updateArmyListUnit`: extend to persist tactical_role (already full-replacement UPDATE)
- `ArmyListDetailSheet`: hosts the extended summary bar and unit table
- Migration 021: add tactical_role column to army_list_units
- `ArmyListSheet` form: add points_limit input field

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the roadmap success criteria. Auto-mode resolved all gray areas using established codebase patterns — pure function for warnings (like computeWorkflowPosition), per-list data on join table (like points_override), const array for role enum (like PAINTING_STATUS_ORDER), and extending ArmyListSummaryBar rather than creating a separate panel.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 66-Army List Validation*
*Context gathered: 2026-05-13*
