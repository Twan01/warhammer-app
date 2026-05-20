# Phase 84: Data Layer + Early Tests - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 6 (3 source, 3 test)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/queries/recipeAssignments.ts` (modify) | query module | CRUD + transaction | `src/db/queries/recipeAssignments.ts` (existing) | exact — adding function to same file |
| `src/hooks/useRecipeAssignments.ts` (modify) | hook | request-response | `src/hooks/useRecipeAssignments.ts` (existing) | exact — adding mutation hook to same file |
| `src/hooks/usePaintingModeState.ts` (new) | hook | transform / derived state | `src/hooks/useNextPaintingAction.ts` | role-match — same composition pattern: fetch from multiple hooks, derive state |
| `tests/painting-mode/completeStepWithSession.test.ts` (new) | test | — | `tests/painting/recipeAssignments.test.ts` (Group 7–8) | exact — same SQL assertion + transaction verification pattern |
| `tests/painting-mode/useCompleteStep.test.ts` (new) | test | — | `tests/painting/recipeAssignments.test.ts` (Group 9–12) | exact — same makeWrapper + invalidateQueries spy pattern |
| `tests/painting-mode/paintingModeState.test.ts` (new) | test | — | `tests/painting/recipeAssignments.test.ts` (Group 1–6) | role-match — pure-function assertions via renderHook |

---

## Pattern Assignments

### `src/db/queries/recipeAssignments.ts` — add `completeStepWithSession`

**Analog:** `src/db/queries/recipeAssignments.ts` — `bulkCreateAssignments` (lines 153–171)

**Imports pattern** (lines 1–6, existing — no new imports needed):
```typescript
import { getDb } from "@/db/client";
import type {
  RecipeAssignment,
  CreateRecipeAssignmentInput,
  StepProgress,
} from "@/types/recipeAssignment";
```
Add this import alongside the existing ones (top of file):
```typescript
import type { CreateSessionInput } from "@/types/paintingSession";
```

**Core transaction pattern** — `bulkCreateAssignments` lines 153–171 (copy this skeleton):
```typescript
export async function bulkCreateAssignments(
  unitIds: number[],
  recipeId: number,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    for (const unitId of unitIds) {
      await db.execute(
        "INSERT OR IGNORE INTO unit_recipe_assignments (unit_id, recipe_id) VALUES ($1, $2)",
        [unitId, recipeId],
      );
    }
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
```

**Upsert SQL to inline** — `upsertStepProgress` lines 128–147 (copy the SQL, do NOT call the function):
```typescript
await db.execute(
  `INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed, completed_at)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT(assignment_id, recipe_step_id) DO UPDATE SET
     completed = excluded.completed,
     completed_at = excluded.completed_at`,
  [assignmentId, recipeStepId, 1, new Date().toISOString()],
);
```

**Session INSERT SQL to inline** — `createSession` in `src/db/queries/paintingSessions.ts` lines 19–34:
```typescript
await db.execute(
  "INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name, recipe_section_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
  [
    input.unit_id,
    input.session_date,
    input.duration_minutes,
    input.notes ?? null,
    input.recipe_id ?? null,
    input.recipe_step_id ?? null,
    input.section_name ?? null,
    input.recipe_section_id ?? null,
  ]
);
```

**Critical rule:** Do NOT call `upsertStepProgress()` or `createSession()` inside the transaction. Each calls `getDb()` independently and runs outside the transaction boundary. Inline the SQL directly. See `src/db/queries/recipes.ts` line 226 for the same documented constraint.

---

### `src/hooks/useRecipeAssignments.ts` — add `useCompleteStep`

**Analog:** `src/hooks/useRecipeAssignments.ts` — `useToggleStepProgress` (lines 91–100) and `useDeleteAssignment` (lines 76–89)

**Import pattern** (lines 1–11, existing — add new imports after existing ones):
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
```
New imports to add alongside existing:
```typescript
import { KANBAN_ENRICHMENT_KEY } from "@/hooks/useKanbanEnrichment";
import { NEXT_PAINTING_ACTION_KEY } from "@/hooks/useNextPaintingAction";
import { WORKFLOW_POSITIONS_KEY } from "@/hooks/useWorkflowPositions";
import { DASHBOARD_STATS_KEY } from "@/hooks/useDashboardStats";
import { completeStepWithSession } from "@/db/queries/recipeAssignments";
import type { CreateSessionInput } from "@/types/paintingSession";
```
Note: `KANBAN_ENRICHMENT_KEY` and `WORKFLOW_POSITIONS_KEY` are imported for documentation purposes only — their string literals `["kanban-enrichment"]` and `["workflow-positions"]` are used for prefix invalidation, not the key functions.

**Mutation hook variables type pattern** — `useDeleteAssignment` lines 76–89 (inline object type on mutation):
```typescript
export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; unitId: number; recipeId: number }>({
    mutationFn: ({ id }) => deleteAssignment(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(variables.unitId) });
      qc.invalidateQueries({ queryKey: RECIPE_ASSIGNMENTS_KEY(variables.recipeId) });
    },
  });
}
```
`useCompleteStep` uses the same inline type + variables destructuring pattern, with `unitId` explicitly in the variables type to enable `UNIT_ASSIGNMENTS_KEY(variables.unitId)` in `onSuccess`.

**Cache key constants** — lines 17–26 (existing constants used in invalidation):
```typescript
export const STEP_PROGRESS_KEY = (assignmentId: number) =>
  ["recipe-assignments", "progress", assignmentId] as const;

export const UNIT_ASSIGNMENTS_KEY = (unitId: number) =>
  ["recipe-assignments", "by-unit", unitId] as const;
```

**Six-key invalidation pattern** — modeled after `useToggleStepProgress` (1 key) scaled to 6 keys:
```typescript
onSuccess: (_data, variables) => {
  // D-05: full 6-key invalidation set
  qc.invalidateQueries({ queryKey: STEP_PROGRESS_KEY(variables.assignmentId) });
  qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });        // D-06: prefix, NOT KANBAN_ENRICHMENT_KEY()
  qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(variables.unitId) });
  qc.invalidateQueries({ queryKey: NEXT_PAINTING_ACTION_KEY });
  qc.invalidateQueries({ queryKey: ["workflow-positions"] });       // D-06: prefix, NOT WORKFLOW_POSITIONS_KEY()
  qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
},
```

---

### `src/hooks/usePaintingModeState.ts` (new file)

**Analog:** `src/hooks/useNextPaintingAction.ts` (lines 1–72) — same multi-query composition + derived state pattern

**Imports pattern** (modeled after `useNextPaintingAction.ts` lines 1–8):
```typescript
import { useState, useMemo } from "react";
import { useStepProgress } from "@/hooks/useRecipeAssignments";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import type { RecipeStep } from "@/types/recipePaint";
import type { StepProgress } from "@/types/recipeAssignment";
```

**Multi-hook composition pattern** — `useNextPaintingAction.ts` lines 22–37:
```typescript
export function useNextPaintingAction() {
  const stepQuery = useQuery({ ... });
  const step = stepQuery.data;
  const recipePaintsQuery = useRecipePaints(step?.recipe_id);
  const allPaintsQuery = usePaints();
  // ...
  return {
    data,
    isLoading: stepQuery.isLoading,
    isPending: stepQuery.isPending,
    isError: stepQuery.isError,
    error: stepQuery.error,
  };
}
```
`usePaintingModeState` uses the same pattern: compose three queries, derive state with `useMemo`, return a structured object. The key difference is it adds `useState` for navigation control.

**Section-aware sort pattern** — `src/db/queries/recipes.ts` lines 174–180 (`duplicateRecipe`):
```typescript
// SQL equivalent being replicated client-side:
// ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC

// Client-side implementation for useMemo:
const sectionOrderMap = new Map(sections.map(s => [s.id, s.order_index]));
const orderedSteps = [...steps].sort((a, b) => {
  const sa = (a.section_id !== null ? sectionOrderMap.get(a.section_id) : undefined) ?? 999999;
  const sb = (b.section_id !== null ? sectionOrderMap.get(b.section_id) : undefined) ?? 999999;
  if (sa !== sb) return sa - sb;
  return a.order_index - b.order_index;
});
```

**Boolean cast pattern** (reading `StepProgress.completed` — field is `0 | 1` integer):
```typescript
// From upsertStepProgress in recipeAssignments.ts lines 128–147:
// completed ? 1 : 0  (write)
// p.completed === 1  (read — cast to boolean with ===)
const completedSet = new Set(
  progressRows.filter(p => p.completed === 1).map(p => p.recipe_step_id)
);
```

**eslint-disable pattern for mount-only useMemo** (Pitfall 4 from RESEARCH.md):
```typescript
const initialStepId = useMemo(() => {
  const first = orderedSteps.find(s => !completedSet.has(s.id));
  return first?.id ?? orderedSteps[orderedSteps.length - 1]?.id ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // intentionally mount-only — navigation is controlled state thereafter
```

---

### `tests/painting-mode/completeStepWithSession.test.ts` (new file)

**Analog:** `tests/painting/recipeAssignments.test.ts` — Group 7 (`upsertStepProgress`) and Group 8 (`bulkCreateAssignments`), lines 170–231

**Full file structure pattern** (lines 1–51 of analog):
```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";

const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import { completeStepWithSession } from "@/db/queries/recipeAssignments";

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});
```

**Transaction call count assertion pattern** — Group 8 lines 209–231:
```typescript
it("calls db.execute for BEGIN + once per unitId + COMMIT", async () => {
  await bulkCreateAssignments([10, 20, 30], 7);
  // BEGIN + 3 INSERTs + COMMIT = 5 calls
  expect(executeMock).toHaveBeenCalledTimes(5);
  expect(executeMock.mock.calls[1][1]).toEqual([10, 7]);
});
```
For `completeStepWithSession`, the count is always 4: BEGIN + upsert + insert + COMMIT.

**Rollback assertion pattern** — test that the nth call is ROLLBACK when an intermediate call rejects:
```typescript
executeMock
  .mockResolvedValueOnce({}) // BEGIN
  .mockResolvedValueOnce({}) // upsert OK
  .mockRejectedValueOnce(new Error("FK violation")) // session INSERT fails
  .mockResolvedValueOnce({}); // ROLLBACK
await expect(completeStepWithSession(5, 2, session)).rejects.toThrow("FK violation");
expect(executeMock.mock.calls[3][0]).toBe("ROLLBACK");
```

**SQL content assertion pattern** — Group 7 lines 172–204:
```typescript
const [sql, params] = executeMock.mock.calls[0];
expect(sql).toContain("ON CONFLICT(assignment_id, recipe_step_id) DO UPDATE SET");
expect(params[2]).toBe(1);    // completed = true -> 1
expect(typeof params[3]).toBe("string"); // completed_at ISO string
expect(params[3]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
```

---

### `tests/painting-mode/useCompleteStep.test.ts` (new file)

**Analog:** `tests/painting/recipeAssignments.test.ts` — Groups 9–12 (mutation hook invalidation contracts), lines 233–421

**makeWrapper helper** (lines 54–60 — copy verbatim):
```typescript
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

**Hook invalidation spy pattern** — Group 9 lines 236–276:
```typescript
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

it("invalidates STEP_PROGRESS_KEY(assignmentId) on success", async () => {
  const { spy, wrapper } = makeWrapper();
  const { result } = renderHook(() => useCompleteStep(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ assignmentId: 5, unitId: 1, recipeStepId: 2, session });
  });
  await waitFor(() => expect(spy).toHaveBeenCalled());

  const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
  expect(keys).toContainEqual(STEP_PROGRESS_KEY(5));
});
```

**Count assertion pattern** — "invalidates exactly N keys" (from Group 9 lines 264–275):
```typescript
it("invalidates exactly 6 keys on success", async () => {
  const { spy, wrapper } = makeWrapper();
  const { result } = renderHook(() => useCompleteStep(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ assignmentId: 5, unitId: 1, recipeStepId: 2, session });
  });
  await waitFor(() => expect(spy).toHaveBeenCalled());

  expect(spy).toHaveBeenCalledTimes(6);
});
```

**Prefix key assertion pattern** — for `["kanban-enrichment"]` and `["workflow-positions"]`:
```typescript
const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
// Prefix invalidation — check the raw array literal, not the key function
expect(keys).toContainEqual(["kanban-enrichment"]);
expect(keys).toContainEqual(["workflow-positions"]);
```

---

### `tests/painting-mode/paintingModeState.test.ts` (new file)

**Analog:** `tests/painting/recipeAssignments.test.ts` — Groups 1–6 (query assertions), plus `useNextPaintingAction.ts` pattern for multi-hook mock approach

**vi.mock for multiple hooks pattern** (based on Groups 1–6 structure):
```typescript
vi.mock("@/hooks/useRecipeAssignments", () => ({
  useStepProgress: vi.fn(),
}));
vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: vi.fn(),
}));
vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: vi.fn(),
}));
```

**renderHook + act pattern for navigation** (from `@testing-library/react`):
```typescript
import { renderHook, act } from "@testing-library/react";
import { usePaintingModeState } from "@/hooks/usePaintingModeState";

it("goNext advances currentStepId to next step in order", async () => {
  // ... mock setup returning orderedSteps
  const { result } = renderHook(() => usePaintingModeState(1, 10));
  expect(result.current.currentIndex).toBe(0);

  act(() => { result.current.goNext(); });
  expect(result.current.currentIndex).toBe(1);
});
```

**Pure derivation test pattern** (no DB mock needed — mock the hooks, test the derivation):
```typescript
// Multi-section ordering test
it("sorts steps by section order_index then step order_index", () => {
  // section 2 has order_index 0, section 1 has order_index 1
  // step in section 2 must appear first regardless of step.id order
  // ...assert orderedSteps[0].section_id === 2
});

// First incomplete step selection
it("sets initialStepId to first incomplete step in section-aware order", () => {
  // step 1 (section 1, order 0) is complete; step 2 (section 1, order 1) is not
  // initialStepId must be step 2's id
});
```

---

## Shared Patterns

### getDb() Singleton
**Source:** `src/db/client.ts` (used by all query modules)
**Apply to:** `src/db/queries/recipeAssignments.ts` (new function)
```typescript
// Standard pattern — always await, always call per function (not per file)
const db = await getDb();
```

### Positional SQL Parameters
**Source:** Throughout `src/db/queries/*.ts`
**Apply to:** `completeStepWithSession` SQL strings
```typescript
// $1, $2, $3 positional syntax — Tauri plugin-sql requirement
// Never use template literals or string interpolation in SQL
"INSERT INTO ... VALUES ($1, $2, $3, $4)"
```

### Boolean Integer Cast
**Source:** `src/db/queries/recipeAssignments.ts` line 143 + `src/types/recipeAssignment.ts`
**Apply to:** `completedSet` derivation in `usePaintingModeState.ts`
```typescript
// Write: completed ? 1 : 0
// Read: p.completed === 1 (not Boolean(p.completed), not !!p.completed)
```

### React Query useMutation Shape
**Source:** `src/hooks/useRecipeAssignments.ts` lines 60–115
**Apply to:** `useCompleteStep` in same file
```typescript
// Standard shape: useMutation<ReturnType, ErrorType, VariablesType>
return useMutation<void, Error, CompleteStepVars>({
  mutationFn: ({ assignmentId, recipeStepId, session }) => ...,
  onSuccess: (_data, variables) => { /* invalidations */ },
});
```

### useQueryClient for Invalidation
**Source:** `src/hooks/useRecipeAssignments.ts` lines 60–61 (used by all mutation hooks)
**Apply to:** `useCompleteStep`
```typescript
const qc = useQueryClient();
// Called inside onSuccess: qc.invalidateQueries({ queryKey: ... })
```

### vi.mock Placement Rule
**Source:** `tests/painting/recipeAssignments.test.ts` lines 15–32
**Apply to:** All three new test files
```typescript
// vi.mock MUST come before the import that uses the mock
vi.mock("@/db/client", () => ({ ... }));

// Import AFTER vi.mock so the mocked client is used
import { completeStepWithSession } from "@/db/queries/recipeAssignments";
```

### beforeEach Mock Reset
**Source:** `tests/painting/recipeAssignments.test.ts` lines 46–51
**Apply to:** All three new test files
```typescript
beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});
```

---

## No Analog Found

All files for Phase 84 have close analogs in the codebase. No files require falling back to RESEARCH.md patterns only.

---

## Key Anti-Patterns Flagged

| Anti-Pattern | Files Affected | What to Do Instead |
|---|---|---|
| Calling `upsertStepProgress()` inside transaction | `recipeAssignments.ts` new function | Inline the SQL — each helper calls `getDb()` independently |
| Calling `createSession()` inside transaction | `recipeAssignments.ts` new function | Inline the INSERT SQL — same reason |
| `KANBAN_ENRICHMENT_KEY(sortedIds)` for invalidation | `useRecipeAssignments.ts` new hook | Use raw `["kanban-enrichment"]` literal for prefix invalidation |
| `WORKFLOW_POSITIONS_KEY(sortedIds)` for invalidation | `useRecipeAssignments.ts` new hook | Use raw `["workflow-positions"]` literal for prefix invalidation |
| `rs.order_index ASC` alone for step ordering | `usePaintingModeState.ts` | Always `COALESCE(section.order_index, 999999), step.order_index` |
| `orderedSteps` in `initialStepId` useMemo dep array | `usePaintingModeState.ts` | Empty dep array `[]` with eslint-disable comment — mount-only intent |

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `tests/painting/`
**Files read:** 11 source files, 1 test file
**Pattern extraction date:** 2026-05-19
