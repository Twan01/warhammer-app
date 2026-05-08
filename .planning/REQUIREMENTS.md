# Requirements: HobbyForge v0.2.7

**Defined:** 2026-05-08
**Core Value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.

## v0.2.7 Requirements

Requirements for Recipes 3.0 / Hierarchical Painting Workflows. Each maps to roadmap phases.

### Section Data Layer

- [x] **SECT-01**: User can see recipe sections stored in a new recipe_sections table (id, recipe_id, name, surface, optional, order_index, notes, timestamps)
- [x] **SECT-02**: User's existing recipe steps gain a section_id FK linking them to their section
- [x] **SECT-03**: User's existing recipes are auto-migrated with one default section per recipe, all steps pointed at it (zero data loss)
- [x] **SECT-04**: User can create, read, update, and delete recipe sections through typed query/hook layer
- [x] **SECT-05**: User can reorder sections via persisted order_index (drag-and-drop at data layer)
- [x] **SECT-06**: User can see per-section step counts via batch GROUP BY query helper

### Section Read UI

- [x] **VIEW-01**: User sees recipe detail as a workflow timeline grouped by section headers
- [x] **VIEW-02**: User sees section name, surface badge, step count, and estimated time in each section header
- [x] **VIEW-03**: User sees per-section owned/missing paint summary in section headers
- [x] **VIEW-04**: User's recipes without sections render with existing flat timeline (backward compat)

### Section Form UI

- [x] **FORM-01**: User can edit recipes with collapsible section cards containing step lists
- [x] **FORM-02**: User can add, rename, and delete sections within the recipe form
- [x] **FORM-03**: User can reorder sections via drag-and-drop in the form (outer DndContext)
- [x] **FORM-04**: User can reorder steps within a section via drag-and-drop (inner DndContext per section)
- [x] **FORM-05**: User creating a new recipe gets one auto-created default section (simple recipes stay easy)
- [x] **FORM-06**: User editing an existing recipe sees sections loaded with steps grouped correctly

### Integration & Polish

- [x] **INTG-01**: User can duplicate a recipe and get correct copies of all sections and steps (ID remapping)
- [x] **INTG-02**: User sees section count on recipe cards in RecipesPage
- [x] **INTG-03**: User's existing recipe create/edit/delete/availability/swatch/LogSession flows still work unchanged

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Workflow Features

- **FLOW-01**: User can move steps between sections via drag-and-drop (cross-container DnD)
- **FLOW-02**: User can track per-section completion progress through LogSession
- **FLOW-03**: User can see current section and next step in CurrentFocusCard
- **FLOW-04**: User can see current section and next step on Kanban cards
- **FLOW-05**: User can select section in LogSessionSheet (currently only recipe + step)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cross-section step DnD | @dnd-kit cross-container drag is disproportionately complex for v1; "Move to section" button is a simpler v2 alternative |
| Step dependency graph | Over-engineering; section ordering already encodes workflow sequence |
| Section templates / presets | No existing template system; premature abstraction |
| Per-step completion tracking | Requires session-step history table; separate milestone scope |
| AI recipe generation | Deferred; not related to hierarchical structure |
| Section-level execution mode | Implies multi-model tracking that doesn't exist in HobbyForge |
| Section-level photos | Step photos already exist; section photos add complexity without clear value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SECT-01 | Phase 48 | Complete |
| SECT-02 | Phase 48 | Complete |
| SECT-03 | Phase 48 | Complete |
| SECT-04 | Phase 48 | Complete |
| SECT-05 | Phase 48 | Complete |
| SECT-06 | Phase 48 | Complete |
| VIEW-01 | Phase 49 | Complete |
| VIEW-02 | Phase 49 | Complete |
| VIEW-03 | Phase 49 | Complete |
| VIEW-04 | Phase 49 | Complete |
| FORM-01 | Phase 50 | Complete |
| FORM-02 | Phase 50 | Complete |
| FORM-03 | Phase 50 | Complete |
| FORM-04 | Phase 50 | Complete |
| FORM-05 | Phase 50 | Complete |
| FORM-06 | Phase 50 | Complete |
| INTG-01 | Phase 51 | Complete |
| INTG-02 | Phase 51 | Complete |
| INTG-03 | Phase 51 | Complete |

**Coverage:**
- v0.2.7 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-08*
*Last updated: 2026-05-08 — traceability filled after roadmap creation*
