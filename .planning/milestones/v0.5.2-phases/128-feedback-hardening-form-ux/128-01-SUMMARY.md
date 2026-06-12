---
phase: 128-feedback-hardening-form-ux
plan: 01
subsystem: ui
tags: [react-query, toast, autofocus, delete-dialog, gcTime, feedback]

requires:
  - phase: 127-page-header-spacing-icons
    provides: Standardized page headers and spacing patterns
provides:
  - Delete dialog pending text pattern applied to all 4 remaining dialogs
  - Sheet form autoFocus on first text input for all 6 forms
  - gcTime: Infinity aligned with every staleTime: Infinity hook (34 occurrences)
  - Toast upgrades for session create and snapshot delete
  - Destructive error styling on SpendingPage
affects: [129-navigation-sidebar-dead-ends]

tech-stack:
  added: []
  patterns:
    - "gcTime: Infinity must accompany every staleTime: Infinity to prevent cache eviction"
    - "Delete dialog buttons use {mutation.isPending ? 'Deleting...' : 'Delete'} pattern"
    - "Sheet forms focus first text input via autoFocus on Input element inside FormControl"

key-files:
  created: []
  modified:
    - src/features/factions/FactionDeleteDialog.tsx
    - src/features/battle-log/BattleLogDeleteDialog.tsx
    - src/features/recipes/RecipeDeleteDialog.tsx
    - src/features/paints/PaintDeleteDialog.tsx
    - src/features/units/JournalTab.tsx
    - src/features/army-lists/SnapshotHistorySheet.tsx
    - src/features/spending/SpendingPage.tsx
    - src/features/factions/FactionSheet.tsx
    - src/features/goals/GoalSheet.tsx
    - src/features/paints/PaintSheet.tsx
    - src/features/units/UnitFormRequired.tsx
    - src/features/battle-log/BattleLogSheet.tsx
    - src/features/recipes/RecipeFormSheet.tsx
    - src/hooks/useGameData.ts
    - src/hooks/useDatasheet.ts
    - src/hooks/useJournalSessions.ts
    - src/hooks/useStrategyNote.ts
    - src/hooks/useUnitKeywords.ts
    - src/hooks/useUnitPhotos.ts
    - src/hooks/useUnitOverride.ts
    - src/hooks/useUnitDatabase.ts
    - src/hooks/useUdbMeta.ts
    - src/features/rules-hub/DatasheetPointsTab.tsx
    - src/features/rules-hub/EnhancementsList.tsx

key-decisions:
  - "RecipeDeleteDialog changed from 'Delete recipe' to 'Delete' to match GoalDeleteDialog reference pattern"
  - "BattleLogSheet autoFocus targets opponent_faction, not battle_date (avoids date picker opening on sheet open)"
  - "PaintSheet autoFocus targets brand field (first text input rendered, not name)"

patterns-established:
  - "Delete dialog pending text: {mutation.isPending ? 'Deleting...' : 'Delete'}"
  - "Sheet form autoFocus: placed on Input element before {...field} spread"
  - "gcTime/staleTime symmetry: every staleTime: Infinity must have gcTime: Infinity"

requirements-completed: [FBK-01, FBK-03, FBK-04, FBK-08, FBK-09, FBK-10]

duration: 6min
completed: 2026-06-11
---

# Phase 128 Plan 01: Mechanical Feedback Improvements Summary

**Delete dialog pending text, Sheet autoFocus, toast upgrades, and gcTime alignment across 24 files**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-11T14:18:42Z
- **Completed:** 2026-06-11T14:24:13Z
- **Tasks:** 3
- **Files modified:** 24

## Accomplishments
- All 4 delete dialogs (Faction, BattleLog, Recipe, Paint) show "Deleting..." during pending mutation
- 6 Sheet forms auto-focus first text input on open for immediate typing
- 34 useQuery hooks now pair gcTime: Infinity with staleTime: Infinity
- JournalTab session create fires toast.success, SnapshotHistorySheet delete uses toast.success
- SpendingPage error text uses text-destructive for proper error styling

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete dialog pending text and toast upgrades** - `872f401d` (feat)
2. **Task 2: Sheet form autoFocus and error styling** - `0b5f4f3a` (feat)
3. **Task 3: React Query gcTime alignment** - `4e873cd0` (feat)

## Files Created/Modified
- `src/features/factions/FactionDeleteDialog.tsx` - Pending delete text
- `src/features/battle-log/BattleLogDeleteDialog.tsx` - Pending delete text
- `src/features/recipes/RecipeDeleteDialog.tsx` - Pending delete text, "Delete recipe" -> "Delete"
- `src/features/paints/PaintDeleteDialog.tsx` - Pending delete text
- `src/features/units/JournalTab.tsx` - toast.success on session create
- `src/features/army-lists/SnapshotHistorySheet.tsx` - toast.success for snapshot delete
- `src/features/spending/SpendingPage.tsx` - text-destructive error styling
- `src/features/factions/FactionSheet.tsx` - autoFocus on name input
- `src/features/goals/GoalSheet.tsx` - autoFocus on name input
- `src/features/paints/PaintSheet.tsx` - autoFocus on brand input
- `src/features/units/UnitFormRequired.tsx` - autoFocus on name input + gcTime
- `src/features/battle-log/BattleLogSheet.tsx` - autoFocus on opponent_faction input
- `src/features/recipes/RecipeFormSheet.tsx` - autoFocus on name input
- `src/hooks/useGameData.ts` - gcTime: Infinity (6 hooks)
- `src/hooks/useDatasheet.ts` - gcTime: Infinity (5 hooks)
- `src/hooks/useJournalSessions.ts` - gcTime: Infinity (2 hooks)
- `src/hooks/useStrategyNote.ts` - gcTime: Infinity (1 hook)
- `src/hooks/useUnitKeywords.ts` - gcTime: Infinity (1 hook)
- `src/hooks/useUnitPhotos.ts` - gcTime: Infinity (2 hooks)
- `src/hooks/useUnitOverride.ts` - gcTime: Infinity (1 hook)
- `src/hooks/useUnitDatabase.ts` - gcTime: Infinity (8 hooks)
- `src/hooks/useUdbMeta.ts` - gcTime: Infinity (1 hook)
- `src/features/rules-hub/DatasheetPointsTab.tsx` - gcTime: Infinity (5 inline hooks)
- `src/features/rules-hub/EnhancementsList.tsx` - gcTime: Infinity (1 inline hook)

## Decisions Made
- RecipeDeleteDialog button text shortened from "Delete recipe" to "Delete" to match the GoalDeleteDialog reference pattern
- BattleLogSheet autoFocus placed on opponent_faction (not battle_date which opens a date picker)
- PaintSheet autoFocus placed on brand field (first text input in the form, not name)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added gcTime: Infinity to DatasheetPointsTab.tsx and EnhancementsList.tsx**
- **Found during:** Task 3 (gcTime alignment)
- **Issue:** Plan listed 10 files but grep revealed 2 additional files with staleTime: Infinity without gcTime
- **Fix:** Added gcTime: Infinity to 5 occurrences in DatasheetPointsTab.tsx and 1 in EnhancementsList.tsx
- **Files modified:** src/features/rules-hub/DatasheetPointsTab.tsx, src/features/rules-hub/EnhancementsList.tsx
- **Verification:** grep counts match, pnpm build passes
- **Committed in:** 4e873cd0 (Task 3 commit)

**2. [Rule 2 - Missing Critical] useGameData.ts had 6 hooks, not 5 as planned**
- **Found during:** Task 3 (gcTime alignment)
- **Issue:** Plan estimated 5 occurrences but file has 6 hooks with staleTime: Infinity (useDetachmentAbilitiesByDetachment was missed)
- **Fix:** Applied gcTime: Infinity to all 6 hooks
- **Files modified:** src/hooks/useGameData.ts
- **Verification:** All 6 hooks now have paired gcTime: Infinity
- **Committed in:** 4e873cd0 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both auto-fixes ensured complete coverage of the gcTime alignment requirement. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All mechanical feedback improvements from FBK-01, FBK-03, FBK-04, FBK-08, FBK-09, FBK-10 are complete
- Phase 128 plan 02 (structural JSX feedback) already completed
- Ready for phase 129 (navigation/sidebar/dead-ends)

---
*Phase: 128-feedback-hardening-form-ux*
*Completed: 2026-06-11*
