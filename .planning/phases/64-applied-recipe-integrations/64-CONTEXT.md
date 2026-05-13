# Phase 64: Applied Recipe Integrations - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase connects the applied recipe system (Phase 62/63) with two existing surfaces: LogSessionSheet (step completion bridge) and Kanban/CurrentFocus cards (progress display). When a user logs a painting session targeting a recipe step, the corresponding applied recipe step should auto-complete. Kanban and CurrentFocus cards should show applied recipe completion progress when an assignment exists. No new tables, no new pages, no new forms — this is integration wiring and display upgrades.

</domain>

<decisions>
## Implementation Decisions

### Log Session → Step Completion Bridge (AR-05)
- **D-01:** When a user submits a LogSessionSheet with a recipe_id and recipe_step_id selected, the submit handler checks if the selected unit has an applied recipe assignment for that recipe. If yes, it auto-marks the corresponding step as completed via `useToggleStepProgress`.
- **D-02:** If the unit has NO assignment for the selected recipe, auto-create one via `useCreateAssignment` before marking the step. This prevents the "I logged it but it didn't count" confusion — the user shouldn't need to manually assign a recipe before logging work on it.
- **D-03:** The auto-completion is fire-and-forget after the session is created. If the step progress update fails, the session is still logged and a warning toast is shown (same partial-failure pattern as the existing status update in LogSessionSheet).
- **D-04:** Only the specific step logged is auto-marked completed. Earlier steps in the recipe are NOT retroactively completed — the user may work out of order, and the checklist in Phase 63 UX allows explicit toggling.

### Kanban/CurrentFocus Progress Source (AR-06)
- **D-05:** When a unit has at least one applied recipe assignment, Kanban and CurrentFocus cards show applied recipe progress instead of the session-derived `workflowPosition`. This is a progressive enhancement — units without assignments keep the existing workflowPosition display unchanged.
- **D-06:** Applied recipe progress is shown as a completion fraction alongside the recipe name (e.g., "Ultramarine Blue 8/12 steps"). This replaces the current `workflowPosition` hint text (section/step italic line) with a more concrete progress indicator.
- **D-07:** The painting_percentage progress bar remains unchanged — it's a separate concern (overall painting status, not recipe completion). Applied recipe progress is shown below it as a text line.

### Multiple Assignments Display
- **D-08:** When a unit has multiple applied recipe assignments, the card shows the most recently updated assignment (by `updated_at` or last step progress timestamp). A "+N more" suffix indicates additional assignments exist.
- **D-09:** This matches the existing pattern in CurrentFocusCard which already has `recipeName` + `extraRecipeCount` props — extend it to include completion progress.

### Dashboard Integration
- **D-10:** DashboardPage (which feeds CurrentFocusCard props) fetches applied recipe assignments for the focused unit and passes the primary assignment's progress. This uses `useAssignmentsByUnit` + `useStepProgress` + `computeAssignmentProgress` from Phase 62.
- **D-11:** KanbanBoard/KanbanCard receives applied recipe progress the same way — via parent component fetching per-unit assignment data and passing down as props.

### Claude's Discretion
- Whether to batch-fetch assignments for all Kanban units in a single query vs. per-unit hooks (performance trade-off)
- Exact visual treatment of the progress text on cards (badge vs. plain text vs. inline with recipe name)
- Whether to show a small progress bar alongside the text fraction on cards
- Loading states when assignment data is being fetched
- Cache invalidation strategy for step progress after LogSessionSheet auto-completion (likely broad ASSIGNMENTS_KEY invalidation)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 62 Data Layer (MUST READ — all hooks and types)
- `src/types/recipeAssignment.ts` — RecipeAssignment, StepProgress, AssignmentProgress types
- `src/hooks/useRecipeAssignments.ts` — 7 hooks: useAssignmentsByUnit, useCreateAssignment, useToggleStepProgress, useStepProgress, useBulkCreateAssignments
- `src/db/queries/recipeAssignments.ts` — 8 CRUD functions backing the hooks
- `src/lib/computeAssignmentProgress.ts` — Pure function returning overall + per-section breakdown

### Log Session (integration target — MUST READ)
- `src/features/dashboard/LogSessionSheet.tsx` — Form with recipe/section/step selectors; onSubmit handler is the bridge insertion point
- `src/features/dashboard/logSessionSchema.ts` — Zod schema with recipe_id, recipe_step_id, section_name fields

### Kanban (integration target — MUST READ)
- `src/features/painting-projects/KanbanCard.tsx` — Card with recipe name + workflowPosition display
- `src/features/painting-projects/KanbanBoard.tsx` — Parent that passes per-card props
- `src/features/painting-projects/PaintingProjectsPage.tsx` — Page-level data fetching for Kanban

### CurrentFocus (integration target — MUST READ)
- `src/features/dashboard/CurrentFocusCard.tsx` — Focus card with recipeName, extraRecipeCount, workflowPosition props
- `src/features/dashboard/DashboardPage.tsx` — Dashboard data fetching and prop wiring

### Workflow Position (existing pattern — READ for context)
- `src/lib/computeWorkflowPosition.ts` — Session-derived position; applied recipe progress supersedes this when assignment exists

### Recipe Steps and Sections
- `src/hooks/useRecipePaints.ts` — Step query hooks (needed for progress computation)
- `src/hooks/useRecipeSections.ts` — Section query hooks
- `src/types/recipePaint.ts` — RecipeStep with order_index and section_id

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeAssignmentProgress` (src/lib/): Returns total/completed/percentage/bySectionId — ready for card display
- `useAssignmentsByUnit` (src/hooks/): Per-unit assignment query — use in DashboardPage and KanbanBoard
- `useStepProgress` (src/hooks/): Per-assignment progress — use for progress computation
- `useToggleStepProgress` (src/hooks/): Upsert step completion — use in LogSessionSheet bridge
- `useCreateAssignment` (src/hooks/): Auto-create assignment — use when logging step for unassigned recipe
- CurrentFocusCard already accepts `recipeName`, `extraRecipeCount`, `workflowPosition` props — extend with applied progress

### Established Patterns
- LogSessionSheet partial-failure pattern: session logs first, secondary actions (status update) can fail independently with warning toast
- KanbanCard shows recipe name in metadata line + workflowPosition in italic hint — both slots can be upgraded
- CurrentFocusCard has `recipeName` + count pattern already established
- All mutations use React Query invalidation for cache consistency

### Integration Points
- LogSessionSheet.onSubmit: Insert bridge logic after `createSession.mutateAsync` succeeds, before status update
- DashboardPage: Already fetches focused unit data; add assignment + progress queries
- PaintingProjectsPage/KanbanBoard: Already fetches per-unit recipe names; add progress data
- KanbanCard: Add progress props alongside existing recipeName/workflowPosition
- CurrentFocusCard: Add progress props alongside existing recipeName/extraRecipeCount

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the roadmap success criteria. Auto-mode selected recommended defaults for all gray areas based on existing codebase patterns, Phase 62 data layer, and Phase 63 UX decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 64-Applied Recipe Integrations*
*Context gathered: 2026-05-13*
