# Phase 60: Kanban & CurrentFocus Integration - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add section-aware workflow context to KanbanCard and CurrentFocusCard so users know exactly where they are in a multi-section recipe. A shared pure function derives workflow position from the last logged painting session's step — no explicit completion tracking. Cards degrade gracefully when no recipe, no sessions, or no sections exist, preserving existing fallback hints.

</domain>

<decisions>
## Implementation Decisions

### Workflow Position Logic
- **D-01:** Pure function `computeWorkflowPosition(lastSessionStepId, sections, steps)` returns `{ sectionName, sectionIndex, totalSections, stepName, stepIndex, totalSteps }` or null when position cannot be determined
- **D-02:** Position is derived from the last logged session's `recipe_step_id` — find which section contains that step, compute its index within the section, and compute section index within the recipe
- **D-03:** "Next step" is the step immediately after the last logged step (stepIndex + 1 within the same section, or first step of the next section if at section end)
- **D-04:** When last session has no `recipe_step_id` but has `section_name`, show section-level position only (no step detail)
- **D-05:** When last session has neither `recipe_step_id` nor `section_name`, return null — card falls back to existing hints

### Display Format
- **D-06:** KanbanCard shows compact inline format: `"SectionName: NextStepName"` below the existing recipe name — only when workflow position is available
- **D-07:** CurrentFocusCard shows full format matching success criterion: `"SectionName: Technique — step N/M"` with section_type context when available
- **D-08:** Step count format is `step N/M` where N is the current step index (1-based) within the section and M is the total steps in that section
- **D-09:** When recipe is fully completed (last step of last section logged), show "Complete" or similar indicator instead of next step

### Data Fetching Strategy
- **D-10:** Batch at page level following `useKanbanEnrichment` and `useLatestUnitPhotos` patterns — one query per data type, build `Map<unitId, WorkflowPosition>`, prop-drill to cards
- **D-11:** New hook `useWorkflowPositions(unitIds)` fetches all needed data (recipes by unit, sections per recipe, steps per recipe, latest session per unit) and returns the Map
- **D-12:** The hook internally calls `computeWorkflowPosition` for each unit — the pure function is testable independently, the hook handles the data assembly
- **D-13:** Sections and steps are fetched via existing `getRecipeSectionsByRecipeId` and `getRecipeStepsByRecipeId` queries — no new query layer needed
- **D-14:** Latest session per unit uses existing `getSessionsByUnit` query (take the most recent by `session_date DESC` with a `recipe_step_id` or `section_name`)

### Graceful Degradation
- **D-15:** No recipe linked to unit → show existing `getNextActionHint()` status-based hints (unchanged)
- **D-16:** Recipe linked but no sessions logged → show recipe name only (current behavior, unchanged)
- **D-17:** Recipe linked, sessions logged, but recipe has no sections (flat recipe) → show step-level position only (step N/M of flat step list)
- **D-18:** Recipe linked, sessions logged, sections exist → full workflow display (section + step)
- **D-19:** All workflow display is additive — never removes existing information from cards

### Claude's Discretion
- Internal data structures for the Map value type and intermediate representations
- Whether `computeWorkflowPosition` lives in `src/lib/` or `src/features/painting-projects/`
- Exact Tailwind classes and typography for workflow context display
- Whether to show section progress (e.g., "section 2/4") alongside step progress
- Query optimization decisions (single vs multiple queries for batch loading)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PROJ-01 through PROJ-05 define the five Kanban/CurrentFocus integration requirements

### Phase Dependencies
- `.planning/phases/57-schema-data-layer/57-CONTEXT.md` — Schema decisions: `section_name` on `painting_sessions`, `RecipeSection` type with workflow metadata
- `.planning/phases/58-recipe-form-timeline-display/58-CONTEXT.md` — Timeline badge design, progressive disclosure rules
- `.planning/phases/59-session-section-cascade/59-CONTEXT.md` — Session cascade selector, `section_name` save logic, denormalization pattern

### Components to Modify
- `src/features/painting-projects/KanbanCard.tsx` — Add workflow section/step context below recipe name
- `src/features/dashboard/CurrentFocusCard.tsx` — Add section-aware next action guidance

### Data Layer (ready to use)
- `src/types/paintingSession.ts` — `PaintingSession` with `section_name`, `recipe_id`, `recipe_step_id`
- `src/types/recipeSection.ts` — `RecipeSection` with `section_type`, `technique`, `execution_mode`
- `src/types/recipePaint.ts` — `RecipeStep` with `section_id` for section→step mapping
- `src/db/queries/paintingSessions.ts` — `getSessionsByUnit()` for latest session lookup
- `src/db/queries/recipes.ts` — `getRecipeNamesByUnitIds()` for recipe-unit linking

### Hooks (existing)
- `src/hooks/useKanbanEnrichment.ts` — Batch enrichment pattern: page-level query, builds Map, prop-drills
- `src/hooks/useRecipeSections.ts` — `useRecipeSections(recipeId)` for section data
- `src/hooks/useRecipePaints.ts` — `useRecipePaints(recipeId)` for step data with `section_id`

### Existing Utilities
- `src/features/dashboard/getNextActionHint.ts` — Status-based fallback hints (preserved as degraded display)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useKanbanEnrichment(unitIds)` hook — page-level batch pattern that builds `Map<unitId, enrichmentData>`. New `useWorkflowPositions` follows same architecture.
- `useLatestUnitPhotos(unitIds)` — another page-level batch hook confirming the Map pattern
- `getNextActionHint(status)` — existing fallback that remains for units without workflow context
- `getRecipeNamesByUnitIds(unitIds)` — existing batch query for recipe→unit linking
- `getSessionsByUnit(unitId)` — returns sessions with `section_name` and `recipe_step_id`

### Established Patterns
- Page-level `Map<compositeKey, T>` for batch data — prevents N+1 hooks per card
- Prop-drilling enrichment data from page to card components
- `useLatestUnitPhotos` pattern: single hook at DashboardPage level, results passed to CurrentFocusCard and ActiveProjectsPanel
- Conditional rendering: workflow context only renders when data exists (matches recipe name conditional)

### Integration Points
- `PaintingProjectsPage.tsx` → calls `useWorkflowPositions(unitIds)` → passes Map to KanbanBoard → KanbanCard
- `DashboardPage.tsx` → calls `useWorkflowPositions([focusUnitId])` → passes position to CurrentFocusCard
- Both cards receive workflow data as optional props — no change to existing required props

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following established codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 60-Kanban & CurrentFocus Integration*
*Context gathered: 2026-05-12*
