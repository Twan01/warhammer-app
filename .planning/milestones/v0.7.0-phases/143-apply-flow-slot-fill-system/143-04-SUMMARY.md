---
phase: 143
plan: 04
subsystem: ui-detail-view
tags: [apply-flow, slot-fill, effectivePaintId, recipe-detail, technique-library, edit-colours]
dependency_graph:
  requires: [143-02, 143-03]
  provides: [143-human-uat]
  affects: [SectionedTimeline, RecipeStepTimeline, RecipeDetailSheet, RecipesPage]
tech_stack:
  added: []
  patterns: [effectivePaintId resolution spine, sibling Dialog pattern (P6 safety), enabled-by-id pre-population, read-only pointer-events-none wrapper]
key_files:
  created:
    - src/features/recipes/EditColoursDialog.tsx
  modified:
    - src/features/recipes/SectionedTimeline.tsx
    - src/features/recipes/RecipeStepTimeline.tsx
    - src/features/recipes/RecipeDetailSheet.tsx
    - src/features/recipes/RecipesPage.tsx
    - tests/painting/recipeDetailSheet.test.tsx
decisions:
  - "EditColoursDialog created as sibling of SlotFillDialog (not an extension) — apply path in SlotFillDialog is untouched; edit path reuses SlotFillRow with separate pre-population + mutation logic"
  - "TechniqueSectionInfo map passed as prop into SectionedTimeline — section rendering stays centralized, no duplication between editor and detail views"
  - "onNavigateToTechniques closes the detail Sheet before switching tab (sequential UX, avoids Sheet-over-Tab visual conflict)"
  - "RecipeStepTimeline also accepts slotMap for orphan-step resolution and future non-sectioned technique use"
  - "read-only technique steps use pointer-events-none opacity-80 wrapper with title tooltip — consistent with RecipeSectionCard's locked-step pattern (opacity-60 for editor)"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-22"
  tasks_completed: 2
  files_changed: 6
---

# Phase 143 Plan 04: Apply Flow & Slot-Fill System — Detail View Resolution Summary

Closed the effectivePaintId() resolution spine for the recipe detail view: technique-owned step swatches now resolve through the slot map, the "from technique X" badge is an interactive link to the library tab, technique steps render read-only, and a new "Edit colours" dialog lets users change slot colours straight from the detail view (APPLY-05).

## What Was Built

**Task 1: effectivePaintId() in SectionedTimeline + RecipeStepTimeline (SLOT-06, Pitfall 6 closed)**
- Added `slotMap?: SlotResolutionMap` prop to `SectionedTimelineProps` (import from `@/lib/effectivePaintId`)
- `sectionAvailability` useMemo now uses `effectivePaintId(step, resolvedSlotMap)` — no direct `step.paint_id` reads drive technique step swatches
- Added `slotMap?: SlotResolutionMap` + `readOnly?: boolean` props to `RecipeStepTimelineProps`
- `RecipeStepTimeline` resolves paint via `effectivePaintId(step, resolvedSlotMap)` for every swatch node
- Both `SectionedTimeline` and `RecipeStepTimeline` fall back gracefully: plain recipes (slotMap undefined) use empty Map, effectivePaintId returns `step.paint_id` for non-technique steps (FND-04 fallback)

**Task 2: RecipeDetailSheet detail-view cross-surface features (APPLY-05)**

**EditColoursDialog (new sibling component)**
- Sibling of `SlotFillDialog` — apply path is completely untouched
- Pre-populated via `useSlotMapByInstance(instanceId)` seeded once when dialog opens
- Seeds all slots (including those not yet in the DB) to null, then overlays existing fills
- Saves via `useUpdateSlotMap().mutateAsync({ instanceId, recipeId, slotFills })`
- Success toast: "Colours updated." / Failure toast: "Failed to update colours. Please try again."
- Radix Dialog portal (P6-safe, renders at document.body level)

**SectionedTimeline new props**
- `techniqueSectionInfoMap?: Map<number, TechniqueSectionInfo>` — per-section technique metadata (techniqueId, instanceId, techniqueName)
- `onEditColours?: (info: TechniqueSectionInfo) => void` — triggers Edit colours dialog
- `onNavigateToTechniques?: () => void` — triggers badge navigation
- Technique section header: renders interactive `TechniqueSectionBadge` + "Edit colours" ghost Button
- Technique section steps: wrapped in `pointer-events-none opacity-80` div with `title` tooltip: "This step is part of a live-linked technique. Edit via 'Edit colours'."

**RecipeDetailSheet updates**
- Calls `useSlotResolutionMap(recipe?.id)` → passes `slotMap` into `SectionedTimeline`
- Calls `useInstancesForRecipe(recipe?.id)` + `useTechniques()` → builds `techniqueSectionInfoMap`
- Passes `onNavigateToTechniques` which: (1) calls `onClose()`, (2) calls parent callback to switch tab
- State for `EditColoursDialog`: `editColoursOpen` + `editColoursTarget: TechniqueSectionInfo | null`
- Mounts `EditColoursDialog` as sibling (outside `SheetContent`)
- Accepts optional `onNavigateToTechniques?` prop from parent

**RecipesPage updates**
- Passes `onNavigateToTechniques={() => setActiveTab("techniques")}` to `RecipeDetailSheet`
- Uses existing `activeTab` state (no new state, no new route)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] recipeDetailSheet.test.tsx missing mocks for new hooks**
- **Found during:** Task 2 — full test run
- **Issue:** Adding `useSlotResolutionMap`, `useInstancesForRecipe`, `useTechniques`, and `useTechniqueColourSlots` calls in `RecipeDetailSheet` caused all 32 DATA-05/STUDIO-02/etc tests to fail (hooks tried to use React Query context not present in test)
- **Fix:** Added `vi.mock` stubs for all four new hooks returning empty data — tests do not exercise technique features, so stub returns are correct
- **Files modified:** `tests/painting/recipeDetailSheet.test.tsx`
- **Commit:** 36311130

### Dialog Approach Choice

**EditColoursDialog (sibling) vs SlotFillDialog (extended)**
- Chose **sibling** approach (EditColoursDialog) rather than extending SlotFillDialog with `mode?: "apply" | "edit"`
- Rationale: The apply and edit flows have different seeding logic (apply: all-null initial state; edit: pre-populated from DB); different CTAs ("Apply technique" vs "Save colours"); different back-navigation (apply has "Back to picker"; edit has "Cancel"). Extending SlotFillDialog would require significant conditional branching that risks regressing Plan 03's apply path. A clean sibling is simpler and safer.

## Human UAT (deferred)

The following UAT steps are deferred to the phase-end checkpoint (per autonomous run protocol):

1. Run `pnpm tauri dev`.
2. Open a recipe that has an applied technique (apply one first via the editor if needed). Open its detail view.
3. Confirm the technique section shows a "from technique X" badge; click it and confirm it navigates to that technique in the Technique Library tab.
4. Back in the detail view, confirm technique-owned steps that have a filled slot show the correct paint swatch (not empty), and steps with an unfilled slot show an empty/dashed swatch — and that none of these steps are editable (read-only).
5. Click "Edit colours" on the technique section. Confirm the slot-fill dialog opens PRE-POPULATED with the current slot→paint selections.
6. Change one slot's paint and save. Confirm the toast "Colours updated." and that the detail-view swatch updates immediately to the new paint.
7. Confirm a recipe with NO technique still renders normally (no regressions).

Resume signal: Type "approved" or describe issues (e.g. swatch still empty for filled slots, badge does not navigate, Edit colours not pre-populated, steps editable, plain recipe regressed).

## Threat Flag Scan

T-143-08 (wrong instance edited): mitigated — EditColoursDialog keys off the section's specific `technique_instance_id`; `updateSlotMap` UPSERTs by `(instance_id, slot_id)`.
T-143-09 (technique step shows wrong/no paint): mitigated — effectivePaintId() resolution spine now wired in SectionedTimeline and RecipeStepTimeline (Pitfall 6 closed).

No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Known Stubs

None — all exports are fully implemented.

## Self-Check: PASSED

Files exist:
- `src/features/recipes/EditColoursDialog.tsx` — FOUND
- `src/features/recipes/SectionedTimeline.tsx` (modified) — FOUND
- `src/features/recipes/RecipeDetailSheet.tsx` (modified) — FOUND

Commits exist:
- 676ec557 — feat(143-04): wire effectivePaintId into SectionedTimeline + RecipeStepTimeline via slotMap prop
- 36311130 — feat(143-04): wire slotMap into RecipeDetailSheet + Edit colours dialog + interactive badge (APPLY-05)
