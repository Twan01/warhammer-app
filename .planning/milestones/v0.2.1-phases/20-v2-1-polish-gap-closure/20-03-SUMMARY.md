---
phase: 20-v2-1-polish-gap-closure
plan: "03"
subsystem: ui
tags: [react, dashboard, datasheet, conflict-resolution, dialog, ds-08]

# Dependency graph
requires:
  - phase: 20-v2-1-polish-gap-closure
    provides: CollectionPage DS-08 conflict-resolution dialog (canonical reference)
provides:
  - DashboardPage conflict-resolution wiring matching CollectionPage DS-08 pattern
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DS-08 conflict-resolution dialog state owned at page level (sibling portal pattern)
    - onDatasheetConflict/pendingImportResolution/onClearImportResolution wired to UnitDetailSheet

key-files:
  created: []
  modified:
    - src/features/dashboard/DashboardPage.tsx

key-decisions:
  - "DS-08 conflict props added only to populated UnitDetailSheet (line 350) — empty-state no-op UnitDetailSheet (line 211) intentionally left unchanged (no units to conflict on)"
  - "DatasheetImportDialog mounted as last sibling inside populated-state fragment, after lightbox Dialog — preserves Radix portal ordering convention"

patterns-established:
  - "DS-08 secondary path closed: any page hosting UnitDetailSheet with PlaybookTab Re-import must own conflictPayload + pendingResolution state and mount DatasheetImportDialog as sibling"

requirements-completed:
  - "DS-08"

# Metrics
duration: 5min
completed: 2026-05-04
---

# Phase 20 Plan 03: DS-08 Dashboard Conflict Dialog Summary

**DatasheetImportDialog wired into DashboardPage via 4 surgical edits — closing the DS-08 secondary path so stat conflicts during Re-import are resolved the same way from Dashboard as from Collection**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-04T16:54:00Z
- **Completed:** 2026-05-04T16:56:21Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `DatasheetImportDialog` import and `DatasheetImportPayload`/`DatasheetImportResolution` type imports to DashboardPage
- Added `conflictPayload` and `pendingResolution` state hooks at DashboardPage level (same ownership pattern as CollectionPage)
- Wired 3 conflict props (`onDatasheetConflict`, `pendingImportResolution`, `onClearImportResolution`) onto the populated-state UnitDetailSheet only
- Mounted `<DatasheetImportDialog>` as the final sibling inside the populated-state fragment, after the lightbox Dialog — byte-for-byte mirror of CollectionPage lines 242-255

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire DS-08 conflict-resolution dialog into DashboardPage** - `49ca8bc` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/features/dashboard/DashboardPage.tsx` - Added 2 imports, 2 state hooks, 3 UnitDetailSheet props, 1 DatasheetImportDialog sibling mount (28 lines added)

## Decisions Made

- DS-08 conflict props added only to the populated-state UnitDetailSheet (the one at line 350 with `key={selectedUnit?.id ?? "none-detail"}` and `open={selectedUnitId !== null}`). The empty-state no-op UnitDetailSheet (line 211, `key="none-detail"`, `open={false}`) is left byte-identical — dead state would be wired there since that branch never opens a unit.
- DatasheetImportDialog placed as last sibling inside the populated-state `<>...</>` fragment, after the lightbox Dialog — preserves the Radix portal ordering convention established in STATE.md (sibling Sheet/Dialog portal pattern).

## Deviations from Plan

None - plan executed exactly as written. Four edits in specified order, all acceptance criteria verified by grep before commit.

## Verification Results

### Grep acceptance criteria (all pass)

| Check | Result |
|---|---|
| `import { DatasheetImportDialog }` | 1 occurrence |
| `import type { DatasheetImportPayload, DatasheetImportResolution }` | 1 occurrence |
| `useState<DatasheetImportPayload \| null>(null)` | 1 occurrence |
| `setPendingResolution` count | 3 (declaration + onConfirm + onClearImportResolution) |
| `onDatasheetConflict=` count | 1 (only on populated UnitDetailSheet) |
| `pendingImportResolution={pendingResolution}` | 1 occurrence |
| `onClearImportResolution=` | 1 occurrence |
| `<DatasheetImportDialog` count | 1 |
| `conflicts={conflictPayload?.conflicts ?? []}` | 1 occurrence |
| `<UnitDetailSheet` count | 2 (both mounts preserved) |

### Build/Test

- `pnpm test -- tests/dashboard/DashboardPage.test.tsx` — exit 0 (388 passed, 2 skipped pre-existing)
- `pnpm test` — exit 0 (64 files passed, 1 skipped pre-existing)
- `pnpm build` — exit 0 (TypeScript strict clean, 2742 modules transformed)

### Empty-state UnitDetailSheet (Pitfall 1 guard)

The UnitDetailSheet at line 211 uses `key="none-detail"` and `open={false}` and has NO conflict props — confirmed by the `onDatasheetConflict=` count of exactly `1`.

## Issues Encountered

None.

## Next Phase Readiness

- DS-08 fully closed: both CollectionPage and DashboardPage now surface the conflict-resolution dialog when a Re-import finds stat conflicts in the Playbook tab
- Phase 20 (v0.2.1 polish gap closure) is now complete — all 3 plans done
- Manual smoke test deferred to phase end: Sync rules → open unit from Dashboard active-projects → Playbook tab → Re-import with stat conflict → DatasheetImportDialog should appear

---
*Phase: 20-v2-1-polish-gap-closure*
*Completed: 2026-05-04*
