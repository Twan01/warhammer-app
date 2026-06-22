# Phase 143: Apply Flow & Slot-Fill System - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

> Captured via smart discuss (autonomous mode). All four grey areas accepted at
> the recommended answers — grounded in the Phase 141 Option-A / FND-04 locks,
> the existing recipe-authoring stack, and the migration 051 schema.

<domain>
## Phase Boundary

This phase delivers the **apply-to-recipe** half of the Technique Library: the
flow that turns an authored technique (Phase 142) into real, paint-filled recipe
content. Concretely:

1. From the recipe section editor, an **"Add technique"** affordance opens a
   **technique picker** (Dialog) — browse/search the library, preview a
   technique's colour slots and section/step tree, and insert it at a chosen
   position. Applying creates a `recipe_technique_instances` row (APPLY-01/02).
2. A **slot-fill dialog** (run immediately after the pick) assigns a real paint
   to each colour slot — one row per slot showing role hint + current swatch +
   the existing paint combobox. Unassigned slots save empty and are treated like
   paintless steps, never an error (APPLY-03, SLOT-05, SLOT-06).
3. **Materialisation at apply time (Option A):** the technique's sections/steps
   are written into `recipe_sections`/`recipe_steps` carrying
   `technique_instance_id` / `technique_step_id` FK links, and the slot→paint
   choices are written to `recipe_technique_slot_maps`. The applied technique
   renders as a recipe **section with a "from technique X" badge** (APPLY-04).
4. **Per-instance slot mappings:** the same technique can be applied twice in one
   recipe, each instance carrying its own independent slot map (SLOT-03/04).
5. **`effectivePaintId()` becomes the single source of truth** — technique-owned
   steps carry `paint_id = NULL`; their real paint resolves through the slot map.
6. **View/change slot colours from the recipe detail view** (not only the full
   edit form) by reopening the slot-fill dialog pre-populated (APPLY-05).
7. **`saveRecipeGraph` guard:** steps with `technique_step_id IS NOT NULL` are
   skipped on UPDATE/DELETE so the recipe editor can never overwrite a
   live-linked step (SC#5).

**Out of scope (later phases):** production `resyncTechniqueInstance` live-link
propagation on technique edit (144); integration across Painting Mode / paint
availability / apply-to-units / SectionedTimeline / Log Session (145); detach +
safety-rail badges (146). This phase applies techniques and fills slots only —
re-sync on technique structure change is not yet wired.

</domain>

<decisions>
## Implementation Decisions

### Technique Picker & Insertion (Area 1 — accepted)
- "Add technique" is a **button in the recipe section-editor toolbar**, beside
  the existing "Add section" affordance.
- Picker surface is a **shadcn Dialog** (modal) with name search + a card list —
  lighter than a Sheet for a pick-one action.
- Preview shows the selected technique's **colour-slot list (name + role hint)
  AND its section/step tree, read-only**.
- Insertion position: insert **after the section where invoked** (default end of
  recipe); no separate position dropdown.

### Slot-Fill Flow (Area 2 — accepted)
- Slot-fill runs **immediately after picking** a technique — a single flow:
  picker → slot-fill → insert.
- Per-slot paint control **reuses the existing recipe-step paint combobox**.
- **Unassigned slots are allowed** and saved empty (treated like a paintless
  step) — no validation block.
- Each slot is **one row**: slot name + role hint + current paint swatch +
  combobox.

### Apply Semantics & Materialisation (Area 3 — accepted)
- An applied technique renders as a **recipe section** carrying a
  **"from technique X" badge** on its header.
- Steps are **materialised at apply time**: create the
  `recipe_technique_instances` row, INSERT the technique's sections/steps into
  `recipe_sections`/`recipe_steps` with `technique_instance_id` /
  `technique_step_id` FK links, and write `recipe_technique_slot_maps` — all on a
  **single db handle, flat inline SQL** (mirrors `saveRecipeGraph`). Materialised
  `recipe_steps` carry `paint_id = NULL`.
- The **same technique may be applied twice** in one recipe — each apply is a
  distinct instance with an independent slot map.
- **`saveRecipeGraph` guard:** skip UPDATE and DELETE of any `recipe_steps` row
  where `technique_step_id IS NOT NULL`, so the recipe editor never overwrites a
  live-linked step.

### Slot Editing from Recipe Detail (Area 4 — accepted)
- The technique-sourced section in `RecipeDetailSheet` exposes an **"Edit
  colours"** affordance (APPLY-05 — editable from detail, not only the full edit
  form).
- That affordance **reuses the slot-fill dialog**, pre-populated with the
  instance's current slot→paint mappings.
- Technique-owned steps render **read-only** in the detail view — no per-step
  paint edit; their swatch resolves via **`effectivePaintId()`**.
- The "from technique X" badge **links to the technique** in the library tab.

### Claude's Discretion
- Exact query-module layout (e.g. `recipeTechniqueInstances.ts`,
  `recipeTechniqueSlotMaps.ts`) and hook files under `src/hooks/`.
- Precise slot-fill dialog component composition and empty-state copy.
- Test placement under `tests/` mirroring `src/features/recipes`.
- Whether the apply mutation lives in a new query module or extends
  `recipes.ts`; pick whichever keeps `saveRecipeGraph` cohesive.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/effectivePaintId.ts` — FND-04 resolver (slotMap → step.paint_id
  fallback). This phase wires it as the resolution spine; build the
  `SlotResolutionMap` from `recipe_technique_slot_maps` joined to
  `technique_steps.colour_slot_id`.
- `src/db/queries/recipes.ts` `saveRecipeGraph` (~lines 219-235) — the
  battle-tested non-destructive graph save (single db handle, flat inline SQL,
  WAL auto-commit). Add the `technique_step_id IS NOT NULL` skip-guard here; the
  apply mutation mirrors its transaction shape.
- `src/lib/recipeDiff.ts` — diff helper feeding `saveRecipeGraph`; the guard
  must respect this diff's UPDATE/DELETE classification.
- `src/features/recipes/RecipeSectionList.tsx`, `RecipeStepRow.tsx`,
  `RecipeSectionCard.tsx` — section/step editor; add the "Add technique" toolbar
  button and the badged technique-section rendering here.
- `src/features/recipes/RecipeDetailSheet.tsx` — detail Sheet; add the
  "Edit colours" affordance + read-only technique-step rendering.
- The recipe-step **paint combobox** (used in `RecipeStepRow`) — reuse for each
  slot-fill row.
- Phase 142 technique library components (`TechniqueFormSheet`,
  technique browse tab) and `src/db/queries/techniques*.ts` — source of the
  technique tree the picker previews.

### Established Patterns
- React Query hook-per-entity (`ENTITY_KEY` factory + `useEntity` + mutations
  with invalidation symmetry). New instance/slot-map queries follow this.
- Parameterized `$1,$2` SQL; booleans as `0|1`; `PRAGMA foreign_keys = ON`;
  flat inline SQL only (tauri-plugin-sql cannot nest transactions).
- shadcn Dialog + form patterns; React Hook Form + Zod for the slot-fill form.

### Integration Points
- Migration 051 schema: `recipe_technique_instances`,
  `recipe_technique_slot_maps`, `recipe_sections.technique_instance_id`,
  `recipe_steps.technique_step_id` are the persistence target — no new migration
  needed unless an index/constraint gap surfaces (new migration starts at 052).
- `/recipes` route + recipe edit form + `RecipeDetailSheet` are the surfaces
  touched. Picker reads the Phase 142 technique library.
- Invalidate recipe + instance + slot-map query keys symmetrically on apply and
  on slot edit so the detail view and editor stay coherent.

</code_context>

<specifics>
## Specific Ideas

- The apply flow is **picker → slot-fill → insert** in one continuous action;
  the user never has to leave the recipe editor to pick paints.
- `effectivePaintId()` is the **single resolution spine** — no consumer reads
  `step.paint_id` directly for technique-owned steps; those rows are always
  `paint_id = NULL`.
- The `saveRecipeGraph` skip-guard is the **safety invariant of the phase**:
  prove with a data-layer test that editing/saving a recipe never mutates a
  `technique_step_id`-bearing step before any UI relies on it.
- Materialisation mirrors `saveRecipeGraph`'s single-db-handle shape exactly —
  no nested transactions, flat inline SQL.

</specifics>

<deferred>
## Deferred Ideas

- Live-link re-sync when a technique's structure changes
  (`resyncTechniqueInstance`) → Phase 144.
- Painting Mode / paint-availability / apply-to-units / SectionedTimeline /
  Log Session integration → Phase 145.
- Detach (break live link, materialise as plain content) + persistent section
  badges/safety rails → Phase 146.
- TQOL items (per-instance timestamp, slot suggestions, bulk reassign,
  soft-override flow) → v0.7.0 v2 (deferred in STATE.md).

</deferred>
