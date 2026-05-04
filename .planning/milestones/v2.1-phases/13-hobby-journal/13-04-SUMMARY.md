---
phase: 13-hobby-journal
plan: "04"
subsystem: ui
tags: [react, tauri, sqlite, photo-lightbox, tabs, journal, file-cleanup]

requires:
  - phase: 13-hobby-journal plan 03
    provides: JournalTab component with onPhotoClick prop interface + useUnitPhotos hook + getPhotosByUnit/getPhotoFilenamesByUnit/deleteUnitPhoto queries

provides:
  - UnitDetailSheet third Journal tab wired to JournalTab with onPhotoClick pass-through
  - CollectionPage sibling lightbox Dialog (JOUR-05) with stage_label title + caption description + max-h-70vh image
  - DashboardPage identical sibling lightbox pattern (all callers of UnitDetailSheet updated)
  - UnitDeleteDialog JOUR-06 silent disk cleanup: captures photo IDs + filenames before SQL delete, explicitly removes image_assets rows (polymorphic table, no CASCADE), silently removes files from AppData

affects: [13-05-smoke-test, 14-spending-tracker]

tech-stack:
  added: ["@tauri-apps/plugin-fs remove (runtime use in UnitDeleteDialog)"]
  patterns:
    - "Sibling Dialog portal pattern for lightbox — Dialog mounted at page level alongside Sheet, never nested inside SheetContent"
    - "JOUR-06 cleanup order: query IDs+filenames BEFORE deleteUnit, then explicit DB row delete (no CASCADE on polymorphic table), then silent fs.remove"

key-files:
  created: []
  modified:
    - src/features/units/UnitDetailSheet.tsx
    - src/features/units/CollectionPage.tsx
    - src/features/units/UnitDeleteDialog.tsx
    - src/features/dashboard/DashboardPage.tsx

key-decisions:
  - "DashboardPage also requires onPhotoClick wiring — both UnitDetailSheet usages fixed as Rule 3 blocking deviation (tsc required it)"
  - "UnitDeleteDialog uses static imports for getPhotosByUnit + getPhotoFilenamesByUnit rather than dynamic import — simpler, same runtime behavior"
  - "getPhotosByUnit used to get IDs; getPhotoFilenamesByUnit used to get file paths — two queries pre-delete to satisfy both DB cleanup and disk cleanup independently"

requirements-completed: [JOUR-01, JOUR-02, JOUR-03, JOUR-04, JOUR-05, JOUR-06]

duration: 10min
completed: 2026-05-04
---

# Phase 13 Plan 04: Integration Wiring Summary

**Journal tab + lightbox Dialog wired into UnitDetailSheet/CollectionPage/DashboardPage; JOUR-06 silent disk cleanup added to UnitDeleteDialog with polymorphic image_assets explicit DELETE + AppData fs.remove**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-04T06:55:00Z
- **Completed:** 2026-05-04T07:05:20Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- UnitDetailSheet now renders a third Journal tab (TabsTrigger + TabsContent) that mounts JournalTab with unitId and onPhotoClick — the full photo timeline and session log are now reachable from the detail sheet
- CollectionPage and DashboardPage each own a lightboxPhoto state and mount a sibling Dialog (max-w-2xl, max-h-[70vh]) using the Phase 8 sibling portal pattern — clicking a thumbnail in JournalTab opens the full-size lightbox
- UnitDeleteDialog.handleConfirm now implements JOUR-06: queries photo filenames + IDs before the SQL delete, explicitly removes image_assets DB rows (polymorphic table has no FK cascade), then silently removes files from AppData — the existing "Unit deleted." toast remains the only user-visible feedback

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: Journal tab + sibling lightbox wiring** - `44bd900` (feat)
2. **Task 3: JOUR-06 disk cleanup in UnitDeleteDialog** - `c4e2c2a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/features/units/UnitDetailSheet.tsx` — Added JournalTab + UnitPhotoWithUrl imports; extended props interface with onPhotoClick; added third TabsTrigger/TabsContent
- `src/features/units/CollectionPage.tsx` — Added Dialog/UnitPhotoWithUrl imports; lightboxPhoto state; onPhotoClick prop wired to UnitDetailSheet; sibling lightbox Dialog
- `src/features/units/UnitDeleteDialog.tsx` — Added getPhotoFilenamesByUnit/getPhotosByUnit/deleteUnitPhoto imports; added remove/BaseDirectory from plugin-fs; JOUR-06 cleanup flow in handleConfirm
- `src/features/dashboard/DashboardPage.tsx` — Same lightbox imports + state + sibling Dialog added to both UnitDetailSheet usages (Rule 3 blocking deviation)

## Decisions Made
- DashboardPage also uses UnitDetailSheet and required the same onPhotoClick wiring — applied the same sibling lightbox pattern rather than making the prop optional (required prop is more type-safe and catches call sites at compile time)
- Used two separate pre-delete queries (getPhotosByUnit for IDs, getPhotoFilenamesByUnit for paths) rather than a single getPhotosByUnit and extracting file_path — follows the plan spec literally and keeps each concern explicit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DashboardPage also uses UnitDetailSheet and failed tsc after onPhotoClick became required**
- **Found during:** Task 2 (tsc check after UnitDetailSheet prop change)
- **Issue:** DashboardPage had two UnitDetailSheet usages without the new required onPhotoClick prop; tsc reported 2 errors in DashboardPage.tsx
- **Fix:** Added lightboxPhoto state + Dialog imports + onPhotoClick wiring + sibling lightbox Dialog to DashboardPage following the exact same pattern as CollectionPage
- **Files modified:** src/features/dashboard/DashboardPage.tsx
- **Verification:** pnpm tsc --noEmit exits 0 after fix
- **Committed in:** 44bd900 (Task 1+2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking tsc error in DashboardPage)
**Impact on plan:** Required fix — DashboardPage is a valid caller of UnitDetailSheet and the lightbox pattern is correct there too. No scope creep.

## Issues Encountered
None — test suite passed immediately without needing to add a vi.mock for @tauri-apps/plugin-fs in UnitDeleteDialog.test.tsx. The module-level import is non-executing; the handleConfirm path is never invoked in the render-only tests.

## Next Phase Readiness
- Phase 13 is functionally complete: all 6 JOUR requirements implemented (SQL schema, queries, hooks, JournalTab UI, lightbox, disk cleanup)
- Plan 13-05 (manual smoke test) is the only remaining gate before the phase exit
- 250 tests passing, 27 skipped (Phase 14 stubs); no regressions

---
*Phase: 13-hobby-journal*
*Completed: 2026-05-04*
