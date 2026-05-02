# Phase 8: Army List Builder - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create and manage army lists drawn from their collection — adding and removing units, entering per-unit points overrides, and seeing auto-calculated totals (total points, painted points, battle-ready %). The unit delete flow warns before removing a unit that belongs to an active list. Sidebar nav and route included. No new query functions or schema changes — the full data layer was built in Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Army list layout
- Card-based layout on ArmyListsPage (not a table) — each list is a card
- Each card shows: list name (prominent), faction name, list type badge (Casual/Learning/Narrative/Competitive/Test), total points / points limit, and battle-ready %
- "New List" button opens a Sheet form — consistent with UnitSheet/PaintSheet pattern
- Card grid layout; cards are interactive (click to open ArmyListDetailSheet)

### Detail sheet structure
- Units displayed as compact table rows inside the ArmyListDetailSheet (not cards)
- Summary bar between the list header and the unit table showing: total points, painted points, battle-ready % — always visible, not affected by unit list scroll
- Per-unit points override: inline number input directly in the "Points" column; blank = inherit `unit.points`; saves on blur or Enter (do NOT use `COALESCE` in JS — effective_points comes from SQL already)
- Per-unit notes: Claude's discretion on visibility (inline always vs expand — keep compact by default)
- List-level notes field and edit/delete list actions: Claude's discretion on placement within the sheet

### Unit picker
- "Add Unit" button inside ArmyListDetailSheet opens a Command palette (uses `command.tsx`)
- Picker pre-filters to units matching the list's `faction_id` by default — removes off-faction noise
- Selecting a unit adds it immediately and keeps the palette open; user closes manually when done building the list
- The Command palette must render as a sibling (not nested inside a Dialog) to respect the sibling Sheet/Dialog portal rule — open it as a Dialog at the root layout level, triggered from within the Sheet

### Pre-delete warning
- Enhanced `UnitDeleteDialog` queries army list membership before rendering
- When the unit belongs to lists: warning shows list names — e.g. "Intercessors is in 2 army lists: My 1000pt List, Starter Game. Deleting it will also remove it from those lists."
- Two-step confirmation: warning state shows names → user clicks "Delete Anyway" (destructive) to proceed
- `ON DELETE CASCADE` on `army_list_units.unit_id` handles DB cleanup automatically — no manual query needed
- When unit belongs to no lists: existing simple confirmation dialog unchanged

### Claude's Discretion
- Per-unit notes field visibility within the detail sheet (inline always vs expand on click)
- List-level notes field placement in the sheet (below header, above units, or in a footer area)
- Exact card dimensions and grid column count for the lists overview
- Column order in the detail sheet unit table
- Whether to show a faction filter or sort option on the ArmyListsPage above the card grid

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and success criteria
- `.planning/ROADMAP.md` §Phase 8 — 6 success criteria; defines exact deliverables and acceptance bar

### Data layer (Phase 6 deliverables — fully built, read-only reference)
- `src/db/queries/armyLists.ts` — all query contracts; note: `updateArmyListUnit` uses full-replacement (NOT COALESCE) so `points_override` clears to NULL; `getArmyListWithUnits` computes `effective_points` in SQL
- `src/types/armyList.ts` — `ArmyList`, `ArmyListUnit`, `ArmyListUnitRow` (includes `effective_points`, `unit_name`, `status_painting`, `painting_percentage`), all input types
- `src/hooks/useArmyLists.ts` — all hooks, mutation keys `ARMY_LISTS_KEY`, `ARMY_LIST_KEY(id)`, `ARMY_LIST_UNITS_KEY(id)`; note `RemoveUnitFromListInput` and `UpdateArmyListUnitVariables` shapes

### UI patterns to follow
- `src/features/units/CollectionPage.tsx` — `selectedUnitId` pattern; Zustand filter usage; optimistic mutation pattern
- `src/features/units/UnitDetailSheet.tsx` — Sheet structure (SheetHeader/SheetFooter/SheetContent); sibling portal pattern; the model for ArmyListDetailSheet
- `src/features/units/UnitDeleteDialog.tsx` — existing delete dialog to enhance with army list membership warning
- `src/features/paints/PaintsPage.tsx` — table density and filter bar pattern reference
- `src/app/router.tsx` — flat route registration pattern; add new `/army-lists` route here

### Architecture constraints
- `.planning/PROJECT.md` §Key Decisions — "Sibling Sheet/Dialog portal pattern" and "selectedUnitId pattern" are non-negotiable; must be followed in army list UI

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useArmyLists.ts` — all mutations pre-built: `useCreateArmyList`, `useUpdateArmyList`, `useDeleteArmyList`, `useAddUnitToList`, `useRemoveUnitFromList`, `useUpdateArmyListUnit`
- `src/hooks/useArmyLists.ts` `useArmyListWithUnits(listId)` — the hook for loading units in a detail sheet
- `src/components/ui/command.tsx` — Command palette component; use for the unit picker
- `src/components/ui/sheet.tsx` — Sheet component; use for ArmyListDetailSheet and ArmyListSheet (create/edit form)
- `src/components/ui/card.tsx` — Card component with shadow/rounded variants; use for army list cards
- `src/components/ui/badge.tsx` — Badge component; use for list type tag and painting status per unit row
- `src/components/ui/dialog.tsx` — Dialog; use for ArmyListDeleteDialog and wrapping the unit picker Command

### Established Patterns
- `selectedUnitId` pattern (store ID, derive from cache) — apply as `selectedListId` for the ArmyListsPage
- Zustand filter/state (ephemeral, resets on navigation) — use if filtering is added to the army lists page
- `0|1` integer discipline — `ArmyListUnitRow.status_painting` and painting percentage are already typed; no boolean guards needed for army list fields
- Query invalidation: `useCreateArmyList` etc. already invalidate `['dashboard-stats']` per DATA-09 forward-compat; no changes to invalidation logic needed

### Integration Points
- `src/app/router.tsx` — add `/army-lists` route (flat pattern matching existing routes)
- Sidebar nav — add "Army Lists" entry (follow Paints/Collection nav entry pattern; check existing sidebar component for the nav array)
- `src/features/units/UnitDeleteDialog.tsx` — enhance with a pre-check query for army list membership; show names when count > 0
- `src/db/queries/armyLists.ts` — a new `getArmyListsByUnitId(unitId)` query may be needed for the pre-delete check (returns list names); add here

</code_context>

<specifics>
## Specific Ideas

No specific visual references cited. Style should match the existing dark slate / zinc shadcn theme — serious, not toy-like. Consistent with other pages in the app.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-army-list-builder*
*Context gathered: 2026-05-02*
