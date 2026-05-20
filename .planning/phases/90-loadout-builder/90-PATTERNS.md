# Phase 90: Loadout Builder - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 5 new/modified files
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/army-lists/LoadoutBuilderSheet.tsx` | component (Sheet) | request-response | `src/features/army-lists/ArmyListDetailSheet.tsx` | exact |
| `src/features/army-lists/ArmyListUnitRow.tsx` (modify) | component (row) | request-response | self — inline tier selector lines 269-312 replaced | self |
| `src/features/army-lists/ArmyListsPage.tsx` (modify) | component (page/portal owner) | event-driven | self — UnitPickerDialog sibling portal pattern | self |
| `src/db/queries/bsdataExtended.ts` (extend) | query module | request-response | `src/db/queries/bsdataExtended.ts` — `getLoadoutOptionsByFaction` | exact |
| `src/hooks/useLoadoutOptions.ts` | hook | request-response | `src/hooks/useUnitPointTiers.ts` | role-match |

---

## Pattern Assignments

### `src/features/army-lists/LoadoutBuilderSheet.tsx` (component, request-response)

**Analog:** `src/features/army-lists/ArmyListDetailSheet.tsx`

**Imports pattern** (`ArmyListDetailSheet.tsx` lines 1-35):
```typescript
import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetSelectedModelCount, useClearSelectedModelCount } from "@/hooks/useArmyLists";
import { useLoadoutOptionsForUnit, useTiersByUnitName } from "@/hooks/useLoadoutOptions";
import type { ArmyListUnitRow } from "@/types/armyList";
```

**Sheet open/close pattern** (`ArmyListDetailSheet.tsx` line 142):
```typescript
// Open state is owned by the PARENT (ArmyListsPage) — this component receives props only
<Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
  <SheetContent
    side="right"
    className="overflow-y-auto sm:max-w-[600px]"
  >
    {unit && (
      <>
        <SheetHeader>
          <SheetTitle>{unit.unit_name}</SheetTitle>
          {/* Ghost unit badge — only when unit_id is null */}
          {unit.unit_id === null && <Badge variant="outline">Planned</Badge>}
        </SheetHeader>
      </>
    )}
  </SheetContent>
</Sheet>
```

**Props interface pattern** (`ArmyListDetailSheet.tsx` lines 37-49):
```typescript
// Follows: open, entity, onClose, optional callbacks
interface LoadoutBuilderSheetProps {
  open: boolean;
  unit: ArmyListUnitRow | null;    // null when no unit selected (sheet closed)
  listId: number | null;
  listFactionId: number | null;    // fallback faction for ghost units
  onClose: () => void;
}
```

**Tier selector core pattern** (from `ArmyListUnitRow.tsx` lines 269-312 + RESEARCH.md Pattern 2):
```typescript
const setModelCount = useSetSelectedModelCount();
const clearModelCount = useClearSelectedModelCount();

function handleTierChange(value: string) {
  if (!unit || !listId) return;
  if (value === "__default__") {
    clearModelCount.mutate({ army_list_unit_id: unit.id, list_id: listId });
  } else {
    setModelCount.mutate({
      army_list_unit_id: unit.id,
      count: Number(value),
      list_id: listId,
    });
  }
}

// Select with "Default" as first item representing NULL
<Select
  value={unit.selected_model_count !== null ? String(unit.selected_model_count) : "__default__"}
  onValueChange={handleTierChange}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__default__">Default</SelectItem>
    {(tiers ?? []).map((t) => (
      <SelectItem key={t.model_count} value={String(t.model_count)}>
        {t.model_count} models — {t.points}pts
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Points delta badge pattern** (`ArmyListUnitRow.tsx` lines 255-267):
```typescript
// Delta badge: red when positive (more points), green when negative (fewer points)
{delta !== 0 && (
  <Badge
    variant="outline"
    className={
      delta > 0
        ? "text-destructive border-destructive ml-1.5"
        : "text-green-600 border-green-600 ml-1.5"
    }
  >
    {delta > 0 ? `+${delta}` : `${delta}`}
  </Badge>
)}
```

**Points override callout** (from RESEARCH.md Pitfall 6 — show when `unit.points_override !== null`):
```typescript
// Info note shown at top of tier section when override is active
{unit.points_override !== null && (
  <p className="text-xs text-muted-foreground">
    Points manually overridden — tier selection won't affect displayed points
    until override is cleared.
  </p>
)}
```

**Wargear grouped display pattern** (from RESEARCH.md Code Examples):
```typescript
// Group by group_name — SQL ORDER BY group_name ensures items arrive pre-sorted
function groupByGroupName(options: SyncedLoadoutOptionRow[]) {
  const groups = new Map<string, SyncedLoadoutOptionRow[]>();
  for (const opt of options) {
    const group = groups.get(opt.group_name) ?? [];
    group.push(opt);
    groups.set(opt.group_name, group);
  }
  return groups;
}

// Render
{wargearGroups.size === 0 ? (
  <p className="text-sm text-muted-foreground">No wargear data available</p>
) : (
  Array.from(wargearGroups.entries()).map(([groupName, options]) => (
    <div key={groupName}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {groupName}
      </p>
      <ul className="space-y-1">
        {options.map((opt) => (
          <li key={opt.option_name} className="flex items-center gap-2 text-sm">
            {opt.option_name}
            {opt.is_default === 1 && <Badge variant="secondary">Default</Badge>}
            {opt.is_exclusive === 1 && <Badge variant="outline">Exclusive</Badge>}
          </li>
        ))}
      </ul>
    </div>
  ))
)}
```

**faction_id cast pattern** (from RESEARCH.md Pitfall 1 + `armyLists.ts` lines 82-86):
```typescript
// Always convert numeric faction_id to string for synced table queries
const factionIdStr = unit.faction_id !== null
  ? String(unit.faction_id)
  : listFactionId !== null
    ? String(listFactionId)
    : null;

const { data: tiers } = useTiersByUnitName(unitName, factionIdStr);
const { data: wargearOptions } = useLoadoutOptionsForUnit(unitName, factionIdStr);
```

---

### `src/features/army-lists/ArmyListUnitRow.tsx` (modify — replace inline tier selector)

**Analog:** Self (lines 269-312 removed; configure trigger replaces the inline Select block)

**Lines to remove** (`ArmyListUnitRow.tsx` lines 269-312):
```typescript
// REMOVE the entire hasTiers block:
{hasTiers && (
  <div className="flex items-center gap-1.5 mt-1">
    <Select ...>...</Select>
    {pendingTierId !== null && <Button>Confirm</Button>}
  </div>
)}
// Also remove: pendingTierId state, candidatePoints memo, updateUnit hook import,
// delta (if only used for tier preview), useUpdateUnit import
```

**Configure trigger replacing the removed block** (from RESEARCH.md Pattern 5):
```typescript
// New prop added to ArmyListUnitRowProps:
// onConfigure: () => void

// Trigger button replacing lines 269-312:
const tierLabel = unit.selected_model_count !== null && unit.tier_points !== null
  ? `${unit.selected_model_count} models • ${unit.tier_points}pts`
  : "Configure";

<Button
  type="button"
  variant="outline"
  size="sm"
  className="h-7 text-xs mt-1"
  onClick={onConfigure}
  aria-label={`Configure loadout for ${unit.unit_name}`}
>
  <Settings2 className="h-3 w-3 mr-1" />
  {tierLabel}
</Button>
```

**Import additions to ArmyListUnitRow.tsx:**
```typescript
import { Settings2 } from "lucide-react";
// Remove: useUpdateUnit, useUnitPointTiers (if no longer used)
```

---

### `src/features/army-lists/ArmyListsPage.tsx` (modify — add sibling portal)

**Analog:** Self — the `UnitPickerDialog` sibling portal is the direct template

**Existing sibling portal pattern to copy** (`ArmyListsPage.tsx` lines 34-61, 107-134):
```typescript
// 1. Add state alongside existing portal state
const [loadoutUnitId, setLoadoutUnitId] = useState<number | null>(null);

// 2. Derive the unit object from cache (follows selectedList pattern line 42-44)
const { data: selectedListUnits } = useArmyListWithUnits(selectedListId ?? undefined);
const loadoutUnit = loadoutUnitId !== null
  ? (selectedListUnits ?? []).find((u) => u.id === loadoutUnitId) ?? null
  : null;

// 3. Handler
const openLoadout = (armyListUnitId: number) => setLoadoutUnitId(armyListUnitId);
const closeLoadout = () => setLoadoutUnitId(null);
```

**Sibling portal JSX pattern** (after `UnitPickerDialog` on lines 129-134):
```typescript
{/* Sibling portal — NOT inside ArmyListDetailSheet (Pitfall 1) */}
<LoadoutBuilderSheet
  open={loadoutUnitId !== null}
  unit={loadoutUnit}
  listId={selectedListId}
  listFactionId={selectedList?.faction_id ?? null}
  onClose={closeLoadout}
/>
```

**onConfigureUnit prop thread** (pass callback down to ArmyListDetailSheet):
```typescript
// ArmyListDetailSheet receives new prop:
<ArmyListDetailSheet
  ...
  onAddUnit={openUnitPicker}
  onConfigureUnit={openLoadout}   // NEW
/>
```

---

### `src/db/queries/bsdataExtended.ts` (extend — add getLoadoutOptionsForUnit)

**Analog:** `src/db/queries/bsdataExtended.ts` — `getLoadoutOptionsByFaction` (lines 134-145)

**Existing function to copy from** (lines 134-145):
```typescript
export async function getLoadoutOptionsByFaction(
  factionId: string,
): Promise<SyncedLoadoutOptionRow[]> {
  const db = await getDb();
  return db.select<SyncedLoadoutOptionRow[]>(
    `SELECT unit_name, faction_id, group_name, option_name, is_default, is_exclusive
     FROM synced_loadout_options
     WHERE faction_id = $1
     ORDER BY unit_name, group_name, option_name`,
    [factionId],
  );
}
```

**New function to add** (append after getLoadoutOptionsByFaction):
```typescript
export async function getLoadoutOptionsForUnit(
  unitName: string,
  factionId: string | null,
): Promise<SyncedLoadoutOptionRow[]> {
  const db = await getDb();
  return db.select<SyncedLoadoutOptionRow[]>(
    `SELECT group_name, option_name, is_default, is_exclusive
     FROM synced_loadout_options
     WHERE unit_name = $1
       AND (faction_id IS NULL OR faction_id = $2)
     ORDER BY group_name, option_name`,
    [unitName, factionId],
  );
}
```

**SyncedLoadoutOptionRow interface** (lines 125-132 — already exists, no change):
```typescript
export interface SyncedLoadoutOptionRow {
  unit_name: string;
  faction_id: string | null;
  group_name: string;
  option_name: string;
  is_default: number;   // 0 | 1 integer — SQLite boolean
  is_exclusive: number; // 0 | 1 integer — SQLite boolean
}
```

**Also add getTiersByUnitName to** `src/db/queries/syncedUnitPoints.ts` (after `getPointTiersByFaction` line 75):
```typescript
// Copy getPointTiersByFaction (lines 75-86) and adapt to name+faction filter:
export async function getTiersByUnitName(
  unitName: string,
  factionId: string | null,
): Promise<Array<{ model_count: number; points: number }>> {
  const db = await getDb();
  return db.select(
    `SELECT model_count, points
     FROM synced_unit_point_tiers
     WHERE unit_name = $1
       AND (faction_id IS NULL OR faction_id = $2)
     ORDER BY model_count ASC`,
    [unitName, factionId],
  );
}
```

---

### `src/hooks/useLoadoutOptions.ts` (new hook file)

**Analog:** `src/hooks/useUnitPointTiers.ts` (single-entity hook pattern, lines 1-42)

**Full hook file pattern** (copy structure from `useUnitPointTiers.ts`):
```typescript
import { useQuery } from "@tanstack/react-query";
import { getLoadoutOptionsForUnit } from "@/db/queries/bsdataExtended";
import { getTiersByUnitName } from "@/db/queries/syncedUnitPoints";
import type { SyncedLoadoutOptionRow } from "@/db/queries/bsdataExtended";

// Cache key factories — follow UNIT_POINT_TIERS_KEY pattern (useUnitPointTiers.ts line 14)
export const LOADOUT_OPTIONS_KEY = (unitName: string, factionId: string | null) =>
  ["loadout-options", unitName, factionId] as const;

export const SYNCED_TIERS_BY_NAME_KEY = (unitName: string, factionId: string | null) =>
  ["synced-tiers-by-name", unitName, factionId] as const;

// Hook: wargear options for a unit (DL-02)
// Follows useUnitPointTiers enabled/disabled pattern (useUnitPointTiers.ts lines 16-22)
export function useLoadoutOptionsForUnit(
  unitName: string | undefined,
  factionId: string | null | undefined,
) {
  return useQuery({
    queryKey: unitName !== undefined
      ? LOADOUT_OPTIONS_KEY(unitName, factionId ?? null)
      : (["loadout-options"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getLoadoutOptionsForUnit(unitName, factionId ?? null)
        : Promise.resolve([] as SyncedLoadoutOptionRow[]),
    enabled: unitName !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: synced point tiers by name (DL-01 — for ghost units without unit_id)
export function useTiersByUnitName(
  unitName: string | undefined,
  factionId: string | null | undefined,
) {
  return useQuery({
    queryKey: unitName !== undefined
      ? SYNCED_TIERS_BY_NAME_KEY(unitName, factionId ?? null)
      : (["synced-tiers-by-name"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getTiersByUnitName(unitName, factionId ?? null)
        : Promise.resolve([] as Array<{ model_count: number; points: number }>),
    enabled: unitName !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Shared Patterns

### Sibling Portal Sheet Management
**Source:** `src/features/army-lists/ArmyListsPage.tsx` lines 34-61, 107-134
**Apply to:** `ArmyListsPage.tsx` modifications + `LoadoutBuilderSheet.tsx` props contract

```typescript
// Page owns state as an ID (not the object)
const [loadoutUnitId, setLoadoutUnitId] = useState<number | null>(null);
// Derive object from existing query cache — never fetch separately
const loadoutUnit = loadoutUnitId !== null
  ? (selectedListUnits ?? []).find((u) => u.id === loadoutUnitId) ?? null
  : null;
// Sheet receives derived object — never owns open/close state itself
<LoadoutBuilderSheet open={loadoutUnitId !== null} unit={loadoutUnit} onClose={() => setLoadoutUnitId(null)} />
```

### Targeted UPDATE (not full-replacement)
**Source:** `src/hooks/useArmyLists.ts` lines 347-382 (`useSetSelectedModelCount`, `useClearSelectedModelCount`)
**Apply to:** All tier-related mutations in `LoadoutBuilderSheet.tsx`

```typescript
// CORRECT: targeted UPDATE — only touches selected_model_count
setModelCount.mutate({ army_list_unit_id: unit.id, count: Number(value), list_id: listId });
clearModelCount.mutate({ army_list_unit_id: unit.id, list_id: listId });

// WRONG: do NOT call updateArmyListUnit — it is full-replacement and overwrites
// tactical_role, points_override, and notes with undefined
```

### Cache Invalidation (already wired in existing hooks)
**Source:** `src/hooks/useArmyLists.ts` lines 351-358
**Apply to:** `LoadoutBuilderSheet.tsx` — NO new invalidation needed; hooks handle all 5 keys

```typescript
// useSetSelectedModelCount already invalidates all required keys on success:
qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
```

### faction_id String Cast
**Source:** `src/features/army-lists/ArmyListUnitRow.tsx` (armyLists.ts lines 82-86 pattern)
**Apply to:** All call sites in `LoadoutBuilderSheet.tsx` that pass faction_id to synced table queries

```typescript
// ArmyListUnitRow.faction_id is number | null — synced tables expect string | null
const factionIdStr = unit.faction_id !== null
  ? String(unit.faction_id)
  : listFactionId !== null ? String(listFactionId) : null;
```

### SQLite Boolean Read Pattern
**Source:** `src/db/queries/bsdataExtended.ts` line 129-131 (`is_default: number`, `is_exclusive: number`)
**Apply to:** `LoadoutBuilderSheet.tsx` wargear render

```typescript
// Booleans stored as 0 | 1 integers — compare with === 1, not truthy check
{opt.is_default === 1 && <Badge variant="secondary">Default</Badge>}
{opt.is_exclusive === 1 && <Badge variant="outline">Exclusive</Badge>}
```

### Empty State Pattern
**Source:** Multiple components — `DetachmentPicker.tsx` lines 56-60
**Apply to:** Wargear section in `LoadoutBuilderSheet.tsx`

```typescript
// Subtle empty state — not an error; data may just not be synced yet
{wargearOptions.length === 0 && (
  <p className="text-sm text-muted-foreground">No wargear data available</p>
)}
```

---

## Test Pattern Assignments

### `tests/army-lists/LoadoutBuilderSheet.test.tsx` (new)

**Analog:** `tests/army-lists/ArmyListSummaryBar.test.tsx` (full file)

**Mock pattern** (`ArmyListSummaryBar.test.tsx` lines 18-21):
```typescript
vi.mock("@/hooks/useArmyLists", () => ({
  useSetSelectedModelCount: () => ({ mutate: vi.fn(), isPending: false }),
  useClearSelectedModelCount: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useLoadoutOptions", () => ({
  useTiersByUnitName: () => ({ data: mockTiers }),
  useLoadoutOptionsForUnit: () => ({ data: mockWargearOptions }),
}));
```

**makeUnit factory pattern** (`ArmyListSummaryBar.test.tsx` lines 27-52):
```typescript
// Copy exact factory — all fields required to satisfy ArmyListUnitRow type
function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1,
    list_id: 1,
    unit_id: 1,
    ghost_unit_name: null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
    points_override: null,
    notes: null,
    created_at: "2024-01-01",
    unit_name: "Intercessors",
    unit_points: 100,
    faction_id: 1,
    status_assembly: 1,
    status_painting: "Completed",
    synced_points: null,
    override_points: null,
    tier_points: null,
    painting_percentage: 100,
    effective_points: 100,
    tactical_role: null,
    ...overrides,
  };
}
```

---

## No Analog Found

All files have close analogs. No novel patterns required.

---

## Metadata

**Analog search scope:** `src/features/army-lists/`, `src/db/queries/`, `src/hooks/`, `tests/army-lists/`
**Files scanned:** 10 source files read in full or targeted sections
**Key pitfalls documented in RESEARCH.md:** 6 (Pitfalls 1-6 — all critical for implementation)
**Pattern extraction date:** 2026-05-20
