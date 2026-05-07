# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2024-05-01)
- ✅ **v2.0 Utility Layer** — Phases 6–9 (shipped 2024-05-03)
- ✅ **v2.1 Visual Command** — Phases 10–16 + 20 (shipped 2026-05-04)
- ✅ **v2.2 Full Circle** — Phases 17–19, 21–24, 35 (shipped 2026-05-05)
- ✅ **v2.3 Hobby Command Center** — Phases 25–29 (shipped 2026-05-05)
- ✅ **v2.4 Premium Dashboard UX & Visual Polish** — Phases 30–34, 36 (shipped 2026-05-06)
- 🚧 **v2.5 Recipes 2.0 / Painting Studio** — Phases 37–41 (in progress)

## Phases

<details>
<summary>✅ v1.1 HobbyForge MVP (Phases 1–5) — SHIPPED 2024-05-01</summary>

- [x] Phase 1: App Shell — Tauri + React desktop app launches with sidebar, routing, SQLite plumbing, dark mode, and all shadcn components installed (completed 2024-04-30)
- [x] Phase 2: Data Layer + Entity CRUD — Full 10-table schema, FK enforcement, seed data, and CRUD for factions / units / paints (completed 2024-04-30)
- [x] Phase 3: Collection Module — Searchable, filterable unit table with detail drawer, inline status updates, progress bars, and full create/edit/delete UX including all cross-cutting polish patterns (completed 2024-05-01)
- [x] Phase 4: Painting Module — Active painting projects Kanban (status columns, card actions, mark active) plus full recipe CRUD with paint linkage and owned/missing paint indicator (completed 2024-05-01)
- [x] Phase 5: Dashboard — Full dashboard with global stat cards, faction summary cards, painting/assembly/basing percentages, active projects list, and recently updated units (completed 2024-05-01)

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Utility Layer (Phases 6–9) — SHIPPED 2024-05-03</summary>

- [x] **Phase 6: Foundation** — Schema migration 004, TypeScript types for all v2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules, and cross-invalidation patch to usePaints.ts (completed 2024-05-01)
- [x] **Phase 7: Paint Inventory** — PaintInventoryPage with brand/type/color-family filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge, inline owned toggle, sidebar nav and route (completed 2024-05-02)
- [x] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sidebar nav and route (completed 2024-05-03)
- [x] **Phase 9: Unit Playbook** — PlaybookTab (stats block grid + abilities/keywords + strategy notes + inline save), UnitDetailSheet wrapped in shadcn Tabs (completed 2024-05-02)

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Visual Command (Phases 10–16 + 20) — SHIPPED 2026-05-04</summary>

- [x] Phase 10: Theming Foundation — CSS `@theme` faction-accent system, `ActiveFactionContext`, collapsible sidebar with icon-only mode, Radix Tooltip labels, localStorage persistence (completed 2026-05-03)
- [x] Phase 11: Dashboard Command Center — `useCountUp` rAF animated stat counters, `FactionSummaryCard` with `ring-faction-accent` highlight (completed 2026-05-03)
- [x] Phase 12: Collection Gallery View — `UnitGallery` card grid + `PaintingRing` SVG, `useCollectionViewMode` localStorage toggle, filter preservation (completed 2026-05-04)
- [x] Phase 13: Hobby Journal — `painting_sessions` table, `tauri-plugin-fs/dialog`, session log + photo timeline with lightbox, JOUR-06 disk cleanup on unit delete (completed 2026-05-04)
- [x] Phase 14: Spending Tracker — Integer-pence discipline, `formatCurrency`, `SpendingPage` with per-faction breakdown, 6-mutation cache invalidation (completed 2026-05-04)
- [x] Phase 15: Warhammer 40K Datasheet Integration — Dual-DB architecture, `bulk_sync_rules` Rust command, `useRulesSync` 7-CSV parallel fetch, `DatasheetPicker`, `DatasheetImportDialog`, full PlaybookTab (DS-01..12) (completed 2026-05-04)
- [x] Phase 16: Design Overhaul — Geist Variable font, text-3xl page headers, icon-pill empty states across all 7 pages, tabular-nums everywhere, card elevation system (completed 2026-05-04)
- [x] Phase 20: v2.1 Polish & Gap Closure — DS-08 secondary path (DashboardPage conflict dialog), FactionsEmptyState Shield icon-pill, PaintingProjectsPage controlled-props CTA, upsertSyncMeta dead export removed (completed 2026-05-04)

Full details: `.planning/milestones/v2.1-ROADMAP.md`

</details>

---

<details>
<summary>✅ v2.2 Full Circle (Phases 17–19, 21–24, 35) — SHIPPED 2026-05-05</summary>

- [x] Phase 17: Schema Foundation + Enrichment — Migration 008 (lore_notes + undercoat on units, lore_notes on factions, purchase_date on paints), dates.ts UTC utility (completed 2026-05-04)
- [x] Phase 18: Battle Log — Battle log CRUD page with opponent faction, mission, result, army list linkage, notes (completed 2026-05-04)
- [x] Phase 19: Analytics Core — Recharts/shadcn chart, hobby velocity and painting streak on Dashboard, monthly spend trend chart (completed 2026-05-04)
- [x] Phase 21: Wishlist — wishlist_items table (migration 009), full CRUD Wishlist page with cost/notes (completed 2026-05-05)
- [x] Phase 22: Hobby Goals — hobby_goals table (migration 010), goal CRUD with target unit count, progress from session history (completed 2026-05-05)
- [x] Phase 23: Display Features — Battle Ready quick-filter, Showcase Mode full-screen gallery via Tauri window API (completed 2026-05-05)
- [x] Phase 24: Unit Point Calculator — Point tiers, wargear loadout management, swap delta preview in army list builder (completed 2026-05-05)
- [x] Phase 35: v2.2 Gap Closure — BattleLogSheet timezone fix, PaintSheet purchase_date wiring, cache invalidation patches (completed 2026-05-05)

Full details: `.planning/milestones/v2.2-ROADMAP.md`

</details>

---

<details>
<summary>✅ v2.3 Hobby Command Center (Phases 25–29) — SHIPPED 2026-05-05</summary>

- [x] Phase 25: Design Foundation (2/2 plans) — completed 2026-05-04
- [x] Phase 26: Dashboard Redesign (5/5 plans) — completed 2026-05-05
- [x] Phase 27: Navigation & Quick Add (4/4 plans) — completed 2026-05-05
- [x] Phase 28: Collection + Projects (5/5 plans) — completed 2026-05-05
- [x] Phase 29: Workshop + Play (5/5 plans) — completed 2026-05-05

Full details: `.planning/milestones/v2.3-ROADMAP.md`

</details>

---

<details>
<summary>✅ v2.4 Premium Dashboard UX & Visual Polish (Phases 30–34, 36) — SHIPPED 2026-05-06</summary>

- [x] Phase 30: Grid Layout Foundation — Dashboard CSS grid (asymmetric 2-column bento), clickable StatCards, 5-bucket pipeline grouping (completed 2026-05-06)
- [x] Phase 31: Focus & Projects Panels — UnitThumbnail, CurrentFocusCard v2 (photo, metadata, actions), ActiveProjectsPanel (completed 2026-05-06)
- [x] Phase 32: Army Readiness Card — ArmyReadinessCard with target point selector and per-faction progress bars (completed 2026-05-06)
- [x] Phase 33: Data Intelligence — LogSession status updates, spending metrics, recipe-unit navigation (completed 2026-05-06)
- [x] Phase 34: Visual Polish — FactionSummaryCard v2, hero radial gradient, hover shadow hierarchy (completed 2026-05-06)
- [x] Phase 36: v2.4 Gap Closure — Recipe cache invalidation fix, stale doc updates (completed 2026-05-06)

Full details: `.planning/milestones/v2.4-ROADMAP.md`

</details>

---

### 🚧 v2.5 Recipes 2.0 / Painting Studio (In Progress)

**Milestone Goal:** Transform recipes from flat paint notes into a structured painting knowledge system with step-by-step workflows, paint inventory integration, and a studio UX.

- [ ] **Phase 37: Schema Foundation + Pre-flight Fixes** — Migrate recipe_paints to recipe_steps, add recipe metadata columns, fix pre-existing cache invalidation bug, eliminate N+1 step count query
- [ ] **Phase 38: Structured Step Input** — Full step CRUD with phase/tool/technique/dilution fields, time estimates, and @dnd-kit reordering
- [ ] **Phase 39: Studio UX + Paint Availability** — Card grid view with metadata badges, step-by-step timeline detail, advanced filters, and owned/missing paint badge on cards
- [ ] **Phase 40: Recipe Actions + Step Photos** — Recipe duplication, per-step photo upload, substitute paint linking, and add-all-missing-to-wishlist action
- [ ] **Phase 41: Session Integration** — Recipe + step selection in LogSessionSheet, session history visible from recipe detail view

## Phase Details

### Phase 37: Schema Foundation + Pre-flight Fixes
**Goal**: The recipe data model is rebuilt on a structured step foundation, existing data is preserved, and two pre-existing bugs that would corrupt the v2.5 experience are eliminated before any new UI lands
**Depends on**: Phase 36 (v2.4 complete)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04
**Success Criteria** (what must be TRUE):
  1. Existing recipe_paints rows are visible as recipe_steps in the new schema — no data loss after migration
  2. Every recipe card shows a correct step count without issuing one query per recipe
  3. Deleting a recipe from the Kanban board no longer leaves stale kanban-enrichment cache entries
  4. A recipe can be saved with style, surface, effect, difficulty, estimated minutes, and result photo metadata fields
**Plans**: TBD

### Phase 38: Structured Step Input
**Goal**: Users can build a recipe step-by-step with all relevant painting detail — paint link, phase label, tool, technique, dilution, and time estimate — and reorder steps via drag-and-drop
**Depends on**: Phase 37
**Requirements**: STEP-01, STEP-02, STEP-03, STEP-04
**Success Criteria** (what must be TRUE):
  1. User can add a step with title, painting phase (prime/basecoat/shade/layer/highlight/glaze/weathering/basing/varnish/other), and an optional linked paint
  2. User can edit or delete any existing step without affecting sibling steps
  3. User can drag a step to a new position and the new order persists after closing and reopening the recipe
  4. User can set tool, dilution ratio, technique, and time estimate (minutes) per step; the recipe header shows the sum of all step time estimates
**Plans**: TBD

### Phase 39: Studio UX + Paint Availability
**Goal**: The Recipes page becomes a proper studio with a visual card grid, step-by-step timeline detail view, paint availability at a glance, and filters to find the right recipe fast
**Depends on**: Phase 38
**Requirements**: STUDIO-01, STUDIO-02, STUDIO-04, PAINT-01
**Success Criteria** (what must be TRUE):
  1. The Recipes page renders as a card grid where each card shows color swatches, difficulty badge, estimated time, and an owned/missing/running-low paint count indicator
  2. Clicking a recipe opens a full detail view that presents all steps as a vertical timeline with phase label, paint swatch, tool, technique, and time per step
  3. User can filter the recipe grid by surface type, style, difficulty level, and whether any paints are missing from inventory
  4. The paint availability badge on each card updates immediately when paint ownership changes elsewhere in the app
**Plans**: TBD

### Phase 40: Recipe Actions + Step Photos
**Goal**: Users can duplicate recipes, attach reference photos to individual steps, link substitute paints, and bulk-add all missing recipe paints to the wishlist in a single action
**Depends on**: Phase 39
**Requirements**: STUDIO-03, STEP-05, PAINT-02, PAINT-03
**Success Criteria** (what must be TRUE):
  1. User can duplicate any recipe and the copy contains all steps, substitute paint links, and metadata — editing the copy does not affect the original
  2. User can attach a photo to any step and the photo displays inline in the step timeline
  3. User can designate an alternative substitute paint for any step; the substitute appears alongside the primary paint in the step detail
  4. User can tap "Add all missing to wishlist" on a recipe and all missing paints are added to the wishlist page in one action with no duplicates
**Plans**: TBD

### Phase 41: Session Integration
**Goal**: Painting sessions can be linked to a specific recipe and step at log time, and a recipe's detail view shows all sessions that referenced it — closing the loop between planning and execution
**Depends on**: Phase 40
**Requirements**: INTEG-01, INTEG-02
**Success Criteria** (what must be TRUE):
  1. The LogSessionSheet includes optional recipe and step selectors; selecting a recipe populates the step dropdown with that recipe's steps
  2. A session logged with a recipe/step link appears in the Sessions section of the recipe detail view, showing date, unit, and duration
  3. Session-recipe links are optional — existing log flows work without selecting a recipe
**Plans**: TBD

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 35 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 36 → 37 → 38 → 39 → 40 → 41

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell | v1.1 | 3/3 | Complete | 2024-04-30 |
| 2. Data Layer + Entity CRUD | v1.1 | 4/4 | Complete | 2024-04-30 |
| 3. Collection Module | v1.1 | 5/5 | Complete | 2024-05-01 |
| 4. Painting Module | v1.1 | 4/4 | Complete | 2024-05-01 |
| 5. Dashboard | v1.1 | 4/4 | Complete | 2024-05-01 |
| 6. Foundation | v2.0 | 5/5 | Complete | 2024-05-01 |
| 7. Paint Inventory | v2.0 | 5/5 | Complete | 2024-05-02 |
| 8. Army List Builder | v2.0 | 6/6 | Complete | 2024-05-03 |
| 9. Unit Playbook | v2.0 | 4/4 | Complete | 2024-05-02 |
| 10. Theming Foundation | v2.1 | 4/4 | Complete | 2026-05-03 |
| 11. Dashboard Command Center | v2.1 | 4/4 | Complete | 2026-05-03 |
| 12. Collection Gallery View | v2.1 | 4/4 | Complete | 2026-05-04 |
| 13. Hobby Journal | v2.1 | 6/6 | Complete | 2026-05-04 |
| 14. Spending Tracker | v2.1 | 5/5 | Complete | 2026-05-04 |
| 15. 40K Datasheet Integration | v2.1 | 7/7 | Complete | 2026-05-04 |
| 16. Design Overhaul | v2.1 | 8/8 | Complete | 2026-05-04 |
| 17. Schema Foundation + Enrichment | v2.2 | 1/1 | Complete | 2026-05-04 |
| 18. Battle Log | v2.2 | 4/4 | Complete | 2026-05-04 |
| 19. Analytics Core | v2.2 | 4/4 | Complete | 2026-05-04 |
| 20. v2.1 Polish & Gap Closure | v2.1 | 3/3 | Complete | 2026-05-04 |
| 21. Wishlist | v2.2 | 3/3 | Complete | 2026-05-05 |
| 22. Hobby Goals | v2.2 | 4/4 | Complete | 2026-05-05 |
| 23. Display Features | v2.2 | 2/2 | Complete | 2026-05-05 |
| 24. Unit Point Calculator | v2.2 | 4/4 | Complete | 2026-05-05 |
| 35. v2.2 Gap Closure | v2.2 | 1/1 | Complete | 2026-05-05 |
| 25. Design Foundation | v2.3 | 2/2 | Complete | 2026-05-04 |
| 26. Dashboard Redesign | v2.3 | 5/5 | Complete | 2026-05-05 |
| 27. Navigation & Quick Add | v2.3 | 4/4 | Complete | 2026-05-05 |
| 28. Collection + Projects | v2.3 | 5/5 | Complete | 2026-05-05 |
| 29. Workshop + Play | v2.3 | 5/5 | Complete | 2026-05-05 |
| 30. Grid Layout Foundation | v2.4 | 2/2 | Complete | 2026-05-06 |
| 31. Focus & Projects Panels | v2.4 | 3/3 | Complete | 2026-05-06 |
| 32. Army Readiness Card | v2.4 | 1/1 | Complete | 2026-05-06 |
| 33. Data Intelligence | v2.4 | 4/4 | Complete | 2026-05-06 |
| 34. Visual Polish | v2.4 | 2/2 | Complete | 2026-05-06 |
| 36. v2.4 Gap Closure | v2.4 | 1/1 | Complete | 2026-05-06 |
| 37. Schema Foundation + Pre-flight Fixes | v2.5 | 0/TBD | Not started | - |
| 38. Structured Step Input | v2.5 | 0/TBD | Not started | - |
| 39. Studio UX + Paint Availability | v2.5 | 0/TBD | Not started | - |
| 40. Recipe Actions + Step Photos | v2.5 | 0/TBD | Not started | - |
| 41. Session Integration | v2.5 | 0/TBD | Not started | - |
