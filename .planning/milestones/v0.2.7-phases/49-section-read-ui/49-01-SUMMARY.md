---
phase: 49-section-read-ui
plan: 01
subsystem: ui
tags: [react, recipe-sections, sectioned-timeline, react-query, tailwind]

# Dependency graph
requires:
  - phase: 48-section-data-layer
    provides: useRecipeSections hook, RecipeSection type, section_id on RecipeStep
provides:
  - SectionedTimeline component grouping steps under named section headers
  - RecipeDetailSheet conditional branch — SectionedTimeline when sections exist, flat fallback otherwise
  - 13 tests covering VIEW-01 through VIEW-04

affects:
  - 50-section-form-ui
  - 51-recipe-duplication

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SectionedTimeline delegates per-section step rendering to RecipeStepTimeline — compose don't duplicate"
    - "Conditional render pattern: sections.length > 0 && !sectionsLoading for progressive enhancement"
    - "Per-section availability computed via useMemo from steps + paintMap — no extra DB queries"

key-files:
  created:
    - src/features/recipes/SectionedTimeline.tsx
    - tests/painting/sectionedTimeline.test.tsx
  modified:
    - src/features/recipes/RecipeDetailSheet.tsx
    - tests/painting/recipeDetailSheet.test.tsx

key-decisions:
  - "SectionedTimeline returns null for empty sections array — zero-cost when feature unused"
  - "RecipeDetailSheet falls back to RecipeStepTimeline when sections empty or loading — VIEW-04 preserved"
  - "Test regex matchers used for availability text ('2 owned') since JSX renders number and text in separate nodes"

patterns-established:
  - "Section availability (owned/missing) computed inline from stepsBySection + paintMap useMemo — no new hook needed"

requirements-completed: [VIEW-01, VIEW-02, VIEW-03, VIEW-04]

# Metrics
duration: 8min
completed: 2026-05-08
---

# Phase 49 Plan 01: Section Read UI Summary

**SectionedTimeline component groups recipe steps under named section headers with surface badge, optional badge, step count, time sum, and per-section owned/missing paint availability; wired into RecipeDetailSheet with flat fallback**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-08T15:26:28Z
- **Completed:** 2026-05-08T15:34:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created SectionedTimeline.tsx — renders sections with headers (name, surface, optional, step count, time, green/red availability dots), delegates step rendering to RecipeStepTimeline per section
- Wired SectionedTimeline into RecipeDetailSheet with `sections.length > 0 && !sectionsLoading` conditional branch; flat RecipeStepTimeline fallback preserved for recipes without sections
- 13 tests covering VIEW-01 through VIEW-04; all existing 31 recipeDetailSheet tests pass without regression; pnpm build passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SectionedTimeline component and test file** - `e2ff9af` (feat + TDD)
2. **Task 2: Wire SectionedTimeline into RecipeDetailSheet** - `ef26113` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/features/recipes/SectionedTimeline.tsx` — New component: section headers with metadata, delegates to RecipeStepTimeline per section
- `tests/painting/sectionedTimeline.test.tsx` — 13 tests covering VIEW-01 through VIEW-04
- `src/features/recipes/RecipeDetailSheet.tsx` — Added useRecipeSections hook call + conditional SectionedTimeline/RecipeStepTimeline render
- `tests/painting/recipeDetailSheet.test.tsx` — Added useRecipeSections mock (returns empty by default) + section_id: null to makeStep factory

## Decisions Made

- `SectionedTimeline` returns `null` for empty sections array — zero render cost for recipes without sections
- RecipeDetailSheet flat fallback preserved — recipes with no sections continue using RecipeStepTimeline unchanged (VIEW-04)
- Availability span uses regex matchers in tests (`/2 owned/`) because JSX renders count as a separate text node from the " owned" label

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

One test used exact string match `"2 owned"` but the JSX renders `{availability.owned} owned` which splits number and text into separate DOM text nodes. Fixed by using regex matcher `/2 owned/` in that test case. This is a testing technique deviation, not a component change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SectionedTimeline is fully built and tested — Phase 50 (section form UI) can integrate
- RecipeDetailSheet already wired — when sections exist they will automatically display
- No blockers

---
*Phase: 49-section-read-ui*
*Completed: 2026-05-08*
