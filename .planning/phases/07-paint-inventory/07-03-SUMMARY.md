---
phase: 07-paint-inventory
plan: "03"
subsystem: ui
tags: [tanstack-router, zod, validateSearch, react, url-params, recipe-filter]

# Dependency graph
requires:
  - phase: 07-02
    provides: useRecipeIdsByPaint hook + getRecipeIdsByPaintId DB query

provides:
  - recipesRoute exported with typed validateSearch (paintId?: number via zod)
  - RecipesPage reads paintId from URL on first mount and narrows recipe list
  - paintFilter integrates into existing Clear-filters control

affects:
  - 07-04 (sender side: navigate to /recipes?paintId=X from PaintsPage badge click)
  - 07-05 (manual E2E verification of full PINV-05 flow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First use of TanStack Router validateSearch in codebase (zod schema on recipesRoute)"
    - "Typed useSearch() via named route export — recipesRoute.useSearch() in consuming component"
    - "One-shot useEffect with empty deps to seed local filter state from URL param on mount"

key-files:
  created: []
  modified:
    - src/app/router.tsx
    - src/features/recipes/RecipesPage.tsx

key-decisions:
  - "07-03: recipesRoute exported as named export from router.tsx so RecipesPage can call recipesRoute.useSearch() with typed access — no route-extraction to routes.ts needed (no circular import issue at runtime)"
  - "07-03: paintFilter seeded once on mount via useEffect([]) — intentional empty deps so user can clear the filter afterward without the URL param re-applying it"
  - "07-03: while recipeIdsByPaint is loading, paintFilter guard hides all recipes (single-render flash) matching the empty-state UX rather than showing stale unfiltered results"

patterns-established:
  - "validateSearch pattern: z.object({ param: z.type().optional() }) on createRoute — first instance in codebase"
  - "URL-seeded local filter: useEffect([]) reads route.useSearch() once, stores in useState for user-clearable filter"

requirements-completed:
  - PINV-05

# Metrics
duration: 3min
completed: "2026-05-01"
---

# Phase 7 Plan 03: RecipesPage paintId URL Param + Filter Summary

**First use of TanStack Router validateSearch via zod: recipesRoute exports typed paintId param; RecipesPage seeds local paintFilter from URL on mount and narrows the recipe list via useRecipeIdsByPaint**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-01T21:43:19Z
- **Completed:** 2026-05-01T21:46:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `import { z } from "zod"` and `validateSearch: z.object({ paintId: z.number().optional() })` to `recipesRoute` in router.tsx; changed `const` to `export const` so consumers can call `recipesRoute.useSearch()`
- Wired RecipesPage to read `paintId` from URL search params on first mount via `useEffect([])`, storing it in a new `paintFilter` state field
- Extended the existing `filtered` useMemo to exclude recipes not in `recipeIdsByPaint` when `paintFilter !== null`, and updated Clear-filters to also clear `paintFilter`

## Task Commits

Each task was committed atomically:

1. **Task 1: Patch src/app/router.tsx — add validateSearch + named export of recipesRoute** - `5601eb3` (feat)
2. **Task 2: Patch src/features/recipes/RecipesPage.tsx — consume paintId search param + filter** - `a48f0ce` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/router.tsx` - Added `import { z } from "zod"`, changed `const recipesRoute` to `export const recipesRoute`, added `validateSearch: z.object({ paintId: z.number().optional() })`
- `src/features/recipes/RecipesPage.tsx` - Added `useEffect`, `recipesRoute`, `useRecipeIdsByPaint` imports; new `paintFilter` state + seed effect; paintFilter guard in `filtered` useMemo; Clear-filters condition + onClick updated

## Decisions Made
- No circular import issue was encountered — ES module live-binding with Vite + TanStack Router handled the RecipesPage → router.tsx → RecipesPage cycle correctly. No routes extraction to `src/app/routes.ts` was needed.
- Used empty-deps `useEffect` intentionally (with `eslint-disable` comment) so the user can clear the URL-seeded paint filter via the Clear-filters button without it re-applying.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing tsc errors in `tests/foundation/migration004.test.ts` (cannot find `node:fs`, `node:path`, `__dirname`) existed before and after my changes — confirmed by stash/unstash comparison. These are out-of-scope pre-existing issues not caused by this plan's changes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- PINV-05 receiver is complete: `/recipes?paintId=X` narrows the recipe list to recipes containing that paint
- Plan 07-04 can now wire the badge click on PaintsPage with `navigate({ to: "/recipes", search: { paintId: paint.id } })` — the typed validateSearch schema will enforce the param type
- Plan 07-05 manual E2E verification: navigate to `/recipes?paintId=1`, confirm narrowed list; click Clear filters, confirm full list returns

---
*Phase: 07-paint-inventory*
*Completed: 2026-05-01*
