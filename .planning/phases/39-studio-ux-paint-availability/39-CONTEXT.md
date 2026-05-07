# Phase 39: Studio UX + Paint Availability - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

The Recipes page transforms from a flat table into a studio experience: a visual card grid with metadata badges and paint availability indicators, a step-by-step timeline detail view, and advanced filters for surface, style, difficulty, and missing paints. The existing table view is replaced entirely.

</domain>

<decisions>
## Implementation Decisions

### Card grid layout
- Replace the existing RecipeTable entirely with a responsive card grid (no table/grid toggle — studio UX is the goal)
- Each recipe card shows: recipe name, faction badge, swatch strip (reuse existing overlapping circle pattern from WKSP-02), difficulty badge, estimated time, step count, surface label, and paint availability indicator
- Card grid uses CSS grid with responsive column count (auto-fill, minmax ~280px)
- Cards use the established Card component (`src/components/ui/card.tsx`) with consistent elevation and hover effects matching the app's shadow hierarchy
- Faction badge uses existing `Badge` with `backgroundColor: faction.color_theme` (same as current table)

### Detail view — step timeline
- Clicking a recipe card opens the existing RecipeDetailSheet (enhanced, not replaced) with a vertical timeline layout for steps
- Each step rendered as a timeline node with: connecting vertical line, phase label badge, paint swatch circle, step title, tool/technique/dilution inline, and per-step time estimate
- Recipe metadata (style, surface, effect, difficulty, estimated total time) displayed as a badge row under the recipe title in the sheet header
- Linked unit and area fields remain in the detail view (existing behavior preserved)
- The timeline replaces the current plain ordered list of steps

### Paint availability badge
- Each recipe card shows a compact availability indicator: colored dot + count text
  - Green dot + "N owned" when all paints are owned
  - Red dot + "N missing" when any paints are missing (not owned)
  - Amber dot + "N low" when paints are owned but marked running_low
  - Combined indicator when mixed: e.g., "3 owned · 1 missing"
- New batch query: join recipe_steps → paints, aggregate owned/running_low/missing counts per recipe_id
- New hook: `useRecipePaintAvailability()` returning `Map<recipe_id, { owned: number; missing: number; runningLow: number }>`
- Query key invalidated when paint ownership changes (paint mutations must invalidate this key)
- `isPaintMissing` from `recipeSteps.ts` already defines missing as `paint.owned !== 1` — reuse this definition
- Running low defined by existing `paint.running_low` field (integer boolean 0|1)
- Steps with no linked paint (paint_id = 0 or null) are excluded from the count

### Filter UX
- Extend the existing RecipesPage filter bar with new dropdown filters:
  - Surface filter (dropdown from RECIPE_SURFACES const array)
  - Style filter (dropdown from RECIPE_STYLES const array)
  - Difficulty filter (dropdown from RECIPE_DIFFICULTIES const array)
  - "Has missing paints" toggle button (filters to recipes with at least one missing paint)
- Filter state uses inline useState (matches existing RecipesPage pattern — faction, unit, area, paint filters all use useState)
- Filters are ephemeral — reset on navigation (established convention)
- "Clear filters" button already exists and must include the new filters in its reset logic
- Surface/style/difficulty filters use the Popover + Command pattern matching existing FactionFilter component

### Claude's Discretion
- Exact card dimensions, padding, and spacing within the responsive grid
- Whether difficulty badge uses color coding (e.g., green/yellow/orange/red) or uniform styling
- Step timeline node exact visual design (circle vs line-dot vs pill for the connecting line)
- Whether the detail view shows a "Start painting" CTA or remains read-only (read-only is fine for this phase)
- Exact responsive breakpoints for card grid columns
- Card hover/focus interaction details
- Whether to show "No paints linked" in availability badge when a recipe has zero paint links

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — STUDIO-01, STUDIO-02, STUDIO-04, PAINT-01 define the acceptance criteria for this phase

### Recipe data model (Phase 37 outputs)
- `src/types/recipe.ts` — PaintingRecipe interface with v2.5 metadata fields (style, surface, effect, difficulty, estimated_minutes)
- `src/types/recipePaint.ts` — RecipeStep interface with structured step fields (painting_phase, tool, technique, dilution, time_estimate_minutes)
- `src/features/recipes/recipeSchema.ts` — RECIPE_STYLES, RECIPE_SURFACES, RECIPE_EFFECTS, RECIPE_DIFFICULTIES, PAINTING_PHASES const arrays

### Existing recipe UI (must be transformed/extended)
- `src/features/recipes/RecipesPage.tsx` — Current page with table + filter bar (replace table with card grid, extend filters)
- `src/features/recipes/RecipeTable.tsx` — Current table component (will be replaced by new RecipeCardGrid)
- `src/features/recipes/RecipeTableColumns.tsx` — Current column definitions with swatch strip rendering (swatch pattern reusable)
- `src/features/recipes/RecipeDetailSheet.tsx` — Current detail sheet (enhance with timeline layout and metadata badges)
- `src/features/recipes/RecipeEmptyState.tsx` — Existing empty state (reuse in card grid)

### Step utilities
- `src/features/recipes/recipeSteps.ts` — DraftStep type, isPaintMissing() function (reuse for availability logic)

### Data hooks (must be extended)
- `src/hooks/useRecipePaints.ts` — useRecipeSwatchData, useAllStepCounts, RECIPE_SWATCH_KEY, STEP_COUNTS_KEY
- `src/hooks/useRecipes.ts` — useRecipes hook (fetches PaintingRecipe[])
- `src/hooks/usePaints.ts` — usePaints hook (paint ownership data)

### Query layer (must be extended)
- `src/db/queries/recipePaints.ts` — getRecipeSwatchColors batch query pattern (follow same pattern for availability query)

### Established UI patterns
- `src/hooks/useCollectionViewMode.ts` — localStorage toggle pattern (reference only — not using toggle for recipes, but pattern is available)
- `src/components/ui/card.tsx` — shadcn Card component for recipe cards
- `src/components/ui/badge.tsx` — Badge component for metadata badges
- `src/components/common/PageHeader.tsx` — Shared page header (already used on RecipesPage)

### Prior phase context
- `.planning/phases/29-workshop-play/29-CONTEXT.md` — WKSP-02 swatch strip design (overlapping 12px circles, -ml-1 negative margin, 8 max + overflow)
- `.planning/phases/38-structured-step-input/38-CONTEXT.md` — Step input layout decisions, DraftStep fields, painting_phase enum

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecipeTableColumns.tsx` swatch strip rendering (lines 125-148): overlapping 12px circles with hex_color fill or muted fallback — extract and reuse in recipe cards
- `useRecipeSwatchData()` hook: batch Map<recipe_id, swatches> already fetched at page level — reuse directly
- `useAllStepCounts()` hook: batch Map<recipe_id, count> — reuse for step count badge on cards
- `isPaintMissing()` in recipeSteps.ts: `paint.owned !== 1` — reuse for availability aggregation
- `FactionFilter` component in RecipesPage: Popover + Command multi-select pattern — replicate for surface/style/difficulty filters
- `Card` component from shadcn/ui: card-header, card-content, card-footer slots
- `Badge` component: used for faction badges with inline backgroundColor

### Established Patterns
- RecipesPage owns all data hooks at page level, passes data down as props (recipe list, step counts, swatch data)
- Filter state as inline useState (not Zustand) — RecipesPage pattern
- Batch query → Map pattern for step counts and swatch colors — follow same for paint availability
- `Popover + Command + CommandItem` for multi-select filters (FactionFilter)
- `Popover + Command` for single-select filters (UnitFilter)
- RecipeDetailSheet uses `useMemo` to derive faction/unit from cached data + paintMap for step rendering

### Integration Points
- RecipesPage: replace `<RecipeTable>` with new `<RecipeCardGrid>`, add `useRecipePaintAvailability()` call alongside existing data hooks
- RecipeDetailSheet: replace step `<ol>` list with timeline component, add metadata badge row
- recipePaints.ts queries: add `getRecipePaintAvailability()` batch query
- useRecipePaints.ts hooks: add `useRecipePaintAvailability()` hook + RECIPE_AVAILABILITY_KEY
- usePaints mutation hooks: add RECIPE_AVAILABILITY_KEY invalidation (paint ownership changes must refresh availability)

</code_context>

<specifics>
## Specific Ideas

- Card grid should feel like a "recipe library" or "painting studio" — visual, browsable, at-a-glance useful
- Swatch strip on cards gives an immediate visual identity to each recipe (reuse the proven WKSP-02 pattern)
- Paint availability badge is the key differentiator vs the old table — painters can instantly see "do I have everything I need to start this recipe?"
- Step timeline in detail view should feel like a painting guide — phase labels and paint colors create a visual roadmap of the painting process
- The filter system should let painters answer: "show me all beginner armor recipes where I have all the paints"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-studio-ux-paint-availability*
*Context gathered: 2026-05-07*
