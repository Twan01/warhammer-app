# Phase 98: Performance Optimization - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes HobbyForge faster: lazy-loaded routes reduce initial bundle size, precise React Query invalidation avoids wasted refetches, batched Kanban enrichment eliminates O(N) per-unit queries, React.memo prevents unnecessary re-renders on high-frequency components, and batched INSERT statements reduce round-trips during sync/import operations. No new user-facing features — purely performance infrastructure.

Requirements: PERF-01 (lazy routes), PERF-02 (precise invalidation), PERF-03 (batched Kanban enrichment), PERF-04 (React.memo on hot components), DBH-04 (batched INSERTs).

</domain>

<decisions>
## Implementation Decisions

### Route Lazy Loading (PERF-01)
- **D-01:** Convert all 16 route page imports in `router.tsx` from eager static imports to `React.lazy(() => import('./page'))` dynamic imports. Each route gets its own chunk.
- **D-02:** Add a shared `Suspense` fallback at the layout route level (wrapping the `Outlet` in both `layoutRoute` and `bareLayoutRoute`). The fallback is a simple centered spinner — not a skeleton, since routes have varied layouts.
- **D-03:** TanStack Router's `component` prop accepts lazy components directly. No need for a custom wrapper or TanStack Router's own lazy mechanism — `React.lazy` is simpler and standard.

### Mutation Invalidation Precision (PERF-02)
- **D-04:** Audit all 25 hook files (272 invalidateQueries calls) and remove invalidations where the target query does NOT actually depend on the mutated data. The researcher should map each mutation to its actual data dependencies.
- **D-05:** Keep cross-domain invalidations that are genuinely needed (e.g., unit mutations → dashboard-stats is correct because dashboard aggregates unit data). Only remove provably unnecessary ones.
- **D-06:** Where possible, use `exact: true` on invalidateQueries calls to prevent broad prefix-based invalidation from hitting unrelated sub-keys.

### Kanban Enrichment Batching (PERF-03)
- **D-07:** Replace the O(N) `sortedIds.map(async (unitId) => ...)` loop in `useKanbanEnrichment.ts` with a batched SQL approach — a single query joining `recipe_assignments`, `recipe_steps`/`recipe_paints`, and `step_progress` with GROUP BY to return all unit progress in 1-2 round-trips.
- **D-08:** The existing batched fetches for recipe names (`getRecipeNamesByUnitIds`) and photo counts (`getPhotoCountsByUnitIds`) are already efficient — keep them. Only the applied recipe progress loop needs batching.

### React.memo Wrapping (PERF-04)
- **D-09:** Wrap exactly the 3 components named in requirements: `KanbanCard`, `ArmyListUnitRow`, and `CurrentFocusCard` with `React.memo`. These are rendered inside lists or boards where parent re-renders are frequent.
- **D-10:** Use shallow prop comparison (default React.memo behavior). No custom comparator needed — these components receive simple props (primitives + flat objects).

### Batched INSERT Statements (DBH-04)
- **D-11:** Identify all JS-side query files that use for-of-await INSERT loops and convert to multi-row INSERT VALUES where Tauri plugin-sql supports it. The Rust `bulk_sync_rules` already handles rules.db efficiently — this targets only the JS query layer.
- **D-12:** The researcher should identify exactly which query files have insert-per-row patterns and assess whether Tauri plugin-sql's `execute` supports multi-row VALUES syntax (it should, since it passes SQL to SQLite directly).

### Claude's Discretion
- Loading spinner design and placement (centered spinner vs. subtle indicator)
- Whether to add `displayName` to memo'd components for DevTools clarity
- Exact SQL structure for the batched Kanban enrichment query
- Whether any additional components beyond the 3 named would obviously benefit from React.memo (researcher can flag, but baseline is the 3)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — PERF-01 through PERF-04, DBH-04 requirement definitions
- `.planning/ROADMAP.md` §Phase 98 — Success criteria (5 items)

### Route Architecture
- `src/app/router.tsx` — Route tree with all 16 eager page imports (lazy loading targets)
- `src/main.tsx` — App entry point where Suspense boundary could wrap RouterProvider

### React Query Hooks (invalidation audit targets)
- `src/hooks/useUnits.ts` — 18 invalidateQueries calls, cross-domain invalidations
- `src/hooks/useArmyLists.ts` — 76 invalidateQueries calls, heaviest invalidation file
- `src/hooks/useRecipeAssignments.ts` — 25 invalidateQueries calls
- `src/hooks/useRulesSync.ts` — 22 invalidateQueries calls
- `src/hooks/useRecipes.ts` — 18 invalidateQueries calls
- All 25 files in `src/hooks/` with invalidateQueries calls

### Kanban Enrichment
- `src/hooks/useKanbanEnrichment.ts` — O(N) per-unit loop to batch (lines 37-56)
- `src/db/queries/recipeAssignments.ts` — `getAssignmentsByUnit`, `getStepProgress` (per-unit queries to batch)
- `src/db/queries/recipePaints.ts` — `getRecipePaintsByRecipe` (per-unit query in enrichment loop)

### Memo Targets
- `src/features/painting-projects/KanbanCard.tsx` — Board card (rendered N times per column)
- `src/features/units/ArmyListUnitRow.tsx` or equivalent — Army list row component
- `src/features/dashboard/CurrentFocusCard.tsx` or equivalent — Dashboard focus card

### Batch INSERT Targets
- `src/db/queries/recipes.ts` — for-of-await INSERT loops for sections/steps (lines 164+)
- `src/db/queries/` — researcher should scan all query files for similar patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `React.lazy` / `Suspense` — standard React 19 APIs, no library needed
- `React.memo` — standard React API, direct wrapper on function components
- TanStack Router `component` prop — accepts lazy components natively
- Existing batched query pattern: `getRecipeNamesByUnitIds`, `getPhotoCountsByUnitIds` — model for new batched enrichment query

### Established Patterns
- React Query hook structure: exported `ENTITY_KEY` + `useEntity()` + `useCreateEntity()` with `onSuccess` invalidation
- `queryKey` arrays with entity-specific prefixes and optional ID sub-keys
- Kanban enrichment uses sorted IDs in query key to prevent refetch on dnd-kit reorder
- DB queries use `$1, $2` positional parameters (Tauri plugin-sql requirement)

### Integration Points
- `router.tsx` — convert static imports to dynamic imports
- `layoutRoute` / `bareLayoutRoute` component wrappers — add `Suspense` boundaries
- All mutation `onSuccess` callbacks in `src/hooks/` — tighten invalidation lists
- `useKanbanEnrichment.ts` — restructure queryFn to use batched SQL
- Component files for KanbanCard, ArmyListUnitRow, CurrentFocusCard — wrap exports with `React.memo`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard React performance patterns applied to the existing codebase. The primary wins are: (1) smaller initial load via code splitting, (2) fewer wasted network calls via precise invalidation, (3) O(1) Kanban enrichment via batched SQL, (4) fewer renders via memo.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 98-Performance Optimization*
*Context gathered: 2026-05-22*
