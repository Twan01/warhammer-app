---
phase: 45-sync-metadata-import-tracking
plan: "02"
subsystem: rules-sync-ui
tags: [sync, metadata, freshness, ui, playbook, snapshot]
dependency_graph:
  requires:
    - 45-01 (rulesSnapshot.ts, syncFreshness.ts, useSyncErrors.ts, RulesSyncMeta type)
  provides:
    - Pre-sync snapshot capture wired into useRulesSync mutationFn
    - SYNC_ERRORS_KEY invalidation on both sync success and error
    - PlaybookTab freshness dot (META-05)
    - PlaybookTab sync date+time (META-01)
    - PlaybookTab collapsible sync details with version + row counts (META-02, META-03)
    - PlaybookTab collapsible error history (META-04)
  affects:
    - src/features/units/PlaybookTab.tsx
    - src/hooks/useRulesSync.ts
tech_stack:
  added: []
  patterns:
    - IIFE inside JSX for freshness dot + date rendering without extracting sub-component
    - TooltipProvider wrapping inline span for freshness dot tooltip
    - Collapsible for optional sync metadata sections
key_files:
  created: []
  modified:
    - src/hooks/useRulesSync.ts
    - src/features/units/PlaybookTab.tsx
    - tests/datasheet/useRulesSync.test.ts
    - tests/datasheet/rulesSnapshot.test.ts
decisions:
  - SYNC_ERRORS_KEY invalidated on both onSuccess and onError so UI always reflects latest state
  - onSuccess now invalidates 8 query keys (was 7 before Phase 45 added sync-errors)
  - IIFE pattern used in JSX for freshness dot to avoid extracting a full sub-component for 3 variables
  - formatSyncDate updated to include hour+minute for META-01 date+time requirement
metrics:
  duration: 9m
  completed_date: "2026-05-08"
  tasks_completed: 3
  files_modified: 4
---

# Phase 45 Plan 02: Sync Metadata UI Wiring Summary

Pre-sync snapshot capture wired into useRulesSync hook and full sync metadata UI added to PlaybookTab: freshness dot, collapsible sync details (version + row counts), collapsible error history.

## What Was Built

All 6 META requirements are now user-visible:

- **META-01**: `formatSyncDate` updated to include `hour` and `minute` — renders "08 May 2026, 14:32"
- **META-02**: Collapsible "Sync details" shows datasheets, stratagems, abilities, wargear, keywords counts
- **META-03**: "Sync details" collapsible shows "Wahapedia {version}" when version is present
- **META-04**: Collapsible "Sync errors" section appears only when errors exist (hidden when empty), shows type badge + message + relative timestamp, capped at 10 entries; `SYNC_ERRORS_KEY` invalidated on both sync success and error
- **META-05**: Freshness dot (green = fresh, amber = aging, red = stale) with Tooltip showing age label ("Synced today", "Synced 3 days ago", etc.)
- **META-06**: `capturePreSyncSnapshot` called in `mutationFn` BEFORE `invoke("bulk_sync_rules")` in a non-blocking try/catch

## Commits

| Hash | Message |
|------|---------|
| 7cc663d | feat(45-02): wire pre-sync snapshot capture and SYNC_ERRORS_KEY invalidation |
| 39f92e5 | feat(45-02): expand PlaybookTab sync section with freshness dot, details, and error history |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript tuple type error in rulesSnapshot.test.ts**
- **Found during:** Task 2 (`pnpm build` verification)
- **Issue:** `([sql]: [string])` destructured tuple type in `.filter()` callbacks is too strict — TypeScript could not assign `any[]` to `[string]` in strict mode
- **Fix:** Changed to `(c: unknown[]) => (c[0] as string).includes(...)` pattern (matches Phase 44 convention from useRulesSync.test.ts)
- **Files modified:** `tests/datasheet/rulesSnapshot.test.ts`
- **Commit:** 39f92e5

**2. [Rule 1 - Bug] Updated SYNC-05 test count from 7 to 8**
- **Found during:** Task 1 test run
- **Issue:** Existing test asserted exactly 7 `invalidateQueries` calls; adding `SYNC_ERRORS_KEY` invalidation made it 8
- **Fix:** Updated test assertion to `toHaveBeenCalledTimes(8)` and added `expect(calls).toContain("sync-errors")`
- **Files modified:** `tests/datasheet/useRulesSync.test.ts`
- **Commit:** 7cc663d

## Checkpoint (Task 3)

Auto-approved (auto-chain active): Complete Phase 45 sync metadata UI implemented and build passes. `pnpm build` exits 0 with 992 tests passing.

## Self-Check: PASSED

All modified files exist. Both task commits verified in git log.
