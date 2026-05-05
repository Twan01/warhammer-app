---
phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview
plan: 03
subsystem: ui
tags: [react, shadcn, tanstack-query, sqlite, wargear, loadouts, point-tiers]

# Dependency graph
requires:
  - phase: 24-02
    provides: "useUnitPointTiers, useUnitLoadouts hooks + DB query modules + computeDelta utility"
provides:
  - "TierManager component — inline point tier CRUD table with model_count/points rows + Pattern 6 units.points write"
  - "LoadoutSection component — named loadout CRUD with wargear picker (line-grouped from datasheet, manual fallback)"
  - "PlaybookTab integration — TierManager and LoadoutSection rendered after wargear section"
  - "16 Wave 0 test stubs activated and passing across 3 test files"
affects: [army-list, PlaybookTab, CollectionPage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side cross-DB merge: useDatasheet (rules.db) + useUnitLoadouts (hobbyforge.db) merged in useMemo — never SQL JOIN"
    - "Pattern 6: tier points written to units.points via useUpdateUnit.mutate on Set Active"
    - "Wargear grouping by line field using Map + sorted entries"
    - "Stale wargear detection: is_manual === 0 AND weapon_name not in current datasheet wargear set"

key-files:
  created:
    - "src/features/units/TierManager.tsx"
    - "src/features/units/LoadoutSection.tsx"
  modified:
    - "src/features/units/PlaybookTab.tsx"
    - "tests/collection/PlaybookTab.test.tsx"

key-decisions:
  - "No shadcn Checkbox component exists — used native HTML input[type=checkbox] styled with accent-primary"
  - "LoadoutSection uses Collapsible (inline) not Dialog — avoids Radix portal nesting (Pitfall 4)"
  - "PlaybookTab.test.tsx mock extended with useUnit, useUnitPointTiers, useUnitLoadouts to prevent regression after TierManager integration"

patterns-established:
  - "Pattern: TierManager/LoadoutSection are self-contained — they own data fetching; PlaybookTab passes only unitId"
  - "Pattern: wargear stale check uses Set<string> of current datasheet weapon names for O(1) lookup"

requirements-completed: [TIER-01, TIER-02, TIER-03, LOAD-01, LOAD-02, LOAD-03, DELTA-01]

# Metrics
duration: 5min
completed: 2026-05-05
---

# Phase 24 Plan 03: PlaybookTab UI — TierManager and LoadoutSection

**TierManager inline tier CRUD + LoadoutSection wargear picker integrated into PlaybookTab, with 16 Wave 0 tests passing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-05T18:28:30Z
- **Completed:** 2026-05-05T18:33:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- TierManager renders a table of model_count/points tiers with inline add/delete; Set Active button writes tier.points to units.points via useUpdateUnit (Pattern 6); green Check icon marks active tier by model_count match
- LoadoutSection renders named loadouts in collapsible cards with Star/Trash controls; wargear picker groups datasheet weapons by line field using client-side useMemo merge; manual weapon fallback when no datasheet linked; stale wargear badge for weapons renamed after sync
- PlaybookTab integrates both components after existing wargear/abilities section with Separator dividers
- All 16 Wave 0 test stubs in unitPointTierQueries.test.ts (5), unitLoadoutQueries.test.ts (7), and deltaPreview.test.ts (4) activated and passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TierManager and LoadoutSection components** - `fd9c4ad` (feat)
2. **Task 2: Integrate into PlaybookTab and activate test stubs** - `ec80c3f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/features/units/TierManager.tsx` - Point tier CRUD table component with Pattern 6 units.points write
- `src/features/units/LoadoutSection.tsx` - Loadout CRUD + wargear picker with line-grouped datasheet weapons
- `src/features/units/PlaybookTab.tsx` - Added TierManager and LoadoutSection imports and rendering
- `tests/collection/PlaybookTab.test.tsx` - Extended useUnits mock with useUnit; added useUnitPointTiers and useUnitLoadouts mocks

## Decisions Made
- No shadcn Checkbox component exists in the project — used native `<input type="checkbox">` with `accent-primary` CSS for consistent styling without adding a new dependency
- LoadoutSection uses Collapsible (inline expansion) rather than Dialog — keeps wargear management in-place and avoids Radix portal nesting (Pitfall 4 from RESEARCH.md)
- PlaybookTab components are fully self-contained — they each call their own hooks; PlaybookTab only passes unitId prop; no state hoisting needed in CollectionPage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PlaybookTab.test.tsx mock missing useUnit export**
- **Found during:** Task 2 (activating test stubs + running full suite)
- **Issue:** TierManager uses `useUnit` from `@/hooks/useUnits` but the existing PlaybookTab.test.tsx mock only exported `useUnits` and `useUpdateUnit`. Vitest threw "No 'useUnit' export is defined on the mock" causing 23 test failures in PlaybookTab.test.tsx
- **Fix:** Added `useUnit: vi.fn(() => ({ data: null }))` to existing useUnits mock; also added useUnitPointTiers and useUnitLoadouts mocks for TierManager/LoadoutSection components now rendered inside PlaybookTab
- **Files modified:** tests/collection/PlaybookTab.test.tsx
- **Verification:** All 97 test files pass (644 tests green, 2 skip)
- **Committed in:** ec80c3f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug introduced by integration)
**Impact on plan:** Necessary correctness fix. TierManager's useUnit dependency was unspecified in the plan's mock requirements. No scope creep.

## Issues Encountered
- Test stubs in all 3 files were already fully activated (no describe.skip/it.skip found) — Task 2's "activate stubs" step was a no-op for those files; only the PlaybookTab mock extension was needed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 24 Wave 2 is complete: TierManager + LoadoutSection ship in PlaybookTab with 16 tests green
- Phase 25 (v2.3 continuation) or Phase 30 (v2.4 Grid Layout) can proceed
- No blockers

## Self-Check: PASSED

- FOUND: src/features/units/TierManager.tsx
- FOUND: src/features/units/LoadoutSection.tsx
- FOUND: .planning/phases/24-.../24-03-SUMMARY.md
- FOUND commit: fd9c4ad (Task 1)
- FOUND commit: ec80c3f (Task 2)

---
*Phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview*
*Completed: 2026-05-05*
