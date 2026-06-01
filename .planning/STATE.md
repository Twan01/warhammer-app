---
gsd_state_version: 1.0
milestone: v0.4.2
milestone_name: Unit Database 2.0 — Data Quality, Sub-factions & Integration
status: planning
last_updated: "2026-06-01T08:52:08.255Z"
last_activity: 2026-06-01
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-01)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with official points via bundled canonical database for personal use, and reliable backup/restore so local data is always recoverable
**Current focus:** v0.4.0 archived — planning next milestone

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-06-01 — Milestone v0.4.2 started

## Performance Metrics

**Velocity (recent milestones):**

- v0.4.0: 12 plans across 5 phases (3 days)
- v0.3.7: 6 plans across 3 phases (single day)
- v0.3.0: 9 plans across 4 phases (single day)
- v0.2.18: 14 plans across 7 phases (2 days)
- v0.2.15: 11 plans across 5 phases (2 days)
- v0.2.14: 11 plans across 5 phases (2 days)

## Accumulated Context

### Key Decisions (v0.4.0)

- Pre-built canonical unit database (not runtime sync) — eliminates fragile Wahapedia CSV fetch
- Reuse Wahapedia string IDs for udb_units — existing annotations survive
- ON DELETE SET NULL for units.udb_unit_id — collection units survive re-import
- FK-based points resolution replacing synced_unit_points cache
- Single-database architecture — rules.db eliminated
- Inline stub pattern for deferred features (stratagems, detachments, shared abilities)

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

## Session Continuity

Last session: 2026-06-01T12:00:00Z
Stopped at: v0.4.0 milestone archived
Resume file: None
Resume: Start next milestone with /gsd:new-milestone
