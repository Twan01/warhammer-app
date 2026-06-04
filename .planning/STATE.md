---
gsd_state_version: 1.0
milestone: v0.4.7
milestone_name: Wahapedia Pipeline & Full Data Import
status: planning
stopped_at: Phase 116 context gathered
last_updated: "2026-06-04T06:03:29.463Z"
last_activity: 2026-06-04 — Roadmap created for v0.4.7
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-04)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — with accurate canonical data and reliable backup/restore so local data is always recoverable
**Current focus:** v0.4.7 Wahapedia Pipeline & Full Data Import — Phase 116 next

## Current Position

Phase: 116 (Pipeline Foundation) — Not started
Plan: —
Status: Roadmap created, ready to plan Phase 116
Last activity: 2026-06-04 — Roadmap created for v0.4.7

```
Progress: [__________] 0% (0/5 phases)
```

## Performance Metrics

**Velocity (recent milestones):**

- v0.4.5: 7 plans across 4 phases (2 days)
- v0.4.2: 11 plans across 4 phases (single day)
- v0.4.0: 12 plans across 5 phases (3 days)
- v0.3.7: 6 plans across 3 phases (single day)
- v0.3.0: 9 plans across 4 phases (single day)
- v0.2.18: 14 plans across 7 phases (2 days)

## Accumulated Context

### Key Decisions (carried forward)

- Pre-built canonical unit database (not runtime sync) — eliminates fragile CSV fetch
- Single-database architecture — rules.db eliminated; all data in hobbyforge.db
- ON DELETE SET NULL for units.udb_unit_id — collection units survive re-import
- FK-based points resolution replacing synced_unit_points cache
- translations_fr.json overlay uses composite key format '${unit_id}:${name}' for abilities/weapons
- SUB_FACTION_MAP covers 17 entries: 11 SM chapters, 4 CSM warbands, 2 Aeldari sub-factions
- FTS5 rebuild includes sub_faction via COALESCE concatenation in keywords column
- Coverage badges use computed SQL query (live) not coverage-report.json (static)
- Gothic/Latin weapon names kept as-is in French — standard GW practice

### Key Context (v0.4.7)

- Wahapedia exports Datasheets_models_cost.csv with complete points data keyed by datasheet_id
- BSData XML only covers ~60% of Wahapedia units — structural limitation, not a matching issue
- Wahapedia CSVs have duplicate unit entries (e.g. SM Legends duplicates): legend column flags them
- Wahapedia also exports Stratagems.csv, Enhancements.csv, Detachment_abilities.csv
- Auto-download from wahapedia.ru/wh40k10ed/ — CSVs are pipe-delimited, UTF-8 with potential BOM
- BOM fix (PF-01) must land first — it is a prerequisite for all new CSV parsing
- `pnpm download:wahapedia` must be a separate command from the build (deterministic builds)
- Detachments must be parsed before stratagems/enhancements (FK prerequisite in schema)
- 5 UI stub locations to wire: DetachmentPicker, DetachmentRulesSection, StrategemsTab, RulesHubPage, LoadoutBuilderSheet
- Rust import expansion follows 4-point checklist per entity type: schema migration, JSON payload type, Rust INSERT block, TypeScript query/hook layer

### Pending Todos

None.

### Open Blockers

None.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 scope | EXT-01: Leader attachment targets | Deferred | v0.4.0 planning |
| v2 scope | ADV-01: Unit comparison view | Deferred | v0.4.0 planning |
| v2 scope | ADV-02: Faction overview page | Deferred | v0.4.0 planning |
| v2 scope | FR-EXT-01: French ability/weapon text | Deferred | v0.4.2 planning |
| v2 scope | FR-EXT-02: Full app UI translation | Deferred | v0.4.2 planning |
| v0.4.5 out of scope | EFA-01..03: Extended faction audits (22 remaining factions) | Future milestone | v0.4.5 planning |
| v0.4.7 out of scope | French translations for stratagems/enhancements | Future milestone | v0.4.7 planning |
| v0.4.7 out of scope | Sub-faction derivation from Wahapedia CSV | Future milestone | v0.4.7 planning |

## Session Continuity

Last session: 2026-06-04T06:03:29.457Z
Stopped at: Phase 116 context gathered
Resume file: .planning/phases/116-pipeline-foundation/116-CONTEXT.md
Resume: Start Phase 116 (Pipeline Foundation). Run `/gsd:plan-phase 116` to generate the execution plan.
