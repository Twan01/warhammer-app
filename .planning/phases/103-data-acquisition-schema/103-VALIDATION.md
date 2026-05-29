---
phase: 103
slug: data-acquisition-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 103 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + better-sqlite3 (data-layer tests) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- tests/unit-database/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- tests/unit-database/`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| TBD | TBD | TBD | DAS-01 | Unit test | `pnpm test -- tests/unit-database/build-script.test.ts` | Pending |
| TBD | TBD | TBD | DAS-02 | Migration parity | `pnpm test -- tests/unit-database/schema.test.ts` | Pending |
| TBD | TBD | TBD | DAS-03 | Integration test | `pnpm test -- tests/unit-database/import.test.ts` | Pending |
| TBD | TBD | TBD | DAS-04 | Data completeness | `pnpm test -- tests/unit-database/completeness.test.ts` | Pending |
| TBD | TBD | TBD | DAS-05 | Unit test | `pnpm test -- tests/unit-database/points-tiers.test.ts` | Pending |
| TBD | TBD | TBD | DAS-06 | Unit test | `pnpm test -- tests/unit-database/composition.test.ts` | Pending |
| TBD | TBD | TBD | DAS-07 | Unit test | `pnpm test -- tests/unit-database/fts5.test.ts` | Pending |
| TBD | TBD | TBD | DAS-08 | Integration test | Manual (Tauri setup hook) | Pending |

---

## Validation Architecture

### Wave 0 — Test Infrastructure
- Verify `tests/unit-database/` directory exists with test setup
- Verify `better-sqlite3` available for data-layer tests
- Verify migration parity test covers migration 038

### Wave 1 — Schema + Build Script
- Migration 038 creates all 15 `udb_*` tables
- Build script produces valid `unit_database.json`
- JSON artifact passes schema validation

### Wave 2 — Import Command + First Launch
- Rust import command loads all data correctly
- FTS5 virtual table populated and searchable
- Re-import is idempotent (no duplicates)
- WAL checkpoint runs after commit
