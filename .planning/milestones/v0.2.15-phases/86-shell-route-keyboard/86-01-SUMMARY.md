---
phase: 86-shell-route-keyboard
plan: 01
subsystem: painting-mode
tags: [route, keyboard-shortcuts, layout, react-hotkeys-hook]
dependency_graph:
  requires: [84-01, 85-01, 85-02, 85-03]
  provides: [painting-mode-route, keyboard-shortcuts, bare-layout-route]
  affects: [router, painting-mode-view]
tech_stack:
  added: [react-hotkeys-hook@5.3.2]
  patterns: [layout-route-nesting, lifted-state-props, bare-layout]
requirements-completed: [PX-02, PX-03, PX-04, PX-05]
key_files:
  created:
    - src/app/painting-mode/page.tsx
  modified:
    - src/app/router.tsx
    - src/hooks/useRecipeAssignments.ts
    - src/features/painting-mode/PaintingModeView.tsx
    - src/app/game-day/page.tsx
    - tests/painting-mode/PaintingModeView.test.tsx
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Layout route nesting with id-based routes (layoutRoute + bareLayoutRoute) for sidebar/no-sidebar split"
  - "PaintingModeView refactored to accept lifted state props, removing internal usePaintingModeState/useCompleteStep calls"
  - "Safe exit via navigate({ to: '/' }) instead of history.back() to prevent exiting the app"
  - "isMutating prop accepted but unused (prefixed _isMutating) for future disable-on-pending support"
metrics:
  duration: "8 minutes"
  completed: "2026-05-19T15:02:00Z"
---

# Phase 86 Plan 01: Shell, Route & Keyboard Shortcuts Summary

Full-page painting mode route at /painting-mode/$assignmentId with react-hotkeys-hook keyboard shortcuts (Space/Arrow/Escape) and layout route nesting eliminating the sidebar

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add useRecipeAssignment hook + install react-hotkeys-hook | 3defe26 | useRecipeAssignments.ts, package.json, pnpm-lock.yaml |
| 2 | Router layout route nesting + PaintingModePage with keyboard shortcuts | c4f26dc | router.tsx, page.tsx, PaintingModeView.tsx, game-day/page.tsx, test |

## What Was Built

1. **react-hotkeys-hook v5.3.2** installed for declarative keyboard shortcut binding
2. **useRecipeAssignment hook** added with ASSIGNMENT_KEY cache key for single assignment lookup by ID
3. **Router restructured** with three-level nesting:
   - `rootRoute` -- thin shell (Outlet + devtools only)
   - `layoutRoute` (id: 'layout') -- AppLayout + ActiveFactionProvider + Outlet (all 15 existing routes)
   - `bareLayoutRoute` (id: 'bare-layout') -- ActiveFactionProvider + TooltipProvider + Toaster (no sidebar)
4. **PaintingModePage** created at `/painting-mode/$assignmentId` under bareLayoutRoute:
   - Loads assignment via useRecipeAssignment, validates numeric param
   - Single usePaintingModeState + useCompleteStep instance (lifted state pattern)
   - Four useHotkeys registrations: Space (mark done), ArrowLeft (prev), ArrowRight (next), Escape (exit)
   - Shortcuts guarded with `enabled = !!assignment && !state.isLoading`
   - enableOnFormTags defaults to false (PX-05: shortcuts silent in text inputs)
5. **PaintingModeView refactored** to accept lifted state props instead of calling hooks internally, eliminating dual-state divergence risk

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TanStack Router layout route ID prefixing**
- **Found during:** Task 2
- **Issue:** Layout routes with `id` property cause TanStack Router to prefix `from` parameters in useParams with the layout ID (e.g., `/layout/game-day/$listId` instead of `/game-day/$listId`)
- **Fix:** Updated `from` parameter in game-day/page.tsx and painting-mode/page.tsx to include layout route ID prefix
- **Files modified:** src/app/game-day/page.tsx, src/app/painting-mode/page.tsx

**2. [Rule 3 - Blocking] Updated PaintingModeView test for new prop API**
- **Found during:** Task 2
- **Issue:** Test file passed old props (assignmentId, recipeId, unitId) which no longer exist on PaintingModeViewProps
- **Fix:** Refactored test to pass state/onMarkDone/recipeId/isMutating props and removed mock hook setup for hooks no longer called by the component
- **Files modified:** tests/painting-mode/PaintingModeView.test.tsx

## Verification

- `pnpm build` exits 0 (zero TypeScript errors)
- `pnpm test` -- 210 test files passed, 1891 tests passed, 0 failures
