---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Utility Layer
status: executing
stopped_at: Completed 08-army-list-builder plan 08-02 — ArmyListSummaryBar, ArmyListUnitRow, UnitPickerDialog leaf components
last_updated: "2026-05-02T08:21:53.932Z"
last_activity: 2026-05-02 — Phase 9 Plan 03 approved by user (all 9 smoke-test steps PASSED, STRAT-01..05 verified)
progress:
  total_phases: 9
  completed_phases: 3
  total_plans: 20
  completed_plans: 18
  percent: 85
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-02 after v2.1 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.1 — Visual Command (Phases 10–14 planned; v2.0 Phases 8–9 still pending)

## Current Position

Phase: 9 of 14 (COMPLETE: Phase 9 Unit Playbook)
Plan: 09-03 complete — all 9 smoke-test steps PASSED, user approved
Status: Phase 9 complete. Phase 8 (Army List Builder) still in progress (plans 00-02 done, plans 03-05 pending). Next: continue Phase 8 or run `/gsd:verify-work` for Phase 9.
Last activity: 2026-05-02 — Phase 9 Plan 03 approved by user (all 9 smoke-test steps PASSED, STRAT-01..05 verified)

Progress: [████████░░] 85% (17/20 plans complete)

## v2.1 Phase Map

| Phase | Goal | Requirements |
|-------|------|--------------|
| 10. Theming Foundation | Faction accent colors + collapsible sidebar | THEME-01..03, UI-01..03 |
| 11. Dashboard Command Center | Animated counters + faction-accented cards | UI-07, UI-08 |
| 12. Collection Gallery View | Card grid alternate view + filter preservation | UI-04..06 |
| 13. Hobby Journal | Session log (SQL) + photo timeline (tauri-plugin-fs) | JOUR-01..06 |
| 14. Spending Tracker | Cost logging per unit/paint + Spending page | SPEND-01..05 |

Architecture constraint: Phase 10 must complete before Phases 11–14. `bg-faction-accent` CSS utilities must exist before any themed UI is built.

## Accumulated Context

### Key Decisions for v2.1

- Phase 8 Plan 00: getArmyListsByUnitId SQL does not de-duplicate — if a unit appears in List A twice, caller sees List A twice; plan 04 call site de-dups by id if needed for display
- Phase 8 Plan 02: status_painting === 'Completed' is canonical (not 'Complete' — RESEARCH.md typo corrected; PAINTING_STATUS_ORDER in unit.ts confirms); Pitfall 2 full-replacement UPDATE means every useUpdateArmyListUnit call passes BOTH points_override AND notes; UnitPickerDialog stays open after each add for multi-add UX
- Phase 9 Plan 01: Raw `<textarea>` with PaintSheet className verbatim used for PlaybookTab (no shadcn Textarea exists); `initialRef` snapshot pattern for dirty detection without React Hook Form
- Phase 9 Plan 02: SheetHeader/SheetFooter stay outside Tabs so unit name, faction badge, and Edit/Delete buttons persist across tab switches
- Phase 9 Plan 02: No overflow-hidden added to Tabs/TabsContent — SheetContent overflow-y-auto retained for correct scrolling (Pitfall 5)
- Phase 9 Plan 02: key={unit?.id} on SheetContent resets PlaybookTab state on unit switch for free — no extra reset logic needed
- Phase 10 uses CSS `@theme` layer to define `bg-faction-accent` utilities — all accent color usage in later phases references these utilities, never hardcoded hex values
- Phase 13 photo storage requires `tauri-plugin-fs` — the one new Tauri plugin introduced in v2.1; verify capability grants before building photo attach UI
- Phase 14 stores all spend values as integer pence in SQLite — display formatting happens in UI layer only, never stored as float

### Decisions Carried from v2.0

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet

### Tech Debt

- PROJ-02: REQUIREMENTS.md text still says "empty columns hidden" — KanbanBoard ships all 11 columns (approved UX)
- PaintingProjectsPage empty-state CTA uses fragile DOM query — replace with useState pattern

### Pending Todos

None blocking.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-02T08:13:31Z
Stopped at: Completed 08-army-list-builder plan 08-02 — ArmyListSummaryBar, ArmyListUnitRow, UnitPickerDialog leaf components
Resume: Phase 8 Army List Builder plans 03-05 still pending (ArmyListDetailSheet, ArmyListCard, ArmyListsPage wire-up, smoke test). Run `/gsd:execute-phase` to continue Phase 8 with plan 03.
