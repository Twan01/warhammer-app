---
phase: 145-integration-pass
plan: "04"
subsystem: painting-mode
tags: [slot-reassign, painting-mode, inline-dialog, intg-07]
dependency_graph:
  requires: [145-01, 145-02]
  provides: [INTG-07-slot-reassign-mini-dialog]
  affects: [painting-mode, slot-resolution]
tech_stack:
  added: []
  patterns:
    - Single-slot variant of EditColoursDialog (max-w-xs, no ScrollArea)
    - Sibling mount outside inner flex tree (P6 portal-clipping avoidance)
    - useStepSlotIdMap + useInstancesForRecipe resolution in PaintingModeView
key_files:
  created:
    - src/features/painting-mode/SlotReassignMiniDialog.tsx
    - tests/painting-mode/SlotReassignMiniDialog.test.tsx
  modified:
    - src/features/painting-mode/PaintingModeView.tsx
decisions:
  - "SlotReassignMiniDialog mounted as sibling outside the inner PaintingModeView flex container — avoids Radix portal clipping (P6)"
  - "techniqueId resolved via useInstancesForRecipe map (instanceId → techniqueId) at component level"
  - "seeding useEffect mirrors EditColoursDialog pattern adapted for single-slot target"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-22"
  tasks_completed: 3
  files_changed: 3
---

# Phase 145 Plan 04: SlotReassignMiniDialog Integration (INTG-07) Summary

Single-slot inline paint reassignment in Painting Mode: tapping a technique step's swatch opens a focused mini-dialog to reassign that slot's paint without leaving the mode.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | SlotReassignMiniDialog — single-slot focused component | bb7be4c4 | src/features/painting-mode/SlotReassignMiniDialog.tsx |
| 2 | PaintingModeView — swatch-tap resolves target + mounts mini-dialog | a149a178 | src/features/painting-mode/PaintingModeView.tsx |
| 3 | INTG-07 SlotReassignMiniDialog component test | 075740cf | tests/painting-mode/SlotReassignMiniDialog.test.tsx |

## What Was Built

**SlotReassignMiniDialog** (`src/features/painting-mode/SlotReassignMiniDialog.tsx`):
- Single-slot variant of EditColoursDialog; props: `{ open, instanceId, slotId, techniqueId, recipeId, onClose }`
- Loads slot list via `useTechniqueColourSlots(techniqueId)`, picks the one matching `slotId`
- Pre-fills current paint via `useSlotMapByInstance(instanceId)` with seeding useEffect
- Saves via `updateSlotMap.mutateAsync({ instanceId, recipeId, slotFills: new Map([[slotId, slotFill]]) })`
- `toast.success("Slot updated.")` on success, `toast.error("Failed to update slot. Please try again.")` on error
- `sm:max-w-xs`, no ScrollArea, `showCloseButton={false}`, mandatory DialogDescription
- Footer: "Close" (outline) left, "Reassign paint" (default/accent) right with Loader2 spinner

**PaintingModeView wiring** (`src/features/painting-mode/PaintingModeView.tsx`):
- Added `useStepSlotIdMap(recipeId)` and `useInstancesForRecipe(recipeId)` hook calls
- Added `instanceTechniqueId = useMemo(...)` map from instanceId → techniqueId
- Added `handleReassignSlot()`: resolves `slotId` via `stepSlotIdMap.get(currentStep.id)`, `instanceId` from `section.technique_instance_id`, `techniqueId` from instanceTechniqueId map
- Passes `onReassignSlot={handleReassignSlot}` to StepFocalView
- Mounts `<SlotReassignMiniDialog>` as a sibling after the main flex container (outside overflow tree — P6 safety)

**Test** (`tests/painting-mode/SlotReassignMiniDialog.test.tsx`):
- 3 tests: title render, description render, mutateAsync called with correct single-slot Map + onClose + toast

## Verification

- `pnpm build`: clean (no TypeScript errors)
- `pnpm test`: 340 files, 3054 tests passing (3 new from this plan)
- SlotReassignMiniDialog: all acceptance criteria confirmed via grep

## Deviations from Plan

**[Rule 1 - Bug] Fixed mockPaint fixture in test**
- Found during: Task 3
- Issue: Initial mockPaint used `price_pence`/`location` fields that don't exist on the `Paint` type; actual fields are `running_low`, `wishlist`, `purchase_price_pence`, `purchase_date`
- Fix: Updated test fixture to match actual Paint interface
- Files modified: tests/painting-mode/SlotReassignMiniDialog.test.tsx
- Commit: 075740cf (amended before push)

## Known Stubs

None.

## Threat Flags

None — all three STRIDE threats from the plan's threat model mitigated:
- T-145-10 (wrong slot): slotId derived from `stepSlotIdMap.get(currentStep.id)`, instanceId from `section.technique_instance_id`
- T-145-11 (stale swatch): `updateSlotMap` invalidates SLOT_RESOLUTION_MAP_KEY + UNFILLED_SLOT_COUNT_KEY on success
- T-145-12 (clipped dialog): rendered as sibling outside inner PaintingModeView tree

## Self-Check

Files created:
- `src/features/painting-mode/SlotReassignMiniDialog.tsx` — exists
- `tests/painting-mode/SlotReassignMiniDialog.test.tsx` — exists

Commits:
- bb7be4c4 — feat(145-04): add SlotReassignMiniDialog single-slot reassign component
- a149a178 — feat(145-04): wire PaintingModeView swatch-tap to SlotReassignMiniDialog
- 075740cf — test(145-04): INTG-07 SlotReassignMiniDialog component test
