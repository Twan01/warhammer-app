# Phase 49: Section Read UI - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view a recipe's full workflow as a timeline grouped by section headers, with surface, timing, and paint-availability context visible at a glance — with backward-compatible flat fallback for section-free recipes. Read-only display only; section editing and reordering belong to Phase 50 (Form UI).

</domain>

<decisions>
## Implementation Decisions

### Section header layout
- Section headers render as distinct rows in the timeline, visually above their child steps
- Each header shows: section name (text), surface badge (if set), step count, estimated total time (sum of child step time_estimate_minutes), and per-section owned/missing paint count
- Time is computed by summing time_estimate_minutes across all steps in the section — null values excluded from sum, display hidden when all steps have null time
- Per-section availability follows the "N owned, N missing" format with colored dots, matching the existing AvailabilityBadge pattern from RecipeCard

### Section visual grouping
- Sections render as indented groups under their header row — child steps continue the existing timeline dot+line pattern underneath each section header
- Sections are NOT collapsible in the detail view — always expanded (collapsibility belongs to Phase 50 form UI)
- Visual separation between sections via spacing/gap, no hard borders or card wrappers — keeps the timeline feel continuous

### Optional section display
- Optional sections show a small "Optional" Badge (variant="outline") on the section header row
- No other visual differentiation (no fading, no hiding) — optional sections display identically otherwise

### Flat fallback behavior
- If useRecipeSections returns an empty array (or recipe has no sections), render the existing RecipeStepTimeline unchanged with no section headers
- The conditional check happens in RecipeDetailSheet — either the sectioned timeline or the flat timeline renders, not both
- Zero UI regression for pre-section recipes

### Claude's Discretion
- Exact section header typography and spacing (font size, weight, gap between header and first step)
- Whether section header uses a different timeline node style (e.g., larger dot, different color) or no node at all
- Component decomposition — whether SectionedTimeline is a new component or integrated into RecipeStepTimeline
- How to compute per-section availability — inline useMemo or separate helper function

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — VIEW-01 through VIEW-04 acceptance criteria

### Prior phase context
- `.planning/phases/48-section-data-layer/48-CONTEXT.md` — Section data layer decisions, cascade contract, cache invalidation contract

### Existing recipe display code
- `src/features/recipes/RecipeDetailSheet.tsx` — Current recipe detail view (integration point for sectioned display)
- `src/features/recipes/RecipeStepTimeline.tsx` — Current flat step timeline component (backward compat baseline)
- `src/features/recipes/RecipeCard.tsx` — AvailabilityBadge pattern for owned/missing display

### Data layer (Phase 48 output)
- `src/hooks/useRecipeSections.ts` — useRecipeSections hook + RECIPE_SECTIONS_KEY + useSectionStepCounts
- `src/hooks/useRecipePaints.ts` — useRecipePaints hook + useRecipePaintAvailability + AvailabilityStats type
- `src/db/queries/recipeSections.ts` — getRecipeSections, getStepCountsBySection queries
- `src/types/recipeSection.ts` — RecipeSection interface (name, surface, optional, order_index, notes)
- `src/types/recipePaint.ts` — RecipeStep interface (section_id field for grouping)

### Architecture decisions
- `.planning/research/SUMMARY.md` — v0.2.7 research with architecture approach

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecipeStepTimeline`: Existing flat timeline with dot+line pattern, paint swatch nodes, step photos — baseline for the flat fallback and visual pattern for sectioned version
- `AvailabilityBadge` (in RecipeCard.tsx): Owned/missing/running-low display with colored dots — pattern for per-section availability display
- `Badge` (shadcn/ui): Used throughout for surface, difficulty, optional indicators
- `useRecipeSections`: Hook returning sections ordered by order_index for a recipe
- `useRecipePaints`: Hook returning all steps for a recipe — steps have section_id for grouping
- `useSectionStepCounts`: Batch step counts per section (Map<section_id, step_count>)
- `isPaintMissing` (recipeSteps.ts): Paint ownership check used in timeline

### Established Patterns
- Timeline node: `div.absolute.left-1.top-1.5.h-3.5.w-3.5.rounded-full` with paint hex_color background
- Connecting line: `div.absolute.left-[11px].top-5.bottom-0.w-px.bg-border`
- Step content: left-padded `pl-8`, painting_phase badge, step name, paint indicator, tool/technique/dilution/time row
- Step photo: `img.mt-1.h-16.w-16.rounded.object-cover`
- Paint map: `Map<number, Paint>` built in RecipeDetailSheet, passed to timeline
- Step photo URL resolution: async appDataDir + join + convertFileSrc in RecipeDetailSheet useEffect

### Integration Points
- RecipeDetailSheet.tsx line 264: `<RecipeStepTimeline>` render — this is where the conditional section/flat switch goes
- RecipeDetailSheet.tsx line 56: `useRecipePaints(recipe?.id)` — steps already fetched here; add `useRecipeSections(recipe?.id)` alongside
- Per-section availability: group steps by section_id, then run isPaintMissing per paint in each group

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard visual patterns apply. The section header should feel like a natural extension of the existing step timeline, not a jarring new visual element.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 49-section-read-ui*
*Context gathered: 2026-05-08*
