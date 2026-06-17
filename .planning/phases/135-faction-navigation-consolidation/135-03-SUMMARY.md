---
phase: 135-faction-navigation-consolidation
plan: 03
subsystem: ui
tags: [sidebar, navigation, lucide-react, tailwind]

# Dependency graph
requires:
  - phase: 135-02
    provides: MANAGEMENT_NAV with Spending + Wishlist + Data Health (3 entries)
provides:
  - MANAGEMENT_NAV with exactly Spending + Wishlist (Data Health removed)
  - HeartPulse import dropped; Shield/Wallet/Heart retained
  - /data-health route and Settings -> Data "Open Data Health" card kept (D-09)
affects: [navigation, sidebar-contract]

# Tech tracking
tech-stack:
  added: []
  patterns: [D-09 minimal demotion — remove sidebar entry only, keep route + settings card as alternative entry point]

key-files:
  created: []
  modified:
    - src/components/common/AppSidebar.tsx

key-decisions:
  - "D-09: minimal demotion — Data Health removed from sidebar MANAGEMENT_NAV only; /data-health route and Settings -> Data card retained as the <= 2-click entry point"

patterns-established:
  - "Demotion pattern: remove sidebar entry, keep route + settings card, never delete the page"

requirements-completed: [HON-07]

# Metrics
duration: 5min
completed: 2026-06-17
---

# Phase 135 Plan 03: Faction Navigation Consolidation — Data Health Demotion Summary

**Data Health removed from sidebar MANAGEMENT_NAV (leaving Spending + Wishlist); HeartPulse import dropped; /data-health route and Settings -> Data card kept as the new entry point**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-17T10:30:00Z
- **Completed:** 2026-06-17T10:35:00Z
- **Tasks:** 1 auto task complete; 1 checkpoint pending human verification
- **Files modified:** 1

## Accomplishments
- Removed `{ to: "/data-health", label: "Data Health", icon: HeartPulse }` from `MANAGEMENT_NAV`
- MANAGEMENT_NAV now contains exactly Spending + Wishlist
- Dropped `HeartPulse` import (noUnusedLocals compliance — build stays clean)
- Shield, Wallet, Heart imports retained (all still in use)
- /data-health route in router.tsx untouched (2 references confirmed)
- Settings -> Data "Open Data Health" card in DataManagementTab.tsx untouched

## Task Commits

1. **Task 1: Remove Data Health from sidebar and drop HeartPulse import** - `d30e05d8` (feat)

## Files Created/Modified
- `src/components/common/AppSidebar.tsx` — Data Health entry and HeartPulse import removed; MANAGEMENT_NAV now has 2 items

## Decisions Made
- D-09: minimal demotion approach — remove sidebar entry only, do not touch the route or the Settings -> Data card. The settings card satisfies HON-07 as the <= 2-click entry point.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 135 fully complete after human-verify checkpoint passes
- Data Health is reachable via Settings -> Data -> "Open Data Health" (<= 2 clicks)
- Build is clean

## Self-Check: PASSED

- `src/components/common/AppSidebar.tsx` modified: confirmed (2 deletions)
- Commit `d30e05d8` exists: confirmed
- `Data Health` count in AppSidebar.tsx: 0
- `HeartPulse` count in AppSidebar.tsx: 0
- `Shield` count in AppSidebar.tsx: 2
- `dataHealthRoute` count in router.tsx: 2
- `pnpm build`: clean (exit 0)

---
*Phase: 135-faction-navigation-consolidation*
*Completed: 2026-06-17*
