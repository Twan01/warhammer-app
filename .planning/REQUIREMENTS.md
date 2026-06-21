# Requirements: HobbyForge — v0.7.0 Technique Library

**Defined:** 2026-06-19
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play." This milestone adds: author a painting technique (e.g. OSL, NMM) once as a reusable, colour-parameterized mini-recipe, then reuse it across recipes with different colours.

**Confirmed design decisions (from questioning):**
- Colour handling = **named colour slots/roles** (not manual re-pick after insert).
- Reuse semantics = **live link** (editing a technique's structure propagates to all recipes using it; each recipe keeps its own slot→paint colours).
- Capture unit = **a full mini-recipe** (multiple sections + steps), not a single section or a bare step group.
- All four optional enhancements selected for v0.7.0: missing-slots warning, technique duplication + "used by" list, change-summary on save, inline slot-fill in Painting Mode.

**Top engineering risk (carried from research):** progress is keyed by `recipe_step_id` (protected by three prior migrations + the whole v0.2.13 milestone). Live-linked technique steps can be added/removed/reordered, so technique-step progress MUST have a stable identity (`technique_step_id`, materialized or composite-keyed) or the v0.2.13 "completed step jumps" class of bug returns. This is requirement **FND-03**, the gate for everything else.

**Open implementation decision to lock in Phase 1 (not a scope question):** materialize technique steps as concrete `recipe_steps` rows carrying a `technique_step_id` FK column pointing back to its source `technique_steps` row (Architecture researcher; recommended default) **vs.** keep them virtual and resolve at read-time with a composite-key progress table (Pitfalls/Features researchers). Both preserve the FND-03 invariant. See `.planning/research/SUMMARY.md` "#1 Open Design Decision". Captured as **FND-02**.

---

## v1 Requirements

Requirements for the v0.7.0 release. Each maps to a roadmap phase.

### Foundation (Schema, Identity & Resolution Spine)

- [x] **FND-01**: Schema for techniques exists — `techniques`, `technique_sections`, `technique_steps`, `technique_colour_slots`, `recipe_technique_instances`, `recipe_technique_slot_maps` — with stable IDs, a full ON DELETE CASCADE hierarchy (technique → sections → steps; technique → slots; instance → slot maps), slot declared before steps, and slot-fill orphan prevention baked into the foundation migration (not patched later).
- [x] **FND-02**: The materialize-vs-read-time-resolve strategy is decided and encoded in the foundation migration before any technique UI is built, with the rationale recorded (default: materialize with `technique_step_id` linkage).
- [ ] **FND-03**: Technique-step completion progress is stable across technique edits — adding, removing, or reordering a technique step never silently moves or orphans an existing completion marker (no v0.2.13-class regression), verified by a data-layer test written before UI.
- [x] **FND-04**: A single pure `effectivePaintId()` resolution function in `src/lib/` resolves a step's paint from its slot map (falling back to `step.paint_id`), and is the one source every paint consumer reads from.
- [ ] **FND-05**: All technique-structure propagation is expressed as flat, single-db-handle SQL (no nested `BEGIN`/transactions), consistent with the `saveRecipeGraph` pattern.

### Technique Authoring (A)

- [ ] **TECH-01**: User can create a named technique with a full section + step structure (same draft section/step authoring model as the recipe form).
- [ ] **TECH-02**: User can set technique metadata — name, description, effect category (reusing `RECIPE_EFFECTS`), difficulty, estimated time, and a result/reference photo.
- [ ] **TECH-03**: User can edit a technique's structure (add / remove / reorder sections and steps) via a non-destructive graph save that keeps `technique_step_id` stable for existing instances.
- [ ] **TECH-04**: User can delete a technique, with a usage-count safety check that warns when N recipes depend on it.
- [ ] **TECH-05**: User can duplicate a technique, copying its sections, steps, and colour slots into an independent copy (e.g. "NMM Gold v2").

### Colour Slot System (B)

- [ ] **SLOT-01**: User can define named colour slots on a technique, each with a name, an optional role hint (e.g. "hottest point — near white"), and an order.
- [ ] **SLOT-02**: A technique step can reference a colour slot instead of a fixed paint.
- [ ] **SLOT-03**: Each recipe application of a technique carries its own slot→paint mapping, so the same technique can use different colours in different recipes.
- [ ] **SLOT-04**: A single recipe can contain multiple instances of the same technique, each with an independent slot mapping.
- [ ] **SLOT-05**: An unassigned (empty) slot is a valid state, not an error — treated like a paintless step in availability and Painting Mode.
- [ ] **SLOT-06**: The slot-fill UI shows each slot's role hint and the currently assigned paint swatch.

### Technique Library Browse (C)

- [ ] **LIB-01**: A technique library page lists saved techniques with name, effect category, difficulty, and usage count, accessed from within Workshop/Recipes (no new top-level sidebar entry).
- [ ] **LIB-02**: User can filter the library by effect category and search by name.
- [ ] **LIB-03**: A technique detail view shows the full section/step tree and all defined colour slots.
- [ ] **LIB-04**: The technique detail view lists the recipes currently live-linked to that technique ("used by"), making propagation blast-radius visible.

### Apply / Slot-Fill (D)

- [ ] **APPLY-01**: While editing a recipe, the user can add a technique to it from the recipe section editor.
- [ ] **APPLY-02**: A technique picker dialog lets the user browse/search the library, preview the technique's slots and steps, and choose the insertion position.
- [ ] **APPLY-03**: A slot-fill dialog lets the user assign a real paint to each slot (one slot per row, via the existing paint combobox), with empty slots allowed and fillable later.
- [ ] **APPLY-04**: An applied technique appears in the recipe as a section (at the chosen position) carrying a "from technique X" badge.
- [ ] **APPLY-05**: The user can view/change a technique instance's slot colours from the recipe detail view, not only from the full edit form.

### Live Link & Propagation (E)

- [ ] **LINK-01**: Editing a technique's step structure (add / remove / reorder) propagates to every recipe instance using it, while each recipe keeps its own slot colours.
- [ ] **LINK-02**: Before saving a structural technique change, the user sees an "X recipes will be affected" warning.
- [ ] **LINK-03**: That confirmation shows a change summary (e.g. "adds 1 step, removes 1 step across 3 recipes"), not just a count.

### Detach & Safety (F)

- [ ] **SAFE-01**: Every technique-sourced section shows a "from technique X" badge in both the recipe editor and the SectionedTimeline.
- [ ] **SAFE-02**: User can detach a technique instance in a recipe — materializing its sections/steps into plain editable recipe sections/steps, remapping progress correctly, and removing the live link.
- [ ] **SAFE-03**: Detach requires confirmation ("this breaks the live link permanently"), and the result is a fully editable plain section with no half-linked state.

### Integration with Existing Surfaces (G)

- [ ] **INTG-01**: Painting Mode executes technique-sourced steps correctly — showing the slot-resolved paint swatch, marking progress against the stable technique-step identity, with keyboard shortcuts unaffected.
- [ ] **INTG-02**: Paint availability ("owned/missing") counts slot-resolved paints via `effectivePaintId()`, matching what Painting Mode shows.
- [ ] **INTG-03**: Apply-to-units per-unit step progress works for technique-sourced steps.
- [ ] **INTG-04**: The SectionedTimeline displays technique-sourced sections (with badge), and Log Session's cascade selectors include technique-sourced section names.
- [ ] **INTG-05**: Duplicating a recipe preserves its live links — creating new technique instances + slot maps for the copy, not copying technique steps into the recipe graph.
- [ ] **INTG-06**: Paint readiness surfaces an "N colour slots unfilled" warning alongside the existing owned/missing warning.
- [ ] **INTG-07**: User can reassign a slot's paint inline during Painting Mode (tap the swatch to open a slot-fill mini-dialog).

---

## v2 Requirements

Acknowledged but deferred — not in the v0.7.0 roadmap.

### Technique Quality-of-Life

- **TQOL-01**: Per-instance "last synced" timestamp on the "from technique X" badge tooltip.
- **TQOL-02**: Slot-fill suggests recently-used paints for the same slot across other instances.
- **TQOL-03**: Bulk slot reassignment within a recipe instance ("reassign all Contrast Medium → Lahmian Medium").
- **TQOL-04**: Soft-override workflow (duplicate technique → repoint the instance) surfaced as a guided UI flow.

---

## Out of Scope

Explicitly excluded for v0.7.0. Documented to prevent scope creep (anti-features from research carry their warnings here).

| Feature | Reason |
|---------|--------|
| Snapshot/copy apply mode | Directly contradicts the confirmed live-link decision; defeats "edit once, update everywhere". |
| Per-step override inside a live-linked section | Creates confusing half-linked mixed state; detach the whole section instead. |
| "Lock technique" to freeze propagation per recipe | Same mixed-state complexity; detach is the clean answer. |
| Opt-in per-recipe propagation / "sync now" | Dirty/clean tracking overkill for a single-user tool; "X recipes affected" warning + detach is the right control. |
| Propagation history / undo across recipes | Far too complex for a personal tool; duplicate-before-edit is the escape hatch. |
| Technique version history | Snapshot complexity rivals recipe save; duplication ("v2") suffices. |
| Technique import/export files | Significant serialisation/validation surface for zero in-app value; full backup/restore already covers portability. |
| Community / cloud technique library | Out of scope per PROJECT.md — local-first, no network, no accounts. |
| AI-generated technique steps | Out of scope per PROJECT.md (AI features deferred). |
| Global "default colours" baked into a technique | Breaks the parameterisation premise; role hints + suggestions cover the need. |
| Hierarchical / nested slot inheritance | YAGNI; flat per-instance slots suffice. |
| Per-technique analytics (most-used, fill rates) | Premature for a personal tool; library usage count is enough. |
| Bulk "apply technique to all recipes / faction" | Dangerous bulk op with undefined slot colours; apply is intentional per-recipe. |
| New top-level "Techniques" sidebar entry | Sidebar noise; library lives under Workshop/Recipes. |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 141 | Complete |
| FND-02 | Phase 141 | Complete |
| FND-03 | Phase 141 | Pending |
| FND-04 | Phase 141 | Complete |
| FND-05 | Phase 141 | Pending |
| TECH-01 | Phase 142 | Pending |
| TECH-02 | Phase 142 | Pending |
| TECH-03 | Phase 142 | Pending |
| TECH-04 | Phase 142 | Pending |
| TECH-05 | Phase 142 | Pending |
| SLOT-01 | Phase 142 | Pending |
| SLOT-02 | Phase 142 | Pending |
| SLOT-03 | Phase 143 | Pending |
| SLOT-04 | Phase 143 | Pending |
| SLOT-05 | Phase 143 | Pending |
| SLOT-06 | Phase 143 | Pending |
| LIB-01 | Phase 142 | Pending |
| LIB-02 | Phase 142 | Pending |
| LIB-03 | Phase 142 | Pending |
| LIB-04 | Phase 142 | Pending |
| APPLY-01 | Phase 143 | Pending |
| APPLY-02 | Phase 143 | Pending |
| APPLY-03 | Phase 143 | Pending |
| APPLY-04 | Phase 143 | Pending |
| APPLY-05 | Phase 143 | Pending |
| LINK-01 | Phase 144 | Pending |
| LINK-02 | Phase 144 | Pending |
| LINK-03 | Phase 144 | Pending |
| SAFE-01 | Phase 146 | Pending |
| SAFE-02 | Phase 146 | Pending |
| SAFE-03 | Phase 146 | Pending |
| INTG-01 | Phase 145 | Pending |
| INTG-02 | Phase 145 | Pending |
| INTG-03 | Phase 145 | Pending |
| INTG-04 | Phase 145 | Pending |
| INTG-05 | Phase 145 | Pending |
| INTG-06 | Phase 145 | Pending |
| INTG-07 | Phase 145 | Pending |

**Coverage:**
- v1 requirements: 38 total (5 FND + 5 TECH + 6 SLOT + 4 LIB + 5 APPLY + 3 LINK + 3 SAFE + 7 INTG)
- Mapped to phases: 38/38
- Unmapped: 0

---
*Requirements defined: 2026-06-19*
*Last updated: 2026-06-19 — traceability filled by roadmapper*
