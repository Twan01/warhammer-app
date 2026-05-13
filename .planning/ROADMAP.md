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
- ✅ **v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations** — Phases 57-60 (shipped 2026-05-12)
- 🚧 **v0.2.10 Applied Recipes, Points Import & List Validation** — Phases 61-67 (in progress)
- 📋 **v0.2.11 Foundation Hardening** — Phases 68-72 (planned)

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

<details>
<summary>✅ v0.2.9 Recipes 3.1 / Workflow Semantics & Integrations (Phases 57-60) — SHIPPED 2026-05-12</summary>

- [x] Phase 57: Schema & Data Layer - Migration + types + queries for workflow metadata columns and session section linking
- [x] Phase 58: Recipe Form & Timeline Display - Workflow metadata editing with progressive disclosure and compact timeline badges (2/2 plans) — completed 2026-05-12
- [x] Phase 59: Session Section Cascade - LogSessionSheet 3-level cascading selector (recipe -> section -> step) (2/2 plans) — completed 2026-05-12
- [x] Phase 60: Kanban & CurrentFocus Integration - Section-aware workflow display on project cards and dashboard focus (2/2 plans) — completed 2026-05-12

Full details: `.planning/milestones/v0.2.9-ROADMAP.md`

</details>

### 🚧 v0.2.10 Applied Recipes, Points Import & List Validation (In Progress)

**Milestone Goal:** Turn recipes into actionable painting plans with per-unit progress, add a points import data layer with freshness tracking, and harden army list validation with tactical role coverage.

- [x] **Phase 61: Recipe Workflow Hardening** - Verify migration integrity, stabilize section-aware log sessions, polish workflow metadata UX
- [x] **Phase 62: Applied Recipe Data Layer** - Schema, types, queries, hooks for unit_recipe_assignments + unit_recipe_step_progress
- [ ] **Phase 63: Applied Recipe UX** - Assignment sheet, per-unit step checklist, progress display, bulk apply
- [ ] **Phase 64: Applied Recipe Integrations** - Log Session step completion, Kanban/CurrentFocus applied recipe progress
- [ ] **Phase 65: Points Import Pipeline** - Extend Wahapedia sync with official points, freshness badges, delta detection, 5-level COALESCE update
- [ ] **Phase 66: Army List Validation** - Hard warnings, tactical tags, role coverage, health summary panel
- [ ] **Phase 67: Game Day Integration** - Pre-game points/readiness/tactical warnings capstone

---

### 📋 v0.2.11 Foundation Hardening (Planned)

**Milestone Goal:** Stabilize the technical foundation — migrations, recipe data integrity, version hygiene — so future features are built on reliable data structures.

- [ ] **Phase 68: Infrastructure Quick Wins** - Register migrations, validate fresh install, fix COALESCE null-clearing, fix section-aware ordering, align version numbers
- [x] **Phase 69: Paintless Recipe Steps** - Guard removal to persist steps without paint_id, exclude paintless steps from availability counts
- [ ] **Phase 70: Non-Destructive Recipe Save** - Three-way diff replaces DELETE-all + re-INSERT, preserving section/step IDs across edits
- [ ] **Phase 71: Stable Session Section FK** - Migration 022 adds recipe_section_id FK to painting_sessions alongside denormalized section_name
- [ ] **Phase 72: Data-Layer Test Suite** - Vitest + better-sqlite3 tests asserting migration parity, recipe persistence, session FK, schema shape

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

### Phase 61: Recipe Workflow Hardening
**Goal**: Existing recipe workflow is rock-solid before building applied recipes on top of it
**Depends on**: Nothing (first phase of v0.2.10)
**Requirements**: RH-01, RH-02, RH-03
**Success Criteria** (what must be TRUE):
  1. Fresh install creates recipe_sections table with all 4 workflow metadata columns (section_type, technique, execution_mode, applies_to) without errors
  2. Renaming a recipe section does not break or orphan any painting session records that reference that section
  3. Section_type dropdown values match the user's mental model of painting workflow stages, and simple recipes (single section, no metadata) show no unnecessary workflow UI
**Plans**: 2 plans
Plans:
**Wave 1**
- [ ] 61-01-PLAN.md — Commit pre-existing bug fixes (D-11) + verify migration build integrity (RH-01)

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 61-02-PLAN.md — Write tests for workflow position degradation (RH-02) + progressive disclosure (RH-03)

### Phase 62: Applied Recipe Data Layer
**Goal**: Applied recipe data model exists and is exercised via TDD pure functions before any UI work
**Depends on**: Phase 61
**Requirements**: AR-01
**Success Criteria** (what must be TRUE):
  1. unit_recipe_assignments table stores recipe-to-unit mappings with created_at timestamp
  2. unit_recipe_step_progress table tracks per-step completion using composite key (recipe_id, order_index) that survives DELETE-all + re-INSERT recipe saves
  3. Typed query functions for create/read/update/delete assignments and step progress exist with React Query hooks
  4. Pure function computing completion percentage from step progress data passes unit tests
**Plans:** 2 plans
Plans:
**Wave 1**
- [ ] 62-01-PLAN.md — Migration 021 + types + TDD pure functions (computeCompletionPercentage, computeAssignmentProgress)

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 62-02-PLAN.md — Query module (8 CRUD functions) + React Query hooks (7 hooks, 4 cache keys) + tests

### Phase 63: Applied Recipe UX
**Goal**: Users can apply recipes to units and track painting progress step-by-step
**Depends on**: Phase 62
**Requirements**: AR-02, AR-03, AR-04, AR-07
**Success Criteria** (what must be TRUE):
  1. User can apply a recipe to a unit from Collection or Unit Detail, with section/step preview shown before confirming
  2. User can tick individual steps (and entire sections) as completed for a specific unit assignment, with progress stored independently from the recipe template
  3. Unit detail shows applied recipe progress as a checklist with completion percentage per assignment
  4. User can select multiple units and apply the same recipe to all of them, each getting independent progress tracking
**Plans:** 3 plans
Plans:
**Wave 1**
- [ ] 63-01-PLAN.md — Accordion primitive + AssignmentChecklist component (AR-03)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 63-02-PLAN.md — ApplyRecipeDialog + AppliedRecipesTab + UnitDetailSheet wiring (AR-02, AR-04)
- [ ] 63-03-PLAN.md — ApplyToUnitsDialog + RecipeDetailSheet bulk apply button (AR-07)

### Phase 64: Applied Recipe Integrations
**Goal**: Applied recipe progress flows into existing painting workflow surfaces (Log Session, Kanban, Dashboard)
**Depends on**: Phase 63
**Requirements**: AR-05, AR-06
**Success Criteria** (what must be TRUE):
  1. When creating a Log Session, user can optionally mark an applied recipe step as completed during that session
  2. Kanban cards show applied recipe progress (e.g., "3/12 steps") and next step name when an applied recipe exists
  3. CurrentFocusCard shows applied recipe progress and next step, replacing session-derived workflow position when applied recipe data is available
**Plans**: TBD
**UI hint**: yes

### Phase 65: Points Import Pipeline
**Goal**: Official points flow through Wahapedia sync with provenance tracking, and point changes ripple visibly across army lists
**Depends on**: Phase 61 (independent of AR phases; sequenced after Phase 64 for focus)
**Requirements**: PI-01, PI-02, PI-03, PI-04, PI-05
**Success Criteria** (what must be TRUE):
  1. Rules.db schema extended with points data columns/table populated via Wahapedia sync; user overrides remain in hobbyforge.db
  2. Wahapedia sync pipeline imports official points data alongside existing rules data, with sync metadata tracked
  3. Points freshness is visible on army lists and rules hub via stale/fresh/unknown badges showing source version and sync date
  4. After sync, user sees per-unit points deltas (increased/decreased/new/removed) and which army lists are affected
  5. All 3 COALESCE query sites are updated atomically to the 5-level chain: list override > loadout override > synced points > unit default > unknown
**Plans**: TBD
**UI hint**: yes

### Phase 66: Army List Validation
**Goal**: Army lists surface comprehensive health information so users know exactly what needs attention before playing
**Depends on**: Phase 65
**Requirements**: LV-01, LV-02, LV-03, LV-04
**Success Criteria** (what must be TRUE):
  1. Army list shows hard validation warnings: points exceeded, unknown/stale points, manual override in use, unowned/unbuilt/unpainted/not-battle-ready units
  2. User can assign tactical role tags (anti_tank, screening, objective_holder, etc.) to units
  3. Army list shows aggregated tactical role coverage with visual indicators of strengths and weaknesses
  4. Army list detail displays a health summary panel showing points total, ownership percentage, readiness percentage, freshness status, and warning count
**Plans**: TBD
**UI hint**: yes

### Phase 67: Game Day Integration
**Goal**: Game Day mode surfaces all validation warnings before a game so the user walks in fully informed
**Depends on**: Phase 66
**Requirements**: GD-01
**Success Criteria** (what must be TRUE):
  1. Game Day pre-game view shows points freshness warnings (stale source, unknown points)
  2. Game Day pre-game view shows readiness gaps (unpainted/unbuilt units in the army list)
  3. Game Day pre-game view shows tactical coverage warnings (missing key roles) and stale data alerts
**Plans**: TBD
**UI hint**: yes

### Phase 68: Infrastructure Quick Wins
**Goal**: All migrations are registered and applied on fresh install, COALESCE null-clearing bug is fixed, step ordering is section-aware, and version numbers are aligned
**Depends on**: Phase 67 (first phase of v0.2.11)
**Requirements**: MIG-01, MIG-02, VER-01, REC-03, REC-05
**Success Criteria** (what must be TRUE):
  1. A fresh app launch from an empty app data directory creates all required tables and columns without any errors or missing schema
  2. User can set a section metadata field (section_type, technique, execution_mode, applies_to) to a value and then clear it back to empty; the cleared state persists after save and reopen
  3. Recipe-level step queries return steps grouped by section in section order; steps from different sections never interleave regardless of step insertion order
  4. package.json and tauri.conf.json both show the same version string matching the current release
**Plans:** 2 plans
Plans:
**Wave 1**
- [ ] 68-01-PLAN.md — COALESCE null-clearing fix (REC-03) + version alignment (VER-01) + migration verification (MIG-01, MIG-02)
- [ ] 68-02-PLAN.md — Section-aware step ordering (REC-05) + duplicateRecipe section metadata copy (D-09)

### Phase 69: Paintless Recipe Steps
**Goal**: Recipe steps can exist without a paint selection, and paintless steps are excluded from availability calculations
**Depends on**: Phase 68
**Requirements**: REC-01
**Success Criteria** (what must be TRUE):
  1. User can save a recipe step form without selecting a paint; the step persists in the database with a null paint_id
  2. After closing and reopening the recipe, the paintless step appears in the step list with no paint shown
  3. Paint availability percentage on the recipe card and timeline view excludes paintless steps from both numerator and denominator
**Plans:** 1 plan
Plans:
- [x] 69-01-PLAN.md — Migration 022 (nullable paint_id) + guard removal + type update + SectionedTimeline null fix

### Phase 70: Non-Destructive Recipe Save
**Goal**: Editing a recipe preserves all existing section and step database IDs; only genuinely changed fields are updated, only genuinely removed items are deleted
**Depends on**: Phase 69
**Requirements**: REC-02
**Success Criteria** (what must be TRUE):
  1. After editing a recipe (rename a step, reorder steps, change a field), the section and step rows in the database retain their original IDs — no new IDs are assigned to unchanged items
  2. Removing a step from the form deletes only that step's database row; all other step rows are untouched
  3. Adding a new step during an edit inserts exactly one new row; existing step rows are not deleted and re-inserted
  4. Duplicate recipe produces a full copy with new IDs for all sections and steps, unaffected by the non-destructive save logic
**Plans**: TBD

### Phase 71: Stable Session Section FK
**Goal**: Painting sessions store a durable recipe_section_id FK so section analytics survive section renames
**Depends on**: Phase 70
**Requirements**: REC-04
**Success Criteria** (what must be TRUE):
  1. Migration 022 runs on app start and adds a recipe_section_id column to the painting_sessions table with an ON DELETE SET NULL FK
  2. When logging a session against a recipe section, the session row stores both the section's database ID and its denormalized name
  3. Renaming a recipe section updates the section row's name but does not break or orphan any painting session records — existing sessions still display their original section name
**Plans**: TBD

### Phase 72: Data-Layer Test Suite
**Goal**: Automated tests verify the contracts delivered by Phases 68-71 and prevent regression
**Depends on**: Phase 71
**Requirements**: TST-01
**Success Criteria** (what must be TRUE):
  1. A Vitest test using better-sqlite3 verifies that all migration files registered in lib.rs produce the expected tables and columns on a fresh in-memory database
  2. A test round-trips a recipe save with paintless steps and confirms null paint_id rows are stored and retrieved correctly
  3. A test exercises the non-destructive save path and asserts that unchanged section/step IDs are preserved across an edit cycle
  4. A test inserts a painting session with a recipe_section_id FK and confirms ON DELETE SET NULL fires correctly when the section is deleted
**Plans**: TBD

## Progress

**Execution Order:** 61 > 62 > 63 > 64 > 65 > 66 > 67 > 68 > 69 > 70 > 71 > 72

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
| 58. Recipe Form & Timeline Display | v0.2.9 | 2/2 | Complete | 2026-05-12 |
| 59. Session Section Cascade | v0.2.9 | 2/2 | Complete | 2026-05-12 |
| 60. Kanban & CurrentFocus Integration | v0.2.9 | 2/2 | Complete | 2026-05-12 |
| 61. Recipe Workflow Hardening | v0.2.10 | 2/2 | Complete | 2026-05-13 |
| 62. Applied Recipe Data Layer | v0.2.10 | 2/2 | Complete | 2026-05-13 |
| 63. Applied Recipe UX | v0.2.10 | 0/3 | Not started | - |
| 64. Applied Recipe Integrations | v0.2.10 | 0/TBD | Not started | - |
| 65. Points Import Pipeline | v0.2.10 | 0/TBD | Not started | - |
| 66. Army List Validation | v0.2.10 | 0/TBD | Not started | - |
| 67. Game Day Integration | v0.2.10 | 0/TBD | Not started | - |
| 68. Infrastructure Quick Wins | v0.2.11 | 0/2 | Not started | - |
| 69. Paintless Recipe Steps | v0.2.11 | 0/1 | Not started | - |
| 70. Non-Destructive Recipe Save | v0.2.11 | 0/TBD | Not started | - |
| 71. Stable Session Section FK | v0.2.11 | 0/TBD | Not started | - |
| 72. Data-Layer Test Suite | v0.2.11 | 0/TBD | Not started | - |
