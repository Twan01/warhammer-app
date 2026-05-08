# Phase 51: Duplication + Integration Polish - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Recipe duplication correctly copies all sections and steps with remapped IDs, recipe cards display section count alongside step count, and all pre-existing recipe workflows (availability badges, swatch strips, LogSession, recipe cards, bulk wishlist add) continue to work unchanged. No new features — this is integration and regression hardening for the section system introduced in Phases 48–50.

</domain>

<decisions>
## Implementation Decisions

### Duplication ID remapping
- `duplicateRecipe` gains a section copy pass between recipe INSERT and step INSERT:
  1. Read original sections ordered by order_index
  2. INSERT each section for the new recipe, capturing new IDs
  3. Build `Map<oldSectionId, newSectionId>` from the insert results
  4. When copying steps, look up each step's section_id in the map and use the remapped value
- Steps with null section_id (shouldn't exist post-migration, but defensive) are inserted with section_id = null
- Section order_index, name, surface, optional, and notes are all copied verbatim

### Duplication photo handling
- result_photo_path on the recipe is copied to the duplicate (exact clone)
- step_photo_path on each step is copied to the duplicate (file paths, not binary — both point to the same file)
- User can clear or replace photos on the duplicate after creation

### Section count on RecipeCard
- Display format: `{sectionCount} sections · {stepCount} steps` using LayoutList icon for sections and existing Layers icon for steps
- Only show section count when sectionCount > 1 — single-section recipes display step count only (matches progressive disclosure from Phase 50)
- Data source: existing `getStepCountsByRecipe` for step counts; new batch query `getSectionCountsByRecipe` (GROUP BY recipe_id on recipe_sections) or piggyback on existing section hooks
- Section count displayed in the same text-xs text-muted-foreground row as step count and estimated time

### Duplication cache invalidation
- useDuplicateRecipe.onSuccess adds RECIPE_SECTIONS_KEY to its invalidation list (new sections created during duplication)
- Full invalidation list after update (8 keys): RECIPES_KEY, kanban-enrichment, recipes/by-unit, RECIPE_SWATCH_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SECTIONS_KEY, SECTION_COUNTS_KEY
- SECTION_COUNTS_KEY added because getSectionCountsByRecipe introduces a new cache key that must be refreshed when sections are created during duplication

### Regression scope (INTG-03)
- Paint availability badges on RecipeCard — must show correct owned/missing counts
- Swatch strip on RecipeCard — must show paint color dots
- LogSessionSheet recipe/step selectors — must list recipes and steps correctly
- Bulk wishlist add — must add missing paints from recipe steps to wishlist
- Recipe create/edit/delete — standard CRUD unaffected by section changes
- RecipeDetailSheet — both sectioned timeline (Phase 49) and flat fallback render correctly

### Claude's Discretion
- Whether to add getSectionCountsByRecipe as a new batch query or derive section counts from existing hooks
- Exact LayoutList icon sizing and spacing relative to step count
- Test file organization (single file vs. split by concern)
- Whether to wrap the duplication in a transaction (recommended but implementation detail)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — INTG-01, INTG-02, INTG-03 acceptance criteria

### Prior phase context
- `.planning/phases/48-section-data-layer/48-CONTEXT.md` — Section schema, cascade contract, cache invalidation contract, batch query patterns
- `.planning/phases/49-section-read-ui/49-CONTEXT.md` — SectionedTimeline component, flat fallback behavior
- `.planning/phases/50-section-form-ui/50-CONTEXT.md` — Section form architecture, progressive disclosure, draft state management

### Duplication code (primary modification target)
- `src/db/queries/recipes.ts` — `duplicateRecipe()` function (currently copies recipe + steps, needs section pass)
- `src/hooks/useRecipes.ts` — `useDuplicateRecipe()` mutation with cache invalidation list
- `tests/painting/duplicateRecipe.test.ts` — Existing duplication tests (need section-aware assertions)

### Recipe card (section count display)
- `src/features/recipes/RecipeCard.tsx` — Current step count display with Layers icon (line ~171)
- `src/features/recipes/RecipesPage.tsx` — RecipeCard rendering with stepCount prop

### Section data layer
- `src/db/queries/recipeSections.ts` — Section CRUD and batch queries
- `src/hooks/useRecipeSections.ts` — useRecipeSections, RECIPE_SECTIONS_KEY, useSectionStepCounts
- `src/hooks/useRecipePaints.ts` — 5 cache keys (RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY)
- `src/types/recipeSection.ts` — RecipeSection interface

### Integration flows to verify
- `src/features/recipes/RecipeDetailSheet.tsx` — Detail view with sectioned/flat timeline
- `src/features/recipes/RecipeFormSheet.tsx` — Create/edit form (Phase 50 output)
- `src/features/recipes/RecipeStepTimeline.tsx` — Flat step timeline (backward compat)
- `src/features/sessions/LogSessionSheet.tsx` — Recipe/step selectors in session logging

### Architecture decisions
- `.planning/research/SUMMARY.md` — v0.2.7 research: duplication pitfall (Map<oldSectionId, newSectionId> requirement)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `duplicateRecipe()` in recipes.ts: Existing recipe+step copy — extend with section pass between steps 2 and 3
- `getStepCountsByRecipe()` in recipePaints.ts: Batch GROUP BY pattern — template for getSectionCountsByRecipe
- `RecipeCard` stepCount display: Existing icon + count pattern — extend with section count
- `RECIPE_SECTIONS_KEY` in useRecipeSections.ts: Cache key for section invalidation

### Established Patterns
- Batch GROUP BY for counts (getStepCountsByRecipe, getStepCountsBySection) — same pattern for section counts per recipe
- Sequential mutateAsync for multi-row operations (bulk wishlist add pattern)
- Cache invalidation symmetry: if create invalidates, delete must too
- 0|1 integer SQLite boolean discipline (optional field on sections)

### Integration Points
- `duplicateRecipe()` in src/db/queries/recipes.ts — add section copy between recipe INSERT and step copy
- `useDuplicateRecipe()` in src/hooks/useRecipes.ts — add RECIPE_SECTIONS_KEY to invalidation
- `RecipeCard` in src/features/recipes/RecipeCard.tsx — add sectionCount prop and display
- `RecipesPage` in src/features/recipes/RecipesPage.tsx — pass sectionCount to RecipeCard

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard integration patterns apply. The key risk is the ID remapping in duplication (Map<oldSectionId, newSectionId>) which is well-documented in STATE.md and research SUMMARY.md.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 51-duplication-integration-polish*
*Context gathered: 2026-05-08*
