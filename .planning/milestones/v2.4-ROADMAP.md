# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2024-05-01)
- ✅ **v2.0 Utility Layer** — Phases 6–9 (shipped 2024-05-03)
- ✅ **v2.1 Visual Command** — Phases 10–16 + 20 (shipped 2026-05-04)
- ✅ **v2.2 Full Circle** — Phases 17–19, 21–24, 35 (shipped 2026-05-05)
- ✅ **v2.3 Hobby Command Center** — Phases 25–29 (shipped 2026-05-05)
- 🚧 **v2.4 Premium Dashboard UX & Visual Polish** — Phases 30–34, 36 (in progress)

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

### v2.4 Premium Dashboard UX & Visual Polish (Phases 30–34)

**Milestone Goal:** Transform the dashboard into a premium, hobby-native command center with grid layout, richer interactions, centralized photos, and smarter data surfaces — making it feel less like a generic admin panel and more like a personal hobby forge.

- [x] **Phase 30: Grid Layout Foundation** — Dashboard CSS grid (asymmetric 2-column bento), clickable StatCards, and 5-bucket pipeline grouping (completed 2026-05-06)
- [x] **Phase 31: Focus & Projects Panels** — CurrentFocusCard v2 (photo, metadata, actions) and ActiveProjectsPanel with photo thumbnails and quick actions (completed 2026-05-06)
- [x] **Phase 32: Army Readiness Card** — Dedicated ArmyReadinessCard with target point selector and per-faction progress bars (completed 2026-05-06)
- [x] **Phase 33: Data Intelligence** — Log Session status updates with cache invalidation, spending metrics (cost per model, painted vs unpainted value), recipe–unit association (completed 2026-05-06)
- [x] **Phase 34: Visual Polish** — FactionCards v2, radial gradient hero, elevated card surface hierarchy (completed 2026-05-06)
- [x] **Phase 36: v2.4 Gap Closure** — Recipe cache invalidation fix, stale verification/summary doc updates (completed 2026-05-06)

## Phase Details

### Phase 30: Grid Layout Foundation
**Goal**: The dashboard structure is rebuilt as an asymmetric CSS grid bento layout — all existing sections get column spans in a single atomic commit, StatCards navigate to relevant pages when clicked, and the 11-stage pipeline is compressed into 5 readable buckets
**Depends on**: Phase 29
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03
**Success Criteria** (what must be TRUE):
  1. Dashboard displays in a 2-column asymmetric bento grid on a 1280px window — panels sit side-by-side with intentional column weights, not stacked vertically
  2. Resizing the window to 900px causes all dashboard panels to stack into a single column without horizontal overflow
  3. Clicking a StatCard (units, painted, battle-ready, spend) navigates to its corresponding page (Collection, Collection with status filter, Army Lists, Spending)
  4. Dashboard pipeline shows exactly 5 labeled buckets (Not Started / Assembly / Painting / Finishing / Done) each with a model count summed from the underlying 11 painting statuses
**Plans:** 2/2 plans complete
Plans:
- [x] 30-01-PLAN.md — CSS grid layout migration + clickable StatCard navigation
- [x] 30-02-PLAN.md — 5-bucket pipeline grouping

### Phase 31: Focus & Projects Panels
**Goal**: CurrentFocusCard becomes a rich unit preview — photo thumbnail, model count, points, linked recipe, and direct action buttons — and a new ActiveProjectsPanel surfaces the top 5 active projects with the same photo-forward treatment and quick actions
**Depends on**: Phase 30
**Requirements**: PANEL-01, PANEL-02, PANEL-03, PHOTO-01, PHOTO-02
**Success Criteria** (what must be TRUE):
  1. CurrentFocusCard displays the focus unit's most recent journal photo as a thumbnail; when no photo exists, a faction-colored placeholder with an icon fills the same space
  2. CurrentFocusCard shows unit name, faction, model count, and points value alongside the thumbnail in a single glanceable card
  3. CurrentFocusCard has an "Open Unit" button that navigates to the unit detail sheet and a "Log Progress" button that opens LogSessionSheet with that unit pre-selected
  4. ActiveProjectsPanel lists up to 5 active-project units, each showing photo thumbnail (or fallback), name, painting progress percentage, last-updated date, and Open / Log Session buttons
  5. All photo thumbnails across CurrentFocusCard and ActiveProjectsPanel use the same consistent fallback component (faction color + icon) when no journal photo is available
**Plans:** 3/3 plans complete
Plans:
- [ ] 31-00-PLAN.md — Wave 0 test stubs (Nyquist compliance)
- [ ] 31-01-PLAN.md — UnitThumbnail shared component + CurrentFocusCard v2 with photo, metadata, action buttons
- [ ] 31-02-PLAN.md — ActiveProjectsPanel with compact project rows + DashboardPage wiring

### Phase 32: Army Readiness Card
**Goal**: A dedicated ArmyReadinessCard replaces the existing readiness surface on the dashboard, giving the user a per-faction breakdown of battle-ready points against a target the user selects from a preset list
**Depends on**: Phase 30
**Requirements**: PANEL-04, PANEL-05
**Success Criteria** (what must be TRUE):
  1. Dashboard shows an ArmyReadinessCard with a target selector offering four point thresholds (500 / 1000 / 1500 / 2000 pts) — selecting a threshold immediately updates all faction progress bars
  2. Each faction listed shows a labeled progress bar indicating battle-ready points earned versus the selected target, with owned-vs-ready breakdown visible (e.g. "360 / 1000 pts ready, 1500 pts owned")
  3. ArmyReadinessCard data comes from its own dedicated query hook (not getDashboardStats) — the card loads and refreshes independently without triggering a full dashboard re-fetch
**Plans:** 1/1 plans complete
Plans:
- [ ] 32-01-PLAN.md — Query function, hooks, ArmyReadinessCard component, DashboardPage wiring, cache invalidation

### Phase 33: Data Intelligence
**Goal**: Log Session gains the ability to update a unit's painting status in the same action, cache invalidation covers all three affected query keys, the Spending page surfaces cost-per-model and painted-vs-unpainted value metrics, and recipe–unit associations become visible from both the recipe and unit sides
**Depends on**: Phase 31
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. LogSessionSheet includes an optional "Update Painting Status" field — if the user selects a new status before submitting, the unit's status_painting updates atomically with the session log
  2. After submitting a Log Session with a status change, the dashboard stat cards, collection unit list, and painting sessions list all reflect the new status without a manual refresh
  3. Spending page shows a "Cost Per Completed Model" metric — total spend divided by the count of units at Completed status — updated whenever spend or unit data changes
  4. Spending page shows a "Painted vs Unpainted Value" breakdown — two figures showing the estimated spend share attributed to painted units versus unpainted/in-progress units
  5. Recipe detail view lists which units are linked to that recipe; unit detail sheet shows which recipe (if any) is linked to that unit — navigating between them works in both directions
  6. CurrentFocusCard displays the linked recipe name when the focus unit has an associated recipe
**Plans:** 4/4 plans complete
Plans:
- [ ] 33-00-PLAN.md — Wave 0 test stubs (Nyquist compliance)
- [ ] 33-01-PLAN.md — Log Session status update (schema extension + sequential mutations + cache invalidation)
- [ ] 33-02-PLAN.md — Spending intelligence metrics (cost per model + painted vs unpainted value)
- [ ] 33-03-PLAN.md — Recipe-unit navigation + CurrentFocusCard recipe display

### Phase 34: Visual Polish
**Goal**: FactionSummaryCards are upgraded to a larger, more expressive format with a dominant accent color band and unambiguous active/focus indicators; the dashboard hero gains premium visual depth through a radial gradient; all card surfaces adopt an elevated/hover depth hierarchy
**Depends on**: Phase 33
**Requirements**: VIS-01, VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. FactionSummaryCards are visually larger than before with a solid faction-accent color band as the dominant visual element — the active/focus faction is unmistakably distinct (not just a small star icon)
  2. The dashboard hero area (title + top stat row) has a visible radial gradient background that adds depth without obscuring any text or controls
  3. All dashboard card surfaces respond to hover with a visible shadow transition — resting state uses the panel-elevated token, hover state uses a deeper shadow — giving the grid a tactile layered feel
**Plans:** 2/2 plans complete
Plans:
- [ ] 34-00-PLAN.md — Wave 0 test stubs (VIS-01 FactionSummaryCard + VIS-02 hero gradient assertions)
- [ ] 34-01-PLAN.md — FactionSummaryCard v2 + hero radial gradient + card hover shadow hierarchy

### Phase 36: v2.4 Gap Closure
**Goal**: Close all tech debt items identified by the v2.4 milestone audit — fix recipe cache invalidation for DATA-06 freshness, update stale verification and summary documentation
**Depends on**: Phase 34
**Requirements**: DATA-06 (cache fix)
**Gap Closure**: Closes gaps from v2.4-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. Recipe mutations (create/update/delete) invalidate `["recipes", "by-unit"]` query key so CurrentFocusCard recipe name refreshes immediately
  2. 34-VERIFICATION.md status updated from `gaps_found` to `passed`
  3. 32-01-SUMMARY.md frontmatter includes `requirements_completed: [PANEL-04, PANEL-05]`
  4. 33-01-SUMMARY.md frontmatter includes `requirements_completed: [DATA-01]`
Plans:
- [ ] 36-01-PLAN.md — Recipe cache invalidation + documentation fixes

## Progress

**Execution Order:** 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 35 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 36

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
| 35. v2.2 Gap Closure | 1/1 | Complete    | 2026-05-05 | — |
| 25. Design Foundation | v2.3 | 2/2 | Complete | 2026-05-04 |
| 26. Dashboard Redesign | v2.3 | 5/5 | Complete | 2026-05-05 |
| 27. Navigation & Quick Add | v2.3 | 4/4 | Complete | 2026-05-05 |
| 28. Collection + Projects | v2.3 | 5/5 | Complete | 2026-05-05 |
| 29. Workshop + Play | v2.3 | 5/5 | Complete | 2026-05-05 |
| 30. Grid Layout Foundation | 2/2 | Complete    | 2026-05-06 | — |
| 31. Focus & Projects Panels | 3/3 | Complete    | 2026-05-06 | — |
| 32. Army Readiness Card | 1/1 | Complete    | 2026-05-06 | — |
| 33. Data Intelligence | 4/4 | Complete    | 2026-05-06 | — |
| 34. Visual Polish | 2/2 | Complete    | 2026-05-06 | — |
| 36. v2.4 Gap Closure | 1/1 | Complete    | 2026-05-06 | — |
