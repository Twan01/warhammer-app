# Phase 102: Smart Context Pre-Filling - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Opening a recipe form or recipe picker in the context of a specific unit or faction automatically pre-populates the relevant fields — reducing the most common redundant selections to zero clicks. Two surfaces affected: RecipeFormSheet (recipe creation) and ApplyRecipeDialog (recipe picker). No new database changes — this is pure UI/prop-threading work.

</domain>

<decisions>
## Implementation Decisions

### Faction Pre-Fill Source (SCP-01)
- **D-01:** When RecipeFormSheet is opened from a unit context (e.g., UnitDetailSheet), pre-fill `faction_id` from the unit's own `faction_id` — NOT from FactionContext. The unit's faction is the correct context; FactionContext is a global UI state for theming/navigation that may not match.
- **D-02:** When RecipeFormSheet is opened from the global QuickAdd (no unit context), do NOT pre-fill faction. QuickAdd is intentionally context-free.
- **D-03:** The `unit_id` field should also be pre-filled when opening from a unit context, since the unit is already known.

### ApplyRecipeDialog Grouping (SCP-02)
- **D-04:** ApplyRecipeDialog receives the target unit's `faction_id` as a new prop. Recipes are displayed in two groups: "Suggested" (recipes matching the unit's faction) above, "Other" (all remaining recipes) below. Both groups remain selectable.
- **D-05:** Within each group, maintain the current search/filter behavior. The Command palette structure stays, just add group headers.
- **D-06:** If the unit has no faction (faction_id is null), show all recipes in a single flat list (current behavior).

### Pre-Fill Editability (SCP-03)
- **D-07:** Pre-filled fields use standard form controls with values pre-populated. No special visual treatment (no "auto-filled" badges or highlights). The user naturally understands a populated dropdown is changeable.
- **D-08:** All pre-filled values are fully editable — the user can clear, change, or override any auto-filled field without restriction.

### Entry Point Routing
- **D-09:** Only unit-context entry points (UnitDetailSheet "Apply Recipe" button, and any future unit-context recipe creation) carry faction/unit context. Global entry points (QuickAdd, Recipes page toolbar) remain context-free.
- **D-10:** RecipeFormSheet gains optional `defaultFactionId` and `defaultUnitId` props. When provided, the form initializes with those values. When absent, behavior is unchanged (null defaults).

### Claude's Discretion
- How to thread faction_id through to ApplyRecipeDialog — could add a prop or read from the unit query already in UnitDetailSheet
- Whether to memoize the suggested/other grouping or compute inline — optimize for clarity first
- Test strategy for pre-fill behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — SCP-01, SCP-02, SCP-03 requirement definitions
- `.planning/ROADMAP.md` §Phase 102 — Success criteria (3 acceptance checks)

### Key Source Files
- `src/features/recipes/RecipeFormSheet.tsx` — Recipe creation/edit form; currently has no faction pre-fill mechanism. Fields: name, faction_id, unit_id, area, notes, etc.
- `src/features/recipes/ApplyRecipeDialog.tsx` — Recipe picker dialog; currently shows all recipes in flat Command palette. Props: `{ open, unitId, onClose }`
- `src/features/units/UnitDetailSheet.tsx` — Primary entry point for both components; has access to `unit.faction_id` (line 52)
- `src/context/ActiveFactionContext.tsx` — FactionContext provider; exposes `activeFactionId` — NOT used for pre-fill (D-01)
- `src/features/recipes/recipeSchema.ts` — Zod schema for recipe form; `faction_id` and `unit_id` are nullable number fields
- `src/types/recipe.ts` — PaintingRecipe interface with `faction_id: number | null`
- `src/components/common/AppLayout.tsx` — Contains QuickAdd context; entry point for global recipe creation

### Prior Phase Context
- `.planning/phases/100-query-layer-automation/100-CONTEXT.md` — Phase 100 decisions (no direct dependencies for Phase 102, but shared milestone context)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecipeFormSheet` already has `faction_id` and `unit_id` form fields — just needs default values from props
- `ApplyRecipeDialog` already shows faction badge per recipe (line 120-124) — grouping builds on existing faction awareness
- `UnitDetailSheet` already queries the full unit object with `faction_id` — no extra DB query needed
- `useFactions()` hook already available for faction name lookups in group headers

### Established Patterns
- Sheet/Dialog components use `{ open, onClose, ...contextProps }` prop pattern
- Form defaults set via `useForm({ defaultValues: ... })` in React Hook Form
- Command palette (cmdk) used for searchable lists — supports groups natively via `CommandGroup`

### Integration Points
- `UnitDetailSheet` → `RecipeFormSheet`: Pass `defaultFactionId={unit.faction_id}` and `defaultUnitId={unit.id}` when opening recipe creation from unit context
- `UnitDetailSheet` → `ApplyRecipeDialog`: Pass `factionId={unit.faction_id}` as new prop for grouping
- `RecipeFormSheet` internal: Use `defaultFactionId` prop in `useForm({ defaultValues: { faction_id: defaultFactionId ?? null } })`
- `ApplyRecipeDialog` internal: Split recipe list into two `CommandGroup` components based on faction match

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All behavior is defined by the success criteria and decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 102-Smart Context Pre-Filling*
*Context gathered: 2026-05-28*
