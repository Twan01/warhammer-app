---
phase: 103-data-acquisition-schema
reviewed: 2026-05-29T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src-tauri/migrations/038_udb_schema.sql
  - tests/data-layer/migration038.test.ts
  - src-tauri/src/lib.rs
  - tests/data-layer/db-helpers.ts
  - scripts/build-unit-db.ts
  - src-tauri/tauri.conf.json
  - src/components/common/DbHealthGate.tsx
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues_found
---

# Phase 103: Code Review Report

**Reviewed:** 2026-05-29T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 103 adds a 10-table canonical unit database (udb_*) to hobbyforge.db, a dev-side Node.js build script that parses Wahapedia CSV + BSData XML into unit_database.json, a Rust `import_unit_database` command that replicates the bulk_sync_rules pattern, a setup-hook auto-import, and bumps EXPECTED_SCHEMA_VERSION to 38.

The SQL schema and migration are clean. The Rust import command follows established patterns correctly. However four blockers are present: the WAL checkpoint runs on a connection that has already had its transaction committed but the connection was consumed by the borrow checker (use-after-move), FK checks are re-enabled only implicitly and never explicitly restored before the transaction commits, the version check race allows concurrent imports to proceed simultaneously, and the build script emits a hardcoded static version string instead of a content-based version, making incremental re-runs invisible to the version-skip guard.

---

## Critical Issues

### CR-01: WAL checkpoint executes on a moved/consumed connection

**File:** `src-tauri/src/lib.rs:1107-1110`
**Issue:** After `tx.commit().await`, the `conn` variable that owned the connection was consumed by `conn.begin()` at line 893 (sqlx `begin()` takes `self` by value when called on a raw connection, not `&mut self`). The subsequent `PRAGMA wal_checkpoint(TRUNCATE)` call at line 1107 runs on a connection that the borrow checker may or may not have invalidated depending on the sqlx version's `begin()` signature. If `begin()` takes `&mut self`, this silently succeeds on the same connection after the TX commits; if it takes `self`, this is a compile error caught at build time. In either case the intent is unclear and the WAL checkpoint is not guaranteed to execute on the same physical connection that held the write lock. If sqlx `begin()` does consume ownership, the code will fail to compile, blocking every build.

**Fix:** Reconnect explicitly for the checkpoint, or restructure to keep `conn` alive:
```rust
// After tx.commit():
drop(tx);
// Re-open a fresh connection for the checkpoint (conn was moved into tx)
let mut ckpt_conn = opts.connect().await.map_err(|e| format!("ckpt connect: {e}"))?;
sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
    .execute(&mut ckpt_conn)
    .await
    .map_err(|e| format!("wal_checkpoint: {e}"))?;
```

---

### CR-02: FK checks disabled but never explicitly re-enabled before commit

**File:** `src-tauri/src/lib.rs:888-891`
**Issue:** `PRAGMA foreign_keys = OFF` is executed on `conn` *before* `conn.begin()`. SQLite's FK pragma is connection-scoped, not transaction-scoped. When the transaction commits and the connection is subsequently reused (by the Tauri plugin pool or by the checkpoint call), FK enforcement remains OFF for that connection slot for an indeterminate time. Worse, if the import fails mid-way and the transaction rolls back, FK checks are still disabled on the connection for all future operations using that connection handle. This is a data-integrity risk in production: any subsequent write on the same connection will bypass FK enforcement.

The same issue exists in `bulk_sync_rules` (line 550) but that function opens a new connection from the pool each call, so the blast radius is bounded. In `import_unit_database_inner` the connection is a direct sqlx connection that may be shared.

**Fix:** Restore FK checks explicitly after the transaction, in all exit paths:
```rust
// After tx.commit() (and in any error-return paths):
sqlx::query("PRAGMA foreign_keys = ON")
    .execute(&mut conn)
    .await
    .map_err(|e| format!("pragma fk restore: {e}"))?;
```

---

### CR-03: Version-skip race condition allows duplicate concurrent imports

**File:** `src-tauri/src/lib.rs:871-885`
**Issue:** The version check at lines 871-885 reads `udb_meta` and compares the stored version against `payload.version`. This check happens *outside* the transaction. If the setup hook fires and a user also manually triggers `import_unit_database` at nearly the same time (e.g., via a future UI button), both callers will read the same `udb_meta` (or empty), both will proceed past the version guard, both will DELETE all udb_* rows, and both will re-insert, racing on the same tables inside the single-writer SQLite. The second committer will win, but the busy_timeout of 30s means the first will block, not fail gracefully. For the auto-import-only case this is low probability, but as soon as a UI-triggerable re-import is added (likely in a future phase), this becomes a real concurrency bug.

**Fix:** Move the version check inside the transaction with a `BEGIN IMMEDIATE` or `BEGIN EXCLUSIVE` to serialize access:
```rust
let mut tx = conn.begin_immediate().await ...;  // sqlx: begin with IMMEDIATE
let existing: Option<String> = sqlx::query_scalar("SELECT version FROM udb_meta WHERE id = 1")
    .fetch_optional(&mut *tx).await ...;
if existing.as_deref() == Some(&payload.version) {
    tx.rollback().await.ok();
    return Ok(UdbImportResult { ... });
}
// proceed with DELETE + INSERT inside tx
```

---

### CR-04: Build script always emits version "1.0.0" — version-skip guard is permanently bypassed after first import

**File:** `scripts/build-unit-db.ts:721`
**Issue:** The output JSON hardcodes `version: "1.0.0"` (line 721). The Rust import guard at `lib.rs:879` skips re-import when the stored `udb_meta.version` equals `payload.version`. Because the version never changes between build runs, every re-run of the build script produces a JSON with the same version string. After the first successful import writes `"1.0.0"` to `udb_meta`, all subsequent app launches skip the import entirely, even if the build script was re-run with updated CSVs and the bundled JSON has materially changed data. The version guard becomes permanently inert, silently preventing data refreshes.

**Fix:** Derive the version from content (hash the factions+units arrays) or from a timestamp, so any new build produces a new version:
```typescript
import { createHash } from "node:crypto";
// After assembling output arrays:
const contentHash = createHash("sha256")
  .update(JSON.stringify({ factions, units }))
  .digest("hex")
  .slice(0, 12);
const version = `1.0.0-${contentHash}`;
// or use built_at as the version:
const version = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
```

---

## Warnings

### WR-01: `udb_search` FTS5 DELETE in the delete loop is redundant and inconsistent

**File:** `src-tauri/src/lib.rs:901-916`
**Issue:** `udb_search` appears in the delete loop at line 902 (`"udb_search"` is the first entry). It is then explicitly deleted again at line 1086-1089 immediately before the FTS5 rebuild INSERT. The double-delete is harmless (the second delete of an already-empty table is a no-op), but it indicates the code was written with uncertain ownership of the FTS table's lifecycle. More importantly, if the second explicit delete were removed in a future refactor, the first delete in the loop would still need to cover it — the current placement is therefore fragile.

**Fix:** Remove `"udb_search"` from the delete loop and keep only the explicit delete before the FTS rebuild. The comment on line 900 says "D-09/D-08: DELETE all udb_* tables" but FTS5 tables cannot have FK relationships anyway, so their ordering in the delete list is irrelevant.

---

### WR-02: `DbHealthGate` silently swallows all `repairErr` failures

**File:** `src/components/common/DbHealthGate.tsx:123-125`
**Issue:** The outer `catch (repairErr)` block at line 123 only emits a `console.warn`. If `replaceSyncedUnitPoints` throws — for example because `synced_unit_points` table is locked or the schema is out of sync — the gate will proceed to `setState("ok")` at line 126 with a corrupted or empty `synced_unit_points` cache. The army list will silently show null points for all units. The user sees the app as healthy while point data is broken.

**Fix:** At minimum, surface the error via `setError` and let the DiagnosticScreen handle it, or introduce a separate non-fatal banner state. If cache repair is genuinely optional, document explicitly why a silent failure is acceptable here and add a toast notification so the user is aware.

---

### WR-03: `udb_unit_keywords` FTS5 population uses `GROUP_CONCAT` which is order-undefined

**File:** `src-tauri/src/lib.rs:1091-1101`
**Issue:** The FTS5 INSERT uses `GROUP_CONCAT(k.keyword, ' ')` without an ORDER BY inside the aggregate. SQLite does not guarantee the order of `GROUP_CONCAT` without explicit ordering. For FTS5 search this is functionally harmless (word-order in a keyword bag does not affect match results), but if the FTS content is ever compared for determinism (e.g., checksummed or diffed for testing), non-deterministic output will cause spurious mismatches.

**Fix:** Use `GROUP_CONCAT(k.keyword ORDER BY k.keyword, ' ')` or accept the non-determinism with a comment noting it is intentional.

---

### WR-04: `parseCatXml` silently skips units with zero base points (`pts <= 0`)

**File:** `scripts/build-unit-db.ts:166`
**Issue:** Units where BSData reports `pts = 0` (free units, narrative-only entries, or data errors) are silently skipped with `if (pts <= 0) continue`. This means any unit that has only tier-based pricing but no base cost in BSData will be dropped entirely from the points extraction pass, even if it has valid tiers. The `extractTiers()` function is only called on units that survive the `pts <= 0` guard, so a unit with 0 base pts but non-zero tier data loses all its pricing.

**Fix:** Separate the base-points check from the tiers check:
```typescript
// Only skip if there are neither base points nor tiers
const tiers = extractTiers(el as Element);
if (pts <= 0 && tiers.length === 0) continue;
```

---

### WR-05: `tauri.conf.json` — CSP is `null` (disabled entirely)

**File:** `src-tauri/tauri.conf.json:24`
**Issue:** `"csp": null` disables Content Security Policy entirely. This was already present before phase 103, but the addition of `assetProtocol` with scope `$APPDATA/**` in the same security block deserves attention: any script injected into the WebView (through a future XSS vector in a UI component, or through a rogue dependency) can now make asset:// requests to read the entire APPDATA directory, including `hobbyforge.db` (containing all user data), any safety backup `.zip` files, and `unit_database.json`. Without CSP, there is no second line of defense.

**Fix:** Enable a minimal CSP that at least restricts `script-src` to `'self'`:
```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
```

---

### WR-06: `sync_user_version` uses string interpolation to build a PRAGMA statement

**File:** `src-tauri/src/lib.rs:397`
**Issue:** `sqlx::query(&format!("PRAGMA user_version = {migration_count}"))` uses string interpolation. SQLite PRAGMA statements cannot be parameterized, so this is not a SQL injection risk in the traditional sense (the value is a `u32` computed internally, not user-supplied). However it establishes a pattern that is one copy-paste away from being applied to user-controlled data. The same pattern exists in `vacuum_to_temp` (line 1188) where the path is at least partially sanitized with `replace('\'', "''")`. The `sync_user_version` case is safe today but fragile.

**Fix:** Assert the type constraint explicitly to document the intent:
```rust
// u32 cast ensures no injection risk — PRAGMA user_version accepts only an integer
let sql = format!("PRAGMA user_version = {}", migration_count as u32);
```
Add a comment stating why interpolation is safe here.

---

## Info

### IN-01: `version: "1.0.0"` is also hard-coded in `UnitDatabasePayload` deserialization — no format validation

**File:** `src-tauri/src/lib.rs:488`
**Issue:** `UnitDatabasePayload.version` is a plain `String` with no format validation. If the build script ever produces a malformed version string (e.g., empty, extremely long, or containing path separators), the value is stored verbatim in `udb_meta.version`. No validation occurs on either the Rust or TypeScript side. This is low risk today but worth noting as the version string will be used for the skip guard.

**Fix:** Add a length check and character whitelist before storing:
```rust
if payload.version.is_empty() || payload.version.len() > 64 {
    return Err("invalid version string in unit_database.json".to_string());
}
```

---

### IN-02: `migration038.test.ts` does not test FTS5 search functionality

**File:** `tests/data-layer/migration038.test.ts`
**Issue:** The test suite verifies that `udb_search` exists as a virtual table, but does not verify that FTS5 queries work correctly (e.g., `SELECT unit_id FROM udb_search WHERE udb_search MATCH 'Marines'` returns results after inserting data). The FTS5 tokenizer configuration and column definitions are untested at query time. If the FTS5 virtual table is created with incorrect column counts or the `UNINDEXED` hint is misplaced, a search query would fail silently at runtime.

**Fix:** Add a test that inserts a faction + unit + calls the FTS5 INSERT query, then asserts a MATCH query returns the inserted unit_id.

---

### IN-03: `build-unit-db.ts` reads the output file immediately after writing to compute file size

**File:** `scripts/build-unit-db.ts:742`
**Issue:** `readFileSync(OUTPUT_PATH).length` re-reads the file that was just written solely to get its byte count. `Buffer.byteLength(JSON.stringify(output, null, 2), "utf-8")` would compute the same value without the extra I/O. On large JSON files (the 40k unit DB could be 5-10 MB), the extra read is wasteful in a dev script.

**Fix:**
```typescript
const outputJson = JSON.stringify(output, null, 2);
writeFileSync(OUTPUT_PATH, outputJson, "utf-8");
const fileSizeKb = (Buffer.byteLength(outputJson, "utf-8") / 1024).toFixed(1);
```

---

_Reviewed: 2026-05-29T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
