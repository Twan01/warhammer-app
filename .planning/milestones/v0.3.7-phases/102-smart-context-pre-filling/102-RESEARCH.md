# Phase 102: Smart Context Pre-Filling - Research

**Researched:** 2026-05-28
**Domain:** React form pre-filling, cmdk Command palette grouping, prop threading
**Confidence:** HIGH

## Summary

Phase 102 is a pure UI/prop-threading phase with no database changes, no new libraries, and no new external dependencies. The work involves two surfaces: (1) RecipeFormSheet gains optional `defaultFactionId` and `defaultUnitId` props that pre-populate the React Hook Form defaults when opened from a unit context, and (2) ApplyRecipeDialog gains a `factionId` prop that splits recipes into "Suggested" / "Other" groups using the existing cmdk `CommandGroup` component.

All required infrastructure already exists in the codebase. React Hook Form's `useForm({ defaultValues })` handles pre-fill. The shadcn/ui `CommandGroup` component supports a `heading` prop (passed through to cmdk's `CommandPrimitive.Group`) for labeled groups. The entry point (`UnitDetailSheet`) already has access to `unit.faction_id` on line 52. No new hooks, queries, or state management patterns are needed.

**Primary recommendation:** Thread `unit.faction_id` and `unit.id` as optional props through RecipeFormSheet and ApplyRecipeDialog from UnitDetailSheet. Use `form.reset()` in a `useEffect` keyed on the `open` prop to freeze defaults at sheet-open time. Use `useMemo` to split recipes into suggested/other groups in ApplyRecipeDialog.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pre-fill `faction_id` from the unit's own `faction_id` -- NOT from FactionContext. The unit's faction is the correct context.
- **D-02:** When RecipeFormSheet is opened from QuickAdd (no unit context), do NOT pre-fill faction.
- **D-03:** `unit_id` should also be pre-filled when opening from a unit context.
- **D-04:** ApplyRecipeDialog receives `faction_id` as a new prop. Recipes displayed in two groups: "Suggested" (matching faction) and "Other" (remaining). Both selectable.
- **D-05:** Within each group, maintain current search/filter behavior. Command palette structure stays, just add group headers.
- **D-06:** If unit has no faction (faction_id is null), show all recipes in a single flat list (current behavior).
- **D-07:** Pre-filled fields use standard form controls with values pre-populated. No special visual treatment.
- **D-08:** All pre-filled values are fully editable.
- **D-09:** Only unit-context entry points carry faction/unit context. Global entry points remain context-free.
- **D-10:** RecipeFormSheet gains optional `defaultFactionId` and `defaultUnitId` props.

### Claude's Discretion
- How to thread faction_id through to ApplyRecipeDialog -- could add a prop or read from the unit query already in UnitDetailSheet
- Whether to memoize the suggested/other grouping or compute inline -- optimize for clarity first
- Test strategy for pre-fill behavior

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCP-01 | Recipe creation form pre-fills faction from unit context | RecipeFormSheet already has `faction_id` form field (line 274-303); needs `defaultFactionId` prop added to interface and threaded into `buildDefaults()` |
| SCP-02 | Recipe picker pre-filters recipes by target unit's faction | ApplyRecipeDialog already imports `CommandGroup` and `useFactions`; cmdk's `CommandGroup` supports `heading` prop for labeled groups |
| SCP-03 | Pre-filled values visible and editable | Already satisfied by React Hook Form's `defaultValues` pattern -- standard Select controls are inherently editable |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Faction pre-fill in recipe form | Frontend (React) | -- | Pure prop threading from parent to child component |
| Recipe grouping by faction | Frontend (React) | -- | Client-side array split using existing query data |
| Default value freezing at open | Frontend (React) | -- | useEffect keyed on `open` prop, no server involvement |

## Architecture Patterns

### System Architecture Diagram

```
UnitDetailSheet (has unit.faction_id, unit.id)
    |
    |--- [opens] ---> RecipeFormSheet(defaultFactionId, defaultUnitId)
    |                      |
    |                      v
    |                  useForm({ defaultValues: { faction_id: defaultFactionId } })
    |
    |--- [opens] ---> ApplyRecipeDialog(factionId)
                           |
                           v
                      useMemo: split recipes[] into suggested[] + other[]
                           |
                           v
                      <CommandGroup heading="Suggested"> + <CommandGroup heading="Other">

AppLayout / QuickAdd (no unit context)
    |
    |--- [opens] ---> RecipeFormSheet(no defaultFactionId, no defaultUnitId)
                           |
                           v
                      useForm({ defaultValues: DEFAULT_VALUES })  // unchanged behavior

RecipesPage (no unit context)
    |
    |--- [opens] ---> RecipeFormSheet(no defaultFactionId, no defaultUnitId)
                           |
                           v
                      Same as QuickAdd -- no pre-fill
```

### Component Responsibilities

| Component | File | Change Required |
|-----------|------|-----------------|
| UnitDetailSheet | `src/features/units/UnitDetailSheet.tsx` | Pass `factionId={unit.faction_id}` to ApplyRecipeDialog; no RecipeFormSheet changes needed (it's not rendered here) |
| ApplyRecipeDialog | `src/features/recipes/ApplyRecipeDialog.tsx` | Add `factionId` prop, split recipes into two `CommandGroup`s |
| RecipeFormSheet | `src/features/recipes/RecipeFormSheet.tsx` | Add `defaultFactionId` and `defaultUnitId` props, integrate into `buildDefaults()` |
| AppLayout | `src/components/common/AppLayout.tsx` | No change -- already passes no extra props to RecipeFormSheet |
| RecipesPage | `src/features/recipes/RecipesPage.tsx` | No change -- already passes no extra props to RecipeFormSheet |

### Pattern 1: Form Default Pre-Fill via Props

**What:** Pass optional default values as props, merge into React Hook Form's `defaultValues`.
**When to use:** When a form can be opened from multiple contexts, some with pre-known values.

```typescript
// [VERIFIED: codebase inspection of RecipeFormSheet.tsx]
export interface RecipeFormSheetProps {
  open: boolean;
  recipe: PaintingRecipe | null;
  onClose: () => void;
  defaultFactionId?: number | null;  // NEW
  defaultUnitId?: number | null;     // NEW
}

function buildDefaults(
  recipe: PaintingRecipe | null,
  defaultFactionId?: number | null,
  defaultUnitId?: number | null,
): RecipeFormValues {
  if (recipe) {
    // Edit mode: use recipe's existing values
    return { /* ...existing logic unchanged... */ };
  }
  return {
    ...DEFAULT_VALUES,
    faction_id: defaultFactionId ?? null,
    unit_id: defaultUnitId ?? null,
  };
}
```

### Pattern 2: Recipe List Grouping with cmdk CommandGroup

**What:** Split a flat recipe list into "Suggested" and "Other" groups using `CommandGroup` with `heading` prop.
**When to use:** When recipes should be prioritized by faction match.

```typescript
// [VERIFIED: codebase inspection of command.tsx + ApplyRecipeDialog.tsx]
const { suggested, other } = useMemo(() => {
  if (factionId == null) return { suggested: recipes, other: [] };
  const suggested = recipes.filter(r => r.faction_id === factionId);
  const other = recipes.filter(r => r.faction_id !== factionId);
  return { suggested, other };
}, [recipes, factionId]);

// In JSX:
<CommandList>
  <CommandEmpty>No recipes found.</CommandEmpty>
  {suggested.length > 0 && (
    <CommandGroup heading={factionId != null ? "Suggested" : undefined}>
      {suggested.map(recipe => (
        <CommandItem key={recipe.id} /* ... */ />
      ))}
    </CommandGroup>
  )}
  {other.length > 0 && (
    <CommandGroup heading="Other">
      {other.map(recipe => (
        <CommandItem key={recipe.id} /* ... */ />
      ))}
    </CommandGroup>
  )}
</CommandList>
```

### Pattern 3: Default Value Freezing at Open Time

**What:** Freeze pre-filled values when the sheet opens, not on every render.
**When to use:** When the parent's state might change while the sheet is open (STATE.md decision: "Form defaults for faction pre-fill must freeze at sheet-open time via useEffect([open])").

```typescript
// [ASSUMED] -- pattern from STATE.md accumulated decisions
// RecipeFormSheet already has a useEffect that calls form.reset() when recipe changes.
// The existing useEffect on [recipe?.id, existingSectionsLen, existingStepsLen] handles this.
// For create mode (recipe === null), buildDefaults receives defaultFactionId/defaultUnitId
// which are frozen at mount time via the Sheet's `key` prop (key={recipe?.id ?? "new"}).
// The Sheet re-mounts when recipe changes, so defaults are naturally frozen.
```

**Important note:** The existing `key={recipe?.id ?? "new"}` on `SheetContent` (line 248) forces a re-mount when switching between create/edit. For create mode, the component mounts once when opened and the `defaultFactionId` prop is captured at mount time by `useForm({ defaultValues })`. No additional `useEffect` is needed because the component is unmounted/remounted via the key prop.

### Anti-Patterns to Avoid
- **Reading from FactionContext for pre-fill:** FactionContext (`activeFactionId`) is a global UI state for theming/navigation. It may not match the unit's actual faction. Always use `unit.faction_id` directly (D-01).
- **Filtering out "Other" recipes:** Both groups must remain selectable (D-04). Never hide non-matching recipes.
- **Adding visual badges for auto-filled fields:** Decision D-07 explicitly says no special visual treatment.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form default values | Custom state management for defaults | React Hook Form `defaultValues` | Already used throughout codebase; handles reset, dirty tracking |
| Grouped searchable list | Custom group rendering with search | cmdk `CommandGroup` with `heading` prop | Already in the codebase; handles keyboard navigation across groups |
| Recipe filtering by faction | Manual array management with state | `useMemo` with simple filter | Pure computation, no side effects needed |

## Common Pitfalls

### Pitfall 1: Stale Defaults on Re-Open
**What goes wrong:** Form remembers previous values when re-opened for a different unit.
**Why it happens:** React Hook Form caches `defaultValues` and doesn't reset on prop changes.
**How to avoid:** The existing `key={recipe?.id ?? "new"}` on SheetContent forces re-mount. For ApplyRecipeDialog, the `useEffect` on `open` (line 53) already resets `selectedRecipeId`. Verify that the form also resets.
**Warning signs:** Opening recipe form from Unit A, closing, opening from Unit B -- Unit A's faction still shows.

### Pitfall 2: CommandGroup Search Interaction
**What goes wrong:** Search in cmdk might not search across groups, or group headers interfere with keyboard nav.
**Why it happens:** cmdk's search is value-based on `CommandItem`, not on group headings.
**How to avoid:** cmdk natively searches across all groups by `CommandItem` value. The `heading` prop on `CommandGroup` is display-only and doesn't affect search. Verified by examining the shadcn/ui command.tsx component which passes props through to `CommandPrimitive.Group`. [VERIFIED: codebase inspection]
**Warning signs:** Typing a search term hides results from one group unexpectedly.

### Pitfall 3: Null Faction Edge Case
**What goes wrong:** Grouping logic breaks when `factionId` is null or when recipes have `faction_id: null`.
**Why it happens:** Comparing `null === null` matches recipes without faction to the "suggested" group incorrectly.
**How to avoid:** D-06 specifies: if unit has no faction, show all recipes in flat list. Guard with `if (factionId == null) return { suggested: recipes, other: [] }` and render a single `CommandGroup` without heading.
**Warning signs:** "Suggested" group appears when unit has no faction.

### Pitfall 4: Unit Dropdown Filtering Side Effect
**What goes wrong:** Pre-filling `faction_id` also filters the `unit_id` dropdown (line 309-311 in RecipeFormSheet), potentially hiding the pre-filled unit.
**Why it happens:** The `unit_id` field already filters by `faction_id` via `form.watch("faction_id")`. If `defaultFactionId` and `defaultUnitId` are both set, the unit will appear in the filtered list correctly (since the unit belongs to that faction). No issue expected.
**How to avoid:** Always set `defaultFactionId` before `defaultUnitId` in the defaults object. Verify the pre-filled unit appears in the filtered dropdown.
**Warning signs:** Pre-filled unit not visible in the unit dropdown.

## Code Examples

### Current RecipeFormSheet Props (before change)
```typescript
// Source: src/features/recipes/RecipeFormSheet.tsx line 64-68
export interface RecipeFormSheetProps {
  open: boolean;
  recipe: PaintingRecipe | null;
  onClose: () => void;
}
```

### Current ApplyRecipeDialog Props (before change)
```typescript
// Source: src/features/recipes/ApplyRecipeDialog.tsx line 30-34
interface ApplyRecipeDialogProps {
  open: boolean;
  unitId: number;
  onClose: () => void;
}
```

### Current UnitDetailSheet ApplyRecipeDialog Usage (before change)
```typescript
// Source: src/features/units/UnitDetailSheet.tsx line 273-278
<ApplyRecipeDialog
  open={applyDialogOpen}
  unitId={unit.id}
  onClose={() => setApplyDialogOpen(false)}
/>
```

### Current AppLayout RecipeFormSheet Usage (no change needed)
```typescript
// Source: src/components/common/AppLayout.tsx line 46-51
<RecipeFormSheet
  key="quick-add-recipe"
  open={activeSheet === "add-recipe"}
  recipe={null}
  onClose={closeQuickAdd}
/>
// No defaultFactionId/defaultUnitId -- intentionally context-free (D-02, D-09)
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16.3.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/recipes/` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCP-01 | RecipeFormSheet pre-fills faction_id and unit_id from props | unit | `pnpm test -- tests/recipes/RecipeFormSheetPreFill.test.tsx -x` | Wave 0 |
| SCP-02 | ApplyRecipeDialog groups recipes by faction | unit | `pnpm test -- tests/recipes/ApplyRecipeDialogGrouping.test.tsx -x` | Wave 0 |
| SCP-03 | Pre-filled values are editable | unit | `pnpm test -- tests/recipes/RecipeFormSheetPreFill.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/recipes/ -x`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/recipes/RecipeFormSheetPreFill.test.tsx` -- covers SCP-01, SCP-03
- [ ] `tests/recipes/ApplyRecipeDialogGrouping.test.tsx` -- covers SCP-02

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | cmdk `CommandGroup` heading prop renders a visible label without additional CSS | Architecture Patterns | Group headers might not be styled; would need minor CSS tweak |
| A2 | The `key` prop on SheetContent is sufficient to freeze defaults at open time without an additional `useEffect` | Pattern 3 | Stale defaults could persist across opens -- would need explicit `form.reset()` in useEffect |

## Open Questions

1. **Should RecipeFormSheet be openable from UnitDetailSheet for recipe creation (not just apply)?**
   - What we know: Currently UnitDetailSheet only opens ApplyRecipeDialog, not RecipeFormSheet. The "Linked Recipes" section shows existing recipes but doesn't offer "Create Recipe for this unit."
   - What's unclear: Whether D-03/D-10 imply adding a "Create Recipe" button to UnitDetailSheet, or if this is only for future use.
   - Recommendation: Implement the props on RecipeFormSheet now (D-10), but only wire them up at call sites where the button already exists. If no current call site passes unit context, the props exist for future use. The RecipesPage call site has no unit context, so it won't use them.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `RecipeFormSheet.tsx`, `ApplyRecipeDialog.tsx`, `UnitDetailSheet.tsx`, `recipeSchema.ts`, `command.tsx`, `AppLayout.tsx`, `RecipesPage.tsx`, `AppliedRecipesTab.tsx`
- Project STATE.md accumulated decisions (freeze defaults at open time)
- CONTEXT.md decisions D-01 through D-10

### Secondary (MEDIUM confidence)
- cmdk `CommandGroup` heading behavior inferred from shadcn/ui wrapper passing all props to `CommandPrimitive.Group` [ASSUMED: A1]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing codebase patterns
- Architecture: HIGH -- straightforward prop threading with well-understood React patterns
- Pitfalls: HIGH -- identified from codebase inspection of existing form reset behavior

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (stable -- no external dependencies)
