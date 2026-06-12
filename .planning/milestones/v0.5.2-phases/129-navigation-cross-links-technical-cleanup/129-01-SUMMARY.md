---
phase: 129-navigation-cross-links-technical-cleanup
plan: "01"
subsystem: navigation
tags: [returnTo, painting-mode, navigation, cross-links]
dependency_graph:
  requires: []
  provides: [returnTo-search-param, painting-mode-exit-routing]
  affects: [src/app/router.tsx, src/app/painting-mode/page.tsx, src/features/units/AppliedRecipesTab.tsx, src/features/dashboard/DashboardPage.tsx, src/features/dashboard/NextPaintingActionCard.tsx, src/features/painting-projects/KanbanBoard.tsx, src/features/recipes/RecipeDetailSheet.tsx]
tech_stack:
  added: []
  patterns: [validateSearch-zod, route-useSearch, useLocation-returnTo]
key_files:
  created: []
  modified:
    - src/app/router.tsx
    - src/app/painting-mode/page.tsx
    - src/features/units/AppliedRecipesTab.tsx
    - src/features/dashboard/DashboardPage.tsx
    - src/features/dashboard/NextPaintingActionCard.tsx
    - src/features/painting-projects/KanbanBoard.tsx
    - src/features/recipes/RecipeDetailSheet.tsx
decisions:
  - paintingModeRoute exported so page.tsx can call useSearch() — mirrors recipesRoute pattern
  - NextPaintingActionCard uses hardcoded returnTo="/" because it always renders on Dashboard
  - All other 4 entry points use useLocation().pathname for dynamic origin tracking
metrics:
  duration: ~10min
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
requirements: [NAV-01]
---

# Phase 129 Plan 01: Painting Mode returnTo Navigation Summary

Painting Mode exit now returns to the originating page instead of always navigating to Dashboard. All 5 entry points pass `returnTo` as a typed search parameter; the exit handler reads it with a `"/"` fallback.

## What Was Built

**Task 1 — Route schema + exit handler:**
- `paintingModeRoute` in `router.tsx` exported and given `validateSearch: z.object({ returnTo: z.string().optional() })`
- `page.tsx` imports `paintingModeRoute`, reads `returnTo` via `paintingModeRoute.useSearch()` in `PaintingModePageInner`
- `handleExit` updated from `navigate({ to: "/" })` to `navigate({ to: returnTo ?? "/" })`
- Escape hotkey automatically uses the updated `handleExit`

**Task 2 — Entry point wiring (5 files):**
- `AppliedRecipesTab.tsx`: adds `useLocation`, passes `search: { returnTo: location.pathname }` — returns to /collection or wherever unit detail is open
- `DashboardPage.tsx`: adds `useLocation`, passes `search: { returnTo: location.pathname }` — returns to /
- `NextPaintingActionCard.tsx`: adds `search={{ returnTo: "/" }}` to `<Link>` (always from Dashboard)
- `KanbanBoard.tsx`: adds `useLocation`, passes `search: { returnTo: location.pathname }` — returns to /painting-projects
- `RecipeDetailSheet.tsx`: adds `useLocation`, passes `search: { returnTo: location.pathname }` — returns to /recipes

## Verification

- `pnpm build` (tsc + vite): passes with no TypeScript errors on both tasks
- Chunk size warning pre-existed; not introduced by these changes

## Deviations from Plan

None — plan executed exactly as written.

## Threat Compliance

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-129-01 | Zod schema validates returnTo is `string \| undefined`; TanStack Router only accepts internal route strings; falls back to "/" if absent |
| T-129-02 | Accepted — pathname in URL is expected and contains no secrets |

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `src/app/router.tsx` modified and contains `validateSearch` with `returnTo`
- `src/app/painting-mode/page.tsx` modified and contains `returnTo` and `paintingModeRoute.useSearch()`
- All 5 entry point files modified with `returnTo` in painting-mode navigate/Link calls
- Commits: `f2701fae` (Task 1), `1c73caa4` (Task 2)
