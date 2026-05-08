---
gsd_state_version: 1.0
milestone: v2.6
milestone_name: Rules Sync 2.0 / Rules Data Hub
status: executing
stopped_at: Completed 45-02-PLAN.md
last_updated: "2026-05-08T08:47:12.084Z"
last_activity: 2026-05-08 — Phase 45 Plan 01 complete (META-01, META-02, META-03, META-04, META-05, META-06)
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 7
  completed_plans: 7
  percent: 86
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-07 after v2.6 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.6 Rules Sync 2.0 / Rules Data Hub — Phase 45: Sync Metadata Import Tracking

## Current Position

Phase: 45 of 46 (Sync Metadata Import Tracking)
Plan: 01 complete (data infrastructure: migrations, Rust upsert, TypeScript types, snapshot module, freshness utility)
Status: In Progress
Last activity: 2026-05-08 — Phase 45 Plan 01 complete (META-01, META-02, META-03, META-04, META-05, META-06)

Progress: [█████████░] 86%

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
| Phase 44 P02 | 8m | 2 tasks | 3 files |
| Phase 43 P02 | 15 | 2 tasks | 2 files |
| Phase 45 P01 | 271 | 2 tasks | 9 files |
| Phase 45 P02 | 9 | 3 tasks | 4 files |

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
- **Phase 44 P02**: mock.calls tuple types in tests use array types (T[]) not tuple types ([T]) for TypeScript strictness
- **Phase 44 P02**: vi.hoisted() used for test mocks referenced in vi.mock factories to avoid hoisting ReferenceError
- **Phase 44 P02**: PlaybookTab toast shows 5 key table counts (datasheets, stratagems, abilities, wargear, keywords) not all 11
- **Phase 43 P02**: DetachmentSection is a proper React component (not an inline map callback) to call useDetachmentAbilitiesByDetachment unconditionally — required by React hook rules
- **Phase 43 P02**: ExtendedAbilityEntry structurally typed { name, description } rather than widening existing AbilityEntry (which is typed to RwDatasheetAbility) — avoids coupling two unrelated data types
- **Phase 45 P01**: rules_snapshot table lives in hobbyforge.db (not rules.db) — rules.db is wiped on every sync, snapshot data must survive
- **Phase 45 P01**: cleanOldSnapshots retains 3 most recent snapshot groups (11 rows each) to bound table growth
- **Phase 45 P01**: Composite-PK tables (rw_datasheet_models, rw_datasheet_abilities, rw_datasheet_keywords, rw_datasheets_wargear) store COUNT(*) only with null snapshot_data — no single-column id
- **Phase 45 P01**: Rust upsert casts SyncResult u64 fields to i64 for sqlx binding (SQLite INTEGER type)
- **Phase 45 P01**: getSyncFreshness thresholds — <7 days = fresh, 7-14 = aging, >=14 = stale (based on Wahapedia weekly update cadence)
- **Phase 45 P01**: useSyncErrors uses staleTime: 0 — error list must reflect latest state after every failed sync

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-08T08:41:18.847Z
Stopped at: Completed 45-02-PLAN.md
Resume: Run /gsd:plan-phase 42
