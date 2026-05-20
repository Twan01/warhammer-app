# Phase 84: Data Layer + Early Tests - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

The transactional data operations and navigation logic that power Painting Mode. This phase delivers the query functions, React Query hooks, and pure-function test coverage — no UI components, no routes, no layout.

Requirements in scope: DL-01, DL-02, DL-03, DL-04, TS-01, TS-02, TS-03

</domain>

<decisions>
## Implementation Decisions

### Transaction Scope (DL-01)
- **D-01:** `completeStepWithSession` wraps exactly two writes in a single BEGIN/COMMIT: (1) step progress upsert via `upsertStepProgress` SQL and (2) session insert. Follows the `saveRecipeGraph` flat inline SQL pattern — no nested transactions, no helper function calls inside the transaction.
- **D-02:** The function lives in `src/db/queries/recipeAssignments.ts` alongside existing `upsertStepProgress` and `bulkCreateAssignments`.

### Section-Aware Step Ordering (DL-02)
- **D-03:** First incomplete step is derived client-side using `COALESCE(section.order_index, 999999), step.order_index` sort. The existing `getMostRecentAssignmentWithIncompleteStep` query in `recipeAssignments.ts` already orders by `rs.order_index ASC` but does NOT account for sections — the new `usePaintingModeState` hook must compute section-aware ordering from the full step list.
- **D-04:** Steps without a section (section_id = NULL) sort after all sectioned steps via the COALESCE(999999) fallback.

### Cache Invalidation (DL-03)
- **D-05:** `useCompleteStep` mutation invalidates specific keys, not broad prefix. The full invalidation set:
  - `STEP_PROGRESS_KEY(assignmentId)` — step completion state
  - `KANBAN_ENRICHMENT_KEY` — prefix invalidation (`["kanban-enrichment"]`)
  - `UNIT_ASSIGNMENTS_KEY(unitId)` — unit detail panel
  - `NEXT_PAINTING_ACTION_KEY` — dashboard next action card
  - `WORKFLOW_POSITIONS_KEY` — prefix invalidation (`["workflow-positions"]`)
  - `DASHBOARD_STATS_KEY` — dashboard stat cards
- **D-06:** `KANBAN_ENRICHMENT_KEY` and `WORKFLOW_POSITIONS_KEY` take sorted unit ID arrays, so prefix invalidation (just the first segment) is the correct approach — we don't know all active unit ID sets at mutation time.

### Navigation Hook (DL-04)
- **D-07:** `usePaintingModeState` is a standalone hook in `src/hooks/usePaintingModeState.ts`. It takes an `assignmentId` and internally composes recipe steps + step progress + section data to produce: ordered step array, current step ID, prev/next/jumpTo navigation functions, section progress summary.
- **D-08:** The hook is a pure composition layer — it fetches data via existing React Query hooks (`useStepProgress`, recipe steps query) and computes navigation state. No new DB queries needed for navigation; only `completeStepWithSession` is a new query function.

### Test Organization (TS-01, TS-02, TS-03)
- **D-09:** New tests go in `tests/painting-mode/` to mirror the planned `src/features/painting-mode/` directory.
- **D-10:** Test files: `completeStepWithSession.test.ts` (SQL assertions for the transaction), `paintingModeState.test.ts` (pure-function tests for step ordering and navigation logic), `useCompleteStep.test.ts` (hook invalidation contract).
- **D-11:** Test pattern follows `tests/painting/recipeAssignments.test.ts` — mock `getDb()` to intercept SQL calls, use `renderHook` + `invalidateQueries` spy for hook contracts.

### Claude's Discretion
- Navigation state computation (prev/next/jumpTo) implementation details — any reasonable pure-function approach works
- Whether `usePaintingModeState` uses `useMemo` or `useCallback` for derived state — standard React performance patterns apply

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Layer
- `.planning/REQUIREMENTS.md` — DL-01 through DL-04, TS-01 through TS-03 requirement definitions
- `.planning/ROADMAP.md` — Phase 84 goal, success criteria, and dependency chain
- `.planning/STATE.md` — Key architecture decisions and pitfalls for v0.2.15

### Existing Code (read before writing)
- `src/db/queries/recipeAssignments.ts` — Where `completeStepWithSession` goes; contains existing transaction pattern (`bulkCreateAssignments`) and `upsertStepProgress`
- `src/hooks/useRecipeAssignments.ts` — Existing hook patterns, cache key definitions (`STEP_PROGRESS_KEY`, `ASSIGNMENTS_KEY`), invalidation contracts
- `src/db/queries/recipes.ts` — Contains `saveRecipeGraph` with the BEGIN/COMMIT transaction pattern to follow

### Cache Keys to Invalidate
- `src/hooks/useKanbanEnrichment.ts` — `KANBAN_ENRICHMENT_KEY` definition
- `src/hooks/useNextPaintingAction.ts` — `NEXT_PAINTING_ACTION_KEY` definition
- `src/hooks/useWorkflowPositions.ts` — `WORKFLOW_POSITIONS_KEY` definition
- `src/hooks/useDashboardStats.ts` — Dashboard stats key definition

### Test Patterns
- `tests/painting/recipeAssignments.test.ts` — Reference test file for SQL assertion pattern, hook invalidation contract testing, `makeWrapper` helper

### Research
- `.planning/research/ARCHITECTURE.md` — Painting Mode architecture decisions
- `.planning/research/PITFALLS.md` — Known pitfalls to avoid

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `upsertStepProgress()` in `recipeAssignments.ts`: The SQL for step progress upsert already exists — `completeStepWithSession` wraps it in a transaction with session insert
- `bulkCreateAssignments()` in `recipeAssignments.ts`: Reference for BEGIN/COMMIT transaction pattern with try/catch rollback
- `makeWrapper()` helper in `tests/painting/recipeAssignments.test.ts`: Reusable test utility for hook invalidation testing

### Established Patterns
- All query functions use `getDb()` singleton with `$1, $2` positional params
- Mutation hooks use `useMutation` + explicit `invalidateQueries` calls in `onSuccess`
- Booleans stored as `0 | 1` integers — cast with ternary on write
- D-13 symmetry: paired mutations (create/delete) must invalidate identical key sets

### Integration Points
- New `useCompleteStep` hook exports from `src/hooks/useRecipeAssignments.ts` (or new file if it grows too large)
- New `usePaintingModeState` hook in `src/hooks/usePaintingModeState.ts` — consumed by Phase 85 UI
- `completeStepWithSession` function in `src/db/queries/recipeAssignments.ts` — consumed by the hook

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 84-Data Layer + Early Tests*
*Context gathered: 2026-05-19*
