---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Utility Layer
status: in_progress
stopped_at: Completed 07-02-PLAN.md — getRecipeIdsByPaintId query + useRecipeIdsByPaint hook; 157 tests green
last_updated: "2026-05-01T21:40:49.365Z"
last_activity: 2026-05-01 — 07-02 executed; getRecipeIdsByPaintId DB query + RECIPE_IDS_BY_PAINT_KEY/useRecipeIdsByPaint TanStack Query hook; 157 tests green
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 10
  completed_plans: 7
  percent: 70
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-01 after v1.1 milestone)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.0 — Phase 6 (Foundation) ready to plan

## Current Position

Phase: 7 of 9 (v2.0 Paint Inventory UI) — IN PROGRESS
Plan: 2 of 5 complete in current phase
Status: v1.1 fully shipped (Phases 1–5 complete). v2.0 underway — Phase 6 complete. Phase 7 in progress — 07-01 (filter state layer) and 07-02 (recipe-paint query + hook) complete.
Last activity: 2026-05-01 — 07-02 executed; getRecipeIdsByPaintId DB query + RECIPE_IDS_BY_PAINT_KEY/useRecipeIdsByPaint TanStack Query hook; 157 tests green

Progress: [███████░░░] 70% (v2.0 Phase 7: 2/5 plans complete)

## v2.0 Scope

Phases 6–9 implement Paint Inventory, Army List Builder, and Unit Playbook. Phase 6 is a back-end-only foundation with no UI. Phases 7–9 add UI features sequentially.

Key architecture context carried forward:
- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet

## Accumulated Context

### Active Decisions for v2.0

Full decision log in PROJECT.md Key Decisions table.

Key decisions made during execution:
- 07-02: useRecipePaints.ts already existed from Phase 4 — appended RECIPE_IDS_BY_PAINT_KEY and useRecipeIdsByPaint additively, preserving the existing 3 exports.
- 07-02: useRecipeIdsByPaint uses disabled fallback queryKey ['recipe-ids-by-paint', 'disabled'] when paintId is null/undefined — TanStack Query requires a defined queryKey even when enabled: false.
- 07-01: usePaintInventoryFilters is a direct structural copy of useCollectionFilters — five fields (brands/types/colorFamilies as arrays, runningLow/wishlist as booleans), same idempotent toggle pattern.
- 07-01: applyPaintFilters uses p.running_low !== 1 and p.wishlist !== 1 guards — never truthy checks — enforcing the codebase SQLite 0|1 integer discipline.
- 06-00: Wave-0 stub pattern confirmed — describe blocks named per VALIDATION.md -t filter strings, it.skip() filled in-place by later plans, no imports (vitest globals:true)
- 06-01: save = INTEGER (not TEXT); UI appends '+' suffix at display time. Migration comment wording must avoid the literal word "DROP" to pass regex assertions.
- 06-02: ArmyListUnit omits updated_at — army_list_units schema has no such column; including it causes runtime mismatch.
- 06-02: PaintWithRecipeCount.recipe_count is SQL-computed (LEFT JOIN COUNT), never recalculated in JS.
- 06-02: UpdateArmyListUnitInput uses non-optional nullable fields (full-replacement) to allow clearing points_override back to NULL.
- 06-03: updateArmyListUnit uses full-replacement SET (no COALESCE) — points_override must be clearable to NULL.
- 06-03: addUnitToList uses plain INSERT (no INSERT OR IGNORE) — duplicate (list_id, unit_id) pairs are intentionally allowed.
- 06-03: upsertStrategyNote uses select-then-insert/update — no ON CONFLICT since no UNIQUE INDEX exists on unit_strategy_notes.unit_id.
- 06-03: getArmyListWithUnits computes effective_points = COALESCE(alu.points_override, u.points, 0) in SQL (never in JS).
- 06-04: useUpsertStrategyNote.onSuccess invalidates ONLY STRATEGY_NOTE_KEY(unit_id) — no ['units'] or ['dashboard-stats'] since strategy notes don't surface in collection or dashboard.
- 06-04: useArmyLists mutations all invalidate ['dashboard-stats'] per DATA-09 forward-compat, even though v1 dashboard doesn't show army list data yet.
- 06-04: ARMY_LIST_UNITS_KEY(id) = ['army-lists', id, 'units'] as third key shape for unit-membership cache invalidation.
- 06-04: RemoveUnitFromListInput and UpdateArmyListUnitVariables carry list_id for targeted onSuccess invalidation in useArmyLists.

Key decisions affecting v2.0 planning:
- Phase 6 adds `002_unit_playbook_stats.sql` migration — `ALTER TABLE ADD COLUMN` only, no edits to 001
- `usePaints.ts` mutations need to invalidate `['paints-with-recipes']` in Phase 6 for Phase 7's PaintWithRecipeCount query
- `getStrategyNote()` + `upsertStrategyNote()` in Phase 6 for Phase 9's Playbook tab
- Army Lists use `COALESCE(points_override, unit.points, 0)` in SQL for effective points (ARMY-03)
- Unit Playbook lives in a second Tabs panel inside the existing UnitDetailSheet — SheetFooter stays outside Tabs wrapper

### Tech Debt from v1.1

- PROJ-02: Update REQUIREMENTS.md text to remove "empty columns hidden" language (one-line fix)
- PaintingProjectsPage empty-state CTA: replace `document.querySelector` with `useState` toggle

### Pending Todos

None blocking v2.0 start.

### Open Blockers

None (MSVC Build Tools resolved in Phase 1; all seeding questions resolved in Phase 2)

## Session Continuity

Last session: 2026-05-01T21:40:00.000Z
Stopped at: Completed 07-02-PLAN.md — getRecipeIdsByPaintId query + useRecipeIdsByPaint hook; 157 tests green
Resume: Run `/gsd:execute-phase 7` to continue Phase 7 with plan 07-03
