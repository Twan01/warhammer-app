# Phase 63: Applied Recipe UX - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase builds the UI layer for applied recipes — letting users assign recipes to units from either direction (unit→recipe or recipe→units), track per-unit step progress via a sectioned checklist, view completion percentages, and bulk-apply a recipe to multiple units. All data operations use the Phase 62 data layer (hooks, queries, types). No schema changes, no new tables, no new pure functions.

</domain>

<decisions>
## Implementation Decisions

### Assignment Entry Points (AR-02)
- **D-01:** "Apply Recipe" action available from **both** UnitDetailSheet (pick a recipe to apply) and RecipeDetailSheet (pick unit(s) to apply to). Both entry points use the same assignment hooks from Phase 62.
- **D-02:** UnitDetailSheet entry: "Apply Recipe" button opens a Dialog with a recipe picker (searchable by name, filterable by faction). Selecting a recipe shows a read-only SectionedTimeline preview of its sections/steps. Confirm applies the recipe.
- **D-03:** RecipeDetailSheet entry: "Apply to Unit(s)" button opens a Dialog with a unit multi-select for bulk application (see D-10 below for bulk flow).

### Recipe Preview Before Apply (AR-02)
- **D-04:** Preview displayed in a Dialog (not a nested Sheet) showing the recipe's sections and steps in read-only format. Reuses existing `SectionedTimeline` component.
- **D-05:** Preview is mandatory before confirming — user must see what they're committing to. No skip option.

### Step Checklist Layout (AR-03, AR-04)
- **D-06:** Per-unit applied recipe progress displayed as a **sectioned accordion with checkboxes**. Each section is a collapsible Accordion item showing section name + "X/Y completed" badge in the trigger.
- **D-07:** Inside each section, steps render as Checkbox rows. Toggling a checkbox calls `useToggleStepProgress` with the step's order_index.
- **D-08:** Overall progress shown as a Progress bar at the top with completion percentage (from `computeAssignmentProgress`). Per-section breakdown from `bySectionId` Map drives the section badges.
- **D-09:** Flat recipes (no sections) display as a simple checklist without accordion — just checkboxes in a list.

### Bulk Apply Flow (AR-07)
- **D-10:** Bulk apply initiated from RecipeDetailSheet via "Apply to Unit(s)" button. Opens a Dialog with searchable, filterable unit multi-select (faction filter, name search).
- **D-11:** Already-assigned units are visually dimmed and disabled in the picker to prevent duplicate assignments (backed by UNIQUE constraint on unit_id + recipe_id).
- **D-12:** Confirmation shows count of selected units and recipe name before calling `useBulkCreateAssignments`.

### Progress Display on Unit Detail (AR-04)
- **D-13:** UnitDetailSheet gets a new tab or section showing all applied recipes for that unit, each with its progress bar and percentage. Clicking an applied recipe expands to the step checklist (D-06).
- **D-14:** If a unit has no applied recipes, show an empty state with "Apply Recipe" CTA.

### Claude's Discretion
- Whether to add applied recipes as a new Tab in UnitDetailSheet (alongside Playbook/Journal) or as a section within the existing overview area
- Delete/remove assignment UX (trash icon, swipe, confirmation dialog)
- Exact layout of the recipe picker dialog (combobox vs list vs card grid)
- Loading and error states for all new components
- Whether to show "last completed step" or "next step" as a quick summary on the applied recipe card

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 62 Data Layer (MUST READ — provides all hooks and types)
- `src/types/recipeAssignment.ts` — RecipeAssignment, StepProgress, AssignmentProgress types
- `src/hooks/useRecipeAssignments.ts` — 7 hooks: useAssignmentsByUnit, useCreateAssignment, useDeleteAssignment, useStepProgress, useToggleStepProgress, useBulkCreateAssignments
- `src/db/queries/recipeAssignments.ts` — 8 CRUD functions backing the hooks
- `src/lib/computeAssignmentProgress.ts` — Pure function returning overall + per-section breakdown

### Recipe Display Components (reusable in preview)
- `src/features/recipes/SectionedTimeline.tsx` — Read-only section display with metadata badges (reuse for preview)
- `src/features/recipes/RecipeStepTimeline.tsx` — Flat step timeline (fallback for unsectioned recipes)
- `src/features/recipes/RecipeDetailSheet.tsx` — Recipe detail (entry point for "Apply to Units" action)

### Unit Detail (integration target)
- `src/features/units/UnitDetailSheet.tsx` — Unit detail with Tabs (entry point for "Apply Recipe" action)
- `src/features/units/PlaybookTab.tsx` — Existing tab pattern to follow for new applied recipes tab
- `src/features/units/JournalTab.tsx` — Existing tab pattern reference

### Recipe Data Types
- `src/types/recipe.ts` — PaintingRecipe interface
- `src/types/recipePaint.ts` — RecipeStep with order_index and section_id
- `src/types/recipeSection.ts` — RecipeSection, SECTION_TYPES const arrays
- `src/types/unit.ts` — Unit interface

### Existing Patterns
- `src/hooks/useRecipeSections.ts` — Section query hooks (needed to load sections for preview)
- `src/hooks/useRecipePaints.ts` — Step query hooks (needed to load steps for checklist)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SectionedTimeline` (src/features/recipes/): Read-only section/step display — reuse directly for recipe preview in assignment dialog
- `RecipeStepTimeline` (src/features/recipes/): Flat step display for unsectioned recipes
- `computeAssignmentProgress` (src/lib/): Returns bySectionId Map — drives section badges
- `Progress` component (src/components/ui/): shadcn progress bar for completion percentage
- `Accordion` component (src/components/ui/): For collapsible sections in checklist
- `Checkbox` component (src/components/ui/): For step toggle rows
- `Dialog` component (src/components/ui/): For assignment flow (not nested Sheets)

### Established Patterns
- Tabs in UnitDetailSheet: Overview / Playbook / Journal — extend with Applied Recipes tab
- Sheet-based detail views with action buttons in SheetFooter
- Badge for status/count display (e.g., "3/12 completed")
- Toast notifications for mutation success/error
- Empty state components (RecipeEmptyState, CollectionEmptyState) — follow same pattern
- Faction-based filtering in dropdowns (FactionCombobox pattern)

### Integration Points
- UnitDetailSheet: Add "Apply Recipe" button + applied recipes tab/section
- RecipeDetailSheet: Add "Apply to Unit(s)" button in SheetFooter
- CollectionPage: No changes needed — bulk select is from recipe side, not collection side

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the roadmap success criteria. Auto-mode selected recommended defaults for all gray areas based on existing codebase patterns and Phase 62 data layer design.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 63-Applied Recipe UX*
*Context gathered: 2026-05-13*
