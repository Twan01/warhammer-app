---
phase: 142-technique-authoring-library-browse
plan: "02"
subsystem: technique-library
tags: [data-layer, graph-save, non-destructive, diff, hooks, green-tests, wave-1]
dependency_graph:
  requires: [142-01]
  provides: [techniques-query-layer, technique-hooks, saveTechniqueGraph, duplicateTechnique, techniqueDiff]
  affects: [142-03, 142-04, 143-01]
tech_stack:
  added: []
  patterns: [fnd-03-non-destructive-save, slot-diff, better-sqlite3-bridge, react-query-invalidation-symmetry]
key_files:
  created:
    - src/lib/techniqueDiff.ts
    - src/db/queries/techniques.ts
    - src/db/queries/techniqueSections.ts
    - src/db/queries/techniqueColourSlots.ts
    - src/hooks/useTechniques.ts
    - src/hooks/useTechniqueSections.ts
    - src/hooks/useTechniqueColourSlots.ts
  modified:
    - tests/data-layer/db-helpers.ts
    - tests/data-layer/technique-duplicate.test.ts
    - tests/data-layer/technique-usage-counts.test.ts
decisions:
  - "computeTechniqueStepDiff written as local function in techniques.ts rather than casting DraftTechniqueSection[] to DraftSection[] — avoids structural typing mismatch (DraftTechniqueStep has no paint_id/step_photo_path/alt_paint_id)"
  - "createDbBridge added to db-helpers.ts: wraps better-sqlite3 with Tauri-compatible select/execute interface, converting $N params to ? for node test environment"
  - "Updated duplicate and usage-count test files to mock @/db/client and wire the bridge — RED stubs from plan 01 required this to call the implemented functions"
  - "sectionStepCounters Map used to assign per-section order_index in EDIT path step UPDATE/INSERT (order derived from flat step processing position within section)"
metrics:
  duration: "~35 minutes"
  completed_date: "2026-06-21"
  tasks_completed: 3
  tasks_total: 3
  files_created: 7
  files_modified: 3
requirements: [TECH-01, TECH-02, TECH-03, TECH-04, TECH-05, SLOT-01, SLOT-02, LIB-02]
---

# Phase 142 Plan 02: Technique Data Layer Summary

Complete technique data layer: slot diff helpers, non-destructive `saveTechniqueGraph` with FND-03 UPDATE-by-PK invariant, `duplicateTechnique`, all read/count queries, and React Query hooks with correct invalidation symmetry. All three RED data-layer tests from plan 01 are now GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | techniqueDiff (slot diff) + technique read/count query modules | 61e82ded | src/lib/techniqueDiff.ts, src/db/queries/techniqueSections.ts, src/db/queries/techniqueColourSlots.ts |
| 2 | saveTechniqueGraph + duplicate/delete + usage queries | cddaf31f | src/db/queries/techniques.ts, tests/data-layer/db-helpers.ts, tests/data-layer/technique-duplicate.test.ts, tests/data-layer/technique-usage-counts.test.ts |
| 3 | React Query hooks with invalidation symmetry | fa30473f | src/hooks/useTechniques.ts, src/hooks/useTechniqueSections.ts, src/hooks/useTechniqueColourSlots.ts |

## What Was Built

**`src/lib/techniqueDiff.ts`** — Slot diff utilities:
- Re-exports `computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap` from `recipeDiff.ts`
- `SlotDiff` interface + `computeSlotDiff(draftSlots, existingSlots)` — classifies toDelete/toUpdate/toInsert
- `buildSlotIdMap(slots)` — maps `localId` (UUID) to `dbId` (integer) for persisted slots

**`src/db/queries/techniques.ts`** — Full technique CRUD + graph save:
- `getTechniques()`, `getTechnique(id)` — simple reads
- `getTechniquesWithCounts()` — single JOIN query returning slot_count, step_count (via JOIN through technique_sections), usage_count from recipe_technique_instances
- `getTechniqueUsageCounts()`, `getTechniqueUsageCount(id)`, `getTechniqueUsedByRecipes(id)` — usage queries
- `deleteTechnique(id)` — single DELETE; CASCADE removes sections/steps/slots
- `duplicateTechnique(originalId, newName)` — copies technique + slots (with Map<oldSlotId,newSlotId>) + sections (with Map) + steps (remapping both FKs)
- `saveTechniqueGraph(...)` — CREATE and EDIT paths:
  - CREATE: INSERT technique → INSERT slots (build slotIdMap) → INSERT sections (build sectionIdMap) → INSERT steps (resolve FKs)
  - EDIT: UPDATE technique → slot diff phase → section diff phase → step diff phase (UPDATE surviving steps by PK — FND-03 invariant — never DELETE+INSERT a surviving step)
- WAL auto-commit docblock ported from `saveRecipeGraph` (no BEGIN/COMMIT across pool connections)
- Column trap guards: no `updated_at` on technique_steps or technique_colour_slots UPDATE SQL

**`src/db/queries/techniqueSections.ts`** — `getTechniqueSections(techniqueId)` + `getTechniqueSteps(techniqueId)` (joins through technique_sections — technique_steps has no technique_id)

**`src/db/queries/techniqueColourSlots.ts`** — `getTechniqueColourSlots(techniqueId)`

**`src/hooks/useTechniques.ts`** — Full hook surface:
- Key factories: `TECHNIQUES_KEY`, `TECHNIQUE_KEY`, `TECHNIQUES_WITH_COUNTS_KEY`, `TECHNIQUE_USAGE_COUNTS_KEY`
- Hooks: `useTechniques`, `useTechniquesWithCounts`, `useTechnique`, `useTechniqueUsedByRecipes`, `useTechniqueUsageCounts`
- Mutations: `useCreateTechnique`, `useUpdateTechnique`, `useDeleteTechnique`, `useDuplicateTechnique`
- All mutations invalidate TECHNIQUES_KEY + TECHNIQUES_WITH_COUNTS_KEY + TECHNIQUE_USAGE_COUNTS_KEY + `["technique-sections"]` + `["technique-colour-slots"]` prefix keys

**`src/hooks/useTechniqueSections.ts`** — `useTechniqueSections(id?)` + `useTechniqueSteps(id?)` (enabled-by-id)

**`src/hooks/useTechniqueColourSlots.ts`** — `useTechniqueColourSlots(id?)` (enabled-by-id)

**`tests/data-layer/db-helpers.ts` (modified)** — Added `createDbBridge(db)`: wraps a better-sqlite3 Database with a Tauri plugin-sql compatible interface (async `select` + `execute`, converts `$N` params to `?`)

## Verification

- `pnpm test -- tests/data-layer/technique-graph-save.test.ts tests/data-layer/technique-duplicate.test.ts tests/data-layer/technique-usage-counts.test.ts` — all GREEN (5 + 5 + 5 = 15 tests)
- `pnpm exec tsc --noEmit` — 0 errors in any technique source file (6 pre-existing errors in plan 01/04 RED stubs, unchanged)
- Manual check: `updated_at` appears only in `techniques` and `technique_sections` UPDATE SQL — never in `technique_colour_slots` or `technique_steps` UPDATE SQL

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] computeTechniqueStepDiff written locally instead of re-using computeStepDiff**
- **Found during:** Task 2 implementation
- **Issue:** `computeStepDiff` from `recipeDiff.ts` is typed with `DraftSection[]` and `RecipeStep[]`. `DraftTechniqueSection` is missing `section_type/technique/execution_mode/applies_to` and `DraftTechniqueStep` is missing `paint_id/step_photo_path/alt_paint_id` — structural typing is NOT compatible; direct call would fail.
- **Fix:** Wrote `computeTechniqueStepDiff` locally in `techniques.ts` with technique-correct types. The re-exports in `techniqueDiff.ts` remain available for callers who need them via wrapper types.
- **Files modified:** src/db/queries/techniques.ts

**2. [Rule 1 - Bug] Test stubs from plan 01 needed @/db/client mock to call query functions in Node.js**
- **Found during:** Task 2 test run
- **Issue:** `technique-duplicate.test.ts` and `technique-usage-counts.test.ts` call `duplicateTechnique()`, `getTechniquesWithCounts()`, `getTechniqueUsageCounts()` directly, but these call `getDb()` which requires Tauri's `window` object — absent in `@vitest-environment node`.
- **Fix:** Added `createDbBridge()` to `db-helpers.ts`; updated both test files with `vi.mock("@/db/client")` + bridge wiring in `beforeEach`.
- **Files modified:** tests/data-layer/db-helpers.ts, tests/data-layer/technique-duplicate.test.ts, tests/data-layer/technique-usage-counts.test.ts
- **Impact:** Pattern is now available for any future data-layer test that needs to call query functions rather than raw SQL.

## Known Stubs

None — this plan creates the data layer only; no UI components with placeholder data.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns. All SQL uses `$1/$2` parameterized queries (STRIDE T-142-03 mitigated). FND-03 invariant proven GREEN via technique-graph-save.test.ts (STRIDE T-142-04 mitigated).

## Self-Check: PASSED

Files exist:
- src/lib/techniqueDiff.ts — FOUND
- src/db/queries/techniques.ts — FOUND
- src/db/queries/techniqueSections.ts — FOUND
- src/db/queries/techniqueColourSlots.ts — FOUND
- src/hooks/useTechniques.ts — FOUND
- src/hooks/useTechniqueSections.ts — FOUND
- src/hooks/useTechniqueColourSlots.ts — FOUND

Commits exist:
- 61e82ded — feat(142-02): slot diff helpers + technique read query modules
- cddaf31f — feat(142-02): saveTechniqueGraph + duplicate/delete + usage queries (GREEN)
- fa30473f — feat(142-02): React Query hooks with invalidation symmetry
