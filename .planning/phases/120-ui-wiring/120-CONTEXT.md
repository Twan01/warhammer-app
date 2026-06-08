# Phase 120: UI Wiring - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire imported canonical data (stratagems, enhancements, detachments) from `udb_stratagems`, `udb_enhancements`, `udb_detachments`, and `udb_detachment_abilities` tables into existing UI pages — replacing stubs, empty states, and BSData-sourced data with real Wahapedia data. Covers 6 requirements: STR-03, STR-04, ENH-02, ENH-03, DET-03, DET-04.

</domain>

<decisions>
## Implementation Decisions

### Game Day Stratagems (STR-03)
- **D-01:** Group stratagems by battle phase (using `phase` column from CSV: Command, Movement, Shooting, Charge, Fight, Any) — matches existing `StrategemsTab.tsx` collapsible phase tabs structure.
- **D-02:** Filter by the active army list's selected detachment + always include universal/core stratagems (those with NULL `faction_id` and NULL `detachment_id`). Game Day already knows the active army list context.
- **D-03:** Show CP cost badge, turn indicator ("Your turn" / "Either player's turn"), and stratagem type on each card. Description rendered as HTML (consistent with Phase 118/119 decisions to keep HTML as-is).
- **D-04:** Replace the current hardcoded empty array in `useStratagemsByDetachment()` with a real query against `udb_stratagems`.

### Rules Hub Stratagems Tab (STR-04)
- **D-05:** Faction filter (using existing faction selector) + free-text search + optional detachment filter dropdown. Consistent with existing Rules Hub tabs that have faction selector + search.
- **D-06:** Display stratagem cards showing name, type, CP cost, phase, turn, and description. Reuse the same card component as Game Day where possible.
- **D-07:** Replace the current stub `useStratagemsByFaction()` returning empty array in `RulesHubPage.tsx`.

### Enhancement Picker Migration (ENH-02, ENH-03)
- **D-08:** Replace `synced_enhancements` (BSData source) with `udb_enhancements` as the sole data source. The existing `getEnhancementsByFaction()` in `bsdataExtended.ts` is rewired to query `udb_enhancements` instead.
- **D-09:** Filter enhancements by the army list's selected detachment — enhancements are detachment-specific in the Wahapedia data.
- **D-10:** Enhancement picker shows name, points cost (from `cost` column), and description (HTML). Points are resolved from the canonical database — no manual numeric input required (satisfies ENH-03).
- **D-11:** Preserve existing validation logic (max 3 per list, no duplicates, Epic Heroes excluded) from `EnhancementPickerSheet.tsx`.

### Detachment Picker Wiring (DET-03)
- **D-12:** Query `udb_detachments` filtered by `faction_id` for the army list's faction. Populate the existing `DetachmentPicker.tsx` combobox with real detachment names.
- **D-13:** Replace the stub `useDetachmentsByFaction()` returning empty array. The combobox search already exists — just needs real data behind it.

### PlaybookTab Detachment Abilities (DET-04)
- **D-14:** Add a new collapsible "Detachment Abilities" section in PlaybookTab, positioned after the existing Rules section. Query `udb_detachment_abilities` by the unit's faction.
- **D-15:** If the unit belongs to a specific detachment context (from an army list), show that detachment's abilities. Otherwise show all detachment abilities for the faction with detachment name grouping.

### Query Layer & Hooks Architecture
- **D-16:** Create a single query file `src/db/queries/udbGameData.ts` covering stratagems, enhancements, detachments, and detachment abilities queries. These entities are tightly related and all serve this phase.
- **D-17:** Create a single hooks file `src/hooks/useGameData.ts` with React Query hooks: `useStratagemsByFaction()`, `useStratagemsByDetachment()`, `useEnhancementsByFaction()`, `useEnhancementsByDetachment()`, `useDetachmentsByFaction()`, `useDetachmentAbilities()`.
- **D-18:** Add TypeScript interfaces in `src/types/gameData.ts`: `UdbStratagem`, `UdbEnhancement`, `UdbDetachment`, `UdbDetachmentAbility`.

### HTML Rendering
- **D-19:** Use `dangerouslySetInnerHTML` with a styled wrapper component for description fields containing HTML (spans with `kwb` class, `br` tags, `b` tags for WHEN/TARGET/EFFECT structure). Consistent with existing datasheet ability rendering pattern.

### Claude's Discretion
- React Query key naming conventions for new hooks
- Whether to create a shared `GameDataCard` component or keep `StratagemCard`/`DetachmentCard`/`EnhancementCard` separate
- Exact sorting within phase groups (alphabetical, by CP cost, etc.)
- Empty state messaging when no detachment is selected or faction has no data
- Whether to add a "Detachments" tab to Rules Hub alongside the existing stub tabs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Components (stubs to wire)
- `src/features/game-day/StrategemsTab.tsx` — Game Day stratagems view; currently returns empty array from `useStratagemsByDetachment()`
- `src/features/rules-hub/RulesHubPage.tsx` — Rules Hub with stub tabs; three hooks return empty arrays (lines 20-28)
- `src/features/army-lists/DetachmentPicker.tsx` — Detachment picker combobox; stub `useDetachmentsByFaction()` returns empty array
- `src/features/army-lists/EnhancementPickerSheet.tsx` — Enhancement picker sheet; currently queries `synced_enhancements` via `bsdataExtended.ts`
- `src/features/units/PlaybookTab.tsx` — Unit playbook; needs new detachment abilities section

### Existing Data Layer (to rewire/extend)
- `src/db/queries/bsdataExtended.ts` — Contains `getEnhancementsByFaction()` querying `synced_enhancements`; needs migration to `udb_enhancements`
- `src/db/queries/unitDatabase.ts` — Existing udb query patterns to follow
- `src/hooks/useArmyLists.ts` — Contains `useEnhancementsByList()`, `useAddEnhancement()`, `useRemoveEnhancement()`
- `src/hooks/useUnitDatabase.ts` — Existing udb hook patterns to follow

### Database Schema
- `src-tauri/migrations/042_udb_detachments.sql` — Detachments + abilities table schema
- `src-tauri/migrations/043_udb_stratagems_enhancements.sql` — Stratagems + enhancements table schema

### Prior Phase Context
- `.planning/phases/119-stratagems-enhancements-import/119-CONTEXT.md` — Schema decisions, column details, data shapes
- `.planning/phases/118-detachments-import/118-CONTEXT.md` — Detachment schema decisions

### Requirements
- `.planning/REQUIREMENTS.md` — STR-03, STR-04, ENH-02, ENH-03, DET-03, DET-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StrategemsTab.tsx`: Existing collapsible phase tabs UI structure — just needs real data
- `DetachmentPicker.tsx`: Existing combobox with search — just needs real data source
- `EnhancementPickerSheet.tsx`: Fully implemented validation (max 3, no dupes, Epic Heroes excluded) — just rewire data source
- `GameDayStratagemCard`: Existing card component for rendering individual stratagems
- `StratagemCard`, `DetachmentCard`, `SharedAbilityCard` in Rules Hub: Existing card components
- `dangerouslySetInnerHTML` pattern used in PlaybookTab for rules display

### Established Patterns
- Stub hooks return empty arrays with comments "Phase 107: data source eliminated -- EXT-03 deferred" — these are the exact hooks to replace
- React Query hooks follow `useEntityByX()` naming with exported query keys
- Query files use `$1, $2` positional params (Tauri plugin-sql)
- Booleans stored as `0 | 1` integers

### Integration Points
- `useStratagemsByDetachment()` in StrategemsTab.tsx line 12-14 — replace hardcoded empty array
- `useStratagemsByFaction()` in RulesHubPage.tsx line 20 — replace stub
- `useDetachmentsByFaction()` in RulesHubPage.tsx line 22 and DetachmentPicker.tsx line 15 — replace stub
- `getEnhancementsByFaction()` in bsdataExtended.ts line 130-141 — rewire from `synced_enhancements` to `udb_enhancements`
- PlaybookTab.tsx line 234 area — add new detachment abilities section

</code_context>

<specifics>
## Specific Ideas

- Stratagems.csv has ~1,482 rows including 28 universal/core stratagems with NULL faction/detachment
- Enhancements.csv has ~927 rows, all with faction_id and detachment_id populated
- Description HTML uses `kwb` class spans, `br` tags, `b` tags for WHEN/TARGET/EFFECT structure
- Stratagem `phase` column values: "Shooting phase", "Command phase", "Any phase", etc. — map directly to Game Day phase tabs
- Stratagem `turn` column: "Your turn", "Either player's turn" — use as badge/indicator
- Enhancement `cost` column is integer points; some free enhancements have cost 0
- Detachment abilities: most detachments have 1 ability, some have multiple

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 120-UI Wiring*
*Context gathered: 2026-06-08*
