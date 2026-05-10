---
phase: 52-schema-data-layer-foundation
plan: "02"
subsystem: planning
tags: [points, design-doc, army-lists, future-milestone]
dependency_graph:
  requires: []
  provides: [points-import-design]
  affects: []
tech_stack:
  added: []
  patterns: []
key_files:
  created:
    - .planning/points-import-design.md
  modified: []
decisions:
  - "points_imports uses latest-wins model (INSERT OR REPLACE) with history in points_import_history — no point-in-time version stacking"
  - "COALESCE precedence: alu.points_override > pi.points > uo.points > u.points > 0"
  - "Both points tables live in hobbyforge.db (not rules.db) to survive rules re-syncs"
  - "faction_id in points_imports is Wahapedia text key (e.g. 'SM'), not integer factions.id"
metrics:
  duration: "3 minutes"
  completed: "2026-05-10"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 52 Plan 02: Points Import Design Summary

Points import design document created covering schema (two tables), versioning strategy, delta computation algorithm, COALESCE manual override precedence chain, and army list impact — satisfying ARMY-06 with implementation deferred to a future milestone.

## What Was Built

A single comprehensive design document at `.planning/points-import-design.md` covering all five required sections for the ARMY-06 requirement.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write points import design document | 9d7e306 | .planning/points-import-design.md |

## Key Design Decisions

### Points Storage Model

`points_imports` table in hobbyforge.db stores one row per `(unit_name, faction_id)` — the latest imported value. `INSERT OR REPLACE` overwrites on re-import. `points_import_history` records every batch with row counts and delta counts for the PTS-02 audit UI.

### COALESCE Precedence Chain

```
effective_points = COALESCE(alu.points_override, pi.points, uo.points, u.points, 0)
```

The per-list manual override (`alu.points_override`) is first — it always wins (PTS-04). Imported points (`pi.points`) is second. Unit-level override (`uo.points`) is third. Raw unit points (`u.points`) is last before the zero fallback.

### Database Placement

Both tables go in hobbyforge.db, not rules.db. This is critical because rules.db is fully wiped on every sync — imported points are user-generated data that must persist.

### faction_id Convention

`points_imports.faction_id` uses the Wahapedia text key (e.g., `"SM"`) consistent with `unit_overrides`, not the integer `factions.id` from hobbyforge.db. Allows `NULL` for globally-scoped imports.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `.planning/points-import-design.md` exists: FOUND
- Commit 9d7e306 exists: FOUND
- All 5 required sections present: ## Schema, ## Versioning, ## Delta Computation, ## Manual Override Interaction, ## Army List Impact
- ## Implementation Notes section present: FOUND
- `points_import_history` table definition: FOUND
- `UNIQUE (unit_name, faction_id)`: FOUND
- `COALESCE(alu.points_override`: FOUND
