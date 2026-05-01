---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Utility Layer
status: in_progress
stopped_at: Completed 06-02-PLAN.md — StrategyNote, ArmyList, PaintWithRecipeCount types
last_updated: "2026-05-01T21:04:24.201Z"
last_activity: 2026-05-01 — 06-01 executed; migration 004 SQL + lib.rs v4 registration + 6 green file-content tests
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 5
  completed_plans: 3
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-01 after v1.1 milestone)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.0 — Phase 6 (Foundation) ready to plan

## Current Position

Phase: 6 of 9 (v2.0 Foundation) — IN PROGRESS
Plan: 3 of 5 complete in current phase
Status: v1.1 fully shipped (Phases 1–5 complete). v2.0 underway — 06-01 (migration 004) + 06-02 (TypeScript types) complete.
Last activity: 2026-05-01 — 06-02 executed; StrategyNote, ArmyList family, PaintWithRecipeCount types created

Progress: [██████░░░░] 60% (v2.0 Phase 6: 3/5 plans complete)

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
- 06-00: Wave-0 stub pattern confirmed — describe blocks named per VALIDATION.md -t filter strings, it.skip() filled in-place by later plans, no imports (vitest globals:true)
- 06-01: save = INTEGER (not TEXT); UI appends '+' suffix at display time. Migration comment wording must avoid the literal word "DROP" to pass regex assertions.
- 06-02: ArmyListUnit omits updated_at — army_list_units schema has no such column; including it causes runtime mismatch.
- 06-02: PaintWithRecipeCount.recipe_count is SQL-computed (LEFT JOIN COUNT), never recalculated in JS.
- 06-02: UpdateArmyListUnitInput uses non-optional nullable fields (full-replacement) to allow clearing points_override back to NULL.

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

Last session: 2026-05-01T21:04:24.198Z
Stopped at: Completed 06-02-PLAN.md — StrategyNote, ArmyList, PaintWithRecipeCount types
Resume: Run `/gsd:execute-phase 6` to continue with 06-03 (query functions: getStrategyNote, upsertStrategyNote, army list CRUD, getPaintsWithRecipeCount)
