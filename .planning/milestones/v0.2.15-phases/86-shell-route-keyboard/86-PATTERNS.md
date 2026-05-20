# Phase 86: Shell, Route & Keyboard Shortcuts - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 6 (2 new, 4 modified)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/painting-mode/page.tsx` | route-shell | request-response | `src/app/game-day/page.tsx` | exact |
| `src/app/router.tsx` | config | request-response | `src/app/router.tsx` (self — extend) | exact |
| `src/hooks/useRecipeAssignments.ts` | hook | request-response | `src/hooks/useRecipeAssignments.ts` (self — add query) | exact |
| `src/features/painting-mode/SectionNavigator.tsx` | component | event-driven | `src/features/painting-mode/SectionNavigator.tsx` (self — modify) | exact |
| `src/features/painting-mode/StepFocalView.tsx` | component | event-driven | `src/features/painting-mode/StepFocalView.tsx` (self — modify) | exact |
| `tests/painting-mode/PaintingModePage.test.tsx` | test | — | `tests/painting-mode/SectionNavigator.test.tsx` | role-match |

---

## Pattern Assignments

### `src/app/painting-mode/page.tsx` (route-shell, request-response)

**Analog:** `src/app/game-day/page.tsx`

**Imports pattern** (game-day/page.tsx lines 1-2):
```typescript
import { useParams } from "@tanstack/react-router";
import { GameDayPage } from "@/features/game-day/GameDayPage";
```

Extend with:
```typescript
import { useNavigate } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { useRecipeAssignment } from "@/hooks/useRecipeAssignments";
import { usePaintingModeState } from "@/hooks/usePaintingModeState";
import { useCompleteStep } from "@/hooks/useRecipeAssignments";
import { PaintingModeView } from "@/features/painting-mode/PaintingModeView";
import { Skeleton } from "@/components/ui/skeleton";
```

**Core param-extraction pattern** (game-day/page.tsx lines 4-9 — clone exactly):
```typescript
export function GameDayPageShell() {
  const { listId } = useParams({ from: "/game-day/$listId" });
  const listIdNum = Number(listId);
  if (Number.isNaN(listIdNum)) return null;
  return <GameDayPage listId={listIdNum} />;
}
```

PaintingModePage must extend with async data lookup before rendering, plus hotkey registration:
```typescript
export function PaintingModePage() {
  const navigate = useNavigate();
  const { assignmentId } = useParams({ from: "/painting-mode/$assignmentId" });
  const assignmentIdNum = Number(assignmentId);

  const { data: assignment, isLoading } = useRecipeAssignment(
    Number.isNaN(assignmentIdNum) ? undefined : assignmentIdNum
  );

  // Lift state for hotkey handlers — D-05: shortcuts at page level, not children
  const state = usePaintingModeState(
    assignment?.id,
    assignment?.recipe_id
  );
  const completeMutation = useCompleteStep();

  // Hotkeys — enabled only when data is resolved (Pitfall 3)
  const enabled = !!assignment && !isLoading;
  useHotkeys(' ', () => { /* call handleMarkDone */ }, { preventDefault: true, enabled });
  useHotkeys('arrowleft', () => state.goPrev(), { preventDefault: true, enabled });
  useHotkeys('arrowright', () => state.goNext(), { preventDefault: true, enabled });
  useHotkeys('escape', () => {
    if (window.history.length <= 1) navigate({ to: '/' });
    else navigate({ to: '..', from: '/painting-mode/$assignmentId' });
  });

  if (Number.isNaN(assignmentIdNum)) return null;
  if (isLoading) return <Skeleton className="h-screen w-full" />;
  if (!assignment) return <div className="p-6">Assignment not found.</div>;

  return (
    <PaintingModeView
      assignmentId={assignment.id}
      recipeId={assignment.recipe_id}
      unitId={assignment.unit_id}
    />
  );
}
```

**Note on handler access:** `usePaintingModeState` and `useCompleteStep` must be called in `PaintingModePage` (not only inside `PaintingModeView`) so hotkeys at the page level can invoke `state.goPrev/goNext` and `completeMutation.mutate`. This means `PaintingModeView` must accept optional pre-computed state props OR the page shell calls both hook sets and passes handlers down. The cleanest approach is to hoist the hook calls to the page shell and pass `state` + `completeMutation` as props to `PaintingModeView`, or keep the hooks duplicated and use `useCallback` refs. See RESEARCH.md open question 2 for the tradeoff.

---

### `src/app/router.tsx` (config — modify to add layout route nesting)

**Analog:** `src/app/router.tsx` (self)

**Current root pattern** (router.tsx lines 27-36):
```typescript
const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </AppLayout>
  ),
});
```

**Target layout-route nesting pattern** (from RESEARCH.md, resolves Pitfall 5):

The `rootRoute` must become a thin shell; all existing routes move under a `layoutRoute`. A `bareLayoutRoute` is added for painting mode. This requires updating every `getParentRoute: () => rootRoute` call to `getParentRoute: () => layoutRoute`.

```typescript
// 1. Root becomes a thin shell
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  ),
});

// 2. Layout route — all existing pages nest here
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: () => (
    <AppLayout>
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
    </AppLayout>
  ),
});

// 3. Bare layout route — painting mode nests here (no sidebar)
const bareLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'bare-layout',
  component: () => (
    <ActiveFactionProvider>
      <TooltipProvider delayDuration={200}>
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ActiveFactionProvider>
  ),
});

// 4. Painting mode route under bare layout
const paintingModeRoute = createRoute({
  getParentRoute: () => bareLayoutRoute,
  path: '/painting-mode/$assignmentId',
  component: PaintingModePage,
});
```

**Existing route parent update** — ALL 14 existing routes change from:
```typescript
getParentRoute: () => rootRoute,
```
to:
```typescript
getParentRoute: () => layoutRoute,
```

**Route tree registration** (router.tsx lines 131-149):
```typescript
const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    dashboardRoute,
    factionsRoute,
    // ... all existing routes ...
    gameDayRoute,
    dataHealthRoute,
  ]),
  bareLayoutRoute.addChildren([paintingModeRoute]),
]);
```

**Required imports to add:**
```typescript
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PaintingModePage } from "./painting-mode/page";
```

---

### `src/hooks/useRecipeAssignments.ts` (hook — add single-record query)

**Analog:** existing hooks in the same file (lines 36-58)

**Pattern to copy** (lines 36-42 — `useAssignmentsByUnit`):
```typescript
export function useAssignmentsByUnit(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? UNIT_ASSIGNMENTS_KEY(unitId) : ["recipe-assignments"],
    queryFn: () => (unitId !== undefined ? getAssignmentsByUnit(unitId) : Promise.resolve([])),
    enabled: unitId !== undefined,
  });
}
```

**New hook to add** (after the existing `useAssignmentsByRecipe`, before mutation section):
```typescript
export const ASSIGNMENT_KEY = (id: number) =>
  ["recipe-assignments", "by-id", id] as const;

export function useRecipeAssignment(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? ASSIGNMENT_KEY(id) : ASSIGNMENTS_KEY,
    queryFn: () => (id !== undefined ? getAssignment(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}
```

**Import to add at top of file:**
```typescript
import {
  getAssignmentsByUnit,
  getAssignmentsByRecipe,
  getAssignment,          // ADD THIS
  createAssignment,
  // ...
} from "@/db/queries/recipeAssignments";
```

`getAssignment(id)` already exists in `src/db/queries/recipeAssignments.ts` (line 80) — no new DB query needed.

---

### `src/features/painting-mode/SectionNavigator.tsx` (component — SP-05 modification)

**Analog:** self — lines 91-130 are the section header button rendering

**Current progress badge pattern** (lines 124-126):
```typescript
<span className="flex items-center gap-1">
  <Badge variant="secondary">{progressText}</Badge>
  <ChevronDown className="h-3 w-3 text-muted-foreground" />
</span>
```

**Current section name pattern** (line 117):
```typescript
<span className="text-sm">{section.name}</span>
```

**SP-05 modification — add completion detection before the JSX block** (after line 93):
```typescript
const isComplete =
  progress != null &&
  progress.total > 0 &&
  progress.completed === progress.total;
```

**SP-05 modification — replace Badge with conditional Check icon** (lines 124-126 → new):
```typescript
<span className="flex items-center gap-1">
  {isComplete ? (
    <Check className="h-4 w-4 text-green-500" />
  ) : (
    <Badge variant="secondary">{progressText}</Badge>
  )}
  <ChevronDown className="h-3 w-3 text-muted-foreground" />
</span>
```

**SP-05 modification — mute section name when complete** (line 117 → new):
```typescript
<span className={isComplete ? "text-sm text-muted-foreground" : "text-sm"}>
  {section.name}
</span>
```

`Check` icon is already imported (line 2 — `import { Check, ChevronDown } from "lucide-react"`). No new imports needed.

---

### `src/features/painting-mode/StepFocalView.tsx` (component — D-10 kbd badges)

**Analog:** self — lines 117-153 are the navigation bar and Mark Done button

**Current Prev button pattern** (lines 117-124):
```typescript
<Button
  variant="ghost"
  size="icon"
  disabled={!canGoPrev}
  aria-label="Previous step"
  onClick={goPrev}
>
  <ChevronLeft className="h-5 w-5" />
</Button>
```

**Current Next button pattern** (lines 133-141):
```typescript
<Button
  variant="ghost"
  size="icon"
  disabled={!canGoNext}
  aria-label="Next step"
  onClick={goNext}
>
  <ChevronRight className="h-5 w-5" />
</Button>
```

**Current Mark Done button pattern** (lines 145-153):
```typescript
<Button
  className="w-full h-12 mt-4"
  disabled={isCompleted || isAllComplete}
  data-testid="mark-done-btn"
  onClick={onMarkDone}
>
  <Check className="h-5 w-5 mr-2" />
  Mark Done
</Button>
```

**D-10 modification — add kbd badges** (replace navigation buttons and Mark Done):
```typescript
{/* Prev with kbd badge */}
<Button
  variant="ghost"
  disabled={!canGoPrev}
  aria-label="Previous step"
  onClick={goPrev}
  className="flex items-center gap-1"
>
  <ChevronLeft className="h-5 w-5" />
  <kbd className="text-[10px] bg-muted px-1 rounded">←</kbd>
</Button>

{/* Next with kbd badge */}
<Button
  variant="ghost"
  disabled={!canGoNext}
  aria-label="Next step"
  onClick={goNext}
  className="flex items-center gap-1"
>
  <kbd className="text-[10px] bg-muted px-1 rounded">→</kbd>
  <ChevronRight className="h-5 w-5" />
</Button>

{/* Mark Done with Space badge */}
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

Note: `size="icon"` removed from Prev/Next buttons because icon-size buttons clip the kbd badge. Switch to `variant="ghost"` without explicit `size` to allow natural sizing.

---

### `tests/painting-mode/PaintingModePage.test.tsx` (test — new file)

**Analog:** `tests/painting-mode/SectionNavigator.test.tsx`

**Test file structure pattern** (SectionNavigator.test.tsx lines 1-6):
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionNavigator } from "@/features/painting-mode/SectionNavigator";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";
```

**Factory helper pattern** (SectionNavigator.test.tsx lines 8-25 — makeFoo functions for each entity):
```typescript
function makeSection(overrides: Partial<RecipeSection> = {}): RecipeSection {
  return { id: 1, recipe_id: 10, name: "Basecoat", ..., ...overrides };
}
```

**userEvent keyboard pattern** for hotkey tests:
```typescript
import userEvent from "@testing-library/user-event";

it("Space key calls handleMarkDone", async () => {
  const user = userEvent.setup();
  // render PaintingModePage shell with mocked hooks
  await user.keyboard(' ');
  expect(mockHandleMarkDone).toHaveBeenCalled();
});

it("ArrowLeft calls goPrev", async () => {
  const user = userEvent.setup();
  await user.keyboard('{ArrowLeft}');
  expect(mockGoPrev).toHaveBeenCalled();
});
```

**Mock pattern for React Query hooks** (vi.mock pattern from project):
```typescript
vi.mock("@/hooks/useRecipeAssignments", () => ({
  useRecipeAssignment: vi.fn().mockReturnValue({ data: mockAssignment, isLoading: false }),
  useCompleteStep: vi.fn().mockReturnValue({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/usePaintingModeState", () => ({
  usePaintingModeState: vi.fn().mockReturnValue(mockState),
}));
```

**TanStack Router mock** — `useParams` and `useNavigate` must be mocked (no router in jsdom):
```typescript
vi.mock("@tanstack/react-router", () => ({
  useParams: vi.fn().mockReturnValue({ assignmentId: "1" }),
  useNavigate: vi.fn().mockReturnValue(vi.fn()),
}));
```

---

## Shared Patterns

### Route Shell: Param Extraction + Numeric Coercion
**Source:** `src/app/game-day/page.tsx` lines 5-7
**Apply to:** `src/app/painting-mode/page.tsx`
```typescript
const { listId } = useParams({ from: "/game-day/$listId" });
const listIdNum = Number(listId);
if (Number.isNaN(listIdNum)) return null;
```

### React Query Hook: `enabled`-when-defined pattern
**Source:** `src/hooks/useRecipeAssignments.ts` lines 36-42
**Apply to:** new `useRecipeAssignment` hook in same file
```typescript
return useQuery({
  queryKey: id !== undefined ? SPECIFIC_KEY(id) : BROAD_KEY,
  queryFn: () => (id !== undefined ? queryFn(id) : Promise.resolve(null)),
  enabled: id !== undefined,
});
```

### Layout/Providers: AppLayout wraps providers, not the other way around
**Source:** `src/components/common/AppLayout.tsx` lines 15-19
**Apply to:** `bareLayoutRoute` in router.tsx — providers wrap Outlet directly (no AppLayout):
```typescript
<ActiveFactionProvider>
  <TooltipProvider delayDuration={200}>
    <Outlet />
    <Toaster richColors position="bottom-right" />
  </TooltipProvider>
</ActiveFactionProvider>
```
`TooltipProvider` and `Toaster` come from `AppLayout` — they must be replicated in the bare layout so tooltips and toasts still work in painting mode.

### Lucide Icon + Conditional Class Pattern
**Source:** `src/features/painting-mode/SectionNavigator.tsx` lines 143-159
**Apply to:** SP-05 section header completion acknowledgment
```typescript
{isCompleted ? (
  <Check className="h-4 w-4 text-green-500 shrink-0" />
) : isCurrent ? (
  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
) : (
  <span className="h-2 w-2 rounded-full border border-muted-foreground shrink-0" />
)}
```

---

## No Analog Found

All files have close codebase analogs. No entries in this section.

---

## Metadata

**Analog search scope:** `src/app/`, `src/features/painting-mode/`, `src/hooks/`, `src/components/common/`, `tests/painting-mode/`
**Files read:** 10
**Pattern extraction date:** 2026-05-19
