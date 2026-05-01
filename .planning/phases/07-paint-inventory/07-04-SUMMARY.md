---
phase: 07-paint-inventory
plan: "04"
subsystem: paint-inventory-ui
tags: [react, zustand, tanstack-query, optimistic-update, navigation, filters]
dependency_graph:
  requires:
    - "07-01: paintInventoryFilters.ts Zustand store + applyPaintFilters helper"
    - "07-02: useRecipeIdsByPaint hook + RECIPE_IDS_BY_PAINT_KEY"
    - "07-03: recipesRoute validateSearch (paintId param)"
    - "06-04: usePaintsWithRecipeCount + PAINTS_WITH_RECIPES_KEY"
  provides:
    - "PaintInventoryFilters component: brand/type/color-family multi-select + Running Low/Wishlist toggles"
    - "PaintRow: 7-column row with clickable owned badge + recipe count badge + Color Family column"
    - "PaintsPage: fully wired filter bar + optimistic toggle + cross-page navigation + unmount cleanup"
  affects:
    - "/paints route UI (same URL, upgraded table)"
    - "/recipes cross-page navigation from recipe badge click"
tech_stack:
  added: []
  patterns:
    - "optimistic update via qc.getQueryData + qc.setQueryData + onError rollback (mirrors CollectionPage handleToggleActive)"
    - "MultiSelectPopover copied verbatim from UnitFilters.tsx (not imported — module-private)"
    - "useMemo for derived brand/color-family option lists from unfiltered paints prop"
    - "useEffect cleanup (return () => clearAll()) for ephemeral filter reset on navigation"
    - "explicit .tsx extension import to disambiguate PaintInventoryFilters.tsx vs paintInventoryFilters.ts on Windows case-insensitive FS"
key_files:
  created:
    - src/features/paints/PaintInventoryFilters.tsx
  modified:
    - src/features/paints/PaintRow.tsx
    - src/features/paints/PaintsPage.tsx
decisions:
  - "PaintsPage imports PaintInventoryFilters with explicit .tsx extension to avoid TypeScript TS1261/TS1149 casing conflict with paintInventoryFilters.ts on Windows (forceConsistentCasingInFileNames is true by default with strict mode)"
  - "PaintSheet and PaintDeleteDialog accept Paint | null — no modification needed since PaintWithRecipeCount extends Paint (TypeScript structural subtyping handles the widening)"
  - "font-medium replaced with font-normal on paint name span per UI-SPEC Typography (two weights: 400 normal and 600 semibold only)"
  - "Recipe badge zero state: Badge variant=outline non-interactive; count>0: Badge variant=secondary role=link with keyboard handler"
metrics:
  duration_seconds: 275
  completed_date: "2026-05-01"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 07 Plan 04: Paint Inventory UI Wire-Up Summary

Paint Inventory page fully wired: filter bar, clickable owned badge with optimistic update, recipe count cross-page navigation, Color Family column, and unmount cleanup — all integrated on top of the Plan 01–03 foundation.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Create PaintInventoryFilters.tsx | 09ee71d | src/features/paints/PaintInventoryFilters.tsx |
| 2 | Patch PaintRow.tsx — extend props + columns | 633a970 | src/features/paints/PaintRow.tsx |
| 3 | Patch PaintsPage.tsx — wire filters + hook + toggle + nav | 8ece3e9 | src/features/paints/PaintsPage.tsx |

## Requirements Closed

- **PINV-01**: Filterable table at `/paints` with 7-column layout (Name, Brand, Type, Color Family, Owned, Recipes, Actions)
- **PINV-02**: Brand, Type, Color Family multi-select filter popovers using Zustand store + applyPaintFilters
- **PINV-03**: Running Low toggle button (aria-pressed, variant flip) filters via applyPaintFilters running_low === 1
- **PINV-04**: Wishlist toggle button (aria-pressed, variant flip) filters via applyPaintFilters wishlist === 1
- **PINV-05**: "Used in N recipes" badge (sender side) — navigates to `/recipes?paintId=X` via useNavigate; receiver side in Plan 07-03
- **PINV-06**: Inline owned toggle via clickable Badge with role=button, tabIndex, keyboard handler, optimistic update + rollback

## Verification

- `pnpm tsc --noEmit`: 0 errors in paint feature files (pre-existing node:fs errors in tests/foundation/migration004.test.ts unrelated to this plan)
- `pnpm test`: 157/157 tests pass — no regression in any suite (collection, painting, foundation, dashboard, paint-inventory)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Windows case-insensitive file system casing conflict**
- **Found during:** Task 3
- **Issue:** TypeScript raised TS1261/TS1149 errors because `PaintInventoryFilters.tsx` and `paintInventoryFilters.ts` differ only in the first letter's case. On Windows, the file system is case-insensitive, so TypeScript's `forceConsistentCasingInFileNames` (enabled via `strict: true`) treated both imports as potentially referring to the same file.
- **Fix:** Changed the PaintInventoryFilters component import in PaintsPage.tsx to use an explicit `.tsx` extension: `import { PaintInventoryFilters } from "./PaintInventoryFilters.tsx"`. This disambiguates the two files unambiguously for the TypeScript compiler. `allowImportingTsExtensions: true` is already in tsconfig.json.
- **Files modified:** `src/features/paints/PaintsPage.tsx`
- **Commit:** 8ece3e9

## Manual Smoke Test (deferred to Plan 07-05 checkpoint)

- Open `/paints` → 7-column table with swatch + recipe badge + clickable owned badge
- Apply each filter (Brand, Type, Color Family, Running Low, Wishlist) → table narrows
- Click owned badge → flips immediately, persists after reload (optimistic + DB write)
- Click "Used in N recipes" badge → navigates to `/recipes?paintId=X`, Recipes page narrows

## Self-Check: PASSED

- src/features/paints/PaintInventoryFilters.tsx: FOUND
- src/features/paints/PaintRow.tsx: FOUND
- src/features/paints/PaintsPage.tsx: FOUND
- Commit 09ee71d (Task 1): FOUND
- Commit 633a970 (Task 2): FOUND
- Commit 8ece3e9 (Task 3): FOUND
