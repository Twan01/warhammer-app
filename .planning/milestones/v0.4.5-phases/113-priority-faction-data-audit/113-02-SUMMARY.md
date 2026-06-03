---
phase: 113-priority-faction-data-audit
plan: 02
subsystem: build-pipeline
tags: [french-translations, data-quality, sm, nec, dg]
dependency_graph:
  requires: [113-01]
  provides: [french-translations-sm-nec-dg]
  affects: [unit-database-json, translations-fr-json]
tech_stack:
  added: []
  patterns: [composite-key-translation-overlay, curly-apostrophe-handling]
key_files:
  created: []
  modified:
    - scripts/data/translations_fr.json
    - src-tauri/data/unit_database.json
    - .planning/phases/113-priority-faction-data-audit/reports/sm-audit.json
    - .planning/phases/113-priority-faction-data-audit/reports/sm-audit.md
    - .planning/phases/113-priority-faction-data-audit/reports/nec-audit.json
    - .planning/phases/113-priority-faction-data-audit/reports/nec-audit.md
    - .planning/phases/113-priority-faction-data-audit/reports/dg-audit.json
    - .planning/phases/113-priority-faction-data-audit/reports/dg-audit.md
decisions:
  - Gothic/Latin weapon names (Crozius, Volkite, etc.) kept as-is in French -- standard GW practice
  - Curly apostrophes in Wahapedia data required separate handling pass for matching
  - Core/Faction ability types with empty names intentionally skipped per D-09
metrics:
  duration: 12m
  completed: 2026-06-03
---

# Phase 113 Plan 02: French Translations for SM/NEC/DG Summary

French translations for 433 matched units across Space Marines, Necrons, and Death Guard with 2454 weapon entries and 668 ability entries using established GW French terminology and composite key overlay format.

## What Was Done

### Task 1: Populate French unit name translations for SM, NEC, DG
- Added 433 unit name translations to translations_fr.json (298 SM + 64 NEC + 71 DG)
- Added 2454 weapon entries using composite key format `datasheet_id:weapon_name_en`
- Added 668 ability entries for Datasheet-type abilities with `name_fr` and null `description_fr`
- Used established French GW terminology: Capitaine, Aumonier, Archiviste, Apothicaire, etc.
- Handled curly apostrophe variants in weapon/ability names from Wahapedia data
- Preserved all existing entries (3 Custodes units, 22 faction names, 12 keywords, 1 ability, 1 weapon)
- **Commit:** 587af1d

### Task 2: Rebuild database and verify French translations applied
- Rebuilt unit_database.json via `build-unit-db.ts` -- French overlay applied successfully
- Verification: 298/298 SM, 64/64 NEC, 71/71 DG units have `name_fr` in output
- SM: 1897 weapons translated, NEC: 172, DG: 400
- Re-ran audit scripts for all 3 factions -- translation gaps dramatically reduced:
  - SM: 0 units (was 298), 2 weapons (was 1899), 174 abilities (was 643)
  - NEC: 0 units (was 64), 0 weapons (was 172), 38 abilities (was 139)
  - DG: 0 units (was 71), 1 weapon (was 401), 25 abilities (was 122)
- Remaining ability gaps are Core/Faction type abilities (intentionally skipped per plan)
- **Commit:** 48d8648

## Translation Coverage

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| SM unit name_fr | 0/298 | 298/298 | +298 |
| NEC unit name_fr | 0/64 | 64/64 | +64 |
| DG unit name_fr | 0/71 | 71/71 | +71 |
| SM weapon name_fr | 0/1899 | 1897/1899 | +1897 |
| NEC weapon name_fr | 0/172 | 172/172 | +172 |
| DG weapon name_fr | 0/401 | 400/401 | +400 |
| Total translations_fr entries | 8 | 3558 | +3550 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Curly apostrophe mismatch in weapon/ability names**
- **Found during:** Task 1
- **Issue:** Wahapedia data uses curly apostrophes (e.g., "Champion’s blade") but initial translation map used straight apostrophes
- **Fix:** Two-pass approach: initial generation + patch script to handle curly apostrophe variants
- **Files modified:** scripts/data/translations_fr.json
- **Commit:** 587af1d

## Decisions Made

1. **Gothic/Latin weapon names kept as-is:** Crozius arcanum, Volkite caliver/charger/culverin, Malleus Noctum, etc. are kept in their original form in French GW publications
2. **Core/Faction abilities excluded:** Empty-name abilities with ability_type Core or Faction are intentionally skipped per D-09 and plan instructions
3. **Remaining weapon gaps are empty-name entries:** 2 SM and 1 DG weapon gaps are empty-name entries that cannot be translated

## Self-Check: PASSED
