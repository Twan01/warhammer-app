---
phase: 23-display-features
plan: "02"
subsystem: collection-showcase
tags: [showcase, fullscreen, gallery, tauri, keyboard-nav]
dependency_graph:
  requires: ["23-01"]
  provides: ["DISP-02", "DISP-03"]
  affects: ["src/features/units/CollectionPage.tsx"]
tech_stack:
  added: []
  patterns:
    - "isTauri() guard for Tauri vs browser fullscreen API"
    - "Fixed inset-0 overlay as sibling portal (never nested)"
    - "Signed modulo (i - 1 + n) % n for wrap-around keyboard nav"
key_files:
  created:
    - src/features/units/ShowcaseMode.tsx
    - tests/collection/showcaseMode.test.tsx
  modified:
    - src/features/units/CollectionPage.tsx
    - src-tauri/capabilities/default.json
    - tests/collection/UnitGallery.test.tsx
decisions:
  - "ShowcaseMode mounted as a sibling overlay (fixed inset-0) not inside a Radix Dialog — consistent with the sibling Sheet/Dialog portal pattern"
  - "isTauri() guards all fullscreen API calls for dev-mode (browser) compatibility"
  - "Cleanup useEffect exits fullscreen on unmount as a safety net"
metrics:
  duration_seconds: 384
  completed_date: "2026-05-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 3
---

# Phase 23 Plan 02: Showcase Mode Summary

**One-liner:** Full-screen chromeless gallery overlay for painted units — Tauri `setFullscreen` + keyboard arrow navigation with signed modulo wrap-around.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create ShowcaseMode component + tests | 67e8f84 | ShowcaseMode.tsx, showcaseMode.test.tsx |
| 2 | Wire Showcase into CollectionPage + Tauri capability | 2c7d286 | CollectionPage.tsx, default.json, UnitGallery.test.tsx |

## What Was Built

### ShowcaseMode component (`src/features/units/ShowcaseMode.tsx`)

- Fixed `inset-0 z-50 bg-black` overlay with `data-testid="showcase-overlay"`
- Fullscreen entry on mount: `getCurrentWindow().setFullscreen(true)` (Tauri) or `document.documentElement.requestFullscreen()` (browser dev)
- Fullscreen exit: safety net cleanup in `useEffect` return
- Keyboard navigation: `ArrowRight` / `ArrowLeft` (signed modulo fix) / `Escape`
- On-screen prev/next chevron buttons and an X exit button
- Bottom overlay bar: unit name, faction name, and `{index + 1} of {units.length}` counter
- `handleClose` uses `useCallback` + async `setFullscreen(false)` before calling `onClose`

### CollectionPage wiring (`src/features/units/CollectionPage.tsx`)

- `showcaseUnits` memo: `filteredUnits.filter(u => latestPhotos?.has(u.id))`
- `showcaseOpen` state drives conditional mount of `ShowcaseMode`
- `Maximize` icon button in PageHeader `actions` (before table/gallery toggles)
- `Tooltip` shows "No photos to showcase" when disabled, "Enter Showcase Mode" otherwise
- `ShowcaseMode` rendered as a sibling at end of return JSX — never nested in Dialog/Sheet

### Tauri capability (`src-tauri/capabilities/default.json`)

- Added `"core:window:allow-set-fullscreen"` after `"core:default"`

### Tests (`tests/collection/showcaseMode.test.tsx`)

10 component tests covering:
1. Overlay renders with `data-testid="showcase-overlay"`
2. First unit name and faction displayed
3. Photo `src` matches `assetUrl`
4. Counter shows "1 of N"
5. Escape key calls `onClose`
6. X button calls `onClose`
7. ArrowRight advances to next unit
8. ArrowLeft wraps to last unit from index 0 (signed modulo regression test)
9. `setFullscreen(true)` called on mount
10. `setFullscreen(false)` called on close

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TooltipProvider missing in UnitGallery tests**
- **Found during:** Task 2 — full test suite run
- **Issue:** Adding Tooltip to CollectionPage broke 4 tests in `UnitGallery.test.tsx` because the `renderCollectionPage` helper renders without `TooltipProvider` (that lives in `AppLayout`). Error: "`Tooltip` must be used within `TooltipProvider`"
- **Fix:** Wrapped `CollectionPage` in `<TooltipProvider>` inside the `renderCollectionPage` helper function
- **Files modified:** `tests/collection/UnitGallery.test.tsx`
- **Commit:** 2c7d286

## Verification Results

- `pnpm test -- tests/collection/showcaseMode.test.tsx` — 10/10 tests pass
- `pnpm build` — TypeScript compilation clean (0 errors)
- `pnpm test` — 628/630 tests pass (2 pre-existing skips), 0 regressions
- `default.json` contains `core:window:allow-set-fullscreen`

## Self-Check: PASSED

- [x] `src/features/units/ShowcaseMode.tsx` exists and exports `ShowcaseMode`
- [x] `tests/collection/showcaseMode.test.tsx` exists with 10 test cases
- [x] Commits 67e8f84 and 2c7d286 exist in git history
- [x] `src-tauri/capabilities/default.json` contains `core:window:allow-set-fullscreen`
- [x] Full test suite passes (628/630)
