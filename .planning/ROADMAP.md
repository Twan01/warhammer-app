# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2024-05-01)
- ✅ **v2.0 Utility Layer** — Phases 6–9 (shipped 2024-05-03)
- 📋 **v2.1 Visual Command** — Phases 10–16 + 20 (planned)
- 📋 **v2.2 Full Circle** — Phases 17–19 + 21–23 (planned)

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

---

### 📋 v2.1 Visual Command (Phases 10–16 + 20) — Planned

HobbyForge v2.1 transforms the visual identity with faction-aware dynamic theming, a redesigned command-center dashboard, collapsible sidebar, and collection gallery view — plus two new personal tracking features: a per-unit Hobby Journal (photo timeline and session log) and a Spending Tracker.

- [ ] **Phase 10: Theming Foundation** — CSS `@theme` faction-accent utilities, Zustand faction store, FactionThemeProvider, collapsible sidebar with icon-only mode and tooltip polish
- [x] **Phase 11: Dashboard Command Center** — Animated stat counters, faction-accented faction summary cards, hero section redesign (completed 2024-05-03)
- [x] **Phase 12: Collection Gallery View** — Card grid alternate view with painting-status ring, view toggle, filter preservation (completed 2024-05-04)
- [x] **Phase 13: Hobby Journal** — Painting session log (SQL CRUD) and photo timeline (tauri-plugin-fs) per unit (completed 2024-05-04)
- [x] **Phase 14: Spending Tracker** — Cost logging per unit and paint, Spending page with total and per-faction breakdown
 (completed 2024-05-04)
- [x] **Phase 15: Warhammer 40K Datasheet Integration** — Auto-populate Playbook tab stats/abilities/keywords from community data, bundle local SQLite rules database, surface rulebook references in-app (completed 2024-05-04)
- [x] **Phase 16: Design Overhaul** — Significantly improve visual design across all pages — typography, spacing, layouts, empty states, and overall UI polish
 (completed 2024-05-04)
- [ ] **Phase 20: v2.1 Polish & Gap Closure** — Close DS-08 secondary path (DashboardPage conflict dialog), FactionsEmptyState icon pattern, upsertSyncMeta dead export, PaintingProjectsPage DOM query

### 📋 v2.2 Full Circle (Phases 17–19 + 21–23) — Planned

HobbyForge v2.2 closes the full hobby loop — schema enrichment (lore notes, undercoat, purchase dates), a complete Battle Log, analytics layer (velocity, streak, spend chart), Wishlist, Hobby Goals, and Display features (Battle Ready filter, Showcase Mode).

- [x] **Phase 17: Schema Foundation + Enrichment** — Migration 007 (lore_notes + undercoat on units, lore_notes on factions, purchase_date on paints), dates.ts UTC utility, and lore/undercoat fields visible in unit detail sheet
 (completed 2024-05-04)
- [x] **Phase 18: Battle Log** — Battle log CRUD page (battle_logs table already exists in migration 001) with opponent faction, mission, result, army list linkage, notes, and chronological list
 (completed 2024-05-04)
- [x] **Phase 19: Analytics Core** — Recharts/shadcn chart install, hobby velocity and painting streak stats on Dashboard, monthly spend trend chart on Spending page
 (completed 2024-05-04)
- [ ] **Phase 21: Wishlist** — New wishlist_items table (migration 008), full CRUD Wishlist page with name/faction/estimated cost/notes
- [ ] **Phase 22: Hobby Goals** — New hobby_goals table (migration 009), goal CRUD with target unit count and timeframe, progress derived from painting session history
- [ ] **Phase 23: Display Features** — Battle Ready quick-filter on Collection page, Showcase Mode full-screen gallery using Tauri window API

## Phase Details

### Phase 10: Theming Foundation
**Goal**: Every page in the app reflects the active faction's accent color — buttons, badges, status rings, and highlights shift the moment the user selects a faction — and the sidebar can collapse to icon-only mode to give content more horizontal space
**Depends on**: Phase 9
**Requirements**: THEME-01, THEME-02, THEME-03, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. User can select an active faction from the Dashboard and all accent-colored elements (buttons, badges, status rings, highlights) immediately shift to that faction's theme color across every page
  2. Active faction and accent color persist after closing and reopening the app — the same faction and color are applied on next launch without any user action
  3. User can click a collapse toggle on the sidebar and it shrinks to icon-only mode; clicking again restores full labels — collapsed/expanded state survives an app restart
  4. Each icon in collapsed sidebar mode shows a tooltip with the nav label on hover — no nav destination is ambiguous in icon-only mode
**Plans**: TBD

### Phase 11: Dashboard Command Center
**Goal**: The Dashboard hero section communicates the hobby collection's health at a glance with animated counters and faction-accented summary cards driven by the active theme
**Depends on**: Phase 10
**Requirements**: UI-07, UI-08
**Success Criteria** (what must be TRUE):
  1. Dashboard hero section displays animated stat counters for total units, painted count, and battle-ready percentage — counters animate from zero on first render
  2. Faction summary cards on the Dashboard display with accent color borders or badges drawn from the active faction theme — the color matches the faction selected in Phase 10
  3. Dashboard loads without layout shift or visible flicker when navigating from another page
**Plans**: 4 plans

Plans:
- [x] 11-00-PLAN.md — Wave 0: tests/dashboard/useCountUp.test.ts stub (3 it.skip blocks for UI-07 hook unit tests)
- [x] 11-01-PLAN.md — useCountUp hook (rAF cubic ease-out, 600ms, integer-only, prefers-reduced-motion gate) + flip 3 stubs to passing tests
- [x] 11-02-PLAN.md — StatCard animate prop + AnimatedNumber sub-component, wire 4 hero StatCards in DashboardPage, add UI-07 component test + UI-08 ring class test
- [x] 11-03-PLAN.md — Manual smoke-test checkpoint (UI-07 visual animation + UI-08 faction ring color in live Tauri app)

### Phase 12: Collection Gallery View
**Goal**: Users can view their collection as a visual card grid — showing painting-status rings and faction badges per unit — and toggle back to the existing table view without losing any active filters
**Depends on**: Phase 10
**Requirements**: UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Collection page shows a view toggle (table / gallery) — clicking Gallery switches the list to a card grid without navigating away
  2. Each gallery card displays the unit name, faction badge, a circular painting-status ring showing painted percentage, and the numeric painted percentage
  3. Switching between gallery and table view preserves all active filters (search text, faction, status, category) — no filter resets on toggle
**Plans**: 4 plans

Plans:
- [ ] 12-00-PLAN.md — Wave 0: tests/collection/PaintingRing.test.tsx (3 stubs) + tests/collection/UnitGallery.test.tsx (6 stubs) for UI-04/UI-05/UI-06
- [ ] 12-01-PLAN.md — useCollectionViewMode localStorage hook + PaintingRing SVG component + flip 3 PaintingRing test stubs (UI-04 hook foundation, UI-05 ring component)
- [ ] 12-02-PLAN.md — UnitGallery card grid component + CollectionPage view-toggle and conditional render wiring + flip 6 UnitGallery test stubs (UI-04, UI-05, UI-06)
- [ ] 12-03-PLAN.md — Manual smoke-test checkpoint (UI-04 toggle + persistence, UI-05 cards + responsive grid + keyboard, UI-06 filter preservation in live Tauri app)

### Phase 13: Hobby Journal
**Goal**: Users can log painting sessions with time and notes per unit, and attach progress photos with stage labels — building a chronological record of each unit's hobby journey
**Depends on**: Phase 10
**Requirements**: JOUR-01, JOUR-02, JOUR-03, JOUR-04, JOUR-05, JOUR-06
**Success Criteria** (what must be TRUE):
  1. User can log a painting session for any unit from the unit detail sheet — entering date, duration in minutes, and optional notes — and the session appears in a list sorted newest first
  2. User can delete a painting session entry and it is removed from the list immediately with optimistic rollback on failure
  3. User can attach a photo to a unit by selecting a file, assigning a stage label (e.g. "Primed", "Base coat", "Finished"), and optionally entering a caption — the photo is saved to disk and the thumbnail appears in the unit's photo timeline
  4. User can view the photo timeline for any unit as a chronological gallery of thumbnails with stage labels and captions
  5. Deleting a unit also removes its associated photo files from disk — no orphaned files remain after unit deletion
**Plans**: 6 plans

Plans:
- [ ] 13-00-PLAN.md — Wave 0: 5 stub test files for JOUR-01..06 (paintingSessionQueries, useJournalSessions, unitPhotoQueries, JournalTab, migration005) — 12 it.skip stubs total
- [ ] 13-01-PLAN.md — Tauri infrastructure: install tauri-plugin-fs + tauri-plugin-dialog (Cargo + npm), register in lib.rs, grant capabilities, enable assetProtocol, write migration 005 SQL, create paintingSession + unitPhoto types
- [ ] 13-02-PLAN.md — Query modules (paintingSessions.ts, unitPhotos.ts) + TanStack Query hooks (useJournalSessions, useUnitPhotos with appDataDir caching) + flip 11 stub tests to active
- [ ] 13-03-PLAN.md — JournalTab.tsx component (Sessions log form + list, Photos attach form + 3-col thumbnail grid, hover delete, click → onPhotoClick callback) + flip JournalTab render tests
- [ ] 13-04-PLAN.md — Wire Journal tab into UnitDetailSheet, mount sibling lightbox Dialog in CollectionPage (NOT nested), add JOUR-06 silent disk cleanup to UnitDeleteDialog.handleConfirm
- [ ] 13-05-PLAN.md — Manual smoke-test checkpoint (10 steps in live Tauri app: JOUR-01..06 verified including asset protocol + on-disk file remove)

### Phase 14: Spending Tracker
**Goal**: Users can record what they spent on units and paints and see a consolidated Spending page showing total hobby spend broken down by faction
**Depends on**: Phase 10
**Requirements**: SPEND-01, SPEND-02, SPEND-03, SPEND-04, SPEND-05
**Success Criteria** (what must be TRUE):
  1. User can enter a purchase price and date for any unit from the unit detail sheet — the value saves and displays as formatted currency (e.g. £12.50)
  2. User can enter a purchase price for any paint pot from the paint detail sheet — the value saves and displays as formatted currency
  3. User can navigate to the Spending page and see a total hobby spend figure combining unit and paint purchases
  4. Spending page breaks total spend into a per-faction table or card list — each faction shows its own subtotal
  5. All spend values round-trip correctly as integer pence in SQLite and are always displayed in formatted currency throughout the UI — no floating-point display errors
**Plans**: 5 plans

Plans:
- [ ] 14-00-PLAN.md — Wave 0: 7 stub test files (formatCurrency, computeSpendingStats, migration005, useSpendingStats, SpendingPage, unitSchema, paintSchema) — 32 it.skip stubs total covering all 5 SPEND requirements
- [ ] 14-01-PLAN.md — Migration 005 (purchase_price_pence INTEGER on units + paints) + lib.rs version 5 + formatCurrency utility + Unit/Paint type updates + units.ts/paints.ts query updates with Pitfall 1 unconditional UPDATE assignment + flip 9 test stubs
- [ ] 14-02-PLAN.md — unitSchema/paintSchema purchase_price_pence field + UnitSheet/PaintSheet form fields + UnitDetailSheet read-only formatCurrency display + 6 mutation hooks invalidate ['spending-stats'] (Pitfall 2) + flip 10 schema test stubs
- [ ] 14-03-PLAN.md — spending.ts query + computeSpendingStats pure function + useSpendingStats hook (with SPENDING_STATS_KEY contract) + SpendingPage component + /spending route + Wallet sidebar nav entry + extend AppSidebar test + flip 13 stubs
- [ ] 14-04-PLAN.md — Manual smoke-test checkpoint (7 steps: migration applies, unit price round-trip, Pitfall 1 clear-to-NULL, paint price round-trip, Spending page + nav + cache invalidation, owned-only Paints filter, Skeleton loading state)

### Phase 15: Warhammer 40K Datasheet Integration
**Goal**: Auto-populate the Playbook tab (M/T/Sv/W/Ld/OC stats + abilities + keywords) from community-maintained Wahapedia 40K datasheets bundled as a user-synced local SQLite rules database, with a single review dialog for field-level conflicts and a structured Datasheet Abilities collapsible (Core / Faction / Unit sub-groups) plus a Sources publication list inside PlaybookTab
**Depends on**: Phase 14
**Requirements**: DS-01, DS-02, DS-03, DS-04, DS-05, DS-06, DS-07, DS-08, DS-09, DS-10, DS-11, DS-12 (12 derived requirements — see CONTEXT.md decisions)
**Plans**: 7 plans

Plans:
- [ ] 15-00-PLAN.md — Wave 0: 7 stub test files (csvParse, stripHtml, migration, datasheetQueries, useDatasheet, DatasheetPicker, DatasheetImportDialog) — 19 it.skip stubs total covering DS-01..DS-09
- [ ] 15-01-PLAN.md — Wave 1: Tauri infrastructure (tauri-plugin-http install + register, capability scope to wahapedia.ru, rules_001_schema.sql with 7 rw_* tables, hobbyforge migration 007 datasheet_link, lib.rs dual-DB chaining, tauri.conf.json preload, shadcn collapsible install, src/types/datasheet.ts contracts) + flip migration test stub
- [ ] 15-02-PLAN.md — Wave 1: Pure utilities (src/lib/parseWahapediaCsv.ts pipe-delim parser + src/lib/stripHtml.ts tag/entity decoder) + flip 6 stubs
- [ ] 15-03-PLAN.md — Wave 2: rules-client.ts singleton + datasheets.ts query module (6 fns spanning rules.db + hobbyforge.db link write) + useDatasheet.ts hooks (3 read hooks with staleTime: Infinity) + flip 7 stubs
- [ ] 15-04-PLAN.md — Wave 3: useRulesSync mutation hook (7-CSV parallel fetch + transactional bulk insert + invalidation broadcast) + DatasheetPicker.tsx (faction-pre-filtered Dialog with autoFocus search) + DatasheetImportDialog.tsx (per-field Keep/Use toggle, default "use") + flip last 4 stubs
- [ ] 15-05-PLAN.md — Wave 4: PlaybookTab integration (sync banner, Last-synced label, Import/Re-import button, Datasheet Abilities collapsible with Core/Faction/Unit sub-groups, Sources list, Personal Ability Notes label rename, multi-profile note, auto-picker on first mount) + CollectionPage sibling-portal mount of DatasheetImportDialog + UnitDetailSheet conflict-prop wiring + 6 new PlaybookTab tests
- [x] 15-06-PLAN.md — Manual smoke-test checkpoint (13 steps in live Tauri app: DS-01..DS-12 verified including live network sync to wahapedia.ru + asset persistence across restart)

### Phase 16: Design Overhaul
**Goal**: Significantly improve the visual design across all 7 pages and shared components — Linear-inspired polished tooling aesthetic via Geist Variable font, upgraded text-3xl page headings with subtitles + hairline border, sidebar wordmark + section grouping (Manage / Inventory / Tracking), refined empty states with page-specific lucide icons in muted-pill containers, tabular-nums on every numeric display, subtle card elevation (shadow-sm + border-border/60), and a Dashboard first-run welcome screen
**Depends on**: Phase 14 (per STATE.md "Phase 16 added: Design Overhaul ... depends on Phase 14"; Phase 15 is parallel and not a blocker for the visual overhaul)
**Requirements**: No formal requirement IDs — completion criterion is "every page reviewed and polished systematically; done when all pages pass a visual review" per CONTEXT.md
**Plans**: 8 plans

Plans:
- [ ] 16-01-PLAN.md — Wave 1: install @fontsource-variable/geist + integrate --font-sans into globals.css @theme inline + body font-family
- [ ] 16-02-PLAN.md — Wave 2: AppSidebar wordmark (Sword icon + HobbyForge text-base) + three section groups (Manage / Inventory / Tracking) + NavItem gap-2→gap-4, py-1.5→py-2, font-medium→font-semibold
- [ ] 16-03-PLAN.md — Wave 2: Dashboard + Collection cluster — page headers, StatCard tabular-nums + shadow-sm (no hover), UnitGallery card hover:shadow-md elevation + tabular-nums, UnitDetailSheet currency tabular-nums
- [ ] 16-04-PLAN.md — Wave 2: Painting Projects + Paints + Recipes page headers + PlaybookTab stat block tabular-nums (M/T/Sv/W/Ld/OC)
- [ ] 16-05-PLAN.md — Wave 2: Army Lists + Spending — page headers, ArmyListCard hover-shadow elevation + tabular-nums, SpendingPage h1 inserted INSIDE max-w-3xl wrapper (Pitfall 1), Breakdown h2 downgraded to text-base, currency tabular-nums, inline Spending empty state with Receipt icon
- [ ] 16-06-PLAN.md — Wave 2: Empty states A — DashboardEmptyState welcome-screen full replacement (Sword + HobbyForge wordmark + CTA), CollectionEmptyState two modes (ShieldOff no-data + FilterX filtered), KanbanEmptyState (Layers), PaintsEmptyState (Palette)
- [ ] 16-07-PLAN.md — Wave 2: Empty states B — ArmyListsEmptyState (Swords plural), RecipeEmptyState (BookOpen + British "colour" helper text)
- [ ] 16-08-PLAN.md — Wave 3: Manual visual review checkpoint (24 steps across all 7 pages + shared components in live Tauri app) + final SUMMARY

### Phase 24: Collection unit point calculator with wargear selection and swap delta preview

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 24
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 25 to break down)

---

### 📋 v2.2 Full Circle (Phases 17–19 + 21–23) — Planned

**Milestone Goal:** Close the full hobby loop — from owning and painting to playing and logging — with analytics, personal showcase, and narrative enrichment features that make HobbyForge the definitive single-player hobby OS.

- [x] **Phase 17: Schema Foundation + Enrichment** — Migration 007 (lore_notes + undercoat on units, lore_notes on factions, purchase_date on paints), dates.ts UTC utility, and lore/undercoat fields visible in unit detail sheet
 (completed 2024-05-04)
- [x] **Phase 18: Battle Log** — Battle log CRUD page (battle_logs table already exists in migration 001) with opponent faction, mission, result, army list linkage, notes, and chronological list
 (completed 2024-05-04)
- [x] **Phase 19: Analytics Core** — Recharts/shadcn chart install, hobby velocity and painting streak stats on Dashboard, monthly spend trend chart on Spending page
 (completed 2024-05-04)
- [ ] **Phase 21: Wishlist** — New wishlist_items table (migration 008), full CRUD Wishlist page with name/faction/estimated cost/notes
- [ ] **Phase 22: Hobby Goals** — New hobby_goals table (migration 009), goal CRUD with target unit count and timeframe, progress derived from painting session history
- [ ] **Phase 23: Display Features** — Battle Ready quick-filter on Collection page, Showcase Mode full-screen gallery using Tauri window API

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
- [ ] 17-00-PLAN.md — Migration 008 (4 ALTER TABLE columns) + lib.rs version 8 + types/queries/forms extensions + UnitDetailSheet display rows + src/lib/dates.ts utility + JournalTab UTC bug fix + manual smoke-test checkpoint (16 tasks across 5 waves)

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
- [ ] 18-00-PLAN.md — Wave 0: 2 stub test files (battleLogQueries.test.ts + computeBattleLogSummary.test.ts) — 14 it.skip stubs covering BATTLE-01..05
- [ ] 18-01-PLAN.md — Wave 1: types/battleLog.ts + db/queries/battleLogs.ts (full-replacement UPDATE for FK clearing — Pitfall 5) + computeBattleLogSummary pure function + useBattleLogs hooks + battleLogSchema (zod) + flip 14 stubs
- [ ] 18-02-PLAN.md — Wave 2: BattleLogPage (sibling-portal) + Row (compact 2-line + Collapsible expand + group-hover Edit/Delete) + Sheet (4 grouped sections) + DeleteDialog + SummaryBar + EmptyState + resultBadge map + /battle-log route + Battle Log sidebar entry (Swords icon in TRACKING_NAV)
- [ ] 18-03-PLAN.md — Wave 3: Manual smoke-test checkpoint (11 steps verifying BATTLE-01..05 in live Tauri app including Pitfall 5 FK clear + deleted-army-list fallback + persistence across restart)

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
- [ ] 19-00-PLAN.md - Wave 0: 3 stub test files (computeHobbyAnalytics + analyticsQueries + useHobbyAnalytics) - 29 it.skip stubs covering ANLY-04..07 + Pitfalls 2/5/6
- [ ] 19-01-PLAN.md - Wave 1: shadcn add chart + react-is ^19 pnpm override + analytics.ts query module (UNION units+paints with NULL purchase_date excluded for ANLY-07) + computeHobbyAnalytics pure function (Pitfall 2 floor + Pitfall 5 dates.ts + Pitfall 6 year-suffix labels) + useHobbyAnalytics hook with HOBBY_ANALYTICS_KEY = ['hobby-analytics'] + flip 29 stubs
- [ ] 19-02-PLAN.md - Wave 2: SpendTrendChart component (Recharts BarChart in shadcn ChartContainer, formatCurrency Y-axis + tooltip, var(--color-pence) bar fill, zero-state muted note) + DashboardPage HOBBY HEALTH section between PROGRESS and BY FACTION + SpendingPage Monthly Trend section between hero card and Breakdown + invalidation patches on useJournalSessions/useUnits/usePaints (8 mutations now invalidate hobby-analytics)
- [ ] 19-03-PLAN.md - Wave 3: Manual smoke-test checkpoint (12 steps: HOBBY HEALTH section, velocity/streak fallbacks, session-log reactivity, chart rendering, faction-color stability, NULL purchase_date exclusion for both units AND paints, year-boundary labels, chart-skeleton independence)

### Phase 20: v2.1 Polish & Gap Closure
**Goal**: Close the one integration gap found in the v2.1 milestone audit (DS-08 secondary path) and eliminate accumulated tech debt — DashboardPage conflict dialog wiring, FactionsEmptyState icon pattern, dead upsertSyncMeta export, PaintingProjectsPage DOM query CTA
**Depends on**: Phase 19
**Milestone**: v2.1 (gap closure)
**Requirements**: DS-08 (secondary path), no new formal requirements
**Gap Closure**: Closes DS-08-dashboard from v2.1-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. Opening any unit from the Dashboard's active-projects or recently-updated lists and triggering a Re-import with stat conflicts shows the DatasheetImportDialog (same UX as from CollectionPage)
  2. FactionsEmptyState uses the icon-pill pattern (rounded-xl bg-muted/40 p-4) matching all other empty states
  3. PaintingProjectsPage empty-state CTA works without a fragile DOM querySelector — uses useState instead
  4. upsertSyncMeta dead export removed from datasheets.ts; Rust command remains the sole sync-meta write path
**Plans**: 3 plans

Plans:
- [ ] 20-01-PLAN.md — Wave 1: FactionsEmptyState icon-pill (Shield) + remove upsertSyncMeta dead export from datasheets.ts (2 tasks, autonomous)
- [ ] 20-02-PLAN.md — Wave 1: AddProjectPicker controlled-props with internal fallback + PaintingProjectsPage pickerOpen state (querySelector removed) + KanbanEmptyState button text "Add Project" (2 tasks, autonomous)
- [ ] 20-03-PLAN.md — Wave 1: DS-08 secondary path — DashboardPage conflict state + 3 props on populated UnitDetailSheet (line 340 only) + DatasheetImportDialog sibling mount (1 task, autonomous)

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

## Progress

**Execution Order:** 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23

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
| 10. Theming Foundation | v2.1 | 3/4 | In Progress | — |
| 11. Dashboard Command Center | v2.1 | 4/4 | Complete | 2024-05-03 |
| 12. Collection Gallery View | v2.1 | 4/4 | Complete | 2024-05-04 |
| 13. Hobby Journal | v2.1 | 6/6 | Complete | 2024-05-04 |
| 14. Spending Tracker | 5/5 | Complete    | 2024-05-04 | — |
| 15. 40K Datasheet Integration | v2.1 | Complete    | 2024-05-04 | 2024-05-04 |
| 16. Design Overhaul | 8/8 | Complete    | 2024-05-04 | — |
| 17. Schema Foundation + Enrichment | 1/1 | Complete    | 2024-05-04 | — |
| 18. Battle Log | 4/4 | Complete    | 2024-05-04 | — |
| 19. Analytics Core | v2.2 | 4/4 | Complete | 2024-05-04 |
| 20. v2.1 Polish & Gap Closure | 2/3 | In Progress|  | — |
| 21. Wishlist | v2.2 | 0/TBD | Not started | — |
| 22. Hobby Goals | v2.2 | 0/TBD | Not started | — |
| 23. Display Features | v2.2 | 0/TBD | Not started | — |
