# Phase 64: Applied Recipe Integrations - Research

**Researched:** 2026-05-13
**Domain:** React integration wiring — LogSessionSheet bridge, Kanban/CurrentFocus progress display
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Log Session → Step Completion Bridge (AR-05)**
- D-01: When a user submits LogSessionSheet with a recipe_id and recipe_step_id selected, the submit handler checks if the selected unit has an applied recipe assignment. If yes, auto-marks the corresponding step completed via `useToggleStepProgress`.
- D-02: If the unit has NO assignment for the selected recipe, auto-create one via `useCreateAssignment` before marking the step.
- D-03: Auto-completion is fire-and-forget after session is created. If step progress update fails, session is still logged and a warning toast is shown (same partial-failure pattern as existing status update).
- D-04: Only the specific step logged is auto-marked completed. Earlier steps are NOT retroactively completed.

**Kanban/CurrentFocus Progress Source (AR-06)**
- D-05: When a unit has at least one applied recipe assignment, Kanban and CurrentFocus cards show applied recipe progress instead of session-derived `workflowPosition`. Progressive enhancement — units without assignments keep existing display.
- D-06: Applied recipe progress shown as a completion fraction alongside the recipe name (e.g., "Ultramarine Blue 8/12 steps"). Replaces current `workflowPosition` hint text.
- D-07: `painting_percentage` progress bar remains unchanged — applied recipe progress shown below it as a text line.

**Multiple Assignments Display**
- D-08: When a unit has multiple assignments, card shows most recently updated assignment (by `updated_at` or last step progress timestamp). "+N more" suffix indicates additional assignments.
- D-09: Matches existing `recipeName` + `extraRecipeCount` pattern in CurrentFocusCard — extend to include completion progress.

**Dashboard Integration**
- D-10: DashboardPage fetches applied recipe assignments for the focused unit and passes the primary assignment's progress. Uses `useAssignmentsByUnit` + `useStepProgress` + `computeAssignmentProgress`.
- D-11: KanbanBoard/KanbanCard receives applied recipe progress the same way — via parent component fetching per-unit assignment data and passing down as props.

### Claude's Discretion
- Whether to batch-fetch assignments for all Kanban units in a single query vs. per-unit hooks
- Exact visual treatment of the progress text on cards (badge vs. plain text vs. inline with recipe name)
- Whether to show a small progress bar alongside the text fraction on cards
- Loading states when assignment data is being fetched
- Cache invalidation strategy for step progress after LogSessionSheet auto-completion (likely broad ASSIGNMENTS_KEY invalidation)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AR-05 | Log Session integration — logging a step auto-marks applied recipe step progress | Bridge logic in `LogSessionSheet.onSubmit` after `createSession.mutateAsync`; uses `useAssignmentsByUnit` to check, `useCreateAssignment` to auto-create, `useToggleStepProgress` to mark |
| AR-06 | Kanban/CurrentFocus progress — cards show applied recipe completion when assignment exists | New `appliedRecipeProgress` prop type; parent fetches via `useAssignmentsByUnit` + `useStepProgress` + `computeAssignmentProgress`; supersedes workflowPosition when assignment exists |
</phase_requirements>

---

## Summary

Phase 64 is pure integration wiring — no new tables, no new pages, no new forms. It connects the Phase 62 data layer (assignments + step progress) to two existing surfaces: LogSessionSheet (step completion bridge) and Kanban/CurrentFocusCard (progress display).

The Phase 62 data layer is complete and verified. Every hook needed (`useAssignmentsByUnit`, `useCreateAssignment`, `useToggleStepProgress`, `useStepProgress`) and every pure function (`computeAssignmentProgress`) already exist and are tested. The integration points are well-defined and narrow.

The two integration concerns are architecturally independent:
1. **AR-05** (LogSessionSheet bridge): add async logic to the existing `onSubmit` handler following the established partial-failure pattern already used for status updates.
2. **AR-06** (Kanban/CurrentFocus display): add new props to KanbanCard and CurrentFocusCard; parent components fetch and compute progress data, then pass it down.

**Primary recommendation:** Follow the partial-failure pattern for AR-05 (session always succeeds first, bridge side-effects can fail with warning toast). For AR-06, batch-fetch assignment progress in `useKanbanEnrichment` alongside the existing recipe name fetch — this avoids N+1 query patterns.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Step auto-completion on session log | API / Backend (SQLite) | Frontend (React) | Mutation calls SQLite via Tauri plugin-sql; React owns the trigger logic |
| Auto-create assignment when missing | API / Backend (SQLite) | Frontend (React) | createAssignment writes to SQLite; React decides when to call it |
| Progress fraction display on Kanban | Frontend (React) | — | Pure prop-passing from parent; no new DB queries beyond existing hooks |
| Progress display on CurrentFocusCard | Frontend (React) | — | DashboardPage already fetches focus unit data; add parallel query |
| Batch assignment fetch for Kanban | API / Backend (SQLite) | Frontend (React) | Extend useKanbanEnrichment query to include assignment data |

---

## Standard Stack

All required libraries are already installed and in use. No new dependencies needed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.x | Server state, caching, invalidation | Project standard for all SQLite data |
| tauri-plugin-sql | 2.x | SQLite bridge | Project requirement |
| sonner | 1.x | Toast notifications | Project standard (used in LogSessionSheet partial-failure pattern) |
| react | 19.x | UI framework | Project base |

[VERIFIED: codebase grep — all imports confirmed in existing files]

**No installation step required** — this phase adds no new dependencies.

---

## Architecture Patterns

### System Architecture Diagram

```
[User submits LogSessionSheet]
        ↓
[onSubmit: createSession.mutateAsync()]  ← session always written first
        ↓
[AR-05 Bridge: if recipe_id + recipe_step_id selected]
        ↓
[useAssignmentsByUnit(unit_id)] → assignment found? → useToggleStepProgress(assignmentId, orderIndex)
                                → not found?     → useCreateAssignment() → useToggleStepProgress()
        ↓
[partial failure: warn toast, close sheet]   [success: close sheet]


[DashboardPage load]
        ↓
[useAssignmentsByUnit(focusUnitId)]
        ↓
[useStepProgress(primaryAssignment.id)]
        ↓
[computeAssignmentProgress(steps, progress)] → { completed, total, percentage }
        ↓
[CurrentFocusCard: appliedProgress prop] ← replaces workflowPosition when present


[KanbanBoard load]
        ↓
[useKanbanEnrichment(activeUnitIds)] — extended to include assignment progress
        ↓  (batch query, Map<unitId, AppliedProgress>)
[KanbanColumn → KanbanCard: appliedProgress prop]
```

### Recommended Project Structure

No structural changes required. All new files fit existing layout:

```
src/
  features/dashboard/
    LogSessionSheet.tsx        # AR-05: bridge logic added to onSubmit
    CurrentFocusCard.tsx       # AR-06: new appliedProgress prop
    DashboardPage.tsx          # AR-06: fetch + pass appliedProgress
  features/painting-projects/
    KanbanCard.tsx             # AR-06: new appliedProgress prop
    KanbanColumn.tsx           # AR-06: pass-through for new prop
    KanbanBoard.tsx            # AR-06: pass appliedProgress from enrichment
  hooks/
    useKanbanEnrichment.ts     # AR-06: extended to batch-fetch assignment progress
  types/
    recipeAssignment.ts        # No changes needed — AssignmentProgress type exists
```

### Pattern 1: LogSessionSheet Partial-Failure Bridge

**What:** After `createSession.mutateAsync` succeeds, attempt secondary side-effects (step completion). If the side-effect fails, show a warning toast and close — session data is not rolled back.

**When to use:** Any secondary mutation that should not block the primary action.

**Current implementation (existing status update — lines 182–194):**
```typescript
// Source: src/features/dashboard/LogSessionSheet.tsx
if (values.new_status) {
  try {
    await updateUnit.mutateAsync({ id: values.unit_id, status_painting: values.new_status });
  } catch {
    toast.warning("Session logged but status update failed.");
    onClose();
    return;
  }
}
toast.success(values.new_status ? "Session logged and status updated." : "Session logged.");
onClose();
```

**AR-05 bridge insertion point:** After `createSession.mutateAsync()` succeeds (line ~175) and before the status update block (line ~182). The bridge runs only when `values.recipe_id != null && values.recipe_step_id != null`.

**AR-05 bridge pseudocode:**
```typescript
// Insert between session creation and status update
if (values.recipe_id != null && values.recipe_step_id != null) {
  try {
    // Check for existing assignment
    const assignments = await getAssignmentsByUnit(values.unit_id);
    // Note: getAssignmentsByUnit returns RecipeAssignment[] — filter by recipe_id
    let assignment = assignments.find(a => a.recipe_id === values.recipe_id);
    if (!assignment) {
      // D-02: auto-create assignment
      const newId = await createAssignment.mutateAsync({
        unit_id: values.unit_id,
        recipe_id: values.recipe_id
      });
      assignment = { id: newId, unit_id: values.unit_id, recipe_id: values.recipe_id, created_at: "" };
    }
    // D-04: mark only the specific step logged
    // recipe_step_id is the step's id; need its order_index for upsertStepProgress
    const step = recipeSteps.find(s => s.id === values.recipe_step_id);
    if (step) {
      await toggleStepProgress.mutateAsync({
        assignmentId: assignment.id,
        orderIndex: step.order_index,
        completed: true
      });
    }
  } catch {
    toast.warning("Session logged but step progress update failed.");
    onClose();
    return;
  }
}
```

**Critical implementation note:** The bridge needs `recipeSteps` (already fetched via `useRecipePaints`) to look up `order_index` from `recipe_step_id`. The `recipeSteps` array is already in scope via `const { data: recipeSteps = [] } = useRecipePaints(...)` in LogSessionSheet.

### Pattern 2: Applied Progress Props on Cards

**What:** Parent fetches progress data, computes summary, passes as optional prop to cards. Cards render progress fraction when prop is present; fall back to workflowPosition or getNextActionHint when absent.

**AppliedProgress type (new):** Add to `src/types/recipeAssignment.ts` or define inline in the hook:
```typescript
export interface AppliedRecipeProgress {
  recipeName: string;
  completed: number;
  total: number;
  assignmentCount: number;  // total assignments (for "+N more")
}
```

**CurrentFocusCard prop addition:**
```typescript
export interface CurrentFocusCardProps {
  // ... existing props ...
  appliedProgress?: AppliedRecipeProgress | null;
}
```

**KanbanCard prop addition:**
```typescript
export interface KanbanCardProps {
  // ... existing props ...
  appliedProgress?: AppliedRecipeProgress | null;
}
```

**D-05 superseding logic in card render:**
```typescript
// Applied recipe progress supersedes workflowPosition when present
{appliedProgress ? (
  <p className="mt-1 truncate text-xs text-muted-foreground/70">
    {appliedProgress.recipeName}: {appliedProgress.completed}/{appliedProgress.total} steps
    {appliedProgress.assignmentCount > 1 ? ` (+${appliedProgress.assignmentCount - 1} more)` : ""}
  </p>
) : workflowPosition ? (
  // ... existing workflowPosition render ...
) : unit.status_painting !== "Completed" ? (
  // ... existing getNextActionHint ...
) : null}
```

### Pattern 3: Batch Assignment Progress in useKanbanEnrichment

**Decision: batch-fetch in useKanbanEnrichment** (Claude's Discretion recommendation — see Pitfall 3 below)

**What:** Extend `useKanbanEnrichment` to also fetch assignment data for all active units in one query pass.

**Why:** The existing enrichment hook already demonstrates the correct pattern: batch by sorted unit IDs, return a Map, share via parent → column → card prop chain. Adding assignment progress here avoids N per-unit hook calls in individual cards.

**Extended KanbanEnrichment type:**
```typescript
export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
  appliedProgress: Map<number, AppliedRecipeProgress>;  // NEW
}
```

**Query extension:** `getAssignmentsByUnit` is per-unit — to batch, either:
- Option A: Loop over `sortedIds` inside the existing `queryFn` (sequential but simple)
- Option B: Add a new `getAssignmentsByUnitIds(unitIds[])` bulk query to `recipeAssignments.ts`

Option A is simpler and sufficient for typical Kanban board sizes (5-20 units). The SQLite queries are fast locally. Option B is premature optimization.

**Note for DashboardPage (D-10):** DashboardPage only needs progress for the single focus unit, so it uses `useAssignmentsByUnit(focusUnitId)` + `useStepProgress(primaryAssignment?.id)` + `computeAssignmentProgress()` called directly in the page — no enrichment hook involved.

### Anti-Patterns to Avoid

- **Per-card hooks in KanbanCard:** Do NOT call `useAssignmentsByUnit` inside KanbanCard. This creates N hooks for N cards, causing N independent queries and potential React hook count instability when card count changes. Parent batch-fetches and passes props down.
- **Blocking session on bridge failure:** The bridge MUST be fire-and-forget. Session creation must not be undone or blocked if the step progress upsert fails.
- **Calling `mutateAsync` inside bridge without try/catch:** Without try/catch, an unhandled rejection will propagate up and may crash the submit handler.
- **Using `useAssignmentsByUnit` inside `onSubmit`:** Hooks cannot be called inside event handlers. The assignments data must be fetched at component level and accessed in the submit handler via closure (or use `queryClient.fetchQuery` as an imperative fallback).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step completion upsert | Custom INSERT | `useToggleStepProgress` / `upsertStepProgress` | ON CONFLICT DO UPDATE logic is already correct; hand-rolling risks duplicate row bugs |
| Assignment existence check | Custom query | `useAssignmentsByUnit` (data in component scope) | Already cached by React Query; avoid extra round-trips |
| Progress computation | Custom loop | `computeAssignmentProgress(steps, progress)` | Pure function handles Map construction, null section_id edge cases, stale record filtering |
| Toast notifications | Custom notification | `sonner` toast | Project standard; consistent UX |
| Cache invalidation | Manual setQueryData | `qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY })` | Broad prefix invalidation ensures Kanban, CurrentFocusCard, and checklist all refresh |

**Key insight:** Every primitive this phase needs already exists. The work is wiring, not building.

---

## Common Pitfalls

### Pitfall 1: Hook in Event Handler
**What goes wrong:** Attempting to call `useAssignmentsByUnit` inside `onSubmit` to check for an existing assignment.
**Why it happens:** Wanting to check at submit time whether an assignment exists before the bridge logic runs.
**How to avoid:** The `assignments` data must be fetched at component render time via `useAssignmentsByUnit(watchedUnitId)`. The submit handler accesses it via closure. The `watchedUnitId` is already available via `form.watch("unit_id")`.
**Warning signs:** TypeScript error "hooks can only be called inside function components."

### Pitfall 2: Wrong Key for order_index
**What goes wrong:** Passing `values.recipe_step_id` (the step's database ID) as the `orderIndex` argument to `useToggleStepProgress`, instead of `step.order_index`.
**Why it happens:** `recipe_step_id` is in scope; `order_index` requires a lookup.
**How to avoid:** `upsertStepProgress` stores `order_index` as the composite key (alongside `assignment_id`). The step ID is used for display, not for progress tracking. Always look up the step from `recipeSteps` to get `order_index`.
**Warning signs:** Progress rows are created with wrong indices; the AssignmentChecklist does not show the step as complete.

### Pitfall 3: N+1 Assignment Queries in Kanban
**What goes wrong:** Calling `useAssignmentsByUnit` inside `KanbanCard` renders N independent queries for N Kanban cards.
**Why it happens:** Looks clean per-card; mirrors per-unit recipe name lookup.
**How to avoid:** Extend `useKanbanEnrichment` to batch-fetch assignments for all active units in one pass. Pass `appliedProgress` as a prop, same as `recipeName` and `photoCount`.
**Warning signs:** React DevTools shows N separate `["recipe-assignments", "by-unit", X]` queries firing on Kanban mount.

### Pitfall 4: Missing ASSIGNMENTS_KEY Invalidation After Bridge
**What goes wrong:** After `useToggleStepProgress` runs, the Kanban and CurrentFocusCard still show stale 0/N progress because the enrichment query is not invalidated.
**Why it happens:** `useToggleStepProgress.onSuccess` only invalidates `STEP_PROGRESS_KEY(assignmentId)`. The enrichment query that derives `AppliedRecipeProgress` for cards is keyed differently.
**How to avoid:** After the bridge completes, also invalidate `ASSIGNMENTS_KEY` (broad prefix) so all derived views refresh. Add this to the bridge's try block success path. Alternatively, ensure `useKanbanEnrichment` and the DashboardPage query are listening to keys that `useToggleStepProgress` already invalidates.
**Warning signs:** Progress counter on card does not update after logging a session with a step.

### Pitfall 5: getAssignmentsByUnit is Async — Don't Access React Query Cache Directly
**What goes wrong:** Using `queryClient.getQueryData(UNIT_ASSIGNMENTS_KEY(unitId))` to synchronously access the assignments cache in `onSubmit`.
**Why it happens:** Seems like a shortcut to avoid re-fetching.
**How to avoid:** Either (a) keep the `useAssignmentsByUnit` hook at component level and watch the unit_id field so data is pre-fetched, or (b) use `queryClient.fetchQuery` in the submit handler for an imperative fetch. Option (a) is simpler. Watch `unit_id` with `form.watch("unit_id")` and pass that to `useAssignmentsByUnit`.
**Warning signs:** Bridge fires but `assignments` is undefined; TypeScript warning about accessing potentially stale cache.

### Pitfall 6: Multiple Assignments — "Most Recently Updated" Sort
**What goes wrong:** Using `ORDER BY created_at ASC` (existing `getAssignmentsByUnit` query) and picking `assignments[0]` as the "primary" assignment means oldest, not most recently updated.
**Why it happens:** D-08 specifies the most recently updated assignment should be shown on cards. The existing query orders by `created_at ASC`.
**How to avoid:** When deriving the primary assignment from a unit's assignment list, pick the one with the latest step progress `completed_at` (from `useStepProgress` data) or the latest assignment `created_at` as fallback. Do not blindly use `assignments[0]`.
**Warning signs:** Card shows an outdated recipe instead of the one most recently worked on.

---

## Code Examples

### Example 1: AR-05 Bridge — units_id watch for pre-fetched assignments

```typescript
// Source: Verified from LogSessionSheet.tsx + useRecipeAssignments.ts
// Add at component level (near existing watchedRecipeId):
const watchedUnitId = form.watch("unit_id");
const { data: unitAssignments = [] } = useAssignmentsByUnit(
  watchedUnitId > 0 ? watchedUnitId : undefined
);

// In onSubmit, after createSession.mutateAsync succeeds:
if (values.recipe_id != null && values.recipe_step_id != null) {
  try {
    const step = recipeSteps.find(s => s.id === values.recipe_step_id);
    if (step) {
      let assignment = unitAssignments.find(a => a.recipe_id === values.recipe_id);
      if (!assignment) {
        const newId = await createAssignment.mutateAsync({
          unit_id: values.unit_id,
          recipe_id: values.recipe_id,
        });
        // assignment id for toggleStepProgress
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
    }
  } catch {
    toast.warning("Session logged but step progress update failed.");
    onClose();
    return;
  }
}
```

### Example 2: AR-06 — Kanban progress display in KanbanCard

```typescript
// Source: Verified from KanbanCard.tsx render logic + context decisions D-05, D-06, D-07
// New prop in KanbanCardProps:
//   appliedProgress?: AppliedRecipeProgress | null

// Replace the workflowPosition block (lines ~112-129 in KanbanCard.tsx):
{appliedProgress ? (
  <p className="mt-1 truncate text-xs text-muted-foreground/70">
    {appliedProgress.recipeName}: {appliedProgress.completed}/{appliedProgress.total} steps
    {appliedProgress.assignmentCount > 1
      ? ` (+${appliedProgress.assignmentCount - 1} more)`
      : ""}
  </p>
) : workflowPosition ? (
  <p className="mt-1 truncate text-xs italic text-muted-foreground/70">
    {"→"}{" "}{/* existing workflowPosition render unchanged */}
  </p>
) : unit.status_painting !== "Completed" ? (
  <p className="mt-1 text-xs italic text-muted-foreground/70">
    {"→"} {getNextActionHint(unit.status_painting)}
  </p>
) : null}
```

### Example 3: AR-06 — KanbanEnrichment extension

```typescript
// Source: Verified from useKanbanEnrichment.ts pattern
export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
  appliedProgress: Map<number, AppliedRecipeProgress>;  // NEW
}

// Inside queryFn, after existing Promise.all:
const assignmentProgressMap = new Map<number, AppliedRecipeProgress>();
await Promise.all(
  sortedIds.map(async (unitId) => {
    const assignments = await getAssignmentsByUnit(unitId);
    if (assignments.length === 0) return;
    // Pick primary: most recently created (first pass; refined per D-08)
    const primary = assignments[assignments.length - 1];
    // Need recipe name — already in recipeRows
    const recipeName = new Map(recipeRows.map(r => [r.unit_id, r.name])).get(unitId) ?? "";
    // Fetch step progress for primary assignment
    const progress = await getStepProgress(primary.id);
    // Fetch steps to compute total (reuse from recipe name lookup or add getRecipePaintsByRecipe)
    // ... computeAssignmentProgress(steps, progress) ...
    assignmentProgressMap.set(unitId, {
      recipeName,
      completed: progressSummary.completed,
      total: progressSummary.total,
      assignmentCount: assignments.length,
    });
  })
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No session-to-progress bridge | Auto-bridge on session submit | Phase 64 (this phase) | Logging a step automatically advances recipe progress |
| Session-derived workflowPosition on cards | Applied recipe progress supersedes workflowPosition | Phase 64 (this phase) | More accurate, concrete progress indicator |

**No deprecated patterns in this phase** — all existing display logic (workflowPosition, getNextActionHint) is preserved as fallback for units without assignments.

---

## Open Questions

1. **How to efficiently get recipe name for Kanban enrichment progress?**
   - What we know: `getRecipeNamesByUnitIds` is already called in `useKanbanEnrichment`. It returns `{ unit_id, id, name }` per unit.
   - What's unclear: The recipe name on the assignment card should be the recipe assigned (from `unit_recipe_assignments.recipe_id`), which may differ from the recipe associated with the unit via the recipes table if a unit has multiple recipes.
   - Recommendation: In `useKanbanEnrichment`, use `getAssignmentsByUnit` to find the primary assignment's `recipe_id`, then look up the recipe name from a separate query or from the existing `recipeRows` map. A new `getRecipeById(recipeId)` query or a bulk `getRecipesByIds(ids[])` may be needed. The existing `getRecipeNamesByUnitIds` returns only one recipe per unit (the one directly associated via `unit_recipe_assignments`).

2. **Should `useAssignmentsByUnit` be called with `watchedUnitId = 0` before a unit is selected?**
   - What we know: `useAssignmentsByUnit` is `enabled: unitId !== undefined`. Passing `0` would be falsy but not `undefined`.
   - What's unclear: Whether calling with `0` causes an unwanted query.
   - Recommendation: Guard with `watchedUnitId > 0 ? watchedUnitId : undefined` to match the hook's expected enabled condition.

---

## Environment Availability

Step 2.6: SKIPPED — phase is pure code/config changes with no external dependencies beyond the existing project stack.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test -- tests/dashboard/ tests/painting/ tests/applied-recipes/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AR-05 | LogSessionSheet auto-marks step complete when recipe+step selected and assignment exists | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | Partial — existing file needs new test cases |
| AR-05 | LogSessionSheet auto-creates assignment and marks step when no assignment exists | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | Partial — new test cases needed |
| AR-05 | LogSessionSheet shows warning toast if step progress fails but still closes sheet | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | New test case needed |
| AR-05 | Bridge skipped when recipe_id or recipe_step_id is null | unit | `pnpm test -- tests/painting/logSessionSheet.test.tsx` | New test case needed |
| AR-06 | KanbanCard shows applied recipe fraction when appliedProgress prop provided | unit | `pnpm test -- tests/painting/KanbanCard.test.tsx` | Partial — new test cases needed |
| AR-06 | KanbanCard uses workflowPosition when appliedProgress is null | unit | `pnpm test -- tests/painting/KanbanCard.test.tsx` | Existing test covers workflowPosition path |
| AR-06 | CurrentFocusCard shows applied recipe fraction when appliedProgress prop provided | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx` | Partial — new test cases needed |
| AR-06 | CurrentFocusCard uses workflowPosition when appliedProgress is null (no regression) | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx` | Existing test covers this |
| AR-06 | KanbanEnrichment includes appliedProgress in returned map | unit | `pnpm test -- tests/painting/useKanbanEnrichment.test.tsx` | Partial — new test cases needed |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/logSessionSheet.test.tsx tests/painting/KanbanCard.test.tsx tests/dashboard/CurrentFocusCard.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. Test cases are additions to existing test files, not new files.

---

## Security Domain

This phase introduces no new authentication, authorization, session management, input validation beyond existing schema, or cryptographic operations. All data operations are local SQLite via the established Tauri plugin-sql pathway.

Security enforcement applies only to the existing ASVS categories already covered by the codebase. No new threat surface introduced.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getAssignmentsByUnit` returns all assignments for a unit ordered by `created_at ASC`, so `assignments[assignments.length - 1]` is most recently created | Code Examples, Pitfall 6 | Could show wrong primary assignment on cards; fix: add `ORDER BY created_at DESC` query variant |
| A2 | The step's `order_index` from `recipeSteps` (already in scope in LogSessionSheet) is stable and correct for `upsertStepProgress` | Pattern 1, Common Pitfalls | If order_index has been reordered since the step was created, progress would map to wrong step; D-06 accepts this as known edge case |
| A3 | `recipeRows` from `getRecipeNamesByUnitIds` in `useKanbanEnrichment` returns the recipe that IS the applied recipe assignment — i.e., a unit's recipe FK directly matches its assignment's recipe_id | Code Examples (Example 3) | May not be true if a unit has multiple recipes; the "primary recipe" for enrichment display might differ from the assignment's recipe. Needs verification against `getRecipeNamesByUnitIds` query. |

**If A3 is wrong:** The enrichment extension needs to look up recipe names from assignment data rather than the existing `recipeRows` map.

---

## Sources

### Primary (HIGH confidence)
- `src/features/dashboard/LogSessionSheet.tsx` — full source verified; onSubmit pattern, watchedRecipeId, recipeSteps already in scope
- `src/hooks/useRecipeAssignments.ts` — all 7 hooks verified: mutation signatures, cache key structure, invalidation contract
- `src/lib/computeAssignmentProgress.ts` — verified: accepts steps + progress arrays, returns `{ total, completed, percentage, bySectionId }`
- `src/db/queries/recipeAssignments.ts` — verified: `upsertStepProgress` uses `ON CONFLICT DO UPDATE SET` (preserves row ID), `createAssignment` returns `lastInsertId`
- `src/features/painting-projects/KanbanCard.tsx` — verified: workflowPosition block location, recipeName display location, existing prop interface
- `src/features/dashboard/CurrentFocusCard.tsx` — verified: `recipeName`, `extraRecipeCount`, `workflowPosition` props, render order
- `src/features/dashboard/DashboardPage.tsx` — verified: `focusWorkflowPositions`, `focusRecipes` query patterns, `CurrentFocusCard` prop wiring
- `src/features/painting-projects/KanbanBoard.tsx` — verified: `useKanbanEnrichment` + `useWorkflowPositions` pattern; enrichment passed through KanbanColumn
- `src/hooks/useKanbanEnrichment.ts` — verified: `KanbanEnrichment` type, Promise.all batch pattern, staleTime

### Secondary (MEDIUM confidence)
- `tests/painting/logSessionSheet.test.tsx` — existing test patterns for mocking hooks, confirmed partial-failure paths not yet tested
- `tests/painting/KanbanCard.test.tsx` — confirmed workflowPosition test structure; appliedProgress tests need addition
- `tests/dashboard/CurrentFocusCard.test.tsx` — confirmed DATA-06 pattern (recipeName + extraRecipeCount tests)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present and in use
- Architecture: HIGH — all integration points verified by reading actual source files
- Pitfalls: HIGH — derived from direct code inspection, not speculation
- Test map: HIGH — existing test files confirmed, gap analysis based on actual test contents

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable codebase, no fast-moving dependencies)
