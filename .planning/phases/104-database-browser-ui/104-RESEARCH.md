# Phase 104: Database Browser UI - Research

**Researched:** 2026-05-29
**Domain:** React UI — virtualized browseable reference UI over existing SQLite (udb_*) tables
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Unit Database sidebar entry in the **Play** group, after Rules Hub. Icon: `BookMarked` (or `Database`/`Library` — Claude's discretion).
- **D-02:** Route path `/unit-database`. Lazy-loaded page following established `router.tsx` pattern.
- **D-03:** Single-page layout — two-panel: faction picker (left/top) + main content area (unit list). Mirrors Rules Hub pattern.
- **D-04:** Faction picker groups factions under 4 alignment headers: Imperium, Space Marines, Chaos, Xenos. Static mapping (faction_id → alignment) in a const object in the feature module (not in DB).
- **D-05:** Units within a faction grouped by 9 GW role categories using collapsible section headers. Each row shows: name, base points (lowest tier), model count range. Uses `role` column from `udb_units`.
- **D-06:** Virtual scrolling via `@tanstack/react-virtual`. Applied to unit list within each faction (not faction picker).
- **D-07:** Clicking a unit opens a Sheet overlay (right-side drawer) — consistent with existing UnitDetailSheet/UnitSheet pattern.
- **D-08:** Datasheet detail layout follows `PlaybookDatasheet.tsx` pattern: stat block table, ranged weapons, melee weapons, abilities (grouped Core/Faction/Unit), keywords, damaged profile. Reads from `udb_*` hooks, not `rw_*` legacy tables.
- **D-09:** Global search bar at top queries `udb_search` FTS5 table. Debounced ~300ms. Results show as flat list: faction name, unit name, role, points. Selecting a result navigates to that faction and opens unit datasheet sheet.
- **D-10:** When search is active, faction picker and role grouping hidden — search results replace main content. Clearing search restores faction browser.
- **D-11:** Zustand store `databaseBrowserFilters.ts` following `rulesHubFilters.ts` / `collectionFilters.ts` patterns. Stores: selected faction ID, search text, role filter, keyword filter, point range min/max.
- **D-12:** Filters combinable (AND logic). Role + keyword + point range all independently active within a faction. Clearing all restores full faction unit list.
- **D-13:** New query module `src/db/queries/unitDatabase.ts` with `getUdbFactions()`, `getUdbUnitsByFaction(factionId)`, `getUdbUnitDetail(unitId)` (joins models, weapons, abilities, keywords, points), `searchUdbUnits(query)` (FTS5). All use main `hobbyforge.db` client.
- **D-14:** New React Query hooks in `src/hooks/useUnitDatabase.ts`: `useUdbFactions()`, `useUdbUnits(factionId)`, `useUdbUnitDetail(unitId)`, `useUdbSearch(query)`. Query key prefix: `["udb"]`.

### Claude's Discretion
- Exact layout proportions (faction picker width, unit list density)
- Whether faction picker is a left sidebar panel or top-level selector bar
- Stat block table styling details (readable and consistent with existing tables)
- Empty states for factions with no units
- Whether to show "No results" state or hide list when FTS5 returns nothing
- Keyboard navigation within unit list (nice-to-have, not required)

### Deferred Ideas (OUT OF SCOPE)
- "Add to Collection" button on datasheet detail — Phase 105 (COL-01)
- Ownership/readiness badges on unit rows — Phase 105 (COL-04, COL-05)
- Points resolution via FK join for army lists — Phase 106
- Unit comparison side-by-side view — v2 requirement (ADV-01)
- Faction overview page with army-wide stats — v2 requirement (ADV-02)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUI-01 | Faction picker page with alignment grouping (Imperium / Space Marines / Chaos / Xenos) | D-04: static mapping const; `udb_factions` table provides all faction rows |
| BUI-02 | Unit list per faction grouped by 9 GW role categories with points on each row | D-05: `role` column from `udb_units`; `udb_unit_points` for base points via MIN(points); `udb_unit_composition` for model count range |
| BUI-03 | Full datasheet detail: stat block, ranged + melee weapon tables, abilities with full text, keywords, damaged profile | D-07/D-08: Sheet overlay pattern; join across 5 udb_* tables in `getUdbUnitDetail()`; adapt PlaybookDatasheet.tsx pattern |
| BUI-04 | Global search across all factions via FTS5 | D-09/D-13: `udb_search` FTS5 virtual table with `MATCH $1` + debounce |
| BUI-05 | Filters by role, keyword, and point range | D-11/D-12: Zustand store; role = filter on `role` column; keyword = filter on `udb_unit_keywords`; point range = filter on MIN(points) |
| BUI-06 | Virtual scrolling for large unit lists | D-06: `@tanstack/react-virtual` useVirtualizer hook; not installed yet — new dependency |
</phase_requirements>

---

## Summary

Phase 104 is a pure read UI layer over the `udb_*` tables seeded by Phase 103. There are no mutations and no new migrations needed. The work is: (1) new query module + hooks, (2) one Zustand filter store, (3) one new feature directory (`src/features/unit-database/`) with a page component, faction picker, unit list with virtual scrolling, and a datasheet detail Sheet, and (4) routing + sidebar wiring.

The architecture closely mirrors the Rules Hub (`RulesHubPage.tsx`), but with a dedicated faction picker using alignment groupings instead of a dropdown, and with virtual scrolling applied to the unit list because it can exceed 100 rows per faction. The datasheet detail Sheet adapts the `PlaybookDatasheet.tsx` rendering approach to the `udb_*` data shape, which is structurally equivalent but uses different column names.

The only new dependency is `@tanstack/react-virtual` v3.13.26 (not currently in `package.json`). All other UI primitives (Sheet, Collapsible, Input, Select, Badge, Skeleton) are already present via shadcn/ui. The query layer uses the existing `getDb()` client singleton — no new DB connection required.

**Primary recommendation:** Build the feature as a single wave: query module + hooks + Zustand store in Wave 1, then page component + faction picker + unit list + datasheet Sheet in Wave 2, then wiring (router + sidebar) in Wave 3.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Faction listing with alignment grouping | Frontend (React) | DB query | Static mapping in const; DB only provides faction rows |
| Unit list per faction with role grouping | Frontend (React) | DB query | Grouping is client-side `useMemo` over faction unit array |
| Virtual scrolling | Frontend (React) | — | useVirtualizer is purely client-side scroll management |
| Datasheet detail (stat block, weapons, abilities) | Frontend (React) | DB query | Joins done in query module; rendering in Sheet component |
| FTS5 global search | Database / Storage | Frontend (debounce) | SQLite FTS5 does the work; React manages debounce + state |
| Filter state (role, keyword, point range) | Frontend (Zustand) | — | Client-side filter applied to already-fetched faction units |
| Route registration + sidebar nav entry | App Shell | — | router.tsx + AppSidebar.tsx modifications |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-virtual` | 3.13.26 | Virtual scrolling for large unit lists | Official TanStack ecosystem; already used for @tanstack/react-query and @tanstack/react-table; headless, zero styling overhead [VERIFIED: npm registry] |
| `zustand` | ^5.0.12 (already installed) | Filter store (`databaseBrowserFilters.ts`) | Established project pattern for all filter stores [VERIFIED: npm registry] |
| `@tanstack/react-query` | ^5.100.6 (already installed) | Data hooks (`useUnitDatabase.ts`) | Project-wide server state tool; staleTime: Infinity appropriate for static reference data [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Sheet | Already installed | Datasheet detail overlay | Consistent with all existing detail views in the app |
| shadcn/ui Collapsible | Already installed | Role section headers, weapon/ability sections | Same pattern as PlaybookDatasheet.tsx |
| shadcn/ui Input | Already installed | Global search bar | Same pattern as RulesHubPage.tsx |
| shadcn/ui Skeleton | Already installed | Loading states during DB fetch | Same pattern throughout app |
| shadcn/ui Badge | Already installed | Role labels, keyword tags | Same pattern throughout app |
| Lucide `BookMarked` | Already installed | Sidebar icon (D-01) | Available in current lucide-react ^0.460.0 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tanstack/react-virtual` | `react-window` / `react-virtuoso` | react-virtual is already in the TanStack ecosystem used project-wide; no new ecosystem vendor |
| Client-side role grouping | Pre-grouped SQL query (GROUP BY role) | SQL grouping would return flat rows requiring re-shape; useMemo grouping is simpler and fast for ~100 units |
| Zustand for filter state | React useState | Zustand persists state when navigating between factions (no filter reset on re-render); consistent with all other filter stores |

**Installation (new dependency only):**
```bash
pnpm add @tanstack/react-virtual
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@tanstack/react-virtual` | npm | ~4 yrs | Very high (core TanStack project) | github.com/TanStack/virtual | [OK] | Approved |

slopcheck output: `[OK] @tanstack/react-virtual (npm)` — scanned without error.
No postinstall script detected (`npm view @tanstack/react-virtual scripts.postinstall` returned empty).

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User opens /unit-database
        ↓
DatabaseBrowserPage
  ├── Global search bar (Input + debounce)
  │     ↓ [search active]
  │   UdbSearchResults (flat list of matching units)
  │     └── click unit → opens UdbDatasheetSheet
  │
  └── [search cleared]
      ├── FactionPicker (left panel / top bar)
      │     grouped by alignment header (Imperium / SM / Chaos / Xenos)
      │     └── click faction → sets selectedFactionId in Zustand
      │
      └── UdbUnitList (main content)
            ├── FilterBar (role Select, keyword Input, point range Inputs)
            ├── role sections (Collapsible per role category)
            │     └── useVirtualizer scroll container
            │           └── virtual UdbUnitRow items (name, base pts, model count)
            │                 └── click row → opens UdbDatasheetSheet
            └── UdbDatasheetSheet (shadcn Sheet)
                  ├── stat block table (udb_unit_models)
                  ├── ranged weapons (udb_unit_weapons WHERE category='Ranged')
                  ├── melee weapons (udb_unit_weapons WHERE category='Melee')
                  ├── abilities (udb_unit_abilities grouped by ability_type)
                  ├── keywords (udb_unit_keywords)
                  ├── points tiers table (udb_unit_points)
                  └── damaged profile (udb_units.damaged_w + damaged_desc)
```

### Recommended Project Structure
```
src/
  app/
    unit-database/
      page.tsx              # Shell: export function UnitDatabasePageShell
  features/
    unit-database/
      DatabaseBrowserPage.tsx   # Top-level page component
      FactionPicker.tsx          # Alignment-grouped faction list
      UdbUnitList.tsx            # Role-grouped virtualized unit list
      UdbUnitRow.tsx             # Single unit row (name, pts, model count)
      UdbDatasheetSheet.tsx      # Full datasheet detail Sheet overlay
      UdbSearchResults.tsx       # Flat search results list
      databaseBrowserFilters.ts  # Zustand store
      applyUdbFilters.ts         # Pure filter function (role/keyword/pts range)
      factionAlignmentMap.ts     # Const: faction_id → alignment mapping
  db/
    queries/
      unitDatabase.ts            # getUdbFactions, getUdbUnitsByFaction,
                                 #   getUdbUnitDetail, searchUdbUnits
  hooks/
    useUnitDatabase.ts           # useUdbFactions, useUdbUnits, useUdbUnitDetail,
                                 #   useUdbSearch
tests/
  unit-database/
    databaseBrowserFilters.test.ts
    applyUdbFilters.test.ts
    factionAlignmentMap.test.ts
    UdbDatasheetSheet.test.tsx
    unitDatabase.queries.test.ts
```

### Pattern 1: Zustand Filter Store (databaseBrowserFilters.ts)
**What:** Zustand store holding selected faction, search text, role filter, keyword filter, point range.
**When to use:** Any filter state that must survive faction-switching navigation.
**Example:**
```typescript
// Source: mirrors src/features/rules-hub/rulesHubFilters.ts
import { create } from "zustand";

interface DatabaseBrowserFiltersState {
  selectedFactionId: string | null;
  searchText: string;
  roleFilter: string | null;
  keywordFilter: string;
  pointMin: number | null;
  pointMax: number | null;
  setSelectedFactionId: (id: string | null) => void;
  setSearchText: (text: string) => void;
  setRoleFilter: (role: string | null) => void;
  setKeywordFilter: (kw: string) => void;
  setPointMin: (v: number | null) => void;
  setPointMax: (v: number | null) => void;
  clearFilters: () => void;
}

export const useDatabaseBrowserFilters = create<DatabaseBrowserFiltersState>((set) => ({
  selectedFactionId: null,
  searchText: "",
  roleFilter: null,
  keywordFilter: "",
  pointMin: null,
  pointMax: null,
  setSelectedFactionId: (id) => set({ selectedFactionId: id }),
  setSearchText: (text) => set({ searchText: text }),
  setRoleFilter: (role) => set({ roleFilter: role }),
  setKeywordFilter: (kw) => set({ keywordFilter: kw }),
  setPointMin: (v) => set({ pointMin: v }),
  setPointMax: (v) => set({ pointMax: v }),
  clearFilters: () => set({ roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }),
}));
```

### Pattern 2: useVirtualizer for Unit Rows
**What:** Headless virtual scroller from @tanstack/react-virtual. Renders only the items in the viewport.
**When to use:** Unit list within a faction (can be 100+ rows). NOT needed for faction picker (~30 items).
**Example:**
```typescript
// Source: [CITED: github.com/TanStack/virtual examples]
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

function UdbUnitList({ units }: { units: UdbUnitSummary[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: units.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44, // px per row — estimated, can be adjusted
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      style={{ height: "600px", overflowY: "auto" }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <UdbUnitRow unit={units[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Pattern 3: FTS5 Search Query
**What:** SQLite FTS5 MATCH query on `udb_search` virtual table.
**When to use:** Global search bar with debounced input.
**Example:**
```typescript
// Source: schema from src-tauri/migrations/038_udb_schema.sql
// udb_search columns: unit_id UNINDEXED, name, faction_name, keywords
export async function searchUdbUnits(query: string): Promise<UdbSearchResult[]> {
  if (query.trim().length < 2) return [];
  const db = await getDb();
  // FTS5 MATCH with * suffix for prefix search; sanitize special chars
  const ftsQuery = query.trim().replace(/['"*^]/g, "") + "*";
  return db.select<UdbSearchResult[]>(
    `SELECT unit_id, name, faction_name, keywords
     FROM udb_search
     WHERE udb_search MATCH $1
     LIMIT 50`,
    [ftsQuery]
  );
}
```

**FTS5 pitfall:** The input must be sanitized before being passed to MATCH — characters like `"`, `*`, `^` are FTS5 query operators and will throw a parse error if passed literally. Use a simple strip or escape before querying.

### Pattern 4: Faction Alignment Static Mapping
**What:** Const object mapping Wahapedia faction IDs to alignment strings.
**When to use:** Faction picker rendering — group factions under 4 headers.
**Example:**
```typescript
// Source: [ASSUMED] — faction IDs from Wahapedia (confirmed in migration 038 comments)
// Planner should verify actual IDs match those in udb_factions after Phase 103 import
export const FACTION_ALIGNMENT: Record<string, "Imperium" | "Space Marines" | "Chaos" | "Xenos"> = {
  "SM": "Space Marines",
  "DA": "Space Marines",
  "BA": "Space Marines",
  "SW": "Space Marines",
  // ... etc
  "AM": "Imperium",       // Astra Militarum
  "CHSM": "Chaos",        // Chaos Space Marines
  "NEC": "Xenos",         // Necrons
  "TAU": "Xenos",         // T'au Empire
  // full list to be populated from actual udb_factions data
};
```

### Pattern 5: udb_unit_detail Query (join across 5 tables)
**What:** Single async function returning all data needed for the datasheet Sheet.
**When to use:** Triggered when user clicks a unit row.
**Example structure:**
```typescript
export interface UdbUnitDetail {
  unit: { id: string; name: string; role: string | null; base_points: number | null; damaged_w: string | null; damaged_desc: string | null };
  models: UdbModel[];
  weapons: UdbWeapon[];
  abilities: UdbAbility[];
  keywords: UdbKeyword[];
  points: UdbPointsTier[];
  composition: UdbComposition[];
}

export async function getUdbUnitDetail(unitId: string): Promise<UdbUnitDetail | null> {
  const db = await getDb();
  const unitRows = await db.select<...>("SELECT * FROM udb_units WHERE id = $1", [unitId]);
  if (!unitRows[0]) return null;
  // 5 more parallel selects
  const [models, weapons, abilities, keywords, points, composition] = await Promise.all([
    db.select("SELECT * FROM udb_unit_models WHERE unit_id = $1 ORDER BY line_order", [unitId]),
    db.select("SELECT * FROM udb_unit_weapons WHERE unit_id = $1 ORDER BY weapon_group, line_order", [unitId]),
    db.select("SELECT * FROM udb_unit_abilities WHERE unit_id = $1 ORDER BY line_order", [unitId]),
    db.select("SELECT * FROM udb_unit_keywords WHERE unit_id = $1 ORDER BY is_faction DESC, keyword", [unitId]),
    db.select("SELECT * FROM udb_unit_points WHERE unit_id = $1 ORDER BY model_count", [unitId]),
    db.select("SELECT * FROM udb_unit_composition WHERE unit_id = $1", [unitId]),
  ]);
  return { unit: unitRows[0], models, weapons, abilities, keywords, points, composition };
}
```

### Anti-Patterns to Avoid
- **Embedding virtual scroll inside collapsible role sections:** If each role section is its own Collapsible with its own virtualizer, you lose cross-section virtualization. Apply one virtualizer to the full flattened unit list (with section header items interleaved at indices) — or collapse all role sections to one flat sorted list and handle grouping as visual decoration. The simpler approach: one virtualizer over all visible units in the selected faction, with role change detectable by index.
- **Querying all faction units on page load:** `useUdbUnits(factionId)` should be enabled only when a faction is selected. `enabled: !!factionId` prevents unnecessary DB calls.
- **Raw FTS5 input without sanitization:** Special chars (`"`, `*`, `(`, `)`) in the search box will cause SQLite FTS5 parse errors. Strip or sanitize before calling the FTS5 query.
- **Triggering useUdbUnitDetail before unit is clicked:** Detail query should be enabled only when a unit is selected (sheet is open). `enabled: !!selectedUnitId` avoids N queries on list render.
- **Using rules-client.ts for udb_* queries:** All udb_* tables live in `hobbyforge.db`, not `rules.db`. All queries must use `getDb()` from `src/db/client.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Virtualized scrolling | Custom windowed list with manual scroll events | `useVirtualizer` from `@tanstack/react-virtual` | Edge cases: ResizeObserver, dynamic item sizes, scroll restoration, scroll-to-index. Virtualizer handles all of these. |
| FTS5 full-text search | LIKE-based substring search across multiple columns | `udb_search` FTS5 virtual table + MATCH | FTS5 is 10-100x faster on 1700 rows; tokenization, prefix search, and ranking built in |
| Filter state management | useState chain / prop drilling | Zustand store (project pattern) | Consistent with all other filter stores; persists across faction switches |
| Sheet overlay | Custom modal/drawer | shadcn/ui Sheet | Accessibility, keyboard close, focus trap, transition animations all handled |
| Role grouping display | Table with colspan headers | Collapsible + section headers pattern | Consistent with existing PlaybookDatasheet.tsx collapsible sections |

---

## Common Pitfalls

### Pitfall 1: Virtual Scroll Inside Collapsible Sections
**What goes wrong:** Applying `useVirtualizer` inside each `<Collapsible>` role section creates N virtualizers that each need their own height-constrained container. When a Collapsible is closed, its virtualizer measures 0 height. Scroll position is lost when reopening.
**Why it happens:** Natural intuition is to virtualize "the list" which appears to be per-section.
**How to avoid:** Either (a) virtualize the entire flattened list where section headers are interleaved as non-unit items, or (b) apply virtual scroll to the full unit list area and use `useMemo` to compute `[{ type: 'header', role }, { type: 'unit', unit }, ...]` shape before passing to the virtualizer.
**Warning signs:** More than one `useVirtualizer` call in the component tree.

### Pitfall 2: FTS5 Query Errors on Special Characters
**What goes wrong:** User types `"` or `*` or `(` in the search box and the FTS5 MATCH query throws `fts5: syntax error near ...`.
**Why it happens:** FTS5 has its own query syntax; any unescaped operator character crashes the query.
**How to avoid:** Before calling `searchUdbUnits`, strip or replace `"'*^()` with empty string or space. Show no error to user — just return empty results or debounce to stable input.
**Warning signs:** React Query error state while typing in the search box.

### Pitfall 3: udb_factions May Not Contain All Factions in Phase 103 Import
**What goes wrong:** The static `FACTION_ALIGNMENT` map references a faction ID that doesn't exist in `udb_factions` (or vice versa), causing a faction to appear ungrouped or not appear at all.
**Why it happens:** The alignment mapping is authored independently of the DB data; IDs may have changed during Phase 103 implementation.
**How to avoid:** Implement a fallback: factions with no alignment mapping fall into an "Other" group or are appended at the end. Include a defensive `factions with no alignment` group in the picker. The `factionAlignmentMap.ts` should be verified against the actual `udb_factions` table data during Wave 1.
**Warning signs:** Empty faction picker sections or factions appearing under "Other" unexpectedly.

### Pitfall 4: useUdbUnits Fetches on Every Faction Change
**What goes wrong:** React Query staleTime defaults to 0 — every faction switch re-fetches the unit list from SQLite even though the data is static.
**Why it happens:** Default staleTime is 0 in React Query.
**How to avoid:** Set `staleTime: Infinity` for all udb_* hooks. Data only changes when the import_unit_database command runs (Phase 103 import flow), which can invalidate `["udb"]` keys.
**Warning signs:** Skeleton flashes on every faction click.

### Pitfall 5: Weapon Category Mismatch
**What goes wrong:** `udb_unit_weapons.category` values may not be exactly `"Ranged"` / `"Melee"` — they may be lowercase, null, or use different values depending on how Phase 103 import was implemented.
**Why it happens:** The schema allows any TEXT in `category`; the actual values depend on the import script.
**How to avoid:** Before building the weapon table split, query a sample unit's weapons and verify actual `category` values. Use case-insensitive comparison: `w.category?.toLowerCase() === "ranged"` rather than strict equality.
**Warning signs:** All weapons appear under one category or no weapons render.

### Pitfall 6: Sheet Scroll Conflict
**What goes wrong:** The datasheet Sheet may have nested scrollable areas (weapons table, abilities list), which can interfere with the parent page's virtual scroll container.
**Why it happens:** Overflow scroll on the Sheet content area overlaps with document scroll events.
**How to avoid:** The Sheet overlay uses `position: fixed` in shadcn/ui — it's fully detached from the page scroll context. No conflict. Just ensure the Sheet content div itself has `overflow-y: auto` and a max-height.
**Warning signs:** Page scrolls when attempting to scroll within the Sheet.

---

## Code Examples

### Route Registration (router.tsx)
```typescript
// Source: established pattern from existing routes
const UnitDatabasePageShell = lazy(() =>
  import("./unit-database/page").then(m => ({ default: m.UnitDatabasePageShell }))
);

const unitDatabaseRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/unit-database",
  component: UnitDatabasePageShell,
});

// Add to routeTree layoutRoute children array
```

### Sidebar Entry (AppSidebar.tsx)
```typescript
// Source: existing PLAY_NAV pattern
import { BookMarked } from "lucide-react"; // add to existing import

const PLAY_NAV = [
  { to: "/army-lists",    label: "Army Lists",    icon: ClipboardList },
  { to: "/battle-log",    label: "Battle Log",    icon: Swords },
  { to: "/rules-hub",     label: "Rules Hub",     icon: Library },
  { to: "/unit-database", label: "Unit Database", icon: BookMarked }, // new entry
] as const;
```

### getUdbFactions Query
```typescript
// Source: mirrors datasheets.ts pattern; uses getDb() for hobbyforge.db
export interface UdbFaction {
  id: string;
  name: string;
  short_name: string | null;
}

export async function getUdbFactions(): Promise<UdbFaction[]> {
  const db = await getDb();
  return db.select<UdbFaction[]>(
    "SELECT id, name, short_name FROM udb_factions ORDER BY name ASC"
  );
}
```

### getUdbUnitsByFaction Query (base points via subquery)
```typescript
export interface UdbUnitSummary {
  id: string;
  name: string;
  role: string | null;
  base_points: number | null;
  min_models: number | null;
  max_models: number | null;
}

export async function getUdbUnitsByFaction(factionId: string): Promise<UdbUnitSummary[]> {
  const db = await getDb();
  return db.select<UdbUnitSummary[]>(
    `SELECT
       u.id,
       u.name,
       u.role,
       (SELECT MIN(p.points) FROM udb_unit_points p WHERE p.unit_id = u.id) AS base_points,
       (SELECT MIN(c.min_models) FROM udb_unit_composition c WHERE c.unit_id = u.id) AS min_models,
       (SELECT MAX(c.max_models) FROM udb_unit_composition c WHERE c.unit_id = u.id) AS max_models
     FROM udb_units u
     WHERE u.faction_id = $1
     ORDER BY u.role, u.name ASC`,
    [factionId]
  );
}
```

### useUdbUnits Hook
```typescript
// Source: mirrors useDatasheet.ts pattern
export const UDB_UNITS_KEY = (factionId: string) => ["udb", "units", factionId] as const;

export function useUdbUnits(factionId: string | null) {
  return useQuery({
    queryKey: factionId ? UDB_UNITS_KEY(factionId) : (["udb", "units", "disabled"] as const),
    queryFn: () => factionId ? getUdbUnitsByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-window` / `react-virtualized` | `@tanstack/react-virtual` v3 | TanStack Virtual v3 released 2023 | Headless, framework-agnostic, works with TanStack ecosystem |
| FTS5 substring workaround (LIKE) | FTS5 MATCH with `*` prefix for prefix search | SQLite FTS5 available since SQLite 3.9.0 (2015) | Orders of magnitude faster on 1700+ rows |
| Separate DB for rules data | All data in hobbyforge.db (udb_* tables) | Phase 103 decision | Simpler client; no cross-DB join needed; uses existing getDb() singleton |

**Deprecated/outdated:**
- `rw_*` tables / `rules-client.ts`: Legacy Wahapedia sync tables in rules.db. Phase 104 must NOT use these — all udb_* data is in hobbyforge.db via getDb(). The rw_* tables will be removed in Phase 107.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Faction IDs in `udb_factions` match the keys used in `FACTION_ALIGNMENT` const (e.g., "SM", "NEC", "AM") | Architecture Patterns (Pattern 4) | Factions appear in "Other" group or not at all; low severity since fallback group is recommended |
| A2 | `udb_unit_weapons.category` values are "Ranged" and "Melee" (title case) | Common Pitfalls (Pitfall 5) | Weapon tables render incorrectly; fix is a case-insensitive comparison |
| A3 | Phase 103 seeded `udb_search` FTS5 table with all ~1711 units | Standard Stack / BUI-04 | Search returns empty; fix requires re-running import_unit_database |
| A4 | `udb_unit_abilities.ability_type` values match "Core" / "Faction" / unit-type strings (same as PlaybookDatasheet.tsx convention) | Code Examples / BUI-03 | Ability grouping renders incorrectly; fix is adjusting the filter conditions |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.
*(Table is not empty — A1-A4 above require implementation-time verification against actual DB data.)*

---

## Open Questions

1. **Exact faction IDs in udb_factions**
   - What we know: Migration 038 comments say IDs "reuse Wahapedia text IDs like 'SM', 'NEC'"
   - What's unclear: The full list of IDs actually present after Phase 103 import — needed to populate `FACTION_ALIGNMENT` map
   - Recommendation: Wave 1 task should include a query against the actual DB and populate the map from real data before building the picker UI

2. **Virtual scroll height for the unit list container**
   - What we know: `useVirtualizer` requires a fixed-height scroll container
   - What's unclear: Whether a fixed pixel height (`600px`) or a CSS calc (`calc(100vh - toolbar-height)`) should be used
   - Recommendation: Use `calc(100vh - Xpx)` with appropriate offset for toolbar + filter bar — this is Claude's discretion per CONTEXT.md

3. **Whether role grouping uses Collapsibles or visual section dividers**
   - What we know: D-05 specifies "collapsible section headers"
   - What's unclear: Whether collapsibility can coexist with a single virtualizer (requires flattened list with header items)
   - Recommendation: Implement as a flattened virtual list with interleaved header items (type discriminated union). This is more complex to build but avoids the anti-pattern described in Pitfall 1.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tanstack/react-virtual` | BUI-06 virtual scrolling | Not installed | 3.13.26 on npm | None — must install |
| `hobbyforge.db` with udb_* tables | All BUI-* queries | Depends on Phase 103 | Phase 103 complete | None — Phase 103 is a hard dependency |
| Lucide `BookMarked` icon | D-01 sidebar nav | Available (lucide-react ^0.460.0) | Current | Use `Database` or `Library` as alternative |

**Missing dependencies with no fallback:**
- `@tanstack/react-virtual` must be installed (`pnpm add @tanstack/react-virtual`) before any BUI-06 work

**Missing dependencies with fallback:**
- None

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts (inferred from package.json `"test": "vitest run"`) |
| Quick run command | `pnpm test -- tests/unit-database/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUI-01 | Faction picker renders alignment groups | unit | `pnpm test -- tests/unit-database/FactionPicker.test.tsx` | ❌ Wave 0 |
| BUI-02 | Unit rows show name, base points, model count | unit | `pnpm test -- tests/unit-database/UdbUnitRow.test.tsx` | ❌ Wave 0 |
| BUI-03 | Datasheet Sheet renders stat block, weapons, abilities, keywords | unit | `pnpm test -- tests/unit-database/UdbDatasheetSheet.test.tsx` | ❌ Wave 0 |
| BUI-04 | FTS5 search query sanitizes input and returns results | unit | `pnpm test -- tests/unit-database/unitDatabase.queries.test.ts` | ❌ Wave 0 |
| BUI-05 | applyUdbFilters applies role/keyword/point range AND logic | unit | `pnpm test -- tests/unit-database/applyUdbFilters.test.ts` | ❌ Wave 0 |
| BUI-06 | Virtual list renders only visible items | unit | `pnpm test -- tests/unit-database/UdbUnitList.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/unit-database/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit-database/FactionPicker.test.tsx` — covers BUI-01
- [ ] `tests/unit-database/UdbUnitRow.test.tsx` — covers BUI-02
- [ ] `tests/unit-database/UdbDatasheetSheet.test.tsx` — covers BUI-03
- [ ] `tests/unit-database/unitDatabase.queries.test.ts` — covers BUI-04 (FTS5 sanitization + getUdbFactions/getUdbUnitsByFaction stubs)
- [ ] `tests/unit-database/applyUdbFilters.test.ts` — covers BUI-05
- [ ] `tests/unit-database/UdbUnitList.test.tsx` — covers BUI-06

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Sanitize FTS5 query input before MATCH; strip operator chars |
| V6 Cryptography | no | — |

### Known Threat Patterns for SQLite FTS5 + User Input

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| FTS5 query injection (operator chars crash query) | Tampering | Strip `"'*^()` from user search input before MATCH |
| SQL injection via positional params | Tampering | Project already uses `$1, $2` parameterized queries; maintain this pattern in unitDatabase.ts |

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/migrations/038_udb_schema.sql` — Complete udb_* table definitions, column names, types, FTS5 schema
- `src/features/rules-hub/rulesHubFilters.ts` — Zustand filter store pattern (exact template to follow)
- `src/features/units/collectionFilters.ts` — Second Zustand filter store reference
- `src/features/units/PlaybookDatasheet.tsx` — Datasheet rendering pattern (WargearTable, AbilityEntry, Collapsible structure)
- `src/features/rules-hub/RulesHubPage.tsx` — Faction-scoped reference page pattern
- `src/app/router.tsx` — Route registration pattern (lazy + named export adapter)
- `src/components/common/AppSidebar.tsx` — PLAY_NAV const structure + icon imports
- `src/db/client.ts` — getDb() singleton (confirmed: all udb_* queries use this)
- `package.json` — Confirmed @tanstack/react-virtual NOT currently installed

### Secondary (MEDIUM confidence)
- npm registry: `@tanstack/react-virtual` v3.13.26, MIT, published 2026-05-25, no postinstall script [VERIFIED: npm registry]
- github.com/TanStack/virtual: Official source for useVirtualizer API — count, getScrollElement, estimateSize, overscan options; getVirtualItems() rendering loop; getTotalSize() for container height; translateY transform pattern [CITED: github.com/TanStack/virtual]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified via npm registry; existing packages confirmed in package.json
- Architecture: HIGH — patterns confirmed by reading actual source files (RulesHubPage, PlaybookDatasheet, rulesHubFilters, router, AppSidebar)
- DB schema: HIGH — read from migration 038 directly
- Pitfalls: HIGH (Pitfalls 1-4, 6) / MEDIUM (Pitfall 5 — depends on Phase 103 implementation details)

**Research date:** 2026-05-29
**Valid until:** 2026-07-29 (stable stack; udb_* schema is locked after Phase 103)
