# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2026-05-01)
- 📋 **v2.0 Utility Layer** — Phases 6–9 (planned)
- 📋 **v2.1 Visual Command** — Phases 10–14 (planned)

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

---

### 📋 v2.0 Utility Layer (Phases 6–9) — Planned

HobbyForge v2.0 adds three features that complete the "ready-to-play" workflow: a dedicated Paint Inventory page, an Army List Builder, and the Unit Playbook (personal stats block and strategy notes per unit). Phase 6 is a pure back-end foundation — schema migration, new TypeScript types, all query and hook modules for all three features, with no UI. Phases 7–9 build the UI on that verified data layer.

- [x] **Phase 6: Foundation** — Schema migration 004, TypeScript types for all v2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules, and cross-invalidation patch to usePaints.ts (completed 2026-05-01)
- [x] **Phase 7: Paint Inventory** — PaintInventoryPage with brand/type/color-family filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge, inline owned toggle, sidebar nav and route (completed 2026-05-02)
- [ ] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sidebar nav and route
- [x] **Phase 9: Unit Playbook** — PlaybookTab (stats block grid + abilities/keywords + strategy notes + inline save), UnitDetailSheet wrapped in shadcn Tabs (completed 2026-05-02)

---

### 📋 v2.1 Visual Command (Phases 10–14) — Planned

HobbyForge v2.1 transforms the visual identity with faction-aware dynamic theming, a redesigned command-center dashboard, collapsible sidebar, and collection gallery view — plus two new personal tracking features: a per-unit Hobby Journal (photo timeline and session log) and a Spending Tracker.

- [ ] **Phase 10: Theming Foundation** — CSS `@theme` faction-accent utilities, Zustand faction store, FactionThemeProvider, collapsible sidebar with icon-only mode and tooltip polish
- [ ] **Phase 11: Dashboard Command Center** — Animated stat counters, faction-accented faction summary cards, hero section redesign
- [ ] **Phase 12: Collection Gallery View** — Card grid alternate view with painting-status ring, view toggle, filter preservation
- [ ] **Phase 13: Hobby Journal** — Painting session log (SQL CRUD) and photo timeline (tauri-plugin-fs) per unit
- [ ] **Phase 14: Spending Tracker** — Cost logging per unit and paint, Spending page with total and per-faction breakdown

## Phase Details

### Phase 6: Foundation
**Goal**: All back-end plumbing for v2.0 is in place and verified — the schema is migrated, types are defined, query functions are implemented, and hooks are wired — so that Phases 7, 8, and 9 build on a verified data layer with zero migration risk
**Depends on**: Phase 5
**Requirements**: STRAT-06
**Success Criteria** (what must be TRUE):
  1. The app launches without error after migration 004 runs — `unit_strategy_notes` has 8 new nullable columns and all pre-existing rows remain intact
  2. `004_unit_playbook_stats.sql` contains only `ALTER TABLE ... ADD COLUMN` statements — no DROP, no CREATE TABLE, no edit to `001_core_schema.sql`
  3. TypeScript types for `ArmyList`, `ArmyListUnit`, `ArmyListWithUnits`, `StrategyNote`, and `PaintWithRecipeCount` compile without errors
  4. Query functions `getArmyLists()`, `getArmyListWithUnits()`, `getPaintsWithRecipeCount()`, `getStrategyNote()`, `upsertStrategyNote()` return typed results against live DB
  5. `useCreatePaint`, `useUpdatePaint`, `useDeletePaint` each invalidate both `['paints']` and `['paints-with-recipes']` on success
**Plans**: 5 plans

Plans:
- [ ] 06-00-PLAN.md — Wave 0: four stub test files under tests/foundation/ (migration004, armyListQueries, strategyNoteQueries, usePaints)
- [ ] 06-01-PLAN.md — Migration 004 (8 ALTER TABLE ADD COLUMN, save = INTEGER), lib.rs version-4 registration, real migration004.test.ts assertions
- [ ] 06-02-PLAN.md — TypeScript types: src/types/strategyNote.ts (StrategyNote, UpsertStrategyNoteInput), src/types/armyList.ts (full ArmyList family), src/types/paint.ts append PaintWithRecipeCount
- [ ] 06-03-PLAN.md — Query functions: paints.ts append getPaintsWithRecipeCount, new strategyNotes.ts (select-then-upsert), new armyLists.ts (NULL-passthrough updateArmyListUnit, duplicate-allowed addUnitToList) + real query tests
- [x] 06-04-PLAN.md — Hooks: usePaints.ts patch (PAINTS_WITH_RECIPES_KEY + 3 double-invalidations), new useStrategyNote.ts, new useArmyLists.ts + real usePaints.test.ts assertions

### Phase 7: Paint Inventory
**Goal**: Users can browse and manage their paint collection from a dedicated inventory page — filtering by brand, type, and color family, jumping to running-low or wishlist views, seeing a color swatch and recipe usage count per paint, and toggling owned status inline
**Depends on**: Phase 6
**Requirements**: PINV-01, PINV-02, PINV-03, PINV-04, PINV-05, PINV-06
**Success Criteria** (what must be TRUE):
  1. User can navigate to Paint Inventory from the sidebar and see all paints in a filterable table with a color swatch from `hex_color` and a "used in N recipes" badge per row
  2. User can apply brand, paint type, and color-family filters in any combination — filters reset when navigating away
  3. User can click "Running Low" and see only paints where `running_low = true`; "Wishlist" shows only `wishlist = true`
  4. User can click the "used in N recipes" badge and be taken to the Recipes page pre-filtered to that paint
  5. User can toggle a paint's `owned` status directly in the table row — updates immediately and persists
**Plans**: 5 plans

Plans:
- [ ] 07-01-PLAN.md — Zustand filter store + applyPaintFilters helper + 12 unit tests
- [ ] 07-02-PLAN.md — getRecipeIdsByPaintId query + useRecipeIdsByPaint hook + 3 unit tests
- [ ] 07-03-PLAN.md — Router validateSearch + RecipesPage paintId consumption
- [ ] 07-04-PLAN.md — PaintInventoryFilters component + PaintRow extension + PaintsPage integration
- [ ] 07-05-PLAN.md — Manual smoke-test checkpoint (PINV-01..06)

### Phase 8: Army List Builder
**Goal**: Users can create and manage army lists drawn from their collection — adding and removing units, entering per-unit points overrides, and seeing auto-calculated totals (total points, painted points, battle-ready %) — and the unit delete flow warns before removing a unit that belongs to an active list
**Depends on**: Phase 6
**Requirements**: ARMY-01, ARMY-02, ARMY-03, ARMY-04, ARMY-05, ARMY-06, ARMY-07
**Success Criteria** (what must be TRUE):
  1. User can create an army list with name, faction, list type tag (Casual, Learning, Narrative, Competitive, Test), and notes
  2. User can add units from their collection to a list and remove them — each unit shows painting status badge and assembled status
  3. User can enter a per-unit points override; leaving it blank falls back to `unit.points`; effective points computed via `COALESCE(points_override, unit.points, 0)` in SQL
  4. Per-list notes and per-unit-in-list notes fields both save without leaving the detail sheet
  5. Unit delete warns by count when the unit belongs to active army lists before confirming
  6. Empty state with CTA appears when no lists exist
**Plans**: 6 plans

Plans:
- [ ] 08-00-PLAN.md — Wave 0: getArmyListsByUnitId query + 3 stub test files (1 real + 2 skipped)
- [ ] 08-01-PLAN.md — armyListSchema + ArmyListSheet (create/edit form) + ArmyListDeleteDialog
- [ ] 08-02-PLAN.md — Leaf components: ArmyListSummaryBar, ArmyListUnitRow, UnitPickerDialog
- [ ] 08-03-PLAN.md — Composite components: ArmyListDetailSheet + ArmyListCard
- [ ] 08-04-PLAN.md — Page wire-up: ArmyListsPage + ArmyListsEmptyState + route + sidebar nav + UnitDeleteDialog enhancement (ARMY-05)
- [ ] 08-05-PLAN.md — Manual smoke-test checkpoint (ARMY-01..07)

### Phase 9: Unit Playbook
**Goal**: Users can record personal stats (M/T/Sv/W/Ld/OC), abilities, keywords, and strategy notes for any unit in a dedicated Playbook tab inside the existing unit detail sheet — saving inline without closing the sheet or toggling edit mode
**Depends on**: Phase 6
**Requirements**: STRAT-01, STRAT-02, STRAT-03, STRAT-04, STRAT-05
**Success Criteria** (what must be TRUE):
  1. Clicking a unit in the Collection page opens the detail sheet with a "Playbook" tab visible alongside the existing "Details" tab — switching tabs works without closing and reopening
  2. The Playbook tab shows a compact horizontal stats block with six integer fields (M, T, Sv, W, Ld, OC)
  3. User can enter multi-line abilities text and comma-separated keywords
  4. User can fill in all eight strategy note fields and save by clicking Save — no separate edit/view mode toggle
  5. SheetFooter Edit and Delete buttons remain visible and functional regardless of which tab is active
**Plans**: 4 plans

Plans:
- [ ] 09-00-PLAN.md — Wave 0: tests/collection/PlaybookTab.test.tsx stub scaffold (5 describe blocks of it.skip for STRAT-01..05)
- [ ] 09-01-PLAN.md — PlaybookTab.tsx component (stats block + abilities + keywords + 8 strategy notes + dirty-state Save) + real test bodies
- [ ] 09-02-PLAN.md — UnitDetailSheet.tsx wrapped in shadcn Tabs with Details + Playbook triggers
- [ ] 09-03-PLAN.md — Manual smoke-test checkpoint (STRAT-01..05)

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
**Plans**: TBD

### Phase 12: Collection Gallery View
**Goal**: Users can view their collection as a visual card grid — showing painting-status rings and faction badges per unit — and toggle back to the existing table view without losing any active filters
**Depends on**: Phase 10
**Requirements**: UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Collection page shows a view toggle (table / gallery) — clicking Gallery switches the list to a card grid without navigating away
  2. Each gallery card displays the unit name, faction badge, a circular painting-status ring showing painted percentage, and the numeric painted percentage
  3. Switching between gallery and table view preserves all active filters (search text, faction, status, category) — no filter resets on toggle
**Plans**: TBD

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
**Plans**: TBD

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

## Progress

**Execution Order:** 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell | v1.1 | 3/3 | Complete | 2026-04-30 |
| 2. Data Layer + Entity CRUD | v1.1 | 4/4 | Complete | 2026-04-30 |
| 3. Collection Module | v1.1 | 5/5 | Complete | 2026-05-01 |
| 4. Painting Module | v1.1 | 4/4 | Complete | 2026-05-01 |
| 5. Dashboard | v1.1 | 4/4 | Complete | 2026-05-01 |
| 6. Foundation | v2.0 | 5/5 | Complete | 2026-05-01 |
| 7. Paint Inventory | v2.0 | 5/5 | Complete | 2026-05-02 |
| 8. Army List Builder | 2/6 | In Progress|  | — |
| 9. Unit Playbook | 4/4 | Complete   | 2026-05-02 | — |
| 10. Theming Foundation | v2.1 | 0/TBD | Not started | — |
| 11. Dashboard Command Center | v2.1 | 0/TBD | Not started | — |
| 12. Collection Gallery View | v2.1 | 0/TBD | Not started | — |
| 13. Hobby Journal | v2.1 | 0/TBD | Not started | — |
| 14. Spending Tracker | v2.1 | 0/TBD | Not started | — |
