---
phase: 39-studio-ux-paint-availability
plan: 03
subsystem: ui
tags: [react, tailwind, typescript, timeline, shadcn, recipe, painting]

# Dependency graph
requires:
  - phase: 39-01
    provides: RecipeStep type with painting_phase/tool/technique/dilution/time fields
  - phase: 38-01
    provides: PaintingRecipe v0.2.5 metadata fields (style/surface/effect/difficulty/estimated_minutes)
  - phase: 38-02
    provides: RecipeFormSheet step creation UI with all structured step fields
provides:
  - RecipeStepTimeline component: vertical timeline rendering recipe steps with swatch dots, phase badges, metadata row
  - RecipeDetailSheet with metadata badge row (surface/style/effect/difficulty/time)
  - TDD tests for STUDIO-02 timeline and metadata badge behaviour
affects: [40-photo-upload, 41-session-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Vertical timeline with connecting line: absolute-positioned div left-[11px] with w-px bg-border, node dot uses ring-2 ring-border + border-2 border-background
    - Paint swatch dot: inline-style backgroundColor from hex_color with graceful null fallback
    - difficultyColors Record at module level (literal class strings to avoid Tailwind purge)

key-files:
  created:
    - src/features/recipes/RecipeStepTimeline.tsx
  modified:
    - src/features/recipes/RecipeDetailSheet.tsx
    - tests/painting/recipeDetailSheet.test.tsx
    - tests/painting/formatMinutes.test.tsx

key-decisions:
  - "RecipeStepTimeline receives steps + paintMap as props — pure presentational component, no data fetching"
  - "Metadata badge row placed inside SheetHeader (not content area) to appear near the recipe title"
  - "difficultyColors uses literal Tailwind class strings (not dynamic) to avoid Tailwind purge removing unused utility classes"
  - "Tests added to .tsx file (has working tests) not .ts file (only todos)"

patterns-established:
  - "Vertical timeline with connecting lines: absolute line aligned to node center using left-[11px] offset"
  - "Swatch dot: ring-2 ring-border + border-2 border-background creates punched-through look against connecting line"

requirements-completed: [STUDIO-02]

# Metrics
duration: 25min
completed: 2026-05-07
---

# Phase 39 Plan 03: Recipe Detail Timeline Summary

**Vertical timeline RecipeDetailSheet with phase badges, hex-color swatch dots, tool/technique/dilution/time metadata per step, and recipe metadata badge row (surface/style/effect/difficulty/estimated time)**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-07T11:30:00Z
- **Completed:** 2026-05-07T11:57:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created RecipeStepTimeline.tsx: vertical timeline with connecting lines, colored swatch node dots from paint hex_color, phase badges (outline, uppercase 10px), owned/missing paint indicator, tool/technique/dilution/time inline metadata row
- Updated RecipeDetailSheet to render metadata badge row (surface, style, effect, difficulty with color, estimated time with Clock icon) in SheetHeader — only renders when at least one field is non-null
- Replaced flat `<ol>` step list with RecipeStepTimeline — preserves empty state "No steps added yet." internally
- Added STUDIO-02 TDD tests: metadata row, step-timeline testid, empty state, difficulty badge, time format, preserved Linked Unit/Area fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RecipeStepTimeline component** - `1dda4a9` (feat)
2. **Task 2: Integrate timeline and metadata badges into RecipeDetailSheet** - `34245ca` (feat, TDD GREEN)

**Plan metadata:** (to be added with final commit)

_Note: TDD task had RED tests then GREEN implementation in same commit (tests authored then implementation in same task cycle)._

## Files Created/Modified
- `src/features/recipes/RecipeStepTimeline.tsx` — New vertical timeline component with swatch nodes, phase badges, paint availability indicators, tool/technique/dilution/time row
- `src/features/recipes/RecipeDetailSheet.tsx` — Metadata badge row in SheetHeader + RecipeStepTimeline replacing old `<ol>` list; difficultyColors lookup at module level
- `tests/painting/recipeDetailSheet.test.tsx` — STUDIO-02 test suite: metadata badges, step-timeline testid, empty state, preserved fields; makeStep() helper added; dynamic mockSteps/mockPaints
- `tests/painting/formatMinutes.test.tsx` — Auto-fix: vi.fn spread TS2556 error fixed

## Decisions Made
- RecipeStepTimeline is a pure presentational component receiving `steps: RecipeStep[]` and `paintMap: Map<number, Paint>` — no internal data fetching
- Metadata badge row placed inside `<SheetHeader>` so it appears visually adjacent to the recipe title and faction badge, before main content
- Tests added to `.tsx` test file (has real implementation) not `.ts` stub file (only todos)
- difficultyColors uses literal Tailwind class strings (Beginner: text-green-500 etc.) to avoid purge removing classes not found in HTML scan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript errors in formatMinutes.test.tsx**
- **Found during:** Task 1 (initial pnpm build verification)
- **Issue:** `vi.fn(() => ({ data: [] }))` with spread `(...args: unknown[])` caused TS2556 (spread argument not tuple); and `mockReturnValue({ data: steps })` caused TS2322 (RecipeStep[] not assignable to never[])
- **Fix:** Changed vi.fn initial value to `() => ({ data: [] as unknown[] })` and changed mock factory to call `mockExistingSteps()` directly (no spread)
- **Files modified:** `tests/painting/formatMinutes.test.tsx`
- **Verification:** pnpm build exits 0; pnpm test 879 passed
- **Committed in:** `1dda4a9` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — pre-existing bug in test file from prior plan)
**Impact on plan:** Fix was in a pre-existing test file unrelated to this plan's core scope. No scope creep.

## Issues Encountered
None — plan executed cleanly after pre-existing test fix.

## Next Phase Readiness
- RecipeDetailSheet now shows full painting workflow at a glance (STUDIO-02 complete)
- Phase 40 (photo upload for result_photo_path) can proceed — result_photo_path column already in schema
- Phase 41 (session-recipe linking) has all recipe detail components ready

---
*Phase: 39-studio-ux-paint-availability*
*Completed: 2026-05-07*
