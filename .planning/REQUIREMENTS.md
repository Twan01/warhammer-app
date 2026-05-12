# Requirements: HobbyForge

**Defined:** 2026-05-12
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v0.2.9 Requirements

Requirements for Recipes 3.1 / Workflow Semantics & Integrations. Each maps to roadmap phases.

### Workflow Metadata

- [ ] **WF-01**: User can set a section type (prep/basecoat/shade/layer/detail/effect/finishing) on any recipe section
- [ ] **WF-02**: User can set a section-level technique (brush/sponge/drybrush/airbrush/oil-enamel/pigment/decal/mixed/other) on any recipe section
- [ ] **WF-03**: User can set an execution mode (sequential/batch/parallel) on any recipe section
- [ ] **WF-04**: User can set a free-text applies_to field on any recipe section describing which model area the section targets
- [ ] **WF-05**: All workflow metadata fields are nullable and additive — existing recipes unchanged after migration

### Recipe UI

- [ ] **RUI-01**: RecipeSectionCard shows workflow metadata fields under a progressive disclosure "Workflow" collapsible
- [ ] **RUI-02**: Simple recipes (single section, no metadata) remain visually uncluttered — workflow collapsible hidden
- [ ] **RUI-03**: SectionedTimeline displays section_type and execution_mode as compact badges alongside existing surface badge
- [ ] **RUI-04**: SectionedTimeline displays technique inline when set (e.g., "Armor Blue · Armor · Drybrush · Sequential")

### Session Integration

- [ ] **SESS-01**: LogSessionSheet shows a section selector between recipe and step selectors when a recipe with 2+ sections is selected
- [ ] **SESS-02**: Selecting a section filters the step selector to only that section's steps
- [ ] **SESS-03**: Changing recipe clears both section and step selections
- [ ] **SESS-04**: Changing section clears step selection
- [ ] **SESS-05**: All three selectors (recipe, section, step) remain optional — user can log with any combination

### Project Integration

- [ ] **PROJ-01**: KanbanCard shows current workflow section name and next step name when a recipe is linked to the unit
- [ ] **PROJ-02**: CurrentFocusCard shows section-aware next action guidance (e.g., "Armour: Layer Highlight — step 4/12")
- [ ] **PROJ-03**: Workflow position is derived implicitly from last logged session step — no explicit completion tracking
- [ ] **PROJ-04**: Derivation logic is a shared pure function usable by both Kanban and CurrentFocus
- [ ] **PROJ-05**: Graceful fallback when no recipe linked, no sessions logged, or recipe has no sections

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Recipe Progress Tracking

- **PROG-01**: Per-step completion tracking table (unit_recipe_progress) for explicit progress
- **PROG-02**: Section skip tracking — optional sections marked as explicitly skipped
- **PROG-03**: Workflow-aware session duration estimates ("~45 min remaining, 3 sections left")

### Recipe Templates

- **TMPL-01**: Save sections as reusable templates
- **TMPL-02**: Section dependency graph (hard ordering constraints between sections)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Explicit step completion checkboxes | Turns creative hobby tool into checkbox app; painters don't work linearly |
| Automated painting status advancement | Status-from-recipe-progress will be wrong for multi-recipe units; keep manual |
| Section templates / shared section library | Over-engineering for personal tool; recipe duplication handles reuse |
| Real-time painting timer | Breaks flow; painters don't start/stop cleanly; manual duration entry is fine |
| Multi-recipe parallel progress | Track one active recipe per unit; additional recipes are reference-only |
| Section dependency graphs | Over-constraining for a hobby; execution_mode provides soft guidance |
| section_id FK on painting_sessions | DELETE-all + re-INSERT save pattern destroys FK links; derive section from step's section_id instead |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WF-01 | — | Pending |
| WF-02 | — | Pending |
| WF-03 | — | Pending |
| WF-04 | — | Pending |
| WF-05 | — | Pending |
| RUI-01 | — | Pending |
| RUI-02 | — | Pending |
| RUI-03 | — | Pending |
| RUI-04 | — | Pending |
| SESS-01 | — | Pending |
| SESS-02 | — | Pending |
| SESS-03 | — | Pending |
| SESS-04 | — | Pending |
| SESS-05 | — | Pending |
| PROJ-01 | — | Pending |
| PROJ-02 | — | Pending |
| PROJ-03 | — | Pending |
| PROJ-04 | — | Pending |
| PROJ-05 | — | Pending |

**Coverage:**
- v0.2.9 requirements: 19 total
- Mapped to phases: 0
- Unmapped: 19

---
*Requirements defined: 2026-05-12*
*Last updated: 2026-05-12 after initial definition*
