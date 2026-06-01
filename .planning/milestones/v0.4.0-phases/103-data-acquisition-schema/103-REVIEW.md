---
phase: 103-data-acquisition-schema
reviewed: 2026-06-01T14:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src-tauri/migrations/038_udb_schema.sql
  - src-tauri/src/lib.rs
  - scripts/build-unit-db.ts
  - tests/data-layer/migration038.test.ts
  - tests/data-layer/db-helpers.ts
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 103: Code Review Report

**Reviewed:** 2026-06-01T14:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 103 introduces the UDB schema migration (038), a dev-side build script for parsing Wahapedia CSV and BSData XML into a JSON artifact, and the Rust `import_unit_database` command that seeds `udb_*` tables at app startup. The schema design is solid (proper FKs, cascades, FTS5, CHECK constraint on meta, idempotent `IF NOT EXISTS`). The Rust import logic is thorough with version-skip optimization and atomic transactions. The test suite covers table creation, FK enforcement, cascade behavior, and CHECK constraints. One critical FK enforcement issue and several warnings remain.

Note: This review supersedes the prior 103-REVIEW.md. The previous CR-01 (WAL checkpoint on moved connection) was a false positive -- sqlx `begin()` takes `&mut self`, not `self`. The previous CR-04 (hardcoded version "1.0.0") has been fixed with content-based hashing.

## Critical Issues

### CR-01: PRAGMA foreign_keys never re-enabled after UDB import

**File:** `src-tauri/src/lib.rs:509`
**Issue:** `import_unit_database_inner` sets `PRAGMA foreign_keys = OFF` at line 509 before the transaction but never sets it back to `ON` after the transaction commits at line 725. The same `conn` object is then reused for `PRAGMA wal_checkpoint(TRUNCATE)` at line 728, and remains alive until function exit. While this particular connection is a short-lived direct connection (not from tauri-plugin-sql's pool), the pattern is dangerous: (1) if the function is ever refactored to add post-import validation queries, those queries run without FK protection; (2) if future code adds a connection pool or reuses connections, FK enforcement silently disappears for that connection slot; (3) on transaction rollback (error path), the FK-disabled state persists on the connection for the remainder of its lifetime. The CLAUDE.md explicitly states "FK enforcement is OFF by default in SQLite; `client.ts` runs `PRAGMA foreign_keys = ON` immediately after every new connection" -- this pattern must also apply to Rust-side connections.
**Fix:**
```rust
tx.commit().await.map_err(|e| format!("commit udb: {e}"))?;

// Restore FK enforcement after transaction
sqlx::query("PRAGMA foreign_keys = ON")
    .execute(&mut conn)
    .await
    .map_err(|e| format!("pragma fk on: {e}"))?;

// D-12: WAL checkpoint after commit
sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
    .execute(&mut conn)
    .await
    .map_err(|e| format!("wal_checkpoint: {e}"))?;
```

## Warnings

### WR-01: Build script version hash includes current date, defeating deterministic builds

**File:** `scripts/build-unit-db.ts:722`
**Issue:** The content seed for the version hash includes `new Date().toISOString().slice(0, 10)` (today's date). This means building the exact same CSV/XML source data on two different days produces different version strings, triggering an unnecessary full re-import on every user's machine. The Rust import guard at `lib.rs:500` compares the stored `udb_meta.version` against the payload version -- a date change forces a delete-all + re-insert cycle on app startup even when no data has changed. For a dataset that changes infrequently (GW rules update a few times per year), this wastes startup time on every new release.
**Fix:** Remove the date from the content seed. The data dimensions alone provide sufficient change detection:
```typescript
const contentSeed = `${factions.length}-${units.length}-${weapons.length}-${points.length}-${abilities.length}-${keywords.length}`;
```

### WR-02: `udb_search` FTS5 table deleted twice in the import transaction

**File:** `src-tauri/src/lib.rs:522-523` and `src-tauri/src/lib.rs:707`
**Issue:** `udb_search` is included in the bulk DELETE loop at line 523, then explicitly deleted again at line 707 before the FTS5 rebuild. For a standard FTS5 table (not external-content), `DELETE FROM` operations on the virtual table should work but must interact with FTS5's internal shadow tables. The double-delete is functionally harmless (second delete on an empty table is a no-op) but indicates confusion about FTS5 lifecycle management and makes the code harder to reason about during maintenance.
**Fix:** Remove `"udb_search"` from the bulk delete loop at lines 522-533. The explicit DELETE at line 707 immediately before the INSERT rebuild is the correct single location for FTS cleanup.

### WR-03: `parseCatXml` silently drops units with zero base points, even if they have valid tier pricing

**File:** `scripts/build-unit-db.ts:166`
**Issue:** Units where BSData reports `pts = 0` are silently skipped with `if (pts <= 0) continue` at line 166. However, `extractTiers()` is called at line 172 only for units that survive this guard. A unit that has 0 base cost (e.g., a free HQ upgrade) but valid tier-based pricing (model-count brackets) is dropped entirely from the points extraction, losing all its tier data. This can happen with narrative-play entries or units whose base cost is 0 but whose scaled-up versions have costs.
**Fix:** Extract tiers before the points check and only skip units that have neither base points nor tiers:
```typescript
const tiers = extractTiers(el as Element);
if (pts <= 0 && tiers.length === 0) continue;
```

### WR-04: Build script silently drops units with unknown faction_id without warning

**File:** `scripts/build-unit-db.ts:465`
**Issue:** Line 465 silently skips any datasheet whose `faction_id` is not in the parsed factions set. If `Factions.csv` is incomplete or out of date relative to `Datasheets.csv`, entire factions' units are silently dropped. The coarse safety net at line 691 (`units.length < 100`) won't catch partial drops (e.g., 20 missing units from a 500-unit dataset).
**Fix:** Log a warning for each skipped unit so the developer can investigate:
```typescript
if (factionId && !factionIds.has(factionId)) {
  console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
  continue;
}
```

## Info

### IN-01: PRAGMA user_version = 38 in migration file is stale

**File:** `src-tauri/migrations/038_udb_schema.sql:127`
**Issue:** The migration hardcodes `PRAGMA user_version = 38` but there are 39 migrations total (through 039_collection_udb_link). The `sync_user_version` function in `lib.rs:350` correctly sets `user_version` to the migration count (39) on every startup, overwriting this value. The hardcoded PRAGMA is dead code that will always be overwritten. Any new migration added in the future will make this value even more stale.
**Fix:** Remove the `PRAGMA user_version = 38;` line. The Rust startup code manages this value authoritatively. Alternatively, add a comment noting it is vestigial.

---

_Reviewed: 2026-06-01T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
