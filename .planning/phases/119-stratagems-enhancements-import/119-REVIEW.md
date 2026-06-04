---
phase: 119-stratagems-enhancements-import
reviewed: 2026-06-04T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src-tauri/migrations/043_udb_stratagems_enhancements.sql
  - scripts/lib/types.ts
  - scripts/build-unit-db.ts
  - scripts/update-unit-database.ts
  - src-tauri/src/lib.rs
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 119: Code Review Report

**Reviewed:** 2026-06-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 119 adds `udb_stratagems` and `udb_enhancements` tables via a new migration, extends the build pipeline (both `build-unit-db.ts` and `update-unit-database.ts`) to parse the matching Wahapedia CSVs, extends the Rust importer in `lib.rs` to INSERT those rows atomically, and adds the shared TypeScript types in `types.ts`.

The pipeline logic is broadly correct. The two critical defects both concern the same root cause: the `UdbStratagemRow` TypeScript type omits the `updated_at` field that the SQL schema requires as `NOT NULL DEFAULT`, which causes the mismatch between the JSON serialised form and the Rust INSERT statement. A secondary critical issue is that stratagems with a non-null `faction_id` are never validated against `factionIds`, so unknown faction IDs silently reach the database and can cause FK constraint violations at import time (when FK enforcement is re-enabled after the transaction).

The four warnings are real correctness hazards: the diff tool in `update-unit-database.ts` does not cover stratagems or enhancements at all (silent regressions), the `PRAGMA foreign_keys = ON` restoration in `lib.rs` runs on the wrong connection object after `tx.commit()` borrows `conn`, the duplicate-comment in `build-unit-db.ts` signals a copy-paste problem, and the stratagem validation gap also applies to `update-unit-database.ts`.

---

## Critical Issues

### CR-01: Stratagems with non-empty `faction_id` are never validated against known factions

**File:** `scripts/build-unit-db.ts:632-643` (and `scripts/update-unit-database.ts:361-373`)

**Issue:** For detachments and units the build pipeline calls `factionIds.has(factionId)` and skips rows with unknown factions, emitting a warning. For stratagems (step 12) and enhancements (step 13) there is no equivalent guard. A stratagem that references an unknown faction ID is silently inserted into the JSON. When `lib.rs` later imports that row with `PRAGMA foreign_keys = ON` restored, the insert into `udb_stratagems` will fail with a FK violation because `faction_id REFERENCES udb_factions(id)`. Because the entire import runs inside a single transaction and an individual insert error propagates as `Err(String)` which causes an early return, the whole import is aborted, leaving the database tables empty until the next successful run.

Note: `faction_id` is nullable in `udb_stratagems` (universal stratagems legitimately have `NULL`), so the guard must only apply when the value is non-null.

**Fix:**
```typescript
// In the stratagems loop, after the isLegend check:
const factionId = row["faction_id"]?.trim() || null;
if (factionId && !factionIds.has(factionId)) {
  console.warn(`  WARNING: Skipping stratagem "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
  stratagemLegendsSkipped++; // or a separate counter
  continue;
}

stratagems.push({
  id,
  faction_id: factionId,
  detachment_id: row["detachment_id"]?.trim() || null,
  // ...
});
```
Apply the same pattern for enhancements (where `faction_id` is mandatory; any non-null value that fails the check should abort that row with a warning).

---

### CR-02: `PRAGMA foreign_keys = ON` is issued on a connection that may have been consumed by `conn.begin()`

**File:** `src-tauri/src/lib.rs:903-905`

**Issue:** The SQLx `Connection::begin()` call at line 595 moves (or mutably borrows) `conn` to start the transaction. After `tx.commit()` the code calls:

```rust
let _ = sqlx::query("PRAGMA foreign_keys = ON")
    .execute(&mut conn)
    .await;
```

In SQLx, `begin()` takes `&mut self` and returns a `Transaction<'_, Sqlite>` that holds an exclusive mutable borrow of the underlying connection for its lifetime. After `tx.commit()` (which consumes `tx`), the borrow is released and `conn` is usable again — so in the happy path this works. However, if any earlier `map_err(...)?` short-circuits (an INSERT fails), `tx` is dropped without commit, but `conn` is still borrowed mutably by the implicit `Drop` path until `tx` goes out of scope. Because all the early-return paths do `return Err(...)` before `tx` is dropped explicitly, the `PRAGMA foreign_keys = ON` line is never reached on the error path — FK enforcement is left OFF on that connection for the lifetime of the connection pool, affecting any subsequent queries that reuse this connection.

The existing comment "Restore FK enforcement unconditionally — even if commit failed" expresses the intent but the code does not honour it on any error path inside the transaction loop.

**Fix:** Restructure to ensure `PRAGMA foreign_keys = ON` is executed even when an early `?` returns:

```rust
// Hoist FK restoration into a drop guard, or use a dedicated helper:
let result = async {
    // ... all DELETE + INSERT + commit logic ...
    tx.commit().await.map_err(|e| format!("commit udb: {e}"))
}.await;

// Restore FK enforcement regardless of success or failure
let _ = sqlx::query("PRAGMA foreign_keys = ON")
    .execute(&mut conn)
    .await;

result?;
```
This guarantees the PRAGMA runs whether the inner block returns Ok or Err.

---

## Warnings

### WR-01: `update-unit-database.ts` diff report does not cover stratagems or enhancements

**File:** `scripts/update-unit-database.ts:440-565`

**Issue:** `computeDiff` builds `DiffReport` which tracks `newUnits`, `removedUnits`, `pointsChanges`, `abilityChanges`, and `keywordChanges`. There is no equivalent tracking for changes to stratagems or enhancements. A Wahapedia update that adds, removes, or reprices stratagems/enhancements will run silently through `update-unit-database.ts --write` with no mention in the diff output. The `totalChanges` counter will be 0 and the tool will report "No changes detected" even when the actual data changed significantly. This defeats the purpose of the update tool for the newly imported data types.

**Fix:** Extend `DiffReport` with `stratagemChanges` and `enhancementChanges` fields, populate them in `computeDiff`, and add corresponding sections to `formatReport`.

---

### WR-02: `faction_id` validation gap also present in `update-unit-database.ts`

**File:** `scripts/update-unit-database.ts:353-399`

**Issue:** The same missing faction-ID validation from CR-01 is present in the `buildUnitDatabase()` function in `update-unit-database.ts`. Since this function is called every time the update tool runs, any Wahapedia CSV with a bad stratagem faction reference will produce a corrupt JSON that will fail to import on the next app launch.

**Fix:** Apply the same guard as CR-01 to `update-unit-database.ts:353-399`.

---

### WR-03: `udb_stratagems` schema inconsistency — `faction_id` uses `ON DELETE SET NULL` but `udb_enhancements.faction_id` uses `ON DELETE CASCADE`

**File:** `src-tauri/migrations/043_udb_stratagems_enhancements.sql:6-7` and `19`

**Issue:** The two tables have different referential-action semantics for `faction_id`:
- `udb_stratagems.faction_id` uses `ON DELETE SET NULL` — if a faction is deleted, the stratagem loses its faction association and becomes a "universal" stratagem.
- `udb_enhancements.faction_id` uses `ON DELETE CASCADE` — if a faction is deleted, all its enhancements are deleted.

In practice this distinction doesn't matter because factions are never deleted in normal operation (the whole udb_* set is replaced atomically with FK OFF). However, it creates an inconsistent contract. More importantly, for `udb_enhancements`, the schema marks `faction_id` as `NOT NULL` — a `CASCADE` delete would leave orphaned rows in child tables referencing the now-deleted enhancement (none currently, but this is a future hazard). The inconsistency is also confusing for anyone writing queries that JOINs both tables.

**Fix:** Align both to `ON DELETE SET NULL` (consistent with the nullable-FK approach used in `udb_stratagems`), or document clearly in the migration comment why the difference is intentional.

---

### WR-04: Duplicate comment on `loadTranslationsFr` in `build-unit-db.ts`

**File:** `scripts/build-unit-db.ts:84-85`

**Issue:** The JSDoc comment for `loadTranslationsFr` has a duplicated line:
```
 * Returns null and emits a console.warn if the file is missing or malformed.
 * Returns null and emits a console.warn if the file is missing or malformed.
```
Lines 84–85 are identical. While cosmetic, this is a sign of a copy-paste error that should be cleaned up to avoid confusion about whether both cases are actually distinct.

**Fix:** Remove the duplicated line 85.

---

## Info

### IN-01: `UdbStratagemRow` type does not include `updated_at` — inconsistent with schema

**File:** `scripts/lib/types.ts:103-113`

**Issue:** The `udb_stratagems` SQL table (migration 043, line 14) has `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`. The `UdbStratagemRow` TypeScript interface does not include an `updated_at` field. The same omission exists for `UdbEnhancementRow` (schema line 24). Because the Rust importer uses the `DEFAULT` value and never explicitly inserts `updated_at`, this is not a runtime error. However, if any future code reads `updated_at` back from the DB via a typed response object, it will find an unexpected field absent from the type.

The sibling `UdbDetachmentRow` also omits `updated_at` (migration 042), so this is a pre-existing pattern, not introduced in phase 119. Flagged for awareness.

**Fix:** Either add `updated_at?: string` to both interfaces, or add a comment noting that `updated_at` is DB-managed and intentionally excluded from the JSON/type surface.

---

### IN-02: `build-unit-db.ts` step numbering skips — "Step 9" follows "Step 8b"

**File:** `scripts/build-unit-db.ts:366`

**Issue:** The step counter in `main()` goes: Step 2, 3, 4, 5, 6, 7, 8, 8b, 9, 10, 10.5, 11, 12, 13. Steps 8b and 10.5 are unnumbered, and there are no steps for detachments (11), stratagems (12), or enhancements (13) in the build summary console output labels. These are cosmetic, but make the pipeline harder to audit quickly.

**Fix:** Renumber steps sequentially and add proper console labels for steps 12 and 13 consistent with the numbered format already used for steps 11 and below.

---

### IN-03: `update-unit-database.ts` silently ignores `Datasheets_models_cost.csv` absence

**File:** `scripts/update-unit-database.ts:81-91`

**Issue:** `REQUIRED_CSVs` in `update-unit-database.ts` does not include `"Datasheets_models_cost.csv"` even though `buildUnitDatabase()` calls `readCsvFile(DATA_DIR, "Datasheets_models_cost.csv")` at line 248. If that file is absent, `readCsvFile` will likely throw an unhandled error at runtime rather than producing the clean "Missing required file" message. The same omission exists in `build-unit-db.ts:64-74` — `Datasheets_models_cost.csv` is not in `REQUIRED_CSVs` there either, though this appears to be a pre-existing issue.

**Fix:** Add `"Datasheets_models_cost.csv"` to the `REQUIRED_CSVs` array in both scripts so the preflight check covers it.

---

_Reviewed: 2026-06-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
