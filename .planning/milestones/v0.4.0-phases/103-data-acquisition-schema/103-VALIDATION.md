---
phase: 103
slug: data-acquisition-schema
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
updated: 2026-05-29
---

# Phase 103 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + better-sqlite3 (data-layer tests) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/data-layer/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/data-layer/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 01-T1 | 01 | 1 | DAS-02 | Unit test | `pnpm test -- tests/data-layer/migration-parity.test.ts` | COVERED |
| 01-T2 | 01 | 1 | DAS-07 | Unit test | `pnpm test -- tests/data-layer/migration038.test.ts` | COVERED |
| 02-T1 | 02 | 1 | DAS-01 | Artifact validation | `pnpm test -- tests/data-layer/unit-database-artifact.test.ts` | COVERED |
| 02-T1 | 02 | 1 | DAS-04 | Artifact validation | `pnpm test -- tests/data-layer/unit-database-artifact.test.ts` | COVERED |
| 02-T1 | 02 | 1 | DAS-05 | Artifact validation | `pnpm test -- tests/data-layer/unit-database-artifact.test.ts` | COVERED |
| 02-T1 | 02 | 1 | DAS-06 | Artifact validation | `pnpm test -- tests/data-layer/unit-database-artifact.test.ts` | COVERED |
| 03-T1 | 03 | 2 | DAS-03 | Manual (Tauri runtime) | `pnpm tauri dev` — check terminal for import counts | VERIFIED |
| 03-T1 | 03 | 2 | DAS-08 | Manual (Tauri runtime) | `pnpm tauri dev` — verify setup hook log line | VERIFIED |

---

## Validation Architecture

### Wave 0 — Test Infrastructure
- Verify `tests/data-layer/` directory exists with test setup
- Verify `better-sqlite3` available for data-layer tests
- Verify migration parity test covers migration 038

### Wave 1 — Schema + Build Script
- Migration 038 creates all 9 `udb_*` tables + FTS5 virtual table
- Build script produces valid `unit_database.json`
- JSON artifact passes schema validation and completeness checks

### Wave 2 — Import Command + First Launch
- Rust import command loads all data correctly
- FTS5 virtual table populated and searchable
- Re-import is idempotent (no duplicates)
- WAL checkpoint runs after commit

---

## Manual-Only Items

| Requirement | Reason | Verification Method |
|-------------|--------|---------------------|
| DAS-03 | Rust `import_unit_database` requires Tauri runtime (sqlx + resource_dir) — not testable in Vitest/jsdom | Run `pnpm tauri dev`, check terminal for `[hobbyforge] udb import` with non-zero counts |
| DAS-08 | Setup hook auto-import requires Tauri `.setup()` lifecycle — no Node.js equivalent | Run `pnpm tauri dev`, verify import runs on first launch without manual trigger |

---

## Sign-Off

- [x] Test infrastructure verified (Vitest 4 + better-sqlite3)
- [x] Per-task map covers all 8 requirements
- [x] 6 requirements have automated tests (COVERED)
- [x] 2 requirements are manual-only (Tauri runtime)
- [x] All automated tests pass

---

## Validation Audit 2026-05-29

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated (manual-only) | 0 |

New tests created: `tests/data-layer/unit-database-artifact.test.ts` (14 assertions across 4 requirements).

## Validation Audit 2026-05-30

| Metric | Count |
|--------|-------|
| Manual items verified | 2 |
| Remaining gaps | 0 |

DAS-03 and DAS-08 verified via `pnpm tauri dev` terminal output:
- First launch: `UdbImportResult { factions: 25, units: 1711, models: 1812, weapons: 9209, abilities: 7152, keywords: 11663, points: 99, composition: 279 }`
- Second launch: all zeros (version-match skip — idempotency confirmed)
