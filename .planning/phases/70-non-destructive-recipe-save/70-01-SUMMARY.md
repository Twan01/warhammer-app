---
phase: 70-non-destructive-recipe-save
plan: 01
status: complete
commit: 588e4c6
---

# Plan 01 Summary — dbId tracking + updateRecipeStep query

## What was done

1. **DraftStep.dbId** — Added `dbId: number | null` to `DraftStep` interface and `makeDraftStep()` factory (returns `null`).
2. **DraftSection.dbId** — Added `dbId: number | null` to `DraftSection` interface and `makeDraftSection()` factory (returns `null`).
3. **buildDraftSections** — Populates `dbId` from DB row `id` on both sections (`dbId: s.id`) and nested steps (`dbId: st.id`).
4. **UpdateRecipeStepInput** — New type in `src/types/recipePaint.ts` following the `Partial<Omit<Create, "recipe_id">> & { id }` pattern.
5. **updateRecipeStep** — New query function in `src/db/queries/recipePaints.ts` with direct assignment (no COALESCE) covering all 13 mutable step columns.
6. **Tests** — Extended `recipeSteps.test.ts` (dbId null, computeOrderIndex preserves dbId) and `recipeSection.pure.test.ts` (dbId from section.id, dbId from step.id). Fixed test fixtures in `recipeSectionCard.test.tsx` and `recipeStepRow.test.tsx`.

## Artifacts

| File | Change |
|------|--------|
| `src/features/recipes/recipeSteps.ts` | `dbId: number \| null` on DraftStep + makeDraftStep |
| `src/features/recipes/recipeSection.ts` | `dbId: number \| null` on DraftSection + makeDraftSection + buildDraftSections |
| `src/types/recipePaint.ts` | `UpdateRecipeStepInput` type |
| `src/db/queries/recipePaints.ts` | `updateRecipeStep` function (13-column UPDATE) |
| `tests/painting/recipeSteps.test.ts` | 2 new tests, fixture updated |
| `tests/painting/recipeSection.pure.test.ts` | 2 new tests |
| `tests/painting/recipeSectionCard.test.tsx` | Fixture updated for dbId |
| `tests/painting/recipeStepRow.test.tsx` | Fixture updated for dbId |

## Verification

- `pnpm test -- tests/painting/recipeSteps.test.ts tests/painting/recipeSection.pure.test.ts` — 32/32 pass
- `pnpm build` — passes
