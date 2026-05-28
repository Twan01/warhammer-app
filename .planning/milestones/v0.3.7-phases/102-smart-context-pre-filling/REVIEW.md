---
phase: 102-smart-context-pre-filling
reviewed: 2026-05-28T12:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/features/recipes/RecipeFormSheet.tsx
  - src/features/recipes/ApplyRecipeDialog.tsx
  - src/features/units/UnitDetailSheet.tsx
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 102: Code Review Report

**Reviewed:** 2026-05-28
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Phase 102 adds smart context pre-filling: `RecipeFormSheet` accepts optional `defaultFactionId`/`defaultUnitId` props for create-mode pre-population, and `ApplyRecipeDialog` accepts a `factionId` prop to split recipes into Suggested/Other groups. `UnitDetailSheet` wires `unit.faction_id` into the dialog. The implementation is clean and well-scoped. Two warnings identified around stale form state and ambiguous grouping UX; one info item for debug logging.

## Warnings

### WR-01: useEffect dependency omission causes stale default pre-fill

**File:** `src/features/recipes/RecipeFormSheet.tsx:154-162`
**Issue:** The `useEffect` that calls `form.reset(buildDefaults(recipe, defaultFactionId, defaultUnitId))` depends on `[recipe?.id, existingSectionsLen, existingStepsLen]` but does NOT include `defaultFactionId` or `defaultUnitId` in the dependency array. If a parent component changes the default faction/unit while keeping `recipe` as `null` (create mode), the form will not re-initialize with the new defaults.

Concrete scenario: user opens RecipeFormSheet from Unit A (defaultFactionId=1), closes without saving, then opens from Unit B (defaultFactionId=2) -- since `recipe?.id` is `undefined` both times, the effect does not re-run and the form retains faction 1.

Note: the `key={recipe?.id ?? "new"}` on `SheetContent` (line 257) forces a re-mount only when switching between different existing recipes or between edit/create -- it does NOT distinguish between two different create-mode invocations (both produce key `"new"`), so the stale state persists.

**Fix:** Add `defaultFactionId` and `defaultUnitId` to the dependency array:
```ts
useEffect(() => {
  form.reset(buildDefaults(recipe, defaultFactionId, defaultUnitId));
  if (recipe && existingSectionsLen > 0) {
    setSections(buildDraftSections(existingSections, existingSteps));
  } else if (!recipe) {
    setSections([makeDraftSection("Steps")]);
  }
}, [recipe?.id, existingSectionsLen, existingStepsLen, defaultFactionId, defaultUnitId]);
```

### WR-02: Suggested group shows all recipes with no heading when factionId is absent

**File:** `src/features/recipes/ApplyRecipeDialog.tsx:74-77`
**Issue:** When `factionId == null`, ALL recipes are placed into `suggested` and `other` is empty. This means the `CommandGroup` on line 128-145 renders with `heading={undefined}` (since the condition `factionId != null && other.length > 0` is false). The result is functionally correct but semantically misleading: recipes are labelled as "suggested" in code when there is no suggestion logic active. More importantly, the `heading` prop evaluates to `undefined`, and shadcn/ui's CommandGroup renders no heading element -- which is fine visually but could confuse screen readers expecting group semantics.

This is a minor UX/a11y concern, not a correctness bug.

**Fix:** When no factionId is provided, skip the group split entirely and render a single ungrouped list, or provide a neutral heading like "All Recipes":
```tsx
const heading = factionId != null && other.length > 0
  ? `Suggested (${suggested.length})`
  : suggested.length > 0 ? "All Recipes" : undefined;
```

## Info

### IN-01: Verbose console.error debug logging left in production path

**File:** `src/features/recipes/RecipeFormSheet.tsx:244-247`
**Issue:** Three `console.error` calls log detailed internal state (sections, existingSections, existingSteps) as serialized JSON on save failure. While useful during development, this leaks internal data structure details in production builds and adds noise. This is a pre-existing pattern (not introduced by Phase 102) but worth noting.

**Fix:** Consider gating behind a debug flag or removing before release:
```ts
if (import.meta.env.DEV) {
  console.error("[RecipeFormSheet] sections:", JSON.stringify(...));
}
```

---

_Reviewed: 2026-05-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
