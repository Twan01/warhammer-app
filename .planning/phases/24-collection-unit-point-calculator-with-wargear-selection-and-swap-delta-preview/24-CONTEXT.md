# Phase 24: Collection Unit Point Calculator with Wargear Selection and Swap Delta Preview - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

The Collection page gains a point calculator that lets users manage model-count point tiers, track wargear loadout selections per unit, and preview the points delta when swapping between configurations in the army list builder. This surfaces "what does this loadout cost me" without requiring external tools.

</domain>

<decisions>
## Implementation Decisions

### Wargear Tracking Model
- Wargear selections stored per-unit in hobbyforge.db (new `unit_loadouts` + `unit_loadout_wargear` tables)
- Wargear options sourced from rules.db `rw_datasheets_wargear` for linked units; manual text entry fallback for unlinked units
- A "loadout" is a named configuration of wargear per unit (e.g., "Anti-tank loadout", "All-comers")
- Multiple loadouts per unit supported — user saves named loadouts and marks one as active
- Active loadout is what the army list builder uses for display and point calculation

### Points Tiers Approach
- New `unit_point_tiers` table: stores multiple model-count/points rows per unit (e.g., 5 models = 80pts, 10 models = 160pts)
- Point values are user-entered only (legal constraint — no GW points auto-imported)
- Calculator auto-matches the active model count to the correct tier and derives the effective point value
- Existing `units.points` field becomes the "simple mode" fallback — if no tiers exist, legacy single-value still works
- `points_override` on `army_list_units` remains valid for manual per-list adjustments on top of the calculated value

### Swap Delta Preview UX
- Delta preview appears inline in the army list unit row when the user considers a change
- Delta triggered by: changing model count tier selection, or swapping between saved loadouts
- Format: colored badge showing +N (green) or -N (red) next to the current effective points
- Preview-before-commit pattern — delta shown as a "what if" before the user confirms the swap
- Army list total updates live as user explores different configurations

### Integration Location
- Primary UI: new "Loadout" sub-section within PlaybookTab (unit detail sheet) — wargear selection + tier management lives here
- Secondary UI: enhanced army list unit row — shows active loadout name + point calculator inline
- Wargear picker: checkbox list grouped by weapon line from linked datasheet; manual add for unlinked
- Entry point for calculator: army list builder "edit unit" popover shows tier selector and loadout swap
- Existing `units.points` field becomes read-only derived value when tiers exist; editable as fallback when no tiers defined

### Claude's Discretion
- Exact table schema for `unit_loadouts` and `unit_loadout_wargear`
- Migration strategy (new migration file number)
- Loadout comparison UI polish (side-by-side vs inline)
- Empty state when unit has no linked datasheet and no manual wargear
- Whether "active loadout" is per-unit global or can differ per army list

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data layer
- `src-tauri/migrations/rules_002_wargear_abilities.sql` — Defines `rw_datasheets_wargear` schema (weapon stat profiles available per datasheet)
- `src-tauri/migrations/rules_001_schema.sql` — Full rules.db schema including `rw_datasheets`, `rw_datasheet_models`
- `src/db/queries/datasheets.ts` — `getFullDatasheet()` returns wargear array; `resolveWahapediaFactionIdByName()` for faction lookup
- `src/db/queries/armyLists.ts` — COALESCE point calculation pattern, `points_override` full-replacement UPDATE contract

### UI integration
- `src/features/units/PlaybookTab.tsx` — Existing unit detail tab where Loadout section would be added
- `src/types/datasheet.ts` — `RwDatasheetWargear` interface (weapon stat fields), `FullDatasheet` aggregate type
- `src/types/armyList.ts` — `ArmyListUnitRow` with `effective_points`, `points_override` nullable contract
- `src/types/unit.ts` — Unit interface with `points: number | null` field

### Patterns
- `src/db/queries/units.ts` — COALESCE UPDATE pattern, nullable field handling
- `src/hooks/useDatasheet.ts` — React Query hook pattern for rules.db data

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getFullDatasheet()` — already returns `wargear: RwDatasheetWargear[]` per datasheet; can populate loadout picker options
- `PlaybookTab` — established integration point for unit-level game data (stats, abilities, wargear display already exists)
- `COALESCE(points_override, u.points, 0)` pattern — army list already handles point derivation in SQL
- `DatasheetPicker` — faction-filtered datasheet selection UI; similar pattern usable for loadout picker
- `useStrategyNote` / `useUpsertStrategyNote` — existing per-unit data hooks (pattern for new loadout hooks)

### Established Patterns
- Per-unit data stored via separate table + JOIN (mirrors `unit_strategy_notes` → `units`)
- React Query hooks with `queryKey` arrays, `invalidateQueries` on mutation
- Full-replacement UPDATE for nullable fields (clearable back to NULL)
- `selectedUnitId` pattern for Sheet-based detail views
- Grouped wargear display by `line` field (already done in PlaybookTab wargear section)

### Integration Points
- PlaybookTab renders wargear stats inline — new Loadout section inserts below existing wargear display
- Army list unit rows display `effective_points` — delta badge adds alongside
- `units.points` field in UnitSheet form — becomes derived/read-only when tiers exist
- Dashboard stats queries that SUM points — may need awareness of tier-derived values

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Phase name implies:
- "Point calculator" = interactive tool, not just display
- "Wargear selection" = user actively picks from options (not just viewing stats)
- "Swap delta preview" = real-time comparison feedback before committing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview*
*Context gathered: 2026-05-05*
