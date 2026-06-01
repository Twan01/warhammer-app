---
phase: 104-database-browser-ui
reviewed: 2026-06-01T12:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/db/queries/unitDatabase.ts
  - src/hooks/useUnitDatabase.ts
  - src/features/unit-database/databaseBrowserFilters.ts
  - src/features/unit-database/applyUdbFilters.ts
  - src/features/unit-database/factionAlignmentMap.ts
  - src/app/unit-database/page.tsx
  - src/features/unit-database/DatabaseBrowserPage.tsx
  - src/app/router.tsx
  - src/components/common/AppSidebar.tsx
  - src/features/unit-database/FactionPicker.tsx
  - src/features/unit-database/UdbFilterBar.tsx
  - src/features/unit-database/UdbUnitList.tsx
  - src/features/unit-database/UdbUnitRow.tsx
  - src/features/unit-database/UdbSearchResults.tsx
  - src/features/unit-database/UdbDatasheetSheet.tsx
findings:
  critical: 2
  warning: 4
  info: 1
  total: 7
status: issues_found
---

# Phase 104: Code Review Report

**Reviewed:** 2026-06-01
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The Unit Database browser UI is well-structured, following established project patterns (Zustand filters, React Query hooks, parameterized SQL). Two critical issues were found: incomplete FTS5 input sanitization that can cause query crashes, and cross-faction ownership data loss when opening search results. Four warnings cover a non-functional collapsible chevron animation, phantom status values in readiness logic, a filter flash during keyword data loading, and the `clearFilters` action not resetting search text when invoked externally.

## Critical Issues

### CR-01: Incomplete FTS5 input sanitization allows syntax errors and potential crashes

**File:** `src/db/queries/unitDatabase.ts:287`
**Issue:** The `searchUdbUnits` function strips only `"'*^()` from user input before passing it to the FTS5 `MATCH` clause. FTS5 has additional special syntax characters and operators that are not stripped: `-` (exclude), `+` (required), `:` (column filter), `{` `}` (NEAR grouping), and bare boolean operators (`AND`, `OR`, `NOT`, `NEAR`). A user typing a search like `-marines`, `name:tank`, or `NOT orks` will cause FTS5 syntax errors that bubble up as unhandled SQLite exceptions, crashing the query and leaving the UI in an error state with no user-facing recovery.
**Fix:**
```ts
// Replace line 287 with a more comprehensive sanitization:
const sanitized = trimmed
  .replace(/["'*^(){}:+-]/g, "")   // strip all FTS5 special chars
  .replace(/\b(AND|OR|NOT|NEAR)\b/gi, "")  // strip boolean operators
  .replace(/\s+/g, " ")            // collapse whitespace from removals
  .trim();
```

### CR-02: Ownership data missing for cross-faction search results

**File:** `src/features/unit-database/DatabaseBrowserPage.tsx:194-198`
**Issue:** The `ownershipMap` is built from `useUdbOwnership(selectedFactionId)`, which only fetches ownership for the currently selected faction. When a user performs a global search and opens a unit from a different faction, `ownershipMap.get(selectedUnitId)` returns `undefined`, so `ownershipData` is always `null` for cross-faction results. This causes two bugs: (1) the "Add to Collection" button always shows "Add to Collection" instead of "Add Another to Collection" even if the user owns the unit, and (2) the ownership badge is never shown on the datasheet sheet for search-originated units. This is a data correctness issue -- the UI silently hides ownership information.
**Fix:** When opening a unit from search results, either fetch ownership for that unit's faction on-demand, or pass the unit's `faction_id` from the search result into a separate ownership query:
```tsx
// Option A: Add a per-unit ownership hook in UdbDatasheetSheet
// that fetches ownership for the specific unit's faction when the sheet opens.
// Option B: Extend searchUdbUnits to return faction_id, then use it
// to query the correct faction's ownership map.
```

## Warnings

### WR-01: Collapsible chevron rotation never activates

**File:** `src/features/unit-database/UdbDatasheetSheet.tsx:268-271`
**Issue:** The `ChevronDown` icon uses `data-[state=open]:rotate-180` to animate open/closed state. However, Radix `CollapsibleTrigger` with `asChild` sets `data-state` on its direct child (the `<button>` element), not on elements nested inside it. The `ChevronDown` icon never receives the `data-state` attribute, so the rotation CSS never applies. The chevron remains static regardless of collapsible state.
**Fix:** Target the parent's state in the icon's class using a group pattern:
```tsx
<button
  type="button"
  className="group flex items-center justify-between w-full py-2 text-left"
>
  <span className="text-base font-semibold">{title}</span>
  <ChevronDown
    className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
    aria-hidden="true"
  />
</button>
```

### WR-02: DONE_STATUSES contains phantom values never stored in the database

**File:** `src/features/unit-database/UdbUnitRow.tsx:11-16`
**Issue:** `DONE_STATUSES` includes "Display Ready" and "Battle Ready", but the canonical `PAINTING_STATUS_ORDER` (from `src/types/unit.ts`) does not include either value. Since `units.status_painting` is constrained to `PAINTING_STATUS_ORDER` values, these two entries will never match any real data. This is misleading -- if someone later adds these statuses to the painting order, the readiness logic may silently change behavior. More critically, if any data migration or import writes these values, `resolveWorstStatus` would treat them as unknown (index -1, "worst") while `resolveReadinessDotClass` treats them as "done" -- contradictory signals.
**Fix:** Remove phantom entries and keep only statuses from `PAINTING_STATUS_ORDER`:
```ts
const DONE_STATUSES = new Set(["Varnished", "Completed"]);
```

### WR-03: Keyword filter silently skipped when keywordsMap has not loaded

**File:** `src/features/unit-database/applyUdbFilters.ts:32`
**Issue:** When `keywordFilter` is non-empty but `keywordsMap` is `undefined` (not yet loaded from the async query), the keyword filter clause is skipped entirely, causing all units to pass through. This creates a brief flash of unfiltered results before the keywords query resolves. The user types a keyword filter, sees all units momentarily, then sees the filtered set -- a jarring UX inconsistency.
**Fix:** Treat missing `keywordsMap` as "no matches" rather than "no filter":
```ts
if (keyword.length > 0) {
  if (!keywordsMap) return false; // data not loaded yet, exclude all
  const unitKeywords = keywordsMap.get(unit.id)?.toLowerCase() ?? "";
  if (!unitKeywords.includes(keyword)) return false;
}
```

### WR-04: clearFilters does not reset searchText, leaving stale search state

**File:** `src/features/unit-database/databaseBrowserFilters.ts:33-34`
**Issue:** The `clearFilters` action resets `roleFilter`, `keywordFilter`, `pointMin`, and `pointMax` but does not reset `searchText` or `selectedFactionId`. While `selectedFactionId` exclusion is intentional (preserving faction context), `searchText` exclusion means that if `clearFilters` is ever called from a context where search is active, the search persists invisibly. Currently the Clear button only appears in `UdbFilterBar` (non-search mode), so this is safe today, but the store API is a trap for future callers.
**Fix:** Either document the limitation or add `searchText` to the reset:
```ts
clearFilters: () =>
  set({ searchText: "", roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }),
```

## Info

### IN-01: ChevronDown import unused in collapsible animation path

**File:** `src/features/unit-database/UdbDatasheetSheet.tsx:1`
**Issue:** `ChevronDown` is imported and rendered, but due to WR-01 its rotation animation is non-functional, making its visual purpose (indicating collapsible state) unfulfilled. The icon is rendered but provides no dynamic feedback. This is a consequence of WR-01, not a separate bug.
**Fix:** Address via WR-01 fix.

---

_Reviewed: 2026-06-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
