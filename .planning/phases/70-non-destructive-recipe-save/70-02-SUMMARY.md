---
phase: 70-non-destructive-recipe-save
plan: 02
status: complete
commit: 588e4c6
---

# Plan 02 Summary — Three-way diff save flow in RecipeFormSheet

## What was done

Replaced the DELETE-all + re-INSERT save pattern in `RecipeFormSheet.tsx` `onSubmit` with a five-phase diff algorithm:

1. **Phase 1 — Collect surviving section dbIds**: Builds a `Set<number>` from all non-null `dbId` values in the draft sections array.
2. **Phase 2 — DELETE removed sections**: Only deletes sections whose `id` is NOT in the surviving set. CASCADE handles child step cleanup.
3. **Phase 3 — UPDATE existing sections**: Updates all fields including `order_index` for sections with non-null `dbId`.
4. **Phase 4 — INSERT new sections + build sectionIdMap**: Seeds the map from surviving sections first (Pitfall 1 prevention), then inserts new sections.
5. **Phase 5 — Step diff**: Collects ALL surviving step dbIds globally across ALL sections (Pitfall 3 prevention), deletes removed steps, then UPDATE/INSERT per section.

The create-new-recipe path is fully preserved — it still inserts all sections and steps fresh with no diff logic.

## Key design decisions

- **sectionIdMap seeded from both surviving and new sections** before step processing (prevents FK lookup failures).
- **Global draftStepDbIds** — steps dragged between sections are not incorrectly deleted.
- **removeRecipePaint hook removed** — replaced by direct `removeRecipeStep` query function import. The hook `useRemoveRecipePaint` is no longer imported or instantiated.
- **updateRecipeSection called with all fields** — avoids COALESCE null-preservation issue for `name` and `optional`.

## Artifacts

| File | Change |
|------|--------|
| `src/features/recipes/RecipeFormSheet.tsx` | Five-phase diff algorithm in edit path, create path preserved, imports updated |

## Verification

- `pnpm build` — passes
- `pnpm test` — 1391/1391 pass (5 pre-existing failures in unrelated rules-hub/datasheet tests)
