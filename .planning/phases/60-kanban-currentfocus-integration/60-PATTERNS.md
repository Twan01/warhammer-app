# Phase 60: Kanban & CurrentFocus Integration - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 9 (2 new, 7 modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/computeWorkflowPosition.ts` | utility | transform | `src/lib/computeDelta.ts` | role-match |
| `src/hooks/useWorkflowPositions.ts` | hook | batch-request | `src/hooks/useKanbanEnrichment.ts` | exact |
| `src/features/painting-projects/KanbanCard.tsx` | component | request-response | (self - additive props) | exact |
| `src/features/painting-projects/KanbanColumn.tsx` | component | request-response | (self - prop passthrough) | exact |
| `src/features/painting-projects/KanbanBoard.tsx` | component | request-response | (self - hook call + drill) | exact |
| `src/features/dashboard/CurrentFocusCard.tsx` | component | request-response | (self - additive props) | exact |
| `src/features/dashboard/DashboardPage.tsx` | component | request-response | (self - focus recipe pattern) | exact |
| `tests/lib/computeWorkflowPosition.test.ts` | test | n/a | `tests/lib/dates.test.ts` | role-match |
| `tests/dashboard/CurrentFocusCard.test.tsx` | test | n/a | `tests/painting/KanbanCard.test.tsx` | role-match |

## Pattern Assignments

### `src/lib/computeWorkflowPosition.ts` (utility, transform) -- NEW

**Analog:** `src/lib/computeDelta.ts`

**Imports pattern** (lines 1-2):
```typescript
// Pure function — no React, no DB imports. Only type imports from @/types/
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
```

**Core pattern** -- pure function with JSDoc, explicit params, simple return (lines 1-15 of computeDelta.ts):
```typescript
/**
 * Phase 24 — Pure delta computation for point preview.
 * ...
 * @param candidatePoints - ...
 * @param effectivePoints - ...
 * @returns The signed integer delta ...
 */
export function computeDelta(
  candidatePoints: number | null,
  effectivePoints: number,
): number {
  if (candidatePoints === null) return 0;
  return candidatePoints - effectivePoints;
}
```

**Key conventions:**
- Export the interface (`WorkflowPosition`) from the same file
- JSDoc block with Phase reference and `@param` / `@returns`
- Early-return `null` for invalid/missing inputs
- No side effects, no dependencies beyond types

---

### `src/hooks/useWorkflowPositions.ts` (hook, batch-request) -- NEW

**Analog:** `src/hooks/useKanbanEnrichment.ts` (exact match)

**Full file pattern** (lines 1-35):
```typescript
/**
 * PROJ-01 — batch enrichment data for kanban cards.
 * Fetches recipe names and photo counts in parallel via Promise.all.
 * Query key uses sorted IDs to prevent re-fetch on dnd-kit reorder (Pitfall 2).
 */
import { useQuery } from "@tanstack/react-query";
import { getRecipeNamesByUnitIds } from "@/db/queries/recipes";
import { getPhotoCountsByUnitIds } from "@/db/queries/unitPhotos";

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

**Key conventions to replicate:**
1. Export interface for return type (e.g., `WorkflowPositions` or use `Map<number, WorkflowPosition>`)
2. Export query key factory: `const WORKFLOW_POSITIONS_KEY = (unitIds: number[]) => ["workflow-positions", ...unitIds] as const`
3. Sort IDs before query key: `const sortedIds = [...unitIds].sort((a, b) => a - b)`
4. `enabled: sortedIds.length > 0`
5. `staleTime: 5 * 60 * 1000`
6. `Promise.all` for parallel sub-queries
7. Build `Map` from results

---

### `src/features/painting-projects/KanbanCard.tsx` (component, request-response) -- MODIFY

**Self-analog.** Add optional prop and conditional render block.

**Props extension pattern** (lines 25-33):
```typescript
export interface KanbanCardProps {
  unit: Unit;
  faction: Faction | undefined;
  onRemoveFromBoard: (unit: Unit) => void;
  onEditUnit: (unit: Unit) => void;
  onLogSession: (unitId: number) => void;
  recipeName?: string;
  photoCount?: number;
  // NEW: workflowPosition?: WorkflowPosition | null;
}
```

**Conditional render slot** -- insert after recipe name display (lines 97-101):
```typescript
{recipeName && (
  <span className="truncate max-w-[10rem]" title={recipeName}>
    Recipe: {recipeName.length > 20 ? recipeName.slice(0, 20) + "..." : recipeName}
  </span>
)}
// NEW workflow context renders here, same pattern: {workflowPosition && (...)}
```

**Next action hint slot** -- existing hint at lines 109-112 must be preserved (D-19):
```typescript
{unit.status_painting !== "Completed" && (
  <p className="mt-1 text-xs italic text-muted-foreground/70">
    {"→"} {getNextActionHint(unit.status_painting)}
  </p>
)}
```

---

### `src/features/painting-projects/KanbanColumn.tsx` (component, request-response) -- MODIFY

**Prop passthrough pattern** (lines 10-18, 52-61):
```typescript
// Props interface -- add optional workflowPositions alongside enrichment
export interface KanbanColumnProps {
  status: PaintingStatus;
  units: Unit[];
  factionMap: Map<number, Faction>;
  onRemoveFromBoard: (unit: Unit) => void;
  onEditUnit: (unit: Unit) => void;
  onLogSession: (unitId: number) => void;
  enrichment?: KanbanEnrichment;
  // NEW: workflowPositions?: Map<number, WorkflowPosition>;
}

// Card render -- pass workflow data via Map.get (lines 52-61)
<KanbanCard
  key={u.id}
  unit={u}
  faction={factionMap.get(u.faction_id)}
  onRemoveFromBoard={onRemoveFromBoard}
  onEditUnit={onEditUnit}
  onLogSession={onLogSession}
  recipeName={enrichment?.recipeNames.get(u.id)}
  photoCount={enrichment?.photoCounts.get(u.id)}
  // NEW: workflowPosition={workflowPositions?.get(u.id)}
/>
```

---

### `src/features/painting-projects/KanbanBoard.tsx` (component, request-response) -- MODIFY

**Hook call + prop-drill pattern** (lines 49-53, 153-162):
```typescript
// Hook call at board level (line 53)
const { data: enrichment } = useKanbanEnrichment(activeUnitIds);
// NEW: const { data: workflowPositions } = useWorkflowPositions(activeUnitIds, recipeMap);

// Pass to column (lines 153-162)
<KanbanColumn
  key={status}
  status={status}
  units={grouped[status]}
  factionMap={factionMap}
  onRemoveFromBoard={handleRemoveFromBoard}
  onEditUnit={onEditUnit}
  onLogSession={onLogSession}
  enrichment={enrichment}
  // NEW: workflowPositions={workflowPositions}
/>
```

---

### `src/features/dashboard/CurrentFocusCard.tsx` (component, request-response) -- MODIFY

**Self-analog.** Same additive prop pattern as KanbanCard.

**Props interface** (lines 23-31):
```typescript
export interface CurrentFocusCardProps {
  unit: Unit | null;
  faction: Faction | undefined;
  photo: UnitPhotoWithUrl | undefined;
  onOpen: () => void;
  onLog: () => void;
  recipeName?: string | null;
  extraRecipeCount?: number;
  // NEW: workflowPosition?: WorkflowPosition | null;
}
```

**Recipe name render slot** -- insert workflow context after this (lines 66-70):
```typescript
{recipeName && (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Palette size={12} aria-hidden />
    {recipeName}{extraRecipeCount > 0 ? ` (+${extraRecipeCount} more)` : ""}
  </span>
)}
// NEW workflow display renders here
```

---

### `src/features/dashboard/DashboardPage.tsx` (component, request-response) -- MODIFY

**Focus unit recipe fetch pattern** (lines 82-87):
```typescript
// DATA-06 -- recipe name for focus unit (called unconditionally per Rules of Hooks)
const focusUnitId = stats?.activeProjects?.[0]?.id ?? null;
const { data: focusRecipes } = useQuery({
  queryKey: ["recipes", "by-unit", focusUnitId ?? 0],
  queryFn: () => getRecipeNamesByUnitIds([focusUnitId!]),
  enabled: focusUnitId !== null,
});
// NEW: call useWorkflowPositions with [focusUnitId] following same guard pattern
```

**Prop pass to CurrentFocusCard** (lines 315-325):
```typescript
<CurrentFocusCard
  unit={focusUnit}
  faction={focusFaction}
  photo={latestPhotos?.get(focusUnit?.id ?? -1)}
  onOpen={() => focusUnit && setSelectedUnitId(focusUnit.id)}
  onLog={() => { ... }}
  recipeName={focusRecipes?.[0]?.name ?? null}
  // NEW: workflowPosition={workflowPositions?.get(focusUnit?.id ?? -1)}
/>
```

---

### `tests/lib/computeWorkflowPosition.test.ts` (test) -- NEW

**Analog:** `tests/lib/dates.test.ts`

**Test file structure** (full file, lines 1-45):
```typescript
/**
 * Phase 17 -- UTC-safe date utility contract tests.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { todayISO, parseLocalDate } from "@/lib/dates";

describe("todayISO()", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a string matching YYYY-MM-DD format", () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

**Key conventions:**
- JSDoc with phase reference
- Import from `vitest` (describe, it, expect, vi)
- Import from `@/lib/...` path alias
- Descriptive `describe` blocks per function/scenario
- No React Testing Library needed -- pure function tests use plain `expect`

---

### `tests/dashboard/CurrentFocusCard.test.tsx` (test) -- NEW

**Analog:** `tests/painting/KanbanCard.test.tsx`

**Test structure pattern** (lines 1-96):
```typescript
/**
 * PROJ-03 -- KanbanCard renders unit name, faction badge, progress bar.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
// DnD wrapper for KanbanCard; CurrentFocusCard needs no wrapper
import { KanbanCard } from "@/features/painting-projects/KanbanCard";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

// Factory helpers
function makeUnit(over: Partial<Unit> = {}): Unit {
  return { id: 1, faction_id: 1, name: "Fire Warriors", /* ... defaults ... */ ...over };
}

function makeFaction(over: Partial<Faction> = {}): Faction {
  return { id: 1, name: "Tau Empire", /* ... defaults ... */ ...over };
}

// Render helper
function renderCard(unit: Unit, faction: Faction | undefined = makeFaction()) {
  return render(<KanbanCard unit={unit} faction={faction} /* callbacks */ />);
}

describe("KanbanCard", () => {
  it("PROJ-03: renders unit name", () => {
    renderCard(makeUnit({ name: "Fire Warriors" }));
    expect(screen.getByText("Fire Warriors")).toBeInTheDocument();
  });
});
```

**Key conventions for CurrentFocusCard tests:**
- Factory functions `makeUnit()` and `makeFaction()` with spread overrides
- `renderCard` helper wrapping `render()` with default props
- No DnD wrapper needed (CurrentFocusCard is not sortable)
- Test IDs reference PROJ-XX requirement codes
- Mock callbacks with `vi.fn()`

---

## Shared Patterns

### Batch Enrichment Architecture
**Source:** `src/hooks/useKanbanEnrichment.ts` (full file)
**Apply to:** `useWorkflowPositions.ts`
```typescript
// 1. Sort IDs for cache stability
const sortedIds = [...unitIds].sort((a, b) => a - b);
// 2. useQuery with sorted key
return useQuery({
  queryKey: WORKFLOW_POSITIONS_KEY(sortedIds),
  queryFn: async () => { /* Promise.all sub-queries, build Map */ },
  enabled: sortedIds.length > 0,
  staleTime: 5 * 60 * 1000,
});
```

### Additive Prop Extension
**Source:** `KanbanCard.tsx` lines 25-33, `CurrentFocusCard.tsx` lines 23-31
**Apply to:** Both card component modifications
```typescript
// Add optional prop -- never remove existing props (D-19)
workflowPosition?: WorkflowPosition | null;

// Conditional render -- only when data present
{workflowPosition && (
  <span className="text-xs text-muted-foreground">...</span>
)}
```

### Map Prop-Drilling
**Source:** `KanbanColumn.tsx` lines 52-61
**Apply to:** KanbanColumn (pass-through), KanbanBoard (source)
```typescript
// Board passes Map to Column
<KanbanColumn enrichment={enrichment} workflowPositions={workflowPositions} />

// Column passes per-unit value to Card
<KanbanCard workflowPosition={workflowPositions?.get(u.id)} />
```

### Existing Fallback Preservation
**Source:** `KanbanCard.tsx` lines 109-112
**Apply to:** KanbanCard workflow display
```typescript
// D-15/D-19: existing hint ALWAYS renders when status !== "Completed"
// Workflow context is ADDITIONAL, placed above/near this block
{unit.status_painting !== "Completed" && (
  <p className="mt-1 text-xs italic text-muted-foreground/70">
    {"→"} {getNextActionHint(unit.status_painting)}
  </p>
)}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All files have strong analogs in the codebase |

## Metadata

**Analog search scope:** `src/lib/`, `src/hooks/`, `src/features/painting-projects/`, `src/features/dashboard/`, `tests/`
**Files scanned:** 15 analog candidates examined
**Pattern extraction date:** 2026-05-12
