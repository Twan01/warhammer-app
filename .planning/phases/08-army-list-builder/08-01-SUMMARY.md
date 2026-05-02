---
phase: 08-army-list-builder
plan: "01"
subsystem: army-list-ui
tags: [army-lists, forms, dialogs, zod, react-hook-form]
dependency_graph:
  requires: [08-00, useArmyLists, useFactions, armyList types]
  provides: [ArmyListSheet, ArmyListDeleteDialog, armyListSchema, ARMY_LIST_TYPES, ArmyListFormValues]
  affects: [08-03 ArmyListsPage, 08-04 page wiring]
tech_stack:
  added: []
  patterns: [zodResolver, useEffect form reset (Pitfall 6), NO_FACTION sentinel for nullable Select, try/catch onSubmit with toast.success/error]
key_files:
  created:
    - src/features/army-lists/armyListSchema.ts
    - src/features/army-lists/ArmyListSheet.tsx
    - src/features/army-lists/ArmyListDeleteDialog.tsx
  modified: []
decisions:
  - "Used NO_FACTION sentinel '__none__' for faction Select to handle nullable faction_id — SelectItem cannot have empty string value"
  - "ARMY_LIST_TYPES const array exported from schema for reuse in ArmyListSheet and future callers"
  - "notes passed as empty string (not null) for UPDATE so COALESCE pattern in updateArmyList can clear the field (Pitfall 5)"
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  completed_date: "2026-05-02"
---

# Phase 8 Plan 01: Army List Form Components Summary

Zod schema + create/edit Sheet + delete Dialog for army lists — all 3 leaf components wired to Phase 6 hooks and matching PaintSheet/PaintDeleteDialog structural twins.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create armyListSchema.ts and ArmyListSheet.tsx | 1223996 | src/features/army-lists/armyListSchema.ts, src/features/army-lists/ArmyListSheet.tsx |
| 2 | Create ArmyListDeleteDialog.tsx | bce298d | src/features/army-lists/ArmyListDeleteDialog.tsx |

## What Was Built

**armyListSchema.ts** — Zod schema for the army list form. Exports `ARMY_LIST_TYPES` const tuple (Casual/Learning/Narrative/Competitive/Test), `armyListSchema` z.object with name (min 1, max 120), faction_id (number int positive nullable), list_type (z.enum from ARMY_LIST_TYPES nullable), points_limit (int min 0 nullable), notes (string max 2000 nullable). No `.default()` per decision 02-03. Exports `ArmyListFormValues` inferred type.

**ArmyListSheet.tsx** — Create/edit form Sheet. Mirrors PaintSheet/UnitSheet pattern: useForm + zodResolver(armyListSchema), buildDefaultValues helper, useEffect reset on `list` prop change (Pitfall 6), 5 form fields (Name Input, Faction Select with NO_FACTION sentinel, List Type Select, Points Limit number Input, Notes textarea), SheetFooter with "Discard changes" (ghost) + "Save List"/"Update List" (default). onSubmit try/catch: toast.success on success + onClose(), toast.error on failure + sheet stays open. Faction Select mirrors UnitSheet: `value={field.value !== null ? String(field.value) : NO_FACTION}`, `onValueChange` converts back to number.

**ArmyListDeleteDialog.tsx** — Simple confirmation dialog. Mirrors PaintDeleteDialog: Dialog with title "Delete army list?", body includes list.name verbatim per UI-SPEC, "Keep List" (outline) + "Delete List" (destructive variant), disabled while isPending. toast.success("Army list deleted.") on success, toast.error on failure, always closes. No foreign-key pre-check needed (CASCADE constraint handles army_list_units rows automatically).

## Verification Results

- `pnpm tsc --noEmit` exits 0 — all 3 files compile clean against existing types
- `pnpm test -- --run tests/foundation tests/army-list` exits 0 — 173 passed, 5 skipped (plan 04 stubs — expected)
- 5-value enum enforced in schema: Casual, Learning, Narrative, Competitive, Test
- Both hooks wired: useCreateArmyList + useUpdateArmyList in ArmyListSheet, useDeleteArmyList in ArmyListDeleteDialog
- Toast copy matches 08-UI-SPEC.md verbatim: "Army list created.", "Army list updated.", "Army list deleted.", "Something went wrong. Please try again."

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/features/army-lists/armyListSchema.ts
- FOUND: src/features/army-lists/ArmyListSheet.tsx
- FOUND: src/features/army-lists/ArmyListDeleteDialog.tsx
- FOUND commit: 1223996 (Task 1)
- FOUND commit: bce298d (Task 2)
