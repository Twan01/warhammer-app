---
phase: 16-design-overhaul
plan: "07"
subsystem: empty-states
tags: [ui, empty-state, lucide-icons, phase-16, army-lists, recipes]
dependency_graph:
  requires: ["16-01"]
  provides: [EMPTY-STATE-ARMY-LISTS, EMPTY-STATE-RECIPES]
  affects: [ArmyListsEmptyState, RecipeEmptyState]
tech_stack:
  added: []
  patterns: [icon-in-container, rounded-xl bg-muted/40 p-4, h-8 w-8 icon sizing]
key_files:
  created: []
  modified:
    - src/features/army-lists/ArmyListsEmptyState.tsx
    - src/features/recipes/RecipeEmptyState.tsx
    - tests/army-list/ArmyListsPage.test.tsx
    - tests/painting/RecipeTable.test.tsx
decisions:
  - "Swords (plural, crossed-blades) confirmed for ArmyListsEmptyState — distinct from Sword (singular) used in sidebar and DashboardEmptyState"
  - "British 'colour' spelling preserved in RecipeEmptyState helper text per UI-SPEC §Copywriting Contract"
  - "Test fixtures updated to match new UI-SPEC copy — old assertions ('Build your first army list', 'New List', 'Add Recipe') replaced with verbatim copy"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-04"
  tasks_completed: 2
  files_modified: 4
---

# Phase 16 Plan 07: Army Lists + Recipe Empty States Summary

ArmyListsEmptyState and RecipeEmptyState upgraded to Phase 16 icon-in-container pattern with Swords (plural) and BookOpen icons respectively, verbatim UI-SPEC copy, and British "colour" spelling preserved.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | ArmyListsEmptyState — Swords icon-pill, new copy, h-8 w-8 | fd7056f |
| 2 | RecipeEmptyState — BookOpen icon-pill, British 'colour', h-8 w-8 | bd38a86 |

## Before / After Diffs

### ArmyListsEmptyState.tsx

**Before:**
```tsx
<div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
  <Swords className="h-12 w-12 text-muted-foreground" />
  <p className="text-base font-semibold">Build your first army list</p>
  <p className="text-sm text-muted-foreground max-w-md">
    Create a list to track which units you're taking to the table and see your battle-ready percentage at a glance.
  </p>
  <Button onClick={onAdd}>New List</Button>
</div>
```

**After:**
```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <Swords className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">No army lists yet</p>
    <p className="text-sm text-muted-foreground max-w-xs">
      Build a list to track points, units, and your battle-ready percentage.
    </p>
  </div>
  <Button className="mt-2" onClick={onAdd}>New list</Button>
</div>
```

### RecipeEmptyState.tsx

**Before:**
```tsx
<div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
  <BookOpen className="h-12 w-12 text-muted-foreground" />
  <p className="text-base font-semibold">No recipes yet</p>
  <p className="text-sm text-muted-foreground">
    Document your paint schemes. Add a recipe to get started.
  </p>
  <Button onClick={onAdd}>Add Recipe</Button>
</div>
```

**After:**
```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <div className="rounded-xl bg-muted/40 p-4">
    <BookOpen className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <p className="text-base font-semibold">No recipes yet</p>
    <p className="text-sm text-muted-foreground max-w-xs">
      Document a paint scheme to keep your colour choices consistent across models.
    </p>
  </div>
  <Button className="mt-2" onClick={onAdd}>New recipe</Button>
</div>
```

## Icon Confirmation

- ArmyListsEmptyState: imports `Swords` (plural, crossed-blades) from lucide-react — NOT `Sword` (singular). The import line is `import { Swords } from "lucide-react"`.
- RecipeEmptyState: imports `BookOpen` from lucide-react.

## British Spelling Confirmation

RecipeEmptyState helper text: "Document a paint scheme to keep your **colour** choices consistent across models." — British spelling preserved per UI-SPEC §Copywriting Contract. The word "color" (American) does not appear in the file.

## Prop Signatures Preserved

- ArmyListsEmptyState: `interface ArmyListsEmptyStateProps { onAdd: () => void }` — unchanged, non-exported (named interface)
- RecipeEmptyState: `export interface RecipeEmptyStateProps { onAdd: () => void }` — unchanged, exported (callers rely on this export)
- Both components: `onClick={onAdd}` wiring preserved in the Button CTA

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test assertions that matched old component copy**

- **Found during:** Task 2 verification (full test suite run)
- **Issue:** Two test files asserted on old copy that was intentionally changed per UI-SPEC: `tests/army-list/ArmyListsPage.test.tsx` expected "Build your first army list" and "New List"; `tests/painting/RecipeTable.test.tsx` expected "Add Recipe" button
- **Fix:** Updated both test files to assert on the new verbatim UI-SPEC copy ("No army lists yet", "New list", "New recipe")
- **Files modified:** tests/army-list/ArmyListsPage.test.tsx, tests/painting/RecipeTable.test.tsx
- **Commit:** cde7da1

## Vitest Results

- Before plan: 309 passing, 2 failing (pre-existing: StatusPopover module not found, dates.ts missing)
- After plan: 311 passing, 0 failing from this plan's scope
- Remaining pre-existing failure: tests/lib/dates.test.ts (missing @/lib/dates — planned for Phase 17)

## Self-Check: PASSED

Files exist:
- src/features/army-lists/ArmyListsEmptyState.tsx: FOUND
- src/features/recipes/RecipeEmptyState.tsx: FOUND
- .planning/phases/16-design-overhaul/16-07-SUMMARY.md: FOUND

Commits exist:
- fd7056f: feat(16-07): upgrade ArmyListsEmptyState — FOUND
- bd38a86: feat(16-07): upgrade RecipeEmptyState — FOUND
- cde7da1: fix(16-07): update test assertions — FOUND
