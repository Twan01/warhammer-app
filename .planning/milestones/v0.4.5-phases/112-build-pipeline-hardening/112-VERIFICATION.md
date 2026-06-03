---
phase: 112-build-pipeline-hardening
verified: 2026-06-02T21:30:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 112: Build Pipeline Hardening — Verification Report

**Phase Goal:** The build script is production-grade — it reports coverage, builds deterministically, validates its own config, and fails loudly when data quality falls below threshold
**Verified:** 2026-06-02T21:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `matchUnit`, `readBsdataCatFiles`, `parseBsdataModelCounts`, and `readCsvFile` are importable from `scripts/lib/bsdata.ts` (D-04) | VERIFIED | File exists at `scripts/lib/bsdata.ts` with all four functions exported (lines 48, 67, 118, 148). Import statement confirmed in both consumer scripts. |
| 2 | `matchUnit` returns `MatchResult` (with `method` field) instead of plain `UdbUnitRow` (D-05) | VERIFIED | `bsdata.ts` defines `MatchResult = { unit: UdbUnitRow; method: MatchMethod }` (lines 33-36); `matchUnit` return type is `MatchResult | undefined` (line 153); all three passes return `{ unit, method }`. |
| 3 | `build-unit-db.ts` imports shared functions from `scripts/lib/bsdata.ts`; `loadTranslationsFr` stays local (D-06) | VERIFIED | Line 32 has the import. No local `readCsv`, `readBsdataCatFiles`, `parseBsdataModelCounts`, or `matchUnit` definitions remain (grep returned no matches). `loadTranslationsFr` defined locally at line 94. |
| 4 | `update-unit-database.ts` uses shared `matchUnit` with 3-pass matching instead of single-key lookup (D-05) | VERIFIED | Line 31 imports from `./lib/bsdata.ts`. `matchUnit()` called at lines 257 and 261 (cross-faction fallback). `loadAliases` imported (line 30). `SUB_FACTION_MAP`, `CROSS_FACTION_MAP` imported (line 29). No local `readCsv` or `readBsdataCatFiles` remains. |
| 5 | Running `pnpm build:udb` prints per-faction table with Matched/Exact/Norm/Alias columns (D-01) | VERIFIED | Coverage table header at lines 600-608 includes all columns; row output at lines 613-623 uses `matched_exact`, `matched_normalized`, `matched_alias`. |
| 6 | Running `pnpm build:udb` prints unmatched unit names grouped by faction (D-02) | VERIFIED | Lines 640-647: iterates `factionCoverages`, prints faction name + count, then each name with `"    - "` prefix. `unmatched_names` populated in `factionCoverages` at line 575. |
| 7 | Two consecutive `pnpm build:udb` runs from identical inputs produce byte-identical output (D-03) | VERIFIED | All 8 output arrays sorted before `createHash` call: `factions`, `units`, `models`, `weapons`, `abilities`, `keywords`, `points`, `composition` sorted at lines 736-760; hash at lines 766-767. SUMMARY confirms verified hash `1.0.0+b39ab772` across two runs. |
| 8 | Stale alias entries print a warning; summary line shows used/unused/unknown counts (D-07, D-08) | VERIFIED | `validateAliases()` function defined at lines 109-143; called at line 475; summary line printed at line 488 ("Alias validation: N used, M unused, K unknown target"); UNUSED and UNKNOWN TARGET blocks print warnings (lines 476-487). |
| 9 | Setting `MIN_COVERAGE_PCT` above current coverage causes exit code 1; threshold is overall not per-faction (D-09, D-10) | VERIFIED | `MIN_COVERAGE_PCT = 55` at line 61 with JSDoc (lines 55-60); `process.exit(1)` at line 657; check uses `overallCoveragePct` (line 652), computed as all-faction combined (line 580). |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/lib/bsdata.ts` | Shared BSData parsing and matching functions | VERIFIED | 177 lines; exports `readCsvFile`, `readBsdataCatFiles`, `parseBsdataModelCounts`, `matchUnit`, `MatchResult`, `MatchMethod`. Named exports only. No side effects at import time. JSDoc header documents DOMParser polyfill requirement. |
| `scripts/lib/types.ts` | Extended `FactionCoverage` with match method fields | VERIFIED | `FactionCoverage` interface at lines 116-130 includes `matched_exact?`, `matched_normalized?`, `matched_alias?`, `unmatched_names?` with JSDoc annotations. |
| `scripts/build-unit-db.ts` | Enhanced coverage table, deterministic sorting, alias validation, coverage threshold | VERIFIED | `MIN_COVERAGE_PCT` constant, `factionMatchStats` map, `allBsdataNames` set, `validateAliases()` function, 8-array sort block, and `process.exit(1)` all present and wired. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/build-unit-db.ts` | `scripts/lib/bsdata.ts` | `import { matchUnit, readBsdataCatFiles, parseBsdataModelCounts, readCsvFile }` | WIRED | Confirmed at line 32. No local duplicates remain. |
| `scripts/update-unit-database.ts` | `scripts/lib/bsdata.ts` | `import { matchUnit, readBsdataCatFiles, parseBsdataModelCounts, readCsvFile }` | WIRED | Confirmed at line 31. 3-pass `matchUnit` used at lines 257 and 261. |
| `scripts/build-unit-db.ts` | `scripts/data/coverage-report.json` | `writeFileSync` with enhanced `FactionCoverage` data | WIRED | `writeFileSync(COVERAGE_PATH, ...)` at line 593 writes `coverageReport` which includes all new fields (lines 566-576). |
| `scripts/build-unit-db.ts` | `process.exit` | Coverage threshold check via `MIN_COVERAGE_PCT` | WIRED | `process.exit(1)` at line 657 conditional on `overallCoveragePct < MIN_COVERAGE_PCT`. |

---

### Data-Flow Trace (Level 4)

Not applicable — all artifacts are build-time scripts producing data files, not UI components rendering dynamic data.

---

### Behavioral Spot-Checks

Spot-checks skipped — `pnpm build:udb` requires the BSData `.cat` files and Wahapedia CSV files present on disk, which makes it a data-dependent pipeline rather than a unit-testable entry point. The SUMMARY confirms `pnpm build:udb` exits 0 with verified deterministic hash. Git commits `d480509` and `505a959` exist and correspond to the claimed features.

---

### Probe Execution

No probe scripts declared or found for this phase.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| BPH-01 | 112-02 | Per-faction coverage report with matched/unmatched unit counts | SATISFIED | `factionMatchStats` map, enhanced coverage table columns (Matched/Exact/Norm/Alias), `unmatched_names` per faction — all wired in `build-unit-db.ts` |
| BPH-02 | 112-02 | Deterministic, reproducible builds via `files.sort()` | SATISFIED | `readdirSync().filter().sort()` in `readBsdataCatFiles` (bsdata.ts line 81); 8 output arrays sorted before hash in `build-unit-db.ts` (lines 736-760) |
| BPH-03 | 112-01 | Shared BSData parsing logic in `scripts/lib/` module | SATISFIED | `scripts/lib/bsdata.ts` created with 4 exported functions; imported by both entry-point scripts |
| BPH-04 | 112-02 | Alias validation at build time — warns on unused/unknown | SATISFIED | `validateAliases()` local function; `allBsdataNames` set for complete coverage; warns on unused and unknown-target; summary line always printed |
| BPH-05 | 112-02 | Non-zero exit when BSData coverage drops below threshold | SATISFIED | `MIN_COVERAGE_PCT = 55`; `process.exit(1)` if `overallCoveragePct < MIN_COVERAGE_PCT` |

All 5 requirements BPH-01 through BPH-05 are SATISFIED and marked complete in REQUIREMENTS.md.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or `PLACEHOLDER` markers found in any file modified by this phase (`scripts/lib/bsdata.ts`, `scripts/lib/types.ts`, `scripts/build-unit-db.ts`, `scripts/update-unit-database.ts`).

---

### Human Verification Required

None. All observable truths are verifiable through static code analysis and git log inspection. The build pipeline is dev-tooling only (no UI, no runtime app code).

---

### Gaps Summary

No gaps. All 9 must-have truths are VERIFIED, all 5 requirement IDs are SATISFIED, all key links are WIRED, and no debt markers are present.

---

_Verified: 2026-06-02T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
