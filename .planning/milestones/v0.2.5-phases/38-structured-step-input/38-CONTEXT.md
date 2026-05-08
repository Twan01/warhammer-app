# Phase 38: Structured Step Input - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can build a recipe step-by-step with all relevant painting detail — paint link, phase label, tool, technique, dilution, and time estimate — and reorder steps via drag-and-drop. This phase upgrades the existing RecipeStepRow/RecipeStepList UI and the backing DraftStep type + query layer to support the full structured step schema from Phase 37.

</domain>

<decisions>
## Implementation Decisions

### Step row layout
- Two-line layout per step row inside RecipeFormSheet
- First line: painting phase dropdown + freeform step title + paint combobox (existing PaintCombobox)
- Second line: tool input + technique input + dilution input + time estimate input
- Drag handle and delete button remain in their current positions (left and right)
- Notes field stays as a third line (already exists)

### Painting phase vs step title
- painting_phase is a categorical Select dropdown using the enum: prime, basecoat, shade, layer, highlight, glaze, weathering, basing, varnish, other
- step_name remains as a freeform text input for a custom title (e.g., "Edge highlight on shoulders")
- Both fields coexist — painting_phase categorizes the step type, step_name gives it a human label
- Use the Radix Select `__none__` sentinel pattern (established convention) for the painting_phase dropdown

### Time estimate display
- Show the sum of all step time_estimate_minutes values next to the "Recipe Steps" section header in RecipeFormSheet
- Format as human-readable (e.g., "~45 min" or "~1h 30min")
- Recipe card time display is Phase 39 scope (STUDIO-01) — not included here

### Field optionality
- painting_phase: required (core categorization from success criteria SC-1)
- step_name: required (already required — min 1 char)
- paint_id: optional (already optional — some steps like "varnish" may not use a specific paint)
- tool: optional free text (e.g., "Size 1 brush", "Airbrush", "Sponge")
- technique: optional free text (e.g., "Thin layers", "Stipple", "Wet blend")
- dilution: optional free text (e.g., "1:1 water", "Lahmian Medium", "Airbrush thin")
- time_estimate_minutes: optional integer (minutes)

### Save behavior
- Expand the addRecipePaint INSERT query to include all 5 new columns (painting_phase, tool, technique, dilution, time_estimate_minutes)
- Expand DraftStep type to carry these 5 new fields alongside existing localId/step_name/paint_id/notes
- RecipeFormSheet on save: pass all new fields from DraftStep to the mutation (currently hardcoded to null)
- Keep the existing remove-all + re-add pattern for edit mode (immutable step links decision from STATE.md)

### Claude's Discretion
- Exact Input component sizing and responsive behavior within the two-line layout
- Whether tool/technique/dilution use free text inputs or comboboxes with suggestions
- Datalist suggestions for tool/technique/dilution if using free text
- Exact format of the time estimate sum display (e.g., "~45 min" vs "45m" vs "0:45")
- Whether painting_phase dropdown auto-populates step_name when step_name is empty

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema and types
- `src-tauri/migrations/rules_002_wargear_abilities.sql` — Latest migration reference for SQL patterns (actual recipe_steps migration is 012)
- `src/types/recipePaint.ts` — RecipeStep interface with all v0.2.5 fields (painting_phase, tool, technique, dilution, time_estimate_minutes)
- `src/types/recipe.ts` — PaintingRecipe interface with metadata fields

### Existing step UI (must be extended, not replaced)
- `src/features/recipes/recipeSteps.ts` — DraftStep type + makeDraftStep + computeOrderIndex
- `src/features/recipes/RecipeStepRow.tsx` — Current step row with @dnd-kit useSortable + PaintCombobox
- `src/features/recipes/RecipeStepList.tsx` — DndContext wrapper with add/remove/reorder logic
- `src/features/recipes/RecipeFormSheet.tsx` — Parent form that owns DraftStep[] state and save logic

### Query layer (must be extended)
- `src/db/queries/recipePaints.ts` — addRecipePaint INSERT (currently 5 columns, needs 10)
- `src/hooks/useRecipePaints.ts` — useAddRecipePaint mutation and cache invalidation

### Conventions
- `src/features/recipes/recipeSchema.ts` — RECIPE_STYLES, RECIPE_SURFACES, etc. const arrays pattern (use same for PAINTING_PHASES)

### Requirements
- `.planning/REQUIREMENTS.md` — STEP-01 through STEP-04 define the acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecipeStepRow` + `RecipeStepList`: Already wired with @dnd-kit drag-and-drop — extend, don't rebuild
- `PaintCombobox`: Paint selector with search + "Create new" — stays as-is
- `recipeSteps.ts` utilities: `DraftStep`, `makeDraftStep`, `computeOrderIndex` — extend DraftStep type
- Radix Select with `__none__` sentinel: Established pattern for nullable dropdowns (used in RecipeFormSheet)
- `RECIPE_STYLES`, `RECIPE_SURFACES`, etc. const arrays in recipeSchema.ts: Same pattern for PAINTING_PHASES

### Established Patterns
- RecipeFormSheet owns DraftStep[] via useState, not useFieldArray (documented @dnd-kit collision)
- Steps are "immutable links" — edit mode removes all + re-adds (STATE.md decision)
- Cache invalidation: useAddRecipePaint/useRemoveRecipePaint invalidate RECIPE_PAINTS_KEY, RECIPE_SWATCH_KEY, STEP_COUNTS_KEY
- RecipeFormSheet.onSubmit passes null for all new fields — Phase 38 replaces these with actual values

### Integration Points
- `addRecipePaint` query: INSERT must expand from 5 to 10 columns
- `DraftStep` type: Must add painting_phase, tool, technique, dilution, time_estimate_minutes
- `RecipeStepRow` UI: Must add second row of inputs for new fields
- `RecipeFormSheet.onSubmit`: Must pass DraftStep field values instead of null

</code_context>

<specifics>
## Specific Ideas

- Painting phase enum matches the Warhammer painting workflow exactly: prime -> basecoat -> shade -> layer -> highlight -> glaze -> weathering -> basing -> varnish -> other
- The current STEP_SUGGESTIONS datalist in RecipeStepRow overlaps with painting_phase values — painting_phase dropdown should replace the datalist as the primary categorization, with step_name becoming the freeform label
- Time estimate sum gives painters a quick sense of total commitment before starting a recipe

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-structured-step-input*
*Context gathered: 2026-05-07*
