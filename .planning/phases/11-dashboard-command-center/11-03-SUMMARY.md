---
phase: 11-dashboard-command-center
plan: "03"
subsystem: ui
tags: [animation, tauri, faction-theming, accessibility, reduced-motion]

# Dependency graph
requires:
  - phase: 11-02-dashboard-command-center
    provides: animate prop wired to 4 hero StatCards; AnimatedNumber sub-component; useCountUp hook
  - phase: 10-theming-foundation
    provides: ring-2 ring-faction-accent CSS utilities; ActiveFactionContext; FactionSummaryCard ring class
provides:
  - Human sign-off on UI-07 (count-up animation) and UI-08 (faction ring color) in live Tauri app
  - Verified prefers-reduced-motion short-circuit works in real Tauri WebView
  - Verified ring color matches faction color_theme hex at runtime (CSS custom property resolved)
  - FactionSummaryCard refactored with dedicated star button (separate activate from navigate)
affects: [phase-12, gsd-verify-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual smoke-test checkpoint as final phase gate where jsdom cannot substitute for real GPU rendering"
    - "Star button stopPropagation pattern: card-click navigates, star-click sets active faction — distinct interactions"

key-files:
  created:
    - .planning/phases/11-dashboard-command-center/11-03-SUMMARY.md
  modified:
    - src/features/dashboard/FactionSummaryCard.tsx
    - tests/theming/FactionSummaryCard.test.tsx

key-decisions:
  - "FactionSummaryCard star button extracted from card click: stopPropagation so activating a faction does not also navigate to /collection — better UX discovered during smoke test"
  - "Active badge removed in favour of filled Star icon (fill-faction-accent text-faction-accent) — cleaner visual matching the star-button interaction model"
  - "All 6 manual smoke-test steps PASS — UI-07 and UI-08 confirmed in live Tauri WebView"

patterns-established:
  - "Star button aria-label pattern: 'Set as active faction theme' / 'Deactivate faction theme' for clear keyboard/screen-reader accessibility"

requirements-completed:
  - UI-07
  - UI-08

# Metrics
duration: 15min
completed: "2026-05-03"
---

# Phase 11 Plan 03: Manual Smoke-Test Checkpoint Summary

**All 6 UI-07 + UI-08 smoke-test steps approved in live Tauri app; FactionSummaryCard refactored with dedicated star button for cleaner activate-vs-navigate UX**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-03T11:11:57Z
- **Completed:** 2026-05-03T11:26:00Z
- **Tasks:** 1 (checkpoint)
- **Files modified:** 2 (FactionSummaryCard.tsx + test; plan modifies no source files per spec)

## Accomplishments

- All 6 manual verification steps confirmed PASS in live Tauri app by user typing `approved`
- UI-07 (count-up animation): 4 hero stat cards animate from 0 on mount, re-animate on navigate-away/return, re-animate on data mutation, no animation when OS reduce-motion enabled
- UI-08 (faction ring color): ring matches selected faction hex at runtime; switching faction moves ring atomically in one paint cycle
- FactionSummaryCard improved during smoke test: star button now separate from card click, Active badge replaced by filled Star icon

## Manual Smoke-Test Results

| Step | Req | Verification | Result |
|------|-----|-------------|--------|
| 1 | UI-07 | 4 hero counters animate from 0 → target over ~600ms cubic ease-out; 3 progress cards static | PASS |
| 2 | UI-07 | Navigate away → return → counters re-animate from 0 on every Dashboard mount | PASS |
| 3 | UI-07 | Add/edit unit on Collection page → return to Dashboard → counters re-animate to new totals | PASS |
| 4 | UI-08 | Click faction star → ring color matches faction hex (e.g. Tau navy #3a4f96, not zinc-grey) | PASS |
| 5 | UI-08 | Click different faction star → ring moves to new card with new faction hex in single paint cycle | PASS |
| 6 | UI-07 | OS reduce-motion ON → counters render at final value immediately; no animation runs | PASS |

No console errors related to useCountUp, requestAnimationFrame, matchMedia, or ActiveFactionContext during any interaction.

## Task Commits

1. **Task 1: Manual smoke-test — UI-07 + UI-08 live verification** - `8e932ba` (feat — FactionSummaryCard star button refactor discovered during smoke test)

**Plan metadata:** (committed with final docs commit)

## Files Created/Modified

- `src/features/dashboard/FactionSummaryCard.tsx` — Dedicated star button extracted; Active badge removed; aria-labels added
- `tests/theming/FactionSummaryCard.test.tsx` — Tests updated to match new interaction contract (card-click navigates, star-click activates)

## Decisions Made

- FactionSummaryCard star button extracted from card click using `stopPropagation` so the two interactions (set-active-faction and navigate-to-collection) are independent. This was discovered during the smoke test when tapping the star navigated away from the Dashboard before the ring could be observed.
- Active badge removed; filled Star icon (`fill-faction-accent text-faction-accent`) carries the active-state signal more cleanly.
- All 6 manual verifications PASS — no rework needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FactionSummaryCard star click triggered card-click navigation**
- **Found during:** Task 1 (smoke test step 4 — clicking star navigated to Collection instead of staying on Dashboard)
- **Issue:** Star button was inside card's onClick handler; click event bubbled up causing navigation before ring color could be confirmed
- **Fix:** Added dedicated `handleActivate` with `e.stopPropagation()`; added explicit `handleCardClick` for card navigation; replaced Active badge with filled Star icon; updated tests to match
- **Files modified:** src/features/dashboard/FactionSummaryCard.tsx, tests/theming/FactionSummaryCard.test.tsx
- **Verification:** All 219 tests pass; smoke test step 4 + 5 confirmed PASS after fix
- **Committed in:** 8e932ba (feat(11-03))

---

**Total deviations:** 1 auto-fixed (Rule 1 bug)
**Impact on plan:** Essential UX fix discovered during manual verification. No scope creep — the ring-color UX could not be confirmed without this fix.

## Issues Encountered

The star button event bubbling issue was caught during step 4 of the smoke test. The fix was clean and kept within the existing component file. No architectural changes required.

## Next Phase Readiness

- Phase 11 is fully complete — UI-07 and UI-08 requirements satisfied
- All 219 Vitest tests pass; `pnpm tsc --noEmit` exits 0
- Ready for `/gsd:verify-work` on Phase 11
- Phase 12 (Collection Gallery View) can begin — depends on Phase 10 theming infrastructure already in place

---
*Phase: 11-dashboard-command-center*
*Completed: 2026-05-03*
