# Phase 96: Database Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 96-database-hardening
**Areas discussed:** WAL migration approach, Index scope, CHECK constraint coverage, Migration strategy
**Mode:** --auto (all decisions auto-selected)

---

## WAL Migration Approach

| Option | Description | Selected |
|--------|-------------|----------|
| client.ts PRAGMAs | Add WAL + busy_timeout in getDb() matching rules-client.ts pattern | ✓ |
| Migration PRAGMA | Set WAL mode via migration SQL statement | |
| Both | PRAGMA in migration + connection-time enforcement | |

**Auto-selected:** client.ts PRAGMAs (recommended default)
**Notes:** rules-client.ts already implements this exact pattern (lines 22-23). Connection-time PRAGMAs are the correct approach for SQLite — WAL mode persists on the database file, but busy_timeout is per-connection.

---

## Index Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Requirements-only | Only the 8 FK columns explicitly listed in DBH-01 | |
| Comprehensive | All FK columns across all 32 migrations + temporal indexes | ✓ |
| Compound indexes | Multi-column indexes for common query patterns | |

**Auto-selected:** Comprehensive single-column indexes (recommended default)
**Notes:** Requirements list 8 specific FK columns, but later migrations added more FK columns (enhancements, leader_attached_to_id, etc.). Researcher should scan all migrations to find every FK column missing an index. No compound indexes needed — existing queries use single-column WHERE/JOIN.

---

## CHECK Constraint Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative | Only points >= 0, quantity >= 0, painting_percentage 0-100 | ✓ |
| Moderate | Add boolean 0/1 checks, non-empty text checks | |
| Aggressive | Full domain validation at DB level | |

**Auto-selected:** Conservative (recommended default)
**Notes:** Phase is about preventing obviously invalid data. Boolean 0/1 checks could break existing code that writes truthy/falsy values. Existing data must be verified before adding constraints.

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Single migration | One 033_database_hardening.sql with all changes | ✓ |
| Split migrations | Separate files for indexes vs CHECK constraints | |
| Incremental | One migration per table being hardened | |

**Auto-selected:** Single migration (recommended default)
**Notes:** All changes are additive and can be atomic. Index creation is simple (CREATE INDEX IF NOT EXISTS). CHECK constraints requiring table recreation are more complex but still fit in one migration.

---

## Claude's Discretion

- Index naming convention
- Additional non-FK indexes revealed by query analysis
- Exact CHECK constraint column set beyond the three explicitly named

## Deferred Ideas

None — discussion stayed within phase scope
