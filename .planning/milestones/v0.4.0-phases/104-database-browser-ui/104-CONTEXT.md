# Phase 104: Database Browser UI - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a dedicated in-app browser for the canonical unit database (`udb_*` tables populated by Phase 103). Users can browse all 40k factions grouped by alignment, view units grouped by GW role with points, open full datasheet details (stat block, weapons, abilities, keywords, damaged profile), search across all factions via FTS5, filter by role/keyword/point range, and scroll large lists smoothly via virtual scrolling. No data mutations, no collection integration, no army list changes.

</domain>

<decisions>
## Implementation Decisions

### Navigation Placement
- **D-01:** The "Unit Database" sidebar entry goes in the **Play** group, positioned after Rules Hub. The database browser is a reference tool for game preparation — same category as Rules Hub and Game Day. Icon: `BookMarked` from Lucide (or `Database`/`Library` — Claude's discretion on exact icon).
- **D-02:** Route path is `/unit-database`. Lazy-loaded page component following the established `router.tsx` pattern.

### Page Architecture
- **D-03:** Single-page layout with a two-panel structure: a **faction picker sidebar/header** (left or top) and a **main content area** showing the unit list for the selected faction. This mirrors the Rules Hub pattern (faction dropdown → content tabs) but with a dedicated faction picker instead of a dropdown since BUI-01 requires alignment grouping.
- **D-04:** The faction picker groups factions under 4 alignment headers: **Imperium**, **Space Marines**, **Chaos**, **Xenos**. The alignment is derived from a static mapping (faction_id → alignment) since Wahapedia data doesn't include alignment natively. The mapping lives in a const object in the feature module.

### Unit List Display
- **D-05:** Units within a faction are grouped by the 9 GW role categories (Character, Battleline, Infantry, etc.) using collapsible section headers. Each unit row shows: name, base points (lowest tier), and model count range. Role grouping uses the `role` column from `udb_units`.
- **D-06:** Virtual scrolling via `@tanstack/react-virtual` (new dependency — BUI-06). Applied to the unit list within each faction, not the faction picker (which has ~30 items and doesn't need virtualization).

### Datasheet Detail View
- **D-07:** Clicking a unit opens a **Sheet overlay** (right-side drawer) showing the full datasheet. This is consistent with the app's existing pattern (UnitDetailSheet, UnitSheet, etc.) — users can browse units without losing their scroll position in the list.
- **D-08:** Datasheet detail layout follows the existing `PlaybookDatasheet.tsx` component pattern: stat block table at top, then ranged weapons table, melee weapons table, abilities (grouped by type: Core/Faction/Unit), keywords list, and damaged profile (if applicable). The component reads from `udb_*` query hooks, not the `rw_*` legacy tables.

### Search UX
- **D-09:** A global search bar at the top of the page queries the `udb_search` FTS5 virtual table. Input is debounced (~300ms). Results show as a flat list of matching units with faction name, unit name, role, and points. Selecting a result navigates to that faction and opens the unit's datasheet sheet.
- **D-10:** When search is active, the faction picker and role grouping are hidden — the search results replace the main content area. Clearing search restores the faction browser view.

### Filter State Management
- **D-11:** Zustand store (`databaseBrowserFilters.ts`) following the `rulesHubFilters.ts` and `collectionFilters.ts` patterns. Stores: selected faction ID, search text, role filter, keyword filter, point range min/max.
- **D-12:** Filters are combinable (AND logic) — role + keyword + point range can all be active simultaneously within a faction. Clearing all filters shows the full faction unit list.

### Query Layer
- **D-13:** New query module `src/db/queries/unitDatabase.ts` with functions: `getUdbFactions()`, `getUdbUnitsByFaction(factionId)`, `getUdbUnitDetail(unitId)` (joins models, weapons, abilities, keywords, points), `searchUdbUnits(query)` (FTS5). All use the main `hobbyforge.db` client, not `rules-client.ts`.
- **D-14:** New React Query hooks in `src/hooks/useUnitDatabase.ts`: `useUdbFactions()`, `useUdbUnits(factionId)`, `useUdbUnitDetail(unitId)`, `useUdbSearch(query)`. Query key prefix: `["udb"]`.

### Claude's Discretion
- Exact layout proportions (faction picker width, unit list density)
- Whether faction picker is a left sidebar panel or a top-level selector bar
- Stat block table styling details (as long as it's readable and consistent with existing tables)
- Empty states for factions with no units (shouldn't happen, but defensive UI)
- Whether to show a "No results" state or hide the list when FTS5 returns nothing
- Keyboard navigation within the unit list (nice-to-have, not required)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Data
- `src-tauri/migrations/038_udb_schema.sql` — Complete udb_* schema (9 tables + FTS5). Defines all columns the UI queries must target.
- `.planning/phases/103-data-acquisition-schema/103-CONTEXT.md` — Phase 103 decisions: ID scheme (Wahapedia string IDs), JSON format, import pattern. Confirms data is in hobbyforge.db.

### Existing UI Patterns
- `src/features/rules-hub/RulesHubPage.tsx` — Closest existing analog: faction-scoped reference browser with tabs, filters, and card-based display. Pattern for faction selection + filtered content.
- `src/features/units/PlaybookDatasheet.tsx` — Existing datasheet rendering: stat block, weapons table (ranged/melee split), abilities (Core/Faction/Unit grouping), collapsible sections. Reuse or adapt for udb_* data.
- `src/features/rules-hub/rulesHubFilters.ts` — Zustand filter store pattern to replicate for database browser filters.
- `src/features/units/collectionFilters.ts` — Another Zustand filter store reference.

### App Shell Integration
- `src/app/router.tsx` — Route registration pattern (lazy import + named export adapter). Add `/unit-database` route.
- `src/components/common/AppSidebar.tsx` — Sidebar nav groups (Command/Workshop/Play/Management). Add entry to PLAY_NAV.
- `src/db/client.ts` — Main DB singleton. All udb_* queries go through this client.

### Requirements
- `.planning/REQUIREMENTS.md` § "Database Browser UI" — BUI-01 through BUI-06
- `.planning/ROADMAP.md` § "Phase 104" — Success criteria (5 items)

### Project Context
- `.planning/PROJECT.md` § "Current State" — App architecture and conventions
- `.planning/STATE.md` § "Key Decisions (v0.4.0)" — Phase ordering, FK decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlaybookDatasheet.tsx`: Datasheet rendering with stat block, weapons tables (WargearTable subcomponent), abilities grouped by type, collapsible sections. Can be adapted or forked for udb_* data shape.
- `RulesHubPage.tsx`: Faction-scoped reference page with filters, search, tabs. Architecture pattern for the database browser.
- `rulesHubFilters.ts` / `collectionFilters.ts`: Zustand filter stores with setters — template for `databaseBrowserFilters.ts`.
- `PageHeader` component: Shared page header used across all feature pages.
- shadcn/ui primitives: Sheet, Collapsible, Tabs, Select, Input, Skeleton, Badge — all available.

### Established Patterns
- Lazy route loading with named export adapters in `router.tsx`
- React Query hooks with `ENTITY_KEY` constants and `queryKey` arrays
- Zustand stores for filter state (search text, dropdowns)
- Sheet overlays for detail views (right-side drawer)
- `$1, $2` positional params for all SQL queries
- Skeleton loading states during data fetch

### Integration Points
- `router.tsx`: Add lazy import + route for `/unit-database`
- `AppSidebar.tsx` `PLAY_NAV` array: Add `{ to: "/unit-database", label: "Unit Database", icon: BookMarked }`
- `src/db/client.ts`: Used by new `unitDatabase.ts` query module (no new DB connection needed)
- `package.json`: Add `@tanstack/react-virtual` dependency

</code_context>

<specifics>
## Specific Ideas

- Faction picker should feel like a codex index — organized by grand alliance, each faction showing its icon/color if available, otherwise just the name with a count of units
- The datasheet detail sheet should feel comprehensive — a user should be able to read the full unit rules without needing another reference
- Search should feel instant — FTS5 with debounce should deliver near-instant results across all ~1700 units
- Points display should show the lowest tier as "from X pts" on list rows, and all tiers in the detail sheet

</specifics>

<deferred>
## Deferred Ideas

- "Add to Collection" button on datasheet detail — Phase 105 (COL-01)
- Ownership/readiness badges on unit rows — Phase 105 (COL-04, COL-05)
- Points resolution via FK join for army lists — Phase 106
- Unit comparison side-by-side view — v2 requirement (ADV-01)
- Faction overview page with army-wide stats — v2 requirement (ADV-02)

None — discussion stayed within phase scope

</deferred>

---

*Phase: 104-Database Browser UI*
*Context gathered: 2026-05-29*
