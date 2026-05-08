---
gsd_state_version: 1.0
milestone: v2.6
milestone_name: Rules Sync 2.0 / Rules Data Hub
status: executing
stopped_at: Completed 44-01-PLAN.md
last_updated: "2026-05-08T07:34:22.409Z"
last_activity: 2026-05-08 — Phase 44 Plan 01 complete (SYNC-01, SYNC-03, SYNC-04)
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 5
  completed_plans: 3
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-07 after v2.6 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.6 Rules Sync 2.0 / Rules Data Hub — Phase 44: Sync Pipeline Hardening

## Current Position

Phase: 44 of 46 (Sync Pipeline Hardening)
Plan: 01 complete (sync pipeline foundations: SyncResult, validateCsvHeaders, syncErrors)
Status: In Progress
Last activity: 2026-05-08 — Phase 44 Plan 01 complete (SYNC-01, SYNC-03, SYNC-04)

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed (v2.6): 0
- Prior milestone (v2.5): 12 plans across 5 phases

**By Phase (v2.6):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 42–46 | TBD | - | - |

*Updated after each plan completion*
| Phase 42-architecture-audit P01 | 3 | 1 tasks | 1 files |
| Phase 44 P01 | 13m | 3 tasks | 6 files |
| Phase 43-extended-rules-read-layer P01 | 678 | 2 tasks | 5 files |

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
- **Phase 44**: SyncResult uses pub field visibility for Tauri IPC serde::Serialize serialization
- **Phase 44**: rw_datasheet_keywords INSERT uses INSERT OR IGNORE (matches all other tables, prevents duplicates)
- **Phase 44**: sync_errors migration is version 15 in hobbyforge.db get_migrations() (separate from rules migrations)
- **Phase 44**: validateCsvHeaders uses map-based REQUIRED_HEADERS record rather than per-file functions

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-08T07:34:22.406Z
Stopped at: Completed 43-01-PLAN.md
Resume: Run /gsd:plan-phase 42
