---
phase: 50-section-form-ui
plan: "01"
subsystem: recipes
tags: [tdd, pure-functions, draft-state, sections]
dependency_graph:
  requires: []
  provides: [DraftSection, makeDraftSection, buildDraftSections]
  affects: [50-02, 50-03]
tech_stack:
  added: []
  patterns: [TDD red-green, pure function testing, UUID localId pattern]
key_files:
  created:
    - src/features/recipes/recipeSection.ts
    - tests/painting/recipeSection.pure.test.ts
  modified: []
decisions:
  - DraftSection mirrors DraftStep UUID localId pattern — crypto.randomUUID() assigned at draft creation, never persisted
  - buildDraftSections null-coalesces all optional RecipeStep fields (painting_phase, tool, technique, dilution, time_estimate_minutes, step_photo_path, alt_paint_id) — handles DB rows that predate v0.2.7 columns
metrics:
  duration: ~8 min
  completed: "2026-05-08"
  tasks_completed: 2
  files_created: 2
---

# Phase 50 Plan 01: DraftSection Pure Functions Summary

**One-liner:** UUID-keyed DraftSection type with makeDraftSection factory and buildDraftSections grouper — pure tested functions that convert DB rows to section form draft state.

## What Was Built

`src/features/recipes/recipeSection.ts` exports three symbols:

- `DraftSection` interface: `{ localId, name, surface, optional, notes, steps: DraftStep[] }`
- `makeDraftSection(name?)` — returns a blank section with UUID localId, default name "Steps", and empty steps array
- `buildDraftSections(sections, steps)` — groups RecipeStep rows by `section_id`, sorts within each section by `order_index`, maps to DraftStep with null-coalescing for all optional fields, assigns UUID localIds to both sections and nested steps

## TDD Execution

**RED (Task 1):** 8 tests written covering `makeDraftSection` (2 tests) and `buildDraftSections` (6 tests). All failed immediately with `Cannot find module '@/features/recipes/recipeSection'`. Committed at `6b96121`.

**GREEN (Task 2):** Implementation written in one pass. All 8 tests passed. Build clean. Committed at `d2b1a86`.

## Test Coverage

| Test | Behavior |
|------|----------|
| T1 | makeDraftSection() defaults: name="Steps", surface=null, optional=0, notes=null, steps=[], localId length 36 |
| T2 | makeDraftSection("Armor") uses custom name |
| T3 | buildDraftSections groups 3 steps into 2 sections correctly (2+1) |
| T4 | buildDraftSections sorts steps by order_index within section |
| T5 | buildDraftSections with empty steps returns sections with empty steps arrays |
| T6 | buildDraftSections null-coalesces undefined nullable fields to null |
| T7 | Unique UUID localIds assigned to each section |
| T8 | Unique UUID localIds assigned to each nested step |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/features/recipes/recipeSection.ts` exists
- [x] `tests/painting/recipeSection.pure.test.ts` exists with 8 tests
- [x] Commit `6b96121` — RED test commit
- [x] Commit `d2b1a86` — GREEN implementation commit
- [x] `pnpm test -- tests/painting/recipeSection.pure.test.ts` exits 0, all 8 tests passing
- [x] `pnpm build` exits 0, no TypeScript errors

## Self-Check: PASSED
