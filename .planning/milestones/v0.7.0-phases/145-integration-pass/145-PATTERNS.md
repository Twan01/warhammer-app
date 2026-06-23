# Phase 145: Integration Pass — Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 11 (7 modified + 4 new)
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/queries/recipeTechniqueSlotMaps.ts` | query | CRUD | itself (`getSlotResolutionMap`) | exact — add two functions to same file |
| `src/hooks/useSlotResolutionMap.ts` | hook | request-response | itself (`useSlotResolutionMap`) | exact — add two hooks to same file |
| `src/hooks/useTechniqueInstances.ts` | hook | request-response | itself (`useUpdateSlotMap` onSuccess) | exact — extend invalidation list |
| `src/features/painting-mode/PaintingModeView.tsx` | component | request-response | itself + `SectionedTimeline.tsx` (effectivePaintId wire-up) | exact |
| `src/features/painting-mode/StepFocalView.tsx` | component | request-response | itself (props extension) | exact |
| `src/features/painting-mode/PaintReadinessBanner.tsx` | component | request-response | itself (prop extension) | exact |
| `src/features/painting-mode/SlotReassignMiniDialog.tsx` | component | request-response | `src/features/recipes/EditColoursDialog.tsx` | exact (single-slot variant) |
| `src/features/recipes/AssignmentChecklist.tsx` | component | CRUD | `src/features/recipes/SectionedTimeline.tsx` (effectivePaintId usage) | role-match |
| `src/features/recipes/ChecklistStepRow.tsx` | component | request-response | itself (remove `step.paint_id` guards) | exact |
| `tests/data-layer/recipe-duplication-live-link.test.ts` | test | CRUD | `tests/data-layer/apply-technique.test.ts` | exact |
| `tests/painting-mode/PaintReadinessBanner.test.tsx` | test | request-response | itself (extend) | exact |

---

## Pattern Assignments

### `src/db/queries/recipeTechniqueSlotMaps.ts` — add `getUnfilledSlotCount` + `getStepSlotIdMap`

**Analog:** itself (`getSlotResolutionMap`, lines 53–76)

**Imports pattern** (lines 30–31 — reuse existing):
```typescript
import { getDb } from "@/db/client";
```

**Core pattern — `getSlotResolutionMap` JOIN chain** (lines 58–69):
```typescript
const rows = await db.select<{ recipe_step_id: number; paint_id: number | null }[]>(
  `SELECT rs.id AS recipe_step_id, sm.paint_id
   FROM recipe_steps rs
   JOIN recipe_sections rsec ON rsec.id = rs.section_id
   JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
   JOIN technique_steps ts ON ts.id = rs.technique_step_id
   LEFT JOIN recipe_technique_slot_maps sm
     ON sm.instance_id = rti.id AND sm.slot_id = ts.colour_slot_id
   WHERE rs.recipe_id = $1 AND rs.technique_step_id IS NOT NULL`,
  [recipeId],
);
const map = new Map<number, number | null>();
for (const row of rows) {
  map.set(row.recipe_step_id, row.paint_id ?? null);
}
return map;
```

**New `getUnfilledSlotCount` query** — add directly after `getSlotMapByInstance` (line 105):
```typescript
// SQL: LEFT JOIN technique_colour_slots to get all expected slots,
// then LEFT JOIN recipe_technique_slot_maps to find which are unfilled.
// CRITICAL: use LEFT JOIN (not INNER JOIN) on slot_maps — missing rows = unfilled.
export async function getUnfilledSlotCount(recipeId: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ unfilled_count: number }[]>(
    `SELECT COUNT(*) AS unfilled_count
     FROM recipe_technique_instances rti
     JOIN technique_colour_slots tcs ON tcs.technique_id = rti.technique_id
     LEFT JOIN recipe_technique_slot_maps sm
       ON sm.instance_id = rti.id AND sm.slot_id = tcs.id
     WHERE rti.recipe_id = $1
       AND (sm.instance_id IS NULL OR sm.paint_id IS NULL)`,
    [recipeId],
  );
  return rows[0]?.unfilled_count ?? 0;
}
```
Note: omit `AND rti.detached = 0` until the planner verifies `detached` column exists
with a DEFAULT. See Assumption A4 in RESEARCH.md.

**New `getStepSlotIdMap` query** — add after `getUnfilledSlotCount`:
```typescript
// Reuses the same JOIN chain as getSlotResolutionMap but returns slot_id per step.
// Used by PaintingModeView to know which slot a tapped technique step maps to.
export async function getStepSlotIdMap(
  recipeId: number,
): Promise<Map<number, number | null>> {
  const db = await getDb();
  const rows = await db.select<{ recipe_step_id: number; slot_id: number | null }[]>(
    `SELECT rs.id AS recipe_step_id, ts.colour_slot_id AS slot_id
     FROM recipe_steps rs
     JOIN recipe_sections rsec ON rsec.id = rs.section_id
     JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
     JOIN technique_steps ts ON ts.id = rs.technique_step_id
     WHERE rs.recipe_id = $1 AND rs.technique_step_id IS NOT NULL`,
    [recipeId],
  );
  const map = new Map<number, number | null>();
  for (const row of rows) {
    map.set(row.recipe_step_id, row.slot_id ?? null);
  }
  return map;
}
```

---

### `src/hooks/useSlotResolutionMap.ts` — add `useUnfilledSlotCount` + `useStepSlotIdMap`

**Analog:** itself (`useSlotResolutionMap`, lines 24–36; `useSlotMapByInstance`, lines 48–60)

**Imports extension** (add to existing import on line 2):
```typescript
import {
  getSlotResolutionMap,
  getSlotMapByInstance,
  getUnfilledSlotCount,  // new
  getStepSlotIdMap,      // new
} from "@/db/queries/recipeTechniqueSlotMaps";
```

**Enabled-by-id hook pattern** (copy from `useSlotResolutionMap`, lines 24–36):
```typescript
export const UNFILLED_SLOT_COUNT_KEY = (recipeId: number) =>
  ["unfilled-slot-count", recipeId] as const;

export function useUnfilledSlotCount(recipeId: number | undefined) {
  return useQuery({
    queryKey:
      recipeId !== undefined
        ? UNFILLED_SLOT_COUNT_KEY(recipeId)
        : ["unfilled-slot-count"],
    queryFn: () =>
      recipeId !== undefined
        ? getUnfilledSlotCount(recipeId)
        : Promise.resolve(0),
    enabled: recipeId !== undefined,
  });
}

export const STEP_SLOT_ID_MAP_KEY = (recipeId: number) =>
  ["step-slot-id-map", recipeId] as const;

export function useStepSlotIdMap(recipeId: number | undefined) {
  return useQuery({
    queryKey:
      recipeId !== undefined
        ? STEP_SLOT_ID_MAP_KEY(recipeId)
        : ["step-slot-id-map"],
    queryFn: () =>
      recipeId !== undefined
        ? getStepSlotIdMap(recipeId)
        : Promise.resolve(new Map<number, number | null>()),
    enabled: recipeId !== undefined,
  });
}
```

---

### `src/hooks/useTechniqueInstances.ts` — extend `useUpdateSlotMap` invalidation

**Analog:** itself (`useUpdateSlotMap` onSuccess, lines 118–130)

**Existing import block** (lines 1–13 — add new import):
```typescript
import {
  SLOT_RESOLUTION_MAP_KEY,
  SLOT_MAP_BY_INSTANCE_KEY,
  UNFILLED_SLOT_COUNT_KEY,  // new
} from "@/hooks/useSlotResolutionMap";
```

**Existing `useUpdateSlotMap` onSuccess** (lines 122–128 — add one line):
```typescript
onSuccess: (_, variables) => {
  qc.invalidateQueries({ queryKey: SLOT_RESOLUTION_MAP_KEY(variables.recipeId) });
  qc.invalidateQueries({ queryKey: SLOT_MAP_BY_INSTANCE_KEY(variables.instanceId) });
  qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
  qc.invalidateQueries({ queryKey: UNFILLED_SLOT_COUNT_KEY(variables.recipeId) }); // new
},
```

---

### `src/features/painting-mode/PaintingModeView.tsx` — wire `useSlotResolutionMap` + `useUnfilledSlotCount`

**Analog:** itself + `SectionedTimeline.tsx` for effectivePaintId consumer pattern (lines 76–92)

**New imports to add** (after line 7 `isPaintMissing` import):
```typescript
import { effectivePaintId } from "@/lib/effectivePaintId";
import {
  useSlotResolutionMap,
  useUnfilledSlotCount,
  useStepSlotIdMap,
} from "@/hooks/useSlotResolutionMap";
import { SlotReassignMiniDialog } from "./SlotReassignMiniDialog";
```

**New hook calls** (add after line 35 `useRecipeSections`):
```typescript
const { data: slotMap = new Map() } = useSlotResolutionMap(recipeId);
const { data: stepSlotIdMap = new Map() } = useStepSlotIdMap(recipeId);
const { data: unfilledSlotCount = 0 } = useUnfilledSlotCount(recipeId);
```

**Replace `missingPaints` useMemo** (lines 45–57 — add `slotMap` to deps + replace `step.paint_id` reads):
```typescript
const missingPaints = useMemo(() => {
  const seen = new Set<number>();
  const result: Array<{ id: number; name: string; brand: string }> = [];
  for (const step of state.orderedSteps) {
    const resolvedId = effectivePaintId(step, slotMap); // replace step.paint_id
    if (resolvedId == null) continue;
    const paint = paintMap.get(resolvedId);
    if (!paint || !isPaintMissing(paint)) continue;
    if (seen.has(paint.id)) continue;
    seen.add(paint.id);
    result.push({ id: paint.id, name: paint.name, brand: paint.brand });
  }
  return result;
}, [state.orderedSteps, paintMap, slotMap]); // slotMap added to deps
```

**Replace `currentPaint` derivation** (lines 101–104):
```typescript
const resolvedPaintId =
  currentStep !== undefined ? effectivePaintId(currentStep, slotMap) : null;
const currentPaint =
  resolvedPaintId !== null ? paintMap.get(resolvedPaintId) : undefined;
const isUnfilledSlot =
  (currentStep?.technique_step_id ?? null) !== null && resolvedPaintId === null;
```

**Banner visibility update** (line 111 — extend to include unfilled count):
```typescript
const showBanner =
  !bannerDismissed && (missingPaints.length > 0 || unfilledSlotCount > 0);
```

**Mini-dialog state** (add before return):
```typescript
const [reassignOpen, setReassignOpen] = useState(false);
const [reassignTarget, setReassignTarget] = useState<{
  instanceId: number;
  slotId: number;
  techniqueId: number;
} | null>(null);

function handleReassignSlot() {
  if (!currentStep) return;
  const slotId = stepSlotIdMap.get(currentStep.id) ?? null;
  const section = sections.find((s) => s.id === currentStep.section_id);
  const instanceId = section?.technique_instance_id ?? null;
  // techniqueId: resolve from instances list (useInstancesForRecipe already called
  // in parent if needed, or derive from section.technique_instance_id → instances map)
  if (slotId === null || instanceId === null) return;
  // techniqueId comes from the instances list — caller threads this through
  // or PaintingModeView calls useInstancesForRecipe(recipeId) to build a map
  setReassignTarget({ instanceId, slotId, techniqueId: /* see note */ 0 });
  setReassignOpen(true);
}
```
Note: for `techniqueId`, either call `useInstancesForRecipe(recipeId)` in PaintingModeView
and build a Map<instanceId, techniqueId>, or add `techniqueId` to `RecipeSection` type from
the section row (already has `technique_instance_id`; join to instances in a separate hook).
The planner should use `useInstancesForRecipe(recipeId)` (already exported from
`useTechniqueInstances.ts`) and build the map at component level.

**Pass new props to `StepFocalView`** (lines 159–180 — extend props):
```typescript
<StepFocalView
  ...
  paint={currentPaint}
  isUnfilledSlot={isUnfilledSlot}
  onReassignSlot={handleReassignSlot}
/>
```

**Pass `unfilledSlotCount` to banner** (line 145–148):
```typescript
<PaintReadinessBanner
  missingPaints={missingPaints}
  unfilledSlotCount={unfilledSlotCount}
  onDismiss={() => setBannerDismissed(true)}
/>
```

**Add `SlotReassignMiniDialog` as sibling** (after the main flex container — P6 pitfall avoidance):
```typescript
{reassignTarget && (
  <SlotReassignMiniDialog
    open={reassignOpen}
    instanceId={reassignTarget.instanceId}
    slotId={reassignTarget.slotId}
    techniqueId={reassignTarget.techniqueId}
    recipeId={recipeId}
    onClose={() => { setReassignOpen(false); setReassignTarget(null); }}
  />
)}
```

---

### `src/features/painting-mode/StepFocalView.tsx` — add `isUnfilledSlot` + `onReassignSlot` props

**Analog:** itself (lines 7–24 props interface; lines 61–97 paint block)

**Props interface extension** (after line 9 `paint: Paint | undefined`):
```typescript
export interface StepFocalViewProps {
  currentStep: RecipeStep | undefined;
  paint: Paint | undefined;
  isUnfilledSlot?: boolean;        // new: true when technique step slot has no fill
  onReassignSlot?: () => void;     // new: opens SlotReassignMiniDialog
  // ... rest unchanged
}
```

**Replace `hasPaint` derivation** (line 61 — three-state logic):
```typescript
// Before: const hasPaint = currentStep.paint_id !== null && paint;
// After:
const hasPaint = !!paint; // parent already resolved via effectivePaintId
// isUnfilledSlot and onReassignSlot come from props
```

**Replace paint info block** (lines 70–98 — add third branch):
```typescript
{hasPaint ? (
  // Existing resolved swatch block — unchanged (lines 73–97)
  <div className="flex items-center gap-3">
    <div
      className="h-10 w-10 rounded-full border-2 border-background ring-2 ring-border shrink-0"
      style={{ backgroundColor: paint.hex_color ?? undefined }}
      data-testid="paint-swatch"
    />
    ...
  </div>
) : isUnfilledSlot ? (
  // New: unfilled slot indicator — dashed swatch + label + tap-to-assign
  <button
    type="button"
    className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    aria-label="Colour slot unfilled. Tap to assign a paint."
    onClick={onReassignSlot}
  >
    <div
      className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground bg-transparent shrink-0"
      aria-hidden="true"
    />
    <p className="text-xs text-muted-foreground">Slot unfilled — tap to assign</p>
  </button>
) : (
  // Existing paintless-step indicator — unchanged (line 96)
  <p className="text-sm text-muted-foreground">(no paint)</p>
)}
```

**Existing test file to extend:** `tests/painting-mode/StepFocalView.test.tsx`
Factory helper `makeStep` needs `technique_step_id` added to the type (line 24 uses `RecipeStep`
which already has `technique_step_id?: number | null` from `src/types/recipePaint.ts` line 24).

---

### `src/features/painting-mode/PaintReadinessBanner.tsx` — add `unfilledSlotCount` prop

**Analog:** itself (lines 4–47)

**Extended props interface** (lines 3–13):
```typescript
interface PaintReadinessBannerProps {
  missingPaints: MissingPaint[];
  unfilledSlotCount?: number;  // new
  onDismiss: () => void;
}
```

**Updated render guard** (line 19):
```typescript
// Before: if (missingPaints.length === 0) { return null; }
// After:
if (missingPaints.length === 0 && !unfilledSlotCount) {
  return null;
}
```

**Add unfilled-slot line** (after the existing `<p>` block, before the dismiss button area):
```typescript
{/* Unfilled slot warning — neutral, not amber (below separator) */}
{unfilledSlotCount && unfilledSlotCount > 0 ? (
  <>
    <Separator className="my-2" />
    <div className="flex items-center gap-2">
      <Circle className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        {unfilledSlotCount === 1
          ? "1 colour slot unfilled"
          : `${unfilledSlotCount} colour slots unfilled`}
      </p>
    </div>
  </>
) : null}
```

**New imports to add** (lines 1–2):
```typescript
import { AlertTriangle, Circle, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
```

---

### `src/features/painting-mode/SlotReassignMiniDialog.tsx` — NEW component

**Analog:** `src/features/recipes/EditColoursDialog.tsx` (lines 1–172)

**File header + imports** (copy from `EditColoursDialog.tsx` lines 1–30, adapt):
```typescript
/**
 * SlotReassignMiniDialog — single-slot focused paint reassign in Painting Mode.
 *
 * Inline slot fill without leaving Painting Mode.
 * Single-slot variant of EditColoursDialog — no scroll area, max-w-xs.
 * Rendered as a sibling to PaintingModeView (NOT nested inside SheetContent) to
 * avoid P6 Radix portal clipping.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTechniqueColourSlots } from "@/hooks/useTechniqueColourSlots";
import { useSlotMapByInstance } from "@/hooks/useSlotResolutionMap";
import { useUpdateSlotMap } from "@/hooks/useTechniqueInstances";
import { SlotFillRow } from "@/features/recipes/SlotFillRow";
```

**Props interface** (single-slot focused, narrower than EditColoursDialog):
```typescript
export interface SlotReassignMiniDialogProps {
  open: boolean;
  instanceId: number | null;
  slotId: number | null;
  techniqueId: number | null;
  recipeId: number;
  onClose: () => void;
}
```

**Seeding pattern** (copy from `EditColoursDialog.tsx` lines 66–81, adapt for single slot):
```typescript
// From EditColoursDialog lines 66-81 — adapted: only seed the one target slot
useEffect(() => {
  if (!open) { setSlotFill(null); setSeeded(false); return; }
  if (slotsLoading || slotMapLoading) return;
  if (seeded) return;
  setSlotFill(existingSlotMap?.get(slotId ?? -1) ?? null);
  setSeeded(true);
}, [open, existingSlotMap, slotsLoading, slotMapLoading, seeded, slotId]);
```

**Save handler** (copy from `EditColoursDialog.tsx` lines 91–100, adapt):
```typescript
// From EditColoursDialog lines 91-100 — same mutateAsync + toast pattern
async function handleSave() {
  if (instanceId === null || slotId === null) return;
  const fills = new Map([[slotId, slotFill]]);
  try {
    await updateSlotMap.mutateAsync({ instanceId, recipeId, slotFills: fills });
    toast.success("Slot updated.");
    onClose();
  } catch {
    toast.error("Failed to update slot. Please try again.");
  }
}
```

**Dialog layout** (copy from `EditColoursDialog.tsx` lines 105–172, adapt):
```typescript
// Key differences from EditColoursDialog:
// - sm:max-w-xs instead of sm:max-w-md
// - No ScrollArea (single row)
// - Title: "Reassign slot colour"
// - Description: "Change the paint assigned to this colour slot."
// - Confirm: "Reassign paint" (not "Save colours")
// - Close: "Close" (not "Cancel")
return (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="sm:max-w-xs" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Reassign slot colour</DialogTitle>
        <DialogDescription>
          Change the paint assigned to this colour slot.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 py-2">
        {slot && (
          <SlotFillRow
            slot={slot}
            paintId={slotFill}
            onChange={(paintId) => setSlotFill(paintId)}
          />
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={handleSave} disabled={updateSlotMap.isPending || isLoading}>
          {updateSlotMap.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Reassign paint
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
```

---

### `src/features/recipes/AssignmentChecklist.tsx` — wire `useSlotResolutionMap` + `effectivePaintId`

**Analog:** `src/features/recipes/SectionedTimeline.tsx` (effectivePaintId consumer, lines 56–92)

**New imports to add** (after line 16 `usePaints` import):
```typescript
import { effectivePaintId } from "@/lib/effectivePaintId";
import { useSlotResolutionMap } from "@/hooks/useSlotResolutionMap";
```

**New hook call** (after line 35 `usePaints()` call):
```typescript
// Call ONCE at component level — never per-row (N+1 anti-pattern).
const { data: slotMap = new Map() } = useSlotResolutionMap(recipeId);
```

**Helper closure** (add in component body, before the render):
```typescript
// Resolve paint for a step — routes technique steps through effectivePaintId.
function resolvedPaint(step: RecipeStep) {
  const id = effectivePaintId(step, slotMap);
  return id !== null ? paintsById.get(id) : undefined;
}
```

**Replace all three `paint=` prop expressions** (lines 127, 152, 169):
```typescript
// Before (line 127, 152, 169):
// paint={step.paint_id !== null ? paintsById.get(step.paint_id) : undefined}
// After (all three sites):
paint={resolvedPaint(step)}
```

---

### `src/features/recipes/ChecklistStepRow.tsx` — remove `step.paint_id` guards

**Analog:** itself (lines 37–45, 80–99)

**`hasDetail` guard** (line 38 — remove `step.paint_id` check):
```typescript
// Before: (step.paint_id !== null && !!paint) ||
// After (parent resolves paint; gate on !!paint only):
const hasDetail =
  !!paint ||
  !!altPaint ||
  !!step.technique ||
  !!step.tool ||
  !!step.dilution ||
  step.time_estimate_minutes != null ||
  !!step.painting_phase ||
  !!step.notes;
```

**Collapsible paint swatch** (line 80 — remove `step.paint_id` check):
```typescript
// Before: {step.paint_id !== null && paint && (
// After:
{paint && (
  <div className="flex items-center gap-2 text-sm">
    ...
  </div>
)}
```

No other changes to this file — props interface already accepts `paint: Paint | undefined`.

---

### `tests/data-layer/recipe-duplication-live-link.test.ts` — NEW integration test

**Analog:** `tests/data-layer/apply-technique.test.ts` (lines 1–80+)

**File header pattern** (lines 1–29 of `apply-technique.test.ts`):
```typescript
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createDbBridge,
} from "./db-helpers";

vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";
import { duplicateRecipe } from "@/db/queries/recipes";
```

**`beforeEach` scaffold** (copy from `apply-technique.test.ts` lines 43–80):
```typescript
// Same fixture pattern: technique + colour_slot + technique_step + recipe
// Insert a paint row for slot fill FK (recipe_technique_slot_maps.paint_id)
// Apply technique to original recipe (call applyTechnique directly on db)
// Set up createDbBridge(db) and vi.mocked(getDb).mockResolvedValue(bridge)
```

**Assertions to cover (INTG-05)**:
```typescript
// 1. Copy has distinct recipe_technique_instances rows (new IDs, same technique_id)
// 2. Copy's slot maps are independent (same slot→paint, distinct instance_id)
// 3. Copy's recipe_steps carry technique_step_id (live link intact)
// 4. Copy's recipe_sections carry technique_instance_id pointing to copy's instances
// 5. Original recipe's instances are unchanged after duplication
```

---

### `tests/painting-mode/PaintReadinessBanner.test.tsx` — extend with `unfilledSlotCount` tests

**Analog:** itself (lines 1–61 — extend with new describe blocks)

**Pattern for new tests** (copy existing describe structure):
```typescript
it("renders unfilled slot count when unfilledSlotCount > 0", () => {
  render(
    <PaintReadinessBanner
      missingPaints={[]}
      unfilledSlotCount={3}
      onDismiss={() => {}}
    />,
  );
  expect(screen.getByText("3 colour slots unfilled")).toBeInTheDocument();
});

it("renders singular form for unfilledSlotCount === 1", () => {
  render(
    <PaintReadinessBanner
      missingPaints={[]}
      unfilledSlotCount={1}
      onDismiss={() => {}}
    />,
  );
  expect(screen.getByText("1 colour slot unfilled")).toBeInTheDocument();
});

it("does not render unfilled line when unfilledSlotCount is 0 or omitted", () => {
  render(
    <PaintReadinessBanner missingPaints={[]} onDismiss={() => {}} />,
  );
  expect(screen.queryByText(/colour slot/)).not.toBeInTheDocument();
});

it("renders both missing-paint sentence and unfilled line when both present", () => {
  render(
    <PaintReadinessBanner
      missingPaints={[{ id: 1, name: "Abaddon Black", brand: "Citadel" }]}
      unfilledSlotCount={2}
      onDismiss={() => {}}
    />,
  );
  expect(screen.getByText(/Some paints are not in your inventory/)).toBeInTheDocument();
  expect(screen.getByText("2 colour slots unfilled")).toBeInTheDocument();
});
```

---

## Shared Patterns

### effectivePaintId consumer wire-up
**Source:** `src/features/recipes/SectionedTimeline.tsx` lines 11, 56–92
**Apply to:** `PaintingModeView.tsx`, `AssignmentChecklist.tsx`
```typescript
// Import:
import { effectivePaintId } from "@/lib/effectivePaintId";
import { useSlotResolutionMap } from "@/hooks/useSlotResolutionMap";

// Hook call (ONCE per component, never per row):
const { data: slotMap = new Map() } = useSlotResolutionMap(recipeId);

// Resolution:
const resolvedId = effectivePaintId(step, slotMap);
// Distinguish unfilled slot from paintless step:
const isUnfilledSlot = (step.technique_step_id ?? null) !== null && resolvedId === null;
// useMemo/useCallback deps must include slotMap
```

### Dialog structure (shadcn/Radix)
**Source:** `src/features/recipes/EditColoursDialog.tsx` lines 105–172
**Apply to:** `SlotReassignMiniDialog.tsx`
```typescript
// ALWAYS include DialogDescription (Radix a11y requirement)
// showCloseButton={false} — managed by footer button
// Render as SIBLING to Sheet/modal parent, not nested inside SheetContent (P6)
```

### useMutation + toast pattern
**Source:** `src/features/recipes/EditColoursDialog.tsx` lines 91–100
**Apply to:** `SlotReassignMiniDialog.tsx`
```typescript
try {
  await updateSlotMap.mutateAsync({ instanceId, recipeId, slotFills });
  toast.success("Slot updated.");
  onClose();
} catch {
  toast.error("Failed to update slot. Please try again.");
}
```

### Enabled-by-id hook pattern
**Source:** `src/hooks/useSlotResolutionMap.ts` lines 24–36
**Apply to:** `useUnfilledSlotCount`, `useStepSlotIdMap` (both new in same file)
```typescript
return useQuery({
  queryKey: recipeId !== undefined ? KEY(recipeId) : ["key"],
  queryFn: () => recipeId !== undefined ? queryFn(recipeId) : Promise.resolve(fallback),
  enabled: recipeId !== undefined,
});
```

### Data-layer test harness
**Source:** `tests/data-layer/apply-technique.test.ts` + `tests/data-layer/db-helpers.ts`
**Apply to:** `tests/data-layer/recipe-duplication-live-link.test.ts`
```typescript
// @vitest-environment node header
// vi.mock("@/db/client", ...) before import
// createHobbyforgeDb() in beforeEach — runs all migrations
// createDbBridge(db) → vi.mocked(getDb).mockResolvedValue(bridge as never)
// afterEach: db.close()
```

---

## No Analog Found

All 11 files have close analogs. No entries.

---

## Key Pitfalls to Propagate to Plans

1. **`slotMap` in useMemo deps** — every useMemo calling `effectivePaintId(step, slotMap)` must list `slotMap` in deps. TypeScript strict mode will not catch a missing dep.
2. **LEFT JOIN on `recipe_technique_slot_maps`** — `getUnfilledSlotCount` must use LEFT JOIN (not INNER JOIN) or slots with no map row will be invisible.
3. **`step.paint_id` guards in `ChecklistStepRow`** — both the `hasDetail` check (line 38) and the swatch render (line 80) gate on `step.paint_id !== null`. After the parent resolves paint via `effectivePaintId`, both guards must change to `!!paint`.
4. **`useSlotResolutionMap` at component level only** — call once at `AssignmentChecklist` / `PaintingModeView` level, never inside `ChecklistStepRow` / `StepFocalView` (N+1 hook anti-pattern documented in RESEARCH.md).
5. **`SlotReassignMiniDialog` as sibling** — render outside `SheetContent` / `PaintingModeView`'s inner flex tree to avoid Radix portal clipping (P6 pitfall from RESEARCH.md).

---

## Metadata

**Analog search scope:** `src/features/painting-mode/`, `src/features/recipes/`, `src/hooks/`, `src/db/queries/`, `tests/data-layer/`, `tests/painting-mode/`
**Files scanned:** 16 source files + 2 test files
**Pattern extraction date:** 2026-06-22
