---
phase: 58-recipe-form-timeline-display
plan: "01"
subsystem: recipes
tags: [workflow-metadata, progressive-disclosure, form-controls, recipe-sections]
dependency_graph:
  requires: [57-01, 57-02]
  provides: [RUI-01, RUI-02]
  affects: [RecipeSectionCard, RecipeSectionList]
tech_stack:
  added: []
  patterns: [nested-collapsible, __none__-sentinel-select, sectionsCount-prop-threading]
key_files:
  created: []
  modified:
    - src/features/recipes/RecipeSectionCard.tsx
    - src/features/recipes/RecipeSectionList.tsx
    - tests/painting/recipeSectionCard.test.tsx
decisions:
  - "Workflow collapsible uses ChevronRight (rotates 90deg) not ChevronDown — matches UI-SPEC trigger pattern for nested collapsibles"
  - "sectionsCount prop threaded from RecipeSectionList.sections.length — RecipeSectionCard does not own section list"
  - "hasAnyWorkflowMetadata checks all four fields with Boolean() coercion — null, empty string, and undefined all evaluate to false"
metrics:
  duration: "6 minutes"
  completed_date: "2026-05-12"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 58 Plan 01: Workflow Collapsible — RecipeSectionCard Summary

Nested Collapsible added to RecipeSectionCard with 2x2 grid of workflow metadata controls (section_type, technique, execution_mode, applies_to) gated by progressive disclosure logic per D-04/D-05.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add sectionsCount prop + Workflow collapsible to RecipeSectionCard | d0bb77f | RecipeSectionCard.tsx, RecipeSectionList.tsx |
| 2 | Add RUI-01 and RUI-02 test coverage | f30f683 | tests/painting/recipeSectionCard.test.tsx |

## What Was Built

**RecipeSectionCard.tsx** — Added:
- `sectionsCount: number` prop to `RecipeSectionCardProps`
- Import of `SECTION_TYPES`, `TECHNIQUES`, `EXECUTION_MODES` from `@/types/recipeSection`
- `const [workflowOpen, setWorkflowOpen] = useState(false)` state
- `hasAnyWorkflowMetadata(section)` helper — checks section_type, technique, execution_mode, applies_to with Boolean coercion
- `showWorkflowCollapsible = sectionsCount > 1 || hasAnyWorkflowMetadata(section)` derived value
- Nested `Collapsible` inside outer `CollapsibleContent` — conditionally rendered when `showWorkflowCollapsible`
- Trigger: ghost Button with `ChevronRight` (rotates 90deg when open), label "Workflow", `h-7 text-xs text-muted-foreground`
- `CollapsibleContent` with `grid grid-cols-2 gap-2 pt-1 pb-2`:
  - Row 1: `section_type` Select (SECTION_TYPES, `__none__` sentinel) + `technique` Select (TECHNIQUES)
  - Row 2: `execution_mode` Select (EXECUTION_MODES) + `applies_to` Input (`aria-label="Applies to (model area)"`)
- All four controls call `onChange({ ...section, field: newValue })`

**RecipeSectionList.tsx** — Added `sectionsCount={sections.length}` to `RecipeSectionCard` render.

**tests/painting/recipeSectionCard.test.tsx** — Added:
- `sectionsCount?: number` (default 1) to `renderCard` helper overrides
- `renderCard` passes `sectionsCount` to `RecipeSectionCard`
- `describe("RecipeSectionCard -- RUI-01 workflow collapsible")` — 5 test cases
- `describe("RecipeSectionCard -- RUI-02 workflow collapsible hidden")` — 2 test cases
- All 24 tests pass

## Deviations from Plan

None — plan executed exactly as written. The TypeScript build error (recipeSectionCard.test.tsx missing sectionsCount) was an anticipated consequence of adding a required prop and was resolved in Task 2 as planned.

## Verification Results

- `pnpm build` — PASS (TypeScript + Vite build, 0 errors)
- `pnpm exec vitest run tests/painting/recipeSectionCard.test.tsx` — PASS (24/24 tests)
- Pre-existing SyncStatusCard.test.tsx failure (time-sensitive "synced yesterday" assertion) is unrelated to this plan

## Known Stubs

None — all four workflow fields are fully wired to `onChange` and will persist via the existing RecipeFormSheet save path.

## Threat Flags

No new trust boundaries introduced. All changes are form-local state modifications flowing through parameterized queries (Phase 57 delivery path).

## Self-Check: PASSED

- [x] `src/features/recipes/RecipeSectionCard.tsx` — modified, contains `showWorkflowCollapsible`
- [x] `src/features/recipes/RecipeSectionList.tsx` — modified, contains `sectionsCount={sections.length}`
- [x] `tests/painting/recipeSectionCard.test.tsx` — modified, contains `RUI-01`
- [x] Commit d0bb77f — feat(58-01): add Workflow collapsible with 4 metadata controls
- [x] Commit f30f683 — test(58-01): add RUI-01 and RUI-02 test coverage
