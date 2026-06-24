---
quick_id: 260624-erb
slug: remove-dead-add-project-trigger-button-b
date: 2026-06-24
status: planned
---

# Quick Task 260624-erb: Remove dead "+ add project" trigger button below the sidebar

## Problem

The global `AddProjectPicker` rendered in `AppLayout.tsx` (as a root-level
sibling of the main flex container) always renders its own `PopoverTrigger`
button labelled "+ Add project". Because it sits outside the sidebar/main flow,
that button appears at the bottom-left of the window, below the "Settings" nav
item.

The button is **dead**: its `open` state is controlled by
`activeSheet === "create-project"` and its `onOpenChange` handler only reacts to
*closing* (`if (!o) closeQuickAdd()`). A direct click fires `onOpenChange(true)`,
which the handler ignores, so `open` never becomes true — nothing happens. The
real entry point for creating a project is the sidebar **Quick Add → "Create
Project"** item (upper-left), which sets `activeSheet="create-project"`.

So this bottom-left button is a confusing, non-functional duplicate.

## Fix

Make the global picker trigger-less while keeping the sidebar-launched flow working.

### Task 1 — Add a `hideTrigger` mode to `AddProjectPicker`
- File: `src/features/painting-projects/AddProjectPicker.tsx`
- Add optional `hideTrigger?: boolean` prop.
- When `hideTrigger` is true, render an invisible, fixed-position
  `PopoverAnchor` (centered near the top) instead of the visible
  `PopoverTrigger`/`Button`, so the controlled popover can still open with no
  dead button visible. Anchor `align` switches to `center` in that mode.
- Import `PopoverAnchor` from `@/components/ui/popover`.
- Verify: `pnpm build` (tsc) passes — no unused imports/props.

### Task 2 — Use `hideTrigger` for the global instance
- File: `src/components/common/AppLayout.tsx`
- Pass `hideTrigger` to the `<AddProjectPicker>` rendered as a global Quick Add
  sibling (the `activeSheet === "create-project"` instance).
- Verify: the dead bottom-left button no longer renders; sidebar Quick Add →
  "Create Project" still opens the unit picker (now centered).

## Non-goals
- The `AddProjectPicker` used on the Painting Projects page header keeps its
  visible "+ Add project" trigger button (no `hideTrigger`).
- No change to the unit-activation logic or `QuickAddContext`.

## Verification
- `pnpm build` (TypeScript check) passes.
- `pnpm test` for painting suite passes (KanbanBoard / AddProjectPicker tests).
