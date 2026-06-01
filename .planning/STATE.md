---
gsd_state_version: 1.0
milestone: v0.4.2
milestone_name: Unit Database 2.0 — Data Quality, Sub-factions & Integration
status: milestone_complete
stopped_at: Milestone complete (Phase 111 was final phase)
last_updated: 2026-06-01T12:56:54.080Z
last_activity: 2026-06-01
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 11
  completed_plans: 11
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-01)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via bundled canonical database for personal use, and reliable backup/restore so local data is always recoverable
**Current focus:** Planning next milestone

## Current Position

Phase: 111
Plan: Not started
Status: Milestone complete
Last activity: 2026-06-01

Progress: [██████████] 100%

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

- translations_fr.json overlay uses composite key format '${unit_id}:${name}' for abilities/weapons (name-based, not line_order)
- loadTranslationsFr() inlined in build-unit-db.ts (not exported from lib/); graceful degrade on missing/malformed file
- Step 10.5 overlay applied after all entity mutations and before JSON assembly — per RESEARCH Pitfall 5
- translations_fr.json added via .gitignore force-exception matching aliases.json pattern
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
| Phase 110-playbooktab-game-day-revival P01 | 12m | 1 tasks | 4 files |
| Phase 110 P03 | 15 | 2 tasks | 0 files |
| Phase 111 P02 | 15m | 2 tasks | 6 files |

## Session Continuity

Last session: 2026-06-01T12:44:31.790Z
Stopped at: Phase 111 Plan 01 complete — FR-02 overlay loading delivered
Resume file: None
Resume: Execute Phase 111 Plan 02 (locale-aware query layer)
