# Phase 40: Recipe Actions + Step Photos - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can duplicate recipes, attach reference photos to individual steps, link substitute paints, and bulk-add all missing recipe paints to the wishlist in a single action. This phase adds four discrete user-facing capabilities to the existing recipe studio built in Phases 37–39.

</domain>

<decisions>
## Implementation Decisions

### Recipe duplication (STUDIO-03)
- Duplicate button lives in RecipeDetailSheet footer alongside existing Edit/Delete buttons
- Copy is named with " (Copy)" suffix appended to the original name
- After duplication, the copy opens immediately in RecipeDetailSheet so user can review/edit
- Duplication is a single transaction: insert new recipe row + all steps atomically — prevents orphaned state if something fails mid-way
- The copy includes all steps with their fields (painting_phase, tool, technique, dilution, time_estimate, notes, photo path, substitute paint link) and all recipe metadata (style, surface, effect, difficulty, estimated_minutes, result_photo_path)
- Step order_index values are preserved in the copy
- The copy gets a new created_at/updated_at — it is a fully independent entity

### Per-step photo upload (STEP-05)
- Photo upload trigger lives in RecipeFormSheet step row (edit mode) — an image button/icon per step row
- One photo per step — stored as `step_photo_path TEXT` column on recipe_steps (new migration 013)
- Reuse JournalTab photo pattern: Tauri `openDialog` for file picker → `readFile` + `writeFile` with UUID-based relative path under AppData
- Step photos display as inline thumbnail below step content in RecipeStepTimeline — visible at a glance, clickable for full view
- Result photo (result_photo_path on painting_recipes) also gets upload UI wired in RecipeFormSheet header section — column exists since Phase 37, natural to complete now

### Substitute paint linking (PAINT-02)
- New `alt_paint_id INTEGER REFERENCES paints(id)` column on recipe_steps (migration 013)
- User sets substitute via a second PaintCombobox in RecipeStepRow, positioned after the primary paint combobox
- In RecipeStepTimeline, substitute appears as a secondary paint line below the primary with "Alt:" prefix and its own swatch dot
- Substitute paint does NOT affect the availability badge — availability tracks primary paint only (substitute is informational, not a replacement for ownership tracking)
- alt_paint_id is nullable — most steps won't have a substitute

### Add all missing to wishlist (PAINT-03)
- "Add all missing to wishlist" button lives in RecipeDetailSheet, positioned as an action button near the recipe steps section (visible when recipe has missing paints)
- Button only appears when the recipe has at least one missing paint (owned !== 1)
- On click: iterate missing paints, check existing wishlist items by paint name to prevent duplicates, then bulk-insert new wishlist items
- Each wishlist item created with: name = "{paint.brand} {paint.name}", faction_id from the recipe's faction_id, notes = "From recipe: {recipe.name}"
- Toast notification shows count of items added (e.g., "Added 3 paints to wishlist") or "All missing paints already on wishlist" if all are duplicates
- Uses existing `useCreateWishlistItem` hook — sequential inserts (not a batch query) since wishlist items are few per recipe

### Claude's Discretion
- Exact thumbnail size for step photos in the timeline (suggest ~64px square)
- Whether step photo thumbnail has a lightbox overlay or opens in a modal
- Migration 013 column ordering and naming details
- Duplicate button icon choice (Copy icon from Lucide)
- Photo upload loading/progress indicator style
- Whether "Add all missing" button is primary or outline variant
- Exact positioning of the alt paint combobox relative to primary in the two-row step layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — STUDIO-03, STEP-05, PAINT-02, PAINT-03 define the acceptance criteria for this phase

### Schema (migration needed)
- `src-tauri/migrations/012_recipe_steps.sql` — Current migration showing recipe_steps schema and painting_recipes metadata columns
- `src/types/recipePaint.ts` — RecipeStep interface (needs step_photo_path and alt_paint_id fields)
- `src/types/recipe.ts` — PaintingRecipe interface (result_photo_path already present)

### Recipe data layer (must be extended)
- `src/db/queries/recipes.ts` — createRecipe, getRecipeById (duplication reads original, inserts copy)
- `src/db/queries/recipePaints.ts` — addRecipePaint, getRecipePaintsByRecipe (duplication reads steps, inserts copies; needs alt_paint_id in INSERT)
- `src/hooks/useRecipes.ts` — Recipe mutations and cache keys
- `src/hooks/useRecipePaints.ts` — Step mutations, RECIPE_PAINTS_KEY, RECIPE_SWATCH_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY

### Recipe UI (must be extended)
- `src/features/recipes/RecipeDetailSheet.tsx` — Add Duplicate button in footer, "Add all missing" action button
- `src/features/recipes/RecipeFormSheet.tsx` — Add step photo upload button per step row, result photo upload in header
- `src/features/recipes/RecipeStepRow.tsx` — Add alt paint combobox, step photo upload icon
- `src/features/recipes/RecipeStepTimeline.tsx` — Add step photo thumbnail, alt paint display line
- `src/features/recipes/recipeSteps.ts` — DraftStep type needs step_photo_path and alt_paint_id fields

### Photo upload pattern (reuse)
- `src/features/units/JournalTab.tsx` — Tauri openDialog + readFile + writeFile UUID photo pattern (lines 1-35 for imports)
- `src/hooks/useUnitPhotos.ts` — Photo hook pattern with convertFileSrc for display

### Wishlist integration
- `src/db/queries/wishlistItems.ts` — createWishlistItem (name, faction_id, estimated_cost_pence, notes)
- `src/hooks/useWishlistItems.ts` — useCreateWishlistItem hook + WISHLIST_ITEMS_KEY cache key
- `src/types/wishlistItem.ts` — WishlistItem / CreateWishlistItemInput types

### Prior phase context
- `.planning/phases/38-structured-step-input/38-CONTEXT.md` — Step row two-line layout, DraftStep fields, save behavior
- `.planning/phases/39-studio-ux-paint-availability/39-CONTEXT.md` — Card grid, availability badge, timeline design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaintCombobox`: Paint selector with search — reuse for alt_paint_id combobox (second instance per step row)
- `JournalTab` photo pattern: `openDialog` + `readFile` + `writeFile` + UUID naming — extract into shared utility or replicate pattern
- `useCreateWishlistItem` hook: Existing mutation with dashboard-stats invalidation — call in loop for bulk add
- `RecipeDetailSheet` footer: Already has Edit/Delete — natural home for Duplicate button
- `convertFileSrc` from `@tauri-apps/api/core`: Used by useUnitPhotos to convert file paths to displayable URLs
- `isPaintMissing` from `recipeSteps.ts`: Reuse to identify which paints need wishlist addition

### Established Patterns
- Photo storage: UUID-named files under AppData directory (JournalTab pattern)
- Immutable step links: Edit mode removes all + re-adds (affects how alt_paint_id and step_photo_path are saved)
- Cache invalidation symmetry: New mutations must invalidate all affected keys (RECIPE_PAINTS_KEY, SWATCH_KEY, STEP_COUNTS_KEY, AVAILABILITY_KEY, WISHLIST_ITEMS_KEY)
- DraftStep local state in RecipeFormSheet: Must carry new fields (step_photo_path, alt_paint_id) through save cycle
- Toasts for user feedback (Sonner)

### Integration Points
- Migration 013: Add `step_photo_path TEXT` and `alt_paint_id INTEGER REFERENCES paints(id)` to recipe_steps
- `addRecipePaint` INSERT: Expand from 10 to 12 columns (step_photo_path, alt_paint_id)
- `RecipeStep` type: Add step_photo_path and alt_paint_id fields
- `DraftStep` type: Add step_photo_path and alt_paint_id fields
- `RecipeStepRow`: Add alt paint combobox + photo upload button in existing two-row layout
- `RecipeStepTimeline`: Add photo thumbnail + alt paint line per step
- `RecipeDetailSheet`: Add Duplicate button + "Add all missing to wishlist" button
- `RecipesPage`: May need to invalidate/refresh after duplication

</code_context>

<specifics>
## Specific Ideas

- Recipe duplication is a quality-of-life feature — painters often create variations of a recipe (e.g., same base recipe but different highlight color for a different unit)
- Step photos serve as reference images during painting — "this is what the step should look like when done"
- Substitute paint is critical for hobbyists who can't always find the exact paint — knowing an alternative saves a trip to the store
- "Add all missing to wishlist" closes the loop: see what's missing → plan to buy it — no manual copying

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-recipe-actions-step-photos*
*Context gathered: 2026-05-07*
