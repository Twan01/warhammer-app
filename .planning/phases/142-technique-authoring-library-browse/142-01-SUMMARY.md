---
phase: 142-technique-authoring-library-browse
plan: "01"
subsystem: technique-library
tags: [types, schema, test-stubs, nyquist, wave-0]
dependency_graph:
  requires: [141-03]
  provides: [technique-types, techniqueSchema, techniqueSection-helpers, nyquist-stubs]
  affects: [142-02, 142-03, 142-04]
tech_stack:
  added: []
  patterns: [mirror-build, recipe-analog, nyquist-validation, tdd-green-immediate]
key_files:
  created:
    - src/types/technique.ts
    - src/features/techniques/techniqueSchema.ts
    - src/features/techniques/techniqueSection.ts
    - tests/techniques/techniqueSchema.test.ts
    - tests/data-layer/technique-graph-save.test.ts
    - tests/data-layer/technique-duplicate.test.ts
    - tests/data-layer/technique-usage-counts.test.ts
    - tests/techniques/applyTechniqueFilters.test.ts
  modified: []
decisions:
  - "TechniqueFormValues defined in src/types/technique.ts (not feature schema) so query layer can import without feature dependency — same rationale as RecipeFormValues"
  - "techniqueSchema.ts re-exports RECIPE_EFFECTS/RECIPE_DIFFICULTIES/PAINTING_PHASES from recipeSchema — no redefinition"
  - "techniqueSection.ts exports buildDraftTechniqueSlots as companion to buildDraftTechniqueSections so callers build the slotDbIdToLocalId map correctly"
  - "Four RED test files gate plan 02 (data-layer: graph-save, duplicate, usage-counts) and plan 04 (filter)"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-06-21"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 0
requirements: [TECH-01, TECH-02, TECH-04, SLOT-01, SLOT-02, LIB-03]
---

# Phase 142 Plan 01: Technique Type Foundation + Nyquist Test Stubs Summary

Wave 0 type foundation + five Nyquist test stubs for the Technique Library. DB-row types, Draft types, Zod schema, draft-section helpers, and all required test files created before any data-layer or UI implementation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Technique entity + draft types and Zod schema | d496a7b6 | src/types/technique.ts, src/features/techniques/techniqueSchema.ts |
| 2 | Draft-section helpers + techniqueSchema unit test | 358ce7f3 | src/features/techniques/techniqueSection.ts, tests/techniques/techniqueSchema.test.ts |
| 3 | Four data-layer + filter Nyquist test stubs (RED) | 1d609b00 | 4 test files under tests/data-layer/ and tests/techniques/ |

## What Was Built

**`src/types/technique.ts`** — DB-row interfaces mirroring migration 051 exactly:
- `Technique`, `TechniqueColourSlot` (NO updated_at), `TechniqueSection`, `TechniqueStep` (NO updated_at, NO step_photo_path, NO alt_paint_id)
- Draft types: `DraftTechniqueSlot`, `DraftTechniqueStep` (colour_slot_id references slot localId), `DraftTechniqueSection` (NO section_type/technique/execution_mode/applies_to)
- `TechniqueFormValues`, `TechniqueWithCounts`, `TechniqueUsageCount` interfaces
- `CreateTechniqueInput`/`UpdateTechniqueInput` following the Omit pattern

**`src/features/techniques/techniqueSchema.ts`** — Zod schema:
- Re-exports `RECIPE_EFFECTS`, `RECIPE_DIFFICULTIES`, `PAINTING_PHASES` from recipeSchema
- `techniqueSchema` validates name (min 1, max 120), description (max 500), notes (max 2000), estimated_minutes (int, min 1)
- STRIDE T-142-01 max-length constraints applied

**`src/features/techniques/techniqueSection.ts`** — Draft helpers:
- `makeDraftTechniqueSection(name)` — factory returning section with no recipe-specific fields
- `buildDraftTechniqueSlots(slots)` — converts DB slots to draft with fresh localIds
- `buildDraftTechniqueSections(sections, steps, draftSlots)` — maps colour_slot_id from DB integer to slot localId via slotDbIdToLocalId map

**Test files (5 total):**
- `tests/techniques/techniqueSchema.test.ts` — 7 assertions GREEN immediately (schema exists)
- `tests/data-layer/technique-graph-save.test.ts` — non-destructive save + counter-case + slot assertions; RED (no techniques.ts)
- `tests/data-layer/technique-duplicate.test.ts` — fresh-IDs across all entity types; RED
- `tests/data-layer/technique-usage-counts.test.ts` — step_count via JOIN through technique_sections + usage_count lifecycle; RED
- `tests/techniques/applyTechniqueFilters.test.ts` — name/effect filter logic; RED (no applyTechniqueFilters.ts)

## Verification

- `pnpm exec tsc --noEmit` — no errors in any technique files (one pre-existing unrelated error in technique-progress-identity.test.ts: unused variable)
- `tests/techniques/techniqueSchema.test.ts` — 7 tests GREEN
- Four data-layer/filter tests — RED with `Cannot find package` / `Failed to resolve import` errors, confirming Wave 0 gating

## Deviations from Plan

None — plan executed exactly as written. The `techniqueSchema.test.ts` test file was created before `techniqueSection.ts` per TDD convention (test first), and turned GREEN immediately because the schema already existed from Task 1.

## Known Stubs

None — this plan creates type/test foundation only, no UI or query implementations that could be stubs.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. The types mirror migration 051 already in the schema.

## Self-Check: PASSED

Files exist:
- src/types/technique.ts — FOUND
- src/features/techniques/techniqueSchema.ts — FOUND
- src/features/techniques/techniqueSection.ts — FOUND
- tests/techniques/techniqueSchema.test.ts — FOUND
- tests/data-layer/technique-graph-save.test.ts — FOUND
- tests/data-layer/technique-duplicate.test.ts — FOUND
- tests/data-layer/technique-usage-counts.test.ts — FOUND
- tests/techniques/applyTechniqueFilters.test.ts — FOUND

Commits exist:
- d496a7b6 — FOUND
- 358ce7f3 — FOUND
- 1d609b00 — FOUND
