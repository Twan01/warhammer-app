---
phase: 46-manual-overrides-version-comparison
plan: "02"
subsystem: ui
tags: [react, sqlite, react-query, tailwind, tauri, overrides, diff]

# Dependency graph
requires:
  - phase: 46-01
    provides: unit_overrides table, useUnitOverride hook, computeSyncDiff pure function, getLatestSnapshot query

provides:
  - Override markers (Pencil icon + accent border) on PlaybookTab stat cells when unit_overrides has non-null values
  - Tooltip on override Pencil showing the original imported value
  - Clear all overrides button (X icon) in stats header
  - Points override input in edit mode when unit has a linked datasheet (OVRD-01)
  - Points override display with Pencil marker in view mode when active
  - Post-sync diff computation integrated into useRulesSync mutation result
  - Diff collapsible in PlaybookTab showing added/removed/renamed datasheets after sync
  - Toast with change count summary after sync

affects: [army-list, useRulesSync, PlaybookTab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Override state synced with useEffect from overrideRow.points (avoid controlled input drift)
    - isStatOverridden helper maps StatKey to UnitOverride column via overrideKey() map
    - handleSave saves override data only when hasAnyStatOverride || parsedPoints !== null to avoid spurious writes
    - Diff best-effort pattern — getRulesDb().select post-invoke wrapped in try/catch; sync success unaffected
    - Pre-sync snapshot read added BEFORE new capturePreSyncSnapshot() call to get the baseline for diffing

key-files:
  created: []
  modified:
    - src/hooks/useRulesSync.ts
    - src/features/units/PlaybookTab.tsx

key-decisions:
  - "Points override value synced via useEffect from overrideRow.points to avoid controlled input drift on re-renders"
  - "Override save in handleSave is conditional: only fires when at least one stat differs from imported OR parsedPoints != null — avoids writing empty override rows"
  - "Diff computation is best-effort: wrapped in try/catch after invoke; sync success is never blocked by diff failures"
  - "Pre-sync snapshot read uses getLatestSnapshot() which reads from hobbyforge.db (not rules.db) — survives sync wipe"

patterns-established:
  - "Override marker pattern: isStatOverridden() + relative-positioned Pencil absolute top-1 right-1 inside each stat cell"

requirements_completed: [OVRD-01, OVRD-05, OVRD-06, OVRD-07]

# Metrics
duration: 20min
completed: 2026-05-08
---

# Phase 46 Plan 02: Manual Overrides UI + Diff View Summary

**Override markers on stat cells with imported-value tooltips, points override input, clear-overrides action, and post-sync diff collapsible showing added/removed/renamed datasheets**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-08T11:30:00Z
- **Completed:** 2026-05-08T11:50:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 2

## Accomplishments
- useRulesSync now reads pre-existing rw_datasheets snapshot, computes post-sync diff via computeSyncDiff, and returns `{ wahapediaVersion, rowCounts, diff }` — diff is best-effort and never blocks sync
- PlaybookTab stat cells visually distinguish overridden values: Pencil icon absolute top-right + `border-primary bg-primary/5` accent; tooltip shows "Manual override — imported value: X"
- Points override input (OVRD-01) visible in edit mode when unit has linked datasheet; saved to unit_overrides.points via handleSave override payload; displayed with Pencil marker in view mode when active
- Clear all overrides button (X icon) removes all overrides for the unit and reverts cells to imported values
- Post-sync diff collapsible shows removed datasheets in destructive red (OVRD-07), renamed with arrow notation, and added datasheets; toast appends change count when `total_changed > 0`

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire useRulesSync to compute and return post-sync diff** - `0c92643` (feat)
2. **Task 2: PlaybookTab override markers, points override input, diff view, and toast summary** - `5b7bafe` (feat)
3. **Task 3: Verify override markers, points override, and diff view** - auto-approved (checkpoint)

## Files Created/Modified
- `src/hooks/useRulesSync.ts` - Added imports for computeSyncDiff/SyncDiff/getLatestSnapshot/getRulesDb; extended return type to include `diff: SyncDiff`; reads pre-sync snapshot before capturePreSyncSnapshot(); queries rw_datasheets after invoke and computes diff
- `src/features/units/PlaybookTab.tsx` - Added useUnitOverride/useUpsertUnitOverride/useDeleteUnitOverride hooks; override state (lastSyncDiff, pointsOverrideValue); helper functions (isStatOverridden, overrideKey, importedStatValue); stat cell override markers; points override input/display; clear overrides button; diff collapsible; updated handleSave to save overrides; updated handleSyncClick to store diff + append to toast

## Decisions Made
- Points override value is synced via `useEffect` from `overrideRow?.points` — this avoids controlled input drift when the query reloads after save
- Override save in `handleSave` is conditional: only fires when at least one stat differs from its imported value OR `parsedPoints !== null` — prevents writing empty override rows on every strategy note save
- Diff computation is best-effort (wrapped in try/catch after `invoke`); sync success is never blocked by diff failures
- Pre-sync snapshot read uses `getLatestSnapshot()` which reads from `hobbyforge.db` (not `rules.db`) — data survives the sync wipe

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 46 is complete. All 27 v0.2.6 requirements have been addressed across Phases 42-46.
- The full override system (data layer + UI) is now live: unit_overrides table, override markers, points override input, clear overrides, post-sync diff view.
- Army list effective_points already uses the 3-level COALESCE chain (per-list override > global unit override > base points) from Phase 46 Plan 01.
- v0.2.6 milestone (Rules Sync 2.0 / Rules Data Hub) is complete.

---
*Phase: 46-manual-overrides-version-comparison*
*Completed: 2026-05-08*
