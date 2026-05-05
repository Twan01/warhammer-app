---
phase: 28
plan: "02"
subsystem: collection-ui
tags: [gallery, photo-thumbnails, status-badge, coll-01, coll-02]
dependency_graph:
  requires:
    - 28-01  # Wave 1 data layer: useLatestUnitPhotos, StatusBadge
  provides:
    - gallery-photo-hero  # photo thumbnails with faction-colored placeholders
    - status-badge-gallery  # StatusBadge in gallery cards
    - status-badge-table  # StatusBadge as StatusPopover trigger
  affects:
    - src/features/units/UnitGallery.tsx
    - src/features/units/StatusPopover.tsx
    - src/features/units/CollectionPage.tsx
tech_stack:
  added: []
  patterns:
    - GalleryCardPhoto sub-component pattern (co-located in UnitGallery.tsx)
    - img onError fallback via useState(imgFailed)
    - latestPhotos Map prop flow: CollectionPage → UnitGallery → GalleryCardPhoto
key_files:
  created: []
  modified:
    - src/features/units/UnitGallery.tsx
    - src/features/units/StatusPopover.tsx
    - src/features/units/CollectionPage.tsx
    - src/hooks/useRecipePaints.ts
    - tests/collection/UnitGallery.test.tsx
decisions:
  - GalleryCardPhoto is a co-located sub-component (not a separate file) — self-contained fallback logic with useState(imgFailed) stays adjacent to the gallery rendering
  - faction color applied as borderTop on placeholder div (not background) — maintains legibility of initials text against bg-panel-surface
  - latestPhotos passed as optional prop (latestPhotos?) — gallery renders without photos during initial load before hook resolves
metrics:
  duration: "12 minutes"
  completed: "2026-05-05T14:29:18Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 5
---

# Phase 28 Plan 02: Gallery Photo Hero + StatusBadge UI Wiring Summary

Gallery cards wired with photo thumbnails from batch hook, StatusBadge replaces PaintingRing in gallery and Badge outline in table trigger.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Overhaul UnitGallery card layout | 0ba54de | UnitGallery.tsx, UnitGallery.test.tsx |
| 2 | Replace StatusPopover trigger + wire CollectionPage | 3d11797 | StatusPopover.tsx, CollectionPage.tsx, UnitGallery.test.tsx, useRecipePaints.ts |

## What Was Built

**UnitGallery.tsx** — complete layout overhaul:
- New `GalleryCardPhoto` sub-component: renders `<img>` when `latestPhotos` has a match and image loads; falls back to a `div` with faction `borderTop` color + 2-character unit initials (`unit.name.slice(0, 2).toUpperCase()`)
- `img` has `loading="lazy"` and `onError={() => setImgFailed(true)}` for graceful degradation
- `PaintingRing` SVG completely removed; `Flame` icon removed
- Card body: faction badge → unit name → `StatusBadge` → thin progress bar (`h-0.5 bg-faction-accent`) → metadata line
- Skeleton cards updated to `w-full aspect-square` (square, not circular `h-24 w-24 rounded-full`)
- `latestPhotos?: Map<number, UnitPhotoWithUrl>` added to `UnitGalleryProps`

**StatusPopover.tsx** — trigger swap:
- `Badge` import removed; `StatusBadge` import added
- Trigger button gets `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` for keyboard accessibility
- `<StatusBadge status={unit.status_painting} />` renders inside the button — aria-label unchanged so existing tests pass without selector changes

**CollectionPage.tsx** — hook wiring:
- `useLatestUnitPhotos` imported and called; `latestPhotos` Map passed to `UnitGallery`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added RECIPE_SWATCH_KEY + useRecipeSwatchData to fix build**
- **Found during:** Task 2 build verification (`pnpm build`)
- **Issue:** `src/hooks/useRecipePaints.ts` referenced `RECIPE_SWATCH_KEY` (never defined) and imported `getRecipeSwatchColors` (never used) — causing 3 TS6133/TS2304 errors
- **Root cause:** Wave 0 stubs from Phase 29 partially wired `RECIPE_SWATCH_KEY` into mutation `onSuccess` handlers before the constant was defined
- **Fix:** Added `RECIPE_SWATCH_KEY = ["recipe-swatch-colors"] as const` and `useRecipeSwatchData()` hook that groups swatch rows into `Map<recipe_id, SwatchEntry[]>`
- **Files modified:** `src/hooks/useRecipePaints.ts`
- **Commit:** 3d11797

**2. [Rule 1 - Test update] Updated UnitGallery test [UI-05] for new DOM**
- **Found during:** Task 1 verification
- **Issue:** Test checked for `getByRole("img", { name: "72% painted" })` (PaintingRing SVG) — element removed
- **Fix:** Updated assertion to check for `StatusBadge` text (`Layered`) and metadata line (`/72%.*models.*pts/`)
- **Files modified:** `tests/collection/UnitGallery.test.tsx`
- **Commit:** 0ba54de

**3. [Rule 2 - Missing mock] Added useLatestUnitPhotos mock to UnitGallery test**
- **Found during:** Task 2 (after wiring CollectionPage)
- **Issue:** CollectionPage now calls `useLatestUnitPhotos()` — test needed a mock or it would try to resolve Tauri APIs in jsdom
- **Fix:** Added `vi.mock("@/hooks/useUnitPhotos")` returning `{ data: new Map(), isLoading: false }` for `useLatestUnitPhotos`
- **Files modified:** `tests/collection/UnitGallery.test.tsx`
- **Commit:** 3d11797

## Deferred Issues

`tests/workshop-play/recipeSwatchData.test.ts` — 2 failing tests (pre-existing Wave 0 stub issue):
- `getRecipeSwatchColors` tests expect the actual function to use `dbSelectMock` from `@/db/client` mock
- But a subsequent `vi.mock("@/db/queries/recipePaints")` in the same file is hoisted by Vitest and intercepts the import before the `@/db/client` mock can take effect
- **Not caused by Phase 28-02 changes** — pre-existed from Phase 29 Wave 0 stub creation
- **Fix needed in Phase 29:** Restructure test file to avoid hoisting conflict (separate test files for query vs hook tests, or use `vi.importActual` for query tests)

## Success Criteria Verification

- [x] Gallery cards show photo thumbnail when `latestPhotos` has a match
- [x] Gallery cards show faction-colored placeholder with unit initials when no photo
- [x] Gallery cards use `StatusBadge` instead of plain status text
- [x] Gallery cards have thin progress bar below `StatusBadge`
- [x] `PaintingRing` SVG completely removed from gallery cards
- [x] Skeleton cards have square `aspect-square` placeholder (not circular)
- [x] `StatusPopover` trigger shows `StatusBadge` (dot + text) instead of `Badge` outline
- [x] Status editing in table still works (aria-label unchanged, optimistic update intact)
- [x] `CollectionPage` fetches batch photo data via `useLatestUnitPhotos`
- [x] `CollectionPage` passes `latestPhotos` Map to `UnitGallery`
- [x] All targeted tests green (528 pass, 30 skip)
- [x] `pnpm build` exits 0

## Self-Check: PASSED
