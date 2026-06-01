---
phase: 105-collection-integration
reviewed: 2026-06-01T14:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src-tauri/migrations/039_collection_udb_link.sql
  - src/types/unit.ts
  - src/types/faction.ts
  - src/db/queries/units.ts
  - src/db/queries/diagnostics.ts
  - src/hooks/useUnits.ts
  - src/features/units/UnitSheet.tsx
  - src/features/factions/FactionSheet.tsx
  - src/features/unit-database/UdbUnitRow.tsx
  - src/features/unit-database/UdbDatasheetSheet.tsx
  - src/features/unit-database/DatabaseBrowserPage.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 105: Code Review Report

**Reviewed:** 2026-06-01T14:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 105 adds the FK bridge between collection units and the canonical unit database (`udb_unit_id` on units, `wahapedia_faction_id` on factions), ownership badges/readiness dots in the browser UI, and the "Add to Collection" pre-fill flow. The migration, types, hooks, and UI wiring are generally sound. Two critical issues were found: (1) duplicate diagnostic functions producing double-counted warnings on the Data Health page, and (2) UnitSheet edit path silently discards `status_painting` changes. Three warnings cover an unsafe `updateUnit` contract that silently NULLs the FK for partial callers, an unguarded points array access assumption, and the `updateFaction` SQL missing the new `wahapedia_faction_id` column. Two info items note a `console.error` in production code and inconsistent done-status sets.

## Critical Issues

### CR-01: Duplicate diagnostic functions -- getAmbiguousPointMatches and getUnlinkedUnitsCount run identical SQL

**File:** `src/db/queries/diagnostics.ts:113-162`
**Issue:** `getAmbiguousPointMatches()` (lines 113-128) and `getUnlinkedUnitsCount()` (lines 135-149) both execute `SELECT COUNT(*) as c FROM units WHERE udb_unit_id IS NULL`. Both are called in `getDiagnosticFlags()` (lines 159-160). This means the Data Health page reports the same underlying condition twice under different labels (`"ambiguous_points"` and `"unlinked_units"`), doubling the warning count and confusing the user. The function name `getAmbiguousPointMatches` implies it should detect units with 0 or >1 datasheet_points matches (its original pre-phase-105 semantics), but it was rewritten to the same NULL-check as the new function. This is a regression in the original diagnostic's meaning.
**Fix:** Either restore `getAmbiguousPointMatches` to its original multi-match-detection logic, or remove it from `getDiagnosticFlags` and keep only the new `getUnlinkedUnitsCount`:
```ts
export async function getDiagnosticFlags(): Promise<DiagnosticFlag[]> {
  const results = await Promise.all([
    getOrphanedProgressRows(),
    // getAmbiguousPointMatches(), -- removed: now redundant with getUnlinkedUnitsCount
    getUnlinkedUnitsCount(),
  ]);
  return results.filter((f): f is DiagnosticFlag => f !== null);
}
```

### CR-02: UnitSheet edit path strips status_painting from updateUnit payload -- changes silently discarded

**File:** `src/features/units/UnitSheet.tsx:162-174`
**Issue:** The destructuring block at lines 163-173 strips `status_painting` (aliased to `_sp` at line 165) from the `payload` before passing `rest` to `updateUnit.mutateAsync`. The `buildDefaultValues` function (line 51) correctly populates `status_painting` from the unit record, and the form renders it as editable. But any change the user makes to `status_painting` in the edit form is silently dropped because the field is excluded from the mutation input. The SQL in `units.ts:88` uses `COALESCE($10, status_painting)`, and since `status_painting` is stripped, `$10` receives `null` (via `?? null`), preserving the old value. This means edits to painting status via UnitSheet are silently ignored -- a data-loss bug.
**Fix:** Remove `status_painting` from the destructured-out fields so it flows through to `updateUnit`:
```tsx
const {
  painting_percentage: _pp,
  // status_painting stays in `rest` so edits are saved
  status_basing: _sb,
  status_varnished: _sv,
  status_assembly: _sa,
  status_assembly_override: _sao,
  status_basing_override: _sbo,
  status_varnished_override: _svo,
  ...rest
} = payload;
await updateUnit.mutateAsync({ id: unit.id, ...rest });
```

## Warnings

### WR-01: updateUnit silently NULLs udb_unit_id when callers use Partial inputs without the field

**File:** `src/db/queries/units.ts:105,121`
**Issue:** The UPDATE SQL uses direct assignment for `udb_unit_id` (`udb_unit_id = $27`, no COALESCE) as noted in the comment at line 109. The parameter binding at line 121 is `input.udb_unit_id ?? null`. Since `UpdateUnitInput = Partial<CreateUnitInput> & { id: number }`, any call site that builds a partial update without explicitly providing `udb_unit_id` will have `input.udb_unit_id === undefined`, which `?? null` converts to SQL `NULL`, silently unlinking the unit. The UnitSheet edit path (line 158) correctly reads `unit.udb_unit_id`, but other callers of `updateUnit` across the codebase (painting mode, auto-derive, army list integrations) must all remember to pass `udb_unit_id` or the FK is silently destroyed. This is a fragile contract that invites data loss on any new call site.
**Fix:** Use COALESCE to make the default behavior safe (preserve existing FK), and only pass explicit `null` when intentional unlinking is desired:
```sql
udb_unit_id = COALESCE($27, udb_unit_id),
```

### WR-02: handleAddToCollection picks points[0] as "lowest" but array is ordered by model_count, not points

**File:** `src/features/unit-database/DatabaseBrowserPage.tsx:110`
**Issue:** The comment says "Lowest points tier" and the code picks `unit.points[0]?.points`. The underlying query orders the points array by `model_count ASC`, not by `points ASC`. For most units fewer models means fewer points, but this is not guaranteed. A unit where a 1-model configuration costs more than a 3-model configuration (e.g., a leader with cheap retinue) would pre-fill the wrong value.
**Fix:** Explicitly find the minimum points value:
```ts
const basePoints = unit.points.length > 0
  ? Math.min(...unit.points.map((p) => p.points))
  : null;
```

### WR-03: updateFaction SQL does not include wahapedia_faction_id -- no programmatic way to correct backfill errors

**File:** `src/db/queries/factions.ts:31-38` (cross-ref from `src/features/factions/FactionSheet.tsx:80-88`)
**Issue:** The `updateFaction` SQL has 7 parameters and does not include `wahapedia_faction_id` in its SET clause. This means the column is preserved during edits (correct), but there is no API path to update it after initial migration backfill. If the case-insensitive name match in migration 039 produced an incorrect mapping, or the user renames a faction, the `wahapedia_faction_id` becomes permanently wrong with no fix short of raw SQL. Since this column drives the "Add to Collection" faction matching (DatabaseBrowserPage.tsx:100-101), an incorrect mapping silently prevents the entire add-to-collection flow for that faction.
**Fix:** Add `wahapedia_faction_id` as `$8` to the `updateFaction` SQL:
```sql
UPDATE factions
    SET name = COALESCE($2, name),
        game_system = COALESCE($3, game_system),
        description = $4,
        color_theme = COALESCE($5, color_theme),
        icon_path = $6,
        lore_notes = $7,
        wahapedia_faction_id = COALESCE($8, wahapedia_faction_id),
        updated_at = datetime('now')
  WHERE id = $1
```

## Info

### IN-01: console.error in FactionSheet production path

**File:** `src/features/factions/FactionSheet.tsx:105`
**Issue:** `console.error("[FactionSheet] save failed:", err)` is present in the catch block. The toast already provides user feedback; the console.error leaks internal error details in production.
**Fix:** Remove the console.error or gate it behind `import.meta.env.DEV`.

### IN-02: DONE_STATUSES contains values absent from PAINTING_STATUS_ORDER

**File:** `src/features/unit-database/UdbUnitRow.tsx:11-16`
**Issue:** `DONE_STATUSES` includes `"Display Ready"` and `"Battle Ready"` which are not in `PAINTING_STATUS_ORDER` (defined in `src/types/unit.ts:8-20`). `resolveReadinessDotClass` treats them as "done" (green dot), but `resolveWorstStatus` treats them as index `-1` (worst/unknown). A unit with status `"Battle Ready"` would show a green dot but `resolveReadinessLabel` would return `"In progress (Battle Ready)"` if mixed with other non-done statuses. These sets should be kept consistent.
**Fix:** Add `"Display Ready"` and `"Battle Ready"` to `PAINTING_STATUS_ORDER`, or derive `DONE_STATUSES` from the tail of `PAINTING_STATUS_ORDER`.

---

_Reviewed: 2026-06-01T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
