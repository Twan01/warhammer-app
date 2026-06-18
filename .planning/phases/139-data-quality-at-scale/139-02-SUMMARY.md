---
phase: 139-data-quality-at-scale
plan: "02"
subsystem: data-pipeline
tags: [audit, batch, reimport, preservation, tdd]
dependency_graph:
  requires: [139-01]
  provides: [25-faction-baseline-reports, reimport-preservation-test]
  affects: [scripts/audit-faction.ts, package.json, tests/data-layer/reimport-preservation.test.ts]
tech_stack:
  added: []
  patterns: [batch-cli-mode, tdd-data-layer-test, in-memory-sqlite-test]
key_files:
  created:
    - tests/data-layer/reimport-preservation.test.ts
    - .planning/phases/139-data-quality-at-scale/reports/ (50 files — 25 × .md + .json)
  modified:
    - scripts/audit-faction.ts
    - package.json
decisions:
  - "Refactored main() into auditFaction() callable + new main() with --all loop; CSV loading stays per-faction call (correct, mildly slower in batch mode)"
  - "Open Question #1 RESOLVED: weapon.range and weapon.keywords systematic bugs are already fixed (0 systematic issues across all 25 factions)"
  - "TDD green-on-first-run: preservation guarantee was structurally correct; test documents and enforces it"
  - "25 baseline reports show 806 total per-unit errors across 1710 matched units (no systematic bugs — all residual per-unit/source-limited)"
metrics:
  duration: ~7 minutes
  completed: "2026-06-18"
  tasks: 3
  files: 54
---

# Phase 139 Plan 02: Audit Tooling Generalization + Baseline Reports + Re-Import Preservation Summary

**One-liner:** Generalized audit-faction.ts to all 25 factions with --all batch mode, generated 25 baseline audit reports under Phase 139, resolved the weapon systematic-bug open question (already fixed), and locked the user-data preservation guarantee with a passing data-layer test.

## What Was Built

### Task 1: audit-faction.ts generalization + audit:all script

- Expanded `FACTION_NAMES` from 3 entries (SM/NEC/DG) to all 25 factions
- Replaced hardcoded whitelist guard `!["SM","NEC","DG"].includes(factionId)` with dynamic check against `unit_database.json` factions array
- Refactored per-faction logic from `main()` into `auditFaction(factionId, udb, coverage, DATA_DIR, REPORTS_DIR)` callable function
- Added `--all` batch mode in new `main()`: iterates every faction from the artifact, calls `auditFaction()` in a loop
- Repointed `REPORTS_DIR` from `.planning/phases/113-priority-faction-data-audit/reports` to `.planning/phases/139-data-quality-at-scale/reports`
- Added optional `--output-dir=<path>` CLI flag for non-default output path
- Added `"audit:all": "node --experimental-strip-types scripts/audit-faction.ts --all"` to `package.json`

### Task 2: 25-faction baseline audit (pnpm audit:all)

- Rebuilt `unit_database.json` via `pnpm build:udb` (1710 units, 25 factions, all Phase 139 Plan 01 referential checks pass)
- Ran `pnpm audit:all` — 25 × `{faction}-audit.md` + `{faction}-audit.json` written to Phase 139 reports directory
- **Open Question #1 RESOLVED: The weapon.range and weapon.keywords systematic bugs from Phase 113 are ALREADY FIXED**
  - SM: 0 systematic issues, 0 per-unit errors (298 matched)
  - NEC: 0 systematic issues, 0 per-unit errors (64 matched)
  - DG: 0 systematic issues, 94 per-unit errors (71 matched)
  - No faction in the 25-faction run shows any systematic issues
- **Implication for Plans 03/04:** All 806 remaining errors are per-unit residual mismatches (weapon.category, weapon.attacks, ability.description) — not systematic pipeline bugs. No pipeline fix needed before the batch corrections begin.

**Top error-volume factions** (for Plans 03/04 batch sizing):
- DG: 94 per-unit errors
- WE: 87 per-unit errors
- CSM: 82 per-unit errors
- TS: 77 per-unit errors
- AM: 66 per-unit errors
- (SM, NEC, AC, AoI, TL: 0 errors)

### Task 3: reimport-preservation.test.ts (TDD)

Created `tests/data-layer/reimport-preservation.test.ts` with 5 tests:

1. `rules_favorites` survive DELETE-all+INSERT re-import
2. `rules_notes` survive DELETE-all+INSERT re-import
3. `unit_overrides` survive DELETE-all+INSERT re-import
4. `units.udb_unit_id` stays non-null when udb_unit re-inserted with same Wahapedia ID
5. Idempotency: second re-import also leaves all user rows intact

The test seeds udb_* rows (FK OFF), seeds user data in the three separate tables, simulates the lib.rs DELETE order (udb_leader_targets → udb_factions), re-inserts udb_* with same Wahapedia IDs, then asserts all user rows survive. All 5 tests pass.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All tasks produced complete, runnable artifacts. Reports are dev-side evidence files (not app-rendered).

## Threat Flags

None — this plan adds no new network endpoints, auth paths, file access patterns, or schema changes.

## Open Question #1 — Resolution

**Systematic bug status (RESOLVED):**

`weapon.range` (Phase 113: reads `row["Range"]` instead of `row["range"]`) — **FIXED** in a post-Phase-113 pipeline update. All 25 factions show `weaponsWithRange.length > 0`, confirming the fix.

`weapon.keywords` (Phase 113: reads `row["keywords"]` instead of `row["description"]`) — **FIXED** likewise. All 25 factions show `weaponsWithKeywords.length > 0`.

**Conclusion for Plans 03/04:** The 806 per-unit errors across 22 factions are residual per-unit/source-limited mismatches. Plans 03/04 should focus on `weapon.category` (Melee/Ranged classification) and `ability.description` (text formatting diffs) as the dominant residual error types. No pipeline-fix prerequisite for the correction batches.

## Self-Check: PASSED

Files created:
- [FOUND] tests/data-layer/reimport-preservation.test.ts
- [FOUND] .planning/phases/139-data-quality-at-scale/reports/ (25 .md + 25 .json)
- [FOUND] scripts/audit-faction.ts (modified)
- [FOUND] package.json (contains "audit:all")

Commits verified:
- 4347d28c feat(139-02): generalize audit-faction.ts to all 25 factions + --all batch mode
- 3711f423 chore(139-02): generate 25 baseline faction audit reports via pnpm audit:all
- 23d2be38 test(139-02): add reimport-preservation.test.ts — prove user tables survive udb_* DELETE/re-INSERT

Acceptance criteria:
- [x] `scripts/audit-faction.ts` no longer contains the `["SM", "NEC", "DG"]` whitelist literal
- [x] `node --experimental-strip-types scripts/audit-faction.ts AC` exits 0 and writes to Phase 139 reports dir
- [x] `REPORTS_DIR` resolves to Phase 139, NOT Phase 113
- [x] `package.json` contains `audit:all` script
- [x] No files written under Phase 113 reports directory
- [x] ≥25 .md and ≥25 .json reports present under Phase 139 reports dir
- [x] `pnpm build:udb` exits 0
- [x] `pnpm test -- tests/data-layer/reimport-preservation.test.ts` exits 0
- [x] `pnpm test -- tests/data-layer/` exits 0 (316 test files passed, no regressions)
- [x] SUMMARY records systematic_issues status for SM/NEC/DG (Open Question #1 resolved)
