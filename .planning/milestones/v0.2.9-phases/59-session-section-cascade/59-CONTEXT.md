# Phase 59: Session Section Cascade - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a 3-level cascading selector (recipe → section → step) to LogSessionSheet so users can log painting sessions with section-level granularity. The section selector appears between recipe and step selectors when a recipe with 2+ sections is selected. The `section_name` column already exists on `painting_sessions` (Phase 57) — this phase wires up the UI cascade and saves the denormalized section name.

</domain>

<decisions>
## Implementation Decisions

### Section Selector Position & Appearance
- **D-01:** Section selector uses the same Select component pattern as recipe and step selectors — consistent form UX
- **D-02:** Section selector appears between the recipe selector and step selector (matches success criterion 1)
- **D-03:** Section selector is conditionally rendered only when the selected recipe has 2+ sections (same conditional pattern as step selector's `watchedRecipeId != null`)
- **D-04:** When only 1 section exists, skip the section selector entirely — the step dropdown shows all steps unfiltered (single-section recipes don't need the extra selector)

### Cascade Reset Logic
- **D-05:** Two useEffect reset chains: `watchedRecipeId` change → clear both `section_name` and `recipe_step_id`; `watchedSectionId` change → clear `recipe_step_id` only
- **D-06:** The existing `watchedRecipeId` useEffect already clears `recipe_step_id` — extend it to also clear section selection
- **D-07:** Add a new useEffect for `watchedSectionId` that clears `recipe_step_id`
- **D-08:** Changing recipe clears both section and step (SESS-03); changing section clears step only (SESS-04)

### Step Filtering
- **D-09:** Filter steps client-side from the existing `recipeSteps` array (from `useRecipePaints`) using `section_id` match — no new query needed
- **D-10:** When a section is selected, filter `recipeSteps` to only show steps where `step.section_id === selectedSectionId`
- **D-11:** When no section is selected (or recipe has only 1 section), show all steps unfiltered — preserves backward compatibility

### Section Data Fetching
- **D-12:** Use existing `useRecipeSections(recipeId)` hook to fetch sections for the selected recipe
- **D-13:** Sections are fetched reactively when `watchedRecipeId` changes — same pattern as `useRecipePaints`

### Schema & Form Integration
- **D-14:** Add `section_name` to `logSessionSchema` as `z.string().nullable().optional()` — matches `recipe_id`/`recipe_step_id` pattern
- **D-15:** Store a local `watchedSectionId` (numeric, for filtering) but resolve and submit `section_name` (denormalized text) — matches Phase 57's denormalization pattern
- **D-16:** At submit time, look up the selected section's name from the sections array and pass it as `section_name` to `createSession`
- **D-17:** Add `section_name` to the `buildDefaultValues` return with `null` default

### Optionality
- **D-18:** All three selectors (recipe, section, step) remain fully optional (SESS-05) — user can log a session with any combination including none
- **D-19:** Valid combinations: recipe only, recipe+section, recipe+section+step, recipe+step (when 1 section), or none

### Claude's Discretion
- Internal state management approach for section ID tracking (form field vs local useState)
- Whether to use a `useMemo` for filtered steps or inline filter
- Exact label text for the section selector ("Section", "Recipe Section", etc.)
- SelectItem display format for sections (name only, or name with step count)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SESS-01 through SESS-05 define the five session section cascade requirements

### Phase 57 Deliverables (direct dependency)
- `.planning/phases/57-schema-data-layer/57-CONTEXT.md` — Schema decisions including D-06 (`section_name TEXT DEFAULT NULL` on `painting_sessions`) and D-13 (`createSession` includes `section_name`)

### Existing Components to Modify
- `src/features/dashboard/LogSessionSheet.tsx` — Main form component; add section selector between recipe and step selectors
- `src/features/dashboard/logSessionSchema.ts` — Zod schema; add `section_name` field

### Data Layer (already complete)
- `src/types/paintingSession.ts` — `PaintingSession` and `CreateSessionInput` already include `section_name`
- `src/db/queries/paintingSessions.ts` — `createSession` already accepts and inserts `section_name`
- `src/types/recipeSection.ts` — `RecipeSection` interface with `id`, `name`, `section_type`, etc.
- `src/types/recipePaint.ts` — `RecipeStep` interface with `section_id` field for filtering

### Hooks (ready to use)
- `src/hooks/useRecipeSections.ts` — `useRecipeSections(recipeId)` fetches sections for a recipe
- `src/hooks/useRecipePaints.ts` — `useRecipePaints(recipeId)` fetches steps with `section_id` for filtering

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useRecipeSections(recipeId)` hook — fetches sections, returns `RecipeSection[]` with `id`, `name`, `order_index`
- `useRecipePaints(recipeId)` hook — fetches steps with `section_id` for client-side filtering
- Select/FormField/Controller pattern in LogSessionSheet — identical pattern for recipe and step selectors, copy for section
- `sortRecipesForPicker()` utility in LogSessionSheet — pattern for sorting selector options

### Established Patterns
- Conditional rendering: `{watchedRecipeId != null && (<FormField .../>)}` — reuse for section selector with section count check
- Reset useEffect: `useEffect(() => { form.setValue("recipe_step_id", null); }, [watchedRecipeId, form]);` — extend and duplicate for section cascade
- `__none__` sentinel value pattern for nullable Select fields
- Denormalized text storage: `section_name` matches `detachment_name`, `weapon_name` pattern from v0.2.8

### Integration Points
- `onSubmit` handler — add `section_name` lookup from sections array before calling `createSession`
- `buildDefaultValues` — add `section_name: null`
- `useCreatePaintingSession` mutation — already accepts `section_name` in its input type

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

*Phase: 59-Session Section Cascade*
*Context gathered: 2026-05-12*
