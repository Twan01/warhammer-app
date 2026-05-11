---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: milestone
status: executing
stopped_at: Phase 54, Plan 02 complete
last_updated: "2026-05-11T07:01:35.375Z"
last_activity: "2026-05-11 — Plan 54-02 complete: DetachmentRulesSection, RemindersSection, wired into ArmyListDetailSheet"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-10 after v0.2.8 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** Phase 54 — Army Lists 2.0 / Detachment Selection

## Current Position

Phase: 54 of 56 (Army Lists 2.0 / Detachment Selection)
Plan: 02 complete (2/2) — Phase Complete
Status: In Progress
Last activity: 2026-05-11 — Plan 54-02 complete: DetachmentRulesSection, RemindersSection, wired into ArmyListDetailSheet

Progress: [██████████] 100%

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
- cp_cost comparison uses string equality (s.cp_cost === options.cpFilter) — TEXT in SQLite, never parse to number (53-02)
- Phase badge pattern: Badge variant=outline + border-transparent + custom Tailwind bg/text classes for color-coded phase chips (53-02)
- Filter chip toggle pattern: setFilter(activeFilter === chip ? null : chip) — clicking active chip deselects it (53-02)
- useDetachmentAbilitiesByDetachment called unconditionally inside DetachmentCard — each card is its own component instance, Rules of Hooks satisfied (53-03)
- Shared abilities search filters both name and legend fields — legend often contains category/type text users naturally search for (53-03)
- Loading skeleton applied uniformly to all three Rules Hub tabs for consistent UX (53-03)
- useWahapediaFactionId placed after faction useMemo in ArmyListDetailSheet to avoid temporal dead zone reference (54-01)
- StaleDataBanner uses inline ageDays > 30 check (not getSyncFreshness which uses 14-day threshold) (54-01)
- ArmyListsPage.test.tsx mock must include clearArmyListDetachment, datasheets, and rulesExtended when ArmyListDetailSheet is rendered (54-01)
- DetachmentRulesSection calls both hooks unconditionally — internal enabled guards satisfy Rules of Hooks (same pattern as DetachmentCard in 53-03) (54-02)
- RemindersSection is self-contained (no props) — fetches all favorites and filters to is_reminder=1 internally (54-02)

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-11T06:57:26.482Z
Stopped at: Phase 54, Plan 02 complete
Resume: Run /gsd:execute-phase 55 (next phase)
