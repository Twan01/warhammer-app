# Phase 145: Integration Pass - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

> Captured via smart discuss (autonomous mode). All four grey areas accepted at
> the recommended answers — grounded in the FND-04 `effectivePaintId()` spine
> (keyed by `recipe_step.id` after the 143 CR-01 fix), the Phase 143/144 data
> layer, and the existing Painting Mode / availability / apply-to-units consumers.

<domain>
## Phase Boundary

This phase makes technique-sourced steps **work correctly across every paint
consumer** — wiring the `effectivePaintId()` resolution spine into the surfaces
that still read `step.paint_id` directly, and adding the small UI affordances the
integration needs. No silent undercounting, no missing swatches. Concretely:

1. **Painting Mode** (`PaintingModeView`, `StepFocalView`): resolve every step's
   paint via `useSlotResolutionMap(recipeId)` + `effectivePaintId(step, slotMap)`
   instead of `step.paint_id`. Technique-sourced steps show the slot-resolved
   swatch or a **distinct unfilled-slot indicator** (separate from the
   paintless-step indicator). Completion still records against the stable
   `recipe_step.id`; keyboard shortcuts are unchanged (INTG-01, SC#1).
2. **Paint availability** (`useRecipePaints` / readiness): owned/missing counts
   resolve technique steps via `effectivePaintId()` so they match Painting Mode.
   Unfilled slots are **not** counted as "missing"; instead a separate
   **"N colour slots unfilled"** warning surfaces alongside the existing
   owned/missing readiness banner (INTG-02, INTG-06, SC#2).
3. **Apply-to-units** (`AssignmentChecklist` / `ChecklistStepRow`): the per-unit
   step list resolves technique steps via `effectivePaintId()` so it is **not
   empty** for technique-owned steps; progress records against `recipe_step.id`
   (INTG-03, SC#3).
4. **SectionedTimeline & Log Session**: SectionedTimeline shows technique-sourced
   sections with a **"from technique X" badge**; Log Session's cascading section
   selector **includes** technique-sourced section names (they are real
   `recipe_sections`) (INTG-04, SC#4).
5. **Recipe duplication**: keep the Phase 143 (CR-02) behaviour — duplicating a
   recipe creates **new technique instances + copies slot maps**, and the
   materialised steps keep their `technique_step_id` so the **live link is
   preserved** in the copy (not flattened into plain steps). Add an integration
   test asserting this (INTG-05, SC#5).
6. **Inline slot-fill in Painting Mode**: tapping a technique-sourced step's paint
   swatch opens a **single-slot mini-dialog** to reassign that slot's paint
   without leaving the mode, saving via `updateSlotMap` with live swatch refresh
   (INTG-07, SC#6).

**Out of scope (Phase 146):** detach (break live link → materialise as plain
editable recipe content with progress remapped) + persistent section
badges/safety rails. This phase integrates the **live-linked** model everywhere;
detaching it is the next phase.

</domain>

<decisions>
## Implementation Decisions

### Painting Mode Resolution & Completion (Area 1 — accepted)
- Resolve every step's paint via `useSlotResolutionMap(recipeId)` +
  `effectivePaintId(step, slotMap)` — replace direct `step.paint_id` reads in
  `PaintingModeView` and `StepFocalView`.
- Step completion is **unchanged** — records against `recipe_step.id` (already a
  stable identity; technique steps are materialised recipe_steps).
- Keyboard shortcuts are **unchanged** — technique steps behave like normal steps
  for navigation and completion.
- A **distinct unfilled-slot indicator** (e.g. dashed/outline swatch + "slot
  unfilled" affordance) is shown for technique steps whose slot has no paint —
  visually separate from the paintless-step indicator (which means "no paint
  intended").

### Paint Availability & Unfilled Warning (Area 2 — accepted)
- `useRecipePaints` / the readiness computation resolves technique steps via
  `effectivePaintId()` so owned/missing counts **match Painting Mode**.
- Unfilled slots are **not** counted as "missing" (missing = a chosen paint the
  user doesn't own); they are surfaced separately.
- The **"N colour slots unfilled"** warning is shown **alongside** the existing
  owned/missing readiness banner (`PaintReadinessBanner`).
- N = the count of unfilled slots across the recipe's technique instances
  (aggregate, not per-instance breakdown).

### Apply-to-units, SectionedTimeline, Log Session (Area 3 — accepted)
- `AssignmentChecklist` / `ChecklistStepRow` resolve technique steps via
  `effectivePaintId()` so the per-unit checklist is **not empty** for
  technique-owned steps; progress records against `recipe_step.id`.
- `SectionedTimeline` gains the **"from technique X" badge** on technique-sourced
  sections (the slotMap was wired in 143; the badge is added here).
- Log Session's cascading section selector **includes** technique-sourced section
  names (they are real `recipe_sections`).
- All three reuse the **same `useSlotResolutionMap(recipeId)` spine** — no
  per-consumer resolution queries.

### Duplication & Inline Slot-Fill + Tests (Area 4 — accepted)
- **Duplication:** keep the Phase 143 CR-02 behaviour — duplicate creates new
  `recipe_technique_instances` + copies `recipe_technique_slot_maps`, and the
  materialised `recipe_steps` keep `technique_step_id` (live link preserved, not
  flattened). Add an **integration test** asserting the copy has its own
  instances + slot fills and remains live-linked.
- **Painting Mode inline fill (SC#6/INTG-07):** tapping a technique step's swatch
  opens a **single-slot mini-dialog** to reassign that slot's paint without
  leaving the mode, saving via `updateSlotMap` and invalidating so the swatch
  updates live.
- **Mini-dialog scope:** focused **single-slot** reassign for the tapped step's
  slot (not the full multi-slot dialog).
- **Test strategy:** a cross-consumer integration test (data-layer + component)
  proving `effectivePaintId()` resolution and **no silent undercounting** across
  availability / Painting Mode / apply-to-units.

### Claude's Discretion
- Exact unfilled-slot indicator visual treatment (within the shadcn/zinc system
  and the Phase 143 swatch conventions).
- Whether the inline mini-dialog is a new focused component or a single-slot mode
  of the existing slot-fill dialog.
- Precise placement/wording of the "N colour slots unfilled" line in the
  readiness banner.
- Integration test file placement under `tests/`.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/effectivePaintId.ts` — the resolution spine (keyed by `recipe_step.id`
  after the 143 CR-01 fix); the function every consumer must route through.
- `src/hooks/useSlotResolutionMap.ts` — `useSlotResolutionMap(recipeId)` returns
  the `Map<recipe_step.id, paint_id|null>`; the single source for all consumers.
- `src/features/painting-mode/PaintingModeView.tsx` (lines ~49-50, 102-103) and
  `StepFocalView.tsx` (line ~61) — direct `step.paint_id` reads to replace.
- `src/features/painting-mode/PaintReadinessBanner.tsx` — host for the
  "N colour slots unfilled" warning.
- `src/features/recipes/AssignmentChecklist.tsx` (~127/152/169) +
  `ChecklistStepRow.tsx` (~38/80) — apply-to-units checklist paint resolution.
- `src/hooks/useRecipePaints.ts` (~line 111) — availability paint list; resolve
  via effectivePaintId so counts match.
- `src/features/recipes/SectionedTimeline.tsx` — already receives slotMap (143);
  add the `TechniqueSectionBadge` (143 component) to technique-sourced sections.
- `src/db/queries/recipes.ts` `duplicateRecipe` — already technique-aware (143
  CR-02); add the integration test.
- `src/features/recipes/EditColoursDialog.tsx` / `SlotFillDialog.tsx` (143) —
  templates for the single-slot Painting Mode mini-dialog; `updateSlotMap` +
  `useSlotMapByInstance` are the save/prefill path.
- Log Session: the cascading section selector component (find under
  `src/features/painting-mode/` Log Session / `PaintingSessionSheet` flow).

### Established Patterns
- `effectivePaintId(step, slotMap)` is the ONLY paint resolver for technique
  steps — no direct `step.paint_id` reads leak through.
- React Query hook-per-entity with invalidation symmetry; the 7-key CASCADE +
  slot-map keys from `useTechniqueInstances`.
- shadcn Dialog; React Hook Form; flat inline SQL; `$1,$2`; booleans `0|1`.
- Data-layer tests via `tests/data-layer/db-helpers.ts`; component tests via RTL.

### Integration Points
- Every paint-display surface: Painting Mode, readiness/availability,
  apply-to-units checklist, SectionedTimeline, Log Session selector, recipe
  duplication — all routed through `useSlotResolutionMap` + `effectivePaintId`.
- No new migration expected — the schema (051/052/053) already supports this
  phase; new migration would start at 054.
- `updateSlotMap` invalidation must refresh the Painting Mode swatch after an
  inline reassignment.

</code_context>

<specifics>
## Specific Ideas

- The phase's honesty invariant: **no silent undercounting**. A technique step
  with a filled slot must count toward owned/missing exactly as a plain step
  would; an unfilled slot must be visibly flagged ("N colour slots unfilled"),
  never silently dropped. Prove this with the cross-consumer integration test.
- The unfilled-slot indicator must be **distinguishable** from the paintless-step
  indicator — "slot waiting for a paint" vs "intentionally no paint".
- Inline reassignment in Painting Mode keeps the user in flow — tap swatch →
  pick paint → swatch updates, no navigation away.
- Duplication preserves the **live link** (not a flattened copy) — the copy stays
  in sync with future technique edits via the Phase 144 resync.

</specifics>

<deferred>
## Deferred Ideas

- Detach (break live link → materialise as plain editable recipe content with
  progress remapped) + persistent "from technique X" section badges/safety rails
  → Phase 146.
- TQOL items (per-instance timestamp, slot suggestions, bulk reassign,
  soft-override flow) → v0.7.0 v2.

</deferred>
