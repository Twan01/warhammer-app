# Phase 91: Enhancement Assignment - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/army-lists/EnhancementPickerSheet.tsx` | component | request-response | `src/features/army-lists/LoadoutBuilderSheet.tsx` | exact |
| `src/features/army-lists/ArmyListUnitRow.tsx` | component | request-response | self (modify existing) | — |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | component | request-response | self (modify existing) | — |
| `src/features/army-lists/ArmyListsPage.tsx` | component | request-response | self (modify existing) | — |
| `src/features/army-lists/ArmyListSummaryBar.tsx` | component | request-response | self (modify existing) | — |
| `src/features/army-lists/ArmyListCard.tsx` | component | request-response | self (modify existing) | — |
| `src/db/queries/datasheets.ts` | utility | request-response | `src/db/queries/datasheets.ts` (extend existing) | exact |
| `src/hooks/useUnitKeywords.ts` | hook | request-response | `src/hooks/useLoadoutOptions.ts` | exact |
| `src/lib/computeUnitWarnings.ts` | utility | transform | self (modify existing) | — |
| `tests/army-list/enhancementPickerSheet.test.tsx` | test | — | `tests/army-list/ArmyListsPage.test.tsx` | role-match |
| `tests/army-list/computeListHealthStats.test.ts` | test | — | `tests/army-list/armyListEnhancements.test.ts` | role-match |

---

## Pattern Assignments

### `src/features/army-lists/EnhancementPickerSheet.tsx` (NEW — component, request-response)

**Analog:** `src/features/army-lists/LoadoutBuilderSheet.tsx` (direct template — same sibling portal, same Sheet from row pattern)

**Imports pattern** (LoadoutBuilderSheet.tsx lines 1-39):
```typescript
import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
// Enhancement-specific additions:
import { useAddEnhancement, useRemoveEnhancement, useEnhancementsByList } from "@/hooks/useArmyLists";
import { useUnitKeywords } from "@/hooks/useUnitKeywords";
import { getEnhancementsByFaction } from "@/db/queries/bsdataExtended";
import type { ArmyListUnitRow, ArmyList, ArmyListEnhancement } from "@/types/armyList";
```

**Props interface pattern** (LoadoutBuilderSheet.tsx lines 45-51):
```typescript
// Follow the same shape — open, unit (nullable), list (nullable), onClose
interface EnhancementPickerSheetProps {
  open: boolean;
  unit: ArmyListUnitRow | null;
  list: ArmyList | null;
  onClose: () => void;
}
```

**Gate on null pattern** (LoadoutBuilderSheet.tsx lines 135-141):
```typescript
// CRITICAL: Gate body rendering on unit !== null — prevents hooks with undefined
return (
  <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <SheetContent side="right" className="overflow-y-auto sm:max-w-[480px]">
      {unit && (
        <>
          <SheetHeader>
            <SheetTitle>{unit.unit_name}</SheetTitle>
          </SheetHeader>
          {/* content */}
        </>
      )}
    </SheetContent>
  </Sheet>
);
```

**Faction ID string conversion pattern** (LoadoutBuilderSheet.tsx lines 81-86 — Pitfall 1):
```typescript
// ALWAYS convert faction_id to string — synced_enhancements.faction_id is TEXT
const factionIdStr = unit?.faction_id !== null && unit?.faction_id !== undefined
  ? String(unit.faction_id)
  : list?.faction_id !== null && list?.faction_id !== undefined
    ? String(list.faction_id)
    : null;
```

**Client-side detachment filter pattern** (RESEARCH.md Pattern 4):
```typescript
// Inside component — filter available enhancements to the list's detachment
const { data: allEnhancements } = useQuery({
  queryKey: ["enhancements-by-faction", factionIdStr],
  queryFn: () => factionIdStr ? getEnhancementsByFaction(factionIdStr) : Promise.resolve([]),
  enabled: !!factionIdStr,
  staleTime: 5 * 60 * 1000,
});

const detachmentEnhancements = useMemo(
  () => (allEnhancements ?? []).filter(
    (e) => e.detachment_name === list?.detachment_name
  ),
  [allEnhancements, list?.detachment_name],
);
```

**No-detachment guard pattern** (RESEARCH.md Anti-Patterns):
```typescript
// Show prompt when list has no detachment selected
if (!list?.detachment_name) {
  return <p className="text-sm text-muted-foreground px-4 py-3">Select a detachment first to view enhancements.</p>;
}
```

**Preventive validation + disabled button + tooltip pattern** (ArmyListUnitRow.tsx lines 155-174 — Pitfall 2 from RESEARCH):
```typescript
// CRITICAL: disabled buttons need <span> wrapper for tooltip to fire
const assignDisabledReason: string | null = (() => {
  if ((listEnhancements ?? []).length >= 3) return "Max 3 enhancements per army";
  if ((listEnhancements ?? []).some(e => e.enhancement_name === enhancement.name))
    return "Enhancement already assigned";
  if (keywords?.isEpicHero) return "Epic Heroes cannot receive enhancements";
  return null;
})();

<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button disabled={!!assignDisabledReason} onClick={handleAssign}>
        Assign
      </Button>
    </span>
  </TooltipTrigger>
  {assignDisabledReason && <TooltipContent>{assignDisabledReason}</TooltipContent>}
</Tooltip>
```

**Mutation onError toast pattern** (ArmyListUnitRow.tsx lines 108-125):
```typescript
// Toast fallback for concurrent modification edge cases (D-12)
addEnhancement.mutate(
  { list_id: list.id, army_list_unit_id: unit.id, enhancement_name: e.name, enhancement_points: e.points },
  {
    onError: () => toast.error("Failed to assign enhancement. Please try again."),
  },
);
```

**"Assigned to" badge pattern for already-assigned enhancements** (D-03):
```typescript
// Check if an available enhancement is already assigned elsewhere in the list
const existingAssignment = (listEnhancements ?? []).find(
  (le) => le.enhancement_name === enhancement.name
);
// In the row:
{existingAssignment && (
  <Badge variant="secondary">
    Assigned to {/* resolve unit name via units array if needed */}
  </Badge>
)}
```

---

### `src/hooks/useUnitKeywords.ts` (NEW — hook, request-response)

**Analog:** `src/hooks/useLoadoutOptions.ts` (direct template — same rules.db read, same staleTime:Infinity pattern for immutable data)

**Full file pattern** (useLoadoutOptions.ts lines 1-51):
```typescript
import { useQuery } from "@tanstack/react-query";
import { getUnitKeywords } from "@/db/queries/datasheets";
import type { UnitKeywordStatus } from "@/db/queries/datasheets";

export const UNIT_KEYWORDS_KEY = (unitName: string) =>
  ["unit-keywords", unitName] as const;

export function useUnitKeywords(unitName: string | undefined) {
  return useQuery({
    queryKey: unitName !== undefined
      ? UNIT_KEYWORDS_KEY(unitName)
      : (["unit-keywords"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getUnitKeywords(unitName)
        : Promise.resolve({ isCharacter: false, isEpicHero: false }),
    enabled: unitName !== undefined,
    staleTime: Infinity, // keyword data only changes on rules.db re-sync
  });
}
```

**Key differences from useLoadoutOptions:** `staleTime: Infinity` because keyword data is stable until a rules re-sync. No factionId parameter needed (keyword lookup is by unit name only across all factions).

---

### `src/db/queries/datasheets.ts` (MODIFY — add `getUnitKeywords`)

**Analog:** `src/db/queries/datasheets.ts` itself — pattern for `getRulesDb()` usage and try/catch safe-default pattern (lines 105-115).

**Existing getRulesDb + try/catch pattern** (datasheets.ts lines 105-115):
```typescript
export async function getRulesSyncMeta(): Promise<RulesSyncMeta | null> {
  try {
    const db = await getRulesDb();
    const rows = await db.select<RulesSyncMeta[]>(
      "SELECT * FROM rw_sync_meta WHERE id = 1"
    );
    return rows[0] ?? null;
  } catch {
    return null; // swallows "no such table" when schema not yet loaded
  }
}
```

**Existing rw_datasheet_keywords query pattern** (datasheets.ts lines 86-88):
```typescript
// Already used in getFullDatasheet — same join target for getUnitKeywords
const keywords = await db.select<RwDatasheetKeyword[]>(
  "SELECT * FROM rw_datasheet_keywords WHERE datasheet_id = $1 ORDER BY is_faction_keyword DESC, keyword",
  [datasheetId]
);
```

**New function to add** (RESEARCH.md Code Examples):
```typescript
export interface UnitKeywordStatus {
  isCharacter: boolean;
  isEpicHero: boolean;
}

export async function getUnitKeywords(
  unitName: string,
): Promise<UnitKeywordStatus> {
  try {
    const db = await getRulesDb();
    // Use LOWER() on both sides for case-insensitive match (A1, A2 from RESEARCH)
    const rows = await db.select<{ keyword: string }[]>(
      `SELECT k.keyword
       FROM rw_datasheets d
       JOIN rw_datasheet_keywords k ON k.datasheet_id = d.id
       WHERE LOWER(d.name) = LOWER($1)
         AND LOWER(k.keyword) IN ('character', 'epic hero')`,
      [unitName],
    );
    return {
      isCharacter: rows.some((r) => r.keyword.toLowerCase() === "character"),
      isEpicHero: rows.some((r) => r.keyword.toLowerCase() === "epic hero"),
    };
  } catch {
    // rules.db may not be synced — return safe defaults (D-05: blocks assignment)
    return { isCharacter: false, isEpicHero: false };
  }
}
```

**Placement:** Add after `getRulesSyncMeta` and before `getDatasheetIdForUnit` (line ~115 in the file).

---

### `src/features/army-lists/ArmyListUnitRow.tsx` (MODIFY — add enhancement trigger)

**Analog:** Self — the existing `onConfigure` button pattern at lines 244-256.

**Existing "Configure" trigger pattern to replicate** (ArmyListUnitRow.tsx lines 244-256):
```typescript
// Phase 90 pattern — replicate for enhancement trigger
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

**Existing Tooltip-on-icon pattern** (ArmyListUnitRow.tsx lines 155-174):
```typescript
// Used for warning icons — same pattern for enhancement trigger tooltip
<Tooltip>
  <TooltipTrigger asChild>
    <span className="inline-flex mr-1">
      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
    </span>
  </TooltipTrigger>
  <TooltipContent>{[...warnings.hard, ...warnings.soft].join(", ")}</TooltipContent>
</Tooltip>
```

**Props extension** (ArmyListUnitRow.tsx lines 35-42):
```typescript
// ADD onEnhance callback alongside existing onConfigure
interface ArmyListUnitRowProps {
  unit: ArmyListUnitRowType;
  totalPoints: number;
  pointsLimit: number | null;
  freshness: SyncFreshness;
  onRemove: () => void;
  onConfigure: () => void;
  onEnhance: () => void; // NEW — opens EnhancementPickerSheet
}
```

**Character detection usage:**
```typescript
// Inside ArmyListUnitRow — use useUnitKeywords to conditionally show trigger
const { data: keywords } = useUnitKeywords(unit.unit_name);
const isCharacter = keywords?.isCharacter ?? false;
const isEpicHero = keywords?.isEpicHero ?? false;
const showEnhanceTrigger = isCharacter && !isEpicHero;

// In JSX — show only when eligible
{showEnhanceTrigger && (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="h-7 text-xs mt-1"
    onClick={onEnhance}
    aria-label={`Assign enhancement to ${unit.unit_name}`}
  >
    <Sparkles className="h-3 w-3 mr-1" />
    Enhance
  </Button>
)}
```

---

### `src/features/army-lists/ArmyListDetailSheet.tsx` (MODIFY — add `onEnhanceUnit` prop)

**Analog:** Self — the existing `onConfigureUnit` prop pattern at lines 37-54.

**Existing prop pattern** (ArmyListDetailSheet.tsx lines 37-54):
```typescript
interface ArmyListDetailSheetProps {
  open: boolean;
  list: ArmyList | null;
  onClose: () => void;
  onEdit: (list: ArmyList) => void;
  onDelete: (list: ArmyList) => void;
  onAddUnit: () => void;
  /**
   * Phase 90 — Triggered when the user clicks "Configure" on a unit row.
   * The parent (ArmyListsPage) opens a sibling-portal LoadoutBuilderSheet
   * — this Sheet does NOT own the dialog state (Pitfall 5).
   */
  onConfigureUnit: (armyListUnitId: number) => void;
  /**
   * Phase 91 — Triggered when the user clicks "Enhance" on a character unit row.
   * The parent (ArmyListsPage) opens a sibling-portal EnhancementPickerSheet
   * — this Sheet does NOT own the dialog state.
   */
  onEnhanceUnit: (armyListUnitId: number) => void; // NEW
}
```

**Passing callback to ArmyListUnitRow** (ArmyListDetailSheet.tsx — where ArmyListUnitRow is rendered):
```typescript
<ArmyListUnitRow
  unit={alu}
  // ... existing props ...
  onConfigure={() => onConfigureUnit(alu.id)}
  onEnhance={() => onEnhanceUnit(alu.id)}  // NEW
/>
```

---

### `src/features/army-lists/ArmyListsPage.tsx` (MODIFY — add enhancement portal state)

**Analog:** Self — the existing `loadoutUnitId` state pattern at lines 41-52.

**Existing portal state pattern** (ArmyListsPage.tsx lines 41-52, 71-72):
```typescript
// EXISTING — loadout portal (replicate for enhancement):
const [loadoutUnitId, setLoadoutUnitId] = useState<number | null>(null);
const loadoutUnit = loadoutUnitId !== null
  ? (selectedListUnits ?? []).find((u) => u.id === loadoutUnitId) ?? null
  : null;
const openLoadout = (armyListUnitId: number) => setLoadoutUnitId(armyListUnitId);
const closeLoadout = () => setLoadoutUnitId(null);

// NEW — enhancement portal (same shape):
const [enhancementUnitId, setEnhancementUnitId] = useState<number | null>(null);
const enhancementUnit = enhancementUnitId !== null
  ? (selectedListUnits ?? []).find((u) => u.id === enhancementUnitId) ?? null
  : null;
const openEnhancement = (armyListUnitId: number) => setEnhancementUnitId(armyListUnitId);
const closeEnhancement = () => setEnhancementUnitId(null);
```

**closeDetail must reset both portals** (ArmyListsPage.tsx line 68):
```typescript
// EXISTING:
const closeDetail = () => { setSelectedListId(null); setUnitPickerOpen(false); setLoadoutUnitId(null); };
// MODIFIED — add enhancement reset:
const closeDetail = () => { setSelectedListId(null); setUnitPickerOpen(false); setLoadoutUnitId(null); setEnhancementUnitId(null); };
```

**Sibling portal in JSX** (ArmyListsPage.tsx lines 117-152):
```typescript
// EXISTING ArmyListDetailSheet — add onEnhanceUnit:
<ArmyListDetailSheet
  key={selectedList?.id ?? "none-detail"}
  open={selectedListId !== null}
  list={selectedList}
  onClose={closeDetail}
  onEdit={openEdit}
  onDelete={openDelete}
  onAddUnit={openUnitPicker}
  onConfigureUnit={openLoadout}
  onEnhanceUnit={openEnhancement}  // NEW
/>
// ... existing siblings ...
<LoadoutBuilderSheet { /* unchanged */ } />
// NEW sibling:
<EnhancementPickerSheet
  open={enhancementUnitId !== null}
  unit={enhancementUnit}
  list={selectedList}
  onClose={closeEnhancement}
/>
```

---

### `src/features/army-lists/ArmyListSummaryBar.tsx` (MODIFY — add enhancements prop)

**Analog:** Self — existing `Stat` component at lines 183-190 and `computeListHealthStats` call at lines 34-37.

**Props extension** (ArmyListSummaryBar.tsx lines 20-24):
```typescript
// EXISTING:
interface ArmyListSummaryBarProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;
}
// MODIFIED:
interface ArmyListSummaryBarProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;
  enhancements: ArmyListEnhancement[]; // NEW — from useEnhancementsByList
}
```

**computeListHealthStats call extension** (ArmyListSummaryBar.tsx lines 34-37):
```typescript
// EXISTING:
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit, freshness),
  [units, pointsLimit, freshness],
);
// MODIFIED — pass enhancementTotal:
const enhancementTotal = useMemo(
  () => enhancements.reduce((s, e) => s + e.enhancement_points, 0),
  [enhancements],
);
const stats = useMemo(
  () => computeListHealthStats(units, pointsLimit, freshness, enhancementTotal),
  [units, pointsLimit, freshness, enhancementTotal],
);
```

**Existing Stat component usage + new enhancement stat line** (ArmyListSummaryBar.tsx lines 82-92):
```typescript
// EXISTING stat row — modify pointsValue to reflect combined total:
const unitPoints = units.reduce((sum, u) => sum + u.effective_points, 0);
const pointsValue = pointsLimit !== null
  ? `${stats.totalPoints} / ${pointsLimit} pts`
  : `${stats.totalPoints} pts`;

// Stat component for reference (lines 183-190):
function Stat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-semibold ${valueClassName ?? ""}`}>{value}</span>
    </span>
  );
}

// NEW — additional stat line when enhancements exist (D-07):
{enhancementTotal > 0 && (
  <Stat
    label="Enhancements"
    value={`${enhancementTotal} pts (${enhancements.length})`}
  />
)}
```

**Caller site — ArmyListDetailSheet must pass enhancements prop:**
```typescript
// ArmyListDetailSheet: add useEnhancementsByList(list?.id) and pass to bar
const { data: enhancements = [] } = useEnhancementsByList(list?.id);
// In JSX:
<ArmyListSummaryBar
  units={units ?? []}
  pointsLimit={list?.points_limit ?? null}
  freshness={freshness}
  enhancements={enhancements}  // NEW
/>
```

---

### `src/features/army-lists/ArmyListCard.tsx` (MODIFY — add enhancement total)

**Analog:** Self — existing inline `totalPoints` computation at lines 28-31.

**Existing inline calculation** (ArmyListCard.tsx lines 28-31):
```typescript
const totalPoints = useMemo(
  () => units.reduce((sum, u) => sum + u.effective_points, 0),
  [units],
);
```

**Modified calculation + prop extension** (D-09, Pitfall 7 from RESEARCH):
```typescript
// ArmyListCard receives enhancementTotal as a pre-computed prop
// (the N+1 fetch happens in ArmyListCardWrapper in ArmyListsPage, not here)
interface ArmyListCardProps {
  list: ArmyList;
  faction: Faction | null;
  units: ArmyListUnitRow[];
  enhancementTotal: number;  // NEW — pre-computed by wrapper
  onClick: () => void;
}

// In the component — just add enhancementTotal to totalPoints:
const unitPoints = useMemo(
  () => units.reduce((sum, u) => sum + u.effective_points, 0),
  [units],
);
const totalPoints = unitPoints + enhancementTotal; // CHANGED
```

**ArmyListCardWrapper must fetch enhancements** (ArmyListsPage.tsx lines 161-182):
```typescript
function ArmyListCardWrapper({ list, factions, onClick }) {
  const { data: units = [] } = useArmyListWithUnits(list.id);
  const { data: enhancements = [] } = useEnhancementsByList(list.id); // NEW
  const enhancementTotal = enhancements.reduce((s, e) => s + e.enhancement_points, 0);
  const faction = list.faction_id !== null
    ? factions.find((f) => f.id === list.faction_id) ?? null
    : null;
  return (
    <ArmyListCard
      list={list}
      faction={faction}
      units={units}
      enhancementTotal={enhancementTotal}  // NEW
      onClick={onClick}
    />
  );
}
```

---

### `src/lib/computeUnitWarnings.ts` (MODIFY — add `enhancementTotal` param)

**Analog:** Self — existing `computeListHealthStats` at lines 106-146.

**Existing function signature** (computeUnitWarnings.ts lines 106-111):
```typescript
export function computeListHealthStats(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  freshness: SyncFreshness,
): ListHealthStats {
  const totalPoints = units.reduce((sum, u) => sum + u.effective_points, 0);
```

**Modified signature — backward-compatible optional param** (Pitfall 6 from RESEARCH):
```typescript
export function computeListHealthStats(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  freshness: SyncFreshness,
  enhancementTotal = 0,  // NEW — optional, defaults to 0 so existing callers are unaffected
): ListHealthStats {
  const unitPoints = units.reduce((sum, u) => sum + u.effective_points, 0);
  const totalPoints = unitPoints + enhancementTotal; // CHANGED from direct reduce
  // ... rest of function unchanged — pointsExceeded now includes enhancement points
```

**Callers that need no change:** All existing callers pass 3 args; default `0` keeps them correct.
**Callers that pass the new arg:** `ArmyListSummaryBar` and (via wrapper) `ArmyListCard`.

---

## Shared Patterns

### Sibling Portal Pattern
**Source:** `src/features/army-lists/ArmyListsPage.tsx` lines 41-72, 117-152
**Apply to:** `ArmyListsPage`, `ArmyListDetailSheet`, `EnhancementPickerSheet`

Rule: Page component owns `useState<number | null>(null)` for the portal's target ID. Child components fire `onEnhance(unitId)` callbacks upward, never own Sheet state. The `Sheet` is rendered as a sibling in `ArmyListsPage`, never nested.

```typescript
// Portal pattern — repeated for each Sheet:
const [enhancementUnitId, setEnhancementUnitId] = useState<number | null>(null);
const enhancementUnit = enhancementUnitId !== null
  ? (selectedListUnits ?? []).find((u) => u.id === enhancementUnitId) ?? null
  : null;
```

### Faction ID → String Conversion
**Source:** `src/features/army-lists/LoadoutBuilderSheet.tsx` lines 81-86
**Apply to:** `EnhancementPickerSheet`

`synced_enhancements.faction_id` is TEXT. Always convert: `String(list?.faction_id ?? "")`. Passing a number silently returns empty results.

### rules.db Safe-Default Pattern
**Source:** `src/db/queries/datasheets.ts` lines 105-115
**Apply to:** `getUnitKeywords` in `datasheets.ts`

Wrap all `getRulesDb()` calls in try/catch. Return safe defaults when rules.db is not yet synced (throws "no such table"). For keyword detection, safe default is `{ isCharacter: false, isEpicHero: false }`.

### Disabled Button + Tooltip (span wrapper required)
**Source:** `src/features/army-lists/ArmyListUnitRow.tsx` lines 155-174
**Apply to:** `EnhancementPickerSheet` Assign button

Disabled HTML buttons do not fire pointer events. Always wrap in `<span>` before `<TooltipTrigger asChild>`:
```typescript
<TooltipTrigger asChild><span><Button disabled>...</Button></span></TooltipTrigger>
```

### Toast onError
**Source:** `src/features/army-lists/ArmyListUnitRow.tsx` lines 108-125
**Apply to:** `EnhancementPickerSheet` mutation handlers

```typescript
mutate(input, { onError: () => toast.error("Failed to assign enhancement. Please try again.") });
```

### React Query Hook File Structure
**Source:** `src/hooks/useLoadoutOptions.ts` lines 1-51
**Apply to:** `src/hooks/useUnitKeywords.ts`

```typescript
// Exported key factory
export const UNIT_KEYWORDS_KEY = (unitName: string) => ["unit-keywords", unitName] as const;

// Fallback key when enabled=false
queryKey: unitName !== undefined ? UNIT_KEYWORDS_KEY(unitName) : (["unit-keywords"] as const),
queryFn: () => unitName !== undefined ? getUnitKeywords(unitName) : Promise.resolve(safeDefault),
enabled: unitName !== undefined,
staleTime: Infinity,
```

---

## Test Patterns

### `tests/army-list/enhancementPickerSheet.test.tsx` (NEW)

**Analog:** `tests/army-list/ArmyListsPage.test.tsx` (component test with QueryClientProvider + vi.mock)

**Mock structure** (ArmyListsPage.test.tsx lines 24-66):
```typescript
// Mock all DB query modules — no real SQLite in jsdom
vi.mock("@/db/queries/armyLists", () => ({
  getEnhancementsByList: vi.fn().mockResolvedValue([]),
  addEnhancement: vi.fn(),
  removeEnhancement: vi.fn(),
  // ... other army list queries unchanged
}));
vi.mock("@/db/queries/datasheets", () => ({
  getUnitKeywords: vi.fn().mockResolvedValue({ isCharacter: true, isEpicHero: false }),
  // ... other datasheets queries
}));
vi.mock("@/db/queries/bsdataExtended", () => ({
  getEnhancementsByFaction: vi.fn().mockResolvedValue([]),
}));
```

**Provider wrapper** (ArmyListsPage.test.tsx lines 8-20):
```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
// EnhancementPickerSheet uses Tooltip — wrap in TooltipProvider
```

**Test data fixtures** (armyListEnhancements.test.ts lines 32-49):
```typescript
// Fixture pattern for enhancement data
const enhancementFixture = {
  id: 1,
  list_id: 5,
  army_list_unit_id: 10,
  enhancement_name: "Warlord Trait: Iron Will",
  enhancement_points: 30,
  created_at: "2026-05-20T10:00:00Z",
};
```

### `tests/army-list/computeListHealthStats.test.ts` (NEW)

**Analog:** `tests/army-list/armyListEnhancements.test.ts` (pure function tests — no mocks, no render needed)

```typescript
// Pure function — no mocks required, import directly
import { computeListHealthStats } from "@/lib/computeUnitWarnings";
import type { ArmyListUnitRow } from "@/types/armyList";

// Test the new 4th param:
it("includes enhancementTotal in totalPoints", () => {
  const units = [/* unit with effective_points: 850 */];
  const stats = computeListHealthStats(units, 1000, "synced", 60);
  expect(stats.totalPoints).toBe(910);
});

it("triggers pointsExceeded when combined total exceeds limit", () => {
  const units = [/* unit with effective_points: 950 */];
  const stats = computeListHealthStats(units, 1000, "synced", 60);
  expect(stats.pointsExceeded).toBe(true);
});

it("defaults enhancementTotal to 0 for backward compatibility", () => {
  const units = [/* unit with effective_points: 500 */];
  const stats = computeListHealthStats(units, 1000, "synced");
  expect(stats.totalPoints).toBe(500); // existing callers unaffected
});
```

---

## No Analog Found

All files in Phase 91 have direct analogs in the codebase. No greenfield patterns required.

---

## Critical Pitfalls (from RESEARCH.md — Planner Must Include in Plan Actions)

| # | Pitfall | Affected File | Prevention |
|---|---------|---------------|------------|
| P1 | faction_id passed as number to synced_enhancements | `EnhancementPickerSheet` | Always `String(list?.faction_id ?? "")` — see LoadoutBuilderSheet line 83 |
| P2 | Disabled button suppresses tooltip without `<span>` wrapper | `EnhancementPickerSheet` | `<TooltipTrigger asChild><span><Button disabled>` — see ArmyListUnitRow pattern |
| P3 | `useEnhancementsByList` disabled when listId undefined | `EnhancementPickerSheet` | Gate render on `unit !== null && list !== null` — see LoadoutBuilderSheet line 141 |
| P4 | Ghost units with no datasheet return `isCharacter: false` | `ArmyListUnitRow` | Expected behavior per D-05 — trigger not shown, document in JSDoc |
| P5 | Enhancement deletion on unit remove causes double-delete | `ArmyListUnitRow` | Do nothing — `ON DELETE CASCADE` on `army_list_enhancements.army_list_unit_id` handles it |
| P6 | `enhancementTotal` as required param breaks existing callers | `computeUnitWarnings.ts` | Use default `enhancementTotal = 0` — 3 existing call sites unchanged |
| P7 | N+1 fetch for enhancement total in ArmyListCard | `ArmyListsPage` | Acceptable — same pattern as existing `useArmyListWithUnits` per card (documented) |

---

## Metadata

**Analog search scope:** `src/features/army-lists/`, `src/hooks/`, `src/db/queries/`, `src/lib/`, `tests/army-list/`
**Files scanned:** 11 source files read
**Pattern extraction date:** 2026-05-21
