---
gsd_state_version: 1.0
milestone: v2.6
milestone_name: Rules Sync 2.0 / Rules Data Hub
status: ready_to_plan
stopped_at: Roadmap created — Phase 42 ready to plan
last_updated: "2026-05-07T18:30:00.000Z"
last_activity: 2026-05-07 — v2.6 roadmap written (5 phases, 28 requirements mapped)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-07 after v2.6 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.6 Rules Sync 2.0 / Rules Data Hub — Phase 42: Architecture Audit

## Current Position

Phase: 42 of 46 (Architecture Audit) — first phase of v2.6
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-05-07 — Roadmap created, all 28 requirements mapped across phases 42–46

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed (v2.6): 0
- Prior milestone (v2.5): 12 plans across 5 phases

**By Phase (v2.6):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 42–46 | TBD | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions Carried Forward

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Cache invalidation symmetry: if useCreate invalidates a key, useDelete must too
- todayISO() from @/lib/dates is the single source of truth for date defaults
- **v2.6 critical**: Overrides MUST live in hobbyforge.db — rules.db is destroyed and re-inserted on every sync; any rw_* data in rules.db is lost on re-sync
- **v2.6 critical**: Cross-database FKs are not supported in SQLite; unit_overrides references units by unit_id in hobbyforge.db, not rules.db
- rules.db uses WAL mode + 10s busy_timeout (write-heavy during sync)
- Dual-query merge pattern (no ATTACH DATABASE) continues for cross-DB data

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-07T18:30:00.000Z
Stopped at: Roadmap written. Phase 42 is the first phase — it is a read-only audit producing an architecture note (no code changes). Run /gsd:plan-phase 42 to begin.
Resume: Run /gsd:plan-phase 42
