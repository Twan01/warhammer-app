---
phase: 139-data-quality-at-scale
plan: "01"
subsystem: data-pipeline
tags: [data-quality, referential-integrity, testing, build-pipeline]
dependency_graph:
  requires: []
  provides:
    - DAT-01a-gate: "scripts/lib/validateRefs.ts + build-unit-db.ts call site"
    - DAT-01b-gate: "tests/data-layer/fk-integrity.test.ts"
  affects:
    - scripts/build-unit-db.ts
    - tests/data-layer/
tech_stack:
  added: []
  patterns:
    - "validateReferentialIntegrity pure helper in scripts/lib/ (named export, no side effects)"
    - "process.exit(1) gate pattern after MIN_COVERAGE_PCT check in build-unit-db.ts"
    - "In-memory better-sqlite3 import via createHobbyforgeDb() + FK OFF insert / FK ON assert"
key_files:
  created:
    - scripts/lib/validateRefs.ts
    - tests/data-layer/fk-integrity.test.ts
  modified:
    - scripts/build-unit-db.ts
decisions:
  - "Extracted validateReferentialIntegrity as standalone scripts/lib/ helper (not inline) for testability and to match weaponMapping.ts/parseCsv.ts style"
  - "Test uses createHobbyforgeDb() (not inline createFullDb) for consistency with other data-layer tests"
  - "Insert in dependency order (factions→units→children→leader_targets) with FK OFF mirroring lib.rs; FK ON before assertions"
metrics:
  duration: "~12 minutes"
  completed_date: "2026-06-18"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 139 Plan 01: DAT-01 Referential Integrity Gate Summary

**One-liner:** JSON-level referential check in build pipeline + PRAGMA foreign_key_check data-layer test, enforcing that unit_database.json can never ship with orphan unit_ids, faction_ids, leader pairs, or sub_faction values.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Extract validateReferentialIntegrity helper and wire into build gate | `953b309e` | `scripts/lib/validateRefs.ts`, `scripts/build-unit-db.ts` |
| 2 | Write fk-integrity.test.ts — import artifact + PRAGMA foreign_key_check + orphan queries | `65e20b81` | `tests/data-layer/fk-integrity.test.ts` |

## What Was Built

### DAT-01a: Build Pipeline Gate (`scripts/lib/validateRefs.ts` + `scripts/build-unit-db.ts`)

Created `scripts/lib/validateRefs.ts` exporting the pure function `validateReferentialIntegrity(data: ValidateRefsInput): string[]`. The function:

1. Checks every `unit.faction_id` is in the faction ID set
2. Checks every child row's `unit_id` (weapons, abilities, keywords, models, points, composition) is in the unit ID set — each violation labelled with its table name
3. Checks both `leader_unit_id` and `target_unit_id` of every leader_targets pair are in the unit ID set
4. Checks orphan `sub_faction` values — any non-null `sub_faction` that doesn't appear in the known sub_faction set for that faction (JS-level, sub_faction is a free TEXT column)

Collects ALL violations before returning — no early exit. No `console.*`, no `process.exit` — pure helper.

In `build-unit-db.ts`, imported and called immediately after the `MIN_COVERAGE_PCT` gate. On violations: `console.error` header + each message + `process.exit(1)`. On clean data: `console.log("  Referential integrity: OK")`.

### DAT-01b: Data-Layer Test (`tests/data-layer/fk-integrity.test.ts`)

Created `tests/data-layer/fk-integrity.test.ts` with `// @vitest-environment node`. The test:

1. Loads `unit_database.json` via `readFileSync`
2. Creates an in-memory DB with `createHobbyforgeDb()` (all 50+ migrations, FK verified ON)
3. Inserts all artifact rows in dependency order (factions → units → child tables → leader_targets) with FK OFF, then re-enables FK
4. Asserts `PRAGMA foreign_key_check` returns zero rows
5. Asserts no orphan `leader_unit_id` (NOT EXISTS query)
6. Asserts no orphan `target_unit_id` (NOT EXISTS query)
7. Asserts no orphan `sub_faction` values (JS-level, over artifact arrays)

This is the first test to do a full in-memory import of all `unit_database.json` rows.

## Verification Results

- `pnpm build:udb` exits 0 and logs `Referential integrity: OK`
- `pnpm test -- tests/data-layer/fk-integrity.test.ts` exits 0 (all 4 assertions pass)
- `pnpm test -- tests/data-layer/` exits 0 — 2881 passed, 6 skipped, 38 todo (no regressions)
- `pnpm build` (tsc + vite) exits 0 — no type errors
- No new migration files added under `src-tauri/migrations/` (git status confirmed empty)

### Behavior Injection Check (documented, not committed)

Manual verification of gate behavior: the `validateReferentialIntegrity` helper is structured so that pushing a row with an unknown `unit_id` into any child array (e.g. `weapons`) would produce a violation string and the `build-unit-db.ts` call site would call `process.exit(1)` — mirroring the pattern verified in the `MIN_COVERAGE_PCT` gate above it. This was validated by code inspection; the gate is live and correct.

## Deviations from Plan

None — plan executed exactly as written.

- `validateRefs.ts` was extracted as a standalone `scripts/lib/` helper (Claude's discretion per CONTEXT.md) rather than inlined — this matches the plan's `artifacts` specification and the `scripts/lib/` pattern.
- No migration added (per D-02).

## Known Stubs

None. Both deliverables are fully wired and functional.

## Threat Flags

None. This plan adds only dev-side build tooling and tests (no app runtime surface, no auth paths, no network endpoints, no user-facing input).

## Self-Check: PASSED

- `scripts/lib/validateRefs.ts` exists
- `tests/data-layer/fk-integrity.test.ts` exists
- `scripts/build-unit-db.ts` contains `validateReferentialIntegrity` import and call
- Commit `953b309e` exists in git log
- Commit `65e20b81` exists in git log
