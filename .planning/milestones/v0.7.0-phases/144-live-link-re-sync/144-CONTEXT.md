# Phase 144: Live-Link Re-Sync - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

> Captured via smart discuss (autonomous mode). All four grey areas accepted at
> the recommended answers — grounded in the Phase 141 Option-A lock, the v0.2.13
> progress invariant (progress keyed by `recipe_step_id`), and the existing
> `saveTechniqueGraph` / `saveRecipeGraph` non-destructive save patterns.

<domain>
## Phase Boundary

This phase delivers **live-link re-sync**: editing a technique's step/slot
structure propagates to every recipe that has applied it, while each recipe
keeps its own slot colours and its existing step-completion progress. The resync
loop is the **highest-risk novel code in the milestone** — it is built and proven
at the data layer **before** any UI surface depends on it. Concretely:

1. A `resyncTechniqueInstances(db, techniqueId, …)` function runs synchronously
   inside `saveTechniqueGraph`'s UPDATE path (same shared db handle), after the
   technique's own sections/steps are saved. For every **non-detached**
   `recipe_technique_instances` row referencing the technique, it re-materialises
   the technique's sections/steps into that recipe's `recipe_sections` /
   `recipe_steps` (LINK-01).
2. **Progress is preserved** by matching surviving steps on `technique_step_id`
   (recipe_steps.technique_step_id ↔ technique_steps.id): a surviving step keeps
   its `recipe_step.id`, so `unit_recipe_step_progress` (keyed by `recipe_step_id`)
   is untouched. Reorder = UPDATE `order_index`; add = INSERT a new uncompleted
   recipe_step; remove = DELETE the recipe_step (its progress cascade-deletes).
3. Before committing a **structural** change the technique edit form shows a
   confirmation dialog: "**X recipes will be affected**" plus an aggregated
   change summary ("adds N steps, removes M steps, reorders K") — computed by a
   pure preview diff of the draft vs persisted structure with no DB writes
   (LINK-02, LINK-03, SC#2). Cancel aborts the **entire** save (no partial
   writes); Confirm proceeds with save + resync.
4. Slot add/remove relies on FK CASCADE for orphan prevention (removing a
   `technique_colour_slot` cascades `recipe_technique_slot_maps`); a newly added
   slot leaves each instance's slot unfilled (valid empty state, treated paintless).
5. The resync uses a **single db handle throughout** — no nested `getDb()`, no
   nested `BEGIN` (flat inline SQL constraint, SC#4).
6. Data-layer tests (better-sqlite3) prove all four edit cases — reorder
   (progress unmoved), add (new uncompleted row), remove (progress row gone),
   slot add/remove (orphan prevention via CASCADE) — **before** any UI depends on
   the resync (SC#3).

**Out of scope (later phases):** integration across Painting Mode / paint
availability / SectionedTimeline / Log Session (145); detach (break live link,
materialise as plain content) + persistent section badges/safety rails (146).
Detached instances are explicitly **excluded** from resync this phase.

</domain>

<decisions>
## Implementation Decisions

### Resync Trigger & Scope (Area 1 — accepted)
- Resync runs **synchronously inside `saveTechniqueGraph`'s UPDATE path**, after
  the technique's own sections/steps save, on the **same db handle**.
- Resync targets **all non-detached** `recipe_technique_instances` for the
  technique (`detached = 0`); detached instances are skipped (Phase 146 owns
  detach).
- Trigger: **structural changes** (add/remove/reorder step or slot) drive the
  confirmation + resync; pure metadata edits (rename, notes, time) still
  propagate via resync but require no confirmation.
- New function **`resyncTechniqueInstances(db, techniqueId, …)`** takes the shared
  db handle (in `recipes.ts` or a dedicated module — Claude's discretion), called
  by `saveTechniqueGraph`.

### Step-Identity & Progress Preservation (Area 2 — accepted)
- Surviving steps are matched by **`technique_step_id`**: existing
  `recipe_steps.technique_step_id` ↔ the persisted `technique_steps.id`. The
  surviving `recipe_step.id` is **never** recreated, so `unit_recipe_step_progress`
  (keyed by `recipe_step_id`, v0.2.13 invariant) is preserved.
- **Reorder** = UPDATE `order_index` on the surviving recipe_step row — never
  DELETE+INSERT.
- **Added** technique steps → INSERT new `recipe_steps` (paint_id NULL,
  technique_step_id set) with no progress rows — start uncompleted.
- **Removed** technique steps → DELETE the matching `recipe_step` row; its
  `unit_recipe_step_progress` rows cascade-delete via FK.

### Affected-Recipes Confirmation (Area 3 — accepted)
- A confirmation dialog appears in the technique edit form **before** committing
  a structural change.
- The summary shows **"X recipes will be affected"** plus **aggregated per-type
  counts** ("adds N steps, removes M steps, reorders K") — not a raw count alone
  (LINK-03).
- The diff is computed by a **pure preview function** comparing the draft
  technique structure against the persisted one (reuse the step-diff logic) — no
  DB writes during preview.
- **Confirm** → proceed with save + resync; **Cancel** → abort the entire save
  (no partial writes).

### Slot & Transaction Integrity (Area 4 — accepted)
- Slot add/remove: **FK CASCADE** handles orphans — removing a
  `technique_colour_slot` cascades `recipe_technique_slot_maps`; a newly added
  slot leaves each instance's slot **unfilled** (valid empty, treated paintless).
- **Transaction shape:** a single db handle is threaded from `saveTechniqueGraph`
  into `resyncTechniqueInstances`; flat inline SQL only; **no nested `getDb()` /
  `BEGIN`** (SC#4).
- **Section-level** changes: materialised `recipe_sections` are matched by
  `technique_instance_id` + source section; add/remove/reorder of sections mirror
  the step handling.
- **Tests (SC#3):** better-sqlite3 data-layer tests cover all four cases before
  any UI surface depends on the resync — reorder (progress unmoved), add (new
  uncompleted row), remove (progress gone), slot add/remove (orphan prevention).

### Claude's Discretion
- Exact module placement of `resyncTechniqueInstances` (extend `recipes.ts` vs a
  new `recipeTechniqueResync.ts`) — pick whichever keeps the save cohesive.
- Precise shape of the pure preview-diff function and its return type.
- Confirmation dialog component composition (reuse shadcn Dialog / AlertDialog).
- Test file naming under `tests/data-layer/` mirroring existing conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/queries/techniques.ts` `saveTechniqueGraph` (~line 338) — the
  non-destructive technique authoring save (single db handle, flat inline SQL,
  lastInsertId chaining); the UPDATE path is where resync hooks in. Its existing
  step-diff approach (existingSlots/Sections/Steps params) is the template for
  the preview diff.
- `src/db/queries/recipes.ts` — `saveRecipeGraph` (non-destructive UPDATE-not-
  replace, with the Phase 143 `technique_step_id` skip-guard) and `duplicateRecipe`
  (now technique-aware after the 143 CR-02 fix); both model the materialisation
  INSERT shape and the single-db-handle pattern resync must mirror.
- `src/db/queries/recipeTechniqueInstances.ts` — `applyTechnique` (the original
  materialisation that resync re-applies) + `getInstancesForRecipe`; the inverse
  lookup "instances for a technique" is the resync's iteration source.
- `src/db/queries/recipeTechniqueSlotMaps.ts` — slot-map queries; resync leaves
  slot maps intact (CASCADE handles removed slots).
- `src/lib/effectivePaintId.ts` — keyed by `recipe_steps.id` (after 143 CR-01);
  resync must keep materialised recipe_steps' identity stable so resolution and
  progress both survive.
- `src/features/recipes/recipeSection.ts` `buildDraftSections` — forwards/filters
  `technique_step_id`; the diff/identity logic here informs the preview diff.

### Established Patterns
- Flat inline SQL only (tauri-plugin-sql cannot nest transactions); `$1,$2`
  params; booleans `0|1`; `PRAGMA foreign_keys = ON`; FK `ON DELETE CASCADE`.
- Progress keyed by `recipe_step_id` (v0.2.13 invariant) — the entire phase
  hinges on NOT recreating surviving recipe_step rows.
- React Query hook-per-entity with invalidation symmetry; data-layer tests via
  `tests/data-layer/db-helpers.ts` (`createDbBridge`, `createHobbyforgeDb`).
- shadcn Dialog/AlertDialog for confirmations; React Hook Form + Zod in the
  technique edit form.

### Integration Points
- `saveTechniqueGraph` (techniques.ts) — resync call site + the structural-diff
  trigger feeding the confirmation dialog.
- The technique edit form (`TechniqueFormSheet` / Phase 142 authoring surface) —
  hosts the affected-recipes confirmation before save.
- Migration 051 schema: `recipe_technique_instances` (detached flag),
  `recipe_technique_slot_maps`, `recipe_sections.technique_instance_id`,
  `recipe_steps.technique_step_id`, `unit_recipe_step_progress` — all already
  exist; no new migration expected (new migration would start at 052).
- Invalidate recipe + section + step-count + progress + slot-map query keys after
  resync so every affected recipe's UI refreshes.

</code_context>

<specifics>
## Specific Ideas

- The resync's correctness invariant: **surviving steps keep their
  `recipe_step.id`** so `unit_recipe_step_progress` is never disturbed. Prove this
  with a data-layer test (complete a step, edit the technique structurally,
  assert the completion survives) before any UI is built — this is the SC#1/SC#3
  gate and mirrors the Phase 143 guard-first discipline.
- The confirmation is **honest**: it shows what will change ("adds 1 step,
  removes 1 step across 3 recipes"), not just a count — directly serving the
  v0.6.0 "honesty" principle.
- Resync is **single-db-handle, flat inline SQL** — the same constraint that
  shaped applyTechnique and saveRecipeGraph; no nested transactions.

</specifics>

<deferred>
## Deferred Ideas

- Painting Mode / paint-availability / SectionedTimeline / Log Session
  integration of technique-sourced steps → Phase 145.
- Detach (break live link, materialise as plain editable content with progress
  remapped) + persistent "from technique X" section badges/safety rails → Phase
  146. Detached instances are excluded from resync here.
- TQOL items (per-instance timestamp, slot suggestions, bulk reassign,
  soft-override flow) → v0.7.0 v2.

</deferred>
