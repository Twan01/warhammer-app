---
phase: 138-player-journey-depth
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/app/router.tsx
  - src/db/queries/unitDatabase.ts
  - src/features/dashboard/DashboardPage.tsx
  - src/features/dashboard/GoalProgressCard.tsx
  - src/features/unit-database/DatabaseBrowserPage.tsx
  - src/features/unit-database/UdbDatasheetSheet.tsx
  - src/features/unit-database/UdbSearchResults.tsx
  - src/features/unit-database/UdbUnitRow.tsx
  - src/features/unit-database/UnitCompareActionBar.tsx
  - src/features/unit-database/UnitCompareColumn.tsx
  - src/features/unit-database/UnitComparePage.tsx
  - src/features/unit-database/databaseBrowserFilters.ts
  - src/features/units/CollectionPage.tsx
  - src/features/units/applyUnitFilters.ts
  - src/features/units/collectionFilters.ts
  - src/hooks/useUnitDatabase.ts
  - src/hooks/useUnits.ts
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 138: Code Review Report

**Reviewed:** 2026-06-18
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 138 delivers a unit comparison view (batched `getUdbUnitsByIds` + `useUdbUnitsByIds` +
compare-selection Zustand Set + `/unit-database/compare` route + `UnitCompareColumn` diff
highlighting), a Collection deep-link from UDB ownership badges, cross-faction search ownership
via a new `useUdbOwnershipAll` hook, and a dashboard `GoalProgressCard` widget.

The cache-invalidation symmetry for the new `["udb-ownership-all"]` key is correctly applied
across all three unit mutations (`useCreateUnit`, `useUpdateUnit`, `useDeleteUnit`). The
positional SQL placeholder approach in `getUdbUnitsByIds` is safe — ids are never
string-interpolated. The Zustand compare-selection state correctly enforces the 3-unit cap.

Two blockers surface: a logic inversion in `resolveWorstStatus` that causes an unknown/garbage
painting status string to permanently override any recognized status when it appears first in
the pipe-delimited list, and a critical omission in `hasActiveFilters` that silently hides the
UDB deep-link filter from the "active filters" indicator and empty-state messaging in
`CollectionPage`. Three warnings round out the report.

---

## Critical Issues

### CR-01: `resolveWorstStatus` index-minus-one wins permanently over any recognized status

**File:** `src/features/unit-database/UdbUnitRow.tsx:32-43`

**Issue:**
`PAINTING_STATUS_ORDER.indexOf()` returns `-1` for any status string not in the array (e.g. a
future status value, a DB migration artefact, or an empty pipe-segment from a trailing `|`).
The loop initializes `worstIndex = Infinity`. On the first unknown status, `-1 < Infinity` is
`true`, so `worstIndex` is set to `-1`. On every subsequent recognized status, `idx >= 0`, so
`idx < -1` is always `false` — the recognized status is never selected. The function returns
the unrecognized string as "worst status" regardless of what real statuses follow it in the
pipe list. This directly corrupts the readiness dot label (shown in the tooltip) and the
`UnitCompareColumn` worst-status display when any unit in the collection carries a non-standard
painting status.

```
Example:
allStatuses = "UnknownStatus|Not Started|Varnished"
→ iteration 1: idx=-1 < Infinity → worstIndex=-1, worstStatus="UnknownStatus"
→ iteration 2: idx=0  < -1  → false, skipped
→ iteration 3: idx=10 < -1  → false, skipped
→ returns "UnknownStatus"   ← WRONG; should return "Not Started" (idx=0)
```

**Fix:** Treat `-1` (unrecognized) as the absolute worst floor but allow recognized statuses
to win over it. Reset to `Infinity` for the worst-index sentinel and treat unknown as a special
case:

```typescript
export function resolveWorstStatus(allStatuses: string): string {
  if (!allStatuses) return "Not Started";
  const statuses = allStatuses.split("|").filter(Boolean); // guard trailing |
  let worstIdx = Infinity;
  let worstStatus = statuses[0] ?? "Not Started";
  let hasRecognized = false;

  for (const status of statuses) {
    const idx = PAINTING_STATUS_ORDER.indexOf(
      status as (typeof PAINTING_STATUS_ORDER)[number],
    );
    if (idx === -1) {
      // Unrecognized: only use as fallback if no recognized status found yet
      if (!hasRecognized) worstStatus = status;
      continue;
    }
    hasRecognized = true;
    if (idx < worstIdx) {
      worstIdx = idx;
      worstStatus = status;
    }
  }

  return worstStatus;
}
```

---

### CR-02: `hasActiveFilters` omits `udbUnitIdFilter` — empty-state messaging lies to users

**File:** `src/features/units/CollectionPage.tsx:67-74`

**Issue:**
`udbUnitIdFilter` is read from Zustand (line 50) and applied to `preFilteredUnits` (line 79),
but it is NOT included in the `hasActiveFilters` boolean on lines 67-74. When a user arrives
at `/collection` via the "Owned xN" deep-link badge in the UDB (which sets `udbUnitIdFilter`),
the collection shows only the matching units, but `hasActiveFilters` is `false`. Both
`UnitTable` and `UnitGallery` consume `hasActiveFilters` to decide whether the empty state
reads "No units match your current filters" (with a Clear button) or "Your collection is empty"
(with an Add Unit CTA). If the deep-link filter produces zero results — because the user owns
the unit under a different `udb_unit_id` mapping — the page displays "Your collection is empty"
and shows the Add Unit CTA instead of offering to clear filters. This is actively misleading.
The user sees an empty collection when they actually have units, just filtered away.

**Fix:**

```typescript
const hasActiveFilters =
  search.length > 0 ||
  factionsSel.length > 0 ||
  statusesSel.length > 0 ||
  categoriesSel.length > 0 ||
  activeOnly ||
  battleReady ||
  subFactionFilter !== null ||
  udbUnitIdFilter !== null;   // ← add this line
```

---

## Warnings

### WR-01: `getUdbUnitsByIds` is not a true batch query — it fires N×6 sub-table queries

**File:** `src/db/queries/unitDatabase.ts:304-349`

**Issue:**
The function header and the hook comment in `useUnitDatabase.ts:95` both advertise "ONE batched
call" and "single WHERE id IN (...) query." That is only true for the unit rows themselves.
After fetching the unit rows in one query, each matched unit spawns 6 additional `$1`-param
queries inside a `Promise.all` (models, weapons, abilities, keywords, points, composition).
For 3 compared units this is 1 + (3 × 6) = 19 DB round-trips. For 1 unit it is 7 round-trips
— identical to calling `getUdbUnitDetail` once. The "batch" only saves N-1 unit-row queries
(i.e. 2 for the max 3-unit compare), not the dominant sub-table cost. This misleads future
maintainers who may assume the function is cheap to call with large id lists and is the wrong
foundation if the compare selection cap is ever raised.

This is not a correctness bug for the current 3-unit cap, but it is an architectural
misrepresentation. The doc comment should be corrected and the function should not be described
as a batch to downstream callers.

**Fix:** Update the JSDoc to accurately describe the query pattern and note the sub-table fan-out:

```typescript
/**
 * Phase 138-01 PLAY-01 D-02: Multi-id fetch — loads up to `ids.length` units.
 *
 * Issues one WHERE id IN ($1...$N) query for unit rows, then for EACH returned
 * unit fires 6 parallel sub-table queries (models, weapons, abilities, keywords,
 * points, composition). Total round-trips: 1 + (N × 6).
 * Safe for small N (≤3 with the compare cap). Do not call with large id lists.
 */
```

---

### WR-02: `UDB_UNITS_BY_IDS_KEY` factory double-sorts — introduces a stale-cache risk

**File:** `src/hooks/useUnitDatabase.ts:98-99`

**Issue:**
The key factory already sorts the ids array: `["udb-units-by-ids", [...ids].sort(), locale]`.
`UnitComparePage` also sorts before calling the hook: `const ids = useMemo(() => [...compareIds].sort(), ...)`.
The double sort is harmless today, but the key factory's internal sort creates a subtle
contract risk: a caller who passes an unsorted `ids` array will get a cache key that differs
from what they might expect if they inspected the `queryKey` after the fact (the key contains
the sorted copy, not the input). More critically, `UnitComparePage` sorts inside a `useMemo`
with `[compareIds]` as dependency. Because `compareIds` is a Zustand `Set`, React compares it
by reference. Adding then removing then re-adding the same id produces a new `Set` reference
every time even if the contents are identical — the `useMemo` recomputes and the hook
re-fetches (though the result will be a React Query cache hit due to stable key after sorting).
The real fix is to derive the sorted array once, in one place.

**Fix:** Remove the sort from the key factory and let callers own the stable array:

```typescript
// In useUnitDatabase.ts — remove internal sort; caller is responsible for stable input
export const UDB_UNITS_BY_IDS_KEY = (ids: string[], locale: Locale) =>
  ["udb-units-by-ids", ids, locale] as const;

// UnitComparePage already provides a sorted stable array — this is the correct pattern
const ids = useMemo(() => [...compareIds].sort(), [compareIds]);
```

---

### WR-03: `UdbUnitRow` mounts a fresh `TooltipProvider` per table row

**File:** `src/features/unit-database/UdbUnitRow.tsx:135-166`

**Issue:**
`TooltipProvider` (Radix `TooltipPrimitive.Provider`) wraps the compare-toggle `Tooltip` inside
each `UdbUnitRow`. `AppLayout` already mounts a `TooltipProvider` at `delayDuration={200}` that
covers the entire standard-routes subtree. The per-row provider overrides `delayDuration` back
to the Radix default (700 ms) for compare-toggle tooltips while every other tooltip in the app
uses 200 ms. When a faction has 100+ units, 100+ nested `TooltipProvider` context nodes are
mounted simultaneously — each one a React Context that forces a re-render of its subtree when
its value changes. This causes a measurable lag when scrolling through large unit lists.

**Fix:** Remove the per-row `TooltipProvider` wrapper. The ancestor `AppLayout` provider is
sufficient:

```tsx
// UdbUnitRow.tsx — remove TooltipProvider import and wrapper
<Tooltip>
  <TooltipTrigger asChild>
    <Button ... >
      <GitCompare size={16} aria-hidden="true" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>{compareAriaLabel}</p>
  </TooltipContent>
</Tooltip>
```

---

## Info

### IN-01: `DatasheetImportDialog` in `DashboardPage` is rendered with a permanently `null` payload — dead code path

**File:** `src/features/dashboard/DashboardPage.tsx:527-532`

**Issue:**
`conflictPayload` state is initialized to `null` and `setConflictPayload` is never called
anywhere in `DashboardPage`. The `DatasheetImportDialog` at the bottom of the file is always
rendered with `open={false}` and `conflicts={[]}`. This is dead code: either the wiring to
set `conflictPayload` was removed in a prior refactor and never cleaned up, or it was
copy-pasted from `CollectionPage` and the triggering logic was never added.

**Fix:** Remove the `conflictPayload` state, the `setConflictPayload` calls, and the
`DatasheetImportDialog` mount from `DashboardPage` unless there is a concrete plan to wire it.

```tsx
// Remove:
const [conflictPayload, setConflictPayload] = useState<DatasheetImportPayload | null>(null);
// And the DatasheetImportDialog at the bottom of the return.
// Also remove the unused DatasheetImportPayload import.
```

---

### IN-02: `UnitComparePage` page-level `STAT_FIELDS` duplicates the constant in `UnitCompareColumn`

**File:** `src/features/unit-database/UnitComparePage.tsx:17` and `src/features/unit-database/UnitCompareColumn.tsx:21`

**Issue:**
`STAT_FIELDS = ["M", "T", "Sv", "W", "Ld", "OC"] as const` is declared identically in both
`UnitComparePage.tsx` (line 17) and `UnitCompareColumn.tsx` (line 21). If a new stat field is
added or reordered in the future, both files must be updated in sync or the `statDiffMap`
computed in `UnitComparePage` will diverge from the fields rendered in `UnitCompareColumn`.

**Fix:** Export the constant from `UnitCompareColumn.tsx` (or a shared types file) and import
it in `UnitComparePage.tsx`:

```typescript
// UnitCompareColumn.tsx
export const STAT_FIELDS = ["M", "T", "Sv", "W", "Ld", "OC"] as const;
export type StatField = (typeof STAT_FIELDS)[number];

// UnitComparePage.tsx
import { STAT_FIELDS } from "./UnitCompareColumn";
```

---

_Reviewed: 2026-06-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
