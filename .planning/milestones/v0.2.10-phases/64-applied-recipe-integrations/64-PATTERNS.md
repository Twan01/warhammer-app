# Phase 64: Applied Recipe Integrations - Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 6 modified files
**Analogs found:** 6 / 6

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/features/dashboard/LogSessionSheet.tsx` | component/form | request-response | self (same file, existing partial-failure pattern) | exact |
| `src/features/dashboard/CurrentFocusCard.tsx` | component | request-response | self (same file, existing `recipeName`/`extraRecipeCount` props) | exact |
| `src/features/dashboard/DashboardPage.tsx` | page | request-response | self (same file, existing `focusRecipes` query pattern) | exact |
| `src/features/painting-projects/KanbanCard.tsx` | component | request-response | `src/features/dashboard/CurrentFocusCard.tsx` | role-match |
| `src/features/painting-projects/KanbanColumn.tsx` | component | request-response | self (same file, existing `enrichment`/`workflowPositions` pass-through) | exact |
| `src/hooks/useKanbanEnrichment.ts` | hook | CRUD/batch | self (same file, existing Promise.all batch pattern) | exact |

---

## Pattern Assignments

### `src/features/dashboard/LogSessionSheet.tsx` (AR-05 bridge)

**Analog:** Same file — existing partial-failure status update block (lines 182–196)

**Existing partial-failure pattern** (lines 182–196):
```typescript
if (values.new_status) {
  try {
    await updateUnit.mutateAsync({
      id: values.unit_id,
      status_painting: values.new_status,
    });
  } catch {
    toast.warning("Session logged but status update failed.");
    onClose();
    return;
  }
}
toast.success(values.new_status ? "Session logged and status updated." : "Session logged.");
onClose();
```

**Existing watch + conditional hook pattern** (lines 131–135):
```typescript
const watchedRecipeId = form.watch("recipe_id");

const { data: recipeSteps = [] } = useRecipePaints(
  watchedRecipeId != null ? watchedRecipeId : undefined
);
```

**Bridge insertion point:** After `createSession.mutateAsync()` succeeds (line 181) and before the status update block (line 182).

**New hooks to add at component level** (mirror the `watchedRecipeId` / `useRecipePaints` pattern):
```typescript
// Add alongside watchedRecipeId (line 131)
const watchedUnitId = form.watch("unit_id");
const { data: unitAssignments = [] } = useAssignmentsByUnit(
  watchedUnitId > 0 ? watchedUnitId : undefined
);
const createAssignment = useCreateAssignment();
const toggleStepProgress = useToggleStepProgress();
```

**New imports to add** (mirror existing import style, lines 51–62):
```typescript
import {
  useAssignmentsByUnit,
  useCreateAssignment,
  useToggleStepProgress,
  ASSIGNMENTS_KEY,
} from "@/hooks/useRecipeAssignments";
```

**AR-05 bridge block** (insert at line 182, before `if (values.new_status)`):
```typescript
if (values.recipe_id != null && values.recipe_step_id != null) {
  try {
    const step = recipeSteps.find((s) => s.id === values.recipe_step_id);
    if (step) {
      let assignment = unitAssignments.find((a) => a.recipe_id === values.recipe_id);
      if (!assignment) {
        // D-02: auto-create assignment, then mark step
        const newId = await createAssignment.mutateAsync({
          unit_id: values.unit_id,
          recipe_id: values.recipe_id,
        });
        await toggleStepProgress.mutateAsync({
          assignmentId: newId,
          orderIndex: step.order_index,
          completed: true,
        });
      } else {
        await toggleStepProgress.mutateAsync({
          assignmentId: assignment.id,
          orderIndex: step.order_index,
          completed: true,
        });
      }
      // Pitfall 4: broad invalidation so Kanban + CurrentFocusCard pick up new progress
      qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
    }
  } catch {
    toast.warning("Session logged but step progress update failed.");
    onClose();
    return;
  }
}
```

**Critical notes:**
- `recipeSteps` is already in scope (line 133); use `step.order_index`, NOT `values.recipe_step_id` as the orderIndex argument (Pitfall 2 in RESEARCH.md).
- `useAssignmentsByUnit` must be called at component level — NOT inside `onSubmit` (Pitfall 1 in RESEARCH.md). Access `unitAssignments` via closure.
- `qc` (`useQueryClient()`) is NOT currently in LogSessionSheet — add it alongside other hook calls.
- Guard: `watchedUnitId > 0 ? watchedUnitId : undefined` matches `useAssignmentsByUnit`'s `enabled: unitId !== undefined` contract.

---

### `src/types/recipeAssignment.ts` (new `AppliedRecipeProgress` type)

**Analog:** Existing types in same file (lines 9–38)

**Existing type pattern** (lines 9–14 and 22–27):
```typescript
export interface RecipeAssignment {
  id: number;
  unit_id: number;
  recipe_id: number;
  created_at: string;
}

export interface StepProgress {
  id: number;
  assignment_id: number;
  order_index: number;
  completed: number;   // 0 | 1 SQLite boolean
  completed_at: string | null;
}
```

**New type to append** (no edits to existing lines — append after line 38):
```typescript
/**
 * Derived progress summary for display on Kanban cards and CurrentFocusCard.
 * Computed by parent components from useAssignmentsByUnit + useStepProgress
 * + computeAssignmentProgress. Never fetched directly — always derived.
 */
export interface AppliedRecipeProgress {
  recipeName: string;
  completed: number;
  total: number;
  /** Total number of assignments for this unit (for "+N more" suffix, D-08). */
  assignmentCount: number;
}
```

---

### `src/features/dashboard/CurrentFocusCard.tsx` (AR-06 display)

**Analog:** Same file — existing `recipeName` / `extraRecipeCount` / `workflowPosition` prop pattern (lines 24–33, 69–92)

**Existing props interface** (lines 24–33):
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
}
```

**Existing progressive-display pattern** (lines 69–92) — `recipeName` renders only when present, `workflowPosition` renders below it:
```typescript
{recipeName && (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Palette size={12} aria-hidden />
    {recipeName}{extraRecipeCount > 0 ? ` (+${extraRecipeCount} more)` : ""}
  </span>
)}
{workflowPosition && (
  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
    <Layers size={12} aria-hidden className="shrink-0" />
    {/* ... workflowPosition render ... */}
  </span>
)}
```

**New import to add** (alongside existing type imports, line 22–23):
```typescript
import type { AppliedRecipeProgress } from "@/types/recipeAssignment";
```

**Updated props interface** — add `appliedProgress` after `workflowPosition`:
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
  appliedProgress?: AppliedRecipeProgress | null;  // NEW — D-05/D-06/D-09
}
```

**Updated render** — `appliedProgress` supersedes `workflowPosition` when present (D-05); both sit below the `recipeName` line (D-07, painting_percentage bar unchanged):
```typescript
{appliedProgress ? (
  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
    <Layers size={12} aria-hidden className="shrink-0" />
    {appliedProgress.recipeName}: {appliedProgress.completed}/{appliedProgress.total} steps
    {appliedProgress.assignmentCount > 1
      ? ` (+${appliedProgress.assignmentCount - 1} more)`
      : ""}
  </span>
) : workflowPosition ? (
  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
    <Layers size={12} aria-hidden className="shrink-0" />
    {/* ... existing workflowPosition render unchanged ... */}
  </span>
) : null}
```

**Note:** The `Layers` icon is already imported (line 17). Use the same icon + className for visual consistency with the existing `workflowPosition` block.

---

### `src/features/dashboard/DashboardPage.tsx` (AR-06 data fetch + prop wiring)

**Analog:** Same file — existing `focusRecipes` / `focusWorkflowPositions` query pattern (lines 83–91)

**Existing focused-unit query pattern** (lines 83–91):
```typescript
const focusUnitId = stats?.activeProjects?.[0]?.id ?? null;
const { data: focusRecipes } = useQuery({
  queryKey: ["recipes", "by-unit", focusUnitId ?? 0],
  queryFn: () => getRecipeNamesByUnitIds([focusUnitId!]),
  enabled: focusUnitId !== null,
});
const { data: focusWorkflowPositions } = useWorkflowPositions(
  focusUnitId !== null ? [focusUnitId] : [],
);
```

**Existing prop-passing to CurrentFocusCard** (lines 329–332):
```typescript
recipeName={focusRecipes?.[0]?.name ?? null}
extraRecipeCount={Math.max(0, (focusRecipes?.length ?? 0) - 1)}
workflowPosition={focusWorkflowPositions?.get(focusUnit?.id ?? -1)}
```

**New imports to add** (alongside existing imports, lines 31–32):
```typescript
import {
  useAssignmentsByUnit,
  useStepProgress,
} from "@/hooks/useRecipeAssignments";
import { computeAssignmentProgress } from "@/lib/computeAssignmentProgress";
import type { AppliedRecipeProgress } from "@/types/recipeAssignment";
```

**New hooks at page level** (add immediately after `focusWorkflowPositions` block, ~line 91):
```typescript
// AR-06 — applied recipe progress for CurrentFocusCard (D-10)
const { data: focusAssignments = [] } = useAssignmentsByUnit(
  focusUnitId ?? undefined
);
// Pick primary assignment: most recently created (last item — see A1 in RESEARCH.md)
const primaryAssignment = focusAssignments.length > 0
  ? focusAssignments[focusAssignments.length - 1]
  : undefined;
const { data: focusStepProgress = [] } = useStepProgress(primaryAssignment?.id);
// focusRecipeSteps needed for computeAssignmentProgress — fetch from recipe
// (reuse focusRecipes to find the recipe_id, then call useRecipePaints)
```

**`focusAppliedProgress` derivation** (use `useMemo` pattern matching `allDisplayedUnits` on line 101):
```typescript
// NOTE: requires focusRecipeSteps from useRecipePaints(primaryAssignment?.recipe_id)
const focusAppliedProgress = useMemo<AppliedRecipeProgress | null>(() => {
  if (!primaryAssignment || focusRecipeSteps.length === 0) return null;
  const progress = computeAssignmentProgress(focusRecipeSteps, focusStepProgress);
  // recipeName: look up from focusRecipes or a recipe query by primaryAssignment.recipe_id
  const recipeName = focusRecipes?.find((r) => /* match by recipe_id */ true)?.name ?? "";
  return {
    recipeName,
    completed: progress.completed,
    total: progress.total,
    assignmentCount: focusAssignments.length,
  };
}, [primaryAssignment, focusRecipeSteps, focusStepProgress, focusRecipes, focusAssignments]);
```

**Updated CurrentFocusCard prop** (line ~332, add after `workflowPosition`):
```typescript
appliedProgress={focusAppliedProgress}
```

**Implementation note on recipe name (Open Question from RESEARCH.md):** `getRecipeNamesByUnitIds` returns the recipe associated with the unit, not specifically the one in `primaryAssignment.recipe_id`. If a unit has multiple recipes, these may differ. The safest approach: add `useRecipes()` lookup by `primaryAssignment?.recipe_id` or use the existing `focusRecipes` array and match by recipe id. The planner should decide this concretely; the pattern for the lookup is the existing `factionById` helper on line 259:
```typescript
const factionById = (id: number) => stats.factions.find((f) => f.id === id);
```

---

### `src/features/painting-projects/KanbanCard.tsx` (AR-06 display)

**Analog:** `src/features/dashboard/CurrentFocusCard.tsx` — same progressive-display pattern for `appliedProgress`

**Existing `workflowPosition` render block** (lines 112–129):
```typescript
{workflowPosition ? (
  <p className="mt-1 truncate text-xs italic text-muted-foreground/70">
    {"→"}{" "}
    {workflowPosition.isComplete
      ? "Complete"
      : workflowPosition.sectionName
        ? workflowPosition.nextStepName
          ? `${workflowPosition.sectionName}: ${workflowPosition.nextStepName}`
          : workflowPosition.sectionName
        : workflowPosition.stepIndex !== null
          ? `step ${workflowPosition.stepIndex + 1}/${workflowPosition.totalSteps}`
          : ""}
  </p>
) : unit.status_painting !== "Completed" ? (
  <p className="mt-1 text-xs italic text-muted-foreground/70">
    {"→"} {getNextActionHint(unit.status_painting)}
  </p>
) : null}
```

**Existing props interface** (lines 26–35):
```typescript
export interface KanbanCardProps {
  unit: Unit;
  faction: Faction | undefined;
  onRemoveFromBoard: (unit: Unit) => void;
  onEditUnit: (unit: Unit) => void;
  onLogSession: (unitId: number) => void;
  recipeName?: string;
  photoCount?: number;
  workflowPosition?: WorkflowPosition | null;
}
```

**New import to add** (alongside existing type imports, lines 8–10):
```typescript
import type { AppliedRecipeProgress } from "@/types/recipeAssignment";
```

**Updated props interface** — add `appliedProgress` after `workflowPosition`:
```typescript
export interface KanbanCardProps {
  unit: Unit;
  faction: Faction | undefined;
  onRemoveFromBoard: (unit: Unit) => void;
  onEditUnit: (unit: Unit) => void;
  onLogSession: (unitId: number) => void;
  recipeName?: string;
  photoCount?: number;
  workflowPosition?: WorkflowPosition | null;
  appliedProgress?: AppliedRecipeProgress | null;  // NEW — D-05/D-06
}
```

**Updated render** — replace the `workflowPosition` block (lines 112–129) with the superseding conditional (D-05):
```typescript
{appliedProgress ? (
  <p className="mt-1 truncate text-xs text-muted-foreground/70">
    {appliedProgress.recipeName}: {appliedProgress.completed}/{appliedProgress.total} steps
    {appliedProgress.assignmentCount > 1
      ? ` (+${appliedProgress.assignmentCount - 1} more)`
      : ""}
  </p>
) : workflowPosition ? (
  <p className="mt-1 truncate text-xs italic text-muted-foreground/70">
    {"→"}{" "}
    {/* ... existing workflowPosition render unchanged ... */}
  </p>
) : unit.status_painting !== "Completed" ? (
  <p className="mt-1 text-xs italic text-muted-foreground/70">
    {"→"} {getNextActionHint(unit.status_painting)}
  </p>
) : null}
```

---

### `src/features/painting-projects/KanbanColumn.tsx` (AR-06 pass-through)

**Analog:** Same file — existing `enrichment` / `workflowPositions` pass-through pattern (lines 11–19, 62–65)

**Existing props interface** (lines 11–19):
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

**Existing pass-through to KanbanCard** (lines 62–65):
```typescript
recipeName={enrichment?.recipeNames.get(u.id)}
photoCount={enrichment?.photoCounts.get(u.id)}
workflowPosition={workflowPositions?.get(u.id)}
```

**Change:** `appliedProgress` is sourced from `enrichment` (the KanbanEnrichment object is extended — see hook below). No new prop needed on KanbanColumn — extend `KanbanEnrichment` type and read from `enrichment?.appliedProgress.get(u.id)`.

**Updated pass-through line** (add after `workflowPosition` line):
```typescript
appliedProgress={enrichment?.appliedProgress?.get(u.id)}
```

**Import change needed** — `KanbanEnrichment` import at line 7 will cover the new field once the type is extended in the hook file:
```typescript
import type { KanbanEnrichment } from "@/hooks/useKanbanEnrichment";
```

---

### `src/hooks/useKanbanEnrichment.ts` (AR-06 batch fetch)

**Analog:** Same file — existing `Promise.all` batch pattern (lines 10–35)

**Existing type + hook** (lines 10–35):
```typescript
export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
}

export const KANBAN_ENRICHMENT_KEY = (unitIds: number[]) =>
  ["kanban-enrichment", ...unitIds] as const;

export function useKanbanEnrichment(unitIds: number[]) {
  const sortedIds = [...unitIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: KANBAN_ENRICHMENT_KEY(sortedIds),
    queryFn: async (): Promise<KanbanEnrichment> => {
      const [recipeRows, photoRows] = await Promise.all([
        getRecipeNamesByUnitIds(sortedIds),
        getPhotoCountsByUnitIds(sortedIds),
      ]);
      return {
        recipeNames: new Map(recipeRows.map((r) => [r.unit_id, r.name])),
        photoCounts: new Map(photoRows.map((r) => [r.entity_id, r.photo_count])),
      };
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
```

**New imports to add** (alongside existing imports at lines 1–8):
```typescript
import { getAssignmentsByUnit, getStepProgress } from "@/db/queries/recipeAssignments";
import { getRecipePaintsByRecipe } from "@/db/queries/recipePaints";  // or equivalent
import { computeAssignmentProgress } from "@/lib/computeAssignmentProgress";
import type { AppliedRecipeProgress } from "@/types/recipeAssignment";
```

**Updated `KanbanEnrichment` type** (extend existing, lines 10–13):
```typescript
export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
  appliedProgress: Map<number, AppliedRecipeProgress>;  // NEW — D-11
}
```

**Extended `queryFn`** — loop over `sortedIds` after the existing `Promise.all` (Option A from RESEARCH.md — simple sequential loop, sufficient for 5–20 Kanban units):
```typescript
queryFn: async (): Promise<KanbanEnrichment> => {
  const [recipeRows, photoRows] = await Promise.all([
    getRecipeNamesByUnitIds(sortedIds),
    getPhotoCountsByUnitIds(sortedIds),
  ]);

  // AR-06: batch-fetch assignment progress for all active units
  const appliedProgressMap = new Map<number, AppliedRecipeProgress>();
  await Promise.all(
    sortedIds.map(async (unitId) => {
      const assignments = await getAssignmentsByUnit(unitId);
      if (assignments.length === 0) return;
      // D-08: most recently created = last item (getAssignmentsByUnit orders by created_at ASC)
      const primary = assignments[assignments.length - 1];
      const [steps, progressRows] = await Promise.all([
        getRecipePaintsByRecipe(primary.recipe_id),
        getStepProgress(primary.id),
      ]);
      const progress = computeAssignmentProgress(steps, progressRows);
      // Recipe name: look up from recipeRows (matched by primary.recipe_id — see A3 in RESEARCH.md)
      // Fallback: use recipeRows by unit_id if A3 holds; otherwise a separate lookup is needed
      const recipeName = recipeRows.find((r) => r.unit_id === unitId)?.name ?? "";
      appliedProgressMap.set(unitId, {
        recipeName,
        completed: progress.completed,
        total: progress.total,
        assignmentCount: assignments.length,
      });
    })
  );

  return {
    recipeNames: new Map(recipeRows.map((r) => [r.unit_id, r.name])),
    photoCounts: new Map(photoRows.map((r) => [r.entity_id, r.photo_count])),
    appliedProgress: appliedProgressMap,
  };
},
```

**Implementation note on A3 (RESEARCH.md):** If `recipeRows` (from `getRecipeNamesByUnitIds`) returns the recipe directly associated with the unit and that matches `primary.recipe_id`, the `recipeRows` lookup works. If not — a unit has multiple recipes and the primary assignment references a different one — a separate `getRecipeById(primary.recipe_id)` query is needed. The planner should verify `getRecipeNamesByUnitIds` query structure against `primary.recipe_id` before choosing the lookup strategy.

**`getRecipePaintsByRecipe` function name:** Verify the exact export name in `src/db/queries/recipePaints.ts` (or equivalent). The CONTEXT.md references `useRecipePaints` hook which wraps the DB query; look up the underlying query function name before using it in the hook's `queryFn`.

---

## Shared Patterns

### Partial-Failure Fire-and-Forget
**Source:** `src/features/dashboard/LogSessionSheet.tsx` lines 182–196
**Apply to:** AR-05 bridge block in LogSessionSheet
```typescript
try {
  await secondaryMutation.mutateAsync({ ... });
} catch {
  toast.warning("Session logged but [secondary action] failed.");
  onClose();
  return;
}
```
Primary action (`createSession`) must always succeed first and is never rolled back. Secondary side-effects (step progress, status update) fail independently with a warning toast.

### Optional Prop Progressive Enhancement
**Source:** `src/features/dashboard/CurrentFocusCard.tsx` lines 30–32 and 69–73
**Apply to:** `appliedProgress` prop on CurrentFocusCard and KanbanCard
```typescript
// Prop is optional with null fallback — units without assignments
// keep existing display unchanged (workflowPosition or getNextActionHint)
appliedProgress?: AppliedRecipeProgress | null;
```
When the prop is absent or null, fall through to the next display tier. Never crash on missing data.

### Batch Enrichment via Map
**Source:** `src/hooks/useKanbanEnrichment.ts` lines 15–35
**Apply to:** `appliedProgress` field in `KanbanEnrichment`
```typescript
// Stable query key (sorted IDs prevent re-fetch on DnD reorder)
export const KANBAN_ENRICHMENT_KEY = (unitIds: number[]) =>
  ["kanban-enrichment", ...unitIds] as const;

// Promise.all for independent parallel fetches; sequential loop for per-unit fetches
const sortedIds = [...unitIds].sort((a, b) => a - b);
```
Parent batch-fetches, returns `Map<unitId, Data>`, passes via `enrichment` prop chain. Never call per-unit hooks inside card components.

### Cache Invalidation After Step Progress
**Source:** `src/hooks/useRecipeAssignments.ts` lines 17–26, 97–99
**Apply to:** AR-05 bridge in LogSessionSheet after successful `toggleStepProgress`
```typescript
// STEP_PROGRESS_KEY invalidated by useToggleStepProgress.onSuccess automatically
// Additional broad invalidation needed so useKanbanEnrichment and DashboardPage refresh:
qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });  // prefix ["recipe-assignments"]
```
`useToggleStepProgress.onSuccess` only invalidates `STEP_PROGRESS_KEY(assignmentId)`. The Kanban enrichment query (`["kanban-enrichment", ...]`) must also be invalidated explicitly in the bridge's success path. Consider invalidating `["kanban-enrichment"]` prefix as well.

### React Query Conditional Enabled
**Source:** `src/hooks/useRecipeAssignments.ts` lines 32–38 and `src/features/dashboard/DashboardPage.tsx` lines 84–91
**Apply to:** `useAssignmentsByUnit` and `useStepProgress` in DashboardPage and LogSessionSheet
```typescript
// Always pass undefined (not 0) to disable the query when no unit is selected
useAssignmentsByUnit(watchedUnitId > 0 ? watchedUnitId : undefined)
useStepProgress(primaryAssignment?.id)   // optional chaining → undefined when no assignment
```

---

## No Analog Found

All files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Key Implementation Risks (from RESEARCH.md Pitfalls)

| Risk | File | Mitigation |
|------|------|------------|
| Hook in event handler | LogSessionSheet.tsx | Call `useAssignmentsByUnit(watchedUnitId > 0 ? watchedUnitId : undefined)` at component level; access via closure in `onSubmit` |
| Wrong orderIndex | LogSessionSheet.tsx | Look up `step.order_index` from `recipeSteps.find(s => s.id === values.recipe_step_id)` — never use `recipe_step_id` directly as orderIndex |
| N+1 queries on Kanban | useKanbanEnrichment.ts | Extend `useKanbanEnrichment` with `Promise.all` loop — never call `useAssignmentsByUnit` inside `KanbanCard` |
| Stale Kanban after bridge | LogSessionSheet.tsx | After bridge success: `qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY })` AND invalidate `["kanban-enrichment"]` prefix |
| Wrong primary assignment | useKanbanEnrichment.ts + DashboardPage | Use `assignments[assignments.length - 1]` (most recently created, A1 assumption); verify `getAssignmentsByUnit` ORDER BY |
| Recipe name mismatch (A3) | useKanbanEnrichment.ts | Verify `getRecipeNamesByUnitIds` returns recipe matching `primary.recipe_id`; if not, add separate recipe lookup by ID |

---

## Metadata

**Analog search scope:** `src/features/dashboard/`, `src/features/painting-projects/`, `src/hooks/`, `src/types/`, `src/lib/`
**Files scanned:** 10 source files read directly
**Pattern extraction date:** 2026-05-13
