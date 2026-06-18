---
phase: 139-data-quality-at-scale
plan: "04"
subsystem: data-pipeline
tags: [audit, batch-2, french-translations, imperium, dat-02, dat-03]
dependency_graph:
  requires: [139-03]
  provides: [batch2-audit-confirmed, batch2-french-translations, all-25-factions-complete]
  affects:
    - scripts/data/translations_fr.json
    - scripts/data/coverage-report.json
    - src-tauri/data/unit_database.json
    - .planning/phases/139-data-quality-at-scale/reports/
tech_stack:
  added: []
  patterns: [composite-key-translations, curated-dictionary-approach, batch-audit-confirm]
key_files:
  created: []
  modified:
    - scripts/data/translations_fr.json
    - src-tauri/data/unit_database.json
    - scripts/data/coverage-report.json
decisions:
  - "All 9 batch-2 factions confirmed at 0 systematic issues — batch-1 pipeline fix (139-03) resolved all discrepancies across all 25 factions"
  - "UN faction has 2 source-limited unmatched units (Imperial Fortress Walls id:000000785, Castellum Stronghold id:000002807) — these exist in Wahapedia CSV but not matched in UDB; accepted as source-limited"
  - "French translations use same curated approach as batch-1: unit names hand-curated, abilities+weapons via EN->FR dictionaries applied to matching DB entries"
  - "No machine-translation runtime dependency; all FR content is static in translations_fr.json"
  - "gen-batch2-translations.mjs helper script not committed (one-time use, same pattern as batch-1)"
metrics:
  duration: ~20 minutes
  completed: "2026-06-18"
  tasks: 2
  files: 56
---

# Phase 139 Plan 04: Batch-2 Audit Confirmation + French Extension (Imperium) Summary

**One-liner:** Confirmed all 9 batch-2 Imperium factions (AM/GK/AC/AS/AdM/AoI/LoV/TL/UN) audit at 0 systematic errors, then added curated French translations for 362 units, 74 abilities, and 1087 weapons covering all 25 factions — completing DAT-02 and DAT-03.

## What Was Built

### Task 1: Triage batch-2 audit findings — confirm systematic discrepancies at zero

Investigation of all 9 batch-2 faction audit reports confirmed the finding from the plan-specific notes: the batch-1 pipeline fix (position+name match guard + category-aware dedup in audit-faction.ts, committed in 139-03 as `ca89865e`) had already resolved all errors across all 25 factions. No new pipeline fixes were needed.

**Batch-2 faction confirmation results:**

| Faction | Units Matched | Per-unit Errors | Systematic Issues |
|---------|--------------|-----------------|-------------------|
| AM (Astra Militarum) | 134 | 0 | 0 |
| GK (Grey Knights) | 31 | 0 | 0 |
| AC (Adeptus Custodes) | 31 | 0 | 0 |
| AS (Adepta Sororitas) | 38 | 0 | 0 |
| AdM (Adeptus Mechanicus) | 39 | 0 | 0 |
| AoI (Agents of the Imperium) | 46 | 0 | 0 |
| LoV (Leagues of Votann) | 22 | 0 | 0 |
| TL (The Legion of the Damned) | 4 | 0 | 0 |
| UN (Unaligned) | 20 | 0 | 0 |

**UN faction note:** 2 unmatched units (`Imperial Fortress Walls` id:000000785 and `Castellum Stronghold` id:000002807) classified as `missing_alias` — these exist in the Wahapedia CSV but were not matched during the UDB build. This is a source-limited gap accepted as documented; no systematic bug.

`pnpm build:udb` exits 0, referential integrity: OK, `pnpm audit:all` all 25 factions at 0 systematic discrepancies. DAT-02 complete.

**Commit:** `384528c5`

### Task 2: Add French ability + weapon entries for batch-2 factions; final overlay + full-suite verification

Added curated French translations for all 9 batch-2 factions (AM, GK, AC, AS, AdM, AoI, LoV, TL, UN) to `scripts/data/translations_fr.json`.

**Approach:**

- Unit names: hand-curated per-faction dictionaries covering all 365 batch-2 unit IDs (362 new entries; 3 were already present from prior phases for AC)
- Faction names: added EC, TL, UN to the `factions` section (completing coverage of all 25 factions)
- Ability translations: EN→FR name dictionary (~100+ entries) applied to all batch-2 ability occurrences in unit_database.json via composite key `${unit_id}:${ability_name}`
- Weapon translations: EN→FR name dictionary (~200 entries) applied to all batch-2 weapon occurrences via composite key `${unit_id}:${weapon_name}`

**Translation counts added:**
- Unit names: +362 (AM: 134, GK: 31, AC: 28, AS: 38, AdM: 39, AoI: 46, LoV: 22, TL: 4, UN: 20)
- Abilities: +74 (common Imperium ability names matched across batch-2 unit instances)
- Weapons: +1087 (common weapon names matched across batch-2 weapon instances)

**Before/after overlay counts:**
| Field | Before (batch-1) | After (batch-2 added) |
|-------|-----------------|----------------------|
| Factions | 22 | 25 |
| Units | 1248 | 1610 |
| Abilities | 1033 | 1107 |
| Weapons | 4530 (matched in UDB) | 5628 (matched in UDB) |

`pnpm build:udb` logs: `French overlay: 25 factions, 1610 units, 1107 abilities, 5628 weapons, 0 keywords translated`

All counts strictly greater than batch-1-only build — composite keys resolved correctly against real DB rows.

Full test suite: **316 test files passed, 6 skipped** (pre-existing skips, no regressions).

**Commit:** `abc9ef4e`

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

**No pipeline fixes needed (expected by plan-specific notes):** The plan correctly anticipated that batch-2 factions would confirm at 0 errors after the batch-1 audit fix. Task 1 was a verification exercise, not a correction exercise. The 139-03 position+name match guard resolved all 806 baseline false-positive errors across all 25 factions.

**gen-batch2-translations.mjs:** One-time helper script used to generate translations_fr.json additions. Created at `scripts/gen-batch2-translations.mjs` but NOT committed (same pattern as batch-1 `gen-batch1-translations.mjs`).

## Known Stubs

None. All tasks produced complete artifacts. The generation script is a one-time helper and was NOT committed to the repository.

## Threat Flags

None — this plan adds no new network endpoints, auth paths, file access patterns, or schema changes. The French translations overlay is a static JSON file merged at build time.

## Self-Check: PASSED

Files verified:
- [FOUND] scripts/data/translations_fr.json (modified — +362 units +74 abilities +1087 weapons)
- [FOUND] src-tauri/data/unit_database.json (regenerated via pnpm build:udb per D-04)
- [FOUND] scripts/data/coverage-report.json (regenerated via pnpm build:udb)
- [FOUND] .planning/phases/139-data-quality-at-scale/reports/ (50 files — 25 × md + json, all updated)

Commits verified:
- 384528c5 chore(139-04): confirm batch-2 audit — all 25 factions at 0 systematic errors (DAT-02)
- abc9ef4e feat(139-04): add batch-2 French translations for 9 Imperium factions (DAT-03)

Acceptance criteria:
- [x] All 9 batch-2 faction reports: 0 systematic issues, 0 per-unit errors
- [x] All 25 factions audited with zero systematic discrepancies — DAT-02 complete
- [x] pnpm build:udb exits 0 (DAT-01 gate green)
- [x] pnpm build:udb logs ability + weapon counts > batch-1: 1107 abilities (was 1033), 5628 weapons (was 4530)
- [x] translations_fr.json contains new batch-2 composite-key ability objects and weapon strings
- [x] translations_fr.json preserves all batch-1 entries (additive only)
- [x] pnpm test (full suite) exits 0: 316 test files passed, 6 skipped
- [x] ls .planning/phases/139-data-quality-at-scale/reports/*-audit.md | wc -l = 25
- [x] src-tauri/tauri.conf.json NOT staged or committed (pre-existing dirty file)
- [x] unit_database.json NOT hand-edited (rebuilt via pnpm build:udb per D-04)
- [x] No unit Wahapedia id changed; no new migration file
- [x] DAT-02 + DAT-03 complete across all 25 factions
