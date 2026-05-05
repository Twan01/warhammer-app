# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2024-05-01)
- ✅ **v2.0 Utility Layer** — Phases 6–9 (shipped 2024-05-03)
- ✅ **v2.1 Visual Command** — Phases 10–16 + 20 (shipped 2026-05-04)
- ⏸️ **v2.2 Full Circle** — Phases 17–19 shipped, 21–24 deferred
- ✅ **v2.3 Hobby Command Center** — Phases 25–29 (shipped 2026-05-05)
- 🚧 **v2.4 Premium Dashboard UX & Visual Polish** — Phases 30–34 (in progress)

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

### ⏸️ v2.2 Full Circle (Phases 17–19 + 21–24) — Partial Ship

**Milestone Goal:** Close the full hobby loop — from owning and painting to playing and logging — with analytics, personal showcase, and narrative enrichment features that make HobbyForge the definitive single-player hobby OS.

- [x] **Phase 17: Schema Foundation + Enrichment** — Migration 007 (lore_notes + undercoat on units, lore_notes on factions, purchase_date on paints), dates.ts UTC utility, and lore/undercoat fields visible in unit detail sheet (completed 2026-05-04)
- [x] **Phase 18: Battle Log** — Battle log CRUD page with opponent faction, mission, result, army list linkage, notes, and chronological list (completed 2026-05-04)
- [x] **Phase 19: Analytics Core** — Recharts/shadcn chart install, hobby velocity and painting streak stats on Dashboard, monthly spend trend chart on Spending page (completed 2026-05-04)
- [ ] **Phase 21: Wishlist** — New wishlist_items table (migration 009), full CRUD Wishlist page with name/faction/estimated cost/notes
- [ ] **Phase 22: Hobby Goals** — New hobby_goals table (migration 009), goal CRUD with target unit count and timeframe, progress derived from painting session history
- [ ] **Phase 23: Display Features** — Battle Ready quick-filter on Collection page, Showcase Mode full-screen gallery using Tauri window API
- [ ] **Phase 24: Unit Point Calculator** — Point tiers per model count, wargear loadout management, swap delta preview in army list builder

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

### 🚧 v2.4 Premium Dashboard UX & Visual Polish (Phases 30–34)

**Milestone Goal:** Transform the dashboard into a premium, hobby-native command center with grid layout, richer interactions, centralized photos, and smarter data surfaces — making it feel less like a generic admin panel and more like a personal hobby forge.

- [ ] **Phase 30: Grid Layout Foundation** — Dashboard CSS grid (asymmetric 2-column bento), clickable StatCards, and 5-bucket pipeline grouping
- [ ] **Phase 31: Focus & Projects Panels** — CurrentFocusCard v2 (photo, metadata, actions) and ActiveProjectsPanel with photo thumbnails and quick actions
- [ ] **Phase 32: Army Readiness Card** — Dedicated ArmyReadinessCard with target point selector and per-faction progress bars
- [ ] **Phase 33: Data Intelligence** — Log Session status updates with cache invalidation, spending metrics (cost per model, painted vs unpainted value), recipe–unit association
- [ ] **Phase 34: Visual Polish** — FactionCards v2, radial gradient hero, elevated card surface hierarchy

## Phase Details

### Phase 17: Schema Foundation + Enrichment
**Goal**: The database gains the columns needed by all of v2.2 — lore notes and undercoat on units, lore notes on factions, purchase_date on paints — and a UTC-safe date utility resolves the existing timezone bug in JournalTab, with lore and undercoat fields immediately visible and editable in the unit detail sheet
**Depends on**: Phase 16
**Requirements**: ENRCH-01, ENRCH-02, ENRCH-03, ENRCH-04
**Success Criteria** (what must be TRUE):
  1. User can open any unit's detail sheet and see a "Lore Notes" text area — typing in it and saving persists the content across app restarts
  2. User can open any faction's edit form and see a "Lore Notes" text area — typing in it and saving persists the content across app restarts
  3. User can open any unit's detail sheet and see an "Undercoat" field — entering the primer used (e.g. "Chaos Black") saves and displays on subsequent opens
  4. Journal session dates display the correct calendar date regardless of the user's local timezone — no off-by-one dates caused by UTC/local conversion
**Plans**: 1 plan

Plans:
- [x] 17-00-PLAN.md — Migration 008 (4 ALTER TABLE columns) + lib.rs version 8 + types/queries/forms extensions + UnitDetailSheet display rows + src/lib/dates.ts utility + JournalTab UTC bug fix + manual smoke-test checkpoint (16 tasks across 5 waves)

### Phase 18: Battle Log
**Goal**: Users can record every game they play — opponent faction, mission, result, army list used, and optional notes — and view their complete game history in a chronological list
**Depends on**: Phase 17
**Requirements**: BATTLE-01, BATTLE-02, BATTLE-03, BATTLE-04, BATTLE-05
**Success Criteria** (what must be TRUE):
  1. User can navigate to a Battle Log page and log a new game by entering opponent faction, mission name, result (Win/Loss/Draw), and date — the entry saves and appears at the top of the list
  2. User can select one of their existing army lists when logging a game — the army list name is shown on the saved log entry
  3. User can add optional notes to a game log entry (MVP unit, lessons learned) and the notes are visible on the saved entry
  4. User can view all logged games in a chronological list sorted newest first — each entry shows opponent, mission, result, date, army used, and notes
  5. User can delete a game log entry and it is removed from the list immediately
**Plans**: 4 plans

Plans:
- [x] 18-00-PLAN.md — Wave 0: 2 stub test files (battleLogQueries.test.ts + computeBattleLogSummary.test.ts) — 14 it.skip stubs covering BATTLE-01..05
- [x] 18-01-PLAN.md — Wave 1: types/battleLog.ts + db/queries/battleLogs.ts (full-replacement UPDATE for FK clearing — Pitfall 5) + computeBattleLogSummary pure function + useBattleLogs hooks + battleLogSchema (zod) + flip 14 stubs
- [x] 18-02-PLAN.md — Wave 2: BattleLogPage (sibling-portal) + Row (compact 2-line + Collapsible expand + group-hover Edit/Delete) + Sheet (4 grouped sections) + DeleteDialog + SummaryBar + EmptyState + resultBadge map + /battle-log route + Battle Log sidebar entry (Swords icon in TRACKING_NAV)
- [x] 18-03-PLAN.md — Wave 3: Manual smoke-test checkpoint (11 steps verifying BATTLE-01..05 in live Tauri app including Pitfall 5 FK clear + deleted-army-list fallback + persistence across restart)

### Phase 19: Analytics Core
**Goal**: The Dashboard gains two auto-calculated hobby health metrics (velocity and painting streak) and the Spending page gains a monthly spend trend chart — all driven by existing journal session and purchase data
**Depends on**: Phase 17
**Requirements**: ANLY-04, ANLY-05, ANLY-06, ANLY-07
**Success Criteria** (what must be TRUE):
  1. Dashboard shows a "Hobby Velocity" stat — average units worked on per month calculated from journal session history — and the number updates when new sessions are logged
  2. Dashboard shows a "Painting Streak" stat — the current count of consecutive calendar days with at least one journal session — and it increments when a session is logged today
  3. Spending page shows a bar or line chart of monthly spend combining unit and paint purchases — each bar represents one calendar month's total spend
  4. The spend trend chart uses purchase_date (from Phase 17's migration) for both units and paints — entries without a purchase_date are excluded from the chart (not bucketed to epoch)
**Plans**: 4 plans

Plans:
- [x] 19-00-PLAN.md — Wave 0: 3 stub test files (computeHobbyAnalytics + analyticsQueries + useHobbyAnalytics) — 29 it.skip stubs covering ANLY-04..07 + Pitfalls 2/5/6
- [x] 19-01-PLAN.md — Wave 1: shadcn add chart + react-is ^19 pnpm override + analytics.ts query module (UNION units+paints with NULL purchase_date excluded for ANLY-07) + computeHobbyAnalytics pure function (Pitfall 2 floor + Pitfall 5 dates.ts + Pitfall 6 year-suffix labels) + useHobbyAnalytics hook with HOBBY_ANALYTICS_KEY + flip 29 stubs
- [x] 19-02-PLAN.md — Wave 2: SpendTrendChart component (Recharts BarChart in shadcn ChartContainer) + DashboardPage HOBBY HEALTH section + SpendingPage Monthly Trend section + 8 mutation invalidation patches
- [x] 19-03-PLAN.md — Wave 3: Manual smoke-test checkpoint (12 steps: HOBBY HEALTH section, velocity/streak fallbacks, chart rendering, NULL purchase_date exclusion, year-boundary labels)

### Phase 21: Wishlist
**Goal**: Users can maintain a running list of models they want to buy — with name, faction, optional estimated cost, and notes — on a dedicated Wishlist page before the items exist in their collection
**Depends on**: Phase 17
**Requirements**: WISH-01, WISH-02, WISH-03, WISH-04
**Success Criteria** (what must be TRUE):
  1. User can navigate to a Wishlist page and add a new item by entering a name, selecting a faction, and optionally entering an estimated cost — the item saves and appears in the list
  2. User can view all wishlist items on the Wishlist page in a list showing name, faction, estimated cost, and notes
  3. User can add optional notes to a wishlist item (e.g. "wait for sale", "for Crusade roster") and the notes are visible on the saved item
  4. User can delete a wishlist item and it is removed from the list immediately
**Plans**: 3 plans

Plans:
- [ ] 21-00-PLAN.md — Wave 0: 2 stub test files (wishlistQueries.test.ts + WishlistPage.test.tsx) — 16 it.skip stubs covering WISH-01..04
- [ ] 21-01-PLAN.md — Wave 1: migration 009 (wishlist_items table) + lib.rs version 9 + types/wishlistItem.ts + db/queries/wishlistItems.ts (full-replacement UPDATE) + useWishlistItems hooks + wishlistItemSchema (zod) + activate 8 SQL stubs
- [ ] 21-02-PLAN.md — Wave 2: WishlistPage (sibling-portal) + Row (group-hover Edit/Delete) + Sheet (buildDefaultValues + currency input) + DeleteDialog + EmptyState (Heart icon-pill) + TotalBar + /wishlist route + Wishlist sidebar entry (Heart icon in MANAGEMENT_NAV) + activate 8 component stubs

### Phase 22: Hobby Goals
**Goal**: Users can set monthly or quarterly painting targets — a unit count to complete by end of the period — and see live progress toward each goal calculated automatically from their journal session history
**Depends on**: Phase 17
**Requirements**: ANLY-01, ANLY-02, ANLY-03
**Success Criteria** (what must be TRUE):
  1. User can create a painting goal by specifying a target unit count and a timeframe (this month / this quarter) — the goal saves and appears on the Goals page
  2. Each goal shows a progress bar — the filled portion reflects the count of distinct units that have at least one painting session logged during the goal's timeframe, updated automatically as sessions are added
  3. User can view all active and completed goals on the Goals page — completed goals (progress >= target) are visually distinguished from active ones
**Plans**: 4 plans

Plans:
- [ ] 22-00-PLAN.md — Wave 0: 6 test stub files (goalQueries + goalSchema + computeGoalPeriod + useGoals + GoalSheet + GoalsPage) — 33 it.skip stubs covering ANLY-01..03
- [ ] 22-01-PLAN.md — Wave 1: migration 009 (hobby_goals table) + lib.rs version 9 + types/goal.ts + computeGoalPeriod/deriveGoalStatus pure functions + goalSchema (zod) + goals.ts query module (CRUD + getGoalProgress with COUNT(DISTINCT unit_id)) + activate 20 stubs
- [ ] 22-02-PLAN.md — Wave 2: useGoals hooks (GOALS_KEY + GOAL_PROGRESS_KEY) + useJournalSessions invalidation patch + GoalCard (status-based progress bar) + GoalSheet (create/edit) + GoalDeleteDialog + GoalEmptyState (Target icon-pill) + GoalsPage (Active/Completed/Missed section grouping) + /goals route + Goals sidebar entry (Target icon in COMMAND_NAV) + activate 13 stubs
- [ ] 22-03-PLAN.md — Wave 3: Pre-flight verification (build + tests) + manual smoke-test checkpoint (17 steps verifying ANLY-01..03 in live Tauri app)

### Phase 23: Display Features
**Goal**: The Collection page gains a one-click Battle Ready filter showing only painted and assembled units, and users can enter Showcase Mode — a full-screen chromeless gallery of painted units — ideal for displaying the collection at club nights
**Depends on**: Phase 17
**Requirements**: DISP-01, DISP-02, DISP-03
**Success Criteria** (what must be TRUE):
  1. Collection page has a "Battle Ready" quick-filter button — clicking it filters the list to show only units that are fully painted and assembled, with the filter clearly indicated as active
  2. User can click an "Enter Showcase" button and the app window goes full-screen with app chrome (sidebar, header) hidden — only the painted units gallery is visible
  3. User can exit Showcase Mode by pressing Escape or clicking an exit button — the app returns to normal windowed view with chrome restored
**Plans**: 2 plans

Plans:
- [ ] 23-01-PLAN.md — Wave 1: Battle Ready filter (Zustand battleReady toggle + applyUnitFilters condition + UnitFilters button + CollectionPage wiring + extended tests)
- [ ] 23-02-PLAN.md — Wave 2: Showcase Mode (ShowcaseMode full-screen overlay + CollectionPage entry button + Tauri fullscreen capability + component tests)

### Phase 24: Unit Point Calculator
**Goal**: The Collection page gains a point calculator that lets users manage model-count point tiers, track wargear loadout selections per unit, and preview the points delta when swapping between configurations in the army list builder
**Depends on**: Phase 23
**Requirements**: TIER-01, TIER-02, TIER-03, LOAD-01, LOAD-02, LOAD-03, DELTA-01, COALESCE-01
**Success Criteria** (what must be TRUE):
  1. User can define multiple point tiers per unit (e.g. 5 models = 80pts, 10 models = 160pts) — the calculator auto-matches the active model count to the correct tier
  2. User can create named wargear loadouts per unit with options sourced from the linked datasheet's wargear list, or entered manually for unlinked units
  3. User can mark one loadout as active per unit — the army list builder uses the active loadout for display and point calculation
  4. When exploring loadout or tier changes in the army list builder, a colored delta badge (+N green / -N red) previews the points difference before the user commits the swap
**Plans**: 4 plans

Plans:
- [ ] 24-01-PLAN.md — Wave 0: 3 test stub files (unitPointTierQueries + unitLoadoutQueries + deltaPreview) — 16 it.skip stubs covering TIER-01..03, LOAD-01..03, DELTA-01
- [ ] 24-02-PLAN.md — Wave 1: migration 011 (3 tables) + lib.rs version 11 + types + query modules + hooks + computeDelta utility
- [ ] 24-03-PLAN.md — Wave 2: TierManager + LoadoutSection components + PlaybookTab integration + activate 16 test stubs
- [ ] 24-04-PLAN.md — Wave 3: ArmyListUnitRow delta preview + UnitSheet read-only points + manual smoke test

### Phase 30: Grid Layout Foundation
**Goal**: The dashboard structure is rebuilt as an asymmetric CSS grid bento layout — all existing sections get column spans in a single atomic commit, StatCards navigate to relevant pages when clicked, and the 11-stage pipeline is compressed into 5 readable buckets
**Depends on**: Phase 29
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03
**Success Criteria** (what must be TRUE):
  1. Dashboard displays in a 2-column asymmetric bento grid on a 1280px window — panels sit side-by-side with intentional column weights, not stacked vertically
  2. Resizing the window to 900px causes all dashboard panels to stack into a single column without horizontal overflow
  3. Clicking a StatCard (units, painted, battle-ready, spend) navigates to its corresponding page (Collection, Collection with status filter, Army Lists, Spending)
  4. Dashboard pipeline shows exactly 5 labeled buckets (Not Started / Assembly / Painting / Finishing / Done) each with a model count summed from the underlying 11 painting statuses
**Plans**: TBD

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
**Plans**: TBD

### Phase 32: Army Readiness Card
**Goal**: A dedicated ArmyReadinessCard replaces the existing readiness surface on the dashboard, giving the user a per-faction breakdown of battle-ready points against a target the user selects from a preset list
**Depends on**: Phase 30
**Requirements**: PANEL-04, PANEL-05
**Success Criteria** (what must be TRUE):
  1. Dashboard shows an ArmyReadinessCard with a target selector offering four point thresholds (500 / 1000 / 1500 / 2000 pts) — selecting a threshold immediately updates all faction progress bars
  2. Each faction listed shows a labeled progress bar indicating battle-ready points earned versus the selected target, with owned-vs-ready breakdown visible (e.g. "360 / 1000 pts ready, 1500 pts owned")
  3. ArmyReadinessCard data comes from its own dedicated query hook (not getDashboardStats) — the card loads and refreshes independently without triggering a full dashboard re-fetch
**Plans**: TBD

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
**Plans**: TBD

### Phase 34: Visual Polish
**Goal**: FactionSummaryCards are upgraded to a larger, more expressive format with a dominant accent color band and unambiguous active/focus indicators; the dashboard hero gains premium visual depth through a radial gradient; all card surfaces adopt an elevated/hover depth hierarchy
**Depends on**: Phase 33
**Requirements**: VIS-01, VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. FactionSummaryCards are visually larger than before with a solid faction-accent color band as the dominant visual element — the active/focus faction is unmistakably distinct (not just a small star icon)
  2. The dashboard hero area (title + top stat row) has a visible radial gradient background that adds depth without obscuring any text or controls
  3. All dashboard card surfaces respond to hover with a visible shadow transition — resting state uses the panel-elevated token, hover state uses a deeper shadow — giving the grid a tactile layered feel
**Plans**: TBD

## Progress

**Execution Order:** 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34

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
| 23. Display Features | 1/2 | In Progress|  | — |
| 24. Unit Point Calculator | v2.2 | 0/4 | Not started | — |
| 25. Design Foundation | v2.3 | 2/2 | Complete | 2026-05-04 |
| 26. Dashboard Redesign | v2.3 | 5/5 | Complete | 2026-05-05 |
| 27. Navigation & Quick Add | v2.3 | 4/4 | Complete | 2026-05-05 |
| 28. Collection + Projects | v2.3 | 5/5 | Complete | 2026-05-05 |
| 29. Workshop + Play | v2.3 | 5/5 | Complete | 2026-05-05 |
| 30. Grid Layout Foundation | v2.4 | 0/TBD | Not started | — |
| 31. Focus & Projects Panels | v2.4 | 0/TBD | Not started | — |
| 32. Army Readiness Card | v2.4 | 0/TBD | Not started | — |
| 33. Data Intelligence | v2.4 | 0/TBD | Not started | — |
| 34. Visual Polish | v2.4 | 0/TBD | Not started | — |
