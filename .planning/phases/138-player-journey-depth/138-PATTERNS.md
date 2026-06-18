# Phase 138: Player-Journey Depth — Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/queries/unitDatabase.ts` (add `getUdbUnitsByIds`, `getOwnedCountsByUdbUnitId`) | query | batch CRUD | same file — `getUdbUnitDetail` (line 198), `getUdbOwnershipByFaction` (line 292) | exact |
| `src/hooks/useUnitDatabase.ts` (add `useUdbUnitsByIds`, `useUdbOwnershipAll`) | hook | request-response | same file — `useUdbUnitDetail` (line 73), `useUdbOwnership` (line 135) | exact |
| `src/features/unit-database/databaseBrowserFilters.ts` (add `compareIds` Set + actions) | store | event-driven | same file — existing `setSelectedFactionId` / `clearFilters` shape | exact |
| `src/features/unit-database/UnitComparePage.tsx` (new) | component/page | request-response | `src/features/dashboard/DashboardPage.tsx` (full-page route; `useMemo` diff map) | role-match |
| `src/features/unit-database/UnitCompareColumn.tsx` (new) | component | transform | `src/features/unit-database/UdbDatasheetSheet.tsx` (stat block + WeaponTable + abilities/keywords/points sections) | exact |
| `src/features/unit-database/UnitCompareActionBar.tsx` (new) | component | event-driven | `src/features/dashboard/DashboardPage.tsx` (sticky toolbar with Button variants + count label) | role-match |
| `src/features/unit-database/UdbUnitRow.tsx` (modify — add compare toggle + owned-badge Link) | component | event-driven | same file — existing `Badge variant="outline"` + `onOpen` click pattern | exact |
| `src/features/unit-database/UdbDatasheetSheet.tsx` (modify — wrap owned badge in Link) | component | event-driven | same file — `ownershipData` prop, badge at lines 109-113 | exact |
| `src/features/unit-database/UdbSearchResults.tsx` (modify — add `ownershipAllMap` prop + badges) | component | request-response | `src/features/unit-database/UdbUnitRow.tsx` (badge + readiness dot rendering) + `DatabaseBrowserPage.tsx` ownershipMap memo | role-match |
| `src/features/unit-database/DatabaseBrowserPage.tsx` (modify — wire `UnitCompareActionBar`, `useUdbOwnershipAll`, pass `ownershipAllMap`) | page | request-response | same file — `ownershipMap` useMemo at lines 88-97 | exact |
| `src/features/units/collectionFilters.ts` (add `udbUnitIdFilter`) | store | event-driven | same file — existing `subFactionFilter` / `setSubFactionFilter` / `clearAll` pattern | exact |
| `src/features/units/applyUnitFilters.ts` (add `udbUnitIdFilter` clause) | utility | transform | same file — existing `if (filters.factions.length > 0 ...)` clause pattern | exact |
| `src/features/dashboard/GoalProgressCard.tsx` (new) | component | request-response | `src/features/goals/GoalCard.tsx` (progress bar idiom) + `src/features/dashboard/DashboardPage.tsx` (section header + Card shell) | exact |
| `src/features/dashboard/DashboardPage.tsx` (modify — add "Hobby Goals" section in left column) | page | request-response | same file — "Hobby Health" section at lines 386-411 | exact |
| `src/app/router.tsx` (add `unitDatabaseCompareRoute`) | config/route | request-response | same file — `paintingModeRoute` (flat sibling under `bareLayoutRoute`), `unitDatabaseRoute` (lines 200-208) | exact |

---

## Pattern Assignments

### `src/db/queries/unitDatabase.ts` — add `getUdbUnitsByIds`

**Analog:** same file, `getUdbUnitDetail` (lines 198–265)

**Core pattern — single-unit query to multi-id batch** (lines 198–264):
```typescript
// EXISTING single-unit shape to generalize:
export async function getUdbUnitDetail(
  unitId: string,
  locale?: "en" | "fr",
): Promise<UdbUnitDetail | null> {
  const db = await getDb();
  const fr = locale === "fr";

  const unitRows = await db.select<{ id: string; faction_id: string; name: string; role: string | null; base_points: number | null; damaged_w: string | null; damaged_desc: string | null; }[]>(
    fr
      ? "SELECT id, faction_id, COALESCE(name_fr, name) AS name, role, base_points, damaged_w, damaged_desc FROM udb_units WHERE id = $1"
      : "SELECT id, faction_id, name, role, base_points, damaged_w, damaged_desc FROM udb_units WHERE id = $1",
    [unitId],
  );
  const unit = unitRows[0];
  if (!unit) return null;

  const [models, weapons, abilities, keywords, points, composition] =
    await Promise.all([
      db.select<UdbModel[]>(
        "SELECT * FROM udb_unit_models WHERE unit_id = $1 ORDER BY line_order",
        [unitId],
      ),
      db.select<UdbWeapon[]>(
        fr
          ? "SELECT id, unit_id, weapon_group, line_order, COALESCE(name_fr, name) AS name, category, range, attacks, skill, strength, ap, damage, keywords FROM udb_unit_weapons WHERE unit_id = $1 ORDER BY weapon_group, line_order"
          : "SELECT id, unit_id, weapon_group, line_order, name, category, range, attacks, skill, strength, ap, damage, keywords FROM udb_unit_weapons WHERE unit_id = $1 ORDER BY weapon_group, line_order",
        [unitId],
      ),
      // ... abilities, keywords, points, composition with same $1 param
    ]);

  return { ...unit, models, weapons, abilities, keywords, points, composition };
}
```

**New function shape** (derive by generalizing the above):
- Replace `WHERE id = $1` with `WHERE id IN (${placeholders})` where `placeholders = ids.map((_, i) => \`$${i + 1}\`).join(", ")`
- The unit rows query returns an array; use `Promise.all(unitRows.map(async (unit) => { ... sub-queries ... }))` where each sub-query uses `WHERE unit_id = $1` with `[unit.id]`
- Guard: `if (ids.length === 0) return []` at the top
- Signature: `getUdbUnitsByIds(ids: string[], locale?: "en" | "fr"): Promise<UdbUnitDetail[]>`

---

### `src/db/queries/unitDatabase.ts` — add `getOwnedCountsByUdbUnitId`

**Analog:** same file, `getUdbOwnershipByFaction` (lines 292–307) and `getUdbOwnershipForUnit` (lines 267–281)

**Analog pattern — faction-scoped GROUP BY** (lines 292–307):
```typescript
export async function getUdbOwnershipByFaction(
  factionId: string,
): Promise<UdbOwnershipEntry[]> {
  const db = await getDb();
  return db.select<UdbOwnershipEntry[]>(
    `SELECT u.udb_unit_id,
            COUNT(*) AS owned_count,
            GROUP_CONCAT(u.status_painting, '|') AS all_statuses
     FROM units u
     JOIN udb_units uu ON uu.id = u.udb_unit_id
     WHERE uu.faction_id = $1
       AND u.udb_unit_id IS NOT NULL
     GROUP BY u.udb_unit_id`,
    [factionId],
  );
}
```

**New function shape** (faction-agnostic superset — drop the faction JOIN and WHERE):
```sql
SELECT u.udb_unit_id,
       COUNT(*) AS owned_count,
       GROUP_CONCAT(u.status_painting, '|') AS all_statuses
FROM units u
WHERE u.udb_unit_id IS NOT NULL
GROUP BY u.udb_unit_id
```
- Return type: `Promise<UdbOwnershipEntry[]>` (same `UdbOwnershipEntry` interface — no new type needed)
- No parameters
- Signature: `getOwnedCountsByUdbUnitId(): Promise<UdbOwnershipEntry[]>`

---

### `src/hooks/useUnitDatabase.ts` — add `useUdbUnitsByIds`

**Analog:** same file, `useUdbUnitDetail` (lines 73–86)

**Imports pattern** (lines 13–27):
```typescript
import { useQuery } from "@tanstack/react-query";
import {
  getUdbUnitDetail,
  // ... add getUdbUnitsByIds here
} from "@/db/queries/unitDatabase";
import { useLocale } from "@/stores/localeStore";
import type { Locale } from "@/stores/localeStore";
```

**Analog hook** (lines 73–86):
```typescript
export const UDB_UNIT_DETAIL_KEY = (unitId: string, locale: Locale) =>
  ["udb-unit-detail", unitId, locale] as const;

export function useUdbUnitDetail(unitId: string | null) {
  const locale = useLocale();
  return useQuery({
    queryKey:
      unitId !== null
        ? UDB_UNIT_DETAIL_KEY(unitId, locale)
        : (["udb-unit-detail", "disabled"] as const),
    queryFn: () =>
      unitId !== null ? getUdbUnitDetail(unitId, locale) : Promise.resolve(null),
    enabled: !!unitId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
```

**New hook shape** (multi-id generalization):
- Key factory: `(ids: string[], locale: Locale) => ["udb-units-by-ids", [...ids].sort(), locale] as const`
  - CRITICAL: sort the ids array for stable cache key identity — `Set` is not JSON-serializable
- `enabled: ids.length > 0`
- `staleTime: Infinity, gcTime: Infinity` (canonical data, same as `useUdbUnitDetail`)
- `queryFn: () => getUdbUnitsByIds(ids, locale)`

---

### `src/hooks/useUnitDatabase.ts` — add `useUdbOwnershipAll`

**Analog:** same file, `useUdbOwnership` (lines 125–148)

**Analog hook** (lines 125–148):
```typescript
export const UDB_OWNERSHIP_KEY = (factionId: string) =>
  ["udb-ownership", factionId] as const;

export function useUdbOwnership(factionId: string | null): ReturnType<typeof useQuery<UdbOwnershipEntry[]>> {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_OWNERSHIP_KEY(factionId)
        : (["udb-ownership", "disabled"] as const),
    queryFn: () =>
      factionId !== null
        ? getUdbOwnershipByFaction(factionId)
        : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: 0,   // dynamic data — NOT Infinity
  });
}
```

**New hook shape** (no disabled branch; always-enabled):
- Key: `export const UDB_OWNERSHIP_ALL_KEY = ["udb-ownership-all"] as const`
- `staleTime: 0` (ownership is dynamic, same as `useUdbOwnership`)
- `queryFn: getOwnedCountsByUdbUnitId` (no args)
- No `enabled` guard needed (the query is always valid)
- Invalidation: `useUnits.ts` create/update/delete mutations must also invalidate `["udb-ownership-all"]` — same pattern as `["udb-ownership"]` prefix invalidation

---

### `src/features/unit-database/databaseBrowserFilters.ts` — add `compareIds` Set

**Analog:** same file, existing `create<DatabaseBrowserFiltersState>` (lines 1–43)

**Full existing store** (lines 1–43):
```typescript
import { create } from "zustand";

interface DatabaseBrowserFiltersState {
  selectedFactionId: string | null;
  searchText: string;
  // ... other fields
  setSelectedFactionId: (id: string | null) => void;
  setSearchText: (text: string) => void;
  // ... other setters
  clearFilters: () => void;
}

export const useDatabaseBrowserFilters = create<DatabaseBrowserFiltersState>(
  (set) => ({
    selectedFactionId: null,
    searchText: "",
    // ...
    setSelectedFactionId: (id) =>
      set({ selectedFactionId: id, subFactionFilter: null, roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }),
    setSearchText: (text) => set({ searchText: text }),
    clearFilters: () =>
      set({ searchText: "", subFactionFilter: null, roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }),
  }),
);
```

**New fields to add to interface and `create()` body:**
```typescript
// Add to interface:
compareIds: Set<string>;
addToCompare: (id: string) => void;
removeFromCompare: (id: string) => void;
clearCompare: () => void;

// Add to create() body initial state:
compareIds: new Set<string>(),

// Add to create() body actions:
addToCompare: (id) =>
  set((s) => {
    if (s.compareIds.size >= 3) return s;   // hard cap at 3
    const next = new Set(s.compareIds);
    next.add(id);
    return { compareIds: next };
  }),
removeFromCompare: (id) =>
  set((s) => {
    const next = new Set(s.compareIds);
    next.delete(id);
    return { compareIds: next };
  }),
clearCompare: () => set({ compareIds: new Set<string>() }),
```

---

### `src/features/unit-database/UnitComparePage.tsx` (new)

**Analog:** `src/features/dashboard/DashboardPage.tsx` (full-page route component; `useMemo` derived maps; loading/empty/populated branches)

**Imports pattern** (from `DashboardPage.tsx` lines 23–65):
```typescript
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
// Plus: useDatabaseBrowserFilters, useUdbUnitsByIds, UnitCompareColumn
```

**Page structure pattern** (DashboardPage lines 291–293, section pattern lines 372–435):
```typescript
// Three-branch pattern: loading → empty → populated
// (same as DashboardPage — always define all branches)
export function UnitComparePage() {
  const { compareIds, clearCompare } = useDatabaseBrowserFilters();
  const ids = useMemo(() => [...compareIds].sort(), [compareIds]);
  const { data: units = [], isLoading } = useUdbUnitsByIds(ids);

  // Diff map computed at page level — never per-column
  const statDiffMap = useMemo<Map<string, boolean>>(() => {
    const fields = ["M", "T", "Sv", "W", "Ld", "OC"] as const;
    const map = new Map<string, boolean>();
    for (const field of fields) {
      const values = units.map((u) => String(u.models[0]?.[field as keyof typeof u.models[0]] ?? null));
      map.set(field, new Set(values).size > 1);
    }
    return map;
  }, [units]);

  // Loading branch
  if (isLoading) { return <Skeleton ... /> }

  // Empty branch (< 2 ids)
  if (ids.length < 2) {
    return (/* "Select units to compare" empty state — Button navigates to "/unit-database" */);
  }

  // Populated branch
  return (
    <>
      <PageHeader title="Compare Units" actions={<Button variant="ghost" onClick={clearCompare}>Clear</Button>} />
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${units.length}, minmax(280px, 1fr))` }}>
        {units.map((unit) => (
          <UnitCompareColumn key={unit.id} unit={unit} statDiffMap={statDiffMap} allUnits={units} />
        ))}
      </div>
    </>
  );
}
```

---

### `src/features/unit-database/UnitCompareColumn.tsx` (new)

**Analog:** `src/features/unit-database/UdbDatasheetSheet.tsx` (sections: stat block + WeaponTable + abilities + keywords + points)

**Section label pattern** (`UdbDatasheetSheet.tsx` line 23):
```typescript
const SECTION_LABEL =
  "text-xs font-semibold text-muted-foreground uppercase tracking-wide";
```

**WeaponTable usage** (`UdbDatasheetSheet.tsx` line 21 + usage in JSX):
```typescript
import { WeaponTable } from "@/features/units/WeaponTable";
// Usage:
<WeaponTable weapons={rangedWeapons} statLabel="BS" />
<WeaponTable weapons={meleeWeapons} statLabel="WS" />
```

**Diff cell treatment** — wrap divergent values, not the WeaponTable itself:
```typescript
// For stat cells:
<span className={isDifferent ? "bg-faction-accent/15 rounded px-1" : ""}>
  {value ?? "—"}
</span>

// For weapon rows (absent in another column → highlight the name span):
const weaponNamesAcrossUnits = /* Set union of all weapon names in allUnits */;
const weaponAbsentElsewhere = /* this weapon name missing in at least one other unit */;
<div className={weaponAbsentElsewhere ? "bg-faction-accent/15 rounded px-1" : ""}>
  {/* weapon row */}
</div>
```

**Column card wrapper** (from UI-SPEC.md Surface 1):
```typescript
className="bg-card border border-border/60 shadow-sm rounded-lg p-4 flex flex-col gap-4"
```

---

### `src/features/unit-database/UnitCompareActionBar.tsx` (new)

**Analog:** `src/features/dashboard/DashboardPage.tsx` Button pattern + UI-SPEC.md Surface 2 spec

**Button imports pattern** (`DashboardPage.tsx` lines 26–27):
```typescript
import { Button } from "@/components/ui/button";
```

**Action bar structure** (from UI-SPEC.md Surface 2):
```typescript
export function UnitCompareActionBar() {
  const { compareIds, clearCompare } = useDatabaseBrowserFilters();
  const navigate = useNavigate();

  if (compareIds.size === 0) return null;

  const count = compareIds.size;
  return (
    <div className="sticky bottom-0 z-10 bg-card border-t border-border/60 shadow-lg px-4 py-3 flex items-center justify-between">
      <p className="text-sm font-medium">
        {count} unit{count !== 1 ? "s" : ""} selected
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={clearCompare}>Clear</Button>
        <Button
          variant="default"
          size="sm"
          disabled={compareIds.size < 2}
          onClick={() => navigate({ to: "/unit-database/compare" })}
        >
          Compare ({count})
        </Button>
      </div>
    </div>
  );
}
```

---

### `src/features/unit-database/UdbUnitRow.tsx` — add compare toggle + owned-badge Link

**Analog:** same file (lines 1–108), full read above

**Existing row structure** (lines 70–107):
```typescript
export function UdbUnitRow({ unit, onOpen, ownershipData }: UdbUnitRowProps) {
  const isOwned = ownershipData != null && ownershipData.owned_count > 0;

  return (
    <div
      className="flex items-center gap-3 px-4 h-10 hover:bg-secondary cursor-pointer transition-colors"
      onClick={() => onOpen(unit.id)}
      // ...
    >
      <span className="text-sm font-medium flex-1 truncate">{unit.name}</span>
      {unit.role && <Badge variant="secondary" className="text-xs shrink-0">{unit.role}</Badge>}
      {isOwned && (
        <Badge variant="outline" className="text-xs shrink-0">
          Owned x{ownershipData.owned_count}
        </Badge>
      )}
      {isOwned && (
        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${resolveReadinessDotClass(ownershipData.all_statuses)}`} />
      )}
      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right shrink-0">
        {unit.base_points !== null ? `from ${unit.base_points} pts` : "—"}
      </span>
    </div>
  );
}
```

**Two modifications needed:**

1. **Owned-badge Link** (D-06): wrap `Badge variant="outline"` in a TanStack Router `Link` + call `setUdbUnitIdFilter` before navigation:
```typescript
// New imports to add:
import { Link } from "@tanstack/react-router";
import { useCollectionFilters } from "@/features/units/collectionFilters";

// Inside UdbUnitRow component:
const setUdbUnitIdFilter = useCollectionFilters((s) => s.setUdbUnitIdFilter);

// Replace the owned Badge with:
{isOwned && (
  <Link
    to="/collection"
    onClick={(e) => {
      e.stopPropagation();   // don't trigger onOpen
      setUdbUnitIdFilter(unit.id);
    }}
    aria-label={`View ${ownershipData.owned_count} owned ${unit.name} in Collection`}
  >
    <Badge variant="outline" className="text-xs shrink-0 hover:bg-secondary cursor-pointer">
      Owned x{ownershipData.owned_count}
    </Badge>
  </Link>
)}
```

2. **"Add to compare" toggle button** (D-03): add before the points span:
```typescript
// New imports to add:
import { GitCompare } from "lucide-react";
import { useDatabaseBrowserFilters } from "./databaseBrowserFilters";

// Inside UdbUnitRow component:
const { compareIds, addToCompare, removeFromCompare } = useDatabaseBrowserFilters();
const isInCompare = compareIds.has(unit.id);
const compareDisabled = compareIds.size >= 3 && !isInCompare;

// Add before the points span:
<Button
  variant="ghost"
  size="icon"
  className={[
    "h-6 w-6 shrink-0",
    isInCompare ? "text-faction-accent bg-faction-accent/10" : "",
    compareDisabled ? "opacity-50 cursor-not-allowed" : "",
  ].join(" ").trim()}
  onClick={(e) => {
    e.stopPropagation();
    isInCompare ? removeFromCompare(unit.id) : addToCompare(unit.id);
  }}
  disabled={compareDisabled}
  aria-label={isInCompare ? `Remove ${unit.name} from comparison` : `Add ${unit.name} to comparison`}
>
  <GitCompare size={16} />
</Button>
```

---

### `src/features/unit-database/UdbSearchResults.tsx` — add `ownershipAllMap` prop + badges

**Analog:** `src/features/unit-database/UdbUnitRow.tsx` (badge rendering pattern) + `DatabaseBrowserPage.tsx` ownershipMap shape

**Existing component** (lines 1–65, full read above):
- Currently accepts only `{ query: string; onSelectResult: (unitId: string) => void }`
- Result rows render `faction_name`, `name`, `keywords` with no ownership data
- `result.unit_id` is the udb unit id

**New prop to add:**
```typescript
interface UdbSearchResultsProps {
  query: string;
  onSelectResult: (unitId: string) => void;
  ownershipAllMap?: Map<string, { owned_count: number; all_statuses: string }>;  // NEW
}
```

**Badge rendering in result rows** (copy from `UdbUnitRow.tsx` lines 92–101):
```typescript
// Inside the result row div:
{(() => {
  const ownership = ownershipAllMap?.get(result.unit_id);
  if (!ownership || ownership.owned_count === 0) return null;
  return (
    <Link
      to="/collection"
      onClick={(e) => {
        e.stopPropagation();
        setUdbUnitIdFilter(result.unit_id);
      }}
      aria-label={`View ${ownership.owned_count} owned ${result.name} in Collection`}
    >
      <Badge variant="outline" className="text-xs shrink-0 hover:bg-secondary cursor-pointer">
        Owned x{ownership.owned_count}
      </Badge>
    </Link>
  );
})()}
```

---

### `src/features/unit-database/DatabaseBrowserPage.tsx` — wire compare + `ownershipAllMap`

**Analog:** same file — `ownershipMap` useMemo pattern (lines 88–97) + existing hook imports (lines 8–16)

**Existing ownershipMap pattern to replicate** (lines 88–97):
```typescript
const { data: ownershipEntries = [] } = useUdbOwnership(selectedFactionId);

const ownershipMap = useMemo(() => {
  const map = new Map<string, { owned_count: number; all_statuses: string }>();
  for (const entry of ownershipEntries) {
    map.set(entry.udb_unit_id, {
      owned_count: entry.owned_count,
      all_statuses: entry.all_statuses,
    });
  }
  return map;
}, [ownershipEntries]);
```

**New additions:**
1. Import and call `useUdbOwnershipAll`:
```typescript
const { data: ownershipAllEntries = [] } = useUdbOwnershipAll();

const ownershipAllMap = useMemo(() => {
  const map = new Map<string, { owned_count: number; all_statuses: string }>();
  for (const entry of ownershipAllEntries) {
    map.set(entry.udb_unit_id, { owned_count: entry.owned_count, all_statuses: entry.all_statuses });
  }
  return map;
}, [ownershipAllEntries]);
```

2. Pass to `<UdbSearchResults ... ownershipAllMap={ownershipAllMap} />`

3. Render `<UnitCompareActionBar />` as a sibling at the bottom of the page container (inside the page `div`, after the main content, as a sticky bottom element).

---

### `src/features/units/collectionFilters.ts` — add `udbUnitIdFilter`

**Analog:** same file — `subFactionFilter` / `setSubFactionFilter` / `clearAll` pattern (lines 1–43)

**Full existing store** (lines 1–43):
```typescript
import { create } from "zustand";
import { toggleArrayItem } from "@/lib/utils";
import type { PaintingStatus } from "@/types/unit";

interface CollectionFiltersState {
  search: string;
  factions: number[];
  statuses: PaintingStatus[];
  categories: string[];
  activeOnly: boolean;
  battleReady: boolean;
  subFactionFilter: string | null;
  setSearch: (v: string) => void;
  // ...
  setSubFactionFilter: (sf: string | null) => void;
  clearAll: () => void;
}

export const useCollectionFilters = create<CollectionFiltersState>((set) => ({
  subFactionFilter: null,
  // ...
  setSubFactionFilter: (sf) => set({ subFactionFilter: sf }),
  clearAll: () =>
    set({ search: "", factions: [], statuses: [], categories: [], activeOnly: false, battleReady: false, subFactionFilter: null }),
}));
```

**New fields to add** (exact pattern as `subFactionFilter`):
```typescript
// Add to interface:
udbUnitIdFilter: string | null;
setUdbUnitIdFilter: (id: string | null) => void;

// Add to create() initial state:
udbUnitIdFilter: null,

// Add to create() actions:
setUdbUnitIdFilter: (id) => set({ udbUnitIdFilter: id }),

// Update clearAll to include:
clearAll: () =>
  set({ search: "", factions: [], statuses: [], categories: [], activeOnly: false, battleReady: false, subFactionFilter: null, udbUnitIdFilter: null }),
```

---

### `src/features/units/applyUnitFilters.ts` — add `udbUnitIdFilter` clause

**Analog:** same file — existing filter clauses (lines 1–26)

**Full existing filter** (lines 1–26):
```typescript
export interface UnitFiltersInput {
  search: string;
  factions: number[];
  statuses: PaintingStatus[];
  categories: string[];
  activeOnly: boolean;
  battleReady: boolean;
}

export function applyUnitFilters<T extends Unit>(units: T[], filters: UnitFiltersInput): T[] {
  const search = filters.search.trim().toLowerCase();
  return units.filter((unit) => {
    if (filters.battleReady && !(unit.status_assembly === 1 && unit.status_painting === "Completed")) return false;
    if (filters.activeOnly && unit.is_active_project !== 1) return false;
    if (filters.factions.length > 0 && !filters.factions.includes(unit.faction_id)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(unit.status_painting)) return false;
    if (filters.categories.length > 0) {
      if (unit.category === null) return false;
      if (!filters.categories.includes(unit.category)) return false;
    }
    if (search.length > 0 && !unit.name.toLowerCase().includes(search)) return false;
    return true;
  });
}
```

**New additions:**
```typescript
// Add to UnitFiltersInput interface:
udbUnitIdFilter?: string | null;

// Add as the first clause in the filter body (before battleReady check):
if (filters.udbUnitIdFilter && unit.udb_unit_id !== filters.udbUnitIdFilter) return false;
```

Note: `unit.udb_unit_id` must exist on the `Unit` type. Confirm it does (it is the FK column linked in Phase 104/105). If the generic `T extends Unit` does not guarantee `udb_unit_id`, add it to the `Unit` interface or narrow the check with `"udb_unit_id" in unit &&`.

---

### `src/features/dashboard/GoalProgressCard.tsx` (new)

**Analog:** `src/features/goals/GoalCard.tsx` (progress bar idiom) + `src/features/dashboard/DashboardPage.tsx` (Card shell, Link import)

**Progress bar pattern** (`GoalCard.tsx` lines 72–77):
```typescript
<div className="h-1.5 w-full rounded-full bg-border/40">
  <div
    className={`h-1.5 rounded-full transition-all duration-500 ${fillColor}`}
    style={{ width: `${pct}%` }}
  />
</div>
```

**fillColor logic** (`GoalCard.tsx` lines 21–26):
```typescript
const fillColor =
  status === "completed"
    ? "bg-battle-gold"
    : status === "missed"
    ? "bg-muted-foreground/30"
    : "bg-faction-accent";
```

**Pct computation** (`GoalCard.tsx` lines 17–18):
```typescript
const safeTarget = Math.max(1, goal.target_count);
const pct = Math.min(100, Math.round((progressCount / safeTarget) * 100));
```

**Imports pattern** (`GoalCard.tsx` lines 1–6 + `DashboardPage.tsx` for Link):
```typescript
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { computeGoalPeriod, deriveGoalStatus } from "@/lib/computeGoalPeriod";
import type { HobbyGoal } from "@/types/goal";
import { useGoals } from "@/hooks/useGoals";
import { useGoalProgress } from "@/hooks/useGoals";
```

**Full component shape** (adapted — no edit/delete buttons, no status badge, compact):
```typescript
export function GoalProgressCard() {
  const { data: goals = [] } = useGoals();
  const { data: progressMap } = useGoalProgress();

  const activeGoals = goals.filter((g) => {
    const period = computeGoalPeriod(g.timeframe, g.period);
    return !period.isExpired;   // show active + completed; hide missed
  });

  if (activeGoals.length === 0) {
    return (
      <Card className="bg-card border border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">No active goals.</p>
          <Link to="/goals" className="text-sm text-faction-accent">
            Set a hobby goal →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activeGoals.map((goal) => {
        const count = progressMap?.get(goal.id) ?? 0;
        const period = computeGoalPeriod(goal.timeframe, goal.period);
        const safeTarget = Math.max(1, goal.target_count);
        const pct = Math.min(100, Math.round((count / safeTarget) * 100));
        const status = deriveGoalStatus(count, goal.target_count, period.isExpired);
        const fillColor = status === "completed" ? "bg-battle-gold" : "bg-faction-accent";
        return (
          <div key={goal.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium truncate flex-1">{goal.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums shrink-0">{count} / {goal.target_count}</p>
            </div>
            <p className="text-xs text-muted-foreground">{period.label}</p>
            <div className="h-1.5 w-full rounded-full bg-border/40">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${fillColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

### `src/features/dashboard/DashboardPage.tsx` — add "Hobby Goals" section

**Analog:** same file — "Hobby Health" section in the left column (lines 386–411)

**Section header pattern** (lines 387–390):
```typescript
<section className="flex flex-col gap-4">
  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
    Hobby Health
  </p>
  {/* content */}
</section>
```

**Insertion point:** After the closing `</section>` of "By Faction" (around line 435), still inside the left-column `<div className="flex flex-col gap-6">`.

**New section:**
```typescript
<section className="flex flex-col gap-4">
  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
    Hobby Goals
  </p>
  <GoalProgressCard />
</section>
```

Also add import at top of file:
```typescript
import { GoalProgressCard } from "./GoalProgressCard";
```

---

### `src/app/router.tsx` — add `unitDatabaseCompareRoute`

**Analog:** same file — `paintingModeRoute` (lines 214–219) as flat sibling pattern; `unitDatabaseRoute` (lines 200–208) for the path prefix

**Existing flat sibling pattern** (lines 214–219):
```typescript
export const paintingModeRoute = createRoute({
  getParentRoute: () => bareLayoutRoute,
  path: "/painting-mode/$assignmentId",
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: PaintingModePage,
});
```

**Existing `unitDatabaseRoute`** (lines 200–208):
```typescript
export const unitDatabaseRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/unit-database",
  validateSearch: z.object({
    udbUnitId: z.string().optional(),
  }),
  component: UnitDatabasePageShell,
});
```

**Lazy import pattern** (lines 20–36):
```typescript
// Named-export adapter: .then(m => ({ default: m.PageName })) is required
const UnitDatabasePageShell = lazy(() => import("./unit-database/page").then(m => ({ default: m.UnitDatabasePageShell })));
```

**New additions:**
```typescript
// Add lazy import (near line 36):
const UnitComparePage = lazy(() =>
  import("../features/unit-database/UnitComparePage").then(m => ({ default: m.UnitComparePage }))
);

// Add route (after unitDatabaseRoute definition ~line 208):
const unitDatabaseCompareRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/unit-database/compare",
  component: UnitComparePage,
});

// Add to routeTree (line 243, inside layoutRoute.addChildren([...])):
unitDatabaseCompareRoute,
```

No `validateSearch` needed — compare page reads from Zustand, not URL params.

---

## Shared Patterns

### React Query hook shape
**Source:** `src/hooks/useUnitDatabase.ts` (whole file, per-hook key factories)
**Apply to:** `useUdbUnitsByIds`, `useUdbOwnershipAll`
- Export a key factory constant (`ENTITY_KEY`) before the hook function
- `enabled` guard disables query when input is empty/null
- `staleTime: Infinity` for canonical data; `staleTime: 0` for dynamic ownership data
- `gcTime: Infinity` for canonical data (omit for dynamic)

### Page-level `useMemo` Map for ownership
**Source:** `src/features/unit-database/DatabaseBrowserPage.tsx` lines 88–97
**Apply to:** `DatabaseBrowserPage.tsx` (new `ownershipAllMap`), `UnitComparePage.tsx` (statDiffMap)
- Always build O(1) lookup Maps at the page/layout component level
- Pass the Map down as a prop; never call per-row hooks inside `.map()`

### `e.stopPropagation()` in nested clickable elements
**Source:** `src/features/unit-database/UdbUnitRow.tsx` (onOpen pattern) + `DatabaseBrowserPage.tsx` Link usage
**Apply to:** owned-badge `Link`, compare toggle `Button` inside `UdbUnitRow`
- The parent `div` has `onClick={() => onOpen(unit.id)}` — any nested interactive element must call `e.stopPropagation()` to prevent double-firing

### Zustand store extension pattern
**Source:** `src/features/units/collectionFilters.ts` (lines 1–43) + `src/features/unit-database/databaseBrowserFilters.ts` (lines 1–43)
**Apply to:** both stores being modified
- Add field to interface, add initial value in `create()`, add setter action
- Update `clearAll`/`clearFilters` to include the new field reset

### Section header in dashboard left column
**Source:** `src/features/dashboard/DashboardPage.tsx` lines 386–390 (Hobby Health section)
**Apply to:** `GoalProgressCard` section insertion
```typescript
<p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
  {SECTION_NAME}
</p>
```

### Route registration (flat sibling, lazy named export)
**Source:** `src/app/router.tsx` lines 20–36 (lazy imports), lines 200–208 (route creation), lines 225–246 (routeTree)
**Apply to:** `unitDatabaseCompareRoute`
- Lazy import with `.then(m => ({ default: m.ComponentName }))` adapter
- `createRoute({ getParentRoute: () => layoutRoute, path: "...", component: ... })`
- Add to `layoutRoute.addChildren([...])`

---

## No Analog Found

All files in this phase have close analogs. No entries.

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/features/unit-database/`, `src/features/units/`, `src/features/dashboard/`, `src/features/goals/`, `src/app/`
**Files read:** 15 source files (direct reads)
**Pattern extraction date:** 2026-06-18
