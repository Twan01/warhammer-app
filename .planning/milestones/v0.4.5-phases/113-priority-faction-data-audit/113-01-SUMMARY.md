---
phase: 113-priority-faction-data-audit
plan: 01
subsystem: build-pipeline
tags: [data-audit, quality, sm, nec, dg]
dependency_graph:
  requires: [112-02]
  provides: [faction-audit-reports]
  affects: [114-pipeline-fixes]
tech_stack:
  added: []
  patterns: [field-by-field-csv-comparison, unmatched-unit-classification, systematic-vs-per-unit-errors]
key_files:
  created:
    - scripts/audit-faction.ts
    - .planning/phases/113-priority-faction-data-audit/reports/sm-audit.json
    - .planning/phases/113-priority-faction-data-audit/reports/sm-audit.md
    - .planning/phases/113-priority-faction-data-audit/reports/nec-audit.json
    - .planning/phases/113-priority-faction-data-audit/reports/nec-audit.md
    - .planning/phases/113-priority-faction-data-audit/reports/dg-audit.json
    - .planning/phases/113-priority-faction-data-audit/reports/dg-audit.md
  modified: []
decisions:
  - Weapon matching uses line+line_in_wargear first, then fallback to name match
  - Unmatched classification uses known FW name set (not source_id, since legend column contains description text)
  - DG shared Chaos vehicles annotated with cross-faction evidence for Phase 114
metrics:
  duration: 5m
  completed: 2026-06-03
---

# Phase 113 Plan 01: Faction Audit Script & Reports Summary

Parameterized audit-faction.ts script comparing unit_database.json against Wahapedia CSV source data for SM/NEC/DG, producing 6 structured reports with systematic bug separation, unmatched classification, and translation gap counts.

## What Was Done

### Task 1: Build audit-faction.ts script (SM audit)
- Created `scripts/audit-faction.ts` -- parameterized Node.js script accepting faction_id CLI arg
- Loads unit_database.json, coverage-report.json, and 5 Wahapedia CSV files
- Detects systematic pipeline bugs before per-unit audit loop (weapon.range and weapon.keywords parsing bugs)
- Field-by-field comparison for matched units: role, model stats, weapons, abilities, keywords
- Classifies unmatched units as legends/forge_world/missing_alias/genuinely_missing
- Computes French translation gap counts for units, weapons, abilities
- Outputs JSON structured report + markdown human-readable summary
- **Commit:** 65d44b8

### Task 2: Run audit for NEC and DG factions
- Ran audit for NEC (64 units) and DG (71 units)
- NEC: 13 unmatched (7 FW, 6 missing_alias), 23 per-unit errors
- DG: 35 unmatched (26 FW/shared Chaos vehicles, 9 missing_alias), 5 per-unit errors
- DG correctly identifies 22 shared Chaos vehicles that exist in BSData under CSM
- **Commit:** 1e0dcc7

## Key Findings

### Systematic Pipeline Bugs (all 3 factions)
1. **weapon.range**: All weapons have empty range -- pipeline reads `row["Range"]` but CSV header is `range` (lowercase)
2. **weapon.keywords**: All weapons have empty keywords -- pipeline reads `row["keywords"]` but CSV field is `description`

### Per-Unit Error Summary
| Faction | Matched | Unmatched | Per-Unit Errors | Systematic Issues |
|---------|---------|-----------|-----------------|-------------------|
| SM | 298 | 125 | 23 | 2 |
| NEC | 64 | 13 | 23 | 2 |
| DG | 71 | 35 | 5 | 2 |

### Unmatched Classification
| Faction | Legends | Forge World | Missing Alias | Genuinely Missing |
|---------|---------|-------------|---------------|-------------------|
| SM | 3 | 43 | 79 | 0 |
| NEC | 0 | 7 | 6 | 0 |
| DG | 0 | 26 | 9 | 0 |

### French Translation Gaps
| Faction | Units Missing | Weapons Missing | Abilities Missing |
|---------|---------------|-----------------|-------------------|
| SM | 298 | 1899 | 643 |
| NEC | 64 | 172 | 139 |
| DG | 71 | 401 | 122 |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Unmatched classification via name patterns**: The `legend` CSV column contains description text (not a boolean flag), so Legends detection uses `(Legendary)` name suffix pattern instead
2. **Weapon matching strategy**: Uses line+line_in_wargear composite key with fallback to case-insensitive name matching for multi-profile weapons
3. **SM unmatched count is 125 (not 122)**: The plan text referenced an older estimate; the actual coverage-report.json has 125 unmatched SM names

## Self-Check: PASSED
