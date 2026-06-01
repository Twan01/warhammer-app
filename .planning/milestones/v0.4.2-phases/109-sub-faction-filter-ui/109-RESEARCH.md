# Phase 109: Sub-faction Filter UI - Research

**Researched:** 2026-06-01
**Domain:** React UI filtering (Zustand + React Query + shadcn/ui Select)
**Confidence:** HIGH

## Summary

Phase 109 adds sub-faction filtering to three existing surfaces: the database browser, the army list unit picker, and the collection browser. The codebase already has well-established patterns for every piece of this work: Zustand filter stores, `applyXFilters` pure functions, React Query hooks with conditional enabling, and the `__clear__` sentinel pattern for Select dropdowns.

The sub-faction data already exists in the database (`sub_faction TEXT` on `udb_units`, migration 041). The FTS5 search index already includes sub-faction names (lib.rs:731-737), so SF-06 is already complete. The remaining work is purely UI wiring: one new query, one new hook, and filter plumbing in three surfaces.

**Primary recommendation:** Follow the exact patterns already in `databaseBrowserFilters.ts` / `UdbFilterBar.tsx` / `applyUdbFilters.ts` for the database browser. For collection and army list picker, use a client-side Set-based filter on `udb_unit_id` membership since those surfaces work with collection units, not UDB units directly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New query `getDistinctSubFactions(factionId)` in `src/db/queries/unitDatabase.ts` -- `SELECT DISTINCT sub_faction FROM udb_units WHERE faction_id = $1 AND sub_faction IS NOT NULL ORDER BY sub_faction`
- **D-02:** New hook `useUdbSubFactions(factionId)` in `src/hooks/useUnitDatabase.ts` with query key `["udb-sub-factions", factionId]`, disabled when null
- **D-03:** Add `subFactionFilter: string | null` to `databaseBrowserFilters` Zustand store with setter and clear
- **D-04:** Sub-faction Select dropdown in `DatabaseBrowserFilters` (UdbFilterBar.tsx), first filter position (before Role), conditional on non-empty sub-factions
- **D-05:** Extend `applyUdbFilters` with `subFactionFilter` -- requires `sub_faction` added to `UdbUnitSummary` interface and `getUdbUnitsByFaction` SQL
- **D-06:** `UnitPickerDialog` gets sub-faction dropdown, queries `useUdbSubFactions(factionId)`, only shown when sub-factions exist
- **D-07:** Unit picker filters collection units client-side by UDB unit ID set membership (fetch UDB unit IDs for selected sub-faction, then filter)
- **D-08:** Collection browser sub-faction filter works same as D-07 (Set membership on `udb_unit_id`)
- **D-09:** Collection sub-faction filter hidden when multiple factions selected; shown only for exactly one faction
- **D-10:** SF-06 already implemented in Phase 108 -- no additional work needed

### Claude's Discretion
- Sub-faction dropdown styling (follow existing Select pattern)
- Whether to memoize the sub-faction ID set for client-side filtering or compute inline
- Loading/empty state text for the sub-faction dropdown
- Test structure and coverage for new filter logic

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SF-03 | Database browser shows sub-faction filter dropdown when browsing factions that have sub-factions | D-03, D-04, D-05 -- Zustand store field, Select component, applyUdbFilters extension |
| SF-04 | Army list unit picker shows sub-faction filter for applicable factions | D-06, D-07 -- dropdown in UnitPickerDialog, client-side Set filter on udb_unit_id |
| SF-05 | Collection browser shows sub-faction filter for applicable factions | D-08, D-09 -- same Set-based approach, hidden when multiple factions selected |
| SF-06 | FTS5 search index includes sub-faction names for discoverability | D-10 -- already implemented in Phase 108, verified in lib.rs:731-737 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Distinct sub-faction list | Database / Storage | -- | SQL DISTINCT query on udb_units |
| Sub-faction filter state | Browser / Client | -- | Zustand stores hold ephemeral filter state |
| Database browser filtering | Browser / Client | -- | Client-side filter via applyUdbFilters pure function |
| Collection/picker sub-faction filter | Browser / Client | Database / Storage | Client-side Set filtering, but needs query to resolve UDB unit IDs |
| FTS5 sub-faction search | Database / Storage | -- | Already done in Phase 108 (lib.rs) |

## Standard Stack

No new libraries. This phase uses only existing project dependencies:

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| zustand | (current) | Filter state stores | Yes |
| @tanstack/react-query | (current) | Data fetching hooks | Yes |
| shadcn/ui Select | (current) | Dropdown component | Yes |

**Installation:** None required.

## Architecture Patterns

### System Architecture Diagram

```
User selects faction
        |
        v
useUdbSubFactions(factionId) --> getDistinctSubFactions() --> SQLite
        |                                                       |
        v                                                       v
  sub-factions array (may be empty)              DISTINCT sub_faction values
        |
        +--- empty? --> hide dropdown
        |
        +--- non-empty? --> show Select dropdown
                                  |
                                  v
                    User selects sub-faction
                                  |
            +-----------+---------+----------+
            v           v                    v
      DB Browser    Unit Picker       Collection Browser
      (SF-03)       (SF-04)           (SF-05)
            |           |                    |
            v           v                    v
    applyUdbFilters   Set<udb_id>       Set<udb_id>
    sub_faction===    filter on          filter on
    direct match      udb_unit_id        udb_unit_id
```

### Pattern 1: Database Browser Filter (direct field match)

**What:** The database browser already works with `UdbUnitSummary[]` objects. Adding `sub_faction` to the interface and SQL query lets `applyUdbFilters` do a direct string comparison.

**When to use:** When the filter field exists directly on the entity being filtered.

**Example:**
```typescript
// In applyUdbFilters.ts -- extend UdbFiltersInput
export interface UdbFiltersInput {
  subFactionFilter: string | null;  // NEW
  roleFilter: string | null;
  keywordFilter: string;
  pointMin: number | null;
  pointMax: number | null;
}

// In the filter function body, before existing filters:
if (filters.subFactionFilter !== null && unit.sub_faction !== filters.subFactionFilter) {
  return false;
}
```
[VERIFIED: codebase inspection of applyUdbFilters.ts and databaseBrowserFilters.ts]

### Pattern 2: Collection/Picker Filter (Set membership via FK)

**What:** Collection units (`EnrichedUnit`) don't have `sub_faction` directly. They link to UDB via `udb_unit_id`. To filter by sub-faction, first build a Set of UDB unit IDs that match the sub-faction, then filter collection units by membership.

**When to use:** When the filter field exists on a related entity, not the entity being displayed.

**Example:**
```typescript
// New query: get UDB unit IDs for a sub-faction within a faction
export async function getUdbUnitIdsBySubFaction(
  factionId: string,
  subFaction: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM udb_units WHERE faction_id = $1 AND sub_faction = $2`,
    [factionId, subFaction],
  );
  return rows.map((r) => r.id);
}

// Client-side filtering:
const subFactionIds = new Set(udbIdsForSubFaction);
const filtered = units.filter((u) =>
  u.udb_unit_id != null && subFactionIds.has(u.udb_unit_id)
);
```
[VERIFIED: codebase inspection of units.ts EnrichedUnit type showing udb_unit_id field]

### Pattern 3: Conditional Filter Visibility

**What:** Sub-faction dropdown only renders when data exists. This matches the existing pattern where the Role dropdown in `DatabaseBrowserFilters` receives `roles` prop derived from the units list.

**Example:**
```typescript
// In UdbFilterBar.tsx
{subFactions.length > 0 && (
  <Select
    value={subFactionFilter ?? ""}
    onValueChange={(val) => setSubFactionFilter(val === "__clear__" ? null : val || null)}
  >
    <SelectTrigger className="w-48">
      <SelectValue placeholder="Sub-faction" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__clear__">All sub-factions</SelectItem>
      {subFactions.map((sf) => (
        <SelectItem key={sf} value={sf}>{sf}</SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```
[VERIFIED: codebase inspection of UdbFilterBar.tsx showing exact `__clear__` pattern]

### Pattern 4: Zustand Store Extension

**What:** Adding a new filter field to an existing Zustand store follows the established pattern exactly.

**Example:**
```typescript
// In databaseBrowserFilters.ts -- add to interface and store
subFactionFilter: string | null;
setSubFactionFilter: (sf: string | null) => void;

// In store creation:
subFactionFilter: null,
setSubFactionFilter: (sf) => set({ subFactionFilter: sf }),
clearFilters: () => set({
  searchText: "", roleFilter: null, keywordFilter: "",
  pointMin: null, pointMax: null, subFactionFilter: null,  // include in clear
}),
```
[VERIFIED: codebase inspection of databaseBrowserFilters.ts]

### Anti-Patterns to Avoid
- **Joining sub_faction into getUnitsWithPoints:** Don't modify the enriched units SQL to include sub_faction. The collection query is used globally; sub-faction filtering is a niche cross-reference. Use the Set-based approach instead.
- **Showing empty sub-faction dropdown:** Never render the Select when the hook returns an empty array. Users of factions like Necrons should see no extra control.
- **Forgetting to reset sub-faction on faction change in DB browser:** The `clearFilters` in the database browser does NOT clear `selectedFactionId`. When the user changes faction, `subFactionFilter` must also reset to null. Wire this in the faction change handler or via a `useEffect`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown component | Custom select | shadcn/ui `Select` with `__clear__` sentinel | Established pattern, accessible, styled |
| Filter state | React useState chain | Zustand store | Consistent with all other filter surfaces |
| Data fetching | Manual fetch+cache | React Query hook with `enabled` flag | Cache management, disabled pattern |

## Common Pitfalls

### Pitfall 1: Stale sub-faction filter on faction change
**What goes wrong:** User selects "Ultramarines" sub-faction for Space Marines, then switches to Necrons. The subFactionFilter is still "Ultramarines" but Necrons have no sub-factions, so the dropdown is hidden but the filter is still active, showing 0 results.
**Why it happens:** `clearFilters` in the DB browser store doesn't clear `selectedFactionId`, and faction change doesn't automatically clear `subFactionFilter`.
**How to avoid:** Reset `subFactionFilter` to null whenever `selectedFactionId` changes. Either in `setSelectedFactionId` setter or via `useEffect` watching `selectedFactionId`.
**Warning signs:** Zero results when switching to a faction that should have units.

### Pitfall 2: Collection faction ID type mismatch
**What goes wrong:** Collection factions use numeric IDs (`number`), UDB factions use string IDs (`string` like "SM"). The `useUdbSubFactions` hook needs a UDB faction ID, but the collection browser's filter state has numeric faction IDs.
**Why it happens:** Two different faction systems coexist (collection factions vs. UDB factions).
**How to avoid:** Map from collection faction ID to UDB faction ID using `faction.wahapedia_faction_id` field (confirmed on `Faction` type in `src/types/faction.ts:14`). The `DatabaseBrowserPage` already does this mapping in `handleAddToCollection`.
**Warning signs:** Sub-faction query returns empty for a faction that should have sub-factions.

### Pitfall 3: Unit picker factionId is numeric, not UDB string
**What goes wrong:** `UnitPickerDialog` receives `factionId: number | null` (collection faction ID). Passing this directly to `useUdbSubFactions` would fail since the hook expects a UDB string ID.
**Why it happens:** The unit picker works with collection data, not UDB data.
**How to avoid:** Resolve the collection faction to its `wahapedia_faction_id` string. Either pass it as a prop or look it up from the factions query.
**Warning signs:** Hook always returns empty array because the numeric ID doesn't match any UDB faction.

### Pitfall 4: Sub-faction filter hides unlinked collection units
**What goes wrong:** When sub-faction filter is active, collection units without `udb_unit_id` (unlinked) are excluded because they can't match any UDB unit ID set.
**Why it happens:** The Set membership check `udb_unit_id != null && subFactionIds.has(udb_unit_id)` excludes unlinked units.
**How to avoid:** This is actually correct behavior. When filtering by sub-faction, unlinked units genuinely don't belong. But document this in the filter UI with a note if many units are unlinked.
**Warning signs:** Users confused about "missing" units when sub-faction filter is active.

## Code Examples

Verified patterns from codebase inspection:

### New Query: getDistinctSubFactions
```typescript
// Source: D-01 from CONTEXT.md
export async function getDistinctSubFactions(factionId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ sub_faction: string }[]>(
    `SELECT DISTINCT sub_faction FROM udb_units
     WHERE faction_id = $1 AND sub_faction IS NOT NULL
     ORDER BY sub_faction`,
    [factionId],
  );
  return rows.map((r) => r.sub_faction);
}
```

### New Hook: useUdbSubFactions
```typescript
// Source: D-02 from CONTEXT.md
export const UDB_SUB_FACTIONS_KEY = (factionId: string) =>
  ["udb-sub-factions", factionId] as const;

export function useUdbSubFactions(factionId: string | null) {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_SUB_FACTIONS_KEY(factionId)
        : (["udb-sub-factions", "disabled"] as const),
    queryFn: () =>
      factionId !== null ? getDistinctSubFactions(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}
```

### Extended UdbUnitSummary interface
```typescript
export interface UdbUnitSummary {
  id: string;
  faction_id: string;
  name: string;
  role: string | null;
  base_points: number | null;
  min_models: number | null;
  max_models: number | null;
  sub_faction: string | null;  // NEW
}
```

### Extended getUdbUnitsByFaction SQL
```sql
SELECT
  u.id, u.faction_id, u.name, u.role, u.sub_faction,
  (SELECT MIN(p.points) FROM udb_unit_points p WHERE p.unit_id = u.id) AS base_points,
  (SELECT MIN(c.min_models) FROM udb_unit_composition c WHERE c.unit_id = u.id) AS min_models,
  (SELECT MAX(c.max_models) FROM udb_unit_composition c WHERE c.unit_id = u.id) AS max_models
FROM udb_units u
WHERE u.faction_id = $1
ORDER BY u.role, u.name ASC
```

### Collection Sub-faction Filter (faction ID resolution)
```typescript
// In CollectionPage or UnitFilters -- resolve numeric faction to UDB faction ID
const { data: factions } = useFactions();

// Only when exactly one faction selected
const singleFactionId = factionsSel.length === 1 ? factionsSel[0] : null;
const udbFactionId = singleFactionId != null
  ? factions?.find((f) => f.id === singleFactionId)?.wahapedia_faction_id ?? null
  : null;

const { data: subFactions = [] } = useUdbSubFactions(udbFactionId);
```

### Unit Picker Sub-faction Filter (faction ID resolution)
```typescript
// In UnitPickerDialog -- resolve numeric factionId prop to UDB faction ID
const { data: collectionFactions = [] } = useFactions();
const udbFactionId = factionId != null
  ? collectionFactions.find((f) => f.id === factionId)?.wahapedia_faction_id ?? null
  : null;

const { data: subFactions = [] } = useUdbSubFactions(udbFactionId);
const [subFactionFilter, setSubFactionFilter] = useState<string | null>(null);
```

## State of the Art

No external library changes or new approaches relevant to this phase. All patterns use established project conventions.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No sub-faction data | sub_faction column on udb_units | Phase 108 (migration 041) | Enables this phase's filtering |
| FTS5 without sub-faction | FTS5 keywords include sub_faction | Phase 108 (lib.rs) | SF-06 already satisfied |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 (jsdom) |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test -- tests/unit-database/` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SF-03 | applyUdbFilters with subFactionFilter | unit | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts -x` | Wave 0 |
| SF-03 | getDistinctSubFactions query | unit | `pnpm test -- tests/unit-database/unitDatabase.queries.test.ts -x` | Extend existing |
| SF-04 | Unit picker sub-faction filtering | unit | `pnpm test -- tests/army-lists/UnitPickerSubFaction.test.ts -x` | Wave 0 |
| SF-05 | Collection sub-faction filtering logic | unit | `pnpm test -- tests/collection/collectionSubFaction.test.ts -x` | Wave 0 |
| SF-06 | FTS5 includes sub-faction | manual-only | Already verified in Phase 108 | N/A |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/unit-database/ tests/collection/ -x`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit-database/applyUdbFilters.test.ts` -- covers SF-03 filter logic
- [ ] Extend `tests/unit-database/unitDatabase.queries.test.ts` -- covers getDistinctSubFactions

## Security Domain

This phase involves read-only UI filtering of local SQLite data. No authentication, session management, network calls, or user-provided input beyond selecting from fixed dropdown values.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | no | All filter values come from pre-populated Select options (not free text) |
| V6 Cryptography | no | -- |

No security concerns for this phase.

## Assumptions Log

**If this table is empty:** All claims in this research were verified or cited -- no user confirmation needed.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|

All claims verified via codebase inspection. The `wahapedia_faction_id` field was confirmed on `Faction` type at `src/types/faction.ts:14` [VERIFIED: codebase grep].

## Open Questions

1. **Should sub-faction filter reset automatically on faction change in DB browser?**
   - What we know: `clearFilters` doesn't reset `selectedFactionId`, and faction change doesn't auto-clear sub-faction
   - What's unclear: Whether to handle in Zustand setter or useEffect
   - Recommendation: Reset in `setSelectedFactionId` setter (simpler, no effect needed). This is Claude's discretion per CONTEXT.md.

2. **Collection query for sub-faction ID set: new query or reuse existing?**
   - What we know: D-07 says "fetch UDB unit IDs for selected sub-faction, filter client-side"
   - What's unclear: Whether to add a dedicated `getUdbUnitIdsBySubFaction` query or reuse `getUdbUnitsByFaction` and filter in JS
   - Recommendation: Add a lightweight dedicated query returning just IDs. Avoids fetching full unit summaries when only IDs are needed. Alternatively, since `useUdbUnits` already fetches the full list with `sub_faction` (after D-05), the picker/collection could filter from the cached list without an additional query.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `databaseBrowserFilters.ts` -- Zustand filter store pattern
- Codebase inspection: `UdbFilterBar.tsx` -- Select with `__clear__` sentinel pattern
- Codebase inspection: `applyUdbFilters.ts` -- Pure filter function pattern
- Codebase inspection: `unitDatabase.ts` -- Query layer types and SQL patterns
- Codebase inspection: `useUnitDatabase.ts` -- React Query hook pattern with disabled state
- Codebase inspection: `UnitPickerDialog.tsx` -- Picker receives `factionId: number`
- Codebase inspection: `collectionFilters.ts` -- Collection Zustand store uses `factions: number[]`
- Codebase inspection: `UnitFilters.tsx` -- MultiSelectPopover and conditional rendering
- Codebase inspection: `CollectionPage.tsx` -- Filter wiring with useMemo
- Codebase inspection: `src/types/unit.ts` -- `EnrichedUnit.udb_unit_id` field confirmed
- Codebase inspection: `src/types/faction.ts:14` -- `wahapedia_faction_id: string | null` confirmed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing patterns
- Architecture: HIGH -- every pattern directly observed in codebase
- Pitfalls: HIGH -- identified from concrete type mismatches and state management gaps

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable patterns, no external dependencies)
