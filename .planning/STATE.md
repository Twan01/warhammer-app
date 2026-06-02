---
gsd_state_version: 1.0
milestone: v0.4.5
milestone_name: Data Quality Audit & Pipeline Improvement
status: executing
stopped_at: Phase 112 context gathered
last_updated: "2026-06-02T20:51:06.057Z"
last_activity: 2026-06-02
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore so local data is always recoverable
**Current focus:** Phase 112 — Build Pipeline Hardening

## Current Position

Phase: 112 (Build Pipeline Hardening) — EXECUTING
Plan: 2 of 2
Status: Ready to execute
Last activity: 2026-06-02

```
[░░░░░░░░░░░░░░░░░░░░] 0% — 0/4 phases complete
```

## Performance Metrics

**Velocity (recent milestones):**

- v0.4.2: 11 plans across 4 phases (single day)
- v0.4.0: 12 plans across 5 phases (3 days)
- v0.3.7: 6 plans across 3 phases (single day)
- v0.3.0: 9 plans across 4 phases (single day)
- v0.2.18: 14 plans across 7 phases (2 days)
- v0.2.15: 11 plans across 5 phases (2 days)

## Accumulated Context

### Key Decisions (v0.4.2 — carried forward)

- translations_fr.json overlay uses composite key format '${unit_id}:${name}' for abilities/weapons (name-based, not line_order)
- loadTranslationsFr() inlined in build-unit-db.ts (not exported from lib/); graceful degrade on missing/malformed file
- Step 10.5 overlay applied after all entity mutations and before JSON assembly — per RESEARCH Pitfall 5
- translations_fr.json added via .gitignore force-exception matching aliases.json pattern
- SUB_FACTION_MAP covers 17 entries: 11 SM chapters, 4 CSM warbands, 2 Aeldari sub-factions
- aliases.json starts empty; populated iteratively after coverage analysis
- Added .gitignore exception for aliases.json since scripts/data/ is globally ignored
- BSData Library .cat files must be included — contain all points for AM/AE/CD/QT/QI/TL
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

### Key Constraints (v0.4.5 — from requirements)

- Data audit approach: cross-check against Wahapedia, GW app, and community sources — not automated
- Pipeline fixes must be in build script code, not in aliases.json where possible (PFX-01/02 vs PFX-03)
- Sub-faction filter: use `sub_faction IS NULL` to identify parent faction generic units (existing column)
- French translation source: manual translations_fr.json overlay — no automated source exists
- Audit order: SM first (largest faction), then Necrons, then Death Guard

### Pending Todos

None — roadmap complete, ready to plan Phase 112.

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
| v0.4.5 out of scope | EFA-01..03: Extended faction audits (22 remaining factions) | Future milestone | v0.4.5 planning |

## Session Continuity

Last session: 2026-06-02T20:51:06.051Z
Stopped at: Phase 112 context gathered
Resume file: None
Resume: Run `/gsd:plan-phase 112` to create the execution plan for Phase 112
