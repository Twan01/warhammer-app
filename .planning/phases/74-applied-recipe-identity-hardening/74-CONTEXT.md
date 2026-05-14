# Phase 74: Applied Recipe Identity Hardening - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase changes applied recipe step progress tracking from `order_index`-keyed to `recipe_step_id`-keyed. After this phase, reordering steps in a recipe never moves or loses completion markers on any existing assignment. Requires a migration that back-fills existing progress rows by joining through recipe_sections to resolve per-section order_index values, plus updates to the query/hook/component layers that read and write step progress.

No new UI features. No new tables. Pure identity fix on the existing `unit_recipe_step_progress` table and its consumer chain.

</domain>

<decisions>
## Implementation Decisions

### Migration Back-Fill (Migration 028)
- **D-01:** SQLite cannot ALTER CONSTRAINT or DROP COLUMN, so the migration uses the table-rebuild pattern: CREATE new table with `recipe_step_id` column, INSERT...SELECT with back-fill JOIN, DROP old table, ALTER TABLE RENAME new to original name.
- **D-02:** Back-fill JOIN path: `unit_recipe_step_progress` → `unit_recipe_assignments` (get recipe_id) → `recipe_steps` (match on recipe_id AND order_index AND section_id). This disambiguates per-section order_index values in multi-section recipes.
- **D-03:** The JOIN must account for section context: progress rows carry a flat order_index, but steps have both order_index and section_id. The back-fill must reconstruct which step each progress row maps to by matching order_index within the context of the recipe's step ordering. For flat (unsectioned) recipes, section_id IS NULL and order_index is globally unique — the JOIN is straightforward.
- **D-04:** New table schema: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `assignment_id INTEGER NOT NULL REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE`, `recipe_step_id INTEGER NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE`, `completed INTEGER NOT NULL DEFAULT 0`, `completed_at TEXT`, `UNIQUE(assignment_id, recipe_step_id)`.
- **D-05:** FK on recipe_step_id with ON DELETE CASCADE — deleting a step removes its progress. This is the correct behavior: if a step no longer exists, its completion state is meaningless.

### Orphaned Progress Handling
- **D-06:** Progress rows that cannot be mapped to a valid recipe_step_id during back-fill are dropped. These represent broken data (step was deleted or recipe was restructured). Success criterion 4 requires zero-progress units stay at zero — unmapped rows are definitionally stale.
- **D-07:** The migration should log (via comment) how many rows were dropped, but since SQLite migrations are fire-and-forget SQL, this is best-effort. The Data Health page (Phase 77) will detect orphaned rows going forward.

### Query/Hook/Component Layer Updates
- **D-08:** `StepProgress` type changes `order_index: number` to `recipe_step_id: number`. Clean break — no backward compatibility shim.
- **D-09:** `upsertStepProgress(assignmentId, orderIndex, completed)` becomes `upsertStepProgress(assignmentId, recipeStepId, completed)`. The ON CONFLICT clause updates to `ON CONFLICT(assignment_id, recipe_step_id)`.
- **D-10:** `getStepProgress` query changes `ORDER BY order_index ASC` to `ORDER BY recipe_step_id ASC` (or joins to recipe_steps for display ordering — planner decides).
- **D-11:** `computeAssignmentProgress` signature changes from `steps[].order_index` + `progress[].order_index` matching to `steps[].id` + `progress[].recipe_step_id` matching. The progressMap key changes from order_index to step id.
- **D-12:** `AssignmentChecklist.tsx` changes `completedSet` from `Set<order_index>` to `Set<recipe_step_id>`, and `handleToggle` passes `step.id` instead of `step.order_index`.

### Claude's Discretion
- Migration file naming (028_*.sql)
- Whether getStepProgress orders by recipe_step_id directly or JOINs to recipe_steps for order_index-based display ordering (both are valid — planner picks based on query complexity)
- Test file structure and coverage strategy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current schema & migration patterns
- `src-tauri/migrations/021_applied_recipe_assignments.sql` — Current unit_recipe_step_progress table definition (order_index keyed, UNIQUE constraint)
- `src-tauri/migrations/018_recipe_sections.sql` — recipe_sections table (sections that group steps, relevant for back-fill disambiguation)
- `src-tauri/migrations/022_paintless_steps.sql` — Table rebuild pattern reference (recipe_paints → recipe_steps rename used same CREATE/INSERT/DROP/RENAME approach)

### Type & query layer
- `src/types/recipeAssignment.ts` — StepProgress and AssignmentProgress interfaces (must be updated)
- `src/types/recipePaint.ts` — RecipeStep interface (id, order_index, section_id — the source of truth for step identity)
- `src/db/queries/recipeAssignments.ts` — getStepProgress and upsertStepProgress functions (must be updated)

### Pure functions
- `src/lib/computeAssignmentProgress.ts` — Progress computation using order_index matching (must switch to step id matching)

### UI consumers
- `src/features/recipes/AssignmentChecklist.tsx` — Checkbox UI keyed by order_index (must switch to recipe_step_id)

### Hooks
- `src/hooks/useRecipeAssignments.ts` — useStepProgress and useToggleStepProgress hooks (mutation params change)

### Requirements
- `.planning/REQUIREMENTS.md` — DI-01 (step-id keying), DI-02 (safe back-fill migration)

### Accumulated decisions
- `.planning/STATE.md` §Accumulated Context — "order_index back-fill SQL must JOIN through recipe_sections to disambiguate per-section values"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Migration 022 (paintless steps) used the exact same table-rebuild pattern this migration needs — CREATE new, INSERT...SELECT, DROP old, RENAME
- `computeAssignmentProgress` is a pure function with existing tests — easy to update and verify
- `AssignmentChecklist.tsx` is the only UI consumer of step progress — single point of change

### Established Patterns
- Table rebuild for schema changes: CREATE TABLE new_name, INSERT INTO new_name SELECT ... FROM old_name, DROP TABLE old_name, ALTER TABLE new_name RENAME TO old_name
- ON DELETE CASCADE for FK cleanup (used throughout: assignments→progress, units→assignments)
- Boolean as `INTEGER NOT NULL DEFAULT 0` (0|1 pattern)
- `$1, $2` parameterized queries (Tauri plugin-sql requirement)
- `ON CONFLICT ... DO UPDATE SET` for upsert pattern (already used in upsertStepProgress)

### Integration Points
- `src-tauri/src/lib.rs` — Must register migration 028 in get_migrations()
- `src/hooks/useRecipeAssignments.ts` lines 91-95 — useToggleStepProgress mutation params (orderIndex → recipeStepId)
- `src/features/dashboard/DashboardPage.tsx` — May reference step progress indirectly via workflow position hooks
- `tests/painting/recipeAssignments.test.ts` — Existing tests need updating for new key
- `tests/lib/computeAssignmentProgress.test.ts` — Pure function tests need updating

</code_context>

<specifics>
## Specific Ideas

- The back-fill JOIN is the trickiest part. For multi-section recipes, order_index resets per section. The current progress table has no section context — it only stores assignment_id + order_index. The back-fill must reconstruct which step each row maps to by joining through the assignment's recipe to its steps, ordering steps globally, and matching the Nth progress row to the Nth step. This is equivalent to ROW_NUMBER() ordering.
- Consider using a CTE with ROW_NUMBER() OVER (PARTITION BY assignment_id ORDER BY section order, step order) to create a global ordinal, then match progress rows by their order_index against this global ordinal.
- Single-section and flat recipes (section_id IS NULL) are simpler — order_index maps directly to step order_index.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 74-Applied Recipe Identity Hardening*
*Context gathered: 2026-05-14*
