---
phase: 141-schema-foundation-progress-identity-lock
plan: "02"
subsystem: lib/types
tags: [pure-function, types, tdd, technique-library, fnd-04]
requirements: [FND-04]

dependency_graph:
  requires: ["141-01"]
  provides: ["effectivePaintId() pure resolver", "PaintResolvableStep interface", "SlotResolutionMap type", "technique_step_id on RecipeStep + DraftStep"]
  affects: ["Phases 143/145 consumer wiring"]

tech_stack:
  added: []
  patterns:
    - "src/lib/ pure-function convention (one function per file, no DB/IO)"
    - "Optional nullable field additions for backward-compatible TS type evolution"

key_files:
  created:
    - src/lib/effectivePaintId.ts
    - tests/lib/effectivePaintId.test.ts
  modified:
    - src/types/recipePaint.ts
    - src/types/recipe.ts

decisions:
  - "technique_step_id made optional (?) in RecipeStep and DraftStep — required non-optional would break all existing consumers (test fixtures, makeDraftStep, form code); optional preserves backward compatibility while satisfying the structural subtype check"
  - "PaintResolvableStep.technique_step_id made optional to match — undefined (pre-051 rows or absent field) is handled by the != null check in effectivePaintId(), falling through to paint_id"

metrics:
  duration: "~15 minutes"
  completed_date: "2026-06-21"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
---

# Phase 141 Plan 02: effectivePaintId() Resolver + Type Additions Summary

**One-liner:** Pure `effectivePaintId()` resolver with slot-map lookup and `paint_id` fallback, backed by 5-case unit test; optional `technique_step_id` added to `RecipeStep` and `DraftStep` for structural compatibility.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create effectivePaintId() pure resolver + unit test (TDD) | `94339b28` | `src/lib/effectivePaintId.ts`, `tests/lib/effectivePaintId.test.ts` |
| 2 | Add nullable technique_step_id to RecipeStep and DraftStep types; confirm full suite + typecheck green | `42be7ce0` | `src/types/recipePaint.ts`, `src/types/recipe.ts`, `src/lib/effectivePaintId.ts` |

## What Was Built

**`src/lib/effectivePaintId.ts`** — The single paint-resolution spine for the Technique Library (FND-04). Exports:
- `PaintResolvableStep` interface: `{ paint_id: number | null; technique_step_id?: number | null }`
- `SlotResolutionMap` type: `ReadonlyMap<number, number | null>` keyed by `technique_step_id`
- `effectivePaintId(step, slotMap): number | null` — pure, DB-free, no async

Resolution rule: if `step.technique_step_id != null`, look up in `slotMap`; missing key or null value returns null (unfilled slot). Otherwise, return `step.paint_id` (plain step FND-04 fallback).

**`tests/lib/effectivePaintId.test.ts`** — Covers all 5 required cases:
1. Technique step with FILLED slot → returns slot's paint_id (42)
2. Technique step with UNFILLED slot (value null) → returns null
3. Technique step MISSING from slotMap → returns null
4. Plain step (technique_step_id null) → returns step.paint_id (5)
5. Plain step with null paint_id → returns null

**Type additions:**
- `src/types/recipePaint.ts` RecipeStep: `technique_step_id?: number | null` (after `section_id`)
- `src/types/recipe.ts` DraftStep: `technique_step_id?: number | null` (after `alt_paint_id`)

Both types now structurally satisfy `PaintResolvableStep`. `CreateRecipeStepInput` picks up the field automatically via `Omit<RecipeStep, "id" | "created_at">`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made technique_step_id optional in all three interfaces**

- **Found during:** Task 2 — `pnpm build` revealed 20+ TypeScript errors
- **Issue:** Adding `technique_step_id: number | null` as a *required* field to `RecipeStep` and `DraftStep` broke every existing test fixture and production code that creates these objects without the new field (including `makeDraftStep()` in `src/lib/recipeSteps.ts`, 6 painting-mode test files, `saveRecipeGraph` tests, `recipeSections` tests, etc.). The plan's intent of "pure addition, no consumer rewired" was violated by the required non-optional field.
- **Fix:** Changed all three declarations to optional (`?`): `RecipeStep.technique_step_id`, `DraftStep.technique_step_id`, and `PaintResolvableStep.technique_step_id`. The `!= null` check in `effectivePaintId()` already handles `undefined` correctly (JavaScript loose inequality: `undefined != null` is `false`, so absent field falls through to the `paint_id` branch). Structural compatibility between `RecipeStep`/`DraftStep` and `PaintResolvableStep` is preserved.
- **Files modified:** `src/types/recipePaint.ts`, `src/types/recipe.ts`, `src/lib/effectivePaintId.ts`
- **Commit:** `42be7ce0`

## Verification Results

- `pnpm test -- tests/lib/effectivePaintId.test.ts` — 5/5 pass
- `pnpm build` — TypeScript clean, Vite build successful (51 migrations, version 0.6.0)
- `pnpm test` — **2910 passed | 6 skipped | 0 failed** (SC#4 confirmed — no existing test broken)

## Known Stubs

None — plan scope is a pure function + type additions; no UI or data wiring.

## Threat Flags

None — pure in-memory TypeScript function on local single-user data; no I/O, no external surface.

## Self-Check: PASSED

- `src/lib/effectivePaintId.ts` — FOUND
- `tests/lib/effectivePaintId.test.ts` — FOUND
- `src/types/recipePaint.ts` contains `technique_step_id` — FOUND
- `src/types/recipe.ts` contains `technique_step_id` — FOUND
- Commit `94339b28` (Task 1 TDD) — FOUND
- Commit `42be7ce0` (Task 2 types) — FOUND
- Full test suite: 2910 passed, 0 failed
