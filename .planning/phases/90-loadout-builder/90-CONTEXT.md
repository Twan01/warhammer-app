# Phase 90: Loadout Builder - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the LoadoutBuilderSheet — a dedicated panel where users configure model count (tier selection) and view wargear options for any unit in their army list. Tier selection persists per-list via `army_list_units.selected_model_count` (added in Phase 89) and points auto-resolve through the existing 6-level COALESCE chain. Wargear options from BSData are display-only (free in 10th edition). The existing inline tier selector in ArmyListUnitRow is replaced with a "Configure" trigger that opens the sheet.

</domain>

<decisions>
## Implementation Decisions

### Loadout Panel UX
- **D-01:** LoadoutBuilderSheet is a dedicated Sheet component opened from ArmyListUnitRow, NOT an inline expansion. The roadmap specifies "LoadoutBuilderSheet at page level" — it uses the established sibling portal pattern (Sheet state managed in ArmyListDetailSheet or its parent, opened via callback from the row).
- **D-02:** The existing inline tier selector in ArmyListUnitRow (lines 269-312) is REMOVED and replaced with a compact "Configure" button or icon that opens the LoadoutBuilderSheet. This declutters the unit row and consolidates all loadout configuration in one place.
- **D-03:** The sheet shows two sections: (1) Model Count tier selector with points preview, and (2) Wargear Options read-only list. The tier selector is the actionable part; wargear is informational.

### Tier Selection Persistence
- **D-04:** Tier selection writes to `army_list_units.selected_model_count` (per-list, per-unit). This is the column Phase 89 added specifically for this purpose. The old Phase 24 behavior of writing to `units.points` (which changes the collection-level unit) is REMOVED from this flow. Each army list can have a different tier for the same unit.
- **D-05:** A new mutation `useUpdateSelectedModelCount` writes to `selected_model_count` on `army_list_units`. This is a targeted UPDATE (not full-replacement) — it only touches `selected_model_count`. The COALESCE chain in `getArmyListWithUnits` already includes `tier.points` from the `synced_unit_point_tiers` LEFT JOIN, so selecting a tier immediately changes `effective_points` after cache invalidation.
- **D-06:** When `selected_model_count` is NULL (default), the unit uses whatever falls through the COALESCE chain (synced_points, override_points, or unit.points). The UI shows this as "Default" in the tier selector. A "Clear" action sets `selected_model_count` back to NULL using a dedicated clear function (following `clearArmyListDetachment` pattern, D-13 from Phase 89).

### Wargear Display
- **D-07:** Wargear options are queried from `synced_loadout_options` matching on `unit_name` and `faction_id` (TEXT-based join, same pattern as all synced table lookups). A new query function `getLoadoutOptionsForUnit(unitName, factionId)` returns grouped results.
- **D-08:** Wargear is displayed grouped by `group_name` (e.g., "Ranged Weapons", "Melee Weapons"). Within each group, options show `option_name` with badges for `is_default` ("Default") and `is_exclusive` ("Exclusive"). This is purely informational — no selection persisted.
- **D-09:** If no synced loadout options exist for a unit (sync not run, or BSData doesn't have data for this unit), show a subtle "No wargear data available" empty state — not an error.

### Ghost Unit Support
- **D-10:** The LoadoutBuilderSheet works for ghost units. Tier lookup uses `ghost_unit_name` (the COALESCE chain already handles this via `COALESCE(u.name, alu.ghost_unit_name)` in the tier join). Wargear lookup similarly uses ghost_unit_name when unit_id is NULL.
- **D-11:** For ghost units, painting status and match status indicators are hidden (they have no collection entry). The sheet shows unit name with a "Planned" badge to indicate ghost status.

### Claude's Discretion
- LoadoutBuilderSheet internal layout, spacing, and responsive behavior
- Query hook naming and cache key design for loadout options
- Whether to use a new hook file or extend useArmyLists.ts for the model count mutation
- Icon choice for the "Configure" trigger button in ArmyListUnitRow
- Whether the old `pendingTierId` / `candidatePoints` / delta preview pattern is kept, adapted, or simplified in the Sheet

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Army List Data Layer (Phase 89)
- `src/db/queries/armyLists.ts` — COALESCE chain (line 77), `getArmyListWithUnits` query, mutation functions, clear patterns
- `src/types/armyList.ts` — ArmyListUnit (selected_model_count, ghost_unit_name), ArmyListUnitRow (tier_points, effective_points)
- `src/hooks/useArmyLists.ts` — React Query hooks, cache keys (ARMY_LIST_UNITS_KEY), invalidation patterns

### Existing Loadout UI (to be refactored)
- `src/features/army-lists/ArmyListUnitRow.tsx` — Current inline tier selector (lines 269-312) that must be replaced with Sheet trigger
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Parent sheet managing unit rows, sibling portal pattern for UnitPickerDialog

### Synced Data Tables
- `src-tauri/migrations/029_synced_point_tiers.sql` — synced_unit_point_tiers schema (unit_name, faction_id, model_count, points)
- `src-tauri/migrations/030_bsdata_extended.sql` — synced_loadout_options schema (unit_name, faction_id, group_name, option_name, is_default, is_exclusive)
- `src/db/queries/bsdataExtended.ts` — Existing replace functions for synced tables (pattern reference)

### Points Resolution
- `src/lib/resolveUnitPoints.ts` — Pure function for points source resolution (PointsSourceChip display)

### Phase 89 Context
- `.planning/phases/89-schema-data-layer/89-CONTEXT.md` — D-08 (COALESCE chain), D-13 (clear functions), all schema decisions

### Requirements
- `.planning/REQUIREMENTS.md` — DL-01 (tier selection), DL-02 (wargear display)
- `.planning/ROADMAP.md` — Phase 90 success criteria (4 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ArmyListDetailSheet` + `UnitPickerDialog` sibling portal pattern: Template for LoadoutBuilderSheet state management at the parent level
- `useUnitPointTiers(unitId)` hook: Fetches tiers for a unit by ID — needs extension or parallel hook for name-based lookup (ghost units)
- `PointsSourceChip` component: Shows resolved points source — reusable inside LoadoutBuilderSheet
- `resolveUnitPoints()` utility: Points source resolution logic
- `DetachmentPicker` component: Similar Sheet-triggered selector pattern that can be referenced for UX consistency

### Established Patterns
- Sibling portal for Sheets/Dialogs: Parent manages open state, child triggers via callback (ArmyListDetailSheet → UnitPickerDialog)
- Full-replacement UPDATE for army_list_units (Pitfall 2 — must pass ALL fields)
- Dedicated clear functions for nullable columns (clearArmyListDetachment pattern)
- TEXT-based joins for synced table lookups (unit_name + faction_id)
- Cache invalidation: mutations invalidate ARMY_LISTS_KEY, ARMY_LIST_KEY(id), ARMY_LIST_UNITS_KEY(id), dashboard-stats, army-list-readiness

### Integration Points
- `ArmyListUnitRow`: Replace inline tier selector with Sheet trigger
- `ArmyListDetailSheet` (or `ArmyListsPage`): Host LoadoutBuilderSheet state as sibling portal
- `getArmyListWithUnits`: Already returns `tier_points` and `selected_model_count` — no query changes needed
- `synced_loadout_options` table: Data source for wargear display (already populated by rules sync)

</code_context>

<specifics>
## Specific Ideas

- The "Configure" trigger in the unit row should show the currently selected tier as a compact label (e.g., "5 models • 130pts") so users see the active configuration at a glance without opening the sheet.
- Delta preview: when hovering or selecting a different tier in the sheet, show the points delta (same +N/-N badge pattern used elsewhere) before confirming.
- If the unit has a points_override set, the tier selector should indicate this with a note ("Points manually overridden — tier selection won't affect displayed points until override is cleared").

</specifics>

<deferred>
## Deferred Ideas

- Wargear selection persistence (choosing specific loadout options and saving them) — not needed in 10th ed where wargear is free, but could be a future feature if rules change
- Enhancement assignment UI — Phase 91
- Leader attachment pairing — Phase 92
- Ghost unit creation flow (DatasheetBrowserDialog) — Phase 93

None — discussion stayed within phase scope

</deferred>

---

*Phase: 90-Loadout Builder*
*Context gathered: 2026-05-20*
