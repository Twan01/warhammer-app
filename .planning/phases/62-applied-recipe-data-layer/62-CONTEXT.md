# Phase 62: Applied Recipe Data Layer - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase creates the applied recipe data model — schema, types, queries, hooks, and a pure completion function — so that users can assign recipes to units and track per-unit step progress. This is a pure data layer phase with TDD: no UI, no forms, no display components. The two new tables (unit_recipe_assignments, unit_recipe_step_progress) must survive the existing DELETE-all + re-INSERT recipe save pattern by keying progress on (recipe_id, order_index) rather than recipe_step_id.

</domain>

<decisions>
## Implementation Decisions

### Schema Design (AR-01)
- **D-01:** `unit_recipe_assignments` table: `id INTEGER PRIMARY KEY, unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE, recipe_id INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (datetime('now'))`. Minimal schema — no notes, active flag, or extras. UNIQUE constraint on (unit_id, recipe_id) to prevent duplicate assignments.
- **D-02:** `unit_recipe_step_progress` table: `id INTEGER PRIMARY KEY, assignment_id INTEGER NOT NULL REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE, order_index INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0, completed_at TEXT, UNIQUE(assignment_id, order_index)`. The composite key (assignment_id, order_index) identifies a step position within an assignment. `completed` is a 0|1 SQLite boolean.
- **D-03:** ON DELETE CASCADE on both FK chains: unit→assignments→progress and recipe→assignments→progress. Consistent with recipe→section→step CASCADE pattern. Deleting a unit or recipe removes all related assignments and progress automatically.
- **D-04:** No section-level progress storage. Section completion is derived from step progress by counting completed steps within each section's order_index range. Sections use DELETE-all + re-INSERT, so storing section progress would break on recipe saves.

### Progress Composite Key (carried forward from STATE.md)
- **D-05:** Step progress keyed by `(assignment_id, order_index)` — NOT by `recipe_step_id` FK. The DELETE-all + re-INSERT save pattern destroys step IDs on every recipe edit, but order_index is stable (it represents the step's position in the recipe). When a recipe is saved and steps are re-created with new IDs, existing progress records still map correctly via order_index.
- **D-06:** If steps are reordered (order_index changes), progress records may become misaligned. This is acceptable — recipe editing while tracking progress is an edge case. Phase 63 UX can warn if reordering a recipe with active assignments.

### Completion Percentage Function
- **D-07:** Pure function `computeCompletionPercentage(totalSteps: number, completedSteps: number): number` — simple ratio (completedSteps / totalSteps * 100), rounded to nearest integer. Returns 0 when totalSteps is 0.
- **D-08:** Optional sections still count in the completion percentage. Users skip steps by not marking them, not by excluding sections from the denominator. This keeps the logic simple and the percentage meaningful ("how much of this recipe have I done").
- **D-09:** Additional pure function `computeAssignmentProgress(steps: { order_index: number; section_id: number | null }[], progress: { order_index: number; completed: number }[]): { total: number; completed: number; percentage: number; bySectionId: Map<number | null, { total: number; completed: number }> }` — returns both overall and per-section breakdown. Section breakdown derived by joining steps on order_index.

### Query & Hook Layer
- **D-10:** Query module: `src/db/queries/recipeAssignments.ts` with functions: `getAssignmentsByUnit(unitId)`, `getAssignmentsByRecipe(recipeId)`, `getAssignment(id)`, `createAssignment(input)`, `deleteAssignment(id)`, `getStepProgress(assignmentId)`, `upsertStepProgress(assignmentId, orderIndex, completed)`, `bulkCreateAssignments(unitIds, recipeId)`.
- **D-11:** Hook module: `src/hooks/useRecipeAssignments.ts` with hooks: `useAssignmentsByUnit(unitId)`, `useAssignmentsByRecipe(recipeId)`, `useCreateAssignment()`, `useDeleteAssignment()`, `useStepProgress(assignmentId)`, `useToggleStepProgress()`, `useBulkCreateAssignments()`.
- **D-12:** React Query key convention: `ASSIGNMENTS_KEY = ["recipe-assignments"]`, `UNIT_ASSIGNMENTS_KEY = (unitId) => ["recipe-assignments", "by-unit", unitId]`, `RECIPE_ASSIGNMENTS_KEY = (recipeId) => ["recipe-assignments", "by-recipe", recipeId]`, `STEP_PROGRESS_KEY = (assignmentId) => ["recipe-assignments", "progress", assignmentId]`.
- **D-13:** Cache invalidation: mutations invalidate both unit-specific and recipe-specific assignment keys, plus step progress. Follow symmetry rule — create and delete invalidate the same keys.

### Type Definitions
- **D-14:** Types in `src/types/recipeAssignment.ts`: `RecipeAssignment`, `CreateRecipeAssignmentInput`, `StepProgress`, `AssignmentProgress` (the return type of computeAssignmentProgress).

### Claude's Discretion
- Migration file numbering (next available after existing migrations)
- Test file organization and specific test cases for the pure functions
- Whether to add a batch step progress query (get progress for all assignments of a unit in one query) as an optimization
- Any defensive checks in query functions (e.g., verifying recipe exists before creating assignment)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Recipe Data Layer (pattern reference)
- `src/types/recipePaint.ts` — RecipeStep interface with order_index and section_id fields
- `src/types/recipeSection.ts` — RecipeSection interface, SECTION_TYPES/TECHNIQUES/EXECUTION_MODES const arrays
- `src/db/queries/recipeSections.ts` — Section CRUD pattern (getByRecipe, create, update, delete, reorder, batch step counts)
- `src/db/queries/recipePaints.ts` — Step CRUD pattern (getByRecipe, add, remove, batch swatch query)
- `src/hooks/useRecipeSections.ts` — React Query hooks with multi-key cascade invalidation

### Existing Recipe Types
- `src/types/recipe.ts` — PaintingRecipe interface (the template being assigned to units)
- `src/types/unit.ts` — Unit interface (the target of assignments)

### Save Pattern Context
- `src/features/recipes/RecipeFormSheet.tsx` — DELETE-all + re-INSERT save pattern (why step_id FK is unstable)
- `src/lib/computeWorkflowPosition.ts` — Pure function pattern with degradation rules (architecture reference)

### Migration Layer
- `src-tauri/migrations/` — Existing migration files (for numbering the new migration)
- `src-tauri/src/lib.rs` — Migration registration in get_migrations()

### Test Patterns
- `tests/painting/recipeSections.test.ts` — Comprehensive query/hook test suite (pattern reference)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeWorkflowPosition` (src/lib/): Pure function architecture — same pattern for computeAssignmentProgress
- `getDb()` singleton (src/db/client.ts): All query modules import this; PRAGMA foreign_keys = ON enforced
- RecipeStep.order_index: The stable identifier for step position; used as the progress composite key
- Batch GROUP BY pattern (recipePaints.ts): Single query for aggregated data across recipes

### Established Patterns
- Entity/CreateInput/UpdateInput type triple (src/types/*.ts)
- ENTITY_KEY / useEntity / useMutation + invalidation pattern (src/hooks/use*.ts)
- ON DELETE CASCADE for parent-child relationships (recipe→section→step)
- $1, $2 parameterized queries (tauri-plugin-sql requirement)
- 0|1 SQLite boolean convention for `completed` field
- UNIQUE constraint for composite keys (prevents duplicate assignments)

### Integration Points
- Recipe deletion: CASCADE will automatically clean up assignments + progress
- Unit deletion: CASCADE will automatically clean up assignments + progress
- Recipe save (DELETE-all + re-INSERT steps): progress records keyed on order_index survive
- Dashboard stats hooks: may need invalidation when assignments change (Phase 64 concern, not Phase 62)

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the roadmap success criteria. This is a straightforward data layer phase following established patterns. The key design choice (composite key on order_index) was already locked in STATE.md.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 62-Applied Recipe Data Layer*
*Context gathered: 2026-05-13*
