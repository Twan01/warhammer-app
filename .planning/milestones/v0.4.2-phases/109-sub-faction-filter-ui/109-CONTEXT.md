# Phase 109: Sub-faction Filter UI - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds sub-faction filtering to three existing surfaces: the database browser, the army list unit picker, and the collection browser. Users can narrow units by chapter/warband/sub-faction (e.g., "Ultramarines", "Death Guard") when browsing a faction that has sub-factions. Factions without sub-factions show no extra control. The FTS5 search index already includes sub-faction names (handled in Phase 108); this phase wires the UI filter controls.

**Requirements in scope:** SF-03, SF-04, SF-05, SF-06 (4 requirements)

</domain>

<decisions>
## Implementation Decisions

### Sub-faction Query Layer
- **D-01:** New query function `getDistinctSubFactions(factionId: string): Promise<string[]>` in `src/db/queries/unitDatabase.ts`. Runs `SELECT DISTINCT sub_faction FROM udb_units WHERE faction_id = $1 AND sub_faction IS NOT NULL ORDER BY sub_faction`. Returns empty array for factions with no sub-factions.
- **D-02:** New React Query hook `useUdbSubFactions(factionId: string | null)` in `src/hooks/useUnitDatabase.ts`. Returns the distinct sub-faction list; disabled when factionId is null. Query key: `["udb-sub-factions", factionId]`.

### Database Browser Filter (SF-03)
- **D-03:** Add `subFactionFilter: string | null` to the `databaseBrowserFilters` Zustand store, with `setSubFactionFilter` setter and cleared in `clearFilters`.
- **D-04:** Add a sub-faction `Select` dropdown in `DatabaseBrowserFilters` (UdbFilterBar.tsx), positioned as the first filter (before Role). Conditionally rendered only when `useUdbSubFactions` returns a non-empty array. Placeholder: "Sub-faction". Includes "All sub-factions" clear option.
- **D-05:** `applyUdbFilters` function extended with `subFactionFilter` — filters `units` by matching `unit.sub_faction === subFactionFilter` when set. Requires `sub_faction` field added to `UdbUnitSummary` interface (from the SQL query).

### Army List Unit Picker Filter (SF-04)
- **D-06:** `UnitPickerDialog` currently filters collection units by `faction_id`. For sub-faction filtering, add a sub-faction dropdown inside the picker dialog. It queries `useUdbSubFactions(factionId)` using the army list's faction. When a sub-faction is selected, the picker filters to units whose `udb_unit_id` links to a `udb_units` row with matching `sub_faction`. Only shown when sub-factions exist for the faction.
- **D-07:** The unit picker uses collection `units` (from `useUnitsEnriched`), not UDB units directly. Sub-faction filtering requires a JOIN or lookup: query collection units that have `udb_unit_id` pointing to UDB units with the selected `sub_faction`. A lightweight approach: fetch the UDB unit IDs for the selected sub-faction, then filter collection units client-side by membership in that set.

### Collection Browser Filter (SF-05)
- **D-08:** Add a sub-faction filter to `CollectionPage` / `UnitFilters`. Since collection units link to UDB via `udb_unit_id`, the filter works the same as D-07: fetch UDB unit IDs for the selected sub-faction, filter collection units by membership. Only shown when the selected faction(s) have sub-factions.
- **D-09:** If multiple factions are selected in the collection browser, sub-faction filter is hidden (sub-factions are per-faction). Show only when exactly one faction is selected.

### FTS5 Search Indexing (SF-06)
- **D-10:** Already implemented in Phase 108. The Rust import command rebuilds FTS5 with `COALESCE(u.sub_faction || ' ', '') || COALESCE(GROUP_CONCAT(k.keyword, ' '), '')` in the keywords column (`src-tauri/src/lib.rs:731-737`). Searching "Ultramarines" already returns matching units. No additional work needed — mark SF-06 as complete during verification.

### Claude's Discretion
- Sub-faction dropdown styling (follows existing Select pattern from UdbFilterBar)
- Whether to memoize the sub-faction ID set for client-side filtering or compute inline
- Loading/empty state text for the sub-faction dropdown
- Test structure and coverage for the new filter logic

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Filter UI Surfaces
- `src/features/unit-database/databaseBrowserFilters.ts` — Zustand store for database browser filters; add subFactionFilter here
- `src/features/unit-database/UdbFilterBar.tsx` — Filter bar component; add sub-faction Select dropdown
- `src/features/unit-database/applyUdbFilters.ts` — Pure filter function; extend with sub-faction matching
- `src/features/unit-database/DatabaseBrowserPage.tsx` — Page root; wires filters to UDB unit list
- `src/features/army-lists/UnitPickerDialog.tsx` — Army list unit picker; add sub-faction filter
- `src/features/units/CollectionPage.tsx` — Collection browser page; add sub-faction filter
- `src/features/units/collectionFilters.ts` — Zustand store for collection filters
- `src/features/units/UnitFilters.tsx` — Collection filter bar component

### Query Layer
- `src/db/queries/unitDatabase.ts` — UDB CRUD queries; add getDistinctSubFactions, extend getUdbUnitsByFaction to include sub_faction
- `src/hooks/useUnitDatabase.ts` — React Query hooks for UDB; add useUdbSubFactions

### Schema & Data
- `scripts/lib/factionMap.ts` — SUB_FACTION_MAP: 17 entries (11 SM chapters, 4 CSM warbands, 2 Aeldari sub-factions)
- `src-tauri/src/lib.rs` (lines 730-741) — FTS5 rebuild already includes sub_faction in keywords column
- `src-tauri/migrations/041_udb_sub_faction_fr.sql` — Migration that added sub_faction column to udb_units

### Planning Context
- `.planning/REQUIREMENTS.md` — SF-03, SF-04, SF-05, SF-06 requirement definitions
- `.planning/ROADMAP.md` — Phase 109 success criteria and dependency chain

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DatabaseBrowserFilters` (UdbFilterBar.tsx): existing Select+Input filter bar pattern — sub-faction dropdown follows same Select component usage
- `useDatabaseBrowserFilters` Zustand store: established pattern for filter state — add `subFactionFilter` field
- `useCollectionFilters` Zustand store: same pattern for collection — extend similarly
- `FactionPicker` component: already handles faction selection in database browser
- `useUdbUnits(factionId)` hook: existing pattern for faction-scoped queries — sub-faction hook follows same shape

### Established Patterns
- Zustand stores for filter state with typed setters and `clearFilters` reset
- `applyXFilters` pure functions for client-side filtering (used in both UDB and collection)
- React Query hooks with query key arrays for cache management
- Conditional UI rendering based on data availability (e.g., roles dropdown only shown when roles exist)
- `Select` component from shadcn/ui with `__clear__` sentinel value for "All" option

### Integration Points
- `UdbUnitSummary` interface needs `sub_faction: string | null` field added
- `getUdbUnitsByFaction` SQL query needs `u.sub_faction` in SELECT clause
- Collection units link to UDB via `units.udb_unit_id` FK — sub-faction filtering requires cross-referencing this join
- `UnitPickerDialog` receives `factionId` prop — use it to query sub-factions

</code_context>

<specifics>
## Specific Ideas

- Sub-faction dropdown should only appear when the current faction has sub-factions in the data — no empty dropdowns for factions like Necrons or Orks
- For SM (Space Marines), the dropdown shows all 11 chapters plus an "All sub-factions" option, letting users browse chapter-specific units
- In the collection browser, sub-faction filter only makes sense when exactly one faction is selected (sub-factions are per-faction)
- The army list unit picker already scopes to a single faction — sub-faction dropdown fits naturally there

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 109-Sub-faction Filter UI*
*Context gathered: 2026-06-01*
