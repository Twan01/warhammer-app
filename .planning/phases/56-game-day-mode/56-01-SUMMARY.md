---
phase: 56-game-day-mode
plan: 01
subsystem: ui
tags: [zustand, persist, tanstack-router, game-day, cp-tracker, stratagems, tabs]

requires:
  - phase: 53-rules-hub-ui
    provides: StratagemCard, PHASE_STYLES, RwStratagem type
  - phase: 54-army-lists-2
    provides: ArmyListDetailSheet, DetachmentRulesSection, RemindersSection
  - phase: 55-playbook-enhancements
    provides: RuleAnnotationControls, favorites/notes data layer
provides:
  - Game Day page route at /game-day/$listId with tabbed layout
  - Zustand persist store for CP, checklist, once-per-game toggles keyed by list ID
  - GameDayStratagemCard component for game-day-specific stratagem display
  - StrategemsTab with phase-grouped stratagems and pinned reminders
  - GameDayHeader with CP tracker (spend, gain, undo, starting CP)
  - Game Day button in ArmyListDetailSheet
affects: [56-game-day-mode]

tech-stack:
  added: [zustand/middleware persist]
  patterns: [zustand-persist-store, phase-grouped-stratagems, game-day-simplified-card]

key-files:
  created:
    - src/features/game-day/gameDayStore.ts
    - src/features/game-day/GameDayPage.tsx
    - src/features/game-day/GameDayHeader.tsx
    - src/features/game-day/StrategemsTab.tsx
    - src/features/game-day/GameDayStratagemCard.tsx
    - src/app/game-day/page.tsx
    - tests/game-day/gameDayStore.test.ts
    - tests/game-day/GameDayPage.test.tsx
    - tests/game-day/StratagemsByPhase.test.tsx
    - tests/game-day/CpTracker.test.tsx
  modified:
    - src/app/router.tsx
    - src/features/army-lists/ArmyListDetailSheet.tsx

key-decisions:
  - "GameDayStratagemCard created as stripped variant of StratagemCard — no annotation controls (star/flag/note), adds Spend CP button"
  - "Zustand persist middleware first use in project — stores CP, checklist, and ability toggles keyed by list ID in localStorage"
  - "usedAbilities stored as string[] (not Set) to avoid JSON serialization issues with Zustand persist"
  - "StrategemsTab includes inline StratagemRow replaced by GameDayStratagemCard with Collapsible layout"

patterns-established:
  - "Zustand persist store pattern: create<Store>()(persist((set) => ({...}), { name: 'key' })) for localStorage-backed state"
  - "Game Day simplified card pattern: strip annotation controls from rules components for in-game context"
  - "Phase-grouped display: PHASE_ORDER const + Map<string, T[]> grouping with Collapsible per phase"

requirements-completed: [GAME-01, GAME-02, GAME-03, GAME-07]

duration: 14min
completed: 2026-05-11
---

# Phase 56 Plan 01: Game Day Page Infrastructure Summary

**Game Day page with Zustand persist CP tracker, phase-grouped stratagems, pinned reminders, and tabbed layout launched from army list detail**

## Performance

- **Duration:** 14 min
- **Started:** 2026-05-11T18:49:05Z
- **Completed:** 2026-05-11T19:03:25Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Zustand persist store for game state (CP, checklist, abilities) keyed per army list ID
- GameDayPage at /game-day/$listId with 3-tab layout (Stratagems, Units placeholder, Checklist placeholder)
- CP tracker in header with spend/gain/undo/starting CP controls
- StrategemsTab with phase-grouped GameDayStratagemCards and pinned reminders
- Game Day button in ArmyListDetailSheet with proper Sheet close-before-navigate pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Zustand persist store + route + page shell + Game Day button + tests** - `2ce5a94` (feat)
2. **Task 2: Stratagems tab with phase grouping and pinned reminders** - `169d87b` (feat)

## Files Created/Modified
- `src/features/game-day/gameDayStore.ts` - Zustand persist store with CP, checklist, and ability toggle operations
- `src/features/game-day/GameDayPage.tsx` - Page root with data loading, 3-tab layout
- `src/features/game-day/GameDayHeader.tsx` - Header with list info, faction badge, detachment, CP tracker
- `src/features/game-day/StrategemsTab.tsx` - Phase-grouped stratagems with reminders pinned at top
- `src/features/game-day/GameDayStratagemCard.tsx` - Simplified collapsible stratagem card with Spend CP action
- `src/app/game-day/page.tsx` - Route shell extracting listId param
- `src/app/router.tsx` - Added /game-day/$listId route with gameDayRoute
- `src/features/army-lists/ArmyListDetailSheet.tsx` - Added Game Day button in SheetFooter

## Decisions Made
- Created GameDayStratagemCard as a new component rather than reusing StratagemCard with null props — avoids annotation controls appearing during gameplay
- Used zustand/middleware persist (first use in project) — cleaner than raw localStorage hooks for multi-field structured state
- Stored usedAbilities as string[] not Set to avoid JSON serialization failure with Zustand persist

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused variable `get` in Zustand store**
- **Found during:** Task 1 (build check)
- **Issue:** TypeScript strict mode flagged `get` parameter as unused in `persist((set, get) => ...)`
- **Fix:** Changed to `(set) => ...` since store actions use `set` callback pattern with state access
- **Files modified:** src/features/game-day/gameDayStore.ts
- **Committed in:** 2ce5a94

**2. [Rule 1 - Bug] Fixed test assertion for duplicate text matches**
- **Found during:** Task 2 (test verification)
- **Issue:** `screen.getByText("Command")` failed because "Command" appears both as phase group header and as phase badge on stratagem card
- **Fix:** Changed to `screen.getAllByText("Command").length >= 1` assertion
- **Files modified:** tests/game-day/StratagemsByPhase.test.tsx
- **Committed in:** 169d87b

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Minor fixes for build compliance and test correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Units tab and Checklist tab are placeholder stubs ready for plan 02 implementation
- Game Day store already has all checklist and ability toggle operations wired
- Per-unit useDatasheet pattern (sub-component per item) documented in RESEARCH.md for plan 02

---
*Phase: 56-game-day-mode*
*Completed: 2026-05-11*
