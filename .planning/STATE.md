---
gsd_state_version: 1.0
milestone: v0.4.2
milestone_name: Unit Database 2.0 — Data Quality, Sub-factions & Integration
status: executing
last_updated: "2026-06-01"
last_activity: 2026-06-01
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
  percent: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-01)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via bundled canonical database for personal use, and reliable backup/restore so local data is always recoverable
**Current focus:** v0.4.2 Phase 108 — Build Script Hardening & Schema Foundation

## Current Position

Phase: 108 of 111 (Build Script Hardening & Schema Foundation)
Plan: 2 of 3 (108-02 next)
Status: Executing
Last activity: 2026-06-01 — Completed 108-01 (shared lib extraction, determinism, normalization)

Progress: [#░░░░░░░░░] 8%

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
Stopped at: Completed 108-01 (shared lib extraction, determinism)
Resume file: .planning/phases/108-build-script-hardening-schema-foundation/108-02-PLAN.md
Resume: Continue Phase 108 with /gsd:execute-phase 108
