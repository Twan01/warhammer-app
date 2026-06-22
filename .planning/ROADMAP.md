# Roadmap: HobbyForge v0.7.0 Technique Library

## Overview

v0.7.0 adds a parameterized, live-linked technique layer above the existing recipe graph. A technique is a full mini-recipe (sections + steps + named colour slots) authored once in a dedicated library and reused across recipes — each recipe fills the slots with its own paints while sharing structure. The build order is strict: schema + progress-identity decision first (gates everything), then authoring, apply flow, live-link re-sync (test-first, highest risk), integration across all existing surfaces, and finally detach + safety rails.

Phases 1–140 covered v0.1.1 through v0.6.0 (shipped 2026-06-19). This milestone starts at Phase 141.

## Milestones

- **[SHIPPED] v0.1.1 HobbyForge MVP** — Phases 1–5 (shipped 2026-05-01)
- **[SHIPPED] v0.2.0 Utility Layer** — Phases 6–9 (shipped 2026-05-03)
- **[SHIPPED] v0.2.1 Visual Command** — Phases 10–16 + 20 (shipped 2026-05-04)
- **[SHIPPED] v0.2.2 Full Circle** — Phases 17–19, 21–24, 35 (shipped 2026-05-05)
- **[SHIPPED] v0.2.3 Hobby Command Center** — Phases 25–29 (shipped 2026-05-05)
- **[SHIPPED] v0.2.4 Premium Dashboard UX** — Phases 30–34, 36 (shipped 2026-05-06)
- **[SHIPPED] v0.2.5 Recipes 2.0** — Phases 37–41 (shipped 2026-05-07)
- **[SHIPPED] v0.2.6 Rules Sync 2.0** — Phases 42–47 (shipped 2026-05-08)
- **[SHIPPED] v0.2.7 Recipes 3.0** — Phases 48–51 (shipped 2026-05-08)
- **[SHIPPED] v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day** — Phases 52–56 (shipped 2026-05-11)
- **[SHIPPED] v0.2.9 Recipes 3.1** — Phases 57–60 (shipped 2026-05-12)
- **[SHIPPED] v0.2.10 Applied Recipes, Points Import & List Validation** — Phases 61–67 (shipped 2026-05-13)
- **[SHIPPED] v0.2.11 Foundation Hardening** — Phases 68–72 (shipped 2026-05-13)
- **[SHIPPED] v0.2.13 Data Integrity, Diagnostics & Product Coherence** — Phases 73–78 (shipped 2026-05-15)
- **[SHIPPED] v0.2.14 Backup 2.0** — Phases 79–83 (shipped 2026-05-19)
- **[SHIPPED] v0.2.15 Painting Mode** — Phases 84–88 (shipped 2026-05-20)
- **[SHIPPED] v0.2.18 Army Lists 3.0** — Phases 89–95 (shipped 2026-05-22)
- **[SHIPPED] v0.3.0 Robustness & Architecture Hardening** — Phases 96–99 (shipped 2026-05-22)
- **[SHIPPED] v0.3.7 Smart Automation** — Phases 100–102 (shipped 2026-05-28)
- **[SHIPPED] v0.4.0 Unit Database** — Phases 103–107 (shipped 2026-05-31)
- **[SHIPPED] v0.4.2 Unit Database 2.0** — Phases 108–111 (shipped 2026-06-01)
- **[SHIPPED] v0.4.5 Data Quality Audit & Pipeline Improvement** — Phases 112–115 (shipped 2026-06-03)
- **[SHIPPED] v0.4.7 Wahapedia Pipeline & Full Data Import** — Phases 116–120 (shipped 2026-06-09)
- **[SHIPPED] v0.5.0 Settings & Preferences** — Phases 121–125 (shipped 2026-06-11)
- **[SHIPPED] v0.5.2 UX Polish & Consistency** — Phases 126–129 (shipped 2026-06-12)
- **[SHIPPED] v0.6.0 Bulletproof & Honest** — Phases 130–140 (shipped 2026-06-19)
- **[ACTIVE] v0.7.0 Technique Library** — Phases 141–146 (in progress)

## Phases

- [x] **Phase 141: Schema Foundation & Progress-Identity Lock** — Migrations 051+, materialise-vs-resolve decision encoded, data-layer tests written before any UI (completed 2026-06-21)
- [x] **Phase 142: Technique Authoring & Library Browse** — Full technique CRUD with section/step/slot authoring, library page, detail view, usage count
 (completed 2026-06-21)
- [x] **Phase 143: Apply Flow & Slot-Fill System** — Technique picker, slot-fill dialog, recipe_technique_instances rows, effectivePaintId() spine wired to all consumers
 (completed 2026-06-22)
- [x] **Phase 144: Live-Link Re-Sync** — resyncAllInstancesForTechnique (Option A) or virtual-JOIN propagation (Option B), "X recipes affected" warning, data-layer tests gate (completed 2026-06-22)
- [ ] **Phase 145: Integration Pass** — Painting Mode, paint availability, apply-to-units, SectionedTimeline, recipe duplication, unfilled-slot warning across all surfaces
- [ ] **Phase 146: Detach & Safety Rails** — detachTechniqueInstance with progress remapping, confirm dialog, "from technique X" badge with detach affordance, deleteTechnique guard

## Phase Details

### Phase 141: Schema Foundation & Progress-Identity Lock
**Goal**: The technique schema exists in hobbyforge.db with correct FK cascades, and the progress-key materialisation strategy (Option A vs B) is decided, encoded in migration(s), and verified by data-layer tests — before any technique UI is built
**Depends on**: Phase 140 (v0.6.0 complete; current migration count is 050)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05
**Success Criteria** (what must be TRUE):
  1. A fresh install creates all six new technique tables (`techniques`, `technique_sections`, `technique_steps`, `technique_colour_slots`, `recipe_technique_instances`, `recipe_technique_slot_maps`) with the correct CASCADE hierarchy and UNIQUE constraint on slot fills
  2. The Option A vs B decision is recorded in PROJECT.md Key Decisions and encoded in the migration(s) — no future migration can contradict it
  3. A data-layer test (better-sqlite3) verifies that adding, removing, or reordering a technique step does not move or orphan an existing step-completion marker
  4. `effectivePaintId()` exists in `src/lib/` as a pure function and all existing tests remain green
  5. Migration parity (`pnpm check:version`) passes with the new migration file(s) counted
**Plans**: 3 plans
- [x] 141-01-PLAN.md — Migration 051 (six tables + CASCADE + UNIQUE + two ALTER cols) + lib.rs registration + PROJECT.md Option A decision + schema-shape assertions (FND-01, FND-02)
- [x] 141-02-PLAN.md — effectivePaintId() pure resolver + nullable technique_step_id on RecipeStep/DraftStep + unit test (FND-04)
- [x] 141-03-PLAN.md — FND-03 progress-identity data-layer test (reorder/add/remove-step/remove-slot + teeth-proving counter-case) via flat single-handle SQL (FND-03, FND-05)

### Phase 142: Technique Authoring & Library Browse
**Goal**: Users can create, edit, delete, and duplicate named techniques with full section/step/slot structure, and browse the technique library from within Workshop/Recipes
**Depends on**: Phase 141
**Requirements**: TECH-01, TECH-02, TECH-03, TECH-04, TECH-05, SLOT-01, SLOT-02, LIB-01, LIB-02, LIB-03, LIB-04
**Success Criteria** (what must be TRUE):
  1. User can open a technique form, add sections and steps with painting phase/tool/dilution/time metadata, define named colour slots with role hints, and save — all IDs are stable across edits (no step-ID churn)
  2. User can edit a technique's structure (add/remove/reorder sections, steps, slots) and the save is non-destructive — existing `technique_step_id` values survive the update
  3. User can delete a technique and receives a usage-count warning if N recipes depend on it
  4. User can duplicate a technique, producing an independent copy with new IDs across all sections, steps, and slots
  5. The technique library page (under Workshop/Recipes, no new top-level sidebar entry) lists techniques with name, effect category, difficulty, usage count, supports filter by effect and name search, and a detail view shows the full section/step tree plus a "used by N recipes" list
**Plans**: 4 plans
- [x] 142-01-PLAN.md — Technique types + Zod schema + draft-section helpers + 5 Nyquist test stubs (Wave 0)
- [x] 142-02-PLAN.md — Data layer: slot diff + non-destructive saveTechniqueGraph + duplicate/delete + usage queries + hooks
- [x] 142-03-PLAN.md — Authoring form: slot row, slot-picker step row, section/step editor, TechniqueFormSheet
- [x] 142-04-PLAN.md — Library browse: card/grid/detail/delete + filters + Recipes-page Tabs integration + RTL tests
**UI hint**: yes

### Phase 143: Apply Flow & Slot-Fill System
**Goal**: Users can add a technique to a recipe by filling its colour slots with real paints; the resolved paint is the single source of truth for every consumer via `effectivePaintId()`
**Depends on**: Phase 142
**Requirements**: SLOT-03, SLOT-04, SLOT-05, SLOT-06, APPLY-01, APPLY-02, APPLY-03, APPLY-04, APPLY-05
**Success Criteria** (what must be TRUE):
  1. From the recipe section editor, user can open a technique picker, browse/search the library, preview a technique's slots and steps, and insert it at a chosen position — a `recipe_technique_instances` row is created
  2. A slot-fill dialog lets the user assign a paint to each slot (one slot per row with role hint and current swatch shown); unassigned slots are saved as empty without error, treated like paintless steps
  3. An applied technique appears in the recipe as a section with a "from technique X" badge; the same technique can be applied twice in the same recipe with independent slot mappings
  4. User can view and change slot colours from the recipe detail view — not only from the full edit form
  5. `saveRecipeGraph` is guarded to skip steps with `technique_step_id IS NOT NULL`, so the recipe editor cannot accidentally overwrite live-linked steps
**Plans**: 4 plans
- [x] 143-01-PLAN.md — Wave 0: data-layer tests (guard/apply/effectivePaintId) + saveRecipeGraph guard + buildDraftSections forward/filter (SC#5)
- [x] 143-02-PLAN.md — Data layer: applyTechnique mutation + slot-map query module (resolution/instance maps) + hooks with CASCADE invalidation
- [x] 143-03-PLAN.md — Apply flow UI: technique picker Dialog + slot-fill Dialog + editor wiring + badged/locked technique sections
- [x] 143-04-PLAN.md — Detail view: effectivePaintId() spine wiring + interactive badge + read-only steps + "Edit colours" pre-populated edit (APPLY-05)
**UI hint**: yes

### Phase 144: Live-Link Re-Sync
**Goal**: Editing a technique's step structure propagates to every recipe using it while each recipe keeps its own slot colours; propagation correctness is verified by data-layer tests before any UI surface depends on it
**Depends on**: Phase 143
**Requirements**: LINK-01, LINK-02, LINK-03
**Success Criteria** (what must be TRUE):
  1. After saving a structural technique change (add/remove/reorder step), every recipe containing that technique reflects the new structure — existing step completions for surviving steps are untouched
  2. Before saving a structural technique change the user sees "X recipes will be affected" with a change summary (e.g. "adds 1 step, removes 1 step") — not just a raw count
  3. Data-layer tests (better-sqlite3) cover all four edit cases: reorder steps (progress unmoved), add step (new uncompleted row), remove step (progress row gone), add/remove slot (orphan prevention via CASCADE)
  4. The resync function uses a single db handle throughout — no nested `getDb()` calls, no nested `BEGIN` (flat inline SQL constraint respected)
**Plans**: 3 plans
- [x] 144-01-PLAN.md — Wave 0/1: migration 052 (technique_section_id + resync index) + data-layer resync test (RED) + resyncTechniqueInstances/getNonDetachedInstanceCount (GREEN) (LINK-01)
- [x] 144-02-PLAN.md — Pure previewTechniqueResyncDiff + unit test + wire resync into saveTechniqueGraph edit path + recipe-scoped invalidation (LINK-01, LINK-03)
- [x] 144-03-PLAN.md — Affected-recipes confirmation dialog intercept in TechniqueFormSheet + human-verify checkpoint (LINK-02, LINK-03)
**UI hint**: yes

### Phase 145: Integration Pass
**Goal**: Technique-sourced steps work correctly across Painting Mode, paint availability, apply-to-units, SectionedTimeline, Log Session, and recipe duplication — with no silent undercounting or missing swatches
**Depends on**: Phase 144
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04, INTG-05, INTG-06, INTG-07
**Success Criteria** (what must be TRUE):
  1. In Painting Mode, technique-sourced steps show the slot-resolved paint swatch (or an unfilled-slot indicator distinct from the paintless-step indicator), keyboard shortcuts work unchanged, and step completion records against the stable technique-step identity
  2. Paint availability counts (owned/missing) include slot-resolved paints via `effectivePaintId()`, and surface an "N colour slots unfilled" warning alongside the existing owned/missing count
  3. Apply-to-units per-unit step progress works for technique-sourced steps — the step list is not empty for technique-owned steps
  4. The SectionedTimeline displays technique-sourced sections with a "from technique X" badge; Log Session's cascading section selector includes technique-sourced section names
  5. Duplicating a recipe creates new technique instances and copies slot fills for the copy — it does not copy technique steps into the recipe graph (the live link is preserved in the duplicate)
  6. In Painting Mode, tapping the paint swatch on a technique-sourced step opens a slot-fill mini-dialog so the user can reassign that slot's paint inline without leaving the mode
**Plans**: 4 plans
- [x] 145-01-PLAN.md — Wave 0 data layer: getUnfilledSlotCount + getStepSlotIdMap + hooks/invalidation + 3 data-layer tests (duplication live-link, unfilled-count, availability no-undercounting) (INTG-02, INTG-05, INTG-06)
- [x] 145-02-PLAN.md — Painting Mode core: effectivePaintId wiring + distinct unfilled-slot indicator + "N colour slots unfilled" banner (INTG-01, INTG-02, INTG-06)
- [ ] 145-03-PLAN.md — Apply-to-units checklist resolution + SectionedTimeline badge / Log Session coverage (INTG-03, INTG-04)
- [ ] 145-04-PLAN.md — Inline SlotReassignMiniDialog + Painting Mode swatch-tap wiring (INTG-07)
**UI hint**: yes

### Phase 146: Detach & Safety Rails
**Goal**: Users can permanently break a technique live link, materialising its sections/steps as plain editable recipe content with progress correctly remapped; every live-linked section is visibly badged so the user always knows what is linked
**Depends on**: Phase 145
**Requirements**: SAFE-01, SAFE-02, SAFE-03
**Success Criteria** (what must be TRUE):
  1. Every technique-sourced section shows a "from technique X" badge in both the recipe editor and the SectionedTimeline view
  2. User can trigger Detach from the badge; a confirmation dialog warns "this breaks the live link permanently" before proceeding
  3. After detach, the section is fully editable plain recipe content — no half-linked state, FK columns cleared, and existing step-completion progress is correctly remapped to the now-plain recipe_step_id rows
  4. Attempting to delete a technique that still has live recipe instances surfaces the affected-recipe count and requires explicit confirmation
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 141. Schema Foundation & Progress-Identity Lock | v0.7.0 | 3/3 | Complete    | 2026-06-21 |
| 142. Technique Authoring & Library Browse | v0.7.0 | 4/4 | Complete   | 2026-06-21 |
| 143. Apply Flow & Slot-Fill System | v0.7.0 | 4/4 | Complete   | 2026-06-22 |
| 144. Live-Link Re-Sync | v0.7.0 | 3/3 | Complete   | 2026-06-22 |
| 145. Integration Pass | v0.7.0 | 2/4 | In Progress|  |
| 146. Detach & Safety Rails | v0.7.0 | 0/TBD | Not started | - |
