# Phase 72: Data-Layer Test Suite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 72-data-layer-test-suite
**Areas discussed:** Test Infrastructure, Test Scope & Scenarios, Test Organization, Migration Execution
**Mode:** --auto (all decisions auto-selected)

---

## Test Infrastructure

| Option | Description | Selected |
|--------|-------------|----------|
| Shared helper + in-memory DB | Create db-helpers.ts that sets up better-sqlite3 in-memory DB, runs all migrations, returns ready DB | ✓ |
| Per-test DB setup | Each test file manages its own DB creation and migration execution | |
| Snapshot-based | Pre-build a DB snapshot file, load it in tests | |

**User's choice:** [auto] Shared helper + in-memory DB (recommended default)
**Notes:** Mirrors production setup (client.ts PRAGMA foreign_keys = ON). In-memory is fast enough for 23 migrations.

---

## Test Scope & Scenarios

| Option | Description | Selected |
|--------|-------------|----------|
| Four suites per TST-01 | Migration parity, recipe persistence, session FK, schema shape — covers all TST-01 areas | ✓ |
| Migration-only | Only test that migrations run without errors | |
| Full CRUD coverage | Test all query functions against real SQLite | |

**User's choice:** [auto] Four suites per TST-01 (recommended default)
**Notes:** Full CRUD testing would be scope creep — Phase 72 targets TST-01 specifically. Tests validate schema correctness and FK behavior, not application query logic.

---

## Test Organization

| Option | Description | Selected |
|--------|-------------|----------|
| tests/data-layer/ directory | New directory with db-helpers.ts + one file per test area | ✓ |
| Spread across existing dirs | Add DB tests alongside existing content-shape tests | |
| Single test file | All data-layer tests in one large file | |

**User's choice:** [auto] tests/data-layer/ directory (recommended default)
**Notes:** Keeps data-layer tests isolated from component/hook tests. Shared helper is reusable for future phases.

---

## Migration Execution

| Option | Description | Selected |
|--------|-------------|----------|
| Read SQL files, execute sequentially | Read from src-tauri/migrations/, execute in version order — mirrors lib.rs | ✓ |
| Parse lib.rs for ordering | Extract migration order from Rust source code | |
| Hardcoded file list | Maintain a separate list of migration files in the test | |

**User's choice:** [auto] Read SQL files, execute sequentially (recommended default)
**Notes:** File naming convention (001_, 002_, etc.) provides natural sort order. Cross-check against lib.rs registration count as a separate assertion.

---

## Claude's Discretion

- Whether to add factory helpers (createTestRecipe, etc.) or inline INSERT statements
- Whether schema-shape tests cover ALL tables or just recent-phase tables
- Whether rules migration parity is a separate file or folded in
- Exact better-sqlite3 version

## Deferred Ideas

None — discussion stayed within phase scope
