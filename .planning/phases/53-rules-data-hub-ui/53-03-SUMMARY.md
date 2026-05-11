---
phase: 53-rules-data-hub-ui
plan: 03
subsystem: ui
tags: [react, tanstack-query, radix-ui, rules-hub, detachments, shared-abilities, wahapedia]

requires:
  - phase: 53-02
    provides: StratagemCard pattern + useMemo filter pipeline pattern established in Stratagems tab

provides:
  - DetachmentCard collapsible component with unconditional hook call and abilities count badge
  - SharedAbilityCard collapsible component with name, legend subtitle, and expandable description
  - Detachments tab fully wired with useMemo text search, count label, loading skeleton, empty state
  - Shared Abilities tab fully wired with useMemo text search (name + legend), count label, loading skeleton, empty state
  - 6 unit tests for DetachmentCard covering count badge, singular form, expand, empty state, loading state

affects:
  - Phase 53 complete — all three rules-hub tabs (Stratagems, Detachments, Shared Abilities) fully functional

tech-stack:
  added: []
  patterns:
    - DetachmentCard calls useDetachmentAbilitiesByDetachment(detachment.id) unconditionally at top-level — safe because each card is its own component instance
    - Loading skeleton pattern: 3 x Skeleton h-[80px] items behind isLoading guard, same for all three tabs
    - Shared abilities text search filters on both name and legend fields (legend can contain ability type/category text)

key-files:
  created:
    - src/features/rules-hub/DetachmentCard.tsx
    - src/features/rules-hub/SharedAbilityCard.tsx
    - tests/rules-hub/DetachmentCard.test.tsx
  modified:
    - src/features/rules-hub/RulesHubPage.tsx

key-decisions:
  - "useDetachmentAbilitiesByDetachment called unconditionally inside DetachmentCard — each card is a separate component instance, so Rules of Hooks are satisfied; no lazy fetch needed"
  - "Shared abilities search filters both name and legend: legend often contains category/type text (e.g. 'Tactical', 'Psychic') that users would search for"
  - "Loading skeleton applied to all three tabs (including Stratagems) for visual consistency, even though Stratagems previously had no skeleton"

requirements-completed: [RULES-06, RULES-07]

duration: 10min
completed: 2026-05-11
---

# Phase 53 Plan 03: Detachments and Shared Abilities Tabs Summary

**DetachmentCard and SharedAbilityCard collapsible components wired into RulesHubPage, completing all three Rules Hub tabs with text search, loading skeletons, count labels, and empty states**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-11T05:58:29Z
- **Completed:** 2026-05-11T06:07:50Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `DetachmentCard` calls `useDetachmentAbilitiesByDetachment(detachment.id)` unconditionally at component top level; renders abilities count badge; expands to show ability list with name + description; handles loading and empty states
- `SharedAbilityCard` renders name + legend as subtitle badge; expands to show description (falls back to legend if no description)
- Detachments tab in RulesHubPage: useMemo text search filter, count label, DetachmentCard list, loading skeleton (3 items), empty state message
- Shared Abilities tab in RulesHubPage: useMemo text search on name + legend, count label, SharedAbilityCard list, loading skeleton, empty state message
- Stratagems tab also updated with loading skeleton for visual consistency
- 6 unit tests: count badge, singular "ability" form, expand to reveal abilities, empty state message, loading state display

## Task Commits

1. **Task 1: DetachmentCard + SharedAbilityCard components** - `6d5c91d` (feat)
2. **Task 2: Wire Detachments and Shared Abilities tabs** - `e515aea` (feat)

## Files Created/Modified

- `src/features/rules-hub/DetachmentCard.tsx` — Collapsible card with unconditional hook call, abilities count badge, expandable ability list
- `src/features/rules-hub/SharedAbilityCard.tsx` — Collapsible card with name, legend subtitle, expandable description
- `src/features/rules-hub/RulesHubPage.tsx` — Both remaining tabs replaced with full implementation; loading skeletons added to all three tabs
- `tests/rules-hub/DetachmentCard.test.tsx` — 6 unit tests for DetachmentCard, all passing

## Decisions Made

- Hook called unconditionally inside `DetachmentCard`: `useDetachmentAbilitiesByDetachment(detachment.id)` — each `<DetachmentCard>` is a separate React component instance rendered inside `.map()`, so calling the hook unconditionally at the top of the component is correct per Rules of Hooks. No conditional/lazy fetch needed.
- Shared abilities search filters both `name` and `legend` fields — legend text often contains category information (e.g. "Psychic", "Aura") that users naturally search for
- Loading skeleton applied uniformly to all three tabs for consistent UX, even though Stratagems tab previously lacked one

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Phase 53 Completion

All three tabs in the Rules Hub are now fully functional:
- **Stratagems** (Plan 02): filter chips (phase + CP cost), search, expandable cards with phase badges
- **Detachments** (Plan 03): search, expandable cards with abilities count, nested ability list on expand
- **Shared Abilities** (Plan 03): search (name + legend), expandable cards with full description on expand

Requirements RULES-06 and RULES-07 are complete. Phase 53 is done.

---
*Phase: 53-rules-data-hub-ui*
*Completed: 2026-05-11*
