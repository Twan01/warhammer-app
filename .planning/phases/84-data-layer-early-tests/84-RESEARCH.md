# Phase 84: Data Layer + Early Tests - Research

**Researched:** 2026-05-19
**Domain:** SQLite transactions, React Query mutation hooks, pure-function navigation state, Vitest testing patterns
**Confidence:** HIGH — all findings derived directly from the existing codebase; no external package research needed for this phase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** `completeStepWithSession` wraps exactly two writes in a single BEGIN/COMMIT: (1) step progress upsert via `upsertStepProgress` SQL and (2) session insert. Follows the `saveRecipeGraph` flat inline SQL pattern — no nested transactions, no helper function calls inside the transaction.

**D-02:** The function lives in `src/db/queries/recipeAssignments.ts` alongside existing `upsertStepProgress` and `bulkCreateAssignments`.

**D-03:** First incomplete step is derived client-side using `COALESCE(section.order_index, 999999), step.order_index` sort. The existing `getMostRecentAssignmentWithIncompleteStep` query orders by `rs.order_index ASC` but does NOT account for sections — the new `usePaintingModeState` hook must compute section-aware ordering from the full step list.

**D-04:** Steps without a section (section_id = NULL) sort after all sectioned steps via the COALESCE(999999) fallback.

**D-05:** `useCompleteStep` mutation invalidates specific keys, not broad prefix. Full invalidation set:
- `STEP_PROGRESS_KEY(assignmentId)` — step completion state
- `KANBAN_ENRICHMENT_KEY` — prefix invalidation (`["kanban-enrichment"]`)
- `UNIT_ASSIGNMENTS_KEY(unitId)` — unit detail panel
- `NEXT_PAINTING_ACTION_KEY` — dashboard next action card
- `WORKFLOW_POSITIONS_KEY` — prefix invalidation (`["workflow-positions"]`)
- `DASHBOARD_STATS_KEY` — dashboard stat cards

**D-06:** `KANBAN_ENRICHMENT_KEY` and `WORKFLOW_POSITIONS_KEY` take sorted unit ID arrays, so prefix invalidation (just the first segment) is the correct approach — we don't know all active unit ID sets at mutation time.

**D-07:** `usePaintingModeState` is a standalone hook in `src/hooks/usePaintingModeState.ts`. Takes an `assignmentId` and internally composes recipe steps + step progress + section data to produce: ordered step array, current step ID, prev/next/jumpTo navigation functions, section progress summary.

**D-08:** The hook is a pure composition layer — it fetches data via existing React Query hooks (`useStepProgress`, recipe steps query) and computes navigation state. No new DB queries needed for navigation; only `completeStepWithSession` is a new query function.

**D-09:** New tests go in `tests/painting-mode/` to mirror the planned `src/features/painting-mode/` directory.

**D-10:** Test files: `completeStepWithSession.test.ts` (SQL assertions for the transaction), `paintingModeState.test.ts` (pure-function tests for step ordering and navigation logic), `useCompleteStep.test.ts` (hook invalidation contract).

**D-11:** Test pattern follows `tests/painting/recipeAssignments.test.ts` — mock `getDb()` to intercept SQL calls, use `renderHook` + `invalidateQueries` spy for hook contracts.

### Claude's Discretion

- Navigation state computation (prev/next/jumpTo) implementation details — any reasonable pure-function approach works
- Whether `usePaintingModeState` uses `useMemo` or `useCallback` for derived state — standard React performance patterns apply

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DL-01 | Atomic `completeStepWithSession` function wraps step progress upsert + session insert in a single BEGIN/COMMIT transaction | `bulkCreateAssignments` pattern confirmed as the model; `createSession` SQL confirmed via `paintingSessions.ts` |
| DL-02 | Section-aware step ordering derives first incomplete step using section order_index then step order_index | `duplicateRecipe` in `recipes.ts` already uses `COALESCE(s.order_index, 999999) ASC, rs.order_index ASC` — confirmed pattern |
| DL-03 | `useCompleteStep` mutation invalidates step progress, kanban enrichment, unit assignments, dashboard action, and workflow position cache keys | All six key constants confirmed in their respective hook files |
| DL-04 | `usePaintingModeState` hook manages ordered step array, current step ID, and prev/next/jump navigation | Architecture doc confirms design; `RecipeStep` and `StepProgress` types confirmed |
| TS-01 | Test coverage for first incomplete step selection logic | Test pattern confirmed from `tests/painting/recipeAssignments.test.ts` |
| TS-02 | Test coverage for mark step complete | `completeStepWithSession` SQL assertion pattern maps to existing GROUP 7 (upsertStepProgress) pattern |
| TS-03 | Test coverage for previous/next navigation | Pure-function tests on `usePaintingModeState` output — no DB mocking needed |
</phase_requirements>

---

## Summary

Phase 84 delivers the data foundation that all subsequent Painting Mode phases depend on. It consists of three deliverables: (1) a new transactional DB function `completeStepWithSession`, (2) a new React Query mutation hook `useCompleteStep` with a six-key invalidation set, and (3) a new navigation hook `usePaintingModeState` that derives ordered step array and prev/next/jumpTo functions from existing query data.

The good news: no new DB migrations, no new npm packages, and no new schema knowledge is needed. Every data operation builds directly on existing patterns confirmed in the codebase. The transaction pattern (`BEGIN/COMMIT` with flat inline SQL) is already in `bulkCreateAssignments` and `saveRecipeGraph`. The hook invalidation pattern is in `useCreateAssignment` and `useBulkCreateAssignments`. The pure-function derivation pattern is in `computeAssignmentProgress` and `computeWorkflowPosition`.

The only non-trivial complexity is in `usePaintingModeState`: deriving the first incomplete step requires section-aware sorting (`COALESCE(section.order_index, 999999), step.order_index`) applied client-side to data from two separate queries. The CONTEXT.md and ARCHITECTURE.md have already specified the exact algorithm; this research confirms it is implementable with the existing `RecipeStep`, `RecipeSection`, and `StepProgress` types.

**Primary recommendation:** Implement in this order — (1) `completeStepWithSession` DB function + SQL tests, (2) `useCompleteStep` hook + invalidation tests, (3) `usePaintingModeState` + navigation tests. Each step is independently testable.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Atomic step complete + session write | Database / Storage | — | Two-table write must be atomic; belongs at query layer inside a single transaction |
| Step ordering and navigation state | Frontend (React hook) | — | Client-side derivation from already-fetched data; no new DB round-trip |
| Cache invalidation after step completion | Frontend (React Query) | — | Mutation hook owns invalidation contract; server state is the source of truth |
| Test assertions (SQL shape) | Test layer | — | Mock `getDb()` to intercept SQL calls in jsdom without Tauri bridge |
| Test assertions (navigation logic) | Test layer | — | Pure-function tests on derived state output |

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | Already installed | Mutation hook + cache invalidation | Project standard for all server state |
| `vitest` | v4 (already installed) | Test framework | Project standard per CLAUDE.md |
| `@testing-library/react` | v16 (already installed) | `renderHook` + `act` + `waitFor` | Project standard for hook tests |

**No new packages required for Phase 84.** [VERIFIED: codebase grep]

### Package Legitimacy Audit

> This phase installs zero external packages. No legitimacy audit required.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
[useCompleteStep mutation called]
        |
        v
completeStepWithSession(assignmentId, recipeStepId, sessionInput)
        |
        +-- BEGIN TRANSACTION
        |
        +-- UPSERT unit_recipe_step_progress
        |     (assignment_id, recipe_step_id, completed=1, completed_at=now())
        |
        +-- INSERT painting_sessions
        |     (unit_id, session_date, duration_minutes, notes,
        |      recipe_id, recipe_step_id, section_name, recipe_section_id)
        |
        +-- COMMIT  (or ROLLBACK if either write throws)
        |
        v
onSuccess: invalidateQueries x6
  STEP_PROGRESS_KEY(assignmentId)
  ["kanban-enrichment"]                  <-- prefix, not exact key
  UNIT_ASSIGNMENTS_KEY(unitId)
  NEXT_PAINTING_ACTION_KEY
  ["workflow-positions"]                 <-- prefix, not exact key
  DASHBOARD_STATS_KEY
        |
        v
[React Query refetches stale data across all 6 surfaces]


[usePaintingModeState(assignmentId)]
        |
        +-- useStepProgress(assignmentId)     -> StepProgress[]
        +-- useRecipePaints(recipeId)          -> RecipeStep[]
        +-- useRecipeSections(recipeId)        -> RecipeSection[]
        |
        v
useMemo: build sectionOrderMap = Map<section_id, order_index>
        |
        v
useMemo: orderedSteps = steps.sort by [sectionOrder ?? 999999, step.order_index]
        |
        v
useMemo: completedSet = new Set(progressRows.filter(p.completed === 1).map(p.recipe_step_id))
        |
        v
Initial currentStepId = orderedSteps.find(s => !completedSet.has(s.id))?.id ?? last step
        |
        v
useState(currentStepId) — controlled, changes on prev/next/jumpTo
        |
        v
Exports: { orderedSteps, currentStepId, currentIndex, completedSet,
           canGoPrev, canGoNext, goPrev, goNext, goToStep,
           sectionProgressMap }
```

### Recommended Project Structure

```
src/
  db/queries/
    recipeAssignments.ts     # +completeStepWithSession function added here
  hooks/
    useRecipeAssignments.ts  # +useCompleteStep export added here (or new file)
    usePaintingModeState.ts  # NEW — pure composition hook

tests/
  painting-mode/             # NEW directory (mirrors src/features/painting-mode/)
    completeStepWithSession.test.ts   # SQL transaction assertions
    paintingModeState.test.ts         # step ordering + navigation pure logic
    useCompleteStep.test.ts           # hook invalidation contract
```

### Pattern 1: Flat Inline SQL Transaction (completeStepWithSession)

**What:** `BEGIN TRANSACTION` → two flat `db.execute()` calls → `COMMIT`. Error path calls `ROLLBACK` and re-throws. No helper function calls inside the transaction.

**When to use:** Any time two writes to different tables must be atomic. Tauri plugin-sql does not support nested transactions, so the flat inline pattern is mandatory.

**Example (confirmed from `src/db/queries/recipeAssignments.ts` lines 153–171 and `recipes.ts` lines 131–208):**
```typescript
// Source: src/db/queries/recipeAssignments.ts (bulkCreateAssignments pattern)
export async function completeStepWithSession(
  assignmentId: number,
  recipeStepId: number,
  session: CreateSessionInput,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    // Write 1: step progress upsert (inline SQL — do NOT call upsertStepProgress)
    await db.execute(
      `INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(assignment_id, recipe_step_id) DO UPDATE SET
         completed = excluded.completed,
         completed_at = excluded.completed_at`,
      [assignmentId, recipeStepId, 1, new Date().toISOString()],
    );
    // Write 2: session insert (inline SQL — do NOT call createSession)
    await db.execute(
      `INSERT INTO painting_sessions
       (unit_id, session_date, duration_minutes, notes,
        recipe_id, recipe_step_id, section_name, recipe_section_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        session.unit_id, session.session_date, session.duration_minutes,
        session.notes ?? null, session.recipe_id ?? null, recipeStepId,
        session.section_name ?? null, session.recipe_section_id ?? null,
      ],
    );
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
```

**Critical rule:** The SQL for step progress upsert and session insert must be inlined directly — do NOT call `upsertStepProgress()` or `createSession()` inside the transaction. Those functions each call `getDb()` independently and would run outside the transaction boundary. This is the same rule documented for `saveRecipeGraph`. [VERIFIED: codebase, src/db/queries/recipes.ts comment at line 226]

### Pattern 2: Section-Aware Step Sort (usePaintingModeState)

**What:** Build a `Map<section_id, order_index>` from sections, then sort steps using `[sectionOrder ?? 999999, step.order_index]` as the composite key. Steps with `section_id = null` get order value 999999, sorting them last.

**When to use:** Whenever deriving "first incomplete step" or rendering steps in painting order. The raw DB order cannot be trusted for multi-section recipes.

**Example (confirmed from `src/db/queries/recipes.ts` lines 174–180):**
```typescript
// Source: src/db/queries/recipes.ts duplicateRecipe (existing section-aware sort)
// ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC

// Client-side equivalent for usePaintingModeState:
const sectionOrderMap = new Map(sections.map(s => [s.id, s.order_index]));
const orderedSteps = [...steps].sort((a, b) => {
  const sa = sectionOrderMap.get(a.section_id ?? -1) ?? 999999;
  const sb = sectionOrderMap.get(b.section_id ?? -1) ?? 999999;
  if (sa !== sb) return sa - sb;
  return a.order_index - b.order_index;
});
```

**Pitfall:** Using `sectionOrderMap.get(a.section_id ?? -1)` when `section_id` is null will miss the entry (no key -1 exists) and correctly fall through to the `?? 999999` fallback. This is the intended behavior.

### Pattern 3: Prefix Cache Invalidation for Parameterized Keys

**What:** `KANBAN_ENRICHMENT_KEY` and `WORKFLOW_POSITIONS_KEY` are functions that accept sorted `unitId[]` arrays and produce keys like `["kanban-enrichment", 1, 3, 7]`. At mutation time we don't know what unit ID combinations are currently cached. Prefix invalidation — invalidating `{ queryKey: ["kanban-enrichment"] }` — will match all variants.

**When to use:** Any mutation that affects data displayed by queries with variable array parameters.

**Example (confirmed from `src/hooks/useKanbanEnrichment.ts` and `src/hooks/useWorkflowPositions.ts`):**
```typescript
// Prefix invalidation — matches ["kanban-enrichment", 1, 2], ["kanban-enrichment", 5], etc.
qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
qc.invalidateQueries({ queryKey: ["workflow-positions"] });

// Exact key invalidation — key shape is known
qc.invalidateQueries({ queryKey: STEP_PROGRESS_KEY(assignmentId) });
qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(unitId) });
qc.invalidateQueries({ queryKey: NEXT_PAINTING_ACTION_KEY });
qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
```

### Pattern 4: Hook Invalidation Test Contract (makeWrapper)

**What:** Create a `QueryClient` with `retry: false`, spy on `invalidateQueries`, wrap with `QueryClientProvider`, fire mutation via `act` + `mutateAsync`, assert spy calls.

**When to use:** All mutation hook tests in this project. Defined in `tests/painting/recipeAssignments.test.ts` as `makeWrapper()`.

**Example (confirmed from `tests/painting/recipeAssignments.test.ts` lines 54–60):**
```typescript
// Source: tests/painting/recipeAssignments.test.ts
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

### Anti-Patterns to Avoid

- **Calling `upsertStepProgress()` inside `completeStepWithSession`:** Each helper calls `getDb()` independently and runs outside the transaction. Must inline the SQL.
- **Calling `createSession()` inside `completeStepWithSession`:** Same reason. Inline the INSERT.
- **Using `rs.order_index ASC` alone for step ordering:** Breaks multi-section recipes where each section restarts `order_index` at 0. Always use `COALESCE(section.order_index, 999999), step.order_index`.
- **Reusing `useToggleStepProgress` for Painting Mode step completion:** It only invalidates `STEP_PROGRESS_KEY`. The Painting Mode mutation needs a six-key invalidation set.
- **Exact key invalidation for `KANBAN_ENRICHMENT_KEY` / `WORKFLOW_POSITIONS_KEY`:** These keys embed sorted unit ID arrays. Prefix invalidation is required.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transaction atomicity | Custom two-phase commit logic | `BEGIN TRANSACTION` + flat inline SQL + `ROLLBACK` on catch | Tauri plugin-sql supports SQLite transactions natively; the `bulkCreateAssignments` and `saveRecipeGraph` patterns are already proven |
| Section-aware sort | New DB query with ORDER BY | Client-side sort using `sectionOrderMap` from already-fetched sections | Sections are already fetched for other UI purposes; a DB round-trip adds latency without value |
| Hook test infrastructure | New test harness | `makeWrapper()` from `tests/painting/recipeAssignments.test.ts` | Pattern is established, copy verbatim |

---

## Common Pitfalls

### Pitfall 1: Helper Function Calls Inside Transaction

**What goes wrong:** `completeStepWithSession` calls `upsertStepProgress(...)` and `createSession(...)` as helper functions. Both helpers call `getDb()` and run their SQL outside the transaction — the `BEGIN` wraps nothing, the transaction is a no-op.

**Why it happens:** The helpers look reusable. The constraint is invisible unless you know that `getDb()` returns the same connection but that connection's transaction context is not preserved across separate `await` chains in Tauri plugin-sql.

**How to avoid:** Inline both SQL statements directly in `completeStepWithSession`. Copy the SQL from the existing helpers; do not call them. Add a comment: "Do not extract to helpers — each getDb() call runs outside this transaction."

**Warning signs:** Test that verifies rollback on session INSERT failure passes locally but step progress row is NOT rolled back — the upsert ran before the transaction began.

### Pitfall 2: Wrong Initial Step on Multi-Section Recipes

**What goes wrong:** `usePaintingModeState` finds the first step where `completedSet.has(s.id) === false` — but if `orderedSteps` is built from unsorted data (raw DB order), the "first incomplete" may be from section 3 when section 1 has steps remaining.

**Why it happens:** `getStepProgress` returns rows ordered by `recipe_step_id ASC`, which is insertion order — not painting order. `useRecipePaints` returns steps ordered by `COALESCE(s.order_index, 999999), rs.order_index` at the SQL level, so the step array is correct IF the hook calls the right query function.

**How to avoid:** Confirm `useRecipePaints(recipeId)` calls `getRecipePaintsByRecipe(recipeId)` and that function uses the section-aware ORDER BY. If so, `orderedSteps` can simply spread the array in hook order. The `useMemo` sort is a safety net for any cases where order cannot be guaranteed from the query.

**Warning signs:** `paintingModeState.test.ts` test "multi-section recipe returns step from first incomplete section" fails. Painting Mode opens on wrong step with multi-section recipes in manual testing.

### Pitfall 3: Missing unitId in useCompleteStep Mutation Variables

**What goes wrong:** `useCompleteStep` needs to invalidate `UNIT_ASSIGNMENTS_KEY(unitId)` but the hook's `mutationFn` only receives `{ assignmentId, recipeStepId, session }`. `unitId` is not in scope.

**Why it happens:** The hook signature mirrors `useToggleStepProgress` which only takes `assignmentId`. The new hook needs an additional `unitId` in its mutation variables.

**How to avoid:** Define the mutation variables type as `{ assignmentId: number; unitId: number; recipeStepId: number; session: CreateSessionInput }`. The caller (Phase 85 UI) already has `unitId` from `getAssignment(assignmentId)`.

**Warning signs:** TypeScript error on `UNIT_ASSIGNMENTS_KEY(unitId)` in `onSuccess` — `unitId` is not in scope. Or: mutation compiles but `UNIT_ASSIGNMENTS_KEY` is never invalidated because `unitId` is hardcoded to 0.

### Pitfall 4: `initialStepId` useMemo Dependency Array

**What goes wrong:** The `initialStepId` derivation in `usePaintingModeState` uses an empty dependency array `[]` to run only on mount. If `orderedSteps` or `completedSet` are listed as dependencies, `initialStepId` recalculates every time a step is marked done — jumping the user back to the "first incomplete" step even if they deliberately navigated forward.

**Why it happens:** The linter wants `orderedSteps` and `completedSet` in the dep array. The architecture doc (ARCHITECTURE.md line 197) explicitly suppresses this with a comment.

**How to avoid:** Use `// eslint-disable-next-line react-hooks/exhaustive-deps` on the `useMemo` for `initialStepId` and document why: "intentionally run once on mount to determine entry point; navigation is then controlled state."

**Warning signs:** After marking a step done, the view resets to step 1 of the first incomplete section instead of staying on the current step.

### Pitfall 5: Prefix vs. Exact Invalidation for kanban-enrichment

**What goes wrong:** `KANBAN_ENRICHMENT_KEY(sortedIds)` returns `["kanban-enrichment", ...sortedIds]`. Invalidating with the full key requires knowing the exact sorted ID set currently in cache. Invalidating with `{ queryKey: ["kanban-enrichment"] }` (the first segment only) correctly matches all variants.

**Why it happens:** Developers copy the pattern for `STEP_PROGRESS_KEY(assignmentId)` — which takes a single scalar — and apply it to `KANBAN_ENRICHMENT_KEY`. The key shapes are different.

**How to avoid:** Always invalidate `["kanban-enrichment"]` as a raw array literal, not via the `KANBAN_ENRICHMENT_KEY()` function. Same for `["workflow-positions"]`. Add a code comment quoting D-06.

---

## Code Examples

### completeStepWithSession — Full Signature

```typescript
// Location: src/db/queries/recipeAssignments.ts
// Follows bulkCreateAssignments (line 153) + saveRecipeGraph (recipes.ts line 234) patterns
import type { CreateSessionInput } from "@/types/paintingSession";

export async function completeStepWithSession(
  assignmentId: number,
  recipeStepId: number,
  session: CreateSessionInput,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    await db.execute(
      `INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(assignment_id, recipe_step_id) DO UPDATE SET
         completed = excluded.completed,
         completed_at = excluded.completed_at`,
      [assignmentId, recipeStepId, 1, new Date().toISOString()],
    );
    await db.execute(
      `INSERT INTO painting_sessions
       (unit_id, session_date, duration_minutes, notes,
        recipe_id, recipe_step_id, section_name, recipe_section_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        session.unit_id,
        session.session_date,
        session.duration_minutes,
        session.notes ?? null,
        session.recipe_id ?? null,
        recipeStepId,
        session.section_name ?? null,
        session.recipe_section_id ?? null,
      ],
    );
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
```

### useCompleteStep — Mutation Hook with Full Invalidation Set

```typescript
// Location: src/hooks/useRecipeAssignments.ts (add after useToggleStepProgress)
import { KANBAN_ENRICHMENT_KEY } from "@/hooks/useKanbanEnrichment";
import { NEXT_PAINTING_ACTION_KEY } from "@/hooks/useNextPaintingAction";
import { WORKFLOW_POSITIONS_KEY } from "@/hooks/useWorkflowPositions";
import { DASHBOARD_STATS_KEY } from "@/hooks/useDashboardStats";
import { completeStepWithSession } from "@/db/queries/recipeAssignments";
import type { CreateSessionInput } from "@/types/paintingSession";

type CompleteStepVars = {
  assignmentId: number;
  unitId: number;
  recipeStepId: number;
  session: CreateSessionInput;
};

export function useCompleteStep() {
  const qc = useQueryClient();
  return useMutation<void, Error, CompleteStepVars>({
    mutationFn: ({ assignmentId, recipeStepId, session }) =>
      completeStepWithSession(assignmentId, recipeStepId, session),
    onSuccess: (_data, variables) => {
      // D-05: full invalidation set — do NOT reuse useToggleStepProgress
      qc.invalidateQueries({ queryKey: STEP_PROGRESS_KEY(variables.assignmentId) });
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });        // D-06: prefix
      qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(variables.unitId) });
      qc.invalidateQueries({ queryKey: NEXT_PAINTING_ACTION_KEY });
      qc.invalidateQueries({ queryKey: ["workflow-positions"] });       // D-06: prefix
      qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
    },
  });
}
```

### usePaintingModeState — Navigation Hook Sketch

```typescript
// Location: src/hooks/usePaintingModeState.ts
// D-07, D-08: pure composition from existing query hooks
import { useState, useMemo } from "react";
import { useStepProgress } from "@/hooks/useRecipeAssignments";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";
import type { StepProgress } from "@/types/recipeAssignment";

export function usePaintingModeState(assignmentId: number, recipeId: number) {
  const stepsQuery = useRecipePaints(recipeId);
  const sectionsQuery = useRecipeSections(recipeId);
  const progressQuery = useStepProgress(assignmentId);

  const steps = stepsQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const progressRows = progressQuery.data ?? [];

  // D-03: section-aware sort — COALESCE(section.order_index, 999999), step.order_index
  const sectionOrderMap = useMemo(
    () => new Map(sections.map(s => [s.id, s.order_index])),
    [sections]
  );

  const orderedSteps = useMemo(() => {
    return [...steps].sort((a, b) => {
      const sa = (a.section_id !== null ? sectionOrderMap.get(a.section_id) : undefined) ?? 999999;
      const sb = (b.section_id !== null ? sectionOrderMap.get(b.section_id) : undefined) ?? 999999;
      if (sa !== sb) return sa - sb;
      return a.order_index - b.order_index;
    });
  }, [steps, sectionOrderMap]);

  const completedSet = useMemo(
    () => new Set(progressRows.filter(p => p.completed === 1).map(p => p.recipe_step_id)),
    [progressRows]
  );

  // Initial step: first incomplete in order; fallback to last step if all complete
  const initialStepId = useMemo(() => {
    const first = orderedSteps.find(s => !completedSet.has(s.id));
    return first?.id ?? orderedSteps[orderedSteps.length - 1]?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally mount-only — navigation is controlled state thereafter

  const [currentStepId, setCurrentStepId] = useState<number | null>(initialStepId);
  const currentIndex = orderedSteps.findIndex(s => s.id === currentStepId);

  return {
    orderedSteps,
    currentStepId,
    currentIndex,
    completedSet,
    isLoading: stepsQuery.isLoading || sectionsQuery.isLoading || progressQuery.isLoading,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < orderedSteps.length - 1,
    goPrev: () => { if (currentIndex > 0) setCurrentStepId(orderedSteps[currentIndex - 1].id); },
    goNext: () => { if (currentIndex < orderedSteps.length - 1) setCurrentStepId(orderedSteps[currentIndex + 1].id); },
    goToStep: (id: number) => setCurrentStepId(id),
  };
}
```

### Test: completeStepWithSession SQL Assertions

```typescript
// Location: tests/painting-mode/completeStepWithSession.test.ts
// Pattern: GROUP 8 of tests/painting/recipeAssignments.test.ts

const executeMock = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: vi.fn(), execute: executeMock }),
}));
import { completeStepWithSession } from "@/db/queries/recipeAssignments";

beforeEach(() => {
  executeMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
});

describe("completeStepWithSession — transaction contract", () => {
  it("wraps both writes in BEGIN/COMMIT — calls execute 4 times", async () => {
    const session = { unit_id: 1, session_date: "2026-05-19", duration_minutes: 30 };
    await completeStepWithSession(5, 2, session);
    // BEGIN + upsert + insert + COMMIT = 4 calls
    expect(executeMock).toHaveBeenCalledTimes(4);
    expect(executeMock.mock.calls[0][0]).toBe("BEGIN TRANSACTION");
    expect(executeMock.mock.calls[3][0]).toBe("COMMIT");
  });

  it("ROLLBACKs if session INSERT throws — progress row not persisted", async () => {
    executeMock
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // upsert OK
      .mockRejectedValueOnce(new Error("FK violation")) // session INSERT fails
      .mockResolvedValueOnce({}); // ROLLBACK
    const session = { unit_id: 1, session_date: "2026-05-19", duration_minutes: 30 };
    await expect(completeStepWithSession(5, 2, session)).rejects.toThrow("FK violation");
    expect(executeMock.mock.calls[3][0]).toBe("ROLLBACK");
  });
});
```

### Test: paintingModeState — Step Ordering + Navigation

```typescript
// Location: tests/painting-mode/paintingModeState.test.ts
// Pure derivation tests — no DB mock needed for the sort/navigation logic

import { renderHook, act } from "@testing-library/react";
// ... mock useRecipePaints, useRecipeSections, useStepProgress with vi.mock
// Pure tests focus on: multi-section ordering, first-incomplete selection, prev/next
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `useToggleStepProgress` for all step completion (one key invalidated) | New `useCompleteStep` with 6-key invalidation set | All dependent surfaces refresh immediately |
| `getMostRecentAssignmentWithIncompleteStep` for step navigation (ignores section order) | Client-side derivation via `COALESCE(section.order_index, 999999)` sort | Multi-section recipes navigate correctly |
| Sequential `mutateAsync` for step + session write | Single `completeStepWithSession` atomic transaction | Partial failure is impossible |

---

## Assumptions Log

> List of all claims tagged `[ASSUMED]` in this research.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**All claims in this research were verified from codebase files or CONTEXT.md decisions. No user confirmation needed.**

---

## Open Questions

1. **Should `useCompleteStep` live in `useRecipeAssignments.ts` or a new file?**
   - What we know: CONTEXT.md says "exports from `src/hooks/useRecipeAssignments.ts` (or new file if it grows too large)." The current file is 116 lines.
   - What's unclear: With the new imports (`KANBAN_ENRICHMENT_KEY`, `NEXT_PAINTING_ACTION_KEY`, etc.), adding `useCompleteStep` to the existing file would add ~6 import lines and ~20 code lines.
   - Recommendation: Add to the existing file. 136 lines total stays well within the "grows too large" threshold. If Phase 87 adds more session-related hooks, extract then.

2. **Does `usePaintingModeState` need `recipeId` as an explicit parameter, or does it derive it from `assignmentId`?**
   - What we know: `getAssignment(assignmentId)` returns `{ unit_id, recipe_id, ... }`. The hook could fetch the assignment internally.
   - Recommendation: Accept both `assignmentId` and `recipeId` as parameters. Phase 85 will already have the assignment loaded at the page level; passing both keeps the hook lean. The hook signature in the architecture doc (`usePaintingModeState(assignmentId, recipeId)`) confirms this.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 84 is pure TypeScript code and tests. No external tools, services, or runtimes beyond the existing project stack.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `pnpm test -- tests/painting-mode/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-01 | `completeStepWithSession` wraps two writes in BEGIN/COMMIT; ROLLBACK on error | unit | `pnpm test -- tests/painting-mode/completeStepWithSession.test.ts` | ❌ Wave 0 |
| DL-02 | Section-aware sort: first incomplete step uses COALESCE(section.order_index, 999999) | unit | `pnpm test -- tests/painting-mode/paintingModeState.test.ts` | ❌ Wave 0 |
| DL-03 | `useCompleteStep` invalidates all 6 cache keys on success | unit | `pnpm test -- tests/painting-mode/useCompleteStep.test.ts` | ❌ Wave 0 |
| DL-04 | `usePaintingModeState` goNext/goPrev updates currentStepId; goToStep sets arbitrary step | unit | `pnpm test -- tests/painting-mode/paintingModeState.test.ts` | ❌ Wave 0 |
| TS-01 | Multi-section recipe: first incomplete step selection | unit | `pnpm test -- tests/painting-mode/paintingModeState.test.ts` | ❌ Wave 0 |
| TS-02 | Mark step complete: SQL shape, UPSERT, boolean cast, ISO timestamp | unit | `pnpm test -- tests/painting-mode/completeStepWithSession.test.ts` | ❌ Wave 0 |
| TS-03 | Prev/next navigation: canGoPrev/canGoNext bounds, goNext at end no-ops | unit | `pnpm test -- tests/painting-mode/paintingModeState.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting-mode/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/painting-mode/completeStepWithSession.test.ts` — covers DL-01, TS-02
- [ ] `tests/painting-mode/paintingModeState.test.ts` — covers DL-02, DL-04, TS-01, TS-03
- [ ] `tests/painting-mode/useCompleteStep.test.ts` — covers DL-03

No new framework config needed — existing `vitest.config.ts` and `tests/setup.ts` cover the new test directory automatically.

---

## Security Domain

> `security_enforcement` not explicitly set to false in config.json — section included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Desktop app, no auth layer |
| V3 Session Management | No | Desktop app |
| V4 Access Control | No | Single-user desktop app |
| V5 Input Validation | Yes | Zod at form layer; parameterized SQL `$1, $2` syntax throughout |
| V6 Cryptography | No | No cryptographic operations in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via `$1, $2` positional params | Tampering | Already mitigated — project uses parameterized queries exclusively; no string interpolation in SQL |
| Uncaught transaction error leaving partial state | Tampering / DoS | `ROLLBACK` in catch block re-throws — calling component shows toast, no silent data corruption |

---

## Sources

### Primary (HIGH confidence — direct codebase reading)

- `src/db/queries/recipeAssignments.ts` — `bulkCreateAssignments` transaction pattern (lines 153–171), `upsertStepProgress` SQL (lines 128–147), `getMostRecentAssignmentWithIncompleteStep` ORDER BY analysis
- `src/db/queries/recipes.ts` — `saveRecipeGraph` flat inline transaction pattern (lines 234–509); `duplicateRecipe` section-aware ORDER BY (lines 174–180)
- `src/db/queries/paintingSessions.ts` — `createSession` SQL shape (lines 20–34); `CreateSessionInput` parameters
- `src/hooks/useRecipeAssignments.ts` — `STEP_PROGRESS_KEY`, `UNIT_ASSIGNMENTS_KEY`, `ASSIGNMENTS_KEY`; `useToggleStepProgress` existing invalidation set (1 key only — D-05 pitfall confirmed)
- `src/hooks/useKanbanEnrichment.ts` — `KANBAN_ENRICHMENT_KEY` definition (parameterized with sorted unit IDs)
- `src/hooks/useNextPaintingAction.ts` — `NEXT_PAINTING_ACTION_KEY` definition
- `src/hooks/useWorkflowPositions.ts` — `WORKFLOW_POSITIONS_KEY` definition (parameterized with sorted unit IDs)
- `src/hooks/useDashboardStats.ts` — `DASHBOARD_STATS_KEY` definition
- `tests/painting/recipeAssignments.test.ts` — `makeWrapper()` helper (lines 54–60); SQL assertion patterns (GROUP 7/8); invalidation spy contract (GROUP 9–12)
- `src/types/recipeAssignment.ts` — `StepProgress` type; `completed: number` (0|1 integer)
- `src/types/recipePaint.ts` — `RecipeStep` type; `section_id: number | null`
- `src/types/paintingSession.ts` — `PaintingSession` and `CreateSessionInput` types
- `.planning/phases/84-data-layer-early-tests/84-CONTEXT.md` — all locked decisions D-01 through D-11
- `.planning/research/ARCHITECTURE.md` — `usePaintingModeState` hook design, navigation pattern, step derivation algorithm
- `.planning/research/PITFALLS.md` — Pitfalls 1–9 for Painting Mode data layer

### Secondary (MEDIUM confidence)

None — all findings derived from direct codebase analysis.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages already installed; confirmed by codebase
- Architecture: HIGH — decisions are locked in CONTEXT.md; patterns confirmed in existing files
- Pitfalls: HIGH — derived from existing code analysis and documented pitfalls research
- Test patterns: HIGH — exact reference test file exists at `tests/painting/recipeAssignments.test.ts`

**Research date:** 2026-05-19
**Valid until:** 2026-06-18 (stable domain — SQLite transactions and React Query patterns change rarely)
