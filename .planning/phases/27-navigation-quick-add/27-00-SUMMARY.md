---
phase: 27-navigation-quick-add
plan: "00"
subsystem: testing
tags: [wave-0, stubs, navigation, quick-add, nyquist]
dependency_graph:
  requires: []
  provides: [NAV-01-stubs, NAV-02-stubs, NAV-03-stubs]
  affects: [27-01-PLAN, 27-02-PLAN]
tech_stack:
  added: []
  patterns: [it.skip Wave-0 stubs, vi.mock for non-existent modules, TODO Wave-1 import comments]
key_files:
  created:
    - tests/navigation/AppSidebar.nav01.test.tsx
    - tests/navigation/QuickAdd.nav02.test.tsx
    - tests/navigation/QuickAddContext.test.tsx
  modified: []
decisions:
  - "QuickAddContext.test.tsx uses inline stub types instead of direct import — module does not exist yet; mirrors Phase 18/19 Wave 0 pattern (TODO comment carries exact import path for Wave 1 activation)"
  - "NAV-01 + NAV-02 tests use vi.mock('@/context/QuickAddContext') to mock the not-yet-created module — Vite resolves mocked imports even when the real file is absent"
  - "QuickAddContext stub uses _action parameter prefix for unused parameter to satisfy TypeScript noUnusedParameters"
metrics:
  duration_seconds: 373
  completed_date: "2026-05-05"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 0
---

# Phase 27 Plan 00: Navigation & Quick Add Wave 0 Test Stubs Summary

Wave 0 Nyquist contract established: 28 `it.skip` stubs across 3 test files covering NAV-01 (sidebar group labels), NAV-02 (Quick Add button + dropdown), and NAV-03 (QuickAddContext state machine).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | NAV-01 AppSidebar group label stubs | ccbe3c0 | tests/navigation/AppSidebar.nav01.test.tsx |
| 2 | NAV-02 Quick Add button + dropdown stubs | 79eeb2e | tests/navigation/QuickAdd.nav02.test.tsx |
| 3 | NAV-03 QuickAddContext state transition stubs | c2033b6 | tests/navigation/QuickAddContext.test.tsx |

## Verification

```
pnpm test -- tests/navigation/
```

Result: 474 passed | 30 skipped (28 new + 2 pre-existing) | 0 failed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] QuickAddContext direct import fails at transform time**
- **Found during:** Task 3 verification
- **Issue:** `tests/navigation/QuickAddContext.test.tsx` imports `{ QuickAddProvider, useQuickAdd }` from `@/context/QuickAddContext` which does not exist yet. Vite's transform fails with "Could not resolve @/context/QuickAddContext" before tests run.
- **Fix:** Applied Phase 18/19 Wave 0 pattern — commented out real imports, added inline stub implementations (`const QuickAddProvider`, `const useQuickAdd`, `type QuickAddAction`), added `// TODO Wave 1: uncomment the imports below` comment block with exact import paths so Plan 27-01 knows exactly what to restore.
- **Files modified:** tests/navigation/QuickAddContext.test.tsx
- **Commit:** c2033b6

## Wave 1 Activation Instructions

Plan 27-01 activates NAV-03 stubs by:
1. Creating `src/context/QuickAddContext.tsx` exporting `QuickAddProvider`, `useQuickAdd`, `QuickAddAction`
2. In `tests/navigation/QuickAddContext.test.tsx`: replace stub declarations with the real imports from the TODO comment block
3. Flip `it.skip` → `it` for each test

Plans 27-01 and 27-02 activate NAV-01/NAV-02 stubs by:
1. Creating `src/context/QuickAddContext.tsx` (satisfies the `vi.mock` intercept)
2. Flipping `it.skip` → `it` in AppSidebar.nav01.test.tsx and QuickAdd.nav02.test.tsx

## Self-Check: PASSED

Files exist:
- tests/navigation/AppSidebar.nav01.test.tsx: FOUND
- tests/navigation/QuickAdd.nav02.test.tsx: FOUND
- tests/navigation/QuickAddContext.test.tsx: FOUND

Commits exist:
- ccbe3c0: FOUND
- 79eeb2e: FOUND
- c2033b6: FOUND
