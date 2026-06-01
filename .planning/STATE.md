---
gsd_state_version: 1.0
milestone: v0.4.2
milestone_name: Unit Database 2.0 — Data Quality, Sub-factions & Integration
status: executing
stopped_at: Phase 110 UI-SPEC approved
last_updated: "2026-06-01T10:37:58.849Z"
last_activity: 2026-06-01 — Completed 108-03 (migration 041, Rust import, coverage UI)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-01)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via bundled canonical database for personal use, and reliable backup/restore so local data is always recoverable
**Current focus:** v0.4.2 Phase 109 — Sub-faction Filter UI

## Current Position

Phase: 109 of 111 (Sub-faction Filter UI)
Plan: 1 of 2 (109-01 next)
Status: Ready to execute
Last activity: 2026-06-01 — Phase 109 planned (2 plans, 2 waves)

Progress: [###░░░░░░░] 25%

## Performance Metrics

**Velocity (recent milestones):**

- v0.4.0: 12 plans across 5 phases (3 days)
- v0.3.7: 6 plans across 3 phases (single day)
- v0.3.0: 9 plans across 4 phases (single day)
- v0.2.18: 14 plans across 7 phases (2 days)
- v0.2.15: 11 plans across 5 phases (2 days)
- v0.2.14: 11 plans across 5 phases (2 days)

## Accumulated Context

### Key Decisions (v0.4.2)

- SUB_FACTION_MAP covers 17 entries: 11 SM chapters, 4 CSM warbands, 2 Aeldari sub-factions
- aliases.json starts empty; populated iteratively after coverage analysis
- Added .gitignore exception for aliases.json since scripts/data/ is globally ignored
- BSData Library .cat files must be included -- contain all points for AM/AE/CD/QT/QI/TL
- Cross-faction matching for Drukhari (BSData AE -> Wahapedia DRU)
- 85% Wahapedia coverage unachievable: BSData covers 62% of datasheets; match rate is 96.9%
- 44 aliases for singular/plural and variant name mismatches
- FTS5 rebuild includes sub_faction via COALESCE concatenation in keywords column
- Coverage badges use computed SQL query (live) not coverage-report.json (static)

### Key Decisions (v0.4.0 — carried forward)

- Pre-built canonical unit database (not runtime sync) — eliminates fragile CSV fetch
- Single-database architecture — rules.db eliminated; all data in hobbyforge.db
- ON DELETE SET NULL for units.udb_unit_id — collection units survive re-import
- FK-based points resolution replacing synced_unit_points cache

### Key Constraints (v0.4.2 — from research)

- Sub-factions: denormalized `sub_faction TEXT` on `udb_units` only — new `udb_factions` rows break FK backfill and army list joins
- FTS5 cannot ALTER — must DROP+CREATE with import trigger or pipe French names into existing column
- French `_fr` fields must travel in `unit_database.json` with `#[serde(default)]` in Rust or re-import wipes them
- Game Day OPG keys must be `unit_id:ability_name` composites — AUTOINCREMENT IDs reassigned on re-import
- Build script: apply `files.sort()` to both `build-unit-database.ts` and `update-unit-database.ts`

### Pending Todos

None.

### Open Blockers

None.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 scope | EXT-01: Leader attachment targets | Deferred | v0.4.0 planning |
| v2 scope | EXT-02: Enhancement data per faction | Deferred | v0.4.0 planning |
| v2 scope | EXT-03: Stratagems in canonical DB | Deferred | v0.4.0 planning |
| v2 scope | ADV-01: Unit comparison view | Deferred | v0.4.0 planning |
| v2 scope | ADV-02: Faction overview page | Deferred | v0.4.0 planning |
| v2 scope | FR-EXT-01: French ability/weapon text | Deferred | v0.4.2 planning |
| v2 scope | FR-EXT-02: Full app UI translation | Deferred | v0.4.2 planning |

## Session Continuity

Last session: 2026-06-01
Stopped at: Phase 109 planned — 2 plans ready to execute
Resume file: .planning/phases/109-sub-faction-filter-ui/109-01-PLAN.md
Resume: Execute Phase 109 with /gsd:execute-phase 109
