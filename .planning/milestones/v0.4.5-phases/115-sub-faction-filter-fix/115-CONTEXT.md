# Phase 115: Sub-faction Filter Fix - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the sub-faction filter across all three surfaces (database browser, army list unit picker, collection browser) so that selecting a sub-faction shows both sub-faction-specific units AND generic parent faction units (where `sub_faction IS NULL`). This is a bug fix — no new features, no UI changes beyond corrected filter behavior.

</domain>

<decisions>
## Implementation Decisions

### Filter Logic (SUB-01, SUB-02, SUB-03)
- **D-01:** Fix at BOTH the SQL query level and the client-side filter level. The army list picker and collection browser use `getUdbUnitIdsBySubFaction()` (SQL-based ID set), while the database browser uses `applyUdbFilters()` (client-side). Both must include `sub_faction IS NULL` units.
- **D-02:** `getUdbUnitIdsBySubFaction()` SQL query changes from `WHERE faction_id = $1 AND sub_faction = $2` to `WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)` — this is the core fix for army list picker and collection browser.
- **D-03:** `applyUdbFilters()` sub-faction check changes from `unit.sub_faction !== filters.subFactionFilter` to `unit.sub_faction !== filters.subFactionFilter && unit.sub_faction !== null` — this is the core fix for the database browser.

### Visual Distinction
- **D-04:** No visual distinction between generic parent faction units and sub-faction-specific units. Users expect a unified list — the filter means "show units available to this sub-faction," not "show only sub-faction-exclusive units."

### Count Behavior
- **D-05:** No changes to sub-faction dropdown counts or badges. The dropdowns don't currently show unit counts, and adding them is out of scope.

### Claude's Discretion
- Whether to add a test verifying the combined filter result includes both specific and generic units
- Exact test structure and fixture data if tests are added

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SQL Queries
- `src/db/queries/unitDatabase.ts` — `getUdbUnitIdsBySubFaction()` at line ~378: SQL query to fix (add `OR sub_faction IS NULL`)
- `src/db/queries/unitDatabase.ts` — `getDistinctSubFactions()` at line ~361: returns available sub-factions (no change needed)

### Client-Side Filters
- `src/features/unit-database/applyUdbFilters.ts` — Client-side filter for DB browser: sub-faction check at line 28 needs to pass-through null sub_faction units

### React Query Hooks
- `src/hooks/useUnitDatabase.ts` — `useUdbSubFactionUnitIds()` at line ~184: hook wrapping the SQL query (no change needed — fix is in the query)

### Consumer Components (verify fix propagates)
- `src/features/unit-database/DatabaseBrowserPage.tsx` — DB browser: uses `applyUdbFilters` (SUB-01)
- `src/features/army-lists/UnitPickerDialog.tsx` — Army list picker: uses `useUdbSubFactionUnitIds` (SUB-02)
- `src/features/units/CollectionPage.tsx` — Collection browser: uses `useUdbSubFactionUnitIds` (SUB-03)

### Filter Stores
- `src/features/unit-database/databaseBrowserFilters.ts` — Zustand store for DB browser filters (no change needed)
- `src/features/units/collectionFilters.ts` — Zustand store for collection filters (no change needed)

### Requirements
- `.planning/REQUIREMENTS.md` — SUB-01, SUB-02, SUB-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Root Cause
- `getUdbUnitIdsBySubFaction()` queries `WHERE sub_faction = $2` — only returns units explicitly tagged with the sub-faction, missing generic parent units where `sub_faction IS NULL`
- `applyUdbFilters()` checks `unit.sub_faction !== filters.subFactionFilter` — excludes units with `sub_faction === null` when a sub-faction filter is active
- Both bugs have the same logical error: treating sub-faction filter as "exact match only" instead of "sub-faction OR generic"

### Established Patterns
- Sub-faction data model: `sub_faction` column on `udb_units` table is nullable; NULL means "generic to entire faction"
- SUB_FACTION_MAP in `scripts/lib/factionMap.ts` covers 17 entries (11 SM chapters, 4 CSM warbands, 2 Aeldari)
- Filter stores reset `subFactionFilter` to null when faction changes (already correct)

### Integration Points
- Army list picker and collection browser share the same hook (`useUdbSubFactionUnitIds`) — fixing the SQL query fixes both simultaneously
- Database browser uses a separate client-side filter path — must be fixed independently

</code_context>

<specifics>
## Specific Ideas

No specific requirements — the fix is straightforward and well-defined by the success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 115-Sub-faction Filter Fix*
*Context gathered: 2026-06-03*
