---
phase: 68-infrastructure-quick-wins
plan: 02
status: complete
commit: 7fb841d
requirements_met:
  - REC-05
---

## What was done

### Task 1: Section-aware ordering in getRecipePaintsByRecipe (REC-05)
- Replaced `SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC` with `SELECT rs.* FROM recipe_steps rs LEFT JOIN recipe_sections s ON s.id = rs.section_id WHERE rs.recipe_id = $1 ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC`
- Added Group 15 behavior test in `recipeSections.test.ts` asserting LEFT JOIN and COALESCE patterns
- Files: `src/db/queries/recipePaints.ts`, `tests/painting/recipeSections.test.ts`

### Task 2: Fix duplicateRecipe section copy and step ordering (D-04, D-09)
- Expanded section INSERT from 6 to 10 columns, adding `section_type`, `technique`, `execution_mode`, `applies_to` with `?? null` coercion
- Replaced step SELECT with same LEFT JOIN + COALESCE ORDER BY pattern
- Updated test: section params assertions expanded to 10-element arrays, step SELECT test now asserts LEFT JOIN + COALESCE
- Files: `src/db/queries/recipes.ts`, `tests/painting/duplicateRecipe.test.ts`

## Verification
- `pnpm test -- tests/painting/duplicateRecipe.test.ts`: 11 tests pass
- `pnpm test -- tests/painting/recipeSections.test.ts`: 48 tests pass (including 2 new REC-05 tests)
- `pnpm build`: TypeScript compilation succeeds

## Deviations
None.
