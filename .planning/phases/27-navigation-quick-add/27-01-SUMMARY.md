---
phase: 27-navigation-quick-add
plan: "01"
subsystem: context
tags: [react-context, quick-add, shadcn, dropdown-menu, nav]
dependency_graph:
  requires: [27-00]
  provides: [QuickAddContext, DropdownMenu]
  affects: [src/main.tsx, src/context/QuickAddContext.tsx, src/components/ui/dropdown-menu.tsx]
tech_stack:
  added: ["@radix-ui/react-dropdown-menu (via shadcn dropdown-menu)"]
  patterns: ["createContext + Provider + useHook (mirrors ActiveFactionContext)", "useCallback for stable function references"]
key_files:
  created:
    - src/context/QuickAddContext.tsx
    - src/components/ui/dropdown-menu.tsx
  modified:
    - src/main.tsx
    - tests/navigation/QuickAddContext.test.tsx
decisions:
  - "QuickAddProvider placed at main.tsx level (same as QueryProvider) so both AppSidebar and AppLayout are descendants"
  - "useCallback wraps openQuickAdd and closeQuickAdd for stable references across re-renders"
  - "shadcn DropdownMenu installed via pnpm dlx shadcn@latest add dropdown-menu (generates Radix primitive wrapper)"
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_changed: 4
requirements: [NAV-03]
---

# Phase 27 Plan 01: QuickAddContext + DropdownMenu Summary

QuickAddProvider context with 8-action union type, useQuickAdd hook, and shadcn DropdownMenu primitive installed — foundation for Wave 2 sidebar Quick Add button.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create QuickAddContext and install DropdownMenu | 9bf6049 | src/context/QuickAddContext.tsx, src/components/ui/dropdown-menu.tsx |
| 2 | Wire QuickAddProvider into main.tsx + flip tests green | 8664605 | src/main.tsx, tests/navigation/QuickAddContext.test.tsx |

## Verification

- `pnpm build` exits 0 (TypeScript clean, Vite bundle succeeds)
- All 6 QuickAddContext NAV-03 tests pass green (were all `it.skip` in Wave 0)
- Total test suite: 480 passed | 24 skipped (NAV-01/NAV-02 remain skipped — Wave 2 stubs)

## Decisions Made

1. **Provider placement at main.tsx** — QuickAddProvider wraps RouterProvider at the same level as QueryProvider, ensuring both AppSidebar (inside AppLayout) and AppLayout itself are descendants and can call `useQuickAdd()`.
2. **useCallback for stable references** — `openQuickAdd` and `closeQuickAdd` wrapped in `useCallback` with empty dep arrays to prevent unnecessary re-renders in consumers.
3. **shadcn add via pnpm dlx** — Used `pnpm dlx shadcn@latest add dropdown-menu --yes` to generate `src/components/ui/dropdown-menu.tsx` from the Radix primitive.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/context/QuickAddContext.tsx` exists
- [x] `src/components/ui/dropdown-menu.tsx` exists
- [x] `src/main.tsx` contains `QuickAddProvider`
- [x] 6/6 QuickAddContext tests pass
- [x] `pnpm build` exits 0
- [x] Commits 9bf6049 and 8664605 present
