---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Visual Command
status: verifying
stopped_at: "Completed Phase 11 Plan 00 — Wave 0 stub tests/dashboard/useCountUp.test.ts created"
last_updated: "2026-05-03T12:34:16Z"
last_activity: 2026-05-03 — Phase 11 Plan 00 — Wave 0 stub created (1 task, 217 tests passing, 3 skipped)
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 8
  completed_plans: 5
  percent: 63
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-02 after v2.1 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.1 — Visual Command (Phases 10–14; v2.0 fully shipped 2026-05-03)

## Current Position

Phase: 11 of 14 (IN PROGRESS: Phase 11 Dashboard Command Center)
Plan: 11-00 complete — Wave 0 stub tests/dashboard/useCountUp.test.ts created; ready for Plan 11-01
Status: EXECUTING — Plan 11-00 complete. Next: Plan 11-01 (create src/hooks/useCountUp.ts + flip describe.skip).
Last activity: 2026-05-03 — Phase 11 Plan 00 — Wave 0 stub created (1 task, 217 tests passing, 3 skipped)

Progress: [██████░░░░] 63% (5/8 plans complete)

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
- Phase 8 Plan 03: ArmyListDetailSheet does NOT own UnitPickerDialog state — onAddUnit prop delegates to parent page (sibling portal); ArmyListCard duplicates stat logic from ArmyListSummaryBar intentionally (card must show totals before detail sheet is opened); Pitfall 5 (notes: notesDraft ?? "") and Pitfall 6 (key={list?.id ?? "none-detail"}) both applied
- Phase 8 Plan 04: Loading skeleton test required async waitFor wrapper because RouterProvider renders asynchronously — synchronous querySelectorAll returned 0 elements; UnitDeleteDialog warning body uses double-quoted unit name + pluralized list count per UI-SPEC §Copywriting Contract
- Phase 8 Plan 05: All 14 manual smoke-test steps approved; Pitfall 1 (sibling portals), Pitfall 2 (full-replacement UPDATE), and Pitfall 6 (key prop) all confirmed working in live Tauri app; Phase 8 complete and ready for /gsd:verify-work
- Phase 9 Plan 01: Raw `<textarea>` with PaintSheet className verbatim used for PlaybookTab (no shadcn Textarea exists); `initialRef` snapshot pattern for dirty detection without React Hook Form
- Phase 9 Plan 02: SheetHeader/SheetFooter stay outside Tabs so unit name, faction badge, and Edit/Delete buttons persist across tab switches
- Phase 9 Plan 02: No overflow-hidden added to Tabs/TabsContent — SheetContent overflow-y-auto retained for correct scrolling (Pitfall 5)
- Phase 9 Plan 02: key={unit?.id} on SheetContent resets PlaybookTab state on unit switch for free — no extra reset logic needed
- Phase 10 uses CSS `@theme` layer to define `bg-faction-accent` utilities — all accent color usage in later phases references these utilities, never hardcoded hex values
- Phase 10 Plan 00: Wave 0 stub files use no SUT imports — source-under-test doesn't exist yet; imports land in plans 10-01/02/03 alongside replacing .skip bodies
- Phase 10 Plan 00: Explicit `import { describe, it } from 'vitest'` in every stub file for tsc strict-mode compatibility (mirrors UnitDeleteDialog pattern)
- Phase 10 Plan 01: Test file renamed .ts -> .tsx — JSX in wrapper requires tsx extension; esbuild rejects JSX in .ts files (auto-fixed Rule 1)
- Phase 10 Plan 01: No useMemo on context value — mirrors useSidebarCollapsed.ts pattern; ActiveFactionContext itself not exported (only Provider + hook are public API)
- Phase 10 Plan 02: FactionSummaryCard isActive/onActivate props are optional with defaults so DashboardPage compiles before Plan 10-03 wires them
- Phase 10 Plan 02: NavItem uses bg-faction-accent via CSS cascade only — no useActiveFaction context import needed in NavItem itself
- Phase 10 Plan 02: FactionStat test mock uses complete Faction type (icon_path, created_at, updated_at) — plan mock was missing fields; auto-corrected (Rule 1)
- Phase 11 Plan 00: Wave 0 stub tests/dashboard/useCountUp.test.ts stays .ts (no JSX wrapper needed for plain number-target hook); explicit vitest imports for tsc strict-mode; no SUT import until Plan 11-01 creates src/hooks/useCountUp.ts
- Phase 13 photo storage requires `tauri-plugin-fs` — the one new Tauri plugin introduced in v2.1; verify capability grants before building photo attach UI
- Phase 14 stores all spend values as integer pence in SQLite — display formatting happens in UI layer only, never stored as float

### Decisions Carried from v2.0

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet

### Roadmap Evolution

- Phase 15 added: Warhammer 40K datasheet and rules integration — auto-populate Playbook tab stats/abilities/keywords from community data sources, bundle local SQLite rules database, surface rulebook references in-app (stratagems, detachment rules, core rules)

### Tech Debt

- PROJ-02: REQUIREMENTS.md text still says "empty columns hidden" — KanbanBoard ships all 11 columns (approved UX)
- PaintingProjectsPage empty-state CTA uses fragile DOM query — replace with useState pattern

### Pending Todos

None blocking.

### Open Blockers

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260503-g7p | Add one-click launcher scripts and desktop shortcut for HobbyForge | 2026-05-03 | 2cd7bea | Needs Review | [260503-g7p-i-would-like-to-get-something-to-launch-](./quick/260503-g7p-i-would-like-to-get-something-to-launch-/) |

## Session Continuity

Last session: 2026-05-03T12:34:16Z
Stopped at: Completed Phase 11 Plan 00 — Wave 0 stub tests/dashboard/useCountUp.test.ts created
Resume: Run `/gsd:execute-phase` to execute Plan 11-01 (create src/hooks/useCountUp.ts + flip describe.skip → describe + add real assertions).
