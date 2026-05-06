---
phase: 33-data-intelligence
plan: "03"
subsystem: recipe-unit-linking
tags: [navigation, dashboard, recipes, data-intelligence]
dependency_graph:
  requires: [33-00]
  provides: [DATA-05, DATA-06]
  affects: [RecipeDetailSheet, CurrentFocusCard, DashboardPage]
tech_stack:
  added: []
  patterns:
    - "useNavigate for cross-feature navigation from recipe to collection"
    - "Optional recipeName/extraRecipeCount props pattern for nullable metadata"
    - "focusUnitId computed unconditionally before early returns (Rules of Hooks)"
key_files:
  created:
    - tests/painting/recipeDetailSheet.test.tsx
  modified:
    - src/features/recipes/RecipeDetailSheet.tsx
    - src/features/dashboard/CurrentFocusCard.tsx
    - src/features/dashboard/DashboardPage.tsx
    - tests/painting/recipeDetailSheet.test.ts
    - tests/dashboard/CurrentFocusCard.test.ts
    - tests/dashboard/CurrentFocusCard.test.tsx
decisions:
  - "recipeDetailSheet.test.tsx created as companion to .ts stub — same pattern as CurrentFocusCard; .ts file updated to note implementation is in .tsx"
  - "focusUnitId computed early in DashboardPage.tsx (before error/loading returns) so useQuery can be called unconditionally per Rules of Hooks"
  - "recipeName and extraRecipeCount are optional props with defaults — existing DashboardPage and test renders don't need updating (backward-compatible)"
metrics:
  duration_seconds: 902
  completed_date: "2026-05-06"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
  files_created: 1
requirements: [DATA-05, DATA-06]
---

# Phase 33 Plan 03: Recipe-Unit Navigation and Focus Card Recipe Display Summary

**One-liner:** Navigable unit link in RecipeDetailSheet (variant="link" Button to /collection) and recipe name with Palette icon displayed in CurrentFocusCard's metadata stack, wired through DashboardPage with a guarded inline useQuery.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Make RecipeDetailSheet unit name a navigable link | 409dc11 | RecipeDetailSheet.tsx, recipeDetailSheet.test.ts, recipeDetailSheet.test.tsx |
| 2 | Display recipe name on CurrentFocusCard with DashboardPage wiring | 0048d68 | CurrentFocusCard.tsx, DashboardPage.tsx, CurrentFocusCard.test.ts, CurrentFocusCard.test.tsx |

## What Was Built

### Task 1 — DATA-05: RecipeDetailSheet navigable unit link

- Added `useNavigate` import from `@tanstack/react-router` to `RecipeDetailSheet.tsx`
- Replaced plain `<span>` in the Linked Unit field with a conditional `<Button variant="link" size="sm" className="h-auto p-0">` that calls `onClose()` then `navigate({ to: "/collection" })` on click
- When no unit is linked (`unit` is null), renders `<span className="text-sm text-muted-foreground">—</span>` (unchanged visual for null case)
- Pattern exactly mirrors `UnitDetailSheet`'s recipe navigation button (variant="link", size="sm", h-auto p-0)
- 5 behavioral tests in `recipeDetailSheet.test.tsx` covering: Button renders, text matches, click calls onClose+navigate, dash when null, no Button when null

### Task 2 — DATA-06: CurrentFocusCard recipe name + DashboardPage wiring

- Added `Palette` to the `lucide-react` import in `CurrentFocusCard.tsx`
- Extended `CurrentFocusCardProps` with `recipeName?: string | null` and `extraRecipeCount?: number`
- Added conditional recipe name span below faction name: Palette icon (size 12) + recipe name text + optional "(+N more)" suffix when `extraRecipeCount > 0`
- When `recipeName` is null or undefined, nothing renders — keeps card clean
- Added `useQuery` and `getRecipeNamesByUnitIds` imports to `DashboardPage.tsx`
- Added `focusUnitId` computation and `focusRecipes` query before early returns (unconditional hooks placement)
- Query enabled guard: `enabled: focusUnitId !== null` — query only fires when a focus unit exists
- Passed `recipeName` and `extraRecipeCount` props to `CurrentFocusCard` in populated state
- 5 behavioral tests in `CurrentFocusCard.test.tsx` covering: recipe name with icon, null omission, undefined omission, "+N more" suffix, no suffix for count 0

## Verification

- `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` — 5/5 pass
- `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx` — 13/13 pass (8 pre-existing + 5 new)
- `pnpm build` — clean build (TypeScript no errors)
- `pnpm test` (full suite) — 768 tests pass, 107 files pass, no regressions

## Deviations from Plan

### Auto-fixed Issues

None.

### Structural Adaptations

**1. Test file naming — .tsx companion pattern**
- **Found during:** Task 1
- **Issue:** `recipeDetailSheet.test.ts` (`.ts` extension) cannot contain JSX required for React Testing Library renders
- **Fix:** Created `recipeDetailSheet.test.tsx` for real implementations; kept `.ts` stub with `it.todo` entries updated to note implementation is in `.tsx` — matches the existing pattern used by `CurrentFocusCard.test.ts` + `CurrentFocusCard.test.tsx`
- **Files:** tests/painting/recipeDetailSheet.test.ts, tests/painting/recipeDetailSheet.test.tsx

**2. CurrentFocusCard Phase 31 props verified**
- **Found during:** Task 2
- **Issue:** Plan warned Phase 31 may have changed CurrentFocusCard props; interfaces section may be stale
- **Fix:** Read current file before implementing — Phase 31 added `photo`, `onOpen`, `onLog` props and UnitThumbnail layout; new `recipeName`/`extraRecipeCount` props added alongside existing ones without conflict

## Self-Check: PASSED

All key files confirmed present:
- src/features/recipes/RecipeDetailSheet.tsx — FOUND
- src/features/dashboard/CurrentFocusCard.tsx — FOUND
- src/features/dashboard/DashboardPage.tsx — FOUND
- tests/painting/recipeDetailSheet.test.tsx — FOUND
- tests/dashboard/CurrentFocusCard.test.tsx — FOUND

All commits confirmed in git log:
- 409dc11 (feat(33-03): make RecipeDetailSheet unit name a navigable link) — FOUND
- 0048d68 (feat(33-03): display recipe name on CurrentFocusCard) — FOUND
