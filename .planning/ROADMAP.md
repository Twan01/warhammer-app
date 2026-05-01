# Roadmap: HobbyForge

## Milestones

- ✅ **v1.1 HobbyForge MVP** — Phases 1–5 (shipped 2026-05-01)
- 📋 **v2.0 Utility Layer** — Phases 6–9 (planned)

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

- [ ] **Phase 6: Foundation** — Schema migration 002, TypeScript types for all v2.0 features, query modules (armyLists.ts, strategyNotes.ts), hook modules, and cross-invalidation patch to usePaints.ts
- [ ] **Phase 7: Paint Inventory** — PaintInventoryPage with brand/type/color-family filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge, inline owned toggle, sidebar nav and route
- [ ] **Phase 8: Army List Builder** — ArmyListsPage, ArmyListDetailSheet, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sidebar nav and route
- [ ] **Phase 9: Unit Playbook** — PlaybookTab (stats block grid + abilities/keywords + strategy notes + inline save), UnitDetailSheet wrapped in shadcn Tabs

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
- [ ] 06-04-PLAN.md — Hooks: usePaints.ts patch (PAINTS_WITH_RECIPES_KEY + 3 double-invalidations), new useStrategyNote.ts, new useArmyLists.ts + real usePaints.test.ts assertions

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
**Plans**: TBD

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
**Plans**: TBD

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
**Plans**: TBD

## Progress

**Execution Order:** 6 → 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. App Shell | v1.1 | 3/3 | Complete | 2026-04-30 |
| 2. Data Layer + Entity CRUD | v1.1 | 4/4 | Complete | 2026-04-30 |
| 3. Collection Module | v1.1 | 5/5 | Complete | 2026-05-01 |
| 4. Painting Module | v1.1 | 4/4 | Complete | 2026-05-01 |
| 5. Dashboard | v1.1 | 4/4 | Complete | 2026-05-01 |
| 6. Foundation | 3/5 | In Progress|  | — |
| 7. Paint Inventory | v2.0 | 0/TBD | Not started | — |
| 8. Army List Builder | v2.0 | 0/TBD | Not started | — |
| 9. Unit Playbook | v2.0 | 0/TBD | Not started | — |
