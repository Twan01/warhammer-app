---
phase: 31-focus-projects-panels
plan: "01"
subsystem: dashboard
tags: [photo-thumbnails, current-focus-card, unit-thumbnail, dashboard-wiring]
dependency_graph:
  requires: [31-00]
  provides: [UnitThumbnail, CurrentFocusCard-v2, photo-wiring]
  affects: [DashboardPage, ActiveProjectsPanel-plan-02]
tech_stack:
  added: []
  patterns: [shared-thumbnail-component, callback-prop-pattern, sibling-portal-contract]
key_files:
  created:
    - src/components/common/UnitThumbnail.tsx
  modified:
    - src/features/dashboard/CurrentFocusCard.tsx
    - src/features/dashboard/DashboardPage.tsx
    - tests/dashboard/DashboardPage.test.tsx
    - tests/dashboard/DashboardPageDS08.test.tsx
decisions:
  - UnitThumbnail uses Swords icon (not text initials) and full background color (not borderTop) per locked CONTEXT.md decisions
  - StatusBadge and getNextActionHint removed from CurrentFocusCard v2 — progress bar + percentage conveys status more compactly alongside metadata
  - useLatestUnitPhotos called once in DashboardPage, passed as photo prop to CurrentFocusCard (not called inside child component per Pitfall 2)
  - logDefaultUnitId reset to undefined in LogSessionSheet onClose to prevent stale pre-selection (Pitfall 3)
  - Header Log Session button resets logDefaultUnitId to undefined (no pre-selection for generic log)
metrics:
  duration: ~14 minutes
  completed: "2026-05-06T08:19:21Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
---

# Phase 31 Plan 01: UnitThumbnail + CurrentFocusCard v2 Summary

**One-liner:** Shared UnitThumbnail component (sm/md sizes, Swords fallback) + CurrentFocusCard rewritten as hero card with 80px photo, structured metadata, and ghost Open/Log action buttons wired through DashboardPage callbacks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create UnitThumbnail shared component | 95ff972 | src/components/common/UnitThumbnail.tsx |
| 2 | Upgrade CurrentFocusCard v2 + wire DashboardPage | dc7a53a | CurrentFocusCard.tsx, DashboardPage.tsx, 2 test files |

## What Was Built

### UnitThumbnail (Task 1)
- `src/components/common/UnitThumbnail.tsx` — shared photo-or-fallback component
- SIZE_MAP with `sm` (44px, icon 16) and `md` (80px, icon 24) variants
- Photo path: `<img>` with lazy loading and `onError` → `imgFailed` state
- Fallback: faction-colored `<div>` with Swords icon at `text-white/80`
- No text initials, no borderTop — per locked CONTEXT.md decisions

### CurrentFocusCard v2 (Task 2 Part A)
- New props: `photo: UnitPhotoWithUrl | undefined`, `onOpen: () => void`, `onLog: () => void`
- Left-side `UnitThumbnail size="md"` (80px) thumbnail
- Metadata column: "Current Focus" label, unit name, faction name, model count + points (null-safe with "---"), painting_percentage progress bar
- Two ghost buttons: Open (ExternalLink icon) and Log (Paintbrush icon)
- Removed: `StatusBadge`, `getNextActionHint` imports
- Empty state preserved identically

### DashboardPage wiring (Task 2 Part B)
- `useLatestUnitPhotos()` hook call added (called once, not inside child)
- `logDefaultUnitId` state (`number | undefined`) for pre-selecting unit in LogSessionSheet
- CurrentFocusCard receives `photo`, `onOpen`, `onLog` callbacks
- LogSessionSheet receives `defaultUnitId={logDefaultUnitId}` + reset-on-close
- Header "Log Session" button resets `logDefaultUnitId` to `undefined`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing mock] Added useLatestUnitPhotos mock to DashboardPage test files**
- **Found during:** Task 2 verification
- **Issue:** DashboardPage now calls `useLatestUnitPhotos` which internally calls `appDataDir()` (Tauri bridge). In jsdom test environment this caused 11 `TypeError: Cannot read properties of undefined (reading 'invoke')` errors across DashboardPage.test.tsx and DashboardPageDS08.test.tsx.
- **Fix:** Added `vi.mock("@/hooks/useUnitPhotos", ...)` returning `{ data: new Map() }` to both test files.
- **Files modified:** tests/dashboard/DashboardPage.test.tsx, tests/dashboard/DashboardPageDS08.test.tsx
- **Commit:** dc7a53a (included in Task 2 commit)

## Verification

- `pnpm build` passes — no TypeScript errors
- All 684 tests pass, 0 failures (35 todo, 2 skipped — pre-existing)
- UnitThumbnail.tsx exists with sm/md SIZE_MAP, Swords fallback, no text initials
- CurrentFocusCard exports `CurrentFocusCardProps` with photo, onOpen, onLog
- DashboardPage calls `useLatestUnitPhotos` once, passes data to CurrentFocusCard
- LogSessionSheet receives `defaultUnitId` from DashboardPage state with proper reset

## Self-Check: PASSED
