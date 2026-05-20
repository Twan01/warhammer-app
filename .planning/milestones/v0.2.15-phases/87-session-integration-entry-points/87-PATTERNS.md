# Phase 87: Session Integration + Entry Points - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/painting-mode/paintingSessionSchema.ts` | config/schema | transform | `src/features/dashboard/logSessionSchema.ts` | exact |
| `src/features/painting-mode/PaintingSessionSheet.tsx` | component | request-response | `src/features/dashboard/LogSessionSheet.tsx` | exact (subset) |
| `src/features/painting-mode/StepFocalView.tsx` | component | request-response | self (extend existing) | exact |
| `src/app/painting-mode/page.tsx` | controller | request-response | self (extend existing) | exact |
| `src/features/dashboard/NextPaintingActionCard.tsx` | component | request-response | self (extend existing) | exact |
| `src/features/dashboard/CurrentFocusCard.tsx` | component | request-response | self (extend existing) | exact |
| `src/features/units/AppliedRecipesTab.tsx` | component | CRUD | self (extend existing) | exact |
| `src/hooks/useKanbanEnrichment.ts` | hook | CRUD | self (extend existing) | exact |
| `src/features/painting-projects/KanbanBoard.tsx` + `KanbanColumn.tsx` + `KanbanCard.tsx` | component | request-response | self (extend existing) | exact |

---

## Pattern Assignments

### `src/features/painting-mode/paintingSessionSchema.ts` [NEW]

**Analog:** `src/features/dashboard/logSessionSchema.ts`

**Full schema pattern** (lines 1–42 of analog):
```typescript
import { z } from "zod";

// NOTE: do NOT use .default() — zodResolver + react-hook-form type inference
// breaks with .default() (same documented pitfall as logSessionSchema.ts).
// Supply defaultValues via buildDefaultValues() in the Sheet component instead.
export const paintingSessionSchema = z.object({
  duration_minutes: z
    .number({ message: "Duration is required" })
    .int()
    .positive("Duration must be greater than 0")
    .max(1440, "Duration cannot exceed 24 hours"),
  notes: z.string().max(2000).nullable(),
});
export type PaintingSessionFormValues = z.infer<typeof paintingSessionSchema>;
```

**Key difference from analog:** Only two fields (`duration_minutes`, `notes`). No unit/recipe/step/date pickers — context is already known from painting mode state. Mirrors the trimmed subset pattern used in other lightweight schemas.

---

### `src/features/painting-mode/PaintingSessionSheet.tsx` [NEW]

**Analog:** `src/features/dashboard/LogSessionSheet.tsx`

**Imports pattern** (derived from analog lines 22–65):
```typescript
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  paintingSessionSchema,
  type PaintingSessionFormValues,
} from "./paintingSessionSchema";
```

**Props interface pattern** (derived from analog lines 66–83):
```typescript
interface PaintingSessionSheetProps {
  open: boolean;
  onClose: () => void;
  // Prefilled display-only context from usePaintingModeState
  unitName: string;
  recipeName: string;
  stepName: string;
  sectionName: string | null;
  // Submission handler — page owns all other context fields
  onSubmit: (duration: number, notes: string | null) => void;
  isPending: boolean;
}

function buildDefaultValues(): PaintingSessionFormValues {
  return {
    duration_minutes: 30,
    notes: null,
  };
}
```

**Form reset on open pattern** (analog lines 121–126):
```typescript
useEffect(() => {
  if (open) {
    form.reset(buildDefaultValues());
  }
}, [open, form]);
```

**Sheet + Form skeleton pattern** (analog lines 238–249):
```typescript
return (
  <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <SheetContent className="overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Log Session</SheetTitle>
        <SheetDescription>
          {/* Read-only prefill display: unitName, recipeName, sectionName, stepName */}
        </SheetDescription>
      </SheetHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
          {/* duration_minutes Input (type="number") */}
          {/* notes textarea */}
          <SheetFooter className="mt-6 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
              Log Session
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  </Sheet>
);
```

**duration_minutes field pattern** (analog lines 477–500):
```typescript
<FormField
  name="duration_minutes"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Duration (minutes)</FormLabel>
      <FormControl>
        <Input
          type="number"
          min={1}
          max={1440}
          {...field}
          value={field.value ?? ""}
          onChange={(e) =>
            field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)
          }
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**notes textarea pattern** (analog lines 502–522):
```typescript
<FormField
  name="notes"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Notes</FormLabel>
      <FormControl>
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Optional notes about this session…"
          {...field}
          value={field.value ?? ""}
          onChange={(e) => field.onChange(e.target.value || null)}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Sibling contract:** Sheet MUST be rendered as a sibling at `PaintingModePage` level (never inside `StepFocalView` or `PaintingModeView`). See `DashboardPage.tsx` lines 490–498 for the exact pattern: `<LogSessionSheet open={logSessionOpen} onClose={...} />` declared after the main content JSX.

---

### `src/features/painting-mode/StepFocalView.tsx` [MODIFY]

**Analog:** self (`src/features/painting-mode/StepFocalView.tsx`)

**Current props interface** (lines 7–21):
```typescript
export interface StepFocalViewProps {
  currentStep: RecipeStep | undefined;
  paint: Paint | undefined;
  stepPhotoUrl: string | undefined;
  isCompleted: boolean;
  onMarkDone: () => void;          // existing — keep as primary action
  goPrev: () => void;
  goNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  currentIndex: number;
  totalSteps: number;
  sectionName: string | null;
  isAllComplete: boolean;
}
```

**Add prop:** `onMarkDoneWithSession: () => void;` — opens the PaintingSessionSheet via page-owned state.

**Current "Mark Done" button** (lines 146–157):
```typescript
{/* 7. Mark Done button */}
<Button
  className="w-full h-12 mt-4"
  disabled={isCompleted || isAllComplete}
  data-testid="mark-done-btn"
  onClick={onMarkDone}
>
  <Check className="h-5 w-5 mr-2" />
  Mark Done
  <kbd className="ml-2 text-[10px] bg-muted px-1 rounded">Space</kbd>
</Button>
```

**New button pair pattern** — replace the single button block with:
```typescript
{/* 7. Action buttons — Mark Done (primary) + Done + Log Session (secondary) */}
<div className="flex flex-col gap-2 mt-4">
  <Button
    className="w-full h-12"
    disabled={isCompleted || isAllComplete}
    data-testid="mark-done-btn"
    onClick={onMarkDone}
  >
    <Check className="h-5 w-5 mr-2" />
    Mark Done
    <kbd className="ml-2 text-[10px] bg-muted px-1 rounded">Space</kbd>
  </Button>
  <Button
    variant="outline"
    className="w-full"
    disabled={isCompleted || isAllComplete}
    data-testid="mark-done-with-session-btn"
    onClick={onMarkDoneWithSession}
  >
    Done + Log Session
  </Button>
</div>
```

---

### `src/app/painting-mode/page.tsx` [MODIFY]

**Analog:** self (`src/app/painting-mode/page.tsx`)

**Current imports** (lines 1–11):
```typescript
import { useParams, useNavigate } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { useRecipeAssignment, useCompleteStep } from "@/hooks/useRecipeAssignments";
import { usePaintingModeState } from "@/hooks/usePaintingModeState";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import { todayISO } from "@/lib/dates";
import { Skeleton } from "@/components/ui/skeleton";
import { PaintingModeView } from "@/features/painting-mode/PaintingModeView";
```

**Add imports:**
```typescript
import { useState } from "react";
import { PaintingSessionSheet } from "@/features/painting-mode/PaintingSessionSheet";
```

**Current handleMarkDone** (lines 49–70):
```typescript
const handleMarkDone = () => {
  if (!currentStep || !assignment) return;
  completeMutation.mutate(
    {
      assignmentId,
      unitId,
      recipeStepId: currentStep.id,
      session: {
        unit_id: unitId,
        session_date: todayISO(),
        duration_minutes: 0,
        recipe_id: recipeId,
        recipe_step_id: currentStep.id,
        section_name: sectionName,
        recipe_section_id: currentStep.section_id ?? null,
      },
    },
    {
      onSuccess: () => state.goNext(),
    },
  );
};
```

**Add sheet state + new handler** (add after `handleMarkDone`):
```typescript
const [paintingSessionOpen, setPaintingSessionOpen] = useState(false);

const handleMarkDoneWithSession = (duration: number, notes: string | null) => {
  if (!currentStep || !assignment) return;
  completeMutation.mutate(
    {
      assignmentId,
      unitId,
      recipeStepId: currentStep.id,
      session: {
        unit_id: unitId,
        session_date: todayISO(),
        duration_minutes: duration,
        notes: notes ?? null,
        recipe_id: recipeId,
        recipe_step_id: currentStep.id,
        section_name: sectionName,
        recipe_section_id: currentStep.section_id ?? null,
      },
    },
    {
      onSuccess: () => {
        setPaintingSessionOpen(false);
        state.goNext();
      },
    },
  );
};
```

**Current return JSX** (lines 104–113):
```typescript
return (
  <div className="h-screen flex flex-col bg-background text-foreground">
    <PaintingModeView
      state={state}
      onMarkDone={handleMarkDone}
      recipeId={assignment.recipe_id}
      isMutating={completeMutation.isPending}
    />
  </div>
);
```

**Modified return JSX** — add `onMarkDoneWithSession` prop and sibling sheet:
```typescript
return (
  <>
    <div className="h-screen flex flex-col bg-background text-foreground">
      <PaintingModeView
        state={state}
        onMarkDone={handleMarkDone}
        onMarkDoneWithSession={() => setPaintingSessionOpen(true)}
        recipeId={assignment.recipe_id}
        isMutating={completeMutation.isPending}
      />
    </div>
    {/* Sibling sheet — never nested inside PaintingModeView (pitfall) */}
    <PaintingSessionSheet
      open={paintingSessionOpen}
      onClose={() => setPaintingSessionOpen(false)}
      unitName={/* from assignment data */}
      recipeName={/* from recipe query */}
      stepName={currentStep?.step_name ?? ""}
      sectionName={sectionName}
      onSubmit={handleMarkDoneWithSession}
      isPending={completeMutation.isPending}
    />
  </>
);
```

**Note:** `PaintingModeView` passes `onMarkDoneWithSession` straight through to `StepFocalView` — same prop-threading pattern as `onMarkDone` today.

---

### `src/features/dashboard/NextPaintingActionCard.tsx` [MODIFY]

**Analog:** self (`src/features/dashboard/NextPaintingActionCard.tsx`)

**Current Link** (lines 64–68):
```typescript
<Link
  to="/painting-projects"
  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
>
  Go to recipe
</Link>
```

**Replacement** — `data.assignment_id` is already on `FirstIncompleteStep` (confirmed: `recipeAssignments.ts` line 10). Always wrap in `String()` for the params object:
```typescript
<Link
  to="/bare-layout/painting-mode/$assignmentId"
  params={{ assignmentId: String(data.assignment_id) }}
  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
>
  Start Painting
</Link>
```

---

### `src/features/dashboard/CurrentFocusCard.tsx` [MODIFY]

**Analog:** self (`src/features/dashboard/CurrentFocusCard.tsx`)

**Current props interface** (lines 25–35):
```typescript
export interface CurrentFocusCardProps {
  unit: Unit | null;
  faction: Faction | undefined;
  photo: UnitPhotoWithUrl | undefined;
  onOpen: () => void;
  onLog: () => void;
  recipeName?: string | null;
  extraRecipeCount?: number;
  workflowPosition?: WorkflowPosition | null;
  appliedProgress?: AppliedRecipeProgress | null;
}
```

**Add optional prop:** `onPaint?: () => void;`

**Current button block** (lines 117–126):
```typescript
<div className="flex flex-col gap-1.5 shrink-0">
  <Button variant="ghost" size="sm" onClick={onOpen}>
    <ExternalLink size={14} className="mr-1.5" aria-hidden={true} />
    Open
  </Button>
  <Button variant="ghost" size="sm" onClick={onLog}>
    <Paintbrush size={14} className="mr-1.5" aria-hidden={true} />
    Log
  </Button>
</div>
```

**Modified button block** — add Paint button conditionally per D-14:
```typescript
<div className="flex flex-col gap-1.5 shrink-0">
  <Button variant="ghost" size="sm" onClick={onOpen}>
    <ExternalLink size={14} className="mr-1.5" aria-hidden={true} />
    Open
  </Button>
  <Button variant="ghost" size="sm" onClick={onLog}>
    <Paintbrush size={14} className="mr-1.5" aria-hidden={true} />
    Log
  </Button>
  {onPaint && (
    <Button variant="ghost" size="sm" onClick={onPaint} data-testid="paint-btn">
      <Palette size={14} className="mr-1.5" aria-hidden={true} />
      Paint
    </Button>
  )}
</div>
```

**In DashboardPage.tsx** — `primaryAssignment` already computed at line 104–106. Wire `onPaint` only when assignment exists (D-14):
```typescript
// In DashboardPage populated state, CurrentFocusCard usage (line 351):
onPaint={primaryAssignment !== undefined
  ? () => navigate({
      to: "/bare-layout/painting-mode/$assignmentId",
      params: { assignmentId: String(primaryAssignment.id) },
    })
  : undefined
}
```

**Note:** `useNavigate` is already imported by `DashboardPage.tsx` — confirmed via `useNavigate` usage for other navigation.

---

### `src/features/units/AppliedRecipesTab.tsx` [MODIFY]

**Analog:** self (`src/features/units/AppliedRecipesTab.tsx`)

**Add import:**
```typescript
import { useNavigate } from "@tanstack/react-router";
```

**Add navigate call inside component:**
```typescript
const navigate = useNavigate();
```

**Current assignment row header** (lines 61–80):
```typescript
<div className="flex items-center justify-between">
  <span className="text-sm font-medium">
    {recipe?.name ?? "Unknown recipe"}
  </span>
  <Button
    variant="ghost"
    size="icon"
    onClick={() => handleDelete(assignment)}
    aria-label={`Remove ${recipe?.name ?? "recipe"}`}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

**Modified assignment row header** — add Paint button per row (D-14: assignment.id always exists here):
```typescript
<div className="flex items-center justify-between gap-2">
  <span className="text-sm font-medium flex-1 min-w-0 truncate">
    {recipe?.name ?? "Unknown recipe"}
  </span>
  <Button
    variant="outline"
    size="sm"
    onClick={() =>
      navigate({
        to: "/bare-layout/painting-mode/$assignmentId",
        params: { assignmentId: String(assignment.id) },
      })
    }
    data-testid={`paint-btn-${assignment.id}`}
  >
    Paint
  </Button>
  <Button
    variant="ghost"
    size="icon"
    onClick={() => handleDelete(assignment)}
    aria-label={`Remove ${recipe?.name ?? "recipe"}`}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

---

### `src/hooks/useKanbanEnrichment.ts` [MODIFY]

**Analog:** self (`src/hooks/useKanbanEnrichment.ts`)

**Current KanbanEnrichment interface** (lines 14–18):
```typescript
export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
  appliedProgress: Map<number, AppliedRecipeProgress>;
}
```

**Modified interface** — add `assignmentIds` map (unit_id → primary assignment id):
```typescript
export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
  appliedProgress: Map<number, AppliedRecipeProgress>;
  assignmentIds: Map<number, number>;  // unit_id → primary assignment.id
}
```

**Current queryFn inner loop** (lines 35–51) — `primary.id` is already fetched:
```typescript
sortedIds.map(async (unitId) => {
  const assignments = await getAssignmentsByUnit(unitId);
  if (assignments.length === 0) return;
  const primary = assignments[assignments.length - 1];
  const [steps, progressRows, recipe] = await Promise.all([...]);
  const progress = computeAssignmentProgress(steps, progressRows);
  appliedProgressMap.set(unitId, { ... });
})
```

**Modified loop** — record assignment ID at zero extra cost (primary already in scope):
```typescript
const assignmentIdsMap = new Map<number, number>();

// Inside the map callback, after appliedProgressMap.set():
assignmentIdsMap.set(unitId, primary.id);
```

**Modified return** (currently lines 53–58):
```typescript
return {
  recipeNames: new Map(recipeRows.map((r) => [r.unit_id, r.name])),
  photoCounts: new Map(photoRows.map((r) => [r.entity_id, r.photo_count])),
  appliedProgress: appliedProgressMap,
  assignmentIds: assignmentIdsMap,   // new field
};
```

---

### `KanbanColumn.tsx` + `KanbanCard.tsx` [MODIFY] (Kanban entry point chain)

**Analogs:** `src/features/painting-projects/KanbanColumn.tsx` and `src/features/painting-projects/KanbanCard.tsx`

**KanbanColumn** — thread `assignmentIds` map through to KanbanCard (same pattern as `enrichment?.appliedProgress?.get(u.id)` at line 65):

Current props interface (lines 11–19):
```typescript
export interface KanbanColumnProps {
  status: PaintingStatus;
  units: Unit[];
  factionMap: Map<number, Faction>;
  onRemoveFromBoard: (unit: Unit) => void;
  onEditUnit: (unit: Unit) => void;
  onLogSession: (unitId: number) => void;
  enrichment?: KanbanEnrichment;
  workflowPositions?: Map<number, WorkflowPosition>;
}
```

No new prop needed — `assignmentIds` is part of `KanbanEnrichment`. Pass it to KanbanCard:
```typescript
// In KanbanColumn's cards render (after appliedProgress):
assignmentId={enrichment?.assignmentIds?.get(u.id)}
```

**KanbanCard** — add `assignmentId` optional prop and Paint button (D-14 guard):

Add to `KanbanCardProps` interface (after `appliedProgress`):
```typescript
assignmentId?: number;
```

Add import:
```typescript
import { useNavigate } from "@tanstack/react-router";
```

**IMPORTANT:** Per RESEARCH.md anti-pattern, do NOT call `useNavigate` directly in KanbanCard (it is inside a DnD sortable context). Instead pass an `onPaint` callback from KanbanBoard/KanbanColumn:

```typescript
// Preferred pattern (matching existing onLogSession callback style):
// In KanbanCardProps:
onPaint?: (assignmentId: number) => void;

// In KanbanCard JSX (D-14: only render when assignmentId defined):
{onPaint && assignmentId !== undefined && (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onPaint(assignmentId); }}
    aria-label={`Open painting mode for ${unit.name}`}
    title="Paint"
    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  >
    <Palette size={14} />
  </button>
)}
```

**In KanbanBoard.tsx** — add `onPaint` handler using `useNavigate` (same level as `onLogSession` at line 34):
```typescript
// useNavigate already used at painting mode page; replicate here:
const navigate = useNavigate();

function handlePaint(assignmentId: number) {
  navigate({
    to: "/bare-layout/painting-mode/$assignmentId",
    params: { assignmentId: String(assignmentId) },
  });
}
```

Thread `onPaint={handlePaint}` through KanbanColumn → KanbanCard.

---

### `src/features/recipes/RecipeDetailSheet.tsx` [MODIFY]

**Analog:** self (`src/features/recipes/RecipeDetailSheet.tsx`)

**`useNavigate` already imported** (line 3). `unitMap` already built (lines 84–88). `useAssignmentsByRecipe` already exported from `useRecipeAssignments.ts` (verified: line 48).

**Add import:**
```typescript
import { useAssignmentsByRecipe } from "@/hooks/useRecipeAssignments";
```

**Add query** (after existing `useSessionsByRecipe` call at line 82, same pattern as all other conditional queries in this file):
```typescript
const { data: assignments = [] } = useAssignmentsByRecipe(recipe?.id);
// hook has enabled: recipeId !== undefined guard — safe to pass recipe?.id directly
```

**Add "Applied to units" field** in the `<div className="flex flex-col gap-4 p-4">` section, after the Sessions field:
```typescript
{assignments.length > 0 && (
  <Field label="Applied to Units">
    <div className="flex flex-col gap-2">
      {assignments.map((a) => (
        <div key={a.id} className="flex items-center justify-between">
          <span className="text-sm">{unitMap.get(a.unit_id) ?? "Unknown unit"}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate({
                to: "/bare-layout/painting-mode/$assignmentId",
                params: { assignmentId: String(a.id) },
              })
            }
            data-testid={`paint-unit-btn-${a.id}`}
          >
            Paint
          </Button>
        </div>
      ))}
    </div>
  </Field>
)}
```

---

## Shared Patterns

### TanStack Router Navigation
**Source:** `src/features/recipes/RecipeDetailSheet.tsx` lines 3, 182, 241–245 (already uses `useNavigate`)
**Apply to:** `AppliedRecipesTab.tsx`, `KanbanBoard.tsx`, `RecipeDetailSheet.tsx`, `DashboardPage.tsx`

```typescript
import { useNavigate } from "@tanstack/react-router";
// ...
const navigate = useNavigate();
navigate({
  to: "/bare-layout/painting-mode/$assignmentId",
  params: { assignmentId: String(assignmentId) },  // always String()
});
```

**Link variant** for static cards (`NextPaintingActionCard.tsx`):
```typescript
import { Link } from "@tanstack/react-router";
<Link
  to="/bare-layout/painting-mode/$assignmentId"
  params={{ assignmentId: String(data.assignment_id) }}
>
  Start Painting
</Link>
```

### Sibling Sheet Contract
**Source:** `src/features/dashboard/DashboardPage.tsx` lines 490–498
**Apply to:** `src/app/painting-mode/page.tsx`
```typescript
// Sheet declared AFTER main content JSX, never nested inside view components
<LogSessionSheet
  open={logSessionOpen}
  onClose={() => {
    setLogSessionOpen(false);
    setLogDefaultUnitId(undefined);
  }}
  defaultUnitId={logDefaultUnitId}
/>
```

### Conditional CTA Guard (D-14)
**Source:** `src/features/dashboard/CurrentFocusCard.tsx` lines 117–130 (`onLog` and `onOpen` callback props)
**Apply to:** All entry point CTAs
```typescript
// Only render Paint action when assignment exists:
{onPaint && (
  <Button variant="ghost" size="sm" onClick={onPaint}>Paint</Button>
)}
// Or for inline checks:
{assignmentId !== undefined && <PaintButton assignmentId={assignmentId} />}
```

### React Query Conditional Enable Pattern
**Source:** `src/hooks/useRecipeAssignments.ts` lines 48–53
**Apply to:** `RecipeDetailSheet.tsx` `useAssignmentsByRecipe` call
```typescript
// Hook already guards: enabled: recipeId !== undefined
// Pass recipe?.id directly — undefined when sheet closed:
const { data: assignments = [] } = useAssignmentsByRecipe(recipe?.id);
```

### Toast + Error Handling
**Source:** `src/features/dashboard/LogSessionSheet.tsx` lines 183–186
**Apply to:** `PaintingSessionSheet.tsx` onSubmit (though mutation error is handled in `useCompleteStep` onSuccess/onError at the page level)
```typescript
// Page-level pattern from PaintingModePage — errors surface via mutation state,
// not explicit toast in sheet. Keep sheet's onSubmit thin:
function onSubmit(values: PaintingSessionFormValues) {
  props.onSubmit(values.duration_minutes, values.notes ?? null);
}
```

---

## No Analog Found

All files have clear analogs in the codebase. No entries needed here.

---

## Metadata

**Analog search scope:** `src/features/painting-mode/`, `src/features/dashboard/`, `src/features/units/`, `src/features/painting-projects/`, `src/features/recipes/`, `src/hooks/`, `src/app/painting-mode/`
**Files scanned:** 13 source files read directly
**Pattern extraction date:** 2026-05-19
