---
phase: 108-build-script-hardening-schema-foundation
plan: 02
subsystem: build-pipeline
tags: [multi-pass-matching, sub-faction, coverage-report, aliases, french-locale]
dependency_graph:
  requires: [scripts-lib-modules, name-normalization, alias-table, sub-faction-map]
  provides: [multi-pass-matching, sub-faction-data, coverage-report, fr-null-placeholders, cross-faction-matching]
  affects: [build-unit-db, unit_database.json, update-unit-database]
tech_stack:
  added: []
  patterns: [three-pass-matching-cascade, cross-faction-alias, coverage-report-generation]
key_files:
  created:
    - scripts/data/coverage-report.json
  modified:
    - scripts/build-unit-db.ts
    - scripts/data/aliases.json
    - scripts/lib/factionMap.ts
    - scripts/lib/types.ts
    - scripts/update-unit-database.ts
    - src-tauri/data/unit_database.json
    - .gitignore
decisions:
  - "BSData Library .cat files must be included in parsing -- they contain all unit points data for AM, AE, CD, QT, QI, TL factions"
  - "Cross-faction matching added for Drukhari units in Aeldari Library (BSData maps to AE, Wahapedia uses DRU)"
  - "85% Wahapedia coverage target unachievable: BSData covers only 62% of Wahapedia datasheets (Legends, sub-entries, Crucible-only units)"
  - "BSData matching efficiency at 96.9% (1028/1061 matchable units) -- aliases are minimal and effective"
metrics:
  duration: "13 minutes"
  completed: "2026-06-01T10:03:39Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 7
  lines_added: 200
  lines_removed: 30
---

# Phase 108 Plan 02: Multi-Pass Matching, Sub-faction Mapping & Coverage Report Summary

Three-pass matching cascade (exact/normalized/alias) with cross-faction Drukhari support, sub-faction population from SUB_FACTION_MAP (222 units), coverage report generation, and _fr null placeholders on all entity types -- raising BSData match rate from 37% to 60.1% (96.9% of matchable BSData units).

## Task Completion

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Multi-pass matching, sub-faction mapping, coverage report, _fr fields | f073290 | scripts/build-unit-db.ts, scripts/lib/types.ts, scripts/lib/factionMap.ts |
| 2 | Populate aliases and coverage-report.json | 2642be1 | scripts/data/aliases.json, scripts/data/coverage-report.json, .gitignore |

## What Was Built

### Multi-Pass Matching (D-01)
- **matchUnit() function** -- three-pass cascade: exact lowercase, normalized (strip special chars/whitespace), alias table fallback
- **Cross-faction matching** -- CROSS_FACTION_MAP routes Aeldari Library units to Drukhari (DRU) faction for matching
- Match stats: 974 exact, 35 normalized, 44 alias matches

### Sub-faction Population (D-09/SF-01/SF-02)
- 222 units have sub_faction set from SUB_FACTION_MAP (11 SM chapters, 4 CSM warbands, 2 Aeldari sub-factions)
- Units from base catalogues correctly get sub_faction: null

### Coverage Report (D-04/DQ-01)
- Per-faction coverage table printed to console during build
- JSON artifact at scripts/data/coverage-report.json with per-faction stats and unmatched_units list
- Overall: 60.1% (1028/1711 units with points)
- BSData match efficiency: 96.9% (1028/1061 non-Crucible matchable units)

### _fr Null Placeholders (D-12)
- name_fr: null on factions, units, weapons
- name_fr + description_fr: null on abilities
- keyword_fr: null on keywords
- All fields present in output JSON, ready for Phase 111 population

### Library Catalogue Fix
- Removed filter that excluded BSData Library .cat files from parsing
- Library files contain ALL unit points data for AM, AE, CD, QT, QI, TL factions
- FACTION_MAP extended with 8 Library catalogue entries
- Also fixed in update-unit-database.ts for consistency

### Alias Table
- 44 manual aliases for singular/plural and variant name mismatches
- Examples: "Biovore" -> "Biovores", "Mek Gun w/ Smasha gun" -> "Mek Gunz"
- Table is minimal -- normalization handles most mismatches automatically

## Coverage Analysis

### Why 85% Is Not Achievable

| Metric | Value |
|--------|-------|
| Wahapedia datasheets | 1,711 |
| BSData units with points | 1,123 |
| BSData Crucible-only (no Wahapedia entry) | 62 |
| BSData matchable | 1,061 |
| Successfully matched | 1,028 |
| BSData match rate | 96.9% |
| Wahapedia coverage | 60.1% |
| Theoretical ceiling (if all BSData matched) | 62.0% |

The 683 unmatched Wahapedia units include:
- Legends variants without BSData points
- Faction cross-listings (e.g., GSC includes 13 Tyranid datasheets)
- Sub-entries and alternate configurations
- Units BSData simply doesn't have (older/obscure datasheets)

The 85% target in DQ-05 assumed BSData covered more Wahapedia datasheets. Actual coverage ceiling is ~62% regardless of matching quality.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Library .cat files were filtered out**
- **Found during:** Task 1
- **Issue:** `readBsdataCatFiles()` filtered `!f.includes("Library")`, excluding Library catalogues that contain ALL points data for AM, AE, CD, QT, QI, TL factions (causing 0% coverage for these factions)
- **Fix:** Removed Library filter; added 8 FACTION_MAP entries for Library catalogues
- **Files modified:** scripts/build-unit-db.ts, scripts/lib/factionMap.ts, scripts/update-unit-database.ts

**2. [Rule 2 - Critical] Cross-faction matching for Drukhari**
- **Found during:** Task 1
- **Issue:** BSData Aeldari Library contains Drukhari units mapped to faction "AE", but Wahapedia uses faction "DRU" -- causing 0% Drukhari coverage
- **Fix:** Added CROSS_FACTION_MAP and cross-faction fallback in matching loop
- **Files modified:** scripts/lib/factionMap.ts, scripts/build-unit-db.ts

**3. [Rule 3 - Blocking] .gitignore blocked coverage-report.json**
- **Found during:** Task 2
- **Issue:** scripts/data/ is globally gitignored, preventing coverage-report.json from being committed
- **Fix:** Added negation pattern `!scripts/data/coverage-report.json` to .gitignore
- **Files modified:** .gitignore

## Verification Results

- Build script completes without errors
- coverage-report.json exists with overall_coverage_pct = 60.1
- unit_database.json contains sub_faction values for 222 chapter-specific units
- unit_database.json contains _fr null placeholders on all entity types (factions, units, weapons, abilities, keywords)
- 44 alias mappings loaded and functional
- BSData matching efficiency at 96.9% (near-perfect for available data)

## Self-Check: PASSED
