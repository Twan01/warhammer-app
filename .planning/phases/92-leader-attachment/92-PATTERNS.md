# Phase 92: Leader Attachment - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 7 (3 new, 4 modified)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/army-lists/LeaderAttachmentSheet.tsx` | component | request-response | `src/features/army-lists/EnhancementPickerSheet.tsx` | exact |
| `src/hooks/useLeaderTargets.ts` | hook | CRUD | `src/hooks/useArmyLists.ts` (inline query in EnhancementPickerSheet) | exact |
| `src/lib/groupUnitsWithLeaders.ts` | utility | transform | `src/lib/resolveUnitPoints.ts` | role-match |
| `src/features/army-lists/ArmyListsPage.tsx` (MODIFY) | component | request-response | self (existing sibling portal pattern) | exact |
| `src/features/army-lists/ArmyListDetailSheet.tsx` (MODIFY) | component | request-response | self (unit table rendering) | exact |
| `src/features/army-lists/ArmyListUnitRow.tsx` (MODIFY) | component | request-response | self (enhance trigger at lines 211-222) | exact |
| `tests/army-lists/LeaderAttachmentSheet.test.tsx` | test | n/a | `tests/army-lists/LoadoutBuilderSheet.test.tsx` | exact |
| `tests/army-lists/groupUnitsWithLeaders.test.tsx` | test | n/a | (pure function test — no complex analog needed) | role-match |

## Pattern Assignments

### `src/features/army-lists/LeaderAttachmentSheet.tsx` (component, request-response)

**Analog:** `src/features/army-lists/EnhancementPickerSheet.tsx`

**Imports pattern** (lines 1-23):
```typescript
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";  // Replace with Link2
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { getLeaderTargetsByFaction } from "@/db/queries/bsdataExtended";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";
import { useSetLeaderAttachment, useClearLeaderAttachment } from "@/hooks/useArmyLists";
import type { ArmyList, ArmyListUnitRow as ArmyListUnitRowType } from "@/types/armyList";
```

**Props interface** (lines 25-30):
```typescript
interface EnhancementPickerSheetProps {
  open: boolean;
  unit: ArmyListUnitRowType | null;
  list: ArmyList | null;
  onClose: () => void;
}
```
Adapt to: `LeaderAttachmentSheetProps` adding `units: ArmyListUnitRowType[]` (needed for target filtering).

**Faction ID TEXT conversion** (lines 46-50):
```typescript
const factionIdStr = unit?.faction_id != null
  ? String(unit.faction_id)
  : list?.faction_id != null
    ? String(list.faction_id)
    : null;
```

**Data fetch pattern** (lines 53-58):
```typescript
const { data: factionEnhancements = [] } = useQuery<SyncedEnhancementRow[]>({
  queryKey: ["enhancements-by-faction", factionIdStr],
  queryFn: () => getEnhancementsByFaction(factionIdStr!),
  enabled: !!factionIdStr,
  staleTime: 5 * 60 * 1000,
});
```
Adapt to: query `getLeaderTargetsByFaction(factionIdStr!)` with key `["leader-targets", factionIdStr]`.

**Sheet wrapper pattern** (lines 77-82):
```typescript
<Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
  <SheetContent
    side="right"
    className="overflow-y-auto sm:max-w-[480px]"
  >
```

**Disabled button with tooltip** (lines 192-209):
```typescript
<Tooltip>
  <TooltipTrigger asChild>
    {/* Pitfall 2: wrap disabled button in span for tooltip */}
    <span className="inline-flex">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        disabled
      >
        Assign
      </Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>{disableReason}</TooltipContent>
</Tooltip>
```

**Active action button** (lines 211-230):
```typescript
<Button
  type="button"
  variant="outline"
  size="sm"
  className="h-7 text-xs"
  disabled={addEnhancement.isPending}
  onClick={() => {
    addEnhancement.mutate(
      { /* mutation vars */ },
      { onError: () => toast.error("Failed to assign enhancement. Please try again.") },
    );
  }}
>
  Assign
</Button>
```

**Remove/detach action button** (lines 176-191):
```typescript
<Button
  type="button"
  variant="destructive"
  size="sm"
  className="h-7 text-xs"
  disabled={removeEnhancement.isPending}
  onClick={() => {
    removeEnhancement.mutate(
      { enhancement_id: existingOnThisUnit.id, list_id: list!.id },
      { onError: () => toast.error("Failed to remove enhancement. Please try again.") },
    );
  }}
>
  Remove
</Button>
```

**List item layout** (lines 153-170):
```typescript
<div
  key={enhancement.name}
  className="flex items-center justify-between gap-2 rounded-md border p-3"
>
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium">{enhancement.name}</span>
    <div className="flex items-center gap-2">
      <Badge variant="secondary">{enhancement.points} pts</Badge>
    </div>
  </div>
  {/* action buttons */}
</div>
```

---

### `src/hooks/useLeaderTargets.ts` (hook, CRUD)

**Analog:** Inline query in `EnhancementPickerSheet.tsx` lines 53-58 (extract to standalone hook following project convention)

**Hook file structure** (from `src/hooks/useArmyLists.ts` lines 1-50):
```typescript
import { useQuery } from "@tanstack/react-query";
import { getLeaderTargetsByFaction } from "@/db/queries/bsdataExtended";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";

export const LEADER_TARGETS_KEY = (factionId: string) =>
  ["leader-targets", factionId] as const;

export function useLeaderTargets(factionId: string | null) {
  return useQuery<SyncedLeaderTargetRow[]>({
    queryKey: factionId ? LEADER_TARGETS_KEY(factionId) : ["leader-targets"],
    queryFn: () => getLeaderTargetsByFaction(factionId!),
    enabled: !!factionId,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

### `src/lib/groupUnitsWithLeaders.ts` (utility, transform)

**Analog:** `src/lib/resolveUnitPoints.ts` (pure function pattern)

**File header pattern** (lines 1-25):
```typescript
/**
 * Phase 76 — Centralized points resolver (PV-01, D-01/D-02/D-03).
 *
 * Pure function: no DB, no hooks, no async. Takes the five intermediate
 * column values from the SQL COALESCE chain and returns the resolved
 * points value with a source label.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PointsSource = "override" | "tier" | "synced" | "user-override" | "base" | "unknown";

export interface ResolvedPoints {
  points: number;
  source: PointsSource;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------
```
Adapt: export `GroupedUnit` interface, then `groupUnitsWithLeaders` pure function. Same structure: JSDoc, types section, implementation section.

---

### `src/features/army-lists/ArmyListsPage.tsx` (MODIFY — add sibling portal)

**Analog:** self — existing sibling portal state at lines 44-46, 57-59, 78-83, 159-177

**State declaration pattern** (lines 44-46):
```typescript
const [loadoutUnitId, setLoadoutUnitId] = useState<number | null>(null);
const [enhancementUnitId, setEnhancementUnitId] = useState<number | null>(null);
```
Add: `const [leaderUnitId, setLeaderUnitId] = useState<number | null>(null);`

**Derived unit lookup pattern** (lines 54-59):
```typescript
const loadoutUnit = loadoutUnitId !== null
  ? (selectedListUnits ?? []).find((u) => u.id === loadoutUnitId) ?? null
  : null;
const enhancementUnit = enhancementUnitId !== null
  ? (selectedListUnits ?? []).find((u) => u.id === enhancementUnitId) ?? null
  : null;
```
Add: same pattern for `leaderUnit`.

**Handler pattern** (lines 78-81):
```typescript
const openLoadout = (armyListUnitId: number) => setLoadoutUnitId(armyListUnitId);
const closeLoadout = () => setLoadoutUnitId(null);
const openEnhancement = (armyListUnitId: number) => setEnhancementUnitId(armyListUnitId);
const closeEnhancement = () => setEnhancementUnitId(null);
```
Add: `openLeaderAttach` / `closeLeaderAttach`.

**Close-all handler** (line 75):
```typescript
const closeDetail = () => { setSelectedListId(null); setUnitPickerOpen(false); setLoadoutUnitId(null); setEnhancementUnitId(null); setDatasheetBrowserOpen(false); };
```
Add: `setLeaderUnitId(null)` to closeDetail.

**ArmyListDetailSheet callback prop** (line 138):
```typescript
onEnhanceUnit={openEnhancement}
```
Add: `onAttachLeader={openLeaderAttach}`.

**Sibling portal JSX** (lines 166-171):
```typescript
<EnhancementPickerSheet
  open={enhancementUnitId !== null}
  unit={enhancementUnit}
  list={selectedList}
  onClose={closeEnhancement}
/>
```
Add: `<LeaderAttachmentSheet>` with same structure, passing `units={selectedListUnits ?? []}`.

---

### `src/features/army-lists/ArmyListDetailSheet.tsx` (MODIFY — grouping + callback)

**Analog:** self — unit table rendering at lines 244-269

**New callback prop** (add to interface, lines 56-65):
```typescript
onEnhanceUnit: (armyListUnitId: number) => void;
```
Add: `onAttachLeader: (armyListUnitId: number) => void;`

**Unit table rendering** (lines 256-267) — replace direct map with groupUnitsWithLeaders:
```typescript
{(units ?? []).map((alu) => (
  <ArmyListUnitRow
    key={alu.id}
    unit={alu}
    totalPoints={totalPoints}
    pointsLimit={list.points_limit}
    freshness={freshness}
    onRemove={() => handleRemoveUnit(alu.id)}
    onConfigure={() => onConfigureUnit(alu.id)}
    onEnhance={() => onEnhanceUnit(alu.id)}
    enhancementName={(listEnhancements ?? []).find((le) => le.army_list_unit_id === alu.id)?.enhancement_name}
  />
))}
```
Wrap with `useMemo(() => groupUnitsWithLeaders(units ?? []), [units])` and pass `isIndentedLeader` + `onAttachLeader` to each row.

---

### `src/features/army-lists/ArmyListUnitRow.tsx` (MODIFY — leader trigger + indent)

**Analog:** self — enhance trigger pattern at lines 83-88 and 211-222

**Enhancement eligibility pattern** (lines 83-87):
```typescript
const { data: keywords } = useUnitKeywords(unit.unit_name);
const isCharacter = keywords?.isCharacter ?? false;
const isEpicHero = keywords?.isEpicHero ?? false;
const showEnhanceTrigger = isCharacter && !isEpicHero;
```
Add leader eligibility: check unit name against `leaderTargets` prop (passed from parent).

**Enhance trigger button** (lines 211-222):
```typescript
{showEnhanceTrigger && (
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="h-7 text-xs mt-1"
    onClick={onEnhance}
    aria-label={`Assign enhancement to ${unit.unit_name}`}
  >
    <Sparkles className="h-3 w-3 mr-1" />Enhance
  </Button>
)}
```
Add analogous leader trigger with `Link2` icon, `onClick={onAttachLeader}`.

**New props to add to interface** (lines 36-45):
```typescript
interface ArmyListUnitRowProps {
  // ... existing props ...
  onAttachLeader: () => void;
  isIndentedLeader?: boolean;
  leaderName?: string;      // name of leader attached to this target
  leaderTargets?: SyncedLeaderTargetRow[];  // passed from parent for eligibility check
}
```

---

### `tests/army-lists/LeaderAttachmentSheet.test.tsx` (test)

**Analog:** `tests/army-lists/LoadoutBuilderSheet.test.tsx`

**Test file structure** (lines 1-31):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadoutBuilderSheet } from "@/features/army-lists/LoadoutBuilderSheet";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { SyncedLoadoutOptionRow } from "@/db/queries/bsdataExtended";
```

**Mock pattern** (lines 22-31):
```typescript
const mockSetModelCount = vi.fn();
const mockClearModelCount = vi.fn();

vi.mock("@/hooks/useArmyLists", () => ({
  useSetSelectedModelCount: () => ({
    mutate: mockSetModelCount,
    isPending: false,
  }),
  useClearSelectedModelCount: () => ({
    mutate: mockClearModelCount,
    isPending: false,
  }),
}));
```
Adapt: mock `useSetLeaderAttachment` / `useClearLeaderAttachment` and `useLeaderTargets`.

**QueryClient wrapper** (standard pattern across all test files):
```typescript
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
```

---

### `tests/army-lists/groupUnitsWithLeaders.test.tsx` (test)

**Analog:** Pure function test — straightforward describe/it blocks with no React rendering.

**Structure:**
```typescript
import { describe, it, expect } from "vitest";
import { groupUnitsWithLeaders } from "@/lib/groupUnitsWithLeaders";
import type { ArmyListUnitRow } from "@/types/armyList";

describe("groupUnitsWithLeaders", () => {
  it("returns units unchanged when no attachments", () => { /* ... */ });
  it("places leader immediately after target", () => { /* ... */ });
  it("handles multiple leader-target pairs", () => { /* ... */ });
  it("skips circular references gracefully", () => { /* ... */ });
});
```

---

## Shared Patterns

### Sibling Portal Architecture
**Source:** `src/features/army-lists/ArmyListsPage.tsx` lines 38-83
**Apply to:** LeaderAttachmentSheet, ArmyListDetailSheet (callback prop), ArmyListUnitRow (trigger)

State in page component, callbacks drill down through ArmyListDetailSheet to ArmyListUnitRow, Sheet rendered as sibling at page root. Never nest Sheet inside Sheet.

### Disabled Button + Tooltip (Radix Workaround)
**Source:** `src/features/army-lists/EnhancementPickerSheet.tsx` lines 192-209
**Apply to:** LeaderAttachmentSheet (disabled Attach button when target already has leader)
```typescript
<Tooltip>
  <TooltipTrigger asChild>
    <span className="inline-flex">
      <Button disabled>Attach</Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>Already led by {existingLeaderName}</TooltipContent>
</Tooltip>
```

### TEXT Faction ID Conversion
**Source:** `src/features/army-lists/EnhancementPickerSheet.tsx` lines 46-50
**Apply to:** LeaderAttachmentSheet, useLeaderTargets hook, anywhere querying synced_leader_targets
```typescript
const factionIdStr = unit?.faction_id != null
  ? String(unit.faction_id)
  : list?.faction_id != null
    ? String(list.faction_id)
    : null;
```

### Mutation with Toast Error
**Source:** `src/features/army-lists/EnhancementPickerSheet.tsx` lines 217-226
**Apply to:** LeaderAttachmentSheet attach/detach actions
```typescript
mutation.mutate(
  { /* variables */ },
  { onError: () => toast.error("Failed to [action]. Please try again.") },
);
```

### React Query Hook Pattern
**Source:** `src/hooks/useArmyLists.ts` lines 48-50
**Apply to:** useLeaderTargets hook
```typescript
export const LEADER_TARGETS_KEY = (factionId: string) =>
  ["leader-targets", factionId] as const;
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All files have exact or role-match analogs in the codebase |

## Metadata

**Analog search scope:** `src/features/army-lists/`, `src/hooks/`, `src/lib/`, `src/db/queries/`, `tests/army-lists/`
**Files scanned:** 12
**Pattern extraction date:** 2026-05-21
