# Phase 146: Detach & Safety Rails - Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

> Captured via smart discuss (autonomous mode). All four grey areas accepted at
> the recommended answers. The pivotal product decision (Area 3 Q2) was made
> explicitly: deleting a technique with live instances **auto-detaches them first**
> (bakes resolved paints into plain recipe content) and only then deletes the
> technique — the user never loses recipe content. Grounded in the Phase 141
> Option-A lock, the v0.2.13 progress invariant (progress keyed by
> `recipe_step_id`), the Phase 144 resync engine, and the v0.6.0 "bulletproof &
> honest" principle.

<domain>
## Phase Boundary

This phase delivers **detach + safety rails** — the one-way escape hatch that
turns a live-linked technique instance back into plain editable recipe content,
plus the persistent visibility that tells the user what is linked. Concretely:

1. **Detach (data layer).** A new `detachTechniqueInstance(db, instanceId)`
   function: for every technique-owned `recipe_steps` row in the instance, it
   **bakes** the resolved paint — `effectivePaintId()` — into `recipe_steps.paint_id`,
   then NULLs `recipe_steps.technique_step_id`; it NULLs
   `recipe_sections.technique_instance_id` and `recipe_sections.technique_section_id`
   on the instance's sections; and it deletes the `recipe_technique_instances`
   row plus its `recipe_technique_slot_maps`. The surviving `recipe_step.id`
   values are **never recreated**, so `unit_recipe_step_progress` (keyed by
   `recipe_step_id`) is preserved with zero remap (SC#3). No half-linked state:
   after detach the section is fully plain, editable recipe content (SAFE-02).
2. **Persistent badges (UI).** Every technique-sourced section shows a "From
   {technique}" badge in **both** the recipe editor (RecipeSectionCard, which
   already receives `techniqueName`) and the SectionedTimeline view (SC#1).
3. **Detach trigger + confirmation.** The detach action lives on the section's
   badge/menu in the **editor only** (timeline badge is read-only). An
   AlertDialog warns "this breaks the live link permanently — future technique
   edits won't update this recipe", reassures that current steps & colours are
   kept, then on confirm runs the detach and shows a success toast + invalidates
   recipe/section/step/progress query keys (SAFE-01).
4. **Delete safety rail.** Deleting a technique that has live (non-detached)
   instances surfaces the **affected non-detached recipe count** and requires
   explicit confirmation; on confirm it **auto-detaches every live instance
   first** (baking paints → plain content) and only then deletes the technique,
   so no recipe content is lost (SAFE-03, SC#4). Detached instances are already
   plain content → unaffected and not counted.

**Out of scope (deferred):** re-attach / re-link after detach (detach is
one-way); bulk detach across recipes; the TQOL v2 items.

</domain>

<decisions>
## Implementation Decisions

### Detach Mechanics — Data Layer (Area 1 — accepted)
- `detachTechniqueInstance(db, instanceId)`: **bake** each technique-owned step's
  `effectivePaintId()` result into `recipe_steps.paint_id`, then NULL its
  `technique_step_id`. NULL `technique_instance_id` and `technique_section_id`
  on the instance's `recipe_sections`. DELETE the `recipe_technique_instances`
  row and its `recipe_technique_slot_maps` (clean break — no half-linked state).
- **Granularity:** per technique-**instance** (all its sections/steps at once),
  triggerable from any of the instance's section badges. Not per-section.
- **Progress preservation:** keep `recipe_step.id` stable — only clear FK
  columns, never DELETE+INSERT, so `unit_recipe_step_progress` (v0.2.13
  invariant, keyed by `recipe_step_id`) survives untouched. Zero remap.
- **Code shape:** single db handle, flat inline SQL, no nested `getDb()` / no
  nested `BEGIN`. A **data-layer test is written first** (guard-first discipline,
  mirroring Phase 143/144): complete a technique step, detach, assert completion
  survives and the step is now plain (technique_step_id NULL, paint_id baked).

### Badge Presentation & Detach Trigger — UI (Area 2 — accepted)
- Badge: small shadcn `Badge` (outline/secondary) reading "From {technique}"
  with a link icon, rendered in **both** RecipeSectionCard (editor) and the
  SectionedTimeline section header.
- **Detach action:** editor only — on the section's badge/menu. The
  SectionedTimeline badge is **read-only display** (no detach there).
- **Confirmation:** shadcn `AlertDialog` warning "This breaks the live link
  permanently. Future technique edits won't update this recipe." plus a
  reassurance line "Your current steps & colours are kept."
- **Post-detach feedback:** success toast "Technique detached — now plain recipe
  content" and invalidate recipe + section + step-count + progress query keys.

### Technique Delete Safety Rail (Area 3 — accepted, KEY DECISION)
- Extend the existing `TechniqueDeleteDialog` to surface the **non-detached**
  live-instance recipe count (detached instances are already plain → unaffected,
  not counted). Reuse / extend `getNonDetachedInstanceCount`.
- **On delete with live instances: AUTO-DETACH FIRST.** Iterate every
  non-detached instance, run the detach (bake paints → plain content), then
  delete the technique. The user keeps all recipe content — chosen explicitly
  over the current cascade-remove behavior per the v0.6.0 honesty/safety
  principle. All of this on a single db handle, flat inline SQL.
- **Confirmation friction:** when count > 0, the confirm button is labelled with
  the consequence (e.g. "Detach N recipes & delete"); explicit, not type-to-confirm.
- **Empty case:** no live instances → keep the current simple "permanently
  remove" copy.

### Edge Cases & Scope (Area 4 — accepted)
- Unfilled slots at detach → bake `NULL` paint_id (the step stays validly
  paintless — same empty state the apply/resync flow already produces).
- Manual user-added steps inside a technique section (paint_id ≠ NULL) → left
  untouched; they are already plain and survive detach unchanged.
- Re-attach / re-link after detach → **out of scope** (detach is one-way).
- Bulk detach across recipes → out of scope (v2).

### Claude's Discretion
- Module placement of `detachTechniqueInstance` (extend
  `recipeTechniqueInstances.ts` vs `recipeTechniqueResync.ts` vs a new module) —
  pick whichever keeps the apply/resync/detach trio cohesive.
- Exact badge component composition and the menu/affordance used to host the
  Detach action in the editor (dropdown vs inline button).
- React Query hook shape for the detach mutation (`useDetachTechniqueInstance`)
  and invalidation symmetry, mirroring existing technique/recipe hooks.
- Test file naming under `tests/data-layer/` mirroring existing conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/queries/recipeTechniqueInstances.ts` — `applyTechnique` (the
  materialisation detach reverses) + `getInstancesForRecipe`; the 14-column
  recipe_steps shape and instance/section/slot-map model are the template.
- `src/db/queries/recipeTechniqueResync.ts` — `resyncTechniqueInstances` (single
  db handle, flat inline SQL, technique_step_id matching) and
  `getNonDetachedInstanceCount` (reuse for the delete dialog count). The detach
  is conceptually the inverse — both must keep `recipe_step.id` stable.
- `src/lib/effectivePaintId.ts` — keyed by `recipe_steps.id`; detach must call
  this to bake the resolved paint into `paint_id` before clearing the FK link.
- `src/features/recipes/RecipeSectionList.tsx` — already resolves and passes
  `techniqueName` into `RecipeSectionCard` (lines 180-184) via
  `TechniqueNameResolver`; the badge + detach affordance hook in here.
- `src/features/recipes/RecipeSectionCard.tsx` — receives `techniqueName`; the
  editor badge + detach menu live on this card.
- `src/features/techniques/TechniqueDeleteDialog.tsx` — already shows a
  `usageCount`; extend its copy + confirm flow for the auto-detach safety rail.
- `src/hooks/useTechniques.ts` — `useDeleteTechnique`; the delete mutation that
  must auto-detach live instances before removing the technique.
- SectionedTimeline view (Painting Mode / RecipeDetailSheet consumers) — the
  read-only badge surface for SC#1.

### Established Patterns
- Flat inline SQL only (tauri-plugin-sql cannot nest transactions); `$1,$2`
  params; booleans `0|1`; `PRAGMA foreign_keys = ON`; FK `ON DELETE CASCADE` /
  `SET NULL` already wired in migration 051.
- Progress keyed by `recipe_step_id` (v0.2.13 invariant) — detach MUST NOT
  recreate surviving recipe_step rows.
- React Query hook-per-entity with invalidation symmetry; data-layer tests via
  `tests/data-layer/db-helpers.ts` (`createDbBridge`, `createHobbyforgeDb`).
- shadcn `Badge`, `Dialog`/`AlertDialog` for confirmations; `sonner` toasts.

### Integration Points
- `detachTechniqueInstance` call site: the editor section-badge detach menu (via
  a `useDetachTechniqueInstance` mutation) and the `useDeleteTechnique` flow
  (auto-detach loop before technique DELETE).
- Migration 051 schema: `recipe_technique_instances` (detached flag),
  `recipe_technique_slot_maps`, `recipe_sections.technique_instance_id` /
  `.technique_section_id`, `recipe_steps.technique_step_id`,
  `unit_recipe_step_progress` — all exist; no new migration expected (next would
  be 054 — migrations currently at 053).
- Invalidate recipe + section + step-count + progress + slot-map + technique
  query keys after detach / delete so every affected surface refreshes.

</code_context>

<specifics>
## Specific Ideas

- The detach correctness invariant — **surviving steps keep their
  `recipe_step.id`**, only FK columns are cleared — is the SC#3 gate. Prove it
  with a data-layer test (complete a step, detach, assert completion survives and
  the row is now plain) before any UI is built, mirroring Phase 143/144
  guard-first discipline.
- Detach must **bake the resolved colour** (`effectivePaintId()` → `paint_id`)
  *before* deleting the slot maps, or the colours are lost — this is the single
  most important ordering constraint in the phase.
- The delete safety rail is **honest**: it names the consequence ("Detach N
  recipes & delete") and preserves content rather than silently destroying it —
  directly serving the v0.6.0 honesty principle and SAFE-03.

</specifics>

<deferred>
## Deferred Ideas

- Re-attach / re-link a detached section back to its technique (detach is
  one-way this milestone).
- Bulk detach across multiple recipes at once.
- TQOL items (per-instance timestamp, slot suggestions, bulk reassign,
  soft-override flow) → v0.7.0 v2.

</deferred>
