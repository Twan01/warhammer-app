# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2024-05-01)
- ✅ **v2.0 Utility Layer** — Phases 6–9 (shipped 2024-05-03)
- ✅ **v2.1 Visual Command** — Phases 10–16 + 20 (shipped 2026-05-04)
- 🚧 **v2.2 Full Circle** — Phases 17–19 + 21–23 (in progress)
- 🆕 **v2.3 Hobby Command Center** — Phases 25–29 (planned)

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

### 🚧 v2.2 Full Circle (Phases 17–19 + 21–23) — In Progress

**Milestone Goal:** Close the full hobby loop — from owning and painting to playing and logging — with analytics, personal showcase, and narrative enrichment features that make HobbyForge the definitive single-player hobby OS.

- [x] **Phase 17: Schema Foundation + Enrichment** — Migration 007 (lore_notes + undercoat on units, lore_notes on factions, purchase_date on paints), dates.ts UTC utility, and lore/undercoat fields visible in unit detail sheet (completed 2026-05-04)
- [x] **Phase 18: Battle Log** — Battle log CRUD page with opponent faction, mission, result, army list linkage, notes, and chronological list (completed 2026-05-04)
- [x] **Phase 19: Analytics Core** — Recharts/shadcn chart install, hobby velocity and painting streak stats on Dashboard, monthly spend trend chart on Spending page (completed 2026-05-04)
- [ ] **Phase 21: Wishlist** — New wishlist_items table (migration 008), full CRUD Wishlist page with name/faction/estimated cost/notes
- [ ] **Phase 22: Hobby Goals** — New hobby_goals table (migration 009), goal CRUD with target unit count and timeframe, progress derived from painting session history
- [ ] **Phase 23: Display Features** — Battle Ready quick-filter on Collection page, Showcase Mode full-screen gallery using Tauri window API

---

### 🆕 v2.3 Hobby Command Center (Phases 25–29) — Planned

**Milestone Goal:** Transform HobbyForge from a functional tracking dashboard into a premium, hobby-native command center — with a unified design system, an action-oriented dashboard, global Quick Add, and visual upgrades across every page.

- [x] **Phase 25: Design Foundation** — Design tokens (Forge Black, Gunmetal, Panel Elevated, Battle Gold) as CSS variables, shared PageHeader component, enriched MetricCard, StatusBadge component (completed 2026-05-04)
- [x] **Phase 26: Dashboard Redesign** — "Hobby Command Center" header with Quick Add + Log Session, CurrentFocusCard, HobbyPipeline strip, upgraded FactionArmyCards, Recent Activity feed (completed 2026-05-05)
- [x] **Phase 27: Navigation & Quick Add** — Hobby-native sidebar group names (Command/Workshop/Play/Management), Quick Add dropdown with 8 actions, Sheet-overlay flows from any page (completed 2026-05-05)
- [x] **Phase 28: Collection + Projects** — Gallery card photo thumbnails, unified StatusBadge in table and gallery, enriched kanban cards (last updated, recipe link, photo count, next-action hint, Log Session shortcut) (completed 2026-05-05)
- [ ] **Phase 29: Workshop + Play** — Paint color swatches, recipe paint swatch strip, Army List readiness panel, Battle Log army context display

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
**Plans**: TBD

### Phase 22: Hobby Goals
**Goal**: Users can set monthly or quarterly painting targets — a unit count to complete by end of the period — and see live progress toward each goal calculated automatically from their journal session history
**Depends on**: Phase 17
**Requirements**: ANLY-01, ANLY-02, ANLY-03
**Success Criteria** (what must be TRUE):
  1. User can create a painting goal by specifying a target unit count and a timeframe (this month / this quarter) — the goal saves and appears on the Goals page
  2. Each goal shows a progress bar — the filled portion reflects the count of distinct units that have at least one painting session logged during the goal's timeframe, updated automatically as sessions are added
  3. User can view all active and completed goals on the Goals page — completed goals (progress >= target) are visually distinguished from active ones
**Plans**: TBD

### Phase 23: Display Features
**Goal**: The Collection page gains a one-click Battle Ready filter showing only painted and assembled units, and users can enter Showcase Mode — a full-screen chromeless gallery of painted units — ideal for displaying the collection at club nights
**Depends on**: Phase 17
**Requirements**: DISP-01, DISP-02, DISP-03
**Success Criteria** (what must be TRUE):
  1. Collection page has a "Battle Ready" quick-filter button — clicking it filters the list to show only units that are fully painted and assembled, with the filter clearly indicated as active
  2. User can click an "Enter Showcase" button and the app window goes full-screen with app chrome (sidebar, header) hidden — only the painted units gallery is visible
  3. User can exit Showcase Mode by pressing Escape or clicking an exit button — the app returns to normal windowed view with chrome restored
**Plans**: TBD

### Phase 24: Collection unit point calculator with wargear selection and swap delta preview

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 23
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 24 to break down)

### Phase 25: Design Foundation
**Goal**: The app gains a consistent visual language — defined design tokens, a reusable PageHeader, enriched MetricCards, and a unified StatusBadge — that every subsequent v2.3 phase builds on
**Depends on**: Phase 24
**Requirements**: DSFD-01, DSFD-02, DSFD-03, DSFD-04
**Success Criteria** (what must be TRUE):
  1. User sees consistent surface colors (Forge Black headers, Gunmetal panels, Panel Elevated cards, Battle Gold accents) across all pages — no remaining off-token grays or hardcoded hex values
  2. User sees a consistent page header with title, subtitle, and action button slot on every main page — all pages use the shared PageHeader component
  3. User sees enriched MetricCards on the Dashboard showing an icon, numeric value, label, and optional progress bar — not a plain number-on-card
  4. User sees painting status represented by a colored StatusBadge (e.g. teal "Base Coated", gold "Battle Ready") in every location status is displayed — collection table, gallery cards, kanban cards, army lists
**Plans**: TBD

### Phase 26: Dashboard Redesign
**Goal**: The Dashboard becomes a true command center — the header names the space, action buttons are immediately available, the CurrentFocusCard surfaces the active project, HobbyPipeline visualizes the full painting funnel, and a Recent Activity feed closes the loop on what happened recently
**Depends on**: Phase 25
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. Dashboard header reads "Hobby Command Center" with a dynamic subtitle showing active project count, tracked model count, and battle-ready points — the subtitle updates as data changes
  2. User can click Quick Add or Log Session buttons in the dashboard header and the corresponding Sheet opens as an overlay — no navigation away from the dashboard
  3. Dashboard shows a CurrentFocusCard as the prominent primary panel — it displays the most recently active project's name, painting stages, progress, and a next-action suggestion
  4. Dashboard shows a HobbyPipeline strip with unit counts at each stage from Owned through to Battle Ready — replacing the isolated percentage stat cards with a single visual funnel
  5. Faction summary cards show painting progress percentage and battle-ready point count alongside unit count — all three values visible on each faction card
  6. Dashboard shows a Recent Activity feed listing the last N events (units added/updated, sessions logged, battles recorded) derived from existing table data — no new database tables required
**Plans**: 5 plans

Plans:
- [ ] 26-00-PLAN.md — Wave 0: 3 test stub files (computeRecentActivity + recentActivityQuery + computeStats units field) — 21 it.skip stubs covering DASH-04 + DASH-06
- [ ] 26-01-PLAN.md — Wave 1: Data layer — add units field to ComputedDashboardStats + computeRecentActivity pure fn + getNextActionHint + getRecentActivity SQL + useRecentActivity hook + invalidation wiring on 4 mutations + flip 21 stubs
- [ ] 26-02-PLAN.md — Wave 2: New components — CurrentFocusCard + HobbyPipeline + RecentActivityFeed + LogSessionSheet (with Zod schema, no .default() per Pitfall 8)
- [ ] 26-03-PLAN.md — Wave 3: DashboardPage rewrite (PageHeader actions, CurrentFocusCard, HobbyPipeline, RecentActivityFeed, sibling LogSessionSheet/Quick Add UnitSheet) + FactionSummaryCard upgrade for DASH-05 + delete dead DashboardListRow + statusAbbr
- [ ] 26-04-PLAN.md — Wave 4: Manual smoke-test checkpoint (12 steps verifying DASH-01..06 in live Tauri app including Pitfalls 1, 2, 3, 6, 7)

### Phase 27: Navigation & Quick Add
**Goal**: The sidebar navigation uses hobby-native group labels, and a Quick Add button lets the user create any entity type without leaving their current page
**Depends on**: Phase 25
**Requirements**: NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. Sidebar navigation groups are labeled Command, Workshop, Play, and Management — no generic labels like "Tracking" or "Inventory" remain
  2. A Quick Add button appears in the sidebar and opens a dropdown menu with 8 labeled creation actions: Add Unit, Add Faction, Add Paint, Add Recipe, Create Project, Log Session, Add Purchase, Log Battle
  3. Clicking any Quick Add action opens the corresponding create Sheet as an overlay on the current page — the user's current route does not change and no navigation occurs
**Plans**: 4 plans

Plans:
- [ ] 27-00-PLAN.md — Wave 0: 3 test stub files (AppSidebar.nav01 + QuickAdd.nav02 + QuickAddContext) — 28 it.skip stubs covering NAV-01..03
- [ ] 27-01-PLAN.md — Wave 1: QuickAddContext provider + DropdownMenu install + main.tsx provider wire + flip 6 context tests
- [ ] 27-02-PLAN.md — Wave 2: AppSidebar group rename (COMMAND/WORKSHOP/PLAY/MANAGEMENT) + Quick Add button + AppLayout 8-Sheet mount + flip 22 tests
- [ ] 27-03-PLAN.md — Wave 3: Manual smoke-test checkpoint (19 steps verifying NAV-01..03 in live Tauri app)

### Phase 28: Collection + Projects
**Goal**: Gallery cards show real photo thumbnails for painted units, painting status uses the unified StatusBadge everywhere, and kanban cards are enriched with the context needed to take action without opening a detail sheet
**Depends on**: Phase 25
**Requirements**: COLL-01, COLL-02, PROJ-01, PROJ-02, PROJ-03
**Success Criteria** (what must be TRUE):
  1. Collection gallery cards show the unit's most recent journal photo as a thumbnail when one exists — units with no photos show a faction-colored placeholder instead of a blank area
  2. Painting status in the collection table rows and gallery cards is displayed using the unified StatusBadge — consistent color and format everywhere
  3. Kanban cards show last-updated date, linked recipe name (if set), and journal photo count for the unit — all three are visible on the card face without opening a detail sheet
  4. Each kanban card shows a next-action hint derived from the unit's current painting stage (e.g. "Ready to prime", "Start base coating") — the hint is visually distinct from the card title
  5. User can click a Log Session shortcut on any kanban card and the Log Session Sheet opens for that unit — no navigation to the unit's detail sheet required
**Plans**: 5 plans

Plans:
- [ ] 28-00-PLAN.md — Wave 0: 5 test stub files (unitPhotoLatest + useLatestUnitPhotos + kanbanEnrichment + useKanbanEnrichment + logSessionSheet) — 26 it.skip stubs covering COLL-01, PROJ-01, PROJ-03
- [ ] 28-01-PLAN.md — Wave 1: Data layer — getLatestPhotoByUnit + getPhotoCountsByUnitIds + getRecipeNamesByUnitIds + useLatestUnitPhotos hook + useKanbanEnrichment hook + LogSessionSheet defaultUnitId prop + invalidation wiring + flip 26 stubs
- [ ] 28-02-PLAN.md — Wave 2: Collection UI — UnitGallery photo hero + StatusBadge + remove PaintingRing + StatusPopover trigger swap + CollectionPage useLatestUnitPhotos wiring
- [ ] 28-03-PLAN.md — Wave 2: Kanban UI — KanbanCard metadata row + next-action hint + Log Session button + KanbanColumn/Board/Page prop threading + LogSessionSheet sibling portal
- [ ] 28-04-PLAN.md — Wave 3: Manual smoke-test checkpoint (19 steps verifying COLL-01, COLL-02, PROJ-01, PROJ-02, PROJ-03 in live Tauri app)

### Phase 29: Workshop + Play
**Goal**: Paint and recipe cards become visually informative with color swatches, and the Play layer gains data-driven readiness panels that answer "what's actually battle-ready?" at a glance
**Depends on**: Phase 25
**Requirements**: WKSP-01, WKSP-02, PLAY-01, PLAY-02
**Success Criteria** (what must be TRUE):
  1. Paint list entries display a color swatch square using the paint's stored color value — every paint entry has a consistent swatch regardless of whether a hex code or named color is stored
  2. Recipe cards show a compact horizontal swatch strip of all linked paints — each paint in the recipe is represented by a swatch, making the palette visible at a glance
  3. Army List detail sheet shows a readiness panel with battle-ready points, total points, readiness percentage, and a list of which units are not yet battle-ready — the panel updates immediately when unit painting status changes
  4. Battle Log entries display the linked army list's name and its current battle-ready point count — the point count shown is the live value computed from painting status, not a snapshot
**Plans**: 5 plans

Plans:
- [ ] 29-00-PLAN.md — Wave 0: 4 test stub files (paintRowSwatch + recipeSwatchData + armyListReadinessPanel + armyListReadiness) — 28 it.skip stubs covering WKSP-01, WKSP-02, PLAY-01, PLAY-02
- [ ] 29-01-PLAN.md — Wave 1: Data layer — getRecipeSwatchColors batch query + useRecipeSwatchData hook + getArmyListReadiness batch query + useArmyListReadiness hook + 4 mutation invalidation patches + flip 11 stubs
- [ ] 29-02-PLAN.md — Wave 2: Workshop UI — WKSP-01 swatch verification + RecipeTable "Palette" column with overlapping swatch strip + flip 11 WKSP stubs
- [ ] 29-03-PLAN.md — Wave 2: Play UI — ArmyListSummaryBar readiness panel (progress bar + not-ready list + gold 100% state) + BattleLogRow live readiness points + BattleLogPage useArmyListReadiness wiring + flip 17 PLAY stubs
- [ ] 29-04-PLAN.md — Wave 3: Manual smoke-test checkpoint (21 steps verifying WKSP-01, WKSP-02, PLAY-01, PLAY-02 in live Tauri app)

## Progress

**Execution Order:** 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 25 → 26 → 27 → 28 → 29

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
| 21. Wishlist | v2.2 | 0/TBD | Not started | — |
| 22. Hobby Goals | v2.2 | 0/TBD | Not started | — |
| 23. Display Features | v2.2 | 0/TBD | Not started | — |
| 25. Design Foundation | 2/2 | Complete    | 2026-05-04 | — |
| 26. Dashboard Redesign | 4/5 | Complete    | 2026-05-05 | — |
| 27. Navigation & Quick Add | 4/4 | Complete    | 2026-05-05 | — |
| 28. Collection + Projects | 5/5 | Complete    | 2026-05-05 | — |
| 29. Workshop + Play | 4/5 | In Progress|  | — |
