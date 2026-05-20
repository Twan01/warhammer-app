# Phase 85: Core Execution UI - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 9 (5 new components + 4 test files)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/painting-mode/PaintingModeView.tsx` | component (root) | request-response | `src/features/game-day/GameDayPage.tsx` | exact |
| `src/features/painting-mode/StepFocalView.tsx` | component (panel) | request-response | `src/features/recipes/RecipeStepTimeline.tsx` | role-match |
| `src/features/painting-mode/SectionNavigator.tsx` | component (panel) | request-response | `src/features/recipes/SectionedTimeline.tsx` + `GameDayReadinessPanel.tsx` | role-match |
| `src/features/painting-mode/StepMetadataRow.tsx` | component (presentational) | transform | `src/features/recipes/RecipeStepTimeline.tsx` (lines 75-99) | exact |
| `src/features/painting-mode/PaintReadinessBanner.tsx` | component (presentational) | transform | `src/features/game-day/GameDayReadinessPanel.tsx` | role-match |
| `tests/painting-mode/PaintingModeView.test.tsx` | test | n/a | `tests/game-day/GameDayPage.test.tsx` | exact |
| `tests/painting-mode/StepFocalView.test.tsx` | test | n/a | `tests/game-day/GameDayReadinessPanel.test.tsx` | role-match |
| `tests/painting-mode/SectionNavigator.test.tsx` | test | n/a | `tests/game-day/GameDayReadinessPanel.test.tsx` | role-match |
| `tests/painting-mode/PaintReadinessBanner.test.tsx` | test | n/a | `tests/game-day/GameDayReadinessPanel.test.tsx` | exact |

## Pattern Assignments

### `src/features/painting-mode/PaintingModeView.tsx` (root component, request-response)

**Analog:** `src/features/game-day/GameDayPage.tsx`

**Imports pattern** (lines 1-17):
```typescript
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
// Phase 84 hooks
import { usePaintingModeState } from "@/hooks/usePaintingModeState";
import { useCompleteStep } from "@/hooks/useRecipeAssignments";
// Paint data for paintMap
import { usePaints } from "@/hooks/usePaints";
// Child components
import { SectionNavigator } from "./SectionNavigator";
import { StepFocalView } from "./StepFocalView";
import { PaintReadinessBanner } from "./PaintReadinessBanner";
```

**Props pattern** (GameDayPage line 19-21):
```typescript
interface GameDayPageProps {
  listId: number;
}
```
Painting mode equivalent: `{ assignmentId: number; recipeId: number; unitId: number }`

**Loading state pattern** (lines 40-49):
```typescript
if (listLoading) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

**Full-page layout shell** (lines 65-66):
```typescript
return (
  <div className="flex flex-col h-full">
```
The painting mode adapts this to a split-panel layout with `<div className="flex flex-1 overflow-hidden">` containing the left nav (fixed width) and right focal view (flex-1).

**PaintMap construction pattern** (from `RecipeDetailSheet.tsx` lines 58, 76-80):
```typescript
const { data: paints = [] } = usePaints();
const paintMap = useMemo(() => {
  const m = new Map<number, typeof paints[number]>();
  for (const p of paints) m.set(p.id, p);
  return m;
}, [paints]);
```

**Missing paints derivation** (from `RecipeDetailSheet.tsx` lines 94-108):
```typescript
import { isPaintMissing } from "@/features/recipes/recipeSteps";

const missingPaints = useMemo(() => {
  return steps
    .filter((s): s is typeof s & { paint_id: number } => s.paint_id != null && s.paint_id !== 0)
    .map((s) => paintMap.get(s.paint_id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined && isPaintMissing(p));
}, [steps, paintMap]);

const uniqueMissingPaints = useMemo(() => {
  const seen = new Set<number>();
  return missingPaints.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}, [missingPaints]);
```

**Step photo URL resolution** (from `RecipeDetailSheet.tsx` lines 154-179):
```typescript
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

const [stepPhotoUrls, setStepPhotoUrls] = useState<Map<number, string>>(new Map());

const stepsKey = useMemo(
  () => steps.map((s) => `${s.id}:${s.step_photo_path ?? ""}`).join(","),
  [steps],
);

useEffect(() => {
  let cancelled = false;
  async function resolve() {
    const stepsWithPhotos = steps.filter((s) => s.step_photo_path);
    if (stepsWithPhotos.length === 0) {
      setStepPhotoUrls((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    const appDir = await appDataDir();
    const entries: [number, string][] = [];
    for (const s of stepsWithPhotos) {
      const abs = await join(appDir, s.step_photo_path!);
      entries.push([s.id, convertFileSrc(abs)]);
    }
    if (!cancelled) setStepPhotoUrls(new Map(entries));
  }
  resolve();
  return () => { cancelled = true; };
}, [stepsKey]);
```

---

### `src/features/painting-mode/StepFocalView.tsx` (panel component, request-response)

**Analog:** `src/features/recipes/RecipeStepTimeline.tsx` (display patterns) + `src/features/game-day/GameDayHeader.tsx` (button layout)

**Paint swatch node pattern** (RecipeStepTimeline lines 32-35):
```typescript
<div
  className="absolute left-1 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ring-2 ring-border"
  style={paint?.hex_color ? { backgroundColor: paint.hex_color } : undefined}
  data-testid="timeline-node"
/>
```
Scale up for focal view: larger circle (h-10 w-10 or similar) with same `backgroundColor` pattern.

**Paint name + owned indicator** (RecipeStepTimeline lines 48-60):
```typescript
{paint ? (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
    <span aria-hidden="true" className={missing ? "text-red-500" : "text-green-500"}>
      ●
    </span>
    {paint.brand} {paint.name}
  </span>
) : (
  <span className="text-xs text-muted-foreground">(no paint linked)</span>
)}
```

**Step photo display** (RecipeStepTimeline lines 101-108):
```typescript
{step.step_photo_path && stepPhotoUrls?.get(step.id) && (
  <img
    src={stepPhotoUrls.get(step.id)}
    alt={`Step: ${step.step_name} reference`}
    className="mt-1 h-16 w-16 rounded object-cover"
    data-testid="step-photo-thumbnail"
  />
)}
```
Scale up for focal view: larger image, e.g. `max-w-md rounded-lg object-cover`.

**Navigation button pattern** (GameDayHeader lines 73-99 — disabled buttons with icon + size):
```typescript
<Button
  variant="outline"
  size="icon"
  className="h-8 w-8"
  disabled={!canGoPrev}
  onClick={goPrev}
>
  <ChevronLeft className="h-4 w-4" />
</Button>
```

**Mark Done button pattern** (GameDayHeader line 54-62 — prominent action button):
```typescript
<Button
  variant="outline"
  size="sm"
  className="border-battle-gold text-battle-gold hover:bg-battle-gold/10 shrink-0"
  onClick={onEndGame}
>
  <Flag size={14} className="mr-1.5" aria-hidden />
  End Game
</Button>
```
Adapt for Mark Done: primary variant, `Check` icon, calls `handleMarkDone`.

---

### `src/features/painting-mode/SectionNavigator.tsx` (panel component, request-response)

**Analog:** `src/features/recipes/SectionedTimeline.tsx` (section grouping) + `src/features/game-day/GameDayReadinessPanel.tsx` (Collapsible pattern)

**Collapsible section pattern** (GameDayReadinessPanel lines 19-22, 142-170):
```typescript
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

<Collapsible open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger asChild>
    <button type="button" className="...">
      ...
    </button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* children */}
  </CollapsibleContent>
</Collapsible>
```

**Section header with metadata** (SectionedTimeline lines 72-132):
```typescript
<div className="flex items-center gap-2 flex-wrap" data-testid="section-header">
  {section.section_type && (
    <Badge variant="outline" className="text-xs capitalize">
      {section.section_type}
    </Badge>
  )}
  <span className="text-sm font-semibold">{section.name}</span>
  {section.optional === 1 && (
    <Badge variant="outline" className="text-xs">
      Optional
    </Badge>
  )}
  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
    <span className="flex items-center gap-0.5">
      <Layers className="h-3 w-3" />
      {stepCount} {stepCount === 1 ? "step" : "steps"}
    </span>
  </span>
</div>
```

**Steps grouped by section** (SectionedTimeline lines 26-35):
```typescript
const stepsBySection = useMemo(() => {
  const map = new Map<number, RecipeStep[]>();
  for (const step of steps) {
    if (step.section_id === null) continue;
    const existing = map.get(step.section_id) ?? [];
    existing.push(step);
    map.set(step.section_id, existing);
  }
  return map;
}, [steps]);
```

---

### `src/features/painting-mode/StepMetadataRow.tsx` (presentational, transform)

**Analog:** `src/features/recipes/RecipeStepTimeline.tsx` (lines 75-99)

**Metadata row pattern** (exact lines to scale up):
```typescript
{(step.tool || step.technique || step.dilution || step.time_estimate_minutes) && (
  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
    {step.tool && (
      <span className="inline-flex items-center gap-0.5">
        <Paintbrush className="h-3 w-3" />
        {step.tool}
      </span>
    )}
    {step.technique && (
      <span>{step.technique}</span>
    )}
    {step.dilution && (
      <span className="inline-flex items-center gap-0.5">
        <Droplets className="h-3 w-3" />
        {step.dilution}
      </span>
    )}
    {step.time_estimate_minutes != null && (
      <span className="inline-flex items-center gap-0.5">
        <Clock className="h-3 w-3" />
        {step.time_estimate_minutes} min
      </span>
    )}
  </div>
)}
```
Scale up: use `text-sm` instead of `text-xs`, `h-4 w-4` icons instead of `h-3 w-3`, technique as Badge.

---

### `src/features/painting-mode/PaintReadinessBanner.tsx` (presentational, transform)

**Analog:** `src/features/game-day/GameDayReadinessPanel.tsx` (warning display pattern)

**Warning row with icon** (GameDayReadinessPanel lines 173-191):
```typescript
{warnings.hard.map((w, i) => (
  <span
    key={`hard-${i}`}
    className="flex items-center gap-1 text-xs text-destructive"
  >
    <AlertCircle className="h-3 w-3" />
    {w}
  </span>
))}
{warnings.soft.map((w, i) => (
  <span
    key={`soft-${i}`}
    className="flex items-center gap-1 text-xs text-amber-500"
  >
    <AlertTriangle className="h-3 w-3" />
    {w}
  </span>
))}
```

**Container pattern** (GameDayReadinessPanel line 115):
```typescript
<div className="flex flex-col gap-3 px-4 py-3 bg-muted/30 border-b">
```
For banner: amber-tinted background with dismiss button, e.g. `bg-amber-500/10 border border-amber-500/30`.

---

### Test Files

**Analog:** `tests/game-day/GameDayPage.test.tsx` + `tests/game-day/GameDayReadinessPanel.test.tsx`

**Test file structure** (GameDayPage.test.tsx lines 1-18):
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";
```

**Hook mocking pattern** (GameDayPage.test.tsx lines 19-22):
```typescript
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ listId: "1" }),
  useNavigate: () => vi.fn(),
}));
```
For painting-mode tests, mock `usePaintingModeState`, `useCompleteStep`, `usePaints`, and Tauri path APIs.

**Factory function pattern** (GameDayReadinessPanel.test.tsx lines 23-43):
```typescript
function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1,
    list_id: 1,
    // ... all defaults
    ...overrides,
  };
}
```

**Render helper pattern** (GameDayReadinessPanel.test.tsx lines 52-63):
```typescript
function renderPanel(
  units: ArmyListUnitRow[],
  overrides: Partial<typeof defaultProps> = {},
) {
  return render(
    <TooltipProvider>
      <GameDayReadinessPanel
        units={units}
        {...defaultProps}
        {...overrides}
      />
    </TooltipProvider>,
  );
}
```

**userEvent import** (GameDayReadinessPanel.test.tsx line 9):
```typescript
import userEvent from "@testing-library/user-event";
```
Use for mark-done click, dismiss banner click, navigation click tests.

---

## Shared Patterns

### Paint Swatch (CSS Background Color)
**Source:** `src/features/recipes/RecipeStepTimeline.tsx` lines 32-35
**Apply to:** `StepFocalView.tsx`, `SectionNavigator.tsx`
```typescript
style={paint?.hex_color ? { backgroundColor: paint.hex_color } : undefined}
```

### Paint Availability Check
**Source:** `src/features/recipes/recipeSteps.ts` lines 41-44
**Apply to:** `PaintingModeView.tsx` (missing paint derivation), `PaintReadinessBanner.tsx`
```typescript
import { isPaintMissing } from "@/features/recipes/recipeSteps";
// Returns true if paint is null/undefined OR paint.owned !== 1
```

### PaintMap Construction
**Source:** `src/features/recipes/RecipeDetailSheet.tsx` lines 58, 76-80
**Apply to:** `PaintingModeView.tsx` (root level, passed down via props)
```typescript
const { data: paints = [] } = usePaints();
const paintMap = useMemo(() => {
  const m = new Map<number, typeof paints[number]>();
  for (const p of paints) m.set(p.id, p);
  return m;
}, [paints]);
```

### Step Photo URL Resolution
**Source:** `src/features/recipes/RecipeDetailSheet.tsx` lines 154-179
**Apply to:** `PaintingModeView.tsx` (root level, Map passed to StepFocalView)
```typescript
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
// useEffect with cancelled flag, resolves step_photo_path -> asset:// URL
```

### Mark Done with Auto-Advance
**Source:** `src/hooks/useRecipeAssignments.ts` lines 125-148 (CompleteStepVars type)
**Apply to:** `StepFocalView.tsx` (or handler passed from `PaintingModeView.tsx`)
```typescript
type CompleteStepVars = {
  assignmentId: number;
  unitId: number;
  recipeStepId: number;
  session: CreateSessionInput;
};
```
Minimal session for Phase 85: `duration_minutes: 0`, `session_date: todayISO()`.

### Date Utility
**Source:** `src/lib/dates.ts` (imported in GameDayPage.tsx line 17)
**Apply to:** `PaintingModeView.tsx` (for minimal session date)
```typescript
import { todayISO } from "@/lib/dates";
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All 5 components have strong analogs in game-day and recipes features |

## Metadata

**Analog search scope:** `src/features/game-day/`, `src/features/recipes/`, `src/hooks/`, `tests/game-day/`
**Files scanned:** 12 source files, 2 test files
**Pattern extraction date:** 2026-05-19
