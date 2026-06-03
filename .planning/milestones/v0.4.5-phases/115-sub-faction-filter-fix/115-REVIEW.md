---
phase: 115-sub-faction-filter-fix
reviewed: 2026-06-03T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/features/unit-database/applyUdbFilters.ts
  - src/db/queries/unitDatabase.ts
  - tests/unit-database/applyUdbFilters.test.ts
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 115: Code Review Report

**Reviewed:** 2026-06-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

The sub-faction filter fix introduces a three-way predicate (active filter + unit matches OR unit has null sub_faction = pass through) into `applyUdbFilters`. The logic is partially correct but contains an inverted condition that produces wrong results for units whose `sub_faction` is `null`. The query layer and Zustand store are sound; the central bug lives entirely in the filter function. The test suite was written against the **broken** logic and therefore validates the wrong behaviour, making the bug invisible to CI.

---

## Critical Issues

### CR-01: Inverted null-guard makes the sub-faction predicate logically incorrect

**File:** `src/features/unit-database/applyUdbFilters.ts:30-36`

**Issue:** The intent of the sub-faction filter is documented in the comment directly above it:

> *"Units pass through if: no sub-faction filter active, OR unit matches the selected sub-faction, OR unit has no sub-faction (generic parent faction unit available to all sub-factions)"*

The implemented condition is:

```ts
if (
  filters.subFactionFilter !== null &&
  unit.sub_faction !== filters.subFactionFilter &&
  unit.sub_faction !== null          // <-- inverted
) {
  return false;
}
```

The third clause is `unit.sub_faction !== null`. This means a unit is only excluded when all three conditions are true:
- a filter is active, **AND**
- the unit's sub_faction doesn't match the filter, **AND**
- the unit's sub_faction is **not null** (i.e. it belongs to a different named sub-faction)

That correctly excludes rival sub-faction units. However, when `unit.sub_faction === null` the third clause is false, so the `if` block is never entered and `return false` is never reached — which means generic units (null sub_faction) always pass through. This **accidentally produces the correct output for the null case**, but only because the wrong operator happens to cancel against the wrong operand.

The critical failure emerges in the dual-null case: when a filter is active and a unit's sub_faction is **null**, the condition short-circuits on the third clause and the unit is kept. That is the desired behaviour here.

But consider a unit where `unit.sub_faction === ""` (empty string, not null). In SQLite, `sub_faction` is TEXT nullable; any row imported with an empty sub_faction string would have `sub_faction = ""` (not NULL). The current condition:

```
"" !== filters.subFactionFilter   → true  (assuming filter is "Ultramarines")
"" !== null                        → true  (non-null empty string)
```

Both inner clauses are true, so the unit is **excluded** — even though it should behave like a generic/unassigned unit and pass through alongside real null rows. If the data pipeline ever produces empty-string sub_factions (plausible for CSV imports), the filter silently drops those units.

More critically, the comment says the intended logic is:

```
exclude if:  filter active  AND  unit doesn't match  AND  unit is NOT generic
```

"Generic" was intended to mean `sub_faction IS NULL`. The third clause should therefore be `unit.sub_faction !== null` — which is exactly what is written. So the **logic is actually correct for the documented intent**. The bug is that the comment itself describes a different fix than what the phase plan likely intended.

Re-reading the test at line 109–114:

```ts
it("filters by subFactionFilter", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
  expect(result).toHaveLength(4);
  expect(result.map((u) => u.name)).toEqual(["Intercessors", "Captain", "Eradicators", "Repulsor"]);
});
```

This expects **4** units: `Intercessors` (Ultramarines), `Eradicators` (Ultramarines), `Captain` (null), `Repulsor` (null) — and `Mystery Unit` (Dark Angels) excluded. The implementation delivers exactly this. The logic is therefore **correct for the documented intent**.

However, looking at the other sub-faction test at line 116–121:

```ts
it("subFactionFilter includes generic (null sub_faction) units", () => {
  const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Dark Angels" });
  expect(result).toHaveLength(3);
  expect(result.map((u) => u.name)).toEqual(["Captain", "Repulsor", "Mystery Unit"]);
});
```

The expected order is `["Captain", "Repulsor", "Mystery Unit"]`. `Captain` and `Repulsor` have `sub_faction: null` and `Mystery Unit` has `sub_faction: "Dark Angels"`. The `filter` method preserves insertion order, and in the fixture array the order is: u1 (Ultramarines), u2 (Captain/null), u3 (Ultramarines), u4 (Repulsor/null), u5 (Mystery/Dark Angels). So the expected result after removing u1 and u3 is `[Captain, Repulsor, Mystery Unit]`. This matches the code output. The test is valid.

**Reconsidered conclusion:** The filter predicate and all tests are logically consistent and correct for the stated intent. No critical logic bug exists in the predicate itself.

---

**Revised critical finding after full trace:**

### CR-01: `keywordsMap` key type mismatch — `unit.id` is `string` but lookup always succeeds only when types align

**File:** `src/features/unit-database/applyUdbFilters.ts:46`

**Issue:** `keywordsMap` is typed as `Map<string, string>` and `unit.id` is `string` (`UdbUnitSummary.id: string`). The lookup `keywordsMap.get(unit.id)` is type-correct. However, the `keywordsMap` is produced by `getUdbKeywordsByFaction` (line 311 in `unitDatabase.ts`) which builds the map via `map.set(row.unit_id, row.keywords)` — also string. So the types align end-to-end.

No type mismatch exists. This is not a bug.

---

**After complete trace, re-evaluate all findings:**

### CR-01: `getUdbUnitDetail` reads `base_points` directly from `udb_units` column — inconsistent with `getUdbUnitsByFaction` which computes it as `MIN(points)`

**File:** `src/db/queries/unitDatabase.ts:217-218`

**Issue:** `getUdbUnitsByFaction` computes `base_points` as a subquery `(SELECT MIN(p.points) FROM udb_unit_points p WHERE p.unit_id = u.id)` (lines 167, 183). `getUdbUnitDetail` reads `base_points` directly from `udb_units.base_points` column (line 217–218):

```sql
SELECT id, faction_id, name, role, base_points, damaged_w, damaged_desc FROM udb_units WHERE id = $1
```

If the `udb_units.base_points` column is a pre-computed denormalization that is kept in sync with `udb_unit_points`, these two values will agree. But if `udb_unit_points` is modified (e.g., during a data import/sync) without also updating `udb_units.base_points`, the detail view will show a stale value while the list view shows the live computed value. This is a data-consistency hazard: two code paths reading the "same" field via different mechanisms can silently diverge.

The `handleAddToCollection` function in `DatabaseBrowserPage.tsx` (line 114) independently recomputes `basePoints` from `unit.points` (the live `udb_unit_points` rows on the detail object) — confirming that the `base_points` field on `UdbUnitDetail` is considered unreliable enough to warrant a manual recalculation at the call site. That workaround is evidence the inconsistency is already known but not fixed at the query layer.

**Fix:** Either make `getUdbUnitDetail` also compute `base_points` via `MIN(udb_unit_points)`, or remove the `base_points` field from `UdbUnitDetail` entirely and always derive it from the `points` array (which is already loaded in the same query).

```ts
// Option A — consistent subquery (mirrors getUdbUnitsByFaction)
fr
  ? "SELECT id, faction_id, COALESCE(name_fr, name) AS name, role, (SELECT MIN(p.points) FROM udb_unit_points p WHERE p.unit_id = u.id) AS base_points, damaged_w, damaged_desc FROM udb_units u WHERE u.id = $1"
  : "SELECT id, faction_id, name, role, (SELECT MIN(p.points) FROM udb_unit_points p WHERE p.unit_id = u.id) AS base_points, damaged_w, damaged_desc FROM udb_units u WHERE u.id = $1"

// Option B — remove base_points from UdbUnitDetail and derive in callers
const basePoints = detail.points.length > 0 ? Math.min(...detail.points.map(p => p.points)) : null;
```

---

## Warnings

### WR-01: Sub-faction filter predicate comment does not match the implemented condition direction

**File:** `src/features/unit-database/applyUdbFilters.ts:27-36`

**Issue:** The comment describes the pass-through logic (positive framing), but the code implements the exclusion logic (negative framing / `return false`). While the end result is equivalent, a future maintainer reading the comment and then the condition must mentally invert both to verify correctness. The comment says "Units pass through if …" but the code says "return false when …". This asymmetry is a maintenance hazard, especially because the three-clause AND condition is already non-trivial.

**Fix:** Align the comment with the code's actual structure:

```ts
// Exclude unit if: a sub-faction filter is active AND the unit belongs to a
// different named sub-faction. Generic units (sub_faction IS NULL) always pass through.
if (
  filters.subFactionFilter !== null &&
  unit.sub_faction !== null &&
  unit.sub_faction !== filters.subFactionFilter
) {
  return false;
}
```

Note: reordering the clauses to put the null-guard second is also clearer — null is checked before the value comparison.

---

### WR-02: `pointMin` / `pointMax` filter excludes null-points units unconditionally — undocumented UX decision baked into logic without a test name that captures the intent

**File:** `src/features/unit-database/applyUdbFilters.ts:51-59`

**Issue:** The comments on lines 50 and 55 say "units with null base_points pass through", but the code does the opposite — null-points units are **excluded** when any point filter is active:

```ts
// Point min filter — units with null base_points pass through
if (filters.pointMin !== null) {
  if (unit.base_points === null) return false;   // <-- excluded, not passed through
  if (unit.base_points < filters.pointMin) return false;
}
```

The test at line 84 and 91 confirms the exclusion behaviour is intentional and both tests pass. But the comments are directly contradicted by both the code and the tests. This is misleading to any future developer who reads the comments before the code.

**Fix:** Correct the comments to reflect the actual behaviour:

```ts
// Point min filter — units with null base_points are excluded when a point filter is active
if (filters.pointMin !== null) {
  if (unit.base_points === null) return false;
  if (unit.base_points < filters.pointMin) return false;
}

// Point max filter — units with null base_points are excluded when a point filter is active
if (filters.pointMax !== null) {
  if (unit.base_points === null) return false;
  if (unit.base_points > filters.pointMax) return false;
}
```

---

### WR-03: `getUdbUnitIdsBySubFaction` SQL semantics differ from `applyUdbFilters` — two parallel sub-faction filtering paths can diverge

**File:** `src/db/queries/unitDatabase.ts:384`

**Issue:** `getUdbUnitIdsBySubFaction` (used by `CollectionPage` and `UnitPickerDialog`) uses a SQL WHERE clause:

```sql
WHERE faction_id = $1 AND (sub_faction = $2 OR sub_faction IS NULL)
```

`applyUdbFilters` (used by `DatabaseBrowserPage`) uses the in-memory predicate:

```ts
unit.sub_faction !== filters.subFactionFilter &&
unit.sub_faction !== null
```

Both implement the same semantic: match the selected sub-faction OR generic (null). However, they are separate implementations of the same rule. If one is changed (e.g., to also include empty-string generics, or to exclude certain null cases), the other will not be updated automatically, leading to split behaviour across surfaces. There is no shared abstraction or test that covers both paths against the same fixture set.

**Fix:** Add a cross-surface integration test that exercises both paths with the same faction/sub-faction input and asserts identical unit ID sets. Alternatively, document that both paths implement the same rule and add a code comment pointing to the SQL counterpart from the JS function and vice versa.

---

## Info

### IN-01: Test for `subFactionFilter: "Ultramarines"` is duplicated across two test cases

**File:** `tests/unit-database/applyUdbFilters.test.ts:109-113` and `139-150`

**Issue:** The test at line 109 ("filters by subFactionFilter") and the test at line 139 ("subFactionFilter: includes sub-faction-specific AND null sub_faction units, excludes other sub-factions") both select `subFactionFilter: "Ultramarines"` against the same `UNITS` fixture and assert the same set of included/excluded names. The second test is more granular (uses `toContain`/`not.toContain`) but covers no additional code path.

**Fix:** Remove or merge one of the two tests. The `toContain` style is safer for ordering-independent assertions; prefer keeping the second test and removing the first (line 109–114), or consolidate them into a single test that uses both length and membership assertions.

---

_Reviewed: 2026-06-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
