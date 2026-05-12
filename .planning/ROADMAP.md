# Roadmap: HobbyForge

## Milestones

- ✅ **v0.1.1 HobbyForge MVP** — Phases 1-5 (shipped 2024-05-01)
- ✅ **v0.2.0 Utility Layer** — Phases 6-9 (shipped 2024-05-03)
- ✅ **v0.2.1 Visual Command** — Phases 10-16 + 20 (shipped 2026-05-04)
- ✅ **v0.2.2 Full Circle** — Phases 17-19, 21-24, 35 (shipped 2026-05-05)
- ✅ **v0.2.3 Hobby Command Center** — Phases 25-29 (shipped 2026-05-05)
- ✅ **v0.2.4 Premium Dashboard UX & Visual Polish** — Phases 30-34, 36 (shipped 2026-05-06)
- ✅ **v0.2.5 Recipes 2.0 / Painting Studio** — Phases 37-41 (shipped 2026-05-07)
- ✅ **v0.2.6 Rules Sync 2.0 / Rules Data Hub** — Phases 42-47 (shipped 2026-05-08)
- ✅ **v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows** — Phases 48-51 (shipped 2026-05-08)
- ✅ **v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day** — Phases 52-56 (shipped 2026-05-11)
- 🚧 **v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations** — Phases 57-60 (in progress)

## Phases

<details>
<summary>✅ v0.2.8 Rules Data Hub UI / Army Lists 2.0 / Game Day (Phases 52-56) — SHIPPED 2026-05-11</summary>

- [x] Phase 52: Schema + Data Layer Foundation (3/3 plans) — completed 2026-05-10
- [x] Phase 53: Rules Data Hub UI (3/3 plans) — completed 2026-05-11
- [x] Phase 54: Army Lists 2.0 — Detachment Selection (2/2 plans) — completed 2026-05-11
- [x] Phase 55: Playbook Enhancements — Favorites and Notes (2/2 plans) — completed 2026-05-11
- [x] Phase 56: Game Day Mode (2/2 plans) — completed 2026-05-11

Full details: `.planning/milestones/v0.2.8-ROADMAP.md`

</details>

### 🚧 v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations (In Progress)

**Milestone Goal:** Make recipe sections semantically rich and actionable — extending workflow metadata into Log Session, Kanban, and Current Focus for real painting workflow guidance.

- [x] **Phase 57: Schema & Data Layer** - Migration + types + queries for workflow metadata columns and session section linking
- [x] **Phase 58: Recipe Form & Timeline Display** - Workflow metadata editing with progressive disclosure and compact timeline badges (2/2 plans) — completed 2026-05-12
- [ ] **Phase 59: Session Section Cascade** - LogSessionSheet 3-level cascading selector (recipe -> section -> step)
- [ ] **Phase 60: Kanban & CurrentFocus Integration** - Section-aware workflow display on project cards and dashboard focus

---

<details>
<summary>✅ v0.1.1 HobbyForge MVP (Phases 1-5) — SHIPPED 2024-05-01</summary>

- [x] Phase 1: App Shell — Tauri + React desktop app launches with sidebar, routing, SQLite plumbing, dark mode, and all shadcn components installed (completed 2024-04-30)
- [x] Phase 2: Data Layer + Entity CRUD — Full 10-table schema, FK enforcement, seed data, and CRUD for factions / units / paints (completed 2024-04-30)
- [x] Phase 3: Collection Module — Searchable, filterable unit table with detail drawer, inline status updates, progress bars, and full create/edit/delete UX including all cross-cutting polish patterns (completed 2024-05-01)
- [x] Phase 4: Painting Module — Active painting projects Kanban (status columns, card actions, mark active) plus full recipe CRUD with paint linkage and owned/missing paint indicator (completed 2024-05-01)
- [x] Phase 5: Dashboard — Full dashboard with global stat cards, faction summary cards, painting/assembly/basing percentages, active projects list, and recently updated units (completed 2024-05-01)

Full details: `.planning/milestones/v0.1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.0 Utility Layer (Phases 6-9) — SHIPPED 2024-05-03</summary>

- [x] **Phase 6: Foundation** — Schema migration 004, TypeScript types for all v0.2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules with DATA-09 forward-compat invalidation, 38 automated tests
- [x] **Phase 7: Paint Inventory** — PaintsPage at `/paints` with brand/type/color-family multi-select filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge with navigation to `/recipes?paintId=X`, inline owned toggle with optimistic update
- [x] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sibling portal architecture confirmed
- [x] **Phase 9: Unit Playbook** — PlaybookTab inside shadcn Tabs with 6-field stats block (M/T/Sv/W/Ld/OC, suffix display, pencil edit mode), abilities/keywords, 8 strategy note fields in fixed order, dirty-state Save with toasts, SQLite persistence round-tripped in live app

Full details: `.planning/milestones/v0.2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.1 Visual Command (Phases 10-16 + 20) — SHIPPED 2026-05-04</summary>

- [x] Phase 10: Theming Foundation (completed 2026-05-03)
- [x] Phase 11: Dashboard Command Center (completed 2026-05-03)
- [x] Phase 12: Collection Gallery View (completed 2026-05-04)
- [x] Phase 13: Hobby Journal (completed 2026-05-04)
- [x] Phase 14: Spending Tracker (completed 2026-05-04)
- [x] Phase 15: 40K Datasheet Integration (completed 2026-05-04)
- [x] Phase 16: Design Overhaul (completed 2026-05-04)
- [x] Phase 20: v0.2.1 Polish & Gap Closure (completed 2026-05-04)

Full details: `.planning/milestones/v0.2.1-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.2 Full Circle (Phases 17-19, 21-24, 35) — SHIPPED 2026-05-05</summary>

- [x] Phase 17: Schema Foundation + Enrichment (completed 2026-05-04)
- [x] Phase 18: Battle Log (completed 2026-05-04)
- [x] Phase 19: Analytics Core (completed 2026-05-04)
- [x] Phase 21: Wishlist (completed 2026-05-05)
- [x] Phase 22: Hobby Goals (completed 2026-05-05)
- [x] Phase 23: Display Features (completed 2026-05-05)
- [x] Phase 24: Unit Point Calculator (completed 2026-05-05)
- [x] Phase 35: v0.2.2 Gap Closure (completed 2026-05-05)

Full details: `.planning/milestones/v0.2.2-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.3 Hobby Command Center (Phases 25-29) — SHIPPED 2026-05-05</summary>

- [x] Phase 25: Design Foundation (2/2 plans) — completed 2026-05-04
- [x] Phase 26: Dashboard Redesign (5/5 plans) — completed 2026-05-05
- [x] Phase 27: Navigation & Quick Add (4/4 plans) — completed 2026-05-05
- [x] Phase 28: Collection + Projects (5/5 plans) — completed 2026-05-05
- [x] Phase 29: Workshop + Play (5/5 plans) — completed 2026-05-05

Full details: `.planning/milestones/v0.2.3-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.4 Premium Dashboard UX & Visual Polish (Phases 30-34, 36) — SHIPPED 2026-05-06</summary>

- [x] Phase 30: Grid Layout Foundation (completed 2026-05-06)
- [x] Phase 31: Focus & Projects Panels (completed 2026-05-06)
- [x] Phase 32: Army Readiness Card (completed 2026-05-06)
- [x] Phase 33: Data Intelligence (completed 2026-05-06)
- [x] Phase 34: Visual Polish (completed 2026-05-06)
- [x] Phase 36: v0.2.4 Gap Closure (completed 2026-05-06)

Full details: `.planning/milestones/v0.2.4-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.5 Recipes 2.0 / Painting Studio (Phases 37-41) — SHIPPED 2026-05-07</summary>

- [x] Phase 37: Schema Foundation + Pre-flight Fixes (2/2 plans) — completed 2026-05-07
- [x] Phase 38: Structured Step Input (2/2 plans) — completed 2026-05-07
- [x] Phase 39: Studio UX + Paint Availability (3/3 plans) — completed 2026-05-07
- [x] Phase 40: Recipe Actions + Step Photos (3/3 plans) — completed 2026-05-07
- [x] Phase 41: Session Integration (2/2 plans) — completed 2026-05-07

Full details: `.planning/milestones/v0.2.5-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.6 Rules Sync 2.0 / Rules Data Hub (Phases 42-47) — SHIPPED 2026-05-08</summary>

- [x] Phase 42: Architecture Audit (1/1 plans) — completed 2026-05-08
- [x] Phase 43: Extended Rules Read Layer (2/2 plans) — completed 2026-05-08
- [x] Phase 44: Sync Pipeline Hardening (2/2 plans) — completed 2026-05-08
- [x] Phase 45: Sync Metadata & Import Tracking (2/2 plans) — completed 2026-05-08
- [x] Phase 46: Manual Overrides & Version Comparison (2/2 plans) — completed 2026-05-08
- [x] Phase 47: v0.2.6 Gap Closure (2/2 plans) — completed 2026-05-08

Full details: `.planning/milestones/v0.2.6-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows (Phases 48-51) — SHIPPED 2026-05-08</summary>

- [x] Phase 48: Section Data Layer (2/2 plans) — completed 2026-05-08
- [x] Phase 49: Section Read UI (1/1 plans) — completed 2026-05-08
- [x] Phase 50: Section Form UI (3/3 plans) — completed 2026-05-08
- [x] Phase 51: Duplication + Integration Polish (2/2 plans) — completed 2026-05-08

Full details: `.planning/milestones/v0.2.7-ROADMAP.md`

</details>

## Phase Details

### Phase 57: Schema & Data Layer
**Goal**: Recipe sections carry workflow semantics and painting sessions can reference which section was worked on
**Depends on**: Phase 56 (v0.2.8 complete)
**Requirements**: WF-01, WF-02, WF-03, WF-04, WF-05
**Success Criteria** (what must be TRUE):
  1. User can open the app after migration with all existing recipes and sections intact and unchanged
  2. The RecipeSection TypeScript type includes section_type, technique, execution_mode, and applies_to as nullable fields
  3. DraftSection type extends atomically with migration -- saving a recipe with metadata round-trips all four new fields without silent NULL erasure
  4. PaintingSession type includes a nullable section_name text field for denormalized section association
  5. Const arrays for section_type and technique values exist as single sources of truth for dropdowns
**Plans**: 2 plans

Plans:
- [x] 57-01-PLAN.md — Migration + TypeScript types + const arrays
- [x] 57-02-PLAN.md — Query functions + DraftSection + save path + tests

### Phase 58: Recipe Form & Timeline Display
**Goal**: Users can edit workflow metadata on recipe sections and see it at a glance in the timeline view
**Depends on**: Phase 57
**Requirements**: RUI-01, RUI-02, RUI-03, RUI-04
**Success Criteria** (what must be TRUE):
  1. User can expand a "Workflow" collapsible on any RecipeSectionCard and set section_type, technique, execution_mode, and applies_to
  2. Simple recipes (single section, no metadata set) show no workflow collapsible -- the UI remains uncluttered
  3. SectionedTimeline displays section_type and execution_mode as compact badges next to the existing surface badge
  4. SectionedTimeline shows technique inline when set (e.g., "Armor Blue . Armor . Drybrush . Sequential")
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [x] 58-01-PLAN.md — Workflow collapsible form controls in RecipeSectionCard (RUI-01, RUI-02)
- [ ] 58-02-PLAN.md — Timeline workflow metadata display in SectionedTimeline (RUI-03, RUI-04)

### Phase 59: Session Section Cascade
**Goal**: Users can log painting sessions with section-level granularity through a natural cascading selector flow
**Depends on**: Phase 57
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05
**Success Criteria** (what must be TRUE):
  1. When a recipe with 2+ sections is selected in LogSessionSheet, a section selector appears between recipe and step selectors
  2. Selecting a section filters the step dropdown to only that section's steps
  3. Changing the recipe clears both section and step selections; changing section clears step selection
  4. All three selectors remain optional -- user can log a session with any combination (recipe only, recipe+section, recipe+section+step, or none)
  5. The selected section_name is saved on the painting_session record
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [ ] 59-01-PLAN.md — Schema extension: section_name field + SESS-05 schema tests
- [ ] 59-02-PLAN.md — LogSessionSheet cascade selector + component tests (SESS-01 through SESS-05)

### Phase 60: Kanban & CurrentFocus Integration
**Goal**: Users see section-aware workflow context on project cards and dashboard, knowing exactly where they are in a recipe
**Depends on**: Phase 57, Phase 58, Phase 59
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05
**Success Criteria** (what must be TRUE):
  1. KanbanCard shows the current workflow section name and next step name when a recipe is linked to the unit
  2. CurrentFocusCard shows section-aware next action guidance (e.g., "Armour: Layer Highlight -- step 4/12")
  3. Workflow position is derived from the last logged session step with no explicit completion tracking required
  4. A shared pure function computes workflow position, usable by both Kanban and CurrentFocus without duplication
  5. Cards degrade gracefully when no recipe is linked, no sessions exist, or the recipe has no sections -- showing existing fallback hints
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 60-01: TBD
- [ ] 60-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 57 -> 58 -> 59 -> 60
(Note: Phase 59 depends on 57 only, not 58 -- but sequenced after 58 so metadata exists to display)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell | v0.1.1 | 3/3 | Complete | 2024-04-30 |
| 2. Data Layer + Entity CRUD | v0.1.1 | 4/4 | Complete | 2024-04-30 |
| 3. Collection Module | v0.1.1 | 5/5 | Complete | 2024-05-01 |
| 4. Painting Module | v0.1.1 | 4/4 | Complete | 2024-05-01 |
| 5. Dashboard | v0.1.1 | 4/4 | Complete | 2024-05-01 |
| 6. Foundation | v0.2.0 | 5/5 | Complete | 2024-05-01 |
| 7. Paint Inventory | v0.2.0 | 5/5 | Complete | 2024-05-02 |
| 8. Army List Builder | v0.2.0 | 6/6 | Complete | 2024-05-03 |
| 9. Unit Playbook | v0.2.0 | 4/4 | Complete | 2024-05-02 |
| 10. Theming Foundation | v0.2.1 | 4/4 | Complete | 2026-05-03 |
| 11. Dashboard Command Center | v0.2.1 | 4/4 | Complete | 2026-05-03 |
| 12. Collection Gallery View | v0.2.1 | 4/4 | Complete | 2026-05-04 |
| 13. Hobby Journal | v0.2.1 | 6/6 | Complete | 2026-05-04 |
| 14. Spending Tracker | v0.2.1 | 5/5 | Complete | 2026-05-04 |
| 15. 40K Datasheet Integration | v0.2.1 | 7/7 | Complete | 2026-05-04 |
| 16. Design Overhaul | v0.2.1 | 8/8 | Complete | 2026-05-04 |
| 17. Schema Foundation + Enrichment | v0.2.2 | 1/1 | Complete | 2026-05-04 |
| 18. Battle Log | v0.2.2 | 4/4 | Complete | 2026-05-04 |
| 19. Analytics Core | v0.2.2 | 4/4 | Complete | 2026-05-04 |
| 20. v0.2.1 Polish & Gap Closure | v0.2.1 | 3/3 | Complete | 2026-05-04 |
| 21. Wishlist | v0.2.2 | 3/3 | Complete | 2026-05-05 |
| 22. Hobby Goals | v0.2.2 | 4/4 | Complete | 2026-05-05 |
| 23. Display Features | v0.2.2 | 2/2 | Complete | 2026-05-05 |
| 24. Unit Point Calculator | v0.2.2 | 4/4 | Complete | 2026-05-05 |
| 35. v0.2.2 Gap Closure | v0.2.2 | 1/1 | Complete | 2026-05-05 |
| 25. Design Foundation | v0.2.3 | 2/2 | Complete | 2026-05-04 |
| 26. Dashboard Redesign | v0.2.3 | 5/5 | Complete | 2026-05-05 |
| 27. Navigation & Quick Add | v0.2.3 | 4/4 | Complete | 2026-05-05 |
| 28. Collection + Projects | v0.2.3 | 5/5 | Complete | 2026-05-05 |
| 29. Workshop + Play | v0.2.3 | 5/5 | Complete | 2026-05-05 |
| 30. Grid Layout Foundation | v0.2.4 | 2/2 | Complete | 2026-05-06 |
| 31. Focus & Projects Panels | v0.2.4 | 3/3 | Complete | 2026-05-06 |
| 32. Army Readiness Card | v0.2.4 | 1/1 | Complete | 2026-05-06 |
| 33. Data Intelligence | v0.2.4 | 4/4 | Complete | 2026-05-06 |
| 34. Visual Polish | v0.2.4 | 2/2 | Complete | 2026-05-06 |
| 36. v0.2.4 Gap Closure | v0.2.4 | 1/1 | Complete | 2026-05-06 |
| 37. Schema Foundation + Pre-flight Fixes | v0.2.5 | 2/2 | Complete | 2026-05-07 |
| 38. Structured Step Input | v0.2.5 | 2/2 | Complete | 2026-05-07 |
| 39. Studio UX + Paint Availability | v0.2.5 | 3/3 | Complete | 2026-05-07 |
| 40. Recipe Actions + Step Photos | v0.2.5 | 3/3 | Complete | 2026-05-07 |
| 41. Session Integration | v0.2.5 | 2/2 | Complete | 2026-05-07 |
| 42. Architecture Audit | v0.2.6 | 1/1 | Complete | 2026-05-08 |
| 43. Extended Rules Read Layer | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 44. Sync Pipeline Hardening | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 45. Sync Metadata & Import Tracking | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 46. Manual Overrides & Version Comparison | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 47. v0.2.6 Gap Closure | v0.2.6 | 2/2 | Complete | 2026-05-08 |
| 48. Section Data Layer | v0.2.7 | 2/2 | Complete | 2026-05-08 |
| 49. Section Read UI | v0.2.7 | 1/1 | Complete | 2026-05-08 |
| 50. Section Form UI | v0.2.7 | 3/3 | Complete | 2026-05-08 |
| 51. Duplication + Integration Polish | v0.2.7 | 2/2 | Complete | 2026-05-08 |
| 52. Schema + Data Layer Foundation | v0.2.8 | 3/3 | Complete | 2026-05-10 |
| 53. Rules Data Hub UI | v0.2.8 | 3/3 | Complete | 2026-05-11 |
| 54. Army Lists 2.0 — Detachment Selection | v0.2.8 | 2/2 | Complete | 2026-05-11 |
| 55. Playbook Enhancements — Favorites and Notes | v0.2.8 | 2/2 | Complete | 2026-05-11 |
| 56. Game Day Mode | v0.2.8 | 2/2 | Complete | 2026-05-11 |
| 57. Schema & Data Layer | v0.2.9 | 2/2 | Complete | 2026-05-12 |
| 58. Recipe Form & Timeline Display | v0.2.9 | 1/2 | In Progress|  |
| 59. Session Section Cascade | v0.2.9 | 0/2 | Not started | - |
| 60. Kanban & CurrentFocus Integration | v0.2.9 | 0/? | Not started | - |
