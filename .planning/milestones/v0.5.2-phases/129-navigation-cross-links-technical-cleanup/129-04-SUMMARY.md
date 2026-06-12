---
phase: 129-navigation-cross-links-technical-cleanup
plan: "04"
subsystem: sidebar-navigation
tags: [sidebar, game-day, router, ux-polish]
dependency_graph:
  requires: [129-01]
  provides: [game-day-sidebar-entry, collapsed-dividers, smooth-collapse-transition]
  affects: [src/app/router.tsx, src/components/common/AppSidebar.tsx]
tech_stack:
  added: []
  patterns: [tanstack-router-index-route, conditional-collapsed-dividers]
key_files:
  created: []
  modified:
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx
decisions:
  - gameDayIndexRoute renders inline informational component (no separate page file needed)
  - Collapsed dividers use border-b border-border/40 consistent with existing border tokens
  - overflow-hidden on aside prevents text label wrapping during width CSS transition
metrics:
  duration: "8 minutes"
  completed: 2026-06-11
  tasks_completed: 1
  files_modified: 2
---

# Phase 129 Plan 04: Game Day Sidebar Entry and Collapsed Dividers Summary

## One-liner

Added Game Day to sidebar PLAY_NAV group with `/game-day` index route, collapsed-mode group dividers, and `overflow-hidden` for smooth collapse animation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Game Day to PLAY_NAV with index route, and add collapsed sidebar dividers | 2001dedd | src/app/router.tsx, src/components/common/AppSidebar.tsx |

## What Was Built

### router.tsx — gameDayIndexRoute
Added `gameDayIndexRoute` at path `/game-day` (no params) as a child of `layoutRoute`. The component renders an informational message ("Select an army list to start Game Day") with a `Link` to `/army-lists`. The existing `gameDayRoute` at `/game-day/$listId` is unchanged. Both routes are registered in the `layoutRoute.addChildren([...])` array.

### AppSidebar.tsx — Game Day entry
Added `{ to: "/game-day", label: "Game Day", icon: Sword }` to the `PLAY_NAV` array between "Battle Log" and "Rules Hub". `NavItem`'s `pathname.startsWith("/game-day")` logic means the item highlights for both `/game-day` (index) and `/game-day/123` (detail).

### AppSidebar.tsx — Collapsed dividers
Added three `{collapsed && <div className="my-1 border-b border-border/40" />}` elements between:
- Command → Workshop
- Workshop → Play
- Play → Management

Dividers are gated on `collapsed` being truthy, so they do not appear in expanded mode where group label `<p>` elements provide visual separation.

### AppSidebar.tsx — Collapse transition smoothness
Added `overflow-hidden` to the `<aside>` element's className. The existing `transition-[width] duration-200 ease-in-out` was already in place. `overflow-hidden` prevents text labels from wrapping to a new line during the width animation, eliminating the visual snap.

## Verification

- `pnpm build` (Vite portion): passed — built in 25.58s
- TypeScript (src files only): no errors; only pre-existing test errors in `tests/feedback/FBK-01-DeletePendingText.test.tsx` from a parallel wave agent
- PLAY_NAV contains Game Day with `to: "/game-day"` and `icon: Sword`: confirmed
- `gameDayIndexRoute` present in router.tsx routeTree: confirmed
- Three collapsed-only dividers with `border-b border-border/40` gated on `collapsed`: confirmed
- `<aside>` has `overflow-hidden`: confirmed

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `gameDayIndexRoute` renders a functional informational component with a working link to `/army-lists`.

## Threat Flags

None — static route with no dynamic params or trust boundaries.

## Self-Check: PASSED

- src/app/router.tsx: modified with gameDayIndexRoute — confirmed in commit 2001dedd
- src/components/common/AppSidebar.tsx: modified with Game Day entry + dividers + overflow-hidden — confirmed in commit 2001dedd
- Commit 2001dedd exists: confirmed
