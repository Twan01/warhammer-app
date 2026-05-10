---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: milestone
status: executing
stopped_at: 53-01-PLAN.md complete
last_updated: "2026-05-10T19:27:13.543Z"
last_activity: "2026-05-10 — Plan 52-03 complete: query modules + hooks for favorites, notes, and detachment queries"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 6
  completed_plans: 4
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10 after v0.2.8 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Phase 53 — Rules Data Hub UI

## Current Position

Phase: 53 of 56 (Rules Data Hub UI)
Plan: 01 complete (1/3)
Status: In Progress
Last activity: 2026-05-10 — Plan 53-01 complete: Rules Hub page scaffold with sync status card, faction picker, tab shell, sidebar nav

Progress: [███████░░░] 67%

## Performance Metrics

**Velocity:**
- v0.2.7: 8 plans across 4 phases (single day)
- v0.2.6: 11 plans across 6 phases (single day)
- v0.2.5: 12 plans across 5 phases (single day)

## Accumulated Context

### Decisions Carried Forward

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- Migrations are append-only and immutable — new numbered file per change
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Cache invalidation symmetry: if useCreate invalidates a key, useDelete must too
- todayISO() from @/lib/dates is the single source of truth for date defaults
- User data (favorites, notes, detachment selection) MUST go in hobbyforge.db, never rules.db — rules.db is fully deleted on every sync
- ATTACH DATABASE not supported by tauri-plugin-sql — dual-query merge pattern always
- staleTime: Infinity + sync invalidation registration required for every new rules.db hook
- useWahapediaFactionId(faction.name) required for all rules-facing queries — passing integer returns empty array silently
- Game Day checklist state: Zustand persist (localStorage) — move to SQLite only if multi-session resumption is validated
- clearArmyListDetachment is separate from updateArmyList because COALESCE blocks NULL passthrough for explicit detachment clearing (52-01)
- detachment_name is denormalized onto army_lists to survive rules.db full wipe on re-sync (52-01)
- RULE_TYPES const array mirrors SQL CHECK constraint to enforce rule_type union at TypeScript level (52-01)
- points_imports uses latest-wins model (INSERT OR REPLACE) with history in points_import_history — no version stacking (52-02)
- COALESCE precedence for points: alu.points_override > pi.points > uo.points > u.points > 0 (52-02)
- points_imports.faction_id uses Wahapedia text key (e.g. 'SM'), not integer factions.id — consistent with unit_overrides (52-02)
- points tables live in hobbyforge.db (not rules.db) to survive rules re-syncs (52-02)
- useRulesFavorites optimistic updates use placeholder id=-1 for new entries; onSettled refetch brings real server data (52-03)
- useRulesSync.ts invalidates detachment-by-id and stratagems-by-detachment but NOT rules-favorites or rules-notes — hobbyforge.db survives rules wipe (52-03)
- COALESCE on INSERT OR REPLACE preserves created_at when replacing existing row by composite UNIQUE key (52-03)
- SyncDiff summary uses array .length counts (not scalar integers) since SyncDiff stores item arrays, not numeric totals (53-01)
- TooltipProvider must be included in test wrappers for any component using Radix Tooltip — jsdom throws without it (53-01)
- unknown cast required for UseQueryResult partial mocks: `as unknown as ReturnType<typeof hook>` (53-01)

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-10T19:27:13.540Z
Stopped at: 53-01-PLAN.md complete
Resume: Run /gsd:plan-phase 52
