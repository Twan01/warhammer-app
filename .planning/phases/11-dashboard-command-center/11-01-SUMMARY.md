---
phase: 11-dashboard-command-center
plan: 01
subsystem: ui
tags: [react, hooks, requestAnimationFrame, animation, accessibility, vitest, testing-library]

# Dependency graph
requires:
  - phase: 11-00
    provides: Wave-0 stub file tests/dashboard/useCountUp.test.ts with 3 it.skip bodies

provides:
  - src/hooks/useCountUp.ts — rAF-based count-up hook with cubic ease-out, integer output, reduced-motion short-circuit
  - tests/dashboard/useCountUp.test.ts — 3 passing unit tests verifying UI-07 hook contract

affects:
  - 11-02 (StatCard wires useCountUp via AnimatedNumber sub-component)
  - any future hook needing rAF animation pattern in this codebase

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rAF elapsed-time count-up loop with cubic ease-out (1 - Math.pow(1-p, 3)) + snap-to-exact final frame"
    - "prefers-reduced-motion WCAG 2.1 SC 2.3.3 short-circuit via window.matchMedia at top of useEffect"
    - "Object.defineProperty to install window.matchMedia in jsdom before vi.spyOn (jsdom has no native matchMedia)"

key-files:
  created:
    - src/hooks/useCountUp.ts
    - (tests/dashboard/useCountUp.test.ts created in 11-00; expanded here)
  modified:
    - tests/dashboard/useCountUp.test.ts

key-decisions:
  - "Object.defineProperty used to install window.matchMedia in jsdom — vi.spyOn fails with 'Received undefined' because jsdom does not define the property; defineProperty makes it writable/configurable so subsequent tests can override per-call"
  - "No vi.stubGlobal fallback for rAF needed — vitest 4.1.5 fake timers correctly stub requestAnimationFrame; vi.advanceTimersByTime(600) advances the rAF loop as documented in RESEARCH.md open question"

patterns-established:
  - "useCountUp(target, duration?, delay?) — canonical rAF hook interface for numeric animations in this codebase"
  - "mockMatchMedia(matches: boolean) helper using Object.defineProperty — reusable pattern for any future test needing window.matchMedia in jsdom"

requirements-completed:
  - UI-07

# Metrics
duration: 4min
completed: 2026-05-03
---

# Phase 11 Plan 01: useCountUp Hook Summary

**rAF-based count-up hook with cubic ease-out easing, WCAG reduced-motion short-circuit, and 3 unit tests verifying the full UI-07 contract**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-03T10:37:21Z
- **Completed:** 2026-05-03T10:40:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/hooks/useCountUp.ts` — single named export, rAF elapsed-time loop with cubic ease-out `1 - Math.pow(1 - progress, 3)`, integer-only output via `Math.round`, snap-to-exact `setValue(target)` on final frame, `prefers-reduced-motion` short-circuit, full cleanup of rAF handle + delay timeout
- Flipped 3 `it.skip` stubs in `tests/dashboard/useCountUp.test.ts` to real passing test bodies — reduced-motion test, animate-to-target test, re-trigger-on-target-change test
- Full suite grew from 214 passing / 3 skipped to 217 passing / 0 skipped; tsc stays clean

## Task Commits

1. **Task 1: Create src/hooks/useCountUp.ts** - `00c5c09` (feat)
2. **Task 2: Flip 3 it.skip to passing tests** - `028e8ca` (test)

## Files Created/Modified

- `src/hooks/useCountUp.ts` — new file, 78 LOC, single named export `useCountUp(target, duration?, delay?)`
- `tests/dashboard/useCountUp.test.ts` — expanded from 54-line stub to 90-line file with 3 passing tests

## Decisions Made

- **window.matchMedia in jsdom:** `vi.spyOn(window, "matchMedia")` fails in jsdom with "Received undefined" because jsdom does not implement `window.matchMedia`. Fix: `Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: vi.fn()... })` installs the property first; then `vi.fn().mockReturnValue(...)` controls the return value per test. The plan specified `vi.spyOn` but this root cause required the Object.defineProperty approach (Rule 1 auto-fix).
- **Fake timers + rAF:** `vi.useFakeTimers()` in vitest 4.1.5 correctly stubs `requestAnimationFrame` alongside `setTimeout`. `vi.advanceTimersByTime(600)` advances the rAF loop to completion. No `vi.stubGlobal('requestAnimationFrame', ...)` fallback needed (Pitfall 3 from RESEARCH.md — fake timers worked on first attempt).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] window.matchMedia not defined in jsdom — vi.spyOn pattern replaced with Object.defineProperty**
- **Found during:** Task 2 (test execution after writing test file)
- **Issue:** The plan specified `vi.spyOn(window, "matchMedia").mockReturnValue(...)` but jsdom does not define `window.matchMedia` at all. `vi.spyOn` checks that the property exists before wrapping it — throws "vi.spyOn() can only spy on a function. Received undefined."
- **Fix:** Extracted `mockMatchMedia(matches: boolean)` helper that uses `Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: vi.fn().mockReturnValue(...) })`. Called once per test to set the desired `matches` value.
- **Files modified:** `tests/dashboard/useCountUp.test.ts`
- **Verification:** All 3 tests pass; `vi.restoreAllMocks()` in afterEach resets the spy
- **Committed in:** `028e8ca` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — jsdom environment gap)
**Impact on plan:** jsdom's missing `matchMedia` required pattern change for mock setup only. Hook implementation unchanged. No scope creep.

## Issues Encountered

None beyond the matchMedia jsdom deviation documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `useCountUp(target, duration?, delay?)` is fully tested and ready for Plan 11-02 consumption
- Plan 11-02 wires the hook into `StatCard` via an `AnimatedNumber` sub-component (avoids conditional hook anti-pattern — Pitfall 1 from RESEARCH.md)
- No blockers.

---
*Phase: 11-dashboard-command-center*
*Completed: 2026-05-03*
