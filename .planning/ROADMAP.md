# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2026-05-01)
- ✅ **v2.0 Utility Layer** — Phases 6–9 (shipped 2026-05-03)
- 📋 **v2.1 Visual Command** — Phases 10–16 (planned)

## Phases

<details>
<summary>✅ v1.1 HobbyForge MVP (Phases 1–5) — SHIPPED 2026-05-01</summary>

- [x] Phase 1: App Shell — Tauri + React desktop app launches with sidebar, routing, SQLite plumbing, dark mode, and all shadcn components installed (completed 2026-04-30)
- [x] Phase 2: Data Layer + Entity CRUD — Full 10-table schema, FK enforcement, seed data, and CRUD for factions / units / paints (completed 2026-04-30)
- [x] Phase 3: Collection Module — Searchable, filterable unit table with detail drawer, inline status updates, progress bars, and full create/edit/delete UX including all cross-cutting polish patterns (completed 2026-05-01)
- [x] Phase 4: Painting Module — Active painting projects Kanban (status columns, card actions, mark active) plus full recipe CRUD with paint linkage and owned/missing paint indicator (completed 2026-05-01)
- [x] Phase 5: Dashboard — Full dashboard with global stat cards, faction summary cards, painting/assembly/basing percentages, active projects list, and recently updated units (completed 2026-05-01)

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Utility Layer (Phases 6–9) — SHIPPED 2026-05-03</summary>

- [x] **Phase 6: Foundation** — Schema migration 004, TypeScript types for all v2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules, and cross-invalidation patch to usePaints.ts (completed 2026-05-01)
- [x] **Phase 7: Paint Inventory** — PaintInventoryPage with brand/type/color-family filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge, inline owned toggle, sidebar nav and route (completed 2026-05-02)
- [x] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sidebar nav and route (completed 2026-05-03)
- [x] **Phase 9: Unit Playbook** — PlaybookTab (stats block grid + abilities/keywords + strategy notes + inline save), UnitDetailSheet wrapped in shadcn Tabs (completed 2026-05-02)

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

---

### 📋 v2.1 Visual Command (Phases 10–16) — Planned

HobbyForge v2.1 transforms the visual identity with faction-aware dynamic theming, a redesigned command-center dashboard, collapsible sidebar, and collection gallery view — plus two new personal tracking features: a per-unit Hobby Journal (photo timeline and session log) and a Spending Tracker.

- [ ] **Phase 10: Theming Foundation** — CSS `@theme` faction-accent utilities, Zustand faction store, FactionThemeProvider, collapsible sidebar with icon-only mode and tooltip polish
- [x] **Phase 11: Dashboard Command Center** — Animated stat counters, faction-accented faction summary cards, hero section redesign (completed 2026-05-03)
- [ ] **Phase 12: Collection Gallery View** — Card grid alternate view with painting-status ring, view toggle, filter preservation
- [ ] **Phase 13: Hobby Journal** — Painting session log (SQL CRUD) and photo timeline (tauri-plugin-fs) per unit
- [ ] **Phase 14: Spending Tracker** — Cost logging per unit and paint, Spending page with total and per-faction breakdown
- [ ] **Phase 15: Warhammer 40K Datasheet Integration** — Auto-populate Playbook tab stats/abilities/keywords from community data, bundle local SQLite rules database, surface rulebook references in-app
- [ ] **Phase 16: Design Overhaul** — Significantly improve visual design across all pages — typography, spacing, layouts, empty states, and overall UI polish

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
**Plans**: TBD

### Phase 15: Warhammer 40K Datasheet Integration
**Goal**: [To be planned]
**Depends on**: Phase 14
**Requirements**: TBD
**Plans**: TBD

Plans:
- [ ] TBD (run /gsd:plan-phase 15 to break down)

### Phase 16: Design Overhaul
**Goal**: [To be planned]
**Depends on**: Phase 15
**Requirements**: TBD
**Plans**: TBD

Plans:
- [ ] TBD (run /gsd:plan-phase 16 to break down)

## Progress

**Execution Order:** 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell | v1.1 | 3/3 | Complete | 2026-04-30 |
| 2. Data Layer + Entity CRUD | v1.1 | 4/4 | Complete | 2026-04-30 |
| 3. Collection Module | v1.1 | 5/5 | Complete | 2026-05-01 |
| 4. Painting Module | v1.1 | 4/4 | Complete | 2026-05-01 |
| 5. Dashboard | v1.1 | 4/4 | Complete | 2026-05-01 |
| 6. Foundation | v2.0 | 5/5 | Complete | 2026-05-01 |
| 7. Paint Inventory | v2.0 | 5/5 | Complete | 2026-05-02 |
| 8. Army List Builder | v2.0 | 6/6 | Complete | 2026-05-03 |
| 9. Unit Playbook | v2.0 | 4/4 | Complete | 2026-05-02 |
| 10. Theming Foundation | 3/4 | In Progress|  | — |
| 11. Dashboard Command Center | v2.1 | Complete    | 2026-05-03 | 2026-05-03 |
| 12. Collection Gallery View | 1/4 | In Progress|  | — |
| 13. Hobby Journal | v2.1 | 0/6 | Planned | — |
| 14. Spending Tracker | v2.1 | 0/TBD | Not started | — |
| 15. 40K Datasheet Integration | v2.1 | 0/TBD | Not started | — |
| 16. Design Overhaul | v2.1 | 0/TBD | Not started | — |
