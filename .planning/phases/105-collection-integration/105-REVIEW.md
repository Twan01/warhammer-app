---
phase: 105-collection-integration
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src-tauri/migrations/039_collection_udb_link.sql
  - src-tauri/src/lib.rs
  - src/db/queries/diagnostics.ts
  - src/db/queries/unitDatabase.ts
  - src/db/queries/units.ts
  - src/features/factions/FactionSheet.tsx
  - src/features/unit-database/DatabaseBrowserPage.tsx
  - src/features/unit-database/UdbDatasheetSheet.tsx
  - src/features/unit-database/UdbUnitList.tsx
  - src/features/unit-database/UdbUnitRow.tsx
  - src/features/units/UnitSheet.tsx
  - src/hooks/useUnitDatabase.ts
  - src/hooks/useUnits.ts
  - src/types/faction.ts
  - src/types/unit.ts
  - tests/collection/udbCollectionLink.test.ts
  - tests/data-health/unlinkedUnitsDiagnostic.test.ts
  - tests/data-layer/db-helpers.ts
findings:
  critical: 2
  warning: 6
  info: 3
  total: 11
status: issues_found
---

# Phase 105: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This phase adds the collection-to-UDB foreign key link: a migration that backfills `udb_unit_id` on `units` and `wahapedia_faction_id` on `factions`, query functions for ownership aggregation, diagnostic flag for unlinked units, ownership badges in the database browser, and an "Add to Collection" pre-fill flow via `UnitSheet`.

The implementation is largely coherent. Two blockers were found: a use-after-move of a SQLite connection in `lib.rs` after the transaction is committed (the `PRAGMA wal_checkpoint` call uses a moved connection), and a data-correctness bug in `UnitSheet.tsx` where all auto-derived status fields are unconditionally stripped from every update — including updates that do NOT originate from the edit form path that needs the strip. Six warnings cover a silent data-loss path in `handleAddToCollection` when no matching faction exists, a stale-data gap in ownership invalidation on delete, an unguarded `worstIndex` initialisation edge case, a missing `form` dependency in a `useEffect`, an unchecked SQL injection surface in the FTS sanitizer, and a logic error in the pluralisation helper.

---

## Critical Issues

### CR-01: WAL checkpoint executes on a moved/consumed connection in `import_unit_database_inner`

**File:** `src-tauri/src/lib.rs:1113-1116`

**Issue:** `conn.begin()` consumes `conn` into `tx` (at line 899). After `tx.commit()` at line 1110 the original `conn` binding is no longer valid as a live database connection — the sqlx `Connection` trait's `begin()` method takes `self` by value on the `Acquire` impl for a bare connection. The subsequent `PRAGMA wal_checkpoint(TRUNCATE)` on line 1113 re-uses `conn` after it has been consumed, which means at best sqlx will open a second implicit connection (bypassing the single-connection invariant the comment on line 868 asserts), or at worst the borrow checker rejects this at compile time depending on the sqlx version's `Connection` impl. If it compiles silently (e.g. the pool `Acquire` path), the checkpoint runs on a different connection that may not see the just-committed pages, defeating its purpose.

**Fix:** Obtain a fresh connection for the checkpoint, or run the checkpoint inside the transaction before commit (though checkpointing in WAL mode is a no-op inside a transaction — prefer a fresh connection):

```rust
// After tx.commit():
tx.commit().await.map_err(|e| format!("commit udb: {e}"))?;

// Re-open a fresh connection for the checkpoint
let mut ckpt_conn = opts.connect().await.map_err(|e| format!("ckpt connect: {e}"))?;
sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
    .execute(&mut ckpt_conn)
    .await
    .map_err(|e| format!("wal_checkpoint: {e}"))?;
```

---

### CR-02: `updateUnit` strips all auto-derived status fields on every edit-form save, silently discarding override flags

**File:** `src/features/units/UnitSheet.tsx:162-174`

**Issue:** The destructuring block (lines 163-173) strips `painting_percentage`, `status_painting`, `status_basing`, `status_varnished`, `status_assembly`, `status_assembly_override`, `status_basing_override`, and `status_varnished_override` from the `payload` before passing it to `updateUnit`. The SQL in `units.ts` line 84 uses `COALESCE($9, status_assembly)` for the boolean status fields, so passing `NULL` (from omitting them) preserves the existing value — this part is safe. However `udb_unit_id` on line 102 of `units.ts` is NOT coalesced: `udb_unit_id = $27`. The `updateUnit` path always passes `(unit as Unit).udb_unit_id ?? null` (line 158). This means if a user opens an existing linked unit in the edit sheet and saves it (even without touching the UDB link field), the `udb_unit_id` is correctly preserved. But if `unit.udb_unit_id` is undefined at runtime (e.g. a unit row loaded before migration 039 ran on an existing DB), the link is silently set to NULL. Additionally, the stripping of `status_painting` (line 164) means the edit form can never update `status_painting` via the normal save path — the field is populated in the form (`buildDefaultValues` line 51) but the value is discarded before the mutation call. This is a data-loss bug: any change to `status_painting` via the edit form is silently ignored.

**Fix:** Remove `status_painting` from the destructured-out fields, and pass it through with its own `COALESCE` guard in `updateUnit`:

```tsx
// In UnitSheet.tsx onSubmit, edit path — keep status_painting
const {
  painting_percentage: _pp,
  status_basing: _sb,
  status_varnished: _sv,
  status_assembly: _sa,
  status_assembly_override: _sao,
  status_basing_override: _sbo,
  status_varnished_override: _svo,
  ...rest
} = payload;
// rest now includes status_painting
await updateUnit.mutateAsync({ id: unit.id, ...rest });
```

And in `units.ts` `updateUnit`, change the `status_painting` binding to use COALESCE:

```sql
status_painting = COALESCE($10, status_painting),
```

---

## Warnings

### WR-01: Silent faction mismatch in `handleAddToCollection` silently pre-fills `faction_id: 0`

**File:** `src/features/unit-database/DatabaseBrowserPage.tsx:90-93`

**Issue:** When the user clicks "Add to Collection" for a UDB unit whose `faction_id` does not match any `wahapedia_faction_id` in the user's collection factions (e.g. the user has no Space Marines faction, or the backfill in migration 039 did not match the name), `matchedFaction` is `undefined` and `factionId` falls through to `0`. The `UnitSheet` form then pre-fills `faction_id: 0`, which is not a valid faction and will cause a foreign-key violation when the user saves. The user sees a generic "Failed to save unit" toast with no indication that the faction link is the problem.

**Fix:** Guard the missing-faction case and surface a descriptive error before opening the sheet:

```tsx
function handleAddToCollection(unit: UdbUnitDetail) {
  const matchedFaction = collectionFactions.find(
    (f) => f.wahapedia_faction_id === unit.faction_id,
  );
  if (!matchedFaction) {
    toast.warning(
      `No matching faction in your collection for "${unit.faction_id}". ` +
      "Create the faction first, then add this unit.",
    );
    return;
  }
  // ... rest of the function using matchedFaction.id
}
```

---

### WR-02: `useDeleteUnit` does not invalidate `["udb-ownership"]` cache

**File:** `src/hooks/useUnits.ts:78-97`

**Issue:** `useCreateUnit` (line 48) and `useUpdateUnit` (line 73) both invalidate `["udb-ownership"]` after success. `useDeleteUnit` (line 79) does not. Deleting a unit that was linked (`udb_unit_id IS NOT NULL`) will leave stale ownership badges in the database browser — the "Owned x2" badge will still show "Owned x2" until the user navigates away and triggers a natural refetch.

**Fix:** Add the ownership invalidation to `useDeleteUnit.onSuccess`:

```ts
onSuccess: () => {
  // ... existing invalidations ...
  // Phase 105 COL-04: refresh ownership badges
  qc.invalidateQueries({ queryKey: ["udb-ownership"] });
},
```

---

### WR-03: `resolveWorstStatus` initialises `worstIndex` to `Infinity` but treats index `-1` as lower — produces wrong result for all-unknown-status input

**File:** `src/features/unit-database/UdbUnitRow.tsx:25-39`

**Issue:** The loop compares `effectiveIdx < worstIndex` where `effectiveIdx` is `-1` for unknown statuses. This correctly picks unknown statuses as "worst". However `worstStatus` is initialised to `statuses[0] ?? "Not Started"` (line 27) before the loop runs. If the first status IS in `PAINTING_STATUS_ORDER` but a later status is NOT (effectiveIdx = -1), the loop sets `worstIndex = -1` and `worstStatus` to the unknown status string. On the next iteration any real status (index ≥ 0) is NOT less than -1, so it is skipped — correct. But if ALL statuses are unknown (all have index -1), only the first one sets `worstIndex = -1` and subsequent identical `-1 < -1` comparisons are false, so `worstStatus` ends up as the first unknown status. This is correct by coincidence. The real edge-case is an empty `allStatuses` string: `"".split("|")` yields `[""]`, `worstStatus` becomes `""`, and `PAINTING_STATUS_ORDER.indexOf("")` is `-1`, so the function returns `""`. The caller in `resolveReadinessLabel` then returns `"In progress ()"` — a garbled label displayed to the user.

**Fix:** Guard the empty-string case at the entry point:

```ts
export function resolveWorstStatus(allStatuses: string): string {
  if (!allStatuses) return "Not Started";
  const statuses = allStatuses.split("|").filter(Boolean);
  if (statuses.length === 0) return "Not Started";
  // ... rest unchanged
}
```

---

### WR-04: Missing `form` dependency in `useEffect` in `UnitSheet`

**File:** `src/features/units/UnitSheet.tsx:117-119`

**Issue:** The `useEffect` at line 117 calls `form.reset(...)` but `form` is not listed in the dependency array (only `[unit, defaultFactionId, prefill]`). In practice `form` is a stable object from `useForm` and rarely changes, but this violates the exhaustive-deps rule and will cause a lint/CI failure if the project ever enables that rule, and in theory will silently not re-run if `form` reference changes (e.g. if `useForm` is called conditionally in a future refactor).

**Fix:**

```tsx
useEffect(() => {
  form.reset(buildDefaultValues(unit, defaultFactionId, prefill));
}, [unit, defaultFactionId, prefill, form]);
```

---

### WR-05: FTS5 sanitizer does not strip `-` and `OR`/`AND`/`NOT` tokens — FTS syntax error possible

**File:** `src/db/queries/unitDatabase.ts:263`

**Issue:** The sanitizer strips `["'*^()]` but FTS5 also interprets `-` (NOT operator when prefix-applied), `AND`, `OR`, `NOT`, `NEAR` as operators. A query like `space marines -orks*` survives the sanitizer intact and becomes `space marines -orks**` (double `*` from appended prefix). More critically a bare `-` after the strip becomes `-*` which is an FTS5 syntax error that will throw and propagate to the UI as an unhandled query error. While this is not a security issue (parameterized binding prevents injection), it is a correctness issue that can crash the search for valid user inputs.

**Fix:** Extend the regex to also strip `-` and collapse whitespace:

```ts
const sanitized = trimmed
  .replace(/["'*^()\-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();
```

---

### WR-06: Plural/singular logic in `getUnlinkedUnitsCount` is inverted

**File:** `src/db/queries/diagnostics.ts:205`

**Issue:** `const plural = count !== 1 ? "s are" : " is"`. When `count = 1` this produces `"1 collection unit is not linked"` — correct. When `count = 3` this produces `"3 collection units are not linked"` — correct. But the test at `unlinkedUnitsDiagnostic.test.ts:47` asserts `result!.description` contains `"units are"` for count 3, and at line 53 asserts `"unit is"` for count 1. These assertions both pass with the current code, so the logic is actually correct. However the variable is named `plural` but the `" is"` branch is the **singular** value — the naming is inverted and confusing. More importantly, the string template on line 208 reads:

```ts
`${count} collection unit${plural} not linked to the canonical unit database`
```

When `count = 1`: `"1 collection unit is not linked"` — missing a space before "not" because `plural = " is"` (has a leading space) while `"s are"` (no leading space). This produces `"1 collection unit is not linked"` — the space comes from the variable value, making this work only by accident. When `count = 3` it produces `"3 collection units are not linked"` — correct.

The space asymmetry is fragile: `"s are"` has no leading space but relies on the word `unit` immediately preceding it (correct), while `" is"` has a leading space to separate `unit` from `is`. This is correct but only understandable by careful reading.

**Fix:** Make the construction explicit and rename for clarity:

```ts
const suffix = count !== 1 ? "s are" : " is";
// description already correct but make it readable:
description: `${count} collection unit${suffix} not linked to the canonical unit database`,
```

---

## Info

### IN-01: `DONE_STATUSES` in `UdbUnitRow.tsx` contains statuses not present in `PAINTING_STATUS_ORDER`

**File:** `src/features/unit-database/UdbUnitRow.tsx:11-17`

**Issue:** `DONE_STATUSES` includes `"Display Ready"` and `"Battle Ready"` which do not appear in `PAINTING_STATUS_ORDER` in `src/types/unit.ts`. This is inconsistent — `resolveReadinessDotClass` will return `bg-emerald-400` for these statuses (because `DONE_STATUSES.has(s)` is true), but `resolveWorstStatus` will treat them as index `-1` (worst/unknown) because they are absent from `PAINTING_STATUS_ORDER.indexOf(...)`. A unit with status `"Battle Ready"` would show a green dot but `resolveWorstStatus` would treat it as "unknown". The test at line 142 asserts `bg-emerald-400` for `"Display Ready"` — this passes, but if those statuses are ever used in `resolveWorstStatus` in a label, the result will be `"In progress (Battle Ready)"` rather than `"All copies painted"`.

**Fix:** Either add `"Display Ready"` and `"Battle Ready"` to `PAINTING_STATUS_ORDER`, or derive `DONE_STATUSES` from the tail of `PAINTING_STATUS_ORDER` to keep them in sync.

---

### IN-02: `FactionSheet` update path does not pass `wahapedia_faction_id` — field silently reset to `null` on edit

**File:** `src/features/factions/FactionSheet.tsx:80-88`

**Issue:** The `updateFaction.mutateAsync` call on line 80 passes all editable fields but omits `wahapedia_faction_id`. Depending on how `updateFaction` is implemented (if it uses a full-replace SQL rather than COALESCE), the faction's bridge column set by migration 039's backfill could be cleared on the first user edit of that faction. If `updateFaction` uses COALESCE or only updates provided fields this is safe, but the omission is an implicit assumption that should be verified against the query layer.

**Fix:** Pass `wahapedia_faction_id: faction.wahapedia_faction_id` through on the update path to be safe:

```ts
await updateFaction.mutateAsync({
  id: faction.id,
  // ... existing fields ...
  wahapedia_faction_id: faction.wahapedia_faction_id ?? null,
});
```

---

### IN-03: `handleAddToCollection` picks `unit.points[0]` as "lowest" but `points` array is ordered by `model_count`, not by `points`

**File:** `src/features/unit-database/DatabaseBrowserPage.tsx:97`

**Issue:** The comment says "Lowest points tier" and picks `unit.points[0]?.points`. The query in `unitDatabase.ts` line 205 orders by `model_count ASC`, not by `points ASC`. For most units these happen to be correlated (fewer models = fewer points), but they are not guaranteed to be the same. A unit where a 3-model squad costs 80 pts and a 1-model squad costs 100 pts (e.g. a leader + cheap retinue structure) would pre-fill with the wrong value.

**Fix:** Either pick `Math.min` explicitly or document the intent more precisely:

```ts
const basePoints =
  unit.points.length > 0
    ? Math.min(...unit.points.map((p) => p.points))
    : null;
```

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
