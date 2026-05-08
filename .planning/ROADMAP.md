# Roadmap: HobbyForge

## Milestones

- ✅ **v0.1.1 HobbyForge MVP** — Phases 1–5 (shipped 2024-05-01)
- ✅ **v0.2.0 Utility Layer** — Phases 6–9 (shipped 2024-05-03)
- ✅ **v0.2.1 Visual Command** — Phases 10–16 + 20 (shipped 2026-05-04)
- ✅ **v0.2.2 Full Circle** — Phases 17–19, 21–24, 35 (shipped 2026-05-05)
- ✅ **v0.2.3 Hobby Command Center** — Phases 25–29 (shipped 2026-05-05)
- ✅ **v0.2.4 Premium Dashboard UX & Visual Polish** — Phases 30–34, 36 (shipped 2026-05-06)
- ✅ **v0.2.5 Recipes 2.0 / Painting Studio** — Phases 37–41 (shipped 2026-05-07)
- ✅ **v0.2.6 Rules Sync 2.0 / Rules Data Hub** — Phases 42–47 (shipped 2026-05-08)
- 🚧 **v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows** — Phases 48–51 (in progress)

## Phases

<details>
<summary>✅ v0.1.1 HobbyForge MVP (Phases 1–5) — SHIPPED 2024-05-01</summary>

- [x] Phase 1: App Shell — Tauri + React desktop app launches with sidebar, routing, SQLite plumbing, dark mode, and all shadcn components installed (completed 2024-04-30)
- [x] Phase 2: Data Layer + Entity CRUD — Full 10-table schema, FK enforcement, seed data, and CRUD for factions / units / paints (completed 2024-04-30)
- [x] Phase 3: Collection Module — Searchable, filterable unit table with detail drawer, inline status updates, progress bars, and full create/edit/delete UX including all cross-cutting polish patterns (completed 2024-05-01)
- [x] Phase 4: Painting Module — Active painting projects Kanban (status columns, card actions, mark active) plus full recipe CRUD with paint linkage and owned/missing paint indicator (completed 2024-05-01)
- [x] Phase 5: Dashboard — Full dashboard with global stat cards, faction summary cards, painting/assembly/basing percentages, active projects list, and recently updated units (completed 2024-05-01)

Full details: `.planning/milestones/v0.1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.0 Utility Layer (Phases 6–9) — SHIPPED 2024-05-03</summary>

- [x] **Phase 6: Foundation** — Schema migration 004, TypeScript types for all v0.2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules, and cross-invalidation patch to usePaints.ts (completed 2024-05-01)
- [x] **Phase 7: Paint Inventory** — PaintInventoryPage with brand/type/color-family filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge, inline owned toggle, sidebar nav and route (completed 2024-05-02)
- [x] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sidebar nav and route (completed 2024-05-03)
- [x] **Phase 9: Unit Playbook** — PlaybookTab (stats block grid + abilities/keywords + strategy notes + inline save), UnitDetailSheet wrapped in shadcn Tabs (completed 2024-05-02)

Full details: `.planning/milestones/v0.2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v0.2.1 Visual Command (Phases 10–16 + 20) — SHIPPED 2026-05-04</summary>

- [x] Phase 10: Theming Foundation — CSS `@theme` faction-accent system, `ActiveFactionContext`, collapsible sidebar with icon-only mode, Radix Tooltip labels, localStorage persistence (completed 2026-05-03)
- [x] Phase 11: Dashboard Command Center — `useCountUp` rAF animated stat counters, `FactionSummaryCard` with `ring-faction-accent` highlight (completed 2026-05-03)
- [x] Phase 12: Collection Gallery View — `UnitGallery` card grid + `PaintingRing` SVG, `useCollectionViewMode` localStorage toggle, filter preservation (completed 2026-05-04)
- [x] Phase 13: Hobby Journal — `painting_sessions` table, `tauri-plugin-fs/dialog`, session log + photo timeline with lightbox, JOUR-06 disk cleanup on unit delete (completed 2026-05-04)
- [x] Phase 14: Spending Tracker — Integer-pence discipline, `formatCurrency`, `SpendingPage` with per-faction breakdown, 6-mutation cache invalidation (completed 2026-05-04)
- [x] Phase 15: Warhammer 40K Datasheet Integration — Dual-DB architecture, `bulk_sync_rules` Rust command, `useRulesSync` 7-CSV parallel fetch, `DatasheetPicker`, `DatasheetImportDialog`, full PlaybookTab (DS-01..12) (completed 2026-05-04)
- [x] Phase 16: Design Overhaul — Geist Variable font, text-3xl page headers, icon-pill empty states across all 7 pages, tabular-nums everywhere, card elevation system (completed 2026-05-04)
- [x] Phase 20: v0.2.1 Polish & Gap Closure — DS-08 secondary path (DashboardPage conflict dialog), FactionsEmptyState Shield icon-pill, PaintingProjectsPage controlled-props CTA, upsertSyncMeta dead export removed (completed 2026-05-04)

Full details: `.planning/milestones/v0.2.1-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.2 Full Circle (Phases 17–19, 21–24, 35) — SHIPPED 2026-05-05</summary>

- [x] Phase 17: Schema Foundation + Enrichment — Migration 008 (lore_notes + undercoat on units, lore_notes on factions, purchase_date on paints), dates.ts UTC utility (completed 2026-05-04)
- [x] Phase 18: Battle Log — Battle log CRUD page with opponent faction, mission, result, army list linkage, notes (completed 2026-05-04)
- [x] Phase 19: Analytics Core — Recharts/shadcn chart, hobby velocity and painting streak on Dashboard, monthly spend trend chart (completed 2026-05-04)
- [x] Phase 21: Wishlist — wishlist_items table (migration 009), full CRUD Wishlist page with cost/notes (completed 2026-05-05)
- [x] Phase 22: Hobby Goals — hobby_goals table (migration 010), goal CRUD with target unit count, progress from session history (completed 2026-05-05)
- [x] Phase 23: Display Features — Battle Ready quick-filter, Showcase Mode full-screen gallery via Tauri window API (completed 2026-05-05)
- [x] Phase 24: Unit Point Calculator — Point tiers, wargear loadout management, swap delta preview in army list builder (completed 2026-05-05)
- [x] Phase 35: v0.2.2 Gap Closure — BattleLogSheet timezone fix, PaintSheet purchase_date wiring, cache invalidation patches (completed 2026-05-05)

Full details: `.planning/milestones/v0.2.2-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.3 Hobby Command Center (Phases 25–29) — SHIPPED 2026-05-05</summary>

- [x] Phase 25: Design Foundation (2/2 plans) — completed 2026-05-04
- [x] Phase 26: Dashboard Redesign (5/5 plans) — completed 2026-05-05
- [x] Phase 27: Navigation & Quick Add (4/4 plans) — completed 2026-05-05
- [x] Phase 28: Collection + Projects (5/5 plans) — completed 2026-05-05
- [x] Phase 29: Workshop + Play (5/5 plans) — completed 2026-05-05

Full details: `.planning/milestones/v0.2.3-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.4 Premium Dashboard UX & Visual Polish (Phases 30–34, 36) — SHIPPED 2026-05-06</summary>

- [x] Phase 30: Grid Layout Foundation — Dashboard CSS grid (asymmetric 2-column bento), clickable StatCards, 5-bucket pipeline grouping (completed 2026-05-06)
- [x] Phase 31: Focus & Projects Panels — UnitThumbnail, CurrentFocusCard v2 (photo, metadata, actions), ActiveProjectsPanel (completed 2026-05-06)
- [x] Phase 32: Army Readiness Card — ArmyReadinessCard with target point selector and per-faction progress bars (completed 2026-05-06)
- [x] Phase 33: Data Intelligence — LogSession status updates, spending metrics, recipe-unit navigation (completed 2026-05-06)
- [x] Phase 34: Visual Polish — FactionSummaryCard v2, hero radial gradient, hover shadow hierarchy (completed 2026-05-06)
- [x] Phase 36: v0.2.4 Gap Closure — Recipe cache invalidation fix, stale doc updates (completed 2026-05-06)

Full details: `.planning/milestones/v0.2.4-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.5 Recipes 2.0 / Painting Studio (Phases 37–41) — SHIPPED 2026-05-07</summary>

- [x] Phase 37: Schema Foundation + Pre-flight Fixes (2/2 plans) — completed 2026-05-07
- [x] Phase 38: Structured Step Input (2/2 plans) — completed 2026-05-07
- [x] Phase 39: Studio UX + Paint Availability (3/3 plans) — completed 2026-05-07
- [x] Phase 40: Recipe Actions + Step Photos (3/3 plans) — completed 2026-05-07
- [x] Phase 41: Session Integration (2/2 plans) — completed 2026-05-07

Full details: `.planning/milestones/v0.2.5-ROADMAP.md`

</details>

---

<details>
<summary>✅ v0.2.6 Rules Sync 2.0 / Rules Data Hub (Phases 42–47) — SHIPPED 2026-05-08</summary>

- [x] Phase 42: Architecture Audit (1/1 plans) — completed 2026-05-08
- [x] Phase 43: Extended Rules Read Layer (2/2 plans) — completed 2026-05-08
- [x] Phase 44: Sync Pipeline Hardening (2/2 plans) — completed 2026-05-08
- [x] Phase 45: Sync Metadata & Import Tracking (2/2 plans) — completed 2026-05-08
- [x] Phase 46: Manual Overrides & Version Comparison (2/2 plans) — completed 2026-05-08
- [x] Phase 47: v0.2.6 Gap Closure (2/2 plans) — completed 2026-05-08

Full details: `.planning/milestones/v0.2.6-ROADMAP.md`

</details>

---

### v0.2.7 Recipes 3.0 / Hierarchical Painting Workflows (In Progress)

**Milestone Goal:** Add recipe sections (workflow groupings) so users can model real painting sequences — completing one surface or technique block before moving to the next.

## Phase Details

### Phase 48: Section Data Layer
**Goal**: Users can persist and retrieve recipe sections with full CRUD, ordering, and section-aware step counts through a typed query/hook layer — all backed by a zero-data-loss migration.
**Depends on**: Phase 47 (v0.2.6 complete)
**Requirements**: SECT-01, SECT-02, SECT-03, SECT-04, SECT-05, SECT-06
**Success Criteria** (what must be TRUE):
  1. Migration 018 runs at app startup without errors and all existing recipe steps remain linked to their recipes (zero data loss)
  2. Every existing recipe has exactly one auto-created default section with all its steps pointed at it
  3. User can create, rename, and delete a recipe section through the hook layer with correct 5-key cache invalidation on delete (sections, steps, step-counts, availability, swatch)
  4. User can persist a new section order and it survives app restart
  5. A batch GROUP BY query returns accurate per-section step counts in one round-trip
**Plans:** 2/2 plans complete

Plans:
- [x] 48-01-PLAN.md — Schema migration + TypeScript type definitions
- [x] 48-02-PLAN.md — Query/hook layer + unit tests

### Phase 49: Section Read UI
**Goal**: Users can view a recipe's full workflow as a timeline grouped by section headers, with surface, timing, and paint-availability context visible at a glance — with backward-compatible flat fallback for section-free recipes.
**Depends on**: Phase 48
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. Opening a recipe with sections shows steps grouped under named section headers with no steps appearing outside a section block
  2. Each section header displays the section name, surface badge, step count, and estimated total time for that section
  3. Each section header shows a per-section owned/missing paint count (e.g., "3 owned, 1 missing")
  4. Opening a recipe that has no sections renders the existing flat step timeline unchanged
**Plans:** 1 plan

Plans:
- [ ] 49-01-PLAN.md — SectionedTimeline component + RecipeDetailSheet conditional branch

### Phase 50: Section Form UI
**Goal**: Users can create and edit recipes with collapsible section cards containing step lists, with drag-and-drop reorder at both the section and step levels, and progressive disclosure so single-section recipes stay as simple as they were before.
**Depends on**: Phase 49
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06
**Success Criteria** (what must be TRUE):
  1. Opening the recipe form for a recipe with sections shows each section as a collapsible card containing its steps, with sections and steps loaded in the correct grouping
  2. User can add a new section, rename it inline, and delete it (with its steps removed) without leaving the form
  3. User can drag section cards to reorder them; the new order is reflected immediately in the form and persisted on save
  4. User can drag steps within a section to reorder them; step reorder is independent per section and persisted on save
  5. Creating a new recipe opens the form with exactly one default section already present, keeping the experience as simple as before sections existed
**Plans**: TBD

### Phase 51: Duplication + Integration Polish
**Goal**: Recipe duplication correctly copies all sections and steps with remapped IDs, and all existing recipe workflows (availability badges, swatch strips, LogSession, recipe cards) continue to work unchanged alongside the new section count display.
**Depends on**: Phase 50
**Requirements**: INTG-01, INTG-02, INTG-03
**Success Criteria** (what must be TRUE):
  1. Duplicating a recipe produces a new recipe with the same section structure and steps; editing a step in the copy does not affect the original
  2. Recipe cards on the RecipesPage display the section count alongside the step count
  3. All pre-existing flows (paint availability badges, swatch strip, LogSessionSheet recipe/step selectors, bulk wishlist add) work identically to v0.2.6 with no regressions
**Plans**: TBD

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 35 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 36 → 37 → 38 → 39 → 40 → 41 → 42 → 43 → 44 → 45 → 46 → 47 → 48 → 49 → 50 → 51

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
| 49. Section Read UI | v0.2.7 | 0/1 | Not started | - |
| 50. Section Form UI | v0.2.7 | 0/TBD | Not started | - |
| 51. Duplication + Integration Polish | v0.2.7 | 0/TBD | Not started | - |
