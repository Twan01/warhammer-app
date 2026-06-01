---
phase: 106-army-list-simplification
reviewed: 2026-06-01T14:30:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - src-tauri/migrations/040_drop_synced_points.sql
  - src/db/queries/armyLists.ts
  - src/db/queries/dashboard.ts
  - src/db/queries/diagnostics.ts
  - src/lib/resolveUnitPoints.ts
  - src/types/armyList.ts
  - src/hooks/useLoadoutOptions.ts
  - src/hooks/useArmyLists.ts
  - src/components/common/DbHealthGate.tsx
  - src/features/army-lists/ArmyListUnitRow.tsx
  - src/features/army-lists/LoadoutBuilderSheet.tsx
  - src/features/army-lists/PointsSourceChip.tsx
  - src/features/army-lists/ArmyListSummaryBar.tsx
  - src/features/data-health/TableCountsGrid.tsx
  - src/features/rules-hub/DatasheetPointsTab.tsx
  - src/features/units/UnitFormOptional.tsx
  - src/features/units/UnitTableColumns.tsx
  - src/lib/computeUnitWarnings.ts
  - tests/lib/computeUnitWarnings.test.ts
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 106: Code Review Report

**Reviewed:** 2026-06-01T14:30:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Phase 106 replaces the old name-based synced_unit_points cache with FK-based points resolution via udb_unit_points, drops the cache tables, and adds BATTLELINE count validation. The core COALESCE chain and resolver logic are sound and well-documented. However, there are two critical issues: a duplicate diagnostic function that will produce misleading counts, and a multi-statement delete without a transaction wrapper that risks partial deletes on error. Several warnings around edge cases and a potential delta calculation bug in LoadoutBuilderSheet.

## Critical Issues

### CR-01: Duplicate diagnostic functions produce double-counted warnings

**File:** `src/db/queries/diagnostics.ts:113-148`
**Issue:** `getAmbiguousPointMatches()` and `getUnlinkedUnitsCount()` execute the exact same SQL query (`SELECT COUNT(*) as c FROM units WHERE udb_unit_id IS NULL`) and are both called from `getDiagnosticFlags()` (lines 159-160). When any unlinked units exist, both functions return a non-null flag, producing two separate warning entries for the same underlying condition. The `getAmbiguousPointMatches` function was originally designed for a different check (name-based ambiguous matching with 0 or >1 results) but was rewritten in Phase 106 to be identical to `getUnlinkedUnitsCount`. This means the diagnostics page will show duplicate warnings.
**Fix:** Remove `getAmbiguousPointMatches()` from `getDiagnosticFlags()` or delete the function entirely, since `getUnlinkedUnitsCount()` covers the same check with a clearer name and better description text:
```ts
export async function getDiagnosticFlags(): Promise<DiagnosticFlag[]> {
  const results = await Promise.all([
    getOrphanedProgressRows(),
    getUnlinkedUnitsCount(),
  ]);
  return results.filter((f): f is DiagnosticFlag => f !== null);
}
```

### CR-02: deleteArmyList performs 5 sequential statements without a transaction

**File:** `src/db/queries/armyLists.ts:191-198`
**Issue:** `deleteArmyList` executes 5 dependent SQL statements (delete enhancements, delete snapshots, clear leader refs, delete units, delete list) as individual `db.execute` calls with no transaction wrapper. If any intermediate statement fails (e.g., a transient lock error under WAL contention), earlier deletes will have committed and the list will be left in a corrupted partial state -- e.g., enhancements deleted but the list itself still present, or units deleted but the list row remaining. The comment block (lines 177-189) carefully documents the deletion order needed for FK safety but does not address atomicity.
**Fix:** Wrap all statements in a transaction:
```ts
export async function deleteArmyList(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION");
  try {
    await db.execute("DELETE FROM army_list_enhancements WHERE list_id = $1", [id]);
    await db.execute("DELETE FROM army_list_snapshots WHERE list_id = $1", [id]);
    await db.execute("UPDATE army_list_units SET leader_attached_to_id = NULL WHERE list_id = $1", [id]);
    await db.execute("DELETE FROM army_list_units WHERE list_id = $1", [id]);
    await db.execute("DELETE FROM army_lists WHERE id = $1", [id]);
    await db.execute("COMMIT");
  } catch (err) {
    await db.execute("ROLLBACK");
    throw err;
  }
}
```

## Warnings

### WR-01: battleReadyPct denominator inflated by enhancement points

**File:** `src/lib/computeUnitWarnings.ts:136-144`
**Issue:** `computeListHealthStats` adds `enhancementTotal` to `totalPoints` (line 137: `const totalPoints = unitPoints + enhancementTotal`), then uses `totalPoints` as the denominator for `battleReadyPct` (line 144). However, `paintedPoints` only sums `effective_points` from painted units -- it does not include enhancement points. This means adding enhancements reduces `battleReadyPct` even when no painting status has changed. For example, a fully painted army with 1000 unit points and 100 enhancement points would show 91% battle-ready instead of 100%. Enhancement points are not "paintable" and should not dilute the readiness metric.
**Fix:** Use `unitPoints` (not `totalPoints`) as the denominator for battleReadyPct:
```ts
const battleReadyPct =
  unitPoints > 0 ? Math.round((paintedPoints / unitPoints) * 100) : 0;
```

### WR-02: LoadoutBuilderSheet delta computation always returns 0 for current tier

**File:** `src/features/army-lists/LoadoutBuilderSheet.tsx:114-120`
**Issue:** `computeDelta` compares a selected tier's points against `currentTierPoints` (the currently active tier). But when rendering the delta badge (lines 199-215), it passes `String(unit.selected_model_count)` -- the *currently selected* tier -- to `computeDelta`. This always finds the same tier, producing delta = 0, and the badge is never shown. The delta badge appears designed to show the difference from the previous selection, but it can never display since it compares the current selection to itself.
**Fix:** Either remove the delta badge (dead UI code), or track the previous tier selection to compute a meaningful delta.

### WR-03: Ghost units trigger false "Not painted" and "Not assembled" warnings

**File:** `src/lib/computeUnitWarnings.ts:53-67`
**Issue:** `computeUnitWarnings` checks `status_painting !== "Completed"` and `status_assembly === 0` for all units including ghost units. Ghost units have `status_painting: null` and `status_assembly: null` (per the type definition). For ghost units, `null !== "Completed"` is true, so they always trigger "Not painted". `null === 0` is false, so "Not assembled" is correctly skipped. Ghost units cannot be painted or assembled (they are planned/proxy units with no physical model), so "Not painted" is misleading noise.
**Fix:** Add a guard clause at the top of `computeUnitWarnings`:
```ts
// Ghost units have no physical model — skip painting/assembly checks
const isGhost = !('unit_id' in unit) || unit.unit_id === null;
```
Then wrap the painting/assembly checks accordingly. Note: the function's `Pick` type does not include `unit_id`, so either widen the Pick or handle `null` status values.

### WR-04: updateArmyList uses mixed COALESCE and direct-assignment without documentation

**File:** `src/db/queries/armyLists.ts:120-141`
**Issue:** `updateArmyList` uses COALESCE for `name`, `faction_id`, `points_limit`, `detachment_id`, and `detachment_name` (preventing NULL passthrough), but uses direct assignment for `list_type` and `notes` (allowing NULL passthrough). This asymmetry means a partial update call with `{ id: 1, name: "New" }` will silently null out `list_type` and `notes` (since `input.list_type ?? null` becomes NULL). While `clearArmyListDetachment` and `clearArmyListPointsLimit` exist as explicit NULL-clearing functions for the COALESCE columns, the caller of `updateArmyList` must always pass all fields or risk data loss on `list_type` and `notes`. The doc comment on the function does not warn about this.
**Fix:** Either make `list_type` and `notes` also use COALESCE (matching the other columns), or add a prominent doc warning that callers must always supply all fields. Verify all call sites pass complete data.

### WR-05: removeUnitFromList multi-step delete lacks transaction

**File:** `src/db/queries/armyLists.ts:219-231`
**Issue:** Same pattern as CR-02 but at smaller scale. `removeUnitFromList` runs 3 sequential statements (clear leader refs, delete enhancements, delete unit row) without a transaction. If the middle statement fails, leader attachments are already cleared but the unit and its enhancements remain.
**Fix:** Wrap in a transaction, same pattern as CR-02.

## Info

### IN-01: Unused `_context` parameter in computeUnitWarnings

**File:** `src/lib/computeUnitWarnings.ts:55`
**Issue:** The `_context` parameter (prefixed with `_` to suppress unused warnings) is accepted but never used. After the Phase 76 split, all context-dependent checks moved to `computeListWarnings`, but the parameter remains in the signature, adding complexity to every call site.
**Fix:** Consider removing the parameter if no future use is planned, or document the intent to use it later.

### IN-02: Test file has UTF-8 rendering artifacts

**File:** `tests/lib/computeUnitWarnings.test.ts:11,396`
**Issue:** Lines 11 and 396 contain `â€"` (UTF-8 mojibake for em-dash). This is a cosmetic issue in comments/descriptions that does not affect test execution, but indicates the file was saved or transformed with incorrect encoding at some point.
**Fix:** Replace `â€"` with `--` or a proper em-dash character.

---

_Reviewed: 2026-06-01T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
