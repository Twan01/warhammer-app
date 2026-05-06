---
gsd_state_version: 1.0
milestone: v2.4
milestone_name: Premium Dashboard UX & Visual Polish
status: completed
stopped_at: Completed 31-01-PLAN.md
last_updated: "2026-05-06T08:20:52.704Z"
last_activity: 2026-05-06 — 32-01 ArmyReadinessCard per-faction battle-ready points card shipped
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 10
  completed_plans: 5
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05 after v2.2 milestone completed)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.4 Premium Dashboard UX & Visual Polish — Phase 32 complete, Phase 33 next

## Current Position

Phase: 32 of 34 (Army Readiness Card) — COMPLETE
Plan: 1 of 1 complete
Status: Phase 32 complete — advance to Phase 33 (Data Intelligence)
Last activity: 2026-05-06 — 32-01 ArmyReadinessCard per-faction battle-ready points card shipped

Progress: [█████░░░░░] 57% (4/7 plans in v2.4)

## Accumulated Context

### Decisions from Phase 32

- INNER JOIN (not LEFT JOIN) in getArmyReadinessByFaction — factions with 0 units excluded from readiness card to keep it clean
- useArmyReadinessTarget localStorage key: 'army-readiness:target'; ARMY_READINESS_TARGETS validates reads so corrupt values fall back to 2000
- FactionRow progress bar capped at 100% via Math.min even when points_painted > target; text still shows actual number for transparency
- ArmyReadinessCard added below RecentActivityFeed in flex-col gap-6 wrapper in populated and loading states
- DashboardPage test mocks updated to include getArmyReadinessByFaction when mocking @/db/queries/dashboard

### Decisions from Phase 31

- Wave 0 test stubs (31-00): intentionally omit component imports — components do not exist yet; Plan 01/02 executors add imports when implementing components
- UnitThumbnail (31-01): Swords icon + full background color fallback — no text initials, no borderTop per locked CONTEXT.md decisions
- CurrentFocusCard v2 (31-01): StatusBadge + getNextActionHint removed — progress bar + percentage + metadata row is more compact and sufficient
- Photo wiring (31-01): useLatestUnitPhotos called once in DashboardPage, passed as prop — never inside CurrentFocusCard (Pitfall 2)
- logDefaultUnitId (31-01): reset to undefined in LogSessionSheet onClose (Pitfall 3); header Log Session button also resets to prevent stale pre-selection

### Decisions from Phase 30

- CSS grid migration (30-01) executed atomically — all 4 DashboardPage render branches updated in a single commit per v2.4 constraint
- StatCard `to` prop: useNavigate called unconditionally (Rules of Hooks); interactive behavior gated by `interactiveProps` conditional object spread, not conditional hook call
- Hobby Health StatCards intentionally have no `to` prop — passive metrics, not navigation shortcuts
- Loading skeleton fully restructured to mirror the bento grid columns to prevent layout shift on data load
- Route used for Active Projects: `/painting-projects` (not `/projects` — route confirmed via router.tsx)
- HobbyPipeline 5-bucket palette (muted/slate/violet/emerald/battle-gold) co-located in HobbyPipeline.tsx, not imported from status-badge.tsx, because it differs from the 4-tier StatusBadge palette
- HobbyPipeline bucket grouping: BUCKET_GROUPS Record maps bucket label to PaintingStatus[]; BUCKET_ORDER drives render; flex+flex-1 ensures equal width without wrapping

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

### Decisions Carried from v2.2

- weapon_name stored as TEXT copy in unit_loadout_wargear — cross-database FK to rules.db not supported in SQLite
- COALESCE chain in armyLists.ts — tier points flow via units.points update, army lists pick up automatically
- Cache invalidation symmetry: if useCreate invalidates a key, useDelete must too
- todayISO() from @/lib/dates is the single source of truth for date defaults (local timezone, not UTC)
- TierManager/LoadoutSection are self-contained (own hooks, pass only unitId)
- LoadoutSection uses Collapsible (inline) not Dialog — avoids Radix portal nesting

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-06T08:20:52.702Z
Stopped at: Completed 31-01-PLAN.md
Resume: Execute Phase 33 (Data Intelligence)
