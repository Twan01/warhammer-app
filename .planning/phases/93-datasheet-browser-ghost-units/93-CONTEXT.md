# Phase 93: Datasheet Browser + Ghost Units - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the DatasheetBrowserDialog — a dialog for browsing all faction datasheets from the army list context — and the ghost unit creation flow, allowing users to add unowned datasheets as planned entries in their army list. Ghost units use the schema foundation built in Phase 89 (nullable unit_id + ghost_unit_name) and the data layer already implemented (addGhostUnitToList mutation + hook). The datasheet browser reads from rules.db (rw_datasheets) which is already populated by Wahapedia sync. Ghost/planned units must be clearly distinguished from owned units in the list and must NOT leak into Collection, Dashboard stats, or Kanban.

</domain>

<decisions>
## Implementation Decisions

### Datasheet Browser UX
- **D-01:** DatasheetBrowserDialog is a Dialog component (not a Sheet), following the same pattern as UnitPickerDialog — modal browse-and-select with Command palette search. It is rendered as a sibling portal at ArmyListsPage level (Pitfall 1 — never nest inside another portal).
- **D-02:** The dialog uses `getDatasheetsByFactionWithPoints(factionId)` from `datasheets.ts` to show all faction datasheets with their points. Results are displayed grouped by `role` (e.g., Character, Battleline, Other) with the datasheet name, role badge, and points. Client-side substring search filters the list.
- **D-03:** The faction_id used for the datasheet query comes from the army list's Wahapedia faction mapping (`useWahapediaFactionId` hook, same as used by ArmyListDetailSheet). If no faction mapping exists, the dialog shows a message prompting the user to set a faction on the list first.
- **D-04:** DatasheetBrowserDialog stays open after each add (multi-add UX), matching UnitPickerDialog's behavior. Each selection calls `useAddGhostUnitToList` with the datasheet name as `ghost_unit_name`. A toast confirms each addition.

### Ghost Unit Visual Treatment
- **D-05:** Ghost/planned units in ArmyListUnitRow display a "Planned" Badge (muted/outline variant) next to the unit name. The row text uses a slightly muted color (e.g., `text-muted-foreground`) to visually distinguish from owned units.
- **D-06:** Ghost units do NOT show painting status indicators, photo thumbnails, or collection-specific actions (these are meaningless for unowned units). The row shows: unit name + "Planned" badge + effective points (resolved via ghost_unit_name through the COALESCE chain).
- **D-07:** Ghost units CAN access the LoadoutBuilderSheet (tier selection + wargear display) — this was explicitly designed to support ghost units in Phase 90 (D-10, D-11). The LoadoutBuilderSheet shows a "Planned" badge for ghost units.
- **D-08:** Ghost units CAN be assigned enhancements (if they are characters) — the Phase 91 enhancement flow uses unit_name which resolves via COALESCE(u.name, alu.ghost_unit_name).

### Browse-to-Add Flow
- **D-09:** The "Add Unit" flow in ArmyListDetailSheet gets a second trigger alongside the existing "Add from Collection" button: "Browse Datasheets" (or similar) that opens the DatasheetBrowserDialog. This gives users two paths: add an owned unit (UnitPickerDialog) or add any datasheet (DatasheetBrowserDialog, creating a ghost unit).
- **D-10:** When adding a ghost unit, `ghost_unit_name` MUST match the canonical datasheet name from `rw_datasheets.name` exactly — this is critical for the COALESCE chain's name-based joins to resolve points, tiers, and wargear. The dialog passes the exact `name` field from the query result.
- **D-11:** If the user adds a ghost unit for a datasheet they already own in their collection, it still creates a ghost entry (not linking to the collection unit). The user can use the regular "Add from Collection" flow to add the owned version. No duplicate detection between ghost and owned entries.

### Ghost Unit Isolation
- **D-12:** Ghost units are already isolated from Collection, Dashboard, and Kanban by design (D-07 from Phase 89) — those features query from the `units` table directly, not through `army_list_units`. No additional filtering needed.
- **D-13:** Ghost units appear in army list exports (Phase 94) and snapshots (Phase 95) — they are real list entries with points. Downstream phases must include them.

### Claude's Discretion
- DatasheetBrowserDialog internal layout, spacing, role grouping presentation
- Icon choice for "Browse Datasheets" trigger button
- Whether to add a visual separator between owned and ghost units in the army list, or mix them in insertion order
- Whether the datasheet browser shows additional info per entry (keywords, model count) or just name + role + points
- Hook naming for the datasheet browser query (extend useDatasheet.ts or add useDatasheetBrowser.ts)
- Whether to grey out datasheets that are already in the list (owned or ghost) or allow duplicate additions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 89 Context (Schema Foundation)
- `.planning/phases/89-schema-data-layer/89-CONTEXT.md` — D-04 (ghost unit schema), D-05 (nullable unit_id), D-06 (name-based joins), D-07 (ghost isolation), D-08 (COALESCE chain)

### Phase 90 Context (Ghost Unit Support in Loadout)
- `.planning/phases/90-loadout-builder/90-CONTEXT.md` — D-10, D-11 (LoadoutBuilderSheet ghost unit support)

### Phase 91 Context (Enhancement for Ghost Units)
- `.planning/phases/91-enhancement-assignment/91-CONTEXT.md` — D-04, D-05 (character/epic hero detection via datasheet name)

### Ghost Unit Data Layer (Already Implemented)
- `src/db/queries/armyLists.ts` — `addGhostUnitToList` function (line ~229), COALESCE chain with ghost_unit_name support
- `src/hooks/useArmyLists.ts` — `useAddGhostUnitToList` hook (line ~280)
- `src/types/armyList.ts` — `AddGhostUnitToListInput` interface (line ~85), `ghost_unit_name` field on ArmyListUnit

### Datasheet Queries (rules.db)
- `src/db/queries/datasheets.ts` — `getDatasheetsByFaction`, `getDatasheetsByFactionWithPoints`, `searchAllDatasheets`
- `src/types/datasheet.ts` — `DatasheetSummary`, `DatasheetWithPoints` types

### UI Components to Extend
- `src/features/army-lists/ArmyListsPage.tsx` — Sibling portal host for new DatasheetBrowserDialog
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Add "Browse Datasheets" trigger alongside "Add Unit"
- `src/features/army-lists/ArmyListUnitRow.tsx` — Ghost unit visual treatment (Planned badge, muted styling)
- `src/features/army-lists/UnitPickerDialog.tsx` — Reference pattern for the new Dialog (Command palette, multi-add)

### Migration Schema
- `src-tauri/migrations/031_army_list_v3.sql` — army_list_units with nullable unit_id, ghost_unit_name, CHECK constraint

### Requirements
- `.planning/REQUIREMENTS.md` — BRW-01, BRW-02, BRW-03
- `.planning/ROADMAP.md` — Phase 93 success criteria (3 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UnitPickerDialog`: Direct template for DatasheetBrowserDialog — same Dialog + Command palette pattern, same multi-add UX, same sibling portal architecture
- `getDatasheetsByFactionWithPoints`: Returns datasheets with points — exactly what the browser needs, already implemented
- `useAddGhostUnitToList` hook: Ghost unit creation mutation with cache invalidation — already implemented and tested
- `useWahapediaFactionId`: Resolves army list faction to Wahapedia faction_id — already used by ArmyListDetailSheet
- `DatasheetSummary` / `DatasheetWithPoints` types: Already defined for the rules.db query results

### Established Patterns
- Sibling portal: Dialog/Sheet state managed at ArmyListsPage level, child triggers via callback
- Multi-add UX: Dialog stays open after each selection (UnitPickerDialog pattern)
- TEXT-based joins: ghost_unit_name joins to synced tables via unit_name match (established in Phase 89)
- Cache invalidation: Ghost unit mutations already invalidate ARMY_LISTS_KEY, ARMY_LIST_UNITS_KEY, dashboard-stats, army-list-readiness
- Role-based grouping: datasheets have a `role` field (Character, Battleline, etc.) that can be used for grouped display

### Integration Points
- `ArmyListsPage`: Add DatasheetBrowserDialog state + sibling portal rendering
- `ArmyListDetailSheet`: Add "Browse Datasheets" trigger (new `onBrowseDatasheets` callback)
- `ArmyListUnitRow`: Detect ghost units (unit_id === null) and apply visual treatment
- LoadoutBuilderSheet + EnhancementPickerSheet: Already support ghost units — no changes needed

</code_context>

<specifics>
## Specific Ideas

- The DatasheetBrowserDialog should group datasheets by role (Character, Battleline, Other Datasheets) with collapsible sections, making it easy to find specific unit types.
- Consider showing an "Already in list" indicator on datasheets that are already present (as owned or ghost) — not preventing re-add, just informational.
- Points display in the browser should show the base/minimum points tier from the synced data, giving users a quick cost reference before adding.

</specifics>

<deferred>
## Deferred Ideas

- List export including ghost units — Phase 94
- Snapshot versioning with ghost unit support — Phase 95
- Ghost-to-owned conversion (when user buys the unit, link ghost entry to collection) — future milestone
- Datasheet detail preview from the browser (showing stats/abilities before adding) — future milestone

</deferred>

---

*Phase: 93-Datasheet Browser + Ghost Units*
*Context gathered: 2026-05-21*
