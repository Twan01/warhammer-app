---
phase: 133-honest-data-provenance
reviewed: 2026-06-17T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/lib/computeUnitWarnings.ts
  - src/features/army-lists/ArmyListSummaryBar.tsx
  - src/features/army-lists/ArmyListDetailPage.tsx
  - src/features/army-lists/PointsFreshnessBadge.tsx
  - src/features/game-day/GameDayPage.tsx
  - src/features/game-day/GameDayReadinessPanel.tsx
  - src/features/dashboard/ReadyToPlayCard.tsx
  - src/features/dashboard/DataHealthSummaryCard.tsx
  - src/features/data-health/DiagnosticsCard.tsx
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 133: Code Review Report

**Reviewed:** 2026-06-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 133 was a subtractive de-cruft pass: the fake `SyncFreshness` traffic-light system, the `StaleDataBanner`, and the always-dead "Sync stale" branch were removed; surviving surfaces now render honest `v{udb_meta.version}` provenance text. The backup-freshness code (`BACKUP_FRESHNESS_DOT_CLASS`, the backup row in `DataHealthSummaryCard`) is correctly preserved and untouched.

The removal itself is clean — no leftover `freshness` parameter, no dead import of `SyncFreshness`, no `StaleDataBanner` remnant. The build is green because the project's strict TS settings (`noUnusedLocals`) would have caught dangling symbols.

Five findings remain, none of them regressions introduced by this phase. Three are logic/correctness warnings that existed before and were not corrected during the refactor; two are informational quality items.

---

## Warnings

### WR-01: `allReady` redundant tautology masks a logic discrepancy

**File:** `src/features/dashboard/ReadyToPlayCard.tsx:40`
**Issue:** `allReady` is defined as `battleReadyPct === 100 && unpaintedCount === 0`. Because `battleReadyPct` is computed as `Math.round(((totalCount - unpaintedCount) / totalCount) * 100)`, `battleReadyPct === 100` is already only true when `unpaintedCount === 0` (given integer rounding). The `&& unpaintedCount === 0` guard is therefore dead. More importantly, when `totalCount === 0` the formula yields `battleReadyPct = 0` and `unpaintedCount = 0`, so `allReady` evaluates to `false` — yet an empty list with zero units is arguably "ready". The card silently shows no gold highlight and no "unpainted" badge for an empty list, which is correct by accident rather than by design.

This is a latent logic defect: if the readiness percentage formula ever changes (e.g., weights units by points), the redundant guard becomes a real bug rather than dead code.

**Fix:**
```ts
// Simplify to the single canonical condition
const allReady = totalCount > 0 && unpaintedCount === 0;
```

### WR-02: `DiagnosticsCard` fetches `udbMeta` but never uses it — `syncLoading` gates rendering on a spurious load

**File:** `src/features/data-health/DiagnosticsCard.tsx:17-19`
**Issue:** `useUdbMeta()` is called and its `isLoading` is included in the composite `isLoading` gate, but `_udbMeta` (prefixed `_` to suppress TS) is never consumed. The net effect is that the diagnostics card stays in skeleton state until the `udb_meta` query resolves, even though it has no dependency on that data. For a first-load with a cold cache this adds a superfluous async round-trip to the initial render of the card. The `_` prefix pattern is a signal that the data binding is intentionally ignored, not that the hook call itself is intentional.

**Fix:** Remove the `useUdbMeta()` call and the `syncLoading` contribution entirely:
```tsx
// Before
const { data: _udbMeta, isLoading: syncLoading } = useUdbMeta();
const isLoading = flagsLoading || syncLoading;

// After
const isLoading = flagsLoading;
```
If version provenance is ever needed inside `DiagnosticsCard`, re-add the hook at that point with an actual consumer.

### WR-03: `PointsFreshnessBadge` renders raw `built_at` string without formatting

**File:** `src/features/army-lists/PointsFreshnessBadge.tsx:23`
**Issue:** The tooltip text is `Data version ${udbMeta.version} (built ${udbMeta.built_at})`. The `built_at` field comes directly from the `udb_meta` DB row — its value is whatever the JSON importer stored (likely an ISO-8601 timestamp such as `2026-06-09T14:32:00.000Z`). This is exposed verbatim to the user with no formatting, producing tooltip text like `built 2026-06-09T14:32:00.000Z` rather than a human-readable date. The `src/lib/dates.ts` utility already exists for this purpose.

**Fix:**
```tsx
import { formatDate } from "@/lib/dates";          // or equivalent existing helper

const tooltipText = udbMeta
  ? `Data version ${udbMeta.version} (built ${formatDate(udbMeta.built_at)})`
  : "Unit database not imported";
```
If `formatDate` does not accept ISO strings directly, wrap with `new Date(udbMeta.built_at)` first. Alternatively, truncate with `.slice(0, 10)` for a simple YYYY-MM-DD display if a full formatting helper is overkill.

---

## Info

### IN-01: `ArmyListDetailPage` retains stale comment about removed `StaleDataBanner`

**File:** `src/features/army-lists/ArmyListDetailPage.tsx:67`
**Issue:** The comment `// Phase 107: StaleDataBanner removed` is no longer meaningful now that Phase 133 has completed the de-cruft. It is an orphaned annotation pointing at a previously removed component; it adds no value and could confuse future readers into searching for a `StaleDataBanner` that no longer exists anywhere in the codebase.

**Fix:** Delete the comment line.

### IN-02: `computeUnitWarnings.ts` doc-comment still lists "stale" as a soft-warning category

**File:** `src/lib/computeUnitWarnings.ts:9`
**Issue:** The file-level JSDoc at line 9 says `- Soft: informational (unpainted, not assembled, override, unknown pts, stale)`. The `stale` entry was removed as part of Phase 107/133, but the comment was not updated. Any developer reading this file's contract will incorrectly believe a "stale" soft warning can be emitted.

**Fix:**
```
- Soft: informational (unpainted, not assembled, override, unknown pts)
```

---

_Reviewed: 2026-06-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
