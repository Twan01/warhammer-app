---
phase: 53-rules-data-hub-ui
plan: 01
subsystem: ui
tags: [react, zustand, tanstack-query, radix-ui, rules-hub, wahapedia, sync]

requires:
  - phase: 52-schema-data-layer
    provides: hooks for rules sync meta, sync errors, rules extended data, and wahapedia faction ID resolution

provides:
  - /rules-hub route registered in TanStack Router
  - Rules Hub sidebar entry in PLAY_NAV section with Library icon
  - Zustand filter store (useRulesHubFilters) with faction, search, phase, CP filters
  - SyncStatusCard with freshness dot, age label, row counts, version badge, sync trigger, diff summary, collapsible error history
  - RulesHubPage scaffold with faction picker, search bar, 3-tab shell, no-data / no-faction empty states, Wahapedia disclaimer
  - Tests for RULES-01, RULES-02, RULES-03, RULES-04, RULES-09

affects:
  - 53-02 (fills tab content for Stratagems, Detachments, Shared Abilities using the page scaffold built here)
  - 53-03 (Rules Hub detail panels depend on faction picker and filter store)

tech-stack:
  added: []
  patterns:
    - TooltipProvider must wrap test wrappers in any component that uses Radix Tooltip
    - unknown cast required for UseQueryResult mock return types in test files

key-files:
  created:
    - src/features/rules-hub/rulesHubFilters.ts
    - src/features/rules-hub/SyncStatusCard.tsx
    - src/features/rules-hub/RulesHubPage.tsx
    - src/app/rules-hub/page.tsx
    - tests/rules-hub/SyncStatusCard.test.tsx
    - tests/rules-hub/RulesHubPage.test.tsx
  modified:
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx

key-decisions:
  - "SyncDiff summary uses array lengths (added.length, removed.length) not numeric counts since SyncDiff stores item arrays not integers"
  - "Collapsible error history starts closed (defaultOpen=false) — error list is secondary info"
  - "useStratagemsByFaction / useDetachmentsByFaction / useSharedAbilitiesByFaction called at RulesHubPage level to prefetch when faction selected"

patterns-established:
  - "TooltipProvider must be included in test wrappers when component uses Radix Tooltip"
  - "unknown cast for UseQueryResult mocks: `} as unknown as ReturnType<typeof hook>`"

requirements-completed: [RULES-01, RULES-02, RULES-03, RULES-04, RULES-09]

duration: 25min
completed: 2026-05-10
---

# Phase 53 Plan 01: Rules Hub Scaffold Summary

**Navigable /rules-hub page with sync status card (freshness dot, row counts, trigger button, diff summary, error history collapsible), faction picker, tab shell, and Wahapedia disclaimer — all wired to existing Phase 52 hooks**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-10T19:00:00Z
- **Completed:** 2026-05-10T19:25:00Z
- **Tasks:** 2
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- Route /rules-hub registered in TanStack Router and "Rules Hub" added to PLAY_NAV sidebar section
- SyncStatusCard renders all sync metadata fields (freshness dot with tooltip, age label, version badge, row counts), fires sync mutation with loading state, shows diff summary after sync, and displays collapsible error history
- RulesHubPage wires faction picker + search bar to Zustand store, renders 3-tab shell, shows contextual empty states, and includes Wahapedia disclaimer footer
- 10 tests covering RULES-01 through RULES-04 and RULES-09, all passing

## Task Commits

1. **Task 1: Zustand filter store + route + sidebar nav** - `d9e94fc` (feat)
2. **Task 2: SyncStatusCard + RulesHubPage + tests** - `4648799` (feat)

## Files Created/Modified

- `src/features/rules-hub/rulesHubFilters.ts` — Zustand store with faction, search, phase, CP filters
- `src/features/rules-hub/SyncStatusCard.tsx` — Sync metadata card with trigger, diff, and error history
- `src/features/rules-hub/RulesHubPage.tsx` — Full page scaffold with all sections
- `src/app/rules-hub/page.tsx` — Thin router shell
- `src/app/router.tsx` — Added rulesHubRoute
- `src/components/common/AppSidebar.tsx` — Added Library icon and PLAY_NAV entry
- `tests/rules-hub/SyncStatusCard.test.tsx` — RULES-01, RULES-03 tests
- `tests/rules-hub/RulesHubPage.test.tsx` — RULES-02, RULES-04, RULES-09 tests

## Decisions Made

- SyncDiff summary uses array `.length` counts since `SyncDiff` stores item arrays (not scalar integers)
- Error history collapsible starts closed — it is secondary/diagnostic information
- Rules data hooks prefetched at RulesHubPage level on faction selection so tab switches are instant

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added TooltipProvider to test wrappers**
- **Found during:** Task 2 test run
- **Issue:** Radix Tooltip throws "must be used within TooltipProvider" in jsdom environment when component is rendered without the provider in the test wrapper
- **Fix:** Added `<TooltipProvider>` wrapper inside both test makeWrapper() functions
- **Files modified:** tests/rules-hub/SyncStatusCard.test.tsx, tests/rules-hub/RulesHubPage.test.tsx
- **Verification:** All 10 tests pass
- **Committed in:** 4648799 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed UseQueryResult mock type cast**
- **Found during:** Task 2 build check after tests passed
- **Issue:** `{ data: [...] } as ReturnType<typeof useRulesSyncErrors>` fails TypeScript strict check — partial mock object doesn't overlap with full UseQueryResult type
- **Fix:** Changed cast to `as unknown as ReturnType<...>` for mock-only return values
- **Files modified:** tests/rules-hub/SyncStatusCard.test.tsx
- **Verification:** pnpm build succeeds
- **Committed in:** 4648799 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs in test infrastructure)
**Impact on plan:** Both fixes are standard test-harness corrections. No scope changes.

## Issues Encountered

- Radix Collapsible content uses CSS `data-state="closed"` which hides content; `screen.getByText` inside CollapsibleContent required clicking the trigger button by role rather than by text to avoid matching the icon child node

## Next Phase Readiness

- Tab shell ready for Plan 02 to fill Stratagems tab content
- Faction picker and filter store ready for Plans 02 and 03
- SyncStatusCard can be reused or linked from other pages if needed

---
*Phase: 53-rules-data-hub-ui*
*Completed: 2026-05-10*
