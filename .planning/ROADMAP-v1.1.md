# Roadmap: HobbyForge v1.1 — Utility Layer

## Overview

HobbyForge v1.1 adds three features that complete the "ready-to-play" workflow: a dedicated Paint Inventory page, an Army List Builder, and the Unit Playbook (personal stats block and strategy notes per unit). The four phases follow the same dependency chain as v1.0 — schema before UI, lowest blast-radius before highest. Phase 6 is a pure back-end foundation: the schema migration that adds stat columns to `unit_strategy_notes`, new TypeScript types, and all query and hook modules for all three features. No UI ships in Phase 6. Phase 7 delivers Paint Inventory — the simplest feature with no schema changes and no existing component modifications. Phase 8 delivers Army List Builder — all new components, touching only router and sidebar. Phase 9 delivers Unit Playbook — the highest blast-radius change because it modifies the existing `UnitDetailSheet` to add a Playbook tab. Separating the back-end foundation (Phase 6) from the UI phases (7–9) means every feature builds on the same verified data layer and no phase carries migration risk alongside UI complexity.

## Phases

**Phase Numbering:**
- v1.0 covered Phases 1–5 (complete)
- v1.1 starts at Phase 6 and runs through Phase 9
- Integer phases (6, 7, 8, 9): Planned milestone work
- Decimal phases (e.g., 7.1): Urgent insertions between integers if needed

- [ ] **Phase 6: Foundation** - Schema migration 002, TypeScript types for all three v1.1 features, query modules (armyLists.ts, strategyNotes.ts), hook modules, and cross-invalidation patch to usePaints.ts — no UI
- [ ] **Phase 7: Paint Inventory** - PaintInventoryPage with brand/type/color-family filters, running-low and wishlist preset views, color swatch, "used in N recipes" badge, inline owned toggle, sidebar nav, and route
- [ ] **Phase 8: Army List Builder** - ArmyListsPage, ArmyListDetailSheet, ArmyListSheet (create/edit), ArmyListDeleteDialog, unit picker, COALESCE-in-SQL points calculation, battle-ready %, pre-delete unit check, sidebar nav, and route
- [ ] **Phase 9: Unit Playbook** - PlaybookTab (stats block grid + abilities/keywords + strategy notes fields + inline save), UnitDetailSheet wrapped in shadcn Tabs with SheetFooter outside the Tabs wrapper

## Phase Details

### Phase 6: Foundation
**Goal**: All back-end plumbing for v1.1 is in place and verified — the schema is migrated, types are defined, query functions are implemented, and hooks are wired — so that Phases 7, 8, and 9 build on a verified data layer with zero migration risk
**Depends on**: Phase 5 (v1.0 Dashboard — v1.0 must be complete before v1.1 begins)
**Requirements**: STRAT-06
**Success Criteria** (what must be TRUE):
  1. The app launches without error after migration 002 runs — the `unit_strategy_notes` table has 8 new nullable columns (move, toughness, save, wounds, leadership, objective_control, keywords, abilities) and all pre-existing rows remain intact
  2. The `002_unit_playbook_stats.sql` file contains only `ALTER TABLE ... ADD COLUMN` statements — no DROP, no CREATE TABLE, no edit to `001_core_schema.sql`
  3. TypeScript types for `ArmyList`, `ArmyListUnit`, `ArmyListWithUnits`, `StrategyNote`, and `PaintWithRecipeCount` exist in `src/types/` and compile without errors
  4. Query functions `getArmyLists()`, `getArmyListWithUnits()`, `getPaintsWithRecipeCount()`, `getStrategyNote()`, and `upsertStrategyNote()` exist and return typed results against the live database
  5. `useCreatePaint`, `useUpdatePaint`, and `useDeletePaint` in `usePaints.ts` each invalidate both `['paints']` and `['paints-with-recipes']` on success
**Plans**: TBD

### Phase 7: Paint Inventory
**Goal**: Users can browse and manage their paint collection from a dedicated inventory page — filtering by brand, type, and color family, jumping to running-low or wishlist views, seeing a color swatch and recipe usage count per paint, and toggling owned status inline without opening an edit form
**Depends on**: Phase 6
**Requirements**: PINV-01, PINV-02, PINV-03, PINV-04, PINV-05, PINV-06
**Success Criteria** (what must be TRUE):
  1. User can navigate to Paint Inventory from the sidebar and see all their paints in a filterable table with a color swatch derived from `hex_color` and a "used in N recipes" badge per row
  2. User can apply brand, paint type, and color-family filters in any combination and the table updates without a page reload — filters reset to "all" when navigating away and returning
  3. User can click "Running Low" and see only paints where `running_low = true`; clicking "Wishlist" shows only paints where `wishlist = true`; clicking neither shows all paints
  4. User can click the "used in N recipes" badge for a paint and be taken to the Recipes page pre-filtered to that paint
  5. User can toggle a paint's `owned` status directly in the table row — the toggle updates immediately and persists after navigating away and back
**Plans**: TBD

### Phase 8: Army List Builder
**Goal**: Users can create and manage army lists drawn from their collection — adding and removing units, entering per-unit points overrides, and seeing auto-calculated totals (total points, painted points, battle-ready %) — and the unit delete flow warns before removing a unit that belongs to an active list
**Depends on**: Phase 6
**Requirements**: ARMY-01, ARMY-02, ARMY-03, ARMY-04, ARMY-05, ARMY-06, ARMY-07
**Success Criteria** (what must be TRUE):
  1. User can create an army list with a name, faction, list type tag (Casual, Learning, Narrative, Competitive, Test), and notes — the list appears immediately in the Army Lists index page
  2. User can open a list's detail sheet, browse their collection units, add units to the list, and remove them — each unit in the list shows its painting status badge and assembled status
  3. User can enter a per-unit points override for any unit in the list; leaving the field blank falls back to `unit.points`; the list's total points, painted points, and battle-ready % update automatically and are computed from `COALESCE(points_override, unit.points, 0)` in SQL — not derived from stale React state
  4. User can enter per-list notes and per-unit-in-list notes without leaving the detail sheet
  5. When the user attempts to delete a unit from the Collection page and that unit belongs to one or more army lists, a warning dialog appears naming the number of lists — the delete does not proceed until the user confirms or removes the unit from lists first
  6. An empty state with a "Create your first army list" CTA appears when no lists exist
**Plans**: TBD

### Phase 9: Unit Playbook
**Goal**: Users can record personal stats (M/T/Sv/W/Ld/OC), abilities, keywords, and strategy notes for any unit in a dedicated Playbook tab inside the existing unit detail sheet — saving inline without closing the sheet or toggling an edit mode
**Depends on**: Phase 6
**Requirements**: STRAT-01, STRAT-02, STRAT-03, STRAT-04, STRAT-05
**Success Criteria** (what must be TRUE):
  1. Clicking a unit in the Collection page opens the detail sheet and a "Playbook" tab is visible alongside the existing "Details" tab — switching between tabs works without closing and reopening the sheet
  2. The Playbook tab shows a compact horizontal stats block with six integer fields (M, T, Sv, W, Ld, OC) — all fields accept 0 as a valid value (OC = 0 is a legitimate stat), and Sv stores an integer (2–6) displayed with a "+" suffix
  3. User can enter multi-line abilities text and comma-separated keywords in their respective fields
  4. User can fill in all eight strategy note fields (Battlefield Role, Strengths, Weaknesses, Best Targets, Synergies, Mistakes to Avoid, Rules Page References, Personal Notes) and save them by clicking the Save button — no separate edit/view mode toggle is needed
  5. The Edit and Delete buttons in the SheetFooter remain visible and functional regardless of which tab (Details or Playbook) is active — the SheetFooter is outside the Tabs wrapper
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Foundation | 0/TBD | Not started | - |
| 7. Paint Inventory | 0/TBD | Not started | - |
| 8. Army List Builder | 0/TBD | Not started | - |
| 9. Unit Playbook | 0/TBD | Not started | - |
