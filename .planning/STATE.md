---
gsd_state_version: 1.0
milestone: v2.4
milestone_name: Premium Dashboard UX & Visual Polish
status: planning
stopped_at: Completed 35-01-PLAN.md
last_updated: "2026-05-05T19:34:06.940Z"
last_activity: 2026-05-05 — Phase 35 v2.2 gap closure complete (4 tech debt fixes)
progress:
  total_phases: 13
  completed_phases: 8
  total_plans: 23
  completed_plans: 23
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05 after v2.4 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.4 Premium Dashboard UX & Visual Polish — Phase 30: Grid Layout Foundation

## Current Position

Phase: 30 of 34 (Grid Layout Foundation)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-05-05 — Phase 35 v2.2 gap closure complete (4 tech debt fixes)

Progress: [██████████] 100% (23/23 plans complete)

## Accumulated Context

### Decisions Carried from v2.3

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- Integer pence discipline (formatCurrency is the only /100 site)
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Design tokens: Forge Black, Gunmetal, Panel Elevated, Battle Gold defined in globals.css
- PageHeader shared component on all 9 pages
- StatusBadge 4-tier color system for 11 painting statuses
- Quick Add via QuickAddContext provider with 8-action dropdown

### v2.4 Key Constraints

- CSS grid migration (Phase 30) must be atomic — all 7 existing dashboard sections get col-span in the same commit; never leave a half-migrated grid
- ArmyReadinessCard (Phase 32) needs its own dedicated query hook — do NOT extend getDashboardStats
- Log Session status update (Phase 33) must invalidate three caches: ["dashboard-stats"] + ["units"] + ["painting-sessions"]
- Recipe linking (Phase 33) needs schema audit before implementation — check if units table already has recipe_id FK or if it needs migration
- Visual depth (Phase 34) is CSS-only — no logic, no new hooks; add last as pure polish
- Phase 31 must ship before Phase 33 — CurrentFocusCard v2 introduces photo wiring that DATA-06 (recipe name display) depends on

### Phase 24 Decisions (24-02 + 24-03 + 24-04)

- weapon_name stored as TEXT copy in unit_loadout_wargear — cross-database FK to rules.db not supported in SQLite
- activateLoadout uses two-step UPDATE without transaction — safe for local single-user SQLite desktop app
- COALESCE chain in armyLists.ts untouched — tier points flow via units.points update at application layer
- useActivateLoadout invalidates ["army-lists"] cache so ArmyListUnitRow picks up active loadout name
- No shadcn Checkbox: used native input[type=checkbox] with accent-primary for wargear toggles in LoadoutSection
- LoadoutSection uses Collapsible (inline) not Dialog — avoids Radix portal nesting per RESEARCH.md Pitfall 4
- TierManager/LoadoutSection are self-contained (own hooks, pass only unitId) — no state hoisting in CollectionPage
- Tier confirmation in ArmyListUnitRow uses useUpdateUnit (writes to units.points) not useUpdateArmyListUnit — COALESCE chain preserved without touching army_list_units.points_override (DELTA-01)
- Delta badge cleared by setPendingTierId(null) in onSuccess (Pitfall 5) — badge disappears immediately on confirm
- UnitSheet points Input uses HTML disabled (not readOnly) so React Hook Form excludes it from submit payload — no form handler changes needed

### Pending Todos

None.

### Open Blockers

None.

### Phase 35 Decisions (35-01)

- No new patterns introduced - all 4 fixes follow existing codebase conventions
- Cache invalidation symmetry enforced: if useCreate invalidates a key, useDelete must too

## Session Continuity

Last session: 2026-05-05T19:31:15.599Z
Stopped at: Completed 35-01-PLAN.md
Resume: Run `/gsd:plan-phase 30` to plan Grid Layout Foundation
