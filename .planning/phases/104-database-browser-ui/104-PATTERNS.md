# Phase 104: Database Browser UI - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 13 new/modified files
**Analogs found:** 12 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/queries/unitDatabase.ts` | query-module | CRUD | `src/db/queries/datasheets.ts` | exact |
| `src/hooks/useUnitDatabase.ts` | hook | request-response | `src/hooks/useDatasheet.ts` | exact |
| `src/features/unit-database/databaseBrowserFilters.ts` | store | event-driven | `src/features/rules-hub/rulesHubFilters.ts` | exact |
| `src/features/unit-database/applyUdbFilters.ts` | utility | transform | `src/features/units/applyUnitFilters.ts` | exact |
| `src/features/unit-database/factionAlignmentMap.ts` | utility | transform | `src/db/queries/datasheets.ts` (FACTION_ALIAS_MAP) | role-match |
| `src/features/unit-database/DatabaseBrowserPage.tsx` | component | request-response | `src/features/rules-hub/RulesHubPage.tsx` | exact |
| `src/features/unit-database/FactionPicker.tsx` | component | request-response | `src/features/rules-hub/RulesHubPage.tsx` (faction Select) | role-match |
| `src/features/unit-database/UdbUnitList.tsx` | component | request-response | `src/features/rules-hub/RulesHubPage.tsx` (filtered lists) | role-match |
| `src/features/unit-database/UdbUnitRow.tsx` | component | request-response | `src/features/rules-hub/RulesHubPage.tsx` (card items) | role-match |
| `src/features/unit-database/UdbDatasheetSheet.tsx` | component | request-response | `src/features/units/PlaybookDatasheet.tsx` | exact |
| `src/features/unit-database/UdbSearchResults.tsx` | component | request-response | `src/features/rules-hub/RulesHubPage.tsx` (filtered list) | role-match |
| `src/app/unit-database/page.tsx` | page-shell | request-response | `src/app/rules-hub/page.tsx` | exact |
| `src/app/router.tsx` (modified) | config | — | self | — |
| `src/components/common/AppSidebar.tsx` (modified) | config | — | self | — |

---

## Pattern Assignments

### `src/db/queries/unitDatabase.ts` (query-module, CRUD)

**Analog:** `src/db/queries/datasheets.ts`

**Imports pattern** (lines 1-21):
```typescript
import { getDb } from "@/db/client";
// Note: ALL udb_* queries use getDb() from client.ts — NOT getRulesDb().
// udb_* tables live in hobbyforge.db, not rules.db.
```

**Core query pattern** — faction list (lines 44-51):
```typescript
export async function getDatasheetsByFaction(
  factionId: string
): Promise<DatasheetSummary[]> {
  const db = await getRulesDb();
  return db.select<DatasheetSummary[]>(
    "SELECT id, name, role FROM rw_datasheets WHERE faction_id = $1 ORDER BY name ASC",
    [factionId]
  );
}
```
Copy this structure for `getUdbFactions()` and `getUdbUnitsByFaction(factionId)`. Use `getDb()` instead of `getRulesDb()`.

**Core query pattern** — full detail join (lines 63-103):
```typescript
export async function getFullDatasheet(
  datasheetId: string
): Promise<FullDatasheet | null> {
  const db = await getRulesDb();
  const dsRows = await db.select<RwDatasheet[]>(
    "SELECT * FROM rw_datasheets WHERE id = $1",
    [datasheetId]
  );
  const ds = dsRows[0];
  if (!ds) return null;

  const models = await db.select<RwDatasheetModel[]>(...);
  const abilities = await db.select<RwDatasheetAbility[]>(...);
  const keywords = await db.select<RwDatasheetKeyword[]>(...);
  const wargear = await db.select<RwDatasheetWargear[]>(...);
  return { ds, models, abilities, keywords, source: sourceRows[0] ?? null, wargear };
}
```
Copy this "early-null-guard + Promise.all parallel selects" pattern for `getUdbUnitDetail(unitId)`. Return `null` when unit not found.

**FTS5 input sanitization pattern** — see `searchAllDatasheets` (lines 383-393):
```typescript
export async function searchAllDatasheets(
  query: string
): Promise<DatasheetSummary[]> {
  if (query.trim().length < 2) return [];
  const db = await getRulesDb();
  return db.select<DatasheetSummary[]>(
    "SELECT id, name, role FROM rw_datasheets WHERE LOWER(name) LIKE '%' || LOWER($1) || '%' ESCAPE '\\' ORDER BY name ASC LIMIT 100",
    [escapeLike(query.trim())]
  );
}
```
For `searchUdbUnits`, use `udb_search MATCH $1` instead of LIKE — but apply the same length guard (`< 2`) and sanitize FTS5 operator chars (`"'*^()`) before calling MATCH. Add `"*"` suffix for prefix search.

**Error handling pattern**: No explicit try/catch in query functions — errors bubble to React Query's `error` state. Exception: `getRulesSyncMeta` wraps in try/catch for "table not found" startup case. Apply the same safe-catch only to queries where the table might not exist.

---

### `src/hooks/useUnitDatabase.ts` (hook, request-response)

**Analog:** `src/hooks/useDatasheet.ts`

**Imports pattern** (lines 1-25):
```typescript
import { useQuery } from "@tanstack/react-query";
import {
  getUdbFactions,
  getUdbUnitsByFaction,
  getUdbUnitDetail,
  searchUdbUnits,
} from "@/db/queries/unitDatabase";
```

**Query key constants pattern** (lines 27-31):
```typescript
export const DATASHEET_KEY = (unitId: number) => ["datasheet", unitId] as const;
export const DATASHEETS_BY_FACTION_KEY = (factionId: string) =>
  ["datasheets-by-faction", factionId] as const;
export const RULES_SYNC_META_KEY = ["rules-sync-meta"] as const;
```
Copy this pattern for udb keys:
```typescript
export const UDB_FACTIONS_KEY = ["udb", "factions"] as const;
export const UDB_UNITS_KEY = (factionId: string) => ["udb", "units", factionId] as const;
export const UDB_UNIT_DETAIL_KEY = (unitId: string) => ["udb", "detail", unitId] as const;
export const UDB_SEARCH_KEY = (query: string) => ["udb", "search", query] as const;
```

**Conditional enabled + staleTime: Infinity pattern** (lines 37-49):
```typescript
export function useDatasheet(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? DATASHEET_KEY(unitId) : (["datasheet", "disabled"] as const),
    queryFn: async () => {
      if (unitId === undefined) return null;
      // ...
    },
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}
```
Apply `enabled: !!factionId` for `useUdbUnits` and `enabled: !!unitId` for `useUdbUnitDetail`. Use `staleTime: Infinity` on all udb hooks — data only changes when the import pipeline reruns.

**Faction-gated list hook pattern** (lines 54-65):
```typescript
export function useDatasheetsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey:
      factionId !== undefined
        ? DATASHEETS_BY_FACTION_KEY(factionId)
        : (["datasheets-by-faction", "disabled"] as const),
    queryFn: () =>
      factionId !== undefined ? getDatasheetsByFaction(factionId) : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}
```
Copy exactly for `useUdbUnits(factionId: string | null)`, using `enabled: !!factionId`.

---

### `src/features/unit-database/databaseBrowserFilters.ts` (store, event-driven)

**Analog:** `src/features/rules-hub/rulesHubFilters.ts`

**Complete file pattern** (lines 1-25 — entire file):
```typescript
import { create } from "zustand";

interface RulesHubFiltersState {
  selectedFactionId: string | null;
  searchText: string;
  phaseFilter: string | null;
  cpFilter: string | null;
  setSelectedFactionId: (id: string | null) => void;
  setSearchText: (text: string) => void;
  setPhaseFilter: (phase: string | null) => void;
  setCpFilter: (cp: string | null) => void;
  clearFilters: () => void;
}

export const useRulesHubFilters = create<RulesHubFiltersState>((set) => ({
  selectedFactionId: null,
  searchText: "",
  phaseFilter: null,
  cpFilter: null,
  setSelectedFactionId: (id) => set({ selectedFactionId: id }),
  setSearchText: (text) => set({ searchText: text }),
  setPhaseFilter: (phase) => set({ phaseFilter: phase }),
  setCpFilter: (cp) => set({ cpFilter: cp }),
  clearFilters: () => set({ searchText: "", phaseFilter: null, cpFilter: null }),
}));
```
Extend this template — add `roleFilter`, `keywordFilter`, `pointMin`, `pointMax` fields following the same `set(...)` setter pattern. The `clearFilters` must NOT reset `selectedFactionId` (faction selection is navigation state, not a filter).

---

### `src/features/unit-database/applyUdbFilters.ts` (utility, transform)

**Analog:** `src/features/units/applyUnitFilters.ts`

**Complete file pattern** (lines 1-26 — entire file):
```typescript
import type { Unit, PaintingStatus } from "@/types/unit";

export interface UnitFiltersInput {
  search: string;
  factions: number[];
  statuses: PaintingStatus[];
  // ...
}

export function applyUnitFilters<T extends Unit>(units: T[], filters: UnitFiltersInput): T[] {
  const search = filters.search.trim().toLowerCase();
  return units.filter((unit) => {
    if (filters.battleReady && !(unit.status_assembly === 1 && unit.status_painting === "Completed")) return false;
    if (filters.factions.length > 0 && !filters.factions.includes(unit.faction_id)) return false;
    // ...
    if (search.length > 0 && !unit.name.toLowerCase().includes(search)) return false;
    return true;
  });
}
```
Mirror this: pure function, typed `FiltersInput` interface, early-return pattern per condition. For `applyUdbFilters`:
- Role filter: `if (filters.roleFilter && unit.role !== filters.roleFilter) return false;`
- Keyword filter: string inclusion check against a pre-joined keywords string
- Point range: `if (filters.pointMin !== null && (unit.base_points ?? 0) < filters.pointMin) return false;`

---

### `src/features/unit-database/factionAlignmentMap.ts` (utility, transform)

**Analog:** `src/db/queries/datasheets.ts` — `FACTION_ALIAS_MAP` const (lines 178-228)

**Const map pattern** (lines 178-199):
```typescript
const FACTION_ALIAS_MAP: Record<string, string> = {
  "ultramarines": "space marines",
  "blood angels": "space marines",
  // ...
};
```
Copy the `Record<string, string>` const pattern. For `FACTION_ALIGNMENT`, use:
```typescript
export const FACTION_ALIGNMENT: Record<string, "Imperium" | "Space Marines" | "Chaos" | "Xenos"> = {
  "SM": "Space Marines",
  // ...
};
export const ALIGNMENT_ORDER = ["Space Marines", "Imperium", "Chaos", "Xenos"] as const;
export type Alignment = typeof ALIGNMENT_ORDER[number];
```
Include a fallback export for ungrouped factions: `export const DEFAULT_ALIGNMENT = "Other"`. Verify actual IDs against `udb_factions` table during Wave 1 before the FactionPicker is built.

---

### `src/features/unit-database/DatabaseBrowserPage.tsx` (component, request-response)

**Analog:** `src/features/rules-hub/RulesHubPage.tsx`

**Imports pattern** (lines 1-34):
```typescript
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRulesHubFilters } from "./rulesHubFilters";
import { useStratagemsByFaction } from "@/hooks/useRulesExtended";
import { applyStratagemFilters } from "./applyRulesHubFilters";
```
Replace with udb equivalents; same import groups (shadcn primitives → local hooks → local utils).

**Page container pattern** (lines 127-131):
```typescript
return (
  <div className="flex flex-col gap-6 p-6">
    <h1 className="text-3xl font-semibold tracking-tight">Rules Hub</h1>
    // ...
  </div>
);
```
Use the same `flex flex-col gap-6 p-6` outer container and `text-3xl font-semibold tracking-tight` heading class.

**Search + faction controls pattern** (lines 144-169):
```typescript
<div className="flex flex-wrap items-center gap-3">
  <Select value={selectedFactionId ?? ""} onValueChange={(val) => setSelectedFactionId(val || null)}>
    <SelectTrigger className="w-56"><SelectValue placeholder="Select army…" /></SelectTrigger>
    <SelectContent>
      {wahapediaFactions.map((f) => (
        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  <Input className="w-56" placeholder="Search…" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
</div>
```
The search bar in DatabaseBrowserPage is global (FTS5-backed), not local filter. Place it above the two-panel layout, full width. When `searchText` is non-empty, hide the faction picker and unit list; show `UdbSearchResults` instead.

**Empty / no-data guard pattern** (lines 138-142, 171-174):
```typescript
{noData ? (
  <p className="text-sm text-muted-foreground">Sync rules data to get started.</p>
) : (
  // ... content
)}
{noFaction ? (
  <p className="text-sm text-muted-foreground">Select an army to browse rules.</p>
) : (
  // ... content
)}
```
Apply same defensive guard: show "Select a faction to browse units." when `!selectedFactionId` and search is inactive.

**useMemo filter pattern** (lines 74-93):
```typescript
const filteredStratagems = useMemo(
  () => applyStratagemFilters(stratagems, { searchText, phaseFilter, cpFilter }),
  [stratagems, searchText, phaseFilter, cpFilter]
);
```
Use same `useMemo` wrapping `applyUdbFilters(units, { roleFilter, keywordFilter, pointMin, pointMax })`.

---

### `src/features/unit-database/FactionPicker.tsx` (component, request-response)

**Analog:** `src/features/rules-hub/RulesHubPage.tsx` — faction Select block (lines 144-163)

The Rules Hub uses a `<Select>` dropdown for faction. FactionPicker replaces this with an alignment-grouped scrollable list. Extract the same data (`useUdbFactions`) but render as a vertical list with section headers instead of a dropdown.

**Skeleton loading pattern** (lines 221-228):
```typescript
{stratagemLoading ? (
  <div className="flex flex-col gap-2">
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
    ))}
  </div>
) : (
```
Use `<Skeleton className="h-8 w-full rounded" />` repeated 5 times while `useUdbFactions` is loading.

**Active/selected item pattern**: Use `cn()` with a conditional class for the selected faction button. See `NavItem` in AppSidebar for the active-link pattern (TanStack Router `data-active` or manual `selectedFactionId === faction.id` comparison).

---

### `src/features/unit-database/UdbUnitList.tsx` (component, request-response)

**Analog:** `src/features/rules-hub/RulesHubPage.tsx` — filtered card lists (lines 231-244)

**Skeleton loading pattern** (lines 221-228) — same as above, 3–5 skeleton rows.

**Empty state pattern** (lines 233-237):
```typescript
{filteredStratagems.length === 0 ? (
  <p className={cn("text-sm text-muted-foreground italic")}>
    No stratagems match your filters.
  </p>
) : (
```
Apply same empty state for zero-unit result after filtering.

**Collapsible section header pattern** from `PlaybookDatasheet.tsx` (lines 29-53):
```typescript
<Collapsible defaultOpen={true}>
  <CollapsibleTrigger asChild>
    <button type="button" className="flex items-center justify-between w-full py-2 text-left">
      <span className="text-base font-semibold">Weapons</span>
      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
    </button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* items */}
  </CollapsibleContent>
</Collapsible>
```
Use this for each role section header. Per RESEARCH.md anti-pattern warning: do NOT put a separate `useVirtualizer` inside each Collapsible. Apply one virtualizer to the entire flattened list where section header items and unit items are interleaved as a discriminated union: `type VirtualItem = { kind: 'header'; role: string } | { kind: 'unit'; unit: UdbUnitSummary }`.

---

### `src/features/unit-database/UdbUnitRow.tsx` (component, request-response)

**Analog:** `src/features/rules-hub/RulesHubPage.tsx` — card item pattern

No direct single-row analog exists. The closest structural equivalent is the `StratagemCard` or `DetachmentCard` child components. Copy the common item structure:
- Outer `<div>` as a clickable row with `onClick` handler
- `border-b border-border` separator
- `text-sm font-medium` for unit name, `text-xs text-muted-foreground tabular-nums` for points/count
- `<Badge>` from shadcn/ui for the role label

**Named export pattern** (from CLAUDE.md conventions):
```typescript
export function UdbUnitRow({ unit, onOpen }: { unit: UdbUnitSummary; onOpen: (id: string) => void }) { ... }
```

---

### `src/features/unit-database/UdbDatasheetSheet.tsx` (component, request-response)

**Analog:** `src/features/units/PlaybookDatasheet.tsx`

**Collapsible weapons section pattern** (lines 28-53 — full block):
```typescript
{hasWeapons && (
  <Collapsible defaultOpen={true}>
    <CollapsibleTrigger asChild>
      <button type="button" className="flex items-center justify-between w-full py-2 text-left">
        <span className="text-base font-semibold">Weapons</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
      </button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="flex flex-col gap-4">
        {rangedWeapons.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className={SECTION_LABEL_CLASS}>Ranged</span>
            <WargearTable weapons={rangedWeapons} statLabel="BS" />
          </div>
        )}
        {meleeWeapons.length > 0 && ...}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```
Copy this pattern for udb weapon data — rename `WargearTable` to `UdbWeaponTable`, update prop types to `UdbWeapon[]`. Use `w.category?.toLowerCase() === "ranged"` for the split (case-insensitive per Pitfall 5 in RESEARCH.md).

**Ability grouping pattern** (lines 57-101):
```typescript
const coreAbilities = (datasheet?.abilities ?? []).filter((a) => a.type === "Core");
const factionAbilities = (datasheet?.abilities ?? []).filter((a) => a.type === "Faction");
const unitAbilities = (datasheet?.abilities ?? []).filter((a) =>
  a.type !== "Core" && a.type !== "Faction"
);
```
Copy the three-way split. For udb data, filter on `a.ability_type` instead of `a.type`. Include a null guard: `(detail?.abilities ?? [])`.

**Section label constant** (line 7):
```typescript
const SECTION_LABEL_CLASS =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";
```
Copy this constant verbatim.

**AbilityEntry sub-component pattern** (lines 162-173):
```typescript
function AbilityEntry({ ability }: { ability: RwDatasheetAbility }) {
  return (
    <div className="flex flex-col gap-1 pl-2 border-l border-border">
      <span className="text-sm font-semibold text-foreground">{ability.name}</span>
      {ability.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {ability.description}
        </p>
      )}
    </div>
  );
}
```
Copy verbatim, rename to `UdbAbilityEntry`, update prop type to `UdbAbility`.

**WargearTable grid pattern** (lines 126-159):
```typescript
<div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1 border-b border-border">
  {["Name", "Rng", "A", statLabel, "S", "AP", "D"].map((h) => (
    <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left">
      {h}
    </span>
  ))}
</div>
```
Copy the `grid-cols-[1fr_36px_...]` layout for the stat table. Column widths are tuned for weapon stat readability — do not change.

The Sheet wrapper itself (not present in PlaybookDatasheet which is an inline component): use the existing Sheet open/close pattern from any `*Sheet.tsx` in the codebase. The Sheet should receive `unitId: string | null` and `onClose: () => void` as props. Use `enabled: !!unitId` in `useUdbUnitDetail` called inside the Sheet.

---

### `src/features/unit-database/UdbSearchResults.tsx` (component, request-response)

**Analog:** `src/features/rules-hub/RulesHubPage.tsx` — filtered list pattern (lines 231-244)

Same filtered-card-list pattern. Each result row shows: faction name (muted), unit name (primary), role badge, base points. Clicking a result calls a callback that sets `selectedFactionId` in Zustand and opens the unit's Sheet. Show "No results" empty state when `results.length === 0` and query has been typed (same `text-sm text-muted-foreground italic` class).

---

### `src/app/unit-database/page.tsx` (page-shell, request-response)

**Analog:** `src/app/rules-hub/page.tsx`

**Complete file pattern** (lines 1-5 — entire file):
```typescript
import { RulesHubPage } from "@/features/rules-hub/RulesHubPage";

export function RulesHubPageShell() {
  return <RulesHubPage />;
}
```
Copy exactly, rename exports:
```typescript
import { DatabaseBrowserPage } from "@/features/unit-database/DatabaseBrowserPage";

export function UnitDatabasePageShell() {
  return <DatabaseBrowserPage />;
}
```

---

### `src/app/router.tsx` (modified)

**Pattern source:** existing lazy imports (lines 19-35) and route definitions (lines 174-178) and routeTree (lines 206-225)

**Lazy import pattern** (lines 32-33):
```typescript
const RulesHubPageShell = lazy(() => import("./rules-hub/page").then(m => ({ default: m.RulesHubPageShell })));
```
Add after this line:
```typescript
const UnitDatabasePageShell = lazy(() => import("./unit-database/page").then(m => ({ default: m.UnitDatabasePageShell })));
```

**Route definition pattern** (lines 174-178):
```typescript
const rulesHubRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/rules-hub",
  component: RulesHubPageShell,
});
```
Add matching `unitDatabaseRoute` with `path: "/unit-database"` and add to `layoutRoute.addChildren([...])` array alongside `rulesHubRoute`.

---

### `src/components/common/AppSidebar.tsx` (modified)

**Pattern source:** `PLAY_NAV` const (lines 47-51) and Lucide icon import (lines 1-22)

**PLAY_NAV pattern** (lines 47-51):
```typescript
const PLAY_NAV = [
  { to: "/army-lists",    label: "Army Lists",    icon: ClipboardList },
  { to: "/battle-log",    label: "Battle Log",    icon: Swords },
  { to: "/rules-hub",     label: "Rules Hub",     icon: Library },
] as const;
```
Add `BookMarked` to the Lucide import block (line 7) and append to PLAY_NAV:
```typescript
{ to: "/unit-database", label: "Unit Database", icon: BookMarked },
```
The `as const` assertion must remain for the typed nav array.

---

## Shared Patterns

### Query Client — `getDb()` singleton
**Source:** `src/db/client.ts` (imported as `import { getDb } from "@/db/client"` in every query file)
**Apply to:** `src/db/queries/unitDatabase.ts`
**Rule:** ALL udb_* queries use `getDb()`. Never use `getRulesDb()` for udb_* tables.

### staleTime: Infinity for static reference data
**Source:** `src/hooks/useDatasheet.ts` lines 46, 63, 75
**Apply to:** All four hooks in `src/hooks/useUnitDatabase.ts`
**Rationale:** udb_* data only changes when `import_unit_database` runs (Phase 103 flow). Infinity prevents skeleton flash on every faction click.

### `enabled: !!param` conditional query
**Source:** `src/hooks/useDatasheet.ts` lines 44, 62
**Apply to:** `useUdbUnits(factionId)` and `useUdbUnitDetail(unitId)` — do not fetch until user has selected a faction or opened a unit.

### Disabled key pattern
**Source:** `src/hooks/useDatasheet.ts` lines 39, 57
```typescript
queryKey: unitId !== undefined ? DATASHEET_KEY(unitId) : (["datasheet", "disabled"] as const),
```
Apply the same `["udb", "...", "disabled"] as const` fallback key when the param is null/undefined.

### Skeleton loading state
**Source:** `src/features/rules-hub/RulesHubPage.tsx` lines 221-228
```typescript
{loading ? (
  <div className="flex flex-col gap-2">
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
    ))}
  </div>
) : (
```
Apply to FactionPicker (while `useUdbFactions` loads), UdbUnitList (while `useUdbUnits` loads), and UdbDatasheetSheet (while `useUdbUnitDetail` loads).

### useMemo for derived/filtered lists
**Source:** `src/features/rules-hub/RulesHubPage.tsx` lines 74-77
```typescript
const filteredStratagems = useMemo(
  () => applyStratagemFilters(stratagems, { searchText, phaseFilter, cpFilter }),
  [stratagems, searchText, phaseFilter, cpFilter]
);
```
Apply in `DatabaseBrowserPage` for the client-side-filtered unit list. The role grouping (`groupBy(units, u => u.role)`) is also a `useMemo` computation.

### Page container + heading classes
**Source:** `src/features/rules-hub/RulesHubPage.tsx` lines 127-130
```typescript
<div className="flex flex-col gap-6 p-6">
  <h1 className="text-3xl font-semibold tracking-tight">Rules Hub</h1>
```
Use `flex flex-col gap-6 p-6` and `text-3xl font-semibold tracking-tight` for all page-level layouts.

### `$1, $2` positional SQL params
**Source:** `src/db/queries/datasheets.ts` — all query calls
**Apply to:** All SQL in `src/db/queries/unitDatabase.ts`
**Rule:** Tauri plugin-sql requires positional `$1, $2` syntax, not `?` placeholders.

### Named component exports
**Source:** CLAUDE.md conventions
```typescript
export function UdbUnitRow({ unit, onOpen }: { unit: UdbUnitSummary; onOpen: (id: string) => void }) { ... }
```
All components use named function exports with inline prop types. No default exports except page shells.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `@tanstack/react-virtual` usage in `UdbUnitList.tsx` | library integration | — | No existing virtual scroll in codebase. Use RESEARCH.md Pattern 2 (useVirtualizer) as the pattern source. The single-virtualizer-over-flattened-list approach (not per-section) is required per anti-pattern warning in RESEARCH.md. |

---

## Metadata

**Analog search scope:** `src/features/`, `src/db/queries/`, `src/hooks/`, `src/app/`, `src/components/common/`
**Files read:** 11 source files
**Pattern extraction date:** 2026-05-29
