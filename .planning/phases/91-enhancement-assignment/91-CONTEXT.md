# Phase 91: Enhancement Assignment - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the EnhancementPickerSheet UI and validation logic for assigning detachment enhancements to character units in army lists. Enhancement points are tracked separately from per-unit points and displayed in the summary bar. The data layer (table, queries, hooks, tests) was fully delivered in Phase 89 — this phase builds the UI, validation, and summary bar integration on top.

</domain>

<decisions>
## Implementation Decisions

### Enhancement Picker UX
- **D-01:** EnhancementPickerSheet is a dedicated Sheet component opened from ArmyListUnitRow, following the same sibling portal pattern as LoadoutBuilderSheet (state managed at ArmyListsPage level, opened via callback from the row). Only character units (non-Epic-Hero) show the enhancement trigger.
- **D-02:** The sheet lists available enhancements for the list's detachment, filtered by `faction_id` + `detachment_name` from `synced_enhancements` (via `getEnhancementsByFaction` in `bsdataExtended.ts`, further filtered client-side by the list's selected detachment). Each row shows enhancement name, points cost, and an Assign button.
- **D-03:** Already-assigned enhancements in the list are visually marked (e.g., "Assigned to [unit name]" badge) and their Assign button is disabled to prevent duplicates. The sheet also shows a "Remove" action for the enhancement currently assigned to the target unit, if any.

### Character / Epic Hero Detection
- **D-04:** Character and Epic Hero status is determined by querying `rw_datasheet_keywords` from rules.db for the unit's datasheet. A unit is a Character if it has the "Character" keyword, and an Epic Hero if it has the "Epic Hero" keyword. This requires a cross-db lookup (rules.db) — add a utility function or query that resolves character/epic-hero status for a unit name.
- **D-05:** For ghost units, use `ghost_unit_name` to look up the datasheet via the same name-based join pattern (`rw_datasheets.name`). If no datasheet is found (sync not run), enhancement assignment is blocked with a "No rules data" message.
- **D-06:** The EnhancementPickerSheet trigger (button/icon) only appears on character unit rows. Non-character units and Epic Heroes do not show the trigger. This filtering happens in ArmyListUnitRow based on a new `is_character` / `is_epic_hero` field added to the ArmyListUnitRow query or resolved client-side.

### Summary Bar Integration
- **D-07:** ArmyListSummaryBar receives enhancement data (total enhancement points and count) as a separate prop or fetches via `useEnhancementsByList`. The points display changes to show the breakdown: unit points + enhancement points = total, e.g., "850 + 60 enh = 910 pts" or as a second Stat line "Enhancements: 60 pts (2)".
- **D-08:** The `pointsExceeded` check and `computeListWarnings` must include enhancement points in the total when comparing against `pointsLimit`. This means either passing enhancement total into `computeListHealthStats` or computing the combined total in the summary bar.
- **D-09:** ArmyListCard (list overview card) also includes enhancement points in its total display for consistency.

### Validation Feedback
- **D-10:** Validation is preventive, not reactive — invalid assignments are blocked at the UI level before they reach the mutation. The Assign button is disabled with a tooltip explaining WHY when any rule would be violated.
- **D-11:** Validation rules enforced in the EnhancementPickerSheet: (1) max 3 enhancements per army list — count from `useEnhancementsByList`; (2) no duplicate enhancement names — check existing assignments; (3) target must be a Character — enforced by only showing the sheet on character rows; (4) target must not be an Epic Hero — checked via keyword lookup.
- **D-12:** Toast notification as fallback for edge cases (e.g., concurrent modification where an enhancement was assigned by another action between opening the sheet and clicking Assign). The mutation's `onError` handler shows the toast.

### Claude's Discretion
- EnhancementPickerSheet internal layout, spacing, and list presentation
- Whether to add `is_character` / `is_epic_hero` as computed fields in the army list query (JOIN to rules.db) or resolve client-side via a separate hook
- Icon choice for the enhancement trigger button in ArmyListUnitRow
- Whether to show enhancement assignments inline in the unit row (small badge) or only in the sheet and summary bar
- Query hook file organization (extend useArmyLists.ts or create a new useEnhancements.ts)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 89 Context (Data Layer Foundation)
- `.planning/phases/89-schema-data-layer/89-CONTEXT.md` — D-01 (enhancement join table design), D-02 (points tracking separate from COALESCE), all schema decisions

### Army List Data Layer
- `src/db/queries/armyLists.ts` — `addEnhancement`, `removeEnhancement`, `getEnhancementsByList` (already implemented, Phase 89)
- `src/hooks/useArmyLists.ts` — `useAddEnhancement`, `useRemoveEnhancement`, `useEnhancementsByList` hooks (already implemented, Phase 89)
- `src/types/armyList.ts` — `ArmyListEnhancement`, `AddEnhancementInput` interfaces (already implemented)

### Synced Enhancement Data
- `src/db/queries/bsdataExtended.ts` — `getEnhancementsByFaction(factionId)` returns `SyncedEnhancementRow[]` with name, faction_id, detachment_name, points
- `src-tauri/migrations/030_bsdata_extended.sql` — `synced_enhancements` table schema (name, faction_id, detachment_name, points)

### Character/Epic Hero Detection
- `src-tauri/migrations/rules_001_schema.sql` — `rw_datasheet_keywords` table (datasheet_id, keyword, is_faction_keyword)
- `src/db/queries/datasheets.ts` — Existing datasheet query patterns for rules.db

### UI Components to Extend
- `src/features/army-lists/ArmyListSummaryBar.tsx` — Points display, `computeListHealthStats` integration
- `src/features/army-lists/ArmyListUnitRow.tsx` — Add enhancement trigger for character units
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Sibling portal host for EnhancementPickerSheet
- `src/features/army-lists/LoadoutBuilderSheet.tsx` — Reference pattern for the new sheet

### Points Computation
- `src/lib/computeUnitWarnings.ts` — `computeListHealthStats`, `computeListWarnings` (must include enhancement points)
- `src/features/army-lists/ArmyListCard.tsx` — Also computes totalPoints, needs enhancement integration

### Tests
- `tests/army-list/armyListEnhancements.test.ts` — Existing CRUD tests (Phase 89)
- `tests/army-list/armyListHookInvalidations.test.ts` — Hook invalidation tests include enhancement mocks

### Requirements
- `.planning/REQUIREMENTS.md` — ENH-01, ENH-02, ENH-03
- `.planning/ROADMAP.md` — Phase 91 success criteria (4 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LoadoutBuilderSheet`: Direct template for EnhancementPickerSheet — same sibling portal pattern, same Sheet-from-row trigger pattern
- `useEnhancementsByList` hook: Already returns all enhancements for a list — use for validation counts and summary bar
- `getEnhancementsByFaction`: Fetches available enhancements from synced data — already filtered by faction, needs client-side detachment filter
- `addEnhancement` / `removeEnhancement`: CRUD already implemented and tested
- `DetachmentPicker` component: Reference for Sheet-triggered selector UX

### Established Patterns
- Sibling portal: Sheet state managed at ArmyListsPage level, opened via callback from child row
- TEXT denormalization: Enhancement name/points stored as copies at assignment time (survives rules.db re-sync)
- Cache invalidation: Enhancement mutations already invalidate ARMY_LIST_KEY, ARMY_LIST_UNITS_KEY, dashboard-stats, army-list-readiness
- Preventive validation: Disable buttons with tooltip explaining violation (used across the app)

### Integration Points
- `ArmyListUnitRow`: Add enhancement trigger button (only for character units)
- `ArmyListsPage`: Host EnhancementPickerSheet state as sibling portal (alongside LoadoutBuilderSheet)
- `ArmyListSummaryBar`: Add enhancement points to total display
- `ArmyListCard`: Add enhancement points to card total
- `computeListHealthStats` / `computeListWarnings`: Include enhancement points in pointsExceeded check

</code_context>

<specifics>
## Specific Ideas

- Enhancement badge on unit rows: Show a small badge like "Armour of Contempt (15 pts)" inline on units that have an enhancement assigned, so users see the assignment without opening the sheet.
- Detachment awareness: The enhancement list should be filtered to the army list's selected detachment. If no detachment is selected, show a prompt to select one first before assigning enhancements.
- Stale price indicator: Since enhancement_points are snapshot at assignment time (D-01 from Phase 89), if the synced_enhancements price differs from the stored price after a re-sync, show a subtle "stale" badge (similar to the points freshness pattern).

</specifics>

<deferred>
## Deferred Ideas

- Leader attachment visual grouping — Phase 92
- Datasheet browser for ghost units — Phase 93
- Enhancement selection persistence across list versions/snapshots — Phase 95
- Enhancement-specific warnings in Game Day mode — future milestone

None — discussion stayed within phase scope

</deferred>

---

*Phase: 91-Enhancement Assignment*
*Context gathered: 2026-05-21*
