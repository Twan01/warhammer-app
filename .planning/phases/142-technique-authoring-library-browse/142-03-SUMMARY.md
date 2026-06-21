---
phase: 142-technique-authoring-library-browse
plan: "03"
subsystem: technique-library
tags: [authoring-ui, form-sheet, dnd-kit, slot-picker, wave-3]
dependency_graph:
  requires: [142-02]
  provides: [TechniqueFormSheet, TechniqueSlotRow, TechniqueStepRow, TechniqueSectionCard, TechniqueSectionList, TechniqueStepList]
  affects: [142-04]
tech_stack:
  added: []
  patterns: [recipe-analog, dnd-kit-sortable, slot-localId-resolution, removeSlot-null-propagation]
key_files:
  created:
    - src/features/techniques/TechniqueSlotRow.tsx
    - src/features/techniques/TechniqueStepRow.tsx
    - src/features/techniques/TechniqueStepList.tsx
    - src/features/techniques/TechniqueSectionCard.tsx
    - src/features/techniques/TechniqueSectionList.tsx
    - src/features/techniques/TechniqueFormSheet.tsx
  modified:
    - src/features/techniques/techniqueSection.ts
decisions:
  - "TechniqueSectionCard always renders notes Input (no conditional — technique sections are simpler than recipe sections)"
  - "buildDefaults maps description/estimated_minutes/result_photo_path to null since Technique DB row has no such columns — form-level-only fields silently discarded by saveTechniqueGraph SQL"
  - "Slot DndContext lives inside the form's <form> element but is separate from TechniqueSectionList's DndContext — nested DndContexts are intentional per dnd-kit docs (avoid crossing boundaries)"
  - "makeDraftTechniqueStep added to techniqueSection.ts (not a separate lib file) — collocated with makeDraftTechniqueSection for consistency"
metrics:
  duration: "~30 minutes"
  completed_date: "2026-06-21"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 1
requirements: [TECH-01, TECH-02, SLOT-01, SLOT-02]
---

# Phase 142 Plan 03: Technique Authoring Form Summary

Six new UI components implementing the technique authoring Sheet: TechniqueSlotRow (sortable drag-row), TechniqueStepRow (slot picker replacing PaintCombobox), TechniqueStepList, TechniqueSectionCard (no workflow block), TechniqueSectionList, and TechniqueFormSheet (full metadata + colour slots + sections/steps editor with non-destructive save via plan-02 hooks).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TechniqueSlotRow + TechniqueStepRow (slot picker) | 8e01db50 | src/features/techniques/TechniqueSlotRow.tsx, src/features/techniques/TechniqueStepRow.tsx |
| 2 | TechniqueStepList + TechniqueSectionCard + TechniqueSectionList | ed65401f | src/features/techniques/TechniqueStepList.tsx, src/features/techniques/TechniqueSectionCard.tsx, src/features/techniques/TechniqueSectionList.tsx, src/features/techniques/techniqueSection.ts |
| 3 | TechniqueFormSheet (metadata + slots + save) | 31b0e85f | src/features/techniques/TechniqueFormSheet.tsx |

## What Was Built

**`TechniqueSlotRow.tsx`** — Sortable drag row for one DraftTechniqueSlot:
- `useSortable({ id: slot.localId })` with `opacity: isDragging ? 0.4 : 1`
- Container `flex gap-2 rounded-md border p-2`
- GripVertical drag handle (aria-label="Drag to reorder slot")
- Two Inputs: name (flex-1, maxLength 80) + role_hint (flex-1 text-xs, maxLength 120) inside `flex flex-1 flex-col gap-1.5`
- Trash2 remove button (ghost, text-destructive, aria-label="Remove slot")
- gap-1.5 is the declared spacing exception per UI-SPEC

**`TechniqueStepRow.tsx`** — 3-line sortable step row adapted from RecipeStepRow:
- Line 1: painting_phase Select + step_name Input + slot picker Select (w-40, `value={step.colour_slot_id ?? "__none__"}`)
- Slot picker maps slots by `s.localId`, "__none__" = "-- no slot --", no photo button
- Line 2: `grid-cols-5 gap-1.5` with tool/technique/dilution/time; 5th cell is empty `<div />`
- Line 3: notes Input verbatim
- NO PaintCombobox, NO ImageIcon, NO step_photo_path, NO alt_paint_id

**`TechniqueStepList.tsx`** — DndContext + SortableContext over steps, passes `slots: DraftTechniqueSlot[]` to each TechniqueStepRow, "Add Step" button, no `onCreateNewPaint` prop.

**`TechniqueSectionCard.tsx`** — Sortable collapsible section card:
- Adapted from RecipeSectionCard
- Header: drag handle, name Input, surface Select, optional checkbox, collapse chevron, delete button
- CollapsibleContent: notes Input + TechniqueStepList (slots passed down)
- REMOVED: section_type, technique, execution_mode, applies_to fields; workflow Collapsible block entirely eliminated

**`TechniqueSectionList.tsx`** — DndContext + SortableContext over sections, slots prop threaded to each TechniqueSectionCard, no `onCreateNewPaint`.

**`TechniqueFormSheet.tsx`** — Full create/edit form Sheet:
- Props: `open`, `technique: Technique | null`, `onClose`
- `key={technique?.id ?? "new"}` on SheetContent for forced re-mount
- Metadata fields: name (autoFocus), description (textarea), effect (Select/RECIPE_EFFECTS), difficulty (Select/RECIPE_DIFFICULTIES), estimated_minutes (number), result_photo_path (upload button), notes (textarea)
- Colour Slots section: `DndContext`+`SortableContext` over slots (SEPARATE from section list DndContext), TechniqueSlotRow per slot, "Add Slot" outline button
- CRITICAL `removeSlot(localId)` handler: drops slot AND nulls `colour_slot_id` on every step referencing that localId (Pitfall 2 / STRIDE T-142-07 guard)
- `useEffect` keyed on `technique?.id + existingSlotsLen + existingSectionsLen + existingStepsLen` rebuilds slots (via `buildDraftTechniqueSlots`) and sections (via `buildDraftTechniqueSections`) in edit mode
- `onSubmit`: validates name (Zod), ≥1 step, all-steps-named — exact copy-contract toasts; recomputes order_index from array positions; routes through `useCreateTechnique` or `useUpdateTechnique` with existing data for non-destructive diff
- Footer: "Close" (outline) + "Add Technique"/"Save Technique" (primary, disabled while submitting)

**`techniqueSection.ts` (modified)** — Added `makeDraftTechniqueStep()` factory (fresh UUID localId, all nulls, no paint_id/alt_paint_id/step_photo_path).

## Verification

- `pnpm exec tsc --noEmit` — 0 new errors in any technique component; pre-existing errors in `technique-progress-identity.test.ts` (unused variable) and `applyTechniqueFilters.test.ts` (RED stub) unchanged
- `pnpm test` — 324 test files passed; only `applyTechniqueFilters.test.ts` failed (pre-existing RED stub, plan 04 concern)
- All acceptance criteria met: slot picker uses `colour_slot_id ?? "__none__"`, no PaintCombobox/photo imports in TechniqueStepRow, removeSlot clears step references, separate DndContexts for slots vs sections

## Deviations from Plan

None — plan executed exactly as written. The six components mirror their RecipeFormSheet/RecipeSectionList/RecipeStepRow analogs with the slot-picker substitution and workflow-block removal applied faithfully.

## Known Stubs

None — all form interactions wire to live data (useTechniqueColourSlots, useTechniqueSections, useTechniqueSteps from plan-02 hooks). The `description`, `estimated_minutes`, and `result_photo_path` fields are present in the form UI but not stored in the DB row (Technique table doesn't have those columns in migration 051) — this is intentional per the schema design, not a stub. saveTechniqueGraph silently drops them.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns. STRIDE T-142-06 (slot name/role-hint length) mitigated via maxLength 80/120 on Inputs. STRIDE T-142-07 (stale step→slot reference on slot removal) mitigated via `removeSlot` handler.

## Self-Check: PASSED

Files exist:
- src/features/techniques/TechniqueSlotRow.tsx — FOUND
- src/features/techniques/TechniqueStepRow.tsx — FOUND
- src/features/techniques/TechniqueStepList.tsx — FOUND
- src/features/techniques/TechniqueSectionCard.tsx — FOUND
- src/features/techniques/TechniqueSectionList.tsx — FOUND
- src/features/techniques/TechniqueFormSheet.tsx — FOUND

Commits exist:
- 8e01db50 — feat(142-03): TechniqueSlotRow + TechniqueStepRow with slot picker
- ed65401f — feat(142-03): TechniqueStepList + TechniqueSectionCard + TechniqueSectionList
- 31b0e85f — feat(142-03): TechniqueFormSheet with metadata, slots, sections/steps, and save
