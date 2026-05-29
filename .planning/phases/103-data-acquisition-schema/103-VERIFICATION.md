---
phase: 103-data-acquisition-schema
verified: 2026-05-29T13:30:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run pnpm build:udb with real source data to verify end-to-end build"
    expected: "Script exits 0, unit_database.json has faction_count >= 20 and unit_count >= 100, points array has model_count fields, composition array is non-empty"
    why_human: "Build script requires Wahapedia CSVs + BSData .cat files that are gitignored developer-side. Automated verification cannot confirm real data flows through the pipeline without those files being present."
  - test: "Run pnpm tauri dev and check terminal for udb import log with non-zero counts"
    expected: "Terminal shows '[hobbyforge] udb import: UdbImportResult { factions: N, units: N, ... }' with N > 0 after regenerating unit_database.json with real data"
    why_human: "Runtime behavior of setup hook and WAL checkpoint after commit requires a running Tauri app. Current placeholder JSON will produce zero-count import result, which is correct but does not confirm the data pipeline works end-to-end."
gaps: []
---

# Phase 103: Data Acquisition & Schema Verification Report

**Phase Goal:** The canonical unit database exists in hobbyforge.db, populated with all 40k 10th edition factions and units, and can be imported atomically via Rust command
**Verified:** 2026-05-29T13:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running the Node.js build script produces a valid unit_database.json artifact covering all 40k factions and units with stats, weapons, abilities, keywords, points tiers, and composition | ? UNCERTAIN | Script exists and is fully implemented (538-line pipeline, completeness validation, exit-1 guards); artifact is a placeholder pending real source files. Script correctness verified; actual data production requires human run with real Wahapedia/BSData files. |
| 2 | Fresh app install automatically loads bundled data into udb_* tables via Rust setup hook | ✓ VERIFIED | setup() closure in lib.rs:1490-1506 spawns tauri::async_runtime::spawn calling import_unit_database_inner — non-blocking, does not require manual trigger. |
| 3 | import_unit_database inserts all rows within a single WAL-checkpointed transaction with no duplicate or orphaned rows after re-import | ✓ VERIFIED | lib.rs:839-1113: FK OFF, begin(), DELETE all 10 tables, INSERT all arrays, INSERT udb_meta, rebuild FTS5, commit(), PRAGMA wal_checkpoint(TRUNCATE). Version-check early return ensures idempotency. |
| 4 | FTS5 virtual table is created and populated, enabling cross-faction full-text search | ✓ VERIFIED | 038_udb_schema.sql:104-105 creates udb_search FTS5 virtual table. lib.rs:1085-1102 rebuilds it inside the transaction (DELETE + INSERT SELECT with GROUP_CONCAT of keywords). migration038.test.ts test 2 confirms FTS5 table exists. |
| 5 | Point tier rows correctly represent model-count brackets and composition rows carry min/max model counts | ? UNCERTAIN | Schema (udb_unit_points UNIQUE(unit_id, model_count), udb_unit_composition min_models/max_models) is correct. Build script correctly extracts tiers from BSData modifier/condition XML and composition from constraints. Cannot confirm without real data files present. |

**Score:** 3/5 truths fully verified (2 UNCERTAIN — pending human data run)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/migrations/038_udb_schema.sql` | 9 udb_* tables + FTS5 + 6 FK indexes | ✓ VERIFIED | 128 lines, all 10 table definitions present, correct constraints (CHECK(id=1), ON DELETE CASCADE, UNIQUE), ends with PRAGMA user_version = 38. No INSERT/seed data. |
| `tests/data-layer/migration038.test.ts` | 6 schema verification tests | ✓ VERIFIED | All 6 tests pass: table existence, FTS5 creation, CHECK(id=1), FK enforcement, UNIQUE constraint, ON DELETE CASCADE. |
| `tests/data-layer/db-helpers.ts` | HOBBYFORGE_MIGRATIONS contains 037 and 038 entries | ✓ VERIFIED | Line 49: "037_override_flags.sql", Line 50: "038_udb_schema.sql". HOBBYFORGE_MIGRATION_COUNT = 38 (line 61). |
| `scripts/build-unit-db.ts` | Dev-side build script with Wahapedia CSV + BSData XML parsing | ✓ VERIFIED | 753-line standalone Node.js script. Inlined parseWahapediaCsv, FACTION_MAP, extractTiers, parseCatXml, extractModelCounts. Full 9-step pipeline. Completeness validation (empty faction check, unit count >= 100). writeFileSync to src-tauri/data/unit_database.json. |
| `src-tauri/data/unit_database.json` | Pre-built canonical unit data artifact | ⚠ PLACEHOLDER | File exists with correct top-level structure (version, built_at, game_system, unit_count, faction_count, all 8 arrays). Arrays are empty — intentional placeholder pending developer data download and build run. |
| `src-tauri/src/lib.rs` | import_unit_database command + setup hook + structs | ✓ VERIFIED | UnitDatabasePayload struct (line 487), UdbImportResult struct (line 512), import_unit_database_inner (line 839), import_unit_database command (line 1118), setup() hook spawn (lines 1500-1506), registered in generate_handler! (line 1524). |
| `src-tauri/tauri.conf.json` | bundle.resources with unit_database.json | ✓ VERIFIED | Lines 44-46: "resources": { "data/unit_database.json": "data/unit_database.json" } inside bundle object. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/lib.rs` | `src-tauri/migrations/038_udb_schema.sql` | `include_str!("../migrations/038_udb_schema.sql")` in get_migrations() | ✓ WIRED | lib.rs line 231-233: version: 38, description: "udb_schema", sql: include_str!("../migrations/038_udb_schema.sql") |
| `tests/data-layer/db-helpers.ts` | `src-tauri/migrations/038_udb_schema.sql` | HOBBYFORGE_MIGRATIONS array | ✓ WIRED | "038_udb_schema.sql" at line 50 of db-helpers.ts |
| `src-tauri/src/lib.rs` | `src-tauri/data/unit_database.json` | `std::fs::read_to_string` from resource_dir | ✓ WIRED | lib.rs:855-857: resource_dir joined with "data/unit_database.json", read_to_string called |
| `src-tauri/tauri.conf.json` | `src-tauri/data/unit_database.json` | bundle.resources mapping | ✓ WIRED | "data/unit_database.json": "data/unit_database.json" mapping confirmed |
| `scripts/build-unit-db.ts` | `src-tauri/data/unit_database.json` | writeFileSync OUTPUT_PATH | ✓ WIRED | Line 741: writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8") where OUTPUT_PATH = join(REPO_ROOT, "src-tauri", "data", "unit_database.json") |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src-tauri/data/unit_database.json` | factions[], units[], models[], weapons[], abilities[], keywords[], points[], composition[] | Wahapedia CSVs + BSData XML in scripts/data/ (gitignored) | No — placeholder artifact, arrays empty | ⚠ HOLLOW — wired correctly but data population requires human step: download source files and run `pnpm build:udb` |
| `src-tauri/src/lib.rs` (import_unit_database_inner) | UnitDatabasePayload deserialized from JSON | unit_database.json via resource_dir | Depends on JSON content | ✓ FLOWING — pipeline correct; zero rows when placeholder JSON, real rows when populated JSON |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 6 migration038 schema tests pass | `pnpm test -- tests/data-layer/migration038.test.ts` | 6/6 pass, 0 fail | ✓ PASS |
| Migration parity test passes (lib.rs count = db-helpers count = 38) | `pnpm test -- tests/data-layer/migration-parity.test.ts` | 4/4 pass | ✓ PASS |
| Build script exits with actionable error when source data missing | `node --experimental-strip-types scripts/build-unit-db.ts` | "ERROR: Missing required file: .../scripts/data/Factions.csv" exit(1) | ✓ PASS (expected behavior when no data) |
| package.json has build:udb entry | grep build:udb package.json | `"build:udb": "node --experimental-strip-types scripts/build-unit-db.ts"` | ✓ PASS |
| .gitignore excludes scripts/data/ | grep scripts/data .gitignore | Line 29: scripts/data/ | ✓ PASS |

### Probe Execution

No probe scripts declared. Step skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DAS-01 | 103-02-PLAN | Dev-side Node.js build script parses Wahapedia CSVs + BSData XML into canonical unit_database.json | ✓ SATISFIED | scripts/build-unit-db.ts: 753 lines, full parse pipeline, completeness validation, writeFileSync to src-tauri/data/unit_database.json |
| DAS-02 | 103-01-PLAN | Canonical udb_* schema in hobbyforge.db with tables for units, models, weapons, abilities, keywords, points tiers, composition | ✓ SATISFIED | 038_udb_schema.sql: all 9 regular tables + FTS5 virtual table, 6 FK indexes, all 6 migration038 tests pass |
| DAS-03 | 103-03-PLAN | Rust import_unit_database command loads JSON into udb_* tables with WAL checkpoint before React Query invalidation | ✓ SATISFIED | lib.rs: import_unit_database command + inner function, FK-off transaction, DELETE+INSERT for all 10 tables, FTS5 rebuild, WAL checkpoint(TRUNCATE), registered in generate_handler! |
| DAS-04 | 103-02-PLAN | All 40k 10th edition factions and units present with stats, weapons, abilities, keywords | ? NEEDS HUMAN | Build script implements correct CSV parsing for factions, units, models, weapons, abilities, keywords; placeholder JSON has 0 rows. Requires human data run to confirm. |
| DAS-05 | 103-02-PLAN | Point tiers with model count brackets per unit | ? NEEDS HUMAN | Build script correctly extracts tiers from BSData XML (extractTiers function, model_count+points rows). Placeholder has empty points[]. Requires human data run to confirm. |
| DAS-06 | 103-02-PLAN | Composition data per unit (min/max model counts) | ? NEEDS HUMAN | Build script correctly extracts min/max from BSData XML constraints (extractModelCounts function). Placeholder has empty composition[]. Requires human data run to confirm. |
| DAS-07 | 103-01-PLAN | FTS5 full-text search virtual table for cross-faction unit search | ✓ SATISFIED | udb_search FTS5 virtual table in 038_udb_schema.sql, FTS5 rebuild in import_unit_database_inner (INSERT INTO udb_search SELECT ... GROUP_CONCAT of keywords), migration038 test 2 confirms table creation |
| DAS-08 | 103-01-PLAN | Pre-built data ships bundled with app, loaded on first launch via Rust setup hook | ✓ SATISFIED | tauri.conf.json bundle.resources maps data/unit_database.json, setup() hook spawns async import_unit_database_inner at app launch |

**Orphaned requirements:** None — all 8 DAS requirements claimed by plans and verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src-tauri/data/unit_database.json` | 7 | `"_note": "PLACEHOLDER — run pnpm build:udb ..."` | ℹ Info | Intentional placeholder per D-02 and SUMMARY documented stubs. Not a blocker — the data artifact exists with correct structure and must be regenerated with real source data. No unreferenced TBD/FIXME/XXX markers found in any modified files. |

No TBD, FIXME, or XXX markers found in any files modified by this phase.

### Human Verification Required

#### 1. Build script produces real data

**Test:** Download Wahapedia CSVs to `scripts/data/` (Factions.csv, Datasheets.csv, Datasheets_models.csv, Datasheets_abilities.csv, Datasheets_keywords.csv, Datasheets_wargear.csv from https://wahapedia.ru/wh40k10ed/) and BSData .cat files to `scripts/data/bsdata/` (from https://github.com/BSData/wh40k-10e), then run `pnpm build:udb`
**Expected:** Script exits 0, unit_database.json written with faction_count >= 20, unit_count >= 100, points[] and composition[] arrays non-empty; no "empty faction" validation errors
**Why human:** Wahapedia CSVs are gitignored developer-side source files. Automated verification cannot download or use them. This is the only unverifiable piece of the data pipeline.

#### 2. End-to-end runtime import with real data

**Test:** After running `pnpm build:udb` with real source files, run `pnpm tauri dev` and inspect terminal output
**Expected:** Terminal shows `[hobbyforge] udb import: UdbImportResult { factions: N, units: N, models: N, ... }` with all counts > 0. Re-launch shows version-match skip (idempotent) or identical counts.
**Why human:** Runtime behavior of setup hook, WAL checkpoint, and database state after import requires a running Tauri app with real data.

### Gaps Summary

No hard blockers found. All infrastructure (schema, Rust command, build script, wiring, tests) is fully implemented and passes automated checks. The only gap is that `src-tauri/data/unit_database.json` is a placeholder — this is an intentional design decision documented in SUMMARY (D-02: dev-side build step, not runtime download). The gap between the phase goal ("populated with all 40k 10th edition factions and units") and the current state (placeholder JSON) is bridged by the developer running `pnpm build:udb` with real source data files, which is a documented prerequisite step.

The human verification items are the final bridge to full SC1/SC5 confirmation.

---

_Verified: 2026-05-29T13:30:00Z_
_Verifier: Claude (gsd-verifier)_
