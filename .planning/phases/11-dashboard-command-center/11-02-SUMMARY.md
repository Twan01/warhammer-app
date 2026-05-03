---
phase: 11-dashboard-command-center
plan: "02"
subsystem: ui
tags: [react, animation, useCountUp, dashboard, vitest, testing-library]

requires:
  - phase: 11-01
    provides: useCountUp hook with reduced-motion gate and rAF animation loop
  - phase: 10-theming-foundation
    provides: ring-faction-accent CSS utility on FactionSummaryCard when isActive=true

provides:
  - StatCard with optional animate prop and module-local AnimatedNumber sub-component
  - 4 hero StatCards in DashboardPage wired with animate={true} for count-up animation
  - UI-07 component-level integration test (hero values render final integers with reduced-motion short-circuit)
  - UI-08 ring class assertion test (active FactionSummaryCard has ring-2 ring-faction-accent)

affects:
  - 11-03-manual-smoke (visual verify of count-up timing and faction ring color in live Tauri app)

tech-stack:
  added: []
  patterns:
    - "AnimatedNumber sub-component pattern: separate component always calls useCountUp unconditionally; parent gates whether it renders (satisfies React Rules of Hooks for conditional animation)"
    - "Object.defineProperty matchMedia global in test files: jsdom does not define window.matchMedia; install via Object.defineProperty with writable+configurable so vi.spyOn can override per-test"
    - "vi.restoreAllMocks() alongside vi.clearAllMocks() in beforeEach: clears spy history AND restores spy implementations to prevent cross-test contamination"

key-files:
  created: []
  modified:
    - src/features/dashboard/StatCard.tsx
    - src/features/dashboard/DashboardPage.tsx
    - tests/dashboard/DashboardPage.test.tsx

key-decisions:
  - "AnimatedNumber sub-component is module-local (not exported) — it is an implementation detail of StatCard, not a public API"
  - "Progress section StatCards (paintingPct/assemblyPct/basingPct) intentionally left without animate prop — per UI-07 scope decision, only the 4 integer hero stats animate; string percentage values are excluded"
  - "matchMedia global mock installed via Object.defineProperty at module level rather than inside individual tests — all DashboardPage tests need it once animate={true} wires AnimatedNumber into hero StatCards"
  - "vi.restoreAllMocks() added to beforeEach alongside vi.clearAllMocks() — necessary to restore vi.spyOn(matchMedia) from UI-07 test before UI-08 test runs"

patterns-established:
  - "AnimatedNumber sub-component: the canonical React Rules of Hooks solution for conditional animation (Pitfall 1)"
  - "typeof value === 'number' guard in animate branch: prevents passing string values like '72%' to useCountUp (Pitfall 2)"

requirements-completed:
  - UI-07
  - UI-08

duration: 4min
completed: 2026-05-03
---

# Phase 11 Plan 02: Dashboard Command Center — animate prop integration Summary

**StatCard gains animate prop with AnimatedNumber sub-component wiring 4 hero cards to useCountUp; 5 DashboardPage tests confirm UI-07 integration and UI-08 ring class (219/219 suite green)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-03T10:43:53Z
- **Completed:** 2026-05-03T10:47:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- StatCard.tsx gains `animate?: boolean` prop with internal `AnimatedNumber` sub-component that unconditionally calls `useCountUp` — satisfies React Rules of Hooks (Pitfall 1), defends against string values via `typeof` guard (Pitfall 2)
- DashboardPage.tsx wires `animate={true}` to 4 hero StatCards (totalModels, fullyPainted, battleReadyPoints, activeProjectsCount); 3 progress cards intentionally left static
- DashboardPage.test.tsx extended with 2 new it() blocks: UI-07 asserts hero value renders final integer (reduced-motion short-circuit for determinism), UI-08 asserts active FactionSummaryCard has `ring-2 ring-faction-accent` classes
- FactionSummaryCard.tsx untouched — Phase 10 already delivered the ring class (verify-only in this plan)
- All 219 tests pass; pnpm tsc --noEmit clean

## Task Commits

1. **Task 1: Add animate prop to StatCard.tsx via AnimatedNumber sub-component** - `1f9e992` (feat)
2. **Task 2: Wire animate={true} to 4 hero StatCards + 2 new tests** - `e82edb2` (feat)

## Files Created/Modified
- `src/features/dashboard/StatCard.tsx` — added `animate?: boolean` prop, `AnimatedNumber` module-local sub-component, conditional render path; DOM structure (Card/CardContent classNames, span classNames) unchanged
- `src/features/dashboard/DashboardPage.tsx` — 4 lines changed: `animate={true}` added to hero StatCard calls; all other code untouched
- `tests/dashboard/DashboardPage.test.tsx` — added global `window.matchMedia` mock via `Object.defineProperty`, `vi.restoreAllMocks()` in beforeEach, and 2 new it() blocks (UI-07, UI-08)

## Decisions Made
- `AnimatedNumber` not exported — it is a private implementation detail of `StatCard`; callers only need `animate?: boolean` on the public `StatCardProps` interface
- Progress section cards stay without `animate` — per UI-07 scope decision; string values like `"72%"` would no-op via typeof guard anyway but explicit exclusion documents intent
- matchMedia global mock at module level (not inside each test) — once `animate={true}` makes AnimatedNumber render in all data-loaded tests, every test in the file needs `window.matchMedia` defined

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added Object.defineProperty matchMedia global to DashboardPage.test.tsx**
- **Found during:** Task 2 (extending DashboardPage.test.tsx)
- **Issue:** jsdom does not define `window.matchMedia`. The plan's UI-07 test used `vi.spyOn(window, "matchMedia")` to mock it, but spying on an undefined property makes the spy return undefined after `vi.clearAllMocks()`. The UI-08 test (running after UI-07) then hit `window.matchMedia is not a function` when `AnimatedNumber` rendered and `useCountUp` ran its reduced-motion check. The existing 3 tests also would have failed if run in isolation since `animate={true}` now makes `AnimatedNumber` render in all data-loaded tests.
- **Fix:** Installed `window.matchMedia` as a `vi.fn()` returning `{ matches: false }` via `Object.defineProperty({ writable: true, configurable: true })` at module level (after vi.mock blocks). Added `vi.restoreAllMocks()` to `beforeEach` alongside the existing `vi.clearAllMocks()` so the UI-07 spy restores correctly before UI-08 runs. The plan's `vi.spyOn` in the UI-07 test body then overrides the now-defined property to `matches: true`.
- **Files modified:** `tests/dashboard/DashboardPage.test.tsx`
- **Verification:** All 5 DashboardPage tests pass; full suite 219/219 green; useCountUp.test.ts (which also uses Object.defineProperty pattern) continues to pass
- **Committed in:** `e82edb2` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary correctness fix — the plan's `vi.spyOn` approach works when the property already exists; the missing `Object.defineProperty` setup was the gap. No scope creep. UI-07 and UI-08 tests match the plan's intent exactly.

## Issues Encountered
- `vi.spyOn(window, "matchMedia")` without a pre-existing property leaves the spy in an invalid state after `vi.clearAllMocks()` — it becomes a spy that returns undefined, causing `window.matchMedia is not a function` on the next call. Solution: install a base implementation via `Object.defineProperty` so spying/restoring works correctly across tests.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UI-07 and UI-08 fully automated: hook tests (Plan 11-01) + component tests (Plan 11-02) all green
- 4 hero cards animate via useCountUp on every Dashboard mount; 3 progress cards remain static
- FactionSummaryCard ring class verified by test — no code change needed
- Plan 11-03 (manual visual smoke test: verify count-up timing + faction ring color in live Tauri app) is the only remaining work for Phase 11

---
*Phase: 11-dashboard-command-center*
*Completed: 2026-05-03*
