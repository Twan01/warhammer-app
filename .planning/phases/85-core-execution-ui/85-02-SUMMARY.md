---
phase: 85-core-execution-ui
plan: "02"
subsystem: painting-mode
tags: [section-navigator, collapsible, progress-badges, step-navigation]
dependency_graph:
  requires: [usePaintingModeState, RecipeSection, RecipeStep, Collapsible, Badge]
  provides: [SectionNavigator]
  affects: [PaintingModeView]
tech_stack:
  added: []
  patterns: [collapsible-sections, section-progress-map, virtual-general-section]
key_files:
  created:
    - src/features/painting-mode/SectionNavigator.tsx
    - tests/painting-mode/SectionNavigator.test.tsx
  modified: []
decisions:
  - "Used GENERAL_SECTION_ID = -1 sentinel for unsectioned steps (D-10)"
  - "Collapsible defaultOpen driven by whether section contains currentStepId"
  - "ChevronDown icon added to section triggers for expand/collapse affordance"
metrics:
  duration: "7m"
  completed: "2026-05-19"
---

# Phase 85 Plan 02: SectionNavigator Summary

Left-panel section navigator with collapsible sections, progress badges, current-section highlighting, optional badges, and clickable step sub-items with completion indicators.

## What Was Built

### SectionNavigator Component
- Persistent 280px left sidebar with `bg-card` background and border-right
- Steps grouped by `section_id` using `useMemo`; null section_id mapped to virtual "General" section (sentinel ID -1)
- Sections rendered as Collapsible components, defaultOpen when containing the current step
- Section headers show name + progress badge (completed/total from sectionProgressMap)
- Current section highlighted with `border-l-3 border-primary bg-accent/50`
- Optional sections display "Optional" Badge (outline variant)
- Step sub-items show three states: completed (green Check icon + line-through), current (filled primary dot + semibold), pending (hollow muted dot)
- All step items are clickable, calling `goToStep(step.id)` for random-access navigation

### Test Coverage
6 tests covering all SP-01 through SP-04 requirements plus D-10:
1. Section name and progress count badge rendering (SP-01)
2. Current section highlighting with correct CSS classes (SP-02)
3. goToStep callback invoked with correct step ID on click (SP-03)
4. Optional badge rendered for optional sections (SP-04)
5. Unsectioned steps grouped under "General" virtual section (D-10)
6. Completed steps show green check indicator with line-through text

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 27168c7 | feat(85-02): create SectionNavigator component |
| 2 | 5dd3894 | test(85-02): add SectionNavigator tests (6 cases) |
| 2-fix | 9a74d68 | fix(85-02): remove unused variable in test |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused variable in test file**
- **Found during:** Task 2 verification (pnpm build)
- **Issue:** `const { container }` destructuring was unused in the "shows check indicator" test, causing `noUnusedLocals` TS error
- **Fix:** Changed to plain `renderNavigator()` call without destructuring
- **Files modified:** tests/painting-mode/SectionNavigator.test.tsx
- **Commit:** 9a74d68

## Verification

- pnpm build: PASS (no TypeScript errors)
- pnpm test -- tests/painting-mode/SectionNavigator.test.tsx: 6/6 PASS

## Self-Check: PASSED
