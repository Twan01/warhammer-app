---
phase: 53-rules-data-hub-ui
plan: 02
subsystem: ui
tags: [react, zustand, tanstack-query, radix-ui, rules-hub, stratagems, wahapedia]

requires:
  - phase: 53-01
    provides: RulesHubPage scaffold with faction picker, Zustand filter store (phaseFilter, cpFilter), and tab shell

provides:
  - applyStratagemFilters pure function (phase/CP/text search, string comparisons)
  - STRATAGEM_PHASES const array for chip rendering
  - StratagemCard collapsible component with phase badge and CP cost badge
  - Stratagems tab fully wired with filter chips, useMemo pipeline, empty state, and count label
  - 9 unit tests covering all filter combinations

affects:
  - 53-03 (Detachments and Shared Abilities tabs will follow the same filter chip + useMemo pattern)

tech-stack:
  added: []
  patterns:
    - applyStratagemFilters accepts string comparisons for cp_cost (TEXT in SQLite, NOT numeric)
    - Phase badge colors use Tailwind bg-{color}-500/20 + text-{color}-700 dark:text-{color}-300 pattern
    - Filter chip toggle: setFilter(current === value ? null : value) for on/off toggling
    - useMemo dependency array includes all filter state plus the raw data array

key-files:
  created:
    - src/features/rules-hub/applyRulesHubFilters.ts
    - src/features/rules-hub/StratagemCard.tsx
    - tests/rules-hub/applyRulesHubFilters.test.ts
  modified:
    - src/features/rules-hub/RulesHubPage.tsx

key-decisions:
  - "cp_cost comparison uses string equality (s.cp_cost === options.cpFilter) because cp_cost is TEXT in SQLite — do NOT parse to number"
  - "Phase badge uses custom className on Badge variant=outline with border-transparent to override border while keeping badge shape"
  - "Filter chip toggle pattern: setFilter(activeFilter === chip ? null : chip) — clicking active chip deselects it"

patterns-established:
  - "Stratagem filter chip toggle: setPhaseFilter(phaseFilter === phase ? null : phase)"
  - "useMemo filter pipeline: applyStratagemFilters(stratagems, { searchText, phaseFilter, cpFilter })"

requirements-completed: [RULES-05, RULES-08]

duration: 15min
completed: 2026-05-11
---

# Phase 53 Plan 02: Stratagems Tab Summary

**Expandable StratagemCard with phase-colored badges and CP cost badge, pure applyStratagemFilters function with phase/CP/text search, and fully wired Stratagems tab with toggle filter chips and useMemo pipeline**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-10T19:29:06Z
- **Completed:** 2026-05-10T19:44:00Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `applyStratagemFilters` pure function handles phase filter, CP cost filter, and text search (name + legend), all with string comparisons matching SQLite TEXT storage
- `StratagemCard` renders collapsible card with phase badge (5 distinct colors) and CP cost badge (or "Free"), expanding to show legend and description
- Stratagems tab in RulesHubPage now shows phase filter chips (5 phases), CP cost chips (1/2/3 CP), count label, card list, and empty state — all wired to Zustand filter store via useMemo
- 9 filter tests covering all combinations: phase only, CP only, name search, legend search, combined, and no-filter passthrough

## Task Commits

1. **Task 1: Pure filter function + StratagemCard component** - `9b1f00b` (feat)
2. **Task 2: Wire Stratagems tab with filter chips and search** - `85c099b` (feat)

## Files Created/Modified

- `src/features/rules-hub/applyRulesHubFilters.ts` — Pure filter function + STRATAGEM_PHASES const + StratagemFilterOptions interface
- `src/features/rules-hub/StratagemCard.tsx` — Collapsible card with phase badge (color-coded), CP cost badge, legend + description body
- `src/features/rules-hub/RulesHubPage.tsx` — Stratagems tab replaced with filter chips, useMemo pipeline, StratagemCard list, empty state, count label
- `tests/rules-hub/applyRulesHubFilters.test.ts` — 9 unit tests for applyStratagemFilters, all passing

## Decisions Made

- `cp_cost` uses string equality (`s.cp_cost === options.cpFilter`) because the field is TEXT in SQLite — parsing to number would break comparison for values like "1 CP" or multi-digit costs
- Phase badge uses `variant="outline"` with `border-transparent` and custom color class to keep badge shape while applying custom background/text colors
- Filter chip toggle pattern `setFilter(active === value ? null : value)` provides on/off toggling without a separate "clear" button per chip

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Stratagems tab complete; Detachments and Shared Abilities tabs in RulesHubPage are still placeholders ready for Plan 03
- applyStratagemFilters pattern can be cloned for detachment abilities if Plan 03 adds filtering there
- Filter store (phaseFilter, cpFilter) is already set up and ready for additional uses

---
*Phase: 53-rules-data-hub-ui*
*Completed: 2026-05-11*
