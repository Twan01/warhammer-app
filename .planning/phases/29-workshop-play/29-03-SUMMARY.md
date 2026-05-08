---
phase: 29-workshop-play
plan: "03"
subsystem: ui
tags: [react, tailwindcss, shadcn, army-lists, battle-log, react-query]

# Dependency graph
requires:
  - phase: 29-01
    provides: useArmyListReadiness hook + getArmyListReadiness query

provides:
  - ArmyListSummaryBar with progress bar (bg-battle-gold), not-ready unit list (StatusBadge per unit), gold "All units battle-ready" message at 100%
  - BattleLogRow with live readiness points inline (armyListName (X/Y pts ready))
  - BattleLogPage wired with useArmyListReadiness for all army list IDs in current logs
  - 17 PLAY-01/02 stubs green (zero it.skip remaining in workshop-play test suite)

affects: [army-lists, battle-log, play-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bg-battle-gold CSS custom property used for progress bar fill and gold-tinted all-ready message"
    - "tabular-nums on readiness point span prevents layout jitter on dynamic numeric values"
    - "armyListIds memo extracts unique Set<number> from logs array for batch readiness hook"
    - "armyListReadiness.test.ts renamed to .tsx when activating JSX-rendering stubs (esbuild requirement)"

key-files:
  created:
    - tests/workshop-play/armyListReadiness.test.tsx
    - tests/workshop-play/armyListReadinessPanel.test.tsx
  modified:
    - src/features/army-lists/ArmyListSummaryBar.tsx
    - src/features/battle-log/BattleLogRow.tsx
    - src/features/battle-log/BattleLogPage.tsx

key-decisions:
  - "armyListReadiness.test.ts renamed to .tsx when BattleLogRow UI stubs activated — esbuild requires .tsx for JSX syntax in test files (consistent with Phase 28 decision)"
  - "Collapsible and CollapsibleContent mocked in BattleLogRow tests to avoid Radix portal issues in jsdom"
  - "status_assembly is number (0|1) not string in ArmyListUnitRow — test makeUnit helper corrected from 'Assembled' to 1"
  - "BattleLog has no updated_at column — makeLog helper corrected to omit it, notes: null added explicitly"

patterns-established:
  - "Progress bar: outer div with bg-muted + overflow-hidden, inner div with bg-battle-gold + inline style width"
  - "All-ready state: p element with bg-battle-gold/10 text-battle-gold classes (gold-tinted panel)"
  - "Not-ready list: StatusBadge rendered per unit with justify-between row layout"

requirements-completed:
  - PLAY-01
  - PLAY-02

# Metrics
duration: 10min
completed: 2026-05-05
---

# Phase 29 Plan 03: Workshop + Play PLAY-01/02 Summary

**ArmyListSummaryBar upgraded with bg-battle-gold progress bar + not-ready StatusBadge list; BattleLogRow shows live (X/Y pts ready) inline via useArmyListReadiness batch hook**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-05T14:49:00Z
- **Completed:** 2026-05-05T14:59:10Z
- **Tasks:** 2
- **Files modified:** 5 (3 source, 2 test)

## Accomplishments

- PLAY-01: ArmyListSummaryBar shows 2px progress bar with bg-battle-gold fill, per-unit not-ready list with StatusBadge, and gold-tinted "All units battle-ready" panel at 100%
- PLAY-02: BattleLogRow renders "(battleReady/total pts ready)" with tabular-nums when armyListReadiness is provided; BattleLogPage extracts army list IDs and calls useArmyListReadiness batch hook
- 17 PLAY stubs flipped green (6 PLAY-01, 11 PLAY-02) — zero it.skip remaining in workshop-play
- pnpm build exits 0, pnpm test exits 0

## Task Commits

1. **Task 1: Upgrade ArmyListSummaryBar with readiness panel (PLAY-01)** - `5a78d8b` (feat)
2. **Task 2: Add live readiness points to BattleLogRow (PLAY-02)** - `ec6a9d4` (feat)
3. **Fix: correct status_assembly type in panel test** - `c987f9f` (fix — Rule 1 auto-fix during build verification)

## Files Created/Modified

- `src/features/army-lists/ArmyListSummaryBar.tsx` - Added StatusBadge import, notReadyUnits memo, progress bar + readiness section JSX
- `src/features/battle-log/BattleLogRow.tsx` - Added armyListReadiness prop, readiness span with tabular-nums
- `src/features/battle-log/BattleLogPage.tsx` - Added useArmyListReadiness import, armyListIds memo, readiness prop wiring
- `tests/workshop-play/armyListReadinessPanel.test.tsx` - 6 PLAY-01 stubs activated (was .tsx stub file)
- `tests/workshop-play/armyListReadiness.test.tsx` - 4 PLAY-02 UI stubs activated; renamed from .ts to .tsx

## Decisions Made

- `armyListReadiness.test.ts` renamed to `.tsx` when activating BattleLogRow stubs — esbuild requires `.tsx` for JSX syntax; consistent with Phase 28 wave-activation pattern
- `Collapsible`/`CollapsibleContent` mocked in BattleLogRow tests to prevent Radix portal issues in jsdom — BattleLogRow wraps content in Collapsible and tests don't need collapse behavior
- `status_assembly: 1` (not `"Assembled"`) — ArmyListUnitRow stores assembly as SQLite 0|1 integer; TypeScript strict mode caught this

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type errors in test helpers**
- **Found during:** Task 2, build verification (pnpm build)
- **Issue 1:** `makeUnit` in armyListReadinessPanel.test.tsx had `status_assembly: "Assembled"` but ArmyListUnitRow declares `status_assembly: number`
- **Issue 2:** `makeLog` in armyListReadiness.test.tsx had `updated_at: "2024-05-01"` but BattleLog has no `updated_at` column; also missing `notes: null`
- **Fix:** Changed `status_assembly` to `1`, removed `updated_at`, added `notes: null`
- **Files modified:** `tests/workshop-play/armyListReadinessPanel.test.tsx`, `tests/workshop-play/armyListReadiness.test.tsx`
- **Verification:** pnpm build exits 0, both test files pass
- **Committed in:** `c987f9f` (separate fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug in test helpers)
**Impact on plan:** Necessary for TypeScript strict mode compliance. Zero scope creep.

## Issues Encountered

None — both tasks executed cleanly. Type errors in test helpers caught by pnpm build and auto-fixed inline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PLAY-01 and PLAY-02 complete; Phase 29 Workshop + Play requirements fully implemented
- Phase 29 is now complete (3/3 plans done: WKSP-01, WKSP-02, PLAY-01, PLAY-02)
- Ready to begin the final phase or close v0.2.3 milestone

---
*Phase: 29-workshop-play*
*Completed: 2026-05-05*
