# Requirements: HobbyForge

**Defined:** 2026-05-12
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" -- without ever depending on copyrighted GW data.

## v0.2.9 Requirements

Requirements for Recipes 3.1 / Workflow Semantics & Integrations. Each maps to roadmap phases.

### Workflow Metadata

- [x] **WF-01**: User can set a section type (prep/basecoat/shade/layer/detail/effect/finishing) on any recipe section
- [x] **WF-02**: User can set a section-level technique (brush/sponge/drybrush/airbrush/oil-enamel/pigment/decal/mixed/other) on any recipe section
- [x] **WF-03**: User can set an execution mode (sequential/batch/parallel) on any recipe section
- [x] **WF-04**: User can set a free-text applies_to field on any recipe section describing which model area the section targets
- [x] **WF-05**: All workflow metadata fields are nullable and additive -- existing recipes unchanged after migration

### Recipe UI

- [x] **RUI-01**: RecipeSectionCard shows workflow metadata fields under a progressive disclosure "Workflow" collapsible
- [x] **RUI-02**: Simple recipes (single section, no metadata) remain visually uncluttered -- workflow collapsible hidden
- [ ] **RUI-03**: SectionedTimeline displays section_type and execution_mode as compact badges alongside existing surface badge
- [x] **RUI-04**: SectionedTimeline displays technique inline when set (e.g., "Armor Blue . Armor . Drybrush . Sequential")

### Session Integration

- [x] **SESS-01**: LogSessionSheet shows a section selector between recipe and step selectors when a recipe with 2+ sections is selected
- [x] **SESS-02**: Selecting a section filters the step selector to only that section's steps
- [x] **SESS-03**: Changing recipe clears both section and step selections
- [x] **SESS-04**: Changing section clears step selection
- [x] **SESS-05**: All three selectors (recipe, section, step) remain optional -- user can log with any combination

### Project Integration

- [x] **PROJ-01**: KanbanCard shows current workflow section name and next step name when a recipe is linked to the unit
- [x] **PROJ-02**: CurrentFocusCard shows section-aware next action guidance (e.g., "Armour: Layer Highlight -- step 4/12")
- [x] **PROJ-03**: Workflow position is derived implicitly from last logged session step -- no explicit completion tracking
- [x] **PROJ-04**: Derivation logic is a shared pure function usable by both Kanban and CurrentFocus
- [x] **PROJ-05**: Graceful fallback when no recipe linked, no sessions logged, or recipe has no sections

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Recipe Progress Tracking

- **PROG-01**: Per-step completion tracking table (unit_recipe_progress) for explicit progress
- **PROG-02**: Section skip tracking -- optional sections marked as explicitly skipped
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
| WF-01 | Phase 57 | Complete |
| WF-02 | Phase 57 | Complete |
| WF-03 | Phase 57 | Complete |
| WF-04 | Phase 57 | Complete |
| WF-05 | Phase 57 | Complete |
| RUI-01 | Phase 58 | Complete |
| RUI-02 | Phase 58 | Complete |
| RUI-03 | Phase 58 | Partial |
| RUI-04 | Phase 58 | Complete |
| SESS-01 | Phase 59 | Complete |
| SESS-02 | Phase 59 | Complete |
| SESS-03 | Phase 59 | Complete |
| SESS-04 | Phase 59 | Complete |
| SESS-05 | Phase 59 | Complete |
| PROJ-01 | Phase 60 | Complete |
| PROJ-02 | Phase 60 | Complete |
| PROJ-03 | Phase 60 | Complete |
| PROJ-04 | Phase 60 | Complete |
| PROJ-05 | Phase 60 | Complete |

**Coverage:**
- v0.2.9 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-05-12*
*Last updated: 2026-05-12 after roadmap creation*
