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
- ✅ **v0.2.10 Applied Recipes, Points Import & List Validation** — Phases 61-67 (shipped 2026-05-13)
- ✅ **v0.2.11 Foundation Hardening** — Phases 68-72 (shipped 2026-05-13)
- 🚧 **v0.2.13 Data Integrity, Diagnostics & Product Coherence** — Phases 73-78 (in progress)

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

<details>
<summary>✅ v0.2.10 Applied Recipes, Points Import & List Validation (Phases 61-67) — SHIPPED 2026-05-13</summary>

- [x] Phase 61: Recipe Workflow Hardening (2/2 plans) — completed 2026-05-13
- [x] Phase 62: Applied Recipe Data Layer (2/2 plans) — completed 2026-05-13
- [x] Phase 63: Applied Recipe UX (3/3 plans) — completed 2026-05-13
- [x] Phase 64: Applied Recipe Integrations (3/3 plans) — completed 2026-05-13
- [x] Phase 65: Points Import Pipeline (3/3 plans) — completed 2026-05-13
- [x] Phase 66: Army List Validation (3/3 plans) — completed 2026-05-13
- [x] Phase 67: Game Day Integration (1/1 plan) — completed 2026-05-13

Full details: `.planning/milestones/v0.2.10-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.11 Foundation Hardening (Phases 68-72) — SHIPPED 2026-05-13</summary>

- [x] Phase 68: Infrastructure Quick Wins (2/2 plans) — completed 2026-05-13
- [x] Phase 69: Paintless Recipe Steps (1/1 plan) — completed 2026-05-13
- [x] Phase 70: Non-Destructive Recipe Save (2/2 plans) — completed 2026-05-13
- [x] Phase 71: Stable Session Section FK (2/2 plans) — completed 2026-05-13
- [x] Phase 72: Data-Layer Test Suite (2/2 plans) — completed 2026-05-13

Full details: `.planning/milestones/v0.2.11-ROADMAP.md`

</details>

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

---

### v0.2.13 Data Integrity, Diagnostics & Product Coherence (In Progress)

**Milestone Goal:** Make HobbyForge trustworthy and guided — stable data identity, transactional writes, centralized points resolution, data health visibility, backup/export, and an actionable dashboard that tells the user what to do next.

- [x] **Phase 73: Schema Foundation + Version Parity** - Migrations 026+027, version parity check script
- [ ] **Phase 74: Applied Recipe Identity Hardening** - Switch progress tracking from order_index to recipe_step_id
- [ ] **Phase 75: Transactional Recipe Graph Save** - Atomic section+step persistence, no partial saves
- [ ] **Phase 76: Points Resolver + Unit Rules Mapping + Split Warnings** - Centralized resolver, source labeling, unit confirmation, warning split
- [ ] **Phase 77: Data Health Page + Backup/Export** - Diagnostics page, VACUUM INTO backup
- [ ] **Phase 78: Dashboard Command Center + Game Day After-Action** - Next action UX, ready-to-play summary, end-game loop

## Phase Details

### Phase 73: Schema Foundation + Version Parity
**Goal**: The schema is extended with two new tables and a CI-friendly version parity script guards against version drift
**Depends on**: Nothing (first phase of milestone)
**Requirements**: DI-05
**Success Criteria** (what must be TRUE):
  1. Migration 026 creates the unit_rules_mapping table; migration 027 adds game day after-action columns to battle_log
  2. Both migrations are registered in lib.rs and run automatically on app launch
  3. Running `pnpm check:version` exits 0 when package.json and tauri.conf.json agree, exits non-zero with a clear message when they diverge
**Plans**: 2 plans
Plans:
- [x] 73-01-PLAN.md — Migrations 026+027 and lib.rs registration
- [x] 73-02-PLAN.md — Version parity script + version bumps to 0.2.13

### Phase 74: Applied Recipe Identity Hardening
**Goal**: Applied recipe step progress is keyed by recipe_step_id so reordering steps never moves completion markers
**Depends on**: Phase 73
**Requirements**: DI-01, DI-02
**Success Criteria** (what must be TRUE):
  1. Checking off a step on a unit's applied recipe checklist persists using recipe_step_id as the key, not order_index
  2. Reordering steps in a recipe does not alter which steps show as completed on any existing assignment
  3. Existing progress rows are migrated safely: the back-fill SQL joins through recipe_sections to resolve per-section order_index values without ambiguity across multi-section recipes
  4. Units that had zero progress recorded continue to show zero completed steps after migration
**Plans**: 2 plans
Plans:
- [ ] 74-01-PLAN.md — Migration 028 + type/query/function layer updates
- [ ] 74-02-PLAN.md — Hook/UI consumer + test updates

### Phase 75: Transactional Recipe Graph Save
**Goal**: Saving a recipe always completes fully or not at all — partial saves are structurally impossible
**Depends on**: Phase 73
**Requirements**: DI-03, DI-04
**Success Criteria** (what must be TRUE):
  1. Saving a recipe with sections and steps either succeeds completely or rolls back with no rows changed
  2. An error mid-save (e.g. DB constraint violation) leaves the recipe in its previous state with no orphaned sections or steps
  3. Existing section and step IDs are preserved on save — the five-phase diff (delete removed, update existing, insert new) is maintained inside the single transaction
  4. The save function uses flat inline SQL with no nested BEGIN calls (no helper delegation that opens its own transaction)
**Plans**: 2 plans
Plans:
- [ ] 73-01-PLAN.md � Migrations 026+027 and lib.rs registration
- [ ] 73-02-PLAN.md � Version parity script + version bumps to 0.2.13

### Phase 76: Points Resolver + Unit Rules Mapping + Split Warnings
**Goal**: Every surface that shows points reads from a single resolver function; users can see where each value came from and confirm or override the unit-to-rules mapping; list vs unit warnings are no longer mixed
**Depends on**: Phase 73
**Requirements**: PV-01, PV-02, PV-03, PV-04, PV-05, PV-06, PV-07
**Success Criteria** (what must be TRUE):
  1. Army list, Game Day, and validation surfaces all display point values computed by a single `resolveUnitPoints()` function in `src/lib/`
  2. Each unit row shows a source chip ("95 pts · synced", "100 pts · manual override", "— unknown · needs review") with no extra queries
  3. A unit that has been auto-matched to rules shows a "Confirmed" state; a unit with an ambiguous or missing match shows a prompt the user can act on
  4. The user can open a unit's rules mapping, confirm the auto-match, or select a different rules entry
  5. Duplicate or ambiguous matches are flagged with a visible indicator on the unit row
  6. List-level warnings (total points exceeded, stale data source) appear once in the army list summary panel, not repeated for every unit
  7. Unit-level warnings (no points data, not battle-ready) remain attached to their individual unit rows
  8. The COALESCE site-3 divergence in dashboard.ts (2-level chain vs the 5-level standard) is resolved or explicitly documented as intentional
**Plans**: 2 plans
Plans:
- [ ] 73-01-PLAN.md � Migrations 026+027 and lib.rs registration
- [ ] 73-02-PLAN.md � Version parity script + version bumps to 0.2.13
**UI hint**: yes

### Phase 77: Data Health Page + Backup/Export
**Goal**: The user can inspect the health of their data at a glance and create a safe backup of hobbyforge.db from the UI
**Depends on**: Phase 73, Phase 74
**Requirements**: DX-01, DX-02, DX-03, DX-04, BK-01, BK-02, BK-03
**Success Criteria** (what must be TRUE):
  1. A Data Health page (reachable from the sidebar or settings) shows app version, schema migration versions for both databases, last sync date, and sync error count
  2. The page shows row counts for key tables: units, recipes, unit_recipe_assignments, unit_recipe_step_progress, synced_unit_points
  3. The page flags orphaned progress rows (progress with no matching step), ambiguous point matches, and stale sync data with actionable descriptions
  4. Diagnostics load lazily — the page is immediately interactive while counts and flags populate asynchronously; the UI never blocks
  5. A "Create Backup" button opens a file picker and writes a safe copy of hobbyforge.db using VACUUM INTO (not raw file copy)
  6. The page shows the last backup date and success status after backup completes
**Plans**: 2 plans
Plans:
- [ ] 73-01-PLAN.md � Migrations 026+027 and lib.rs registration
- [ ] 73-02-PLAN.md � Version parity script + version bumps to 0.2.13
**UI hint**: yes

### Phase 78: Dashboard Command Center + Game Day After-Action
**Goal**: The dashboard tells the user exactly what to do next; Game Day closes the loop to the battle log with pre-filled after-action capture
**Depends on**: Phase 73, Phase 74, Phase 76
**Requirements**: DB-01, DB-02, DB-03, GD-01, GD-02, GD-03, GD-04
**Success Criteria** (what must be TRUE):
  1. The Dashboard displays a "Next Painting Action" card showing the specific step description, estimated time, and paint availability for the user's current applied recipe assignment
  2. The Dashboard displays a "Ready to Play" summary showing points total, unpainted unit count, and sync freshness for the primary army list
  3. The Dashboard displays a "Data Health" summary showing sync age, total warning count, and last backup status
  4. The "End Game" button in Game Day mode opens an after-action sheet pre-filled with the active army list, today's date, and opponent field ready to complete
  5. The after-action sheet lets the user record which rules were forgotten and tag MVP or underperformer units
  6. Forgotten rules captured in after-action can be promoted to Game Day reminders with one action
  7. Unit notes and army list notes can be edited directly from the after-action sheet without navigating away
**Plans**: 2 plans
Plans:
- [ ] 73-01-PLAN.md � Migrations 026+027 and lib.rs registration
- [ ] 73-02-PLAN.md � Version parity script + version bumps to 0.2.13
**UI hint**: yes

## Progress

**Execution Order:** 73 > 74 > 75 > 76 > 77 > 78

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
| 63. Applied Recipe UX | v0.2.10 | 3/3 | Complete | 2026-05-13 |
| 64. Applied Recipe Integrations | v0.2.10 | 3/3 | Complete | 2026-05-13 |
| 65. Points Import Pipeline | v0.2.10 | 3/3 | Complete | 2026-05-13 |
| 66. Army List Validation | v0.2.10 | 3/3 | Complete | 2026-05-13 |
| 67. Game Day Integration | v0.2.10 | 1/1 | Complete    | 2026-05-13 |
| 68. Infrastructure Quick Wins | v0.2.11 | 2/2 | Complete | 2026-05-13 |
| 69. Paintless Recipe Steps | v0.2.11 | 1/1 | Complete | 2026-05-13 |
| 70. Non-Destructive Recipe Save | v0.2.11 | 2/2 | Complete | 2026-05-13 |
| 71. Stable Session Section FK | v0.2.11 | 2/2 | Complete | 2026-05-13 |
| 72. Data-Layer Test Suite | v0.2.11 | 2/2 | Complete | 2026-05-13 |
| 73. Schema Foundation + Version Parity | v0.2.13 | 2/2 | Complete | 2026-05-14 |
| 74. Applied Recipe Identity Hardening | v0.2.13 | 0/TBD | Not started | - |
| 75. Transactional Recipe Graph Save | v0.2.13 | 0/TBD | Not started | - |
| 76. Points Resolver + Unit Rules Mapping + Split Warnings | v0.2.13 | 0/TBD | Not started | - |
| 77. Data Health Page + Backup/Export | v0.2.13 | 0/TBD | Not started | - |
| 78. Dashboard Command Center + Game Day After-Action | v0.2.13 | 0/TBD | Not started | - |
