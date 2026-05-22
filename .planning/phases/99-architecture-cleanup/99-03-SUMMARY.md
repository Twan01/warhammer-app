---
phase: 99-architecture-cleanup
plan: 03
subsystem: units
tags: [refactor, decomposition, form-components]
dependency_graph:
  requires: []
  provides: [UnitFormRequired, UnitFormOptional, UnitFormFields]
  affects: [UnitSheet]
tech_stack:
  added: []
  patterns: [useFormContext, form-sub-components]
key_files:
  created:
    - src/features/units/UnitFormRequired.tsx
    - src/features/units/UnitFormOptional.tsx
    - src/features/units/UnitFormFields.tsx
  modified:
    - src/features/units/UnitSheet.tsx
decisions:
  - "Extracted reusable form field helpers (CheckboxField, NullableNumberField, NullableDateField, NullableTextField, NullableTextareaField, PenceField) into UnitFormFields.tsx to keep sub-components under 200 lines"
  - "Used useFormContext in sub-components per D-10 -- shadcn Form = FormProvider so no extra wiring needed"
  - "Kept buildDefaultValues in UnitSheet.tsx per D-11"
metrics:
  duration: 366s
  completed: 2026-05-22
---

# Phase 99 Plan 03: UnitSheet Decomposition Summary

Decomposed UnitSheet.tsx from 688 lines into 4 files: a 177-line orchestrator, 87-line required fields component, 158-line optional fields component, and 174-line reusable field helpers -- all using useFormContext for form access.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Extract UnitFormRequired, UnitFormOptional, slim UnitSheet | ce2b054 | UnitFormRequired.tsx, UnitFormOptional.tsx, UnitFormFields.tsx, UnitSheet.tsx |

## What Changed

### UnitSheet.tsx (177 lines, down from 688)
- Slim orchestrator: Sheet wrapper, useForm setup, zodResolver, useEffect sync, onSubmit handler, mutation hooks
- Renders UnitFormRequired and UnitFormOptional inside Form (which is FormProvider)
- buildDefaultValues stays here per D-11

### UnitFormRequired.tsx (87 lines) -- NEW
- Required fields: name, faction select, category combobox
- Uses useFormContext<UnitFormValues>() for form access
- Props: factions array, factionsLoading boolean

### UnitFormOptional.tsx (158 lines) -- NEW
- Collapsible optional details section with local expanded state (per D-07)
- Uses useFormContext<UnitFormValues>() for form access
- Props: hasTiers, tiersCount for points field tier management
- Inline renders for painting_status, painting_percentage, and points (custom logic)
- Delegates remaining fields to UnitFormFields helpers

### UnitFormFields.tsx (174 lines) -- NEW
- Reusable form field helpers: CheckboxField, NullableNumberField, NullableDateField, NullableTextField, NullableTextareaField, PenceField
- Each uses useFormContext internally -- no prop drilling
- Extracted to keep UnitFormOptional under 200-line target

## Deviations from Plan

### Auto-added Improvements

**1. [Rule 2 - Missing functionality] Created UnitFormFields.tsx helper file**
- **Found during:** Task 1
- **Issue:** UnitFormOptional exceeded 200-line target (225 lines) with inline field definitions for 15+ form fields
- **Fix:** Extracted 6 reusable form field helpers into a shared UnitFormFields.tsx file, reducing UnitFormOptional to 158 lines
- **Files created:** src/features/units/UnitFormFields.tsx
- **Commit:** ce2b054

## Verification

- pnpm build: PASSED (TypeScript compilation + Vite build)
- UnitSheet.tsx: 177 lines (target: under 250)
- UnitFormRequired.tsx: 87 lines (target: under 200)
- UnitFormOptional.tsx: 158 lines (target: under 200)
- UnitFormFields.tsx: 174 lines (target: under 200)
- useFormContext present in both sub-components: YES
- No useQuery/useMutation/useCreateUnit/useUpdateUnit in sub-components: CONFIRMED
- buildDefaultValues in UnitSheet: YES (3 references)

## Known Stubs

None -- all form fields are fully wired to form context.

## Self-Check: PASSED
