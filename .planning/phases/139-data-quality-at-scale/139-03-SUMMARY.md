---
phase: 139-data-quality-at-scale
plan: "03"
subsystem: data-pipeline
tags: [audit, batch, false-positive-fix, french-translations, xenos, chaos]
dependency_graph:
  requires: [139-02]
  provides: [batch1-audit-fix, batch1-french-translations, all-25-factions-zero-errors]
  affects:
    - scripts/audit-faction.ts
    - scripts/data/translations_fr.json
    - scripts/data/coverage-report.json
    - src-tauri/data/unit_database.json
tech_stack:
  added: []
  patterns: [position-name-match-guard, category-aware-name-dedup, composite-key-translations, curated-dictionary-approach]
key_files:
  created: []
  modified:
    - scripts/audit-faction.ts
    - scripts/data/translations_fr.json
    - src-tauri/data/unit_database.json
    - scripts/data/coverage-report.json
decisions:
  - "All 806 pre-fix audit errors across batch-1 factions were FALSE POSITIVES in audit comparison logic, not genuine DB errors"
  - "Audit fix: position match now requires name agreement (prevents cross-name collision on shared line/line_in_wargear slots)"
  - "Audit fix: added category-aware name fallback (handles duplicate weapon names like Corrupted stave Melee vs Ranged)"
  - "French translations use curated name-map approach: unit names hand-curated per faction, abilities+weapons via EN->FR dictionaries applied to all matching DB entries"
  - "No machine-translation runtime dependency; all FR content is static in translations_fr.json"
metrics:
  duration: ~35 minutes
  completed: "2026-06-18"
  tasks: 2
  files: 4
---

# Phase 139 Plan 03: Batch-1 Audit Correction + French Extension (Xenos+Chaos) Summary

**One-liner:** Fixed 806 false-positive audit errors across all 25 factions by improving weapon-matching logic in audit-faction.ts, then added curated French translations for 812 units, 365 abilities, and 2052 weapons covering all 13 Xenos+Chaos factions.

## What Was Built

### Task 1: Triage batch-1 audit findings — fix systematic discrepancies

Investigation revealed all 806 "errors" from the 139-02 baseline reports were FALSE POSITIVES caused by two edge cases in the audit weapon-matching logic in `scripts/audit-faction.ts`.

**Root cause 1 — Position collision (WE/CSM/TS Fellblade crew, GC borrowed units)**

The original position match used only `(line + line_in_wargear)` without verifying the weapon name agreed. This caused:
- Fellblade crew "Combi-weapon" (CSV `line=1, line_in_wargear=1`) to match vehicle weapons (DB `weapon_group=1, line_order=1`) by position alone — comparing Combi-weapon stats against unrelated vehicle weapon stats, generating false mismatches
- GC borrowed units (Cadian Command Squad, etc.) where always-available weapons (CSV `line=""` → DB `weapon_group=1`) collided with Bolt pistol at `line=1`

**Root cause 2 — Duplicate weapon name dedup failure (CD/QT Fellgor Beastmen)**

Two weapons named "Corrupted stave" exist (one Melee, one Ranged). The name-only `.find()` fallback always returned the first match (Melee version), causing false mismatches when comparing the Ranged version.

**Fix applied in `scripts/audit-faction.ts` weapon comparison loop:**

Three-tier matching cascade:
1. Position match `(line + line_in_wargear + name)` — requires all three to agree; prevents cross-name collisions
2. Category-aware name fallback `(name + category)` — handles duplicate names by type; disambiguates "Corrupted stave Melee" from "Corrupted stave Ranged"
3. Name-only fallback — legacy behavior for genuinely unique weapon names

**Result:** All 25 factions audit at 0 per-unit errors and 0 systematic issues. The 806 baseline errors are fully resolved. DAT-01 gate green (`pnpm build:udb` exits 0, fk-integrity.test.ts all 4 tests pass).

**Commit:** `ca89865e`

### Task 2: Add French ability + weapon entries for batch-1 factions

Added curated French translations for all 13 batch-1 factions (TYR, ORK, TAU, AE, DRU, CD, WE, EC, CSM, TS, GC, QI, QT) to `scripts/data/translations_fr.json`.

**Approach:**

- Unit names: hand-curated per-faction dictionaries covering all ~912 batch-1 unit IDs (812 new entries added; 100 were already present from prior phases)
- Ability translations: EN→FR name dictionary (~120 entries) applied to all batch-1 ability occurrences in unit_database.json via composite key `${unit_id}:${ability_name}`
- Weapon translations: EN→FR name dictionary (~150 entries) applied to all batch-1 weapon occurrences via composite key `${unit_id}:${weapon_name}`

**Translation counts added:**
- Unit names: +812 (TYR: 57, ORK: 87, TAU: 63, AE: 97, DRU: 47, CD: 105, WE: 58, EC: 23, CSM: 112, TS: 60, GC: 138, QI: 28, QT: 37)
- Abilities: +365 (unique ability names matched across all batch-1 unit instances)
- Weapons: +2052 (common weapon names matched across all batch-1 unit instances)

**Before/after overlay counts:**
| Field | Before | After |
|-------|--------|-------|
| Units | 436 | 1248 |
| Abilities | 668 | 1033 |
| Weapons | 2471 | 4506 (overlay file) / 4530 (matched in UDB) |

`pnpm build:udb` logs: `French overlay: 22 factions, 1248 units, 1033 abilities, 4530 weapons, 0 keywords translated`

Both counts are non-zero — composite keys resolved correctly against real DB rows.

**Commit:** `7a5ec2b8`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] All batch-1 audit errors were false positives (weapon-matching edge cases)**

- **Found during:** Task 1 — deep investigation of WE/CSM/TS (87 errors each) and GC (434 errors)
- **Issue:** `scripts/audit-faction.ts` weapon comparison used position-only match (`line + line_in_wargear`) without name verification. CSV crew weapons and DB vehicle weapons shared the same `(1,1)` position slot, causing spurious stat comparisons. Additionally, duplicate weapon names (`Corrupted stave` Melee vs Ranged) caused the name fallback to always return the wrong entry.
- **Fix:** Three-tier match cascade: (1) position+name, (2) name+category, (3) name-only. Applied to the weapon comparison loop in `scripts/audit-faction.ts` ~line 383.
- **Files modified:** `scripts/audit-faction.ts`
- **Commit:** `ca89865e`
- **Implication:** The DB data was already correct. No pipeline corrections needed. Plans 03/04 D-04 constraint (never hand-edit unit_database.json) was respected throughout.

**2. [Rule 3 - Blocking] ENAMETOOLONG on bash heredoc for large generation script**

- **Found during:** Task 2 setup — attempting to write the ~1000-line generation script via bash heredoc
- **Issue:** `node:uv_spawn` rejects process names longer than OS limit; the heredoc content exceeded the shell argument length limit
- **Fix:** Used the Write tool to create `scripts/gen-batch1-translations.mjs` directly, then executed via plain `node` (no `--experimental-strip-types` since TypeScript annotations were removed for plain .mjs)
- **Files modified:** `scripts/gen-batch1-translations.mjs` (one-time helper, not committed)

## Known Stubs

None. All tasks produced complete artifacts. The generation script (`gen-batch1-translations.mjs`) is a one-time helper and was NOT committed to the repository.

## Threat Flags

None — this plan adds no new network endpoints, auth paths, file access patterns, or schema changes. The French translations overlay is a static JSON file merged at build time.

## Self-Check: PASSED

Files verified:
- [FOUND] scripts/audit-faction.ts (modified — position+name match guard)
- [FOUND] scripts/data/translations_fr.json (modified — 812 units + 365 abilities + 2052 weapons added)
- [FOUND] src-tauri/data/unit_database.json (regenerated via pnpm build:udb)
- [FOUND] scripts/data/coverage-report.json (regenerated via pnpm build:udb)

Commits verified:
- ca89865e fix(139-03): improve audit weapon-matching accuracy (name+pos guard + category dedup)
- 7a5ec2b8 feat(139-03): add batch-1 French translations for 13 Xenos+Chaos factions

Acceptance criteria:
- [x] pnpm build:udb exits 0 (DAT-01 gate green)
- [x] fk-integrity.test.ts all 4 tests pass
- [x] pnpm build:udb logs non-zero abilities AND weapons counts: 1033 abilities, 4530 weapons
- [x] translations_fr.json contains new composite-key ability objects and weapon strings for batch-1 factions
- [x] Pre-existing translations preserved (factions: 22 unchanged, prior unit/ability/weapon entries intact)
- [x] src-tauri/tauri.conf.json NOT staged or committed (pre-existing dirty file)
- [x] unit_database.json NOT hand-edited (rebuilt via pnpm build:udb per D-04)
- [x] All 25 factions audit at 0 errors post-fix (audit comparison logic fixed, not DB data)
