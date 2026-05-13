---
phase: 61-recipe-workflow-hardening
plan: 02
status: complete
started: 2026-05-13
completed: 2026-05-13
commits:
  - hash: 2e64aa7
    message: "test(61-02): add RH-02 degradation and RH-03 progressive disclosure tests"
---

# Plan 61-02 Summary

## What was done

Extended existing test files with RH-02 and RH-03 specific test coverage.

### Task 1: computeWorkflowPosition degradation tests (RH-02)

Added to `tests/lib/computeWorkflowPosition.test.ts`:
- **SECTION_TYPES const array assertion** — verifies exactly 7 values (prep, basecoat, shade, layer, detail, effect, finishing)
- **Stale section name degradation test** — confirms `computeWorkflowPosition(null, "Old Name", [section with "New Name"], steps)` returns `null` (not crash)
- Total: 15 tests, all passing

### Task 2: RecipeSectionCard progressive disclosure tests (RH-03)

Added to `tests/painting/recipeSectionCard.test.tsx`:
- **applies_to visibility test** — sectionsCount=1 + applies_to set shows Workflow trigger
- **execution_mode visibility test** — sectionsCount=1 + execution_mode set shows Workflow trigger
- Pre-existing tests already covered: sectionsCount>1, section_type set, technique set, no-metadata hidden
- Total: 26 tests, all passing

## Deviations

Both test files already existed from Phase 60 with substantial coverage. Added the specific RH-02/RH-03 tests rather than creating from scratch.

## Requirements satisfied

- **RH-02**: Stale section name returns null (degradation, not crash) — automated regression test in place
- **RH-03**: Progressive disclosure threshold correct — all 4 metadata fields + multi-section trigger tested
