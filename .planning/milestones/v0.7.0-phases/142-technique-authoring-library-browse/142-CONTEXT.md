# Phase 142: Technique Authoring & Library Browse - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

> Captured via smart discuss (autonomous mode). All four grey areas accepted at
> the recommended answers — grounded in the existing recipe authoring stack and
> the Phase 141 Option-A / FND-03 locks.

<domain>
## Phase Boundary

This phase delivers the **first user-facing surface** of the v0.7.0 Technique
Library: authoring (create / edit / delete / duplicate) and browse. Concretely:

1. A technique authoring form (Sheet) where the user builds a named technique
   with full section/step structure (painting phase / tool / dilution / time)
   and named colour slots with role hints (TECH-01, SLOT-01, SLOT-02).
2. Non-destructive structure edit: existing `technique_step_id` values survive
   add/remove/reorder of sections/steps/slots (TECH-02 — the FND-03 invariant
   applied to the *authoring* side).
3. Delete with a usage-count warning ("used by N recipes") (TECH-03).
4. Duplicate producing an independent copy with fresh IDs across all sections,
   steps, and slots (TECH-04).
5. A technique library browse surface **under Workshop/Recipes (no new sidebar
   entry)** — list with name / effect / difficulty / usage count, name search +
   effect filter, and a detail view showing the full section/step tree plus a
   "used by N recipes" list (LIB-01..LIB-04, TECH-05).

**Out of scope (later phases):** the apply-to-recipe slot-fill flow (143), the
production `resyncTechniqueInstance` live-link propagation (144), integration
across Painting Mode / paint availability / SectionedTimeline (145), and detach
/ safety-rail badges (146). This phase authors and browses techniques only —
no recipe consumes a technique yet.

</domain>

<decisions>
## Implementation Decisions

### Library Surface & Navigation (Area 1 — accepted)
- **Tabs control on the existing `/recipes` page** ("Recipes" | "Techniques") —
  one route, zero sidebar change, honours "no new top-level sidebar entry."
- Library list is a **card grid mirroring `RecipeCardGrid`** showing name,
  effect category, difficulty, and usage count.
- Detail view is a **Sheet mirroring `RecipeDetailSheet`** — full section/step
  tree plus the "used by N recipes" list.
- Filtering **reuses the Recipes toolbar pattern**: name search + effect
  dropdown.

### Authoring Form (Area 2 — accepted)
- Form surface is a **Sheet mirroring `RecipeFormSheet`**.
- **Reuse / adapt `RecipeSectionList` + `RecipeStepRow`** against a
  technique-specific schema rather than building parallel components from
  scratch.
- Step metadata fields are the **same set as recipes**: painting_phase, tool,
  dilution, time.
- Colour slots are a **top-level list on the technique** (name + free-text role
  hint); each step references a slot via a dropdown (slot, not a fixed paint —
  techniques carry no `paint_id` of their own).

### Metadata Model (Area 3 — accepted)
- Effect category **reuses the existing recipe effect enum** (OSL / NMM / …),
  promoted from a cosmetic label to a real persisted field.
- Difficulty **reuses `RECIPE_DIFFICULTIES`**.
- Slot role hint is **free text** per slot (e.g. "brightest core").
- Save validity requires **name + ≥1 step**; colour slots are optional.

### Edit / Delete / Duplicate (Area 4 — accepted)
- Non-destructive save **reuses the `recipeDiff` / `saveRecipeGraph`
  UPDATE-not-replace pattern** so `technique_step_id` survives every structure
  edit (the FND-03 lock applied to authoring; UPDATE existing rows, INSERT only
  new ones, DELETE only removed ones — never DELETE+INSERT a surviving step).
- Delete shows a **confirm dialog displaying "used by N recipes"** before
  proceeding (soft warning, not a hard block).
- Duplicate defaults the name to **"Copy of {name}"** and produces fully
  independent new IDs across sections, steps, and slots.
- Section/step reorder uses **dnd-kit drag**, mirroring the existing recipe
  reorder UX.

### Claude's Discretion
- Exact Zod schema shape for the technique form (mirror `recipeSchema.ts`).
- Query-module layout under `src/db/queries/` (e.g. `techniques.ts`,
  `techniqueSections.ts`) and hook files under `src/hooks/`.
- Precise slot-picker control (combobox vs select) and empty-state copy.
- Test placement under `tests/` mirroring `src/features/recipes` tests.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/recipes/RecipeFormSheet.tsx` — Sheet-based create/edit form;
  template for `TechniqueFormSheet`.
- `src/features/recipes/RecipeSectionList.tsx`, `RecipeStepRow.tsx`,
  `RecipeSectionCard.tsx`, `RecipeStepList.tsx` — section/step authoring with
  dnd-kit reorder; adapt for technique slot-referencing steps.
- `src/features/recipes/RecipeCardGrid.tsx`, `RecipeCard.tsx` — library card
  grid template.
- `src/features/recipes/RecipeDetailSheet.tsx` — detail Sheet template (add
  "used by N recipes").
- `src/features/recipes/RecipeDeleteDialog.tsx` — delete-with-warning template.
- `src/features/recipes/recipeSchema.ts` — `RECIPE_SURFACES`, `RECIPE_STYLES`,
  `RECIPE_DIFFICULTIES` enums + effect label; reuse the effect + difficulty
  enums.
- `src/lib/recipeDiff.ts` + `src/db/queries/recipes.ts` `saveRecipeGraph`
  (lines ~219-235) — the battle-tested non-destructive graph save (single db
  handle, flat inline SQL, WAL auto-commit). The technique save mirrors this.
- `src/lib/effectivePaintId.ts` — the FND-04 resolver (slot-map → step.paint_id
  fallback); not consumed this phase but defines the slot model.
- `src/db/queries/recipeSections.ts`, `recipePaints.ts` — query-module +
  count-aggregation patterns (`useAllSectionCounts`, `useAllStepCounts`).

### Established Patterns
- Feature module layout: `entitySchema.ts` + `EntityFormSheet.tsx` +
  `EntityCard.tsx` + `EntityPage.tsx` + Zustand filter store where needed.
- React Query hook-per-entity convention (`ENTITY_KEY` factory + `useEntity` +
  mutations with invalidation symmetry).
- Parameterized `$1,$2` SQL; booleans as `0|1`; `PRAGMA foreign_keys = ON`.

### Integration Points
- `/recipes` route (`src/app/router.tsx:115`, `src/app/recipes/page.tsx`,
  `src/features/recipes/RecipesPage.tsx`) — add the Tabs control here.
- Phase 141 schema: `techniques`, `technique_sections`, `technique_steps`,
  `technique_colour_slots` tables (migration 051) are the persistence target.
- Usage count = number of `recipe_technique_instances` rows referencing a
  technique (table exists from 141; no instances created until Phase 143, so
  counts are 0 this phase but the query/UI must be wired correctly).

</code_context>

<specifics>
## Specific Ideas

- Technique library lives as a **second tab on the Recipes page**, not a new
  route or sidebar item — explicitly per the milestone non-negotiable.
- The authoring form deliberately mirrors the recipe form so the user faces a
  familiar structure; the one new concept is **colour slots** (named roles
  instead of fixed paints).
- Usage-count plumbing (`used by N recipes`) must be correct now even though it
  reads 0 until Phase 143 wires the apply flow.

</specifics>

<deferred>
## Deferred Ideas

- Apply-to-recipe slot-fill flow → Phase 143.
- Live-link re-sync propagation on technique edit → Phase 144.
- Painting Mode / paint-availability / SectionedTimeline integration → Phase 145.
- Detach + "from technique X" section badges → Phase 146.

</deferred>
