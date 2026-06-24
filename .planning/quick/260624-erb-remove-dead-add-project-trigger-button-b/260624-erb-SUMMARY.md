---
quick_id: 260624-erb
slug: remove-dead-add-project-trigger-button-b
date: 2026-06-24
status: complete
commit: 7ca8bf67
---

# Quick Task 260624-erb — Summary

## What was done

Removed the dead "+ add project" button that appeared at the bottom-left of the
window (below the "Settings" sidebar item) and did nothing when clicked.

Root cause: the global `AddProjectPicker` instance in `AppLayout.tsx` is rendered
as a root-level sibling of the main flex container. `AddProjectPicker` always
rendered its own `PopoverTrigger` button, so that button surfaced outside the
sidebar/main flow at the bottom-left. The instance is controlled
(`open={activeSheet === "create-project"}`) and its `onOpenChange` only handles
*closing*, so a direct click on the trigger could never set `open=true` —
clicking did nothing. The real entry point is the sidebar **Quick Add → "Create
Project"** item.

## Changes

- `src/features/painting-projects/AddProjectPicker.tsx`
  - Added optional `hideTrigger?: boolean` prop.
  - When `hideTrigger`, renders an invisible, fixed-position `PopoverAnchor`
    (`pointer-events-none`) instead of the visible trigger `Button`; popover
    `align` switches to `center`. Imported `PopoverAnchor`.
- `src/components/common/AppLayout.tsx`
  - Passed `hideTrigger` to the global Quick Add `AddProjectPicker`
    (`activeSheet === "create-project"`).

## Behavior after fix

- The dead bottom-left "+ add project" button no longer renders.
- Sidebar Quick Add → "Create Project" still opens the unit picker (now a
  centered popover).
- The Painting Projects page header keeps its own visible "+ Add project"
  trigger button (unchanged — no `hideTrigger`).

## Verification

- `pnpm build` (tsc + Vite) — passed, no unused import/prop errors.
- `pnpm test` — 3074 passed, 6 skipped, 38 todo, 0 failures (incl. KanbanBoard
  and AddProjectPicker suites).

## Commit

- `7ca8bf67` — fix(260624-erb): remove dead '+ add project' button below sidebar
