---
phase: 143
plan: 03
subsystem: ui-apply-flow
tags: [apply-flow, slot-fill, technique-library, recipe-editor, dialog, badge]
dependency_graph:
  requires: [143-02]
  provides: [143-04]
  affects: [recipe editor, RecipeSectionCard, RecipeSectionList, RecipeStepList, PaintCombobox]
tech_stack:
  added: []
  patterns: [Radix Dialog portal (P6 avoidance), hook-free outer shell (test isolation), enabled-by-id read hook, render-props pattern for hook-bearing sub-tree]
key_files:
  created:
    - src/features/recipes/TechniquePickerCard.tsx
    - src/features/recipes/TechniquePickerDialog.tsx
    - src/features/recipes/SlotFillRow.tsx
    - src/features/recipes/SlotFillDialog.tsx
    - src/features/recipes/TechniqueSectionBadge.tsx
  modified:
    - src/features/recipes/RecipeSectionCard.tsx
    - src/features/recipes/RecipeSectionList.tsx
    - src/features/recipes/RecipeStepList.tsx
    - src/features/recipes/RecipeFormSheet.tsx
    - src/features/recipes/PaintCombobox.tsx
    - src/hooks/useTechniqueInstances.ts
    - src/types/recipe.ts
    - src/types/recipeSection.ts
    - src/features/recipes/recipeSection.ts
decisions:
  - "RecipeSectionList outer shell is hook-free (no React Query hooks) to preserve existing tests without QueryClient; TechniqueNameResolver + TechniqueControls sub-components carry the hooks and are only mounted when recipeId is defined"
  - "RecipeSection.technique_instance_id added as optional (not required) to avoid breaking ~15 test fixtures that build RecipeSection objects without the new column"
  - "PaintCombobox extended with optional aria-label and placeholder props for slot-fill accessibility (SLOT-06)"
  - "useInstancesForRecipe read hook added to useTechniqueInstances.ts (enabled-by-id pattern)"
metrics:
  duration: "~40 minutes"
  completed: "2026-06-22"
  tasks_completed: 3
  files_changed: 14
---

# Phase 143 Plan 03: Apply Flow & Slot-Fill System — UI Layer Summary

Built the complete picker → slot-fill → insert flow in the recipe section editor: TechniquePickerCard + TechniquePickerDialog (browse/search/preview), SlotFillRow + SlotFillDialog (per-slot paint assignment, empty-slot-allowed, mutation with toasts + Loader2), TechniqueSectionBadge ("from technique X"), RecipeSectionCard locked-section rendering, and wired the "Add technique" toolbar button into RecipeSectionList with both dialogs mounted as Radix Dialog portals.

## What Was Built

**TechniquePickerCard (APPLY-01)**
- Clickable card: technique name (text-sm font-medium) + slot_count + step_count with Layers/ListChecks icons
- bg-accent when selected, hover:bg-accent/50 otherwise; cursor-pointer; aria-pressed

**TechniquePickerDialog (APPLY-01/02)**
- DialogContent max-w-lg; exact "Add technique" title + description copy per UI-SPEC
- Two-column layout: left = CommandInput-style search Input + ScrollArea h-64 with TechniquePickerCard list; right w-52 = read-only preview panel (hidden when nothing selected)
- Preview panel: colour slots (name + role_hint) + section/step tree via useTechniqueColourSlots + useTechniqueSections + useTechniqueSteps
- Skeleton rows for loading; empty-library and empty-search states with exact copy strings
- Footer: "Close picker" (outline) + "Next: Fill slots" (disabled until selection); useEffect resets selectedId + search on open
- Does NOT call applyTechnique — hands TechniqueWithCounts to parent

**SlotFillRow (SLOT-06)**
- flex items-center gap-3 rounded-md border p-2
- Left: w-36 shrink-0 — slot.name (text-sm font-medium) + role_hint ?? "No hint" (text-xs text-muted-foreground)
- Swatch: h-4 w-4 rounded-full filled with hex_color when assigned, border-dashed otherwise (aria-hidden)
- PaintCombobox with aria-label + placeholder="Assign paint (optional)"; onCreateNew omitted

**SlotFillDialog (APPLY-03, SLOT-05/06)**
- DialogContent max-w-md; exact title + description copy
- One SlotFillRow per slot; ScrollArea when >6 slots; no-slots body copy when empty
- Local Map<slotId, paintId|null> state seeded from slots (default null); reset on open
- NO validation gate on empty slots (SLOT-05: unassigned is valid — dashed swatch, never red)
- "Apply technique" calls useApplyTechnique.mutateAsync; toast.success / toast.error; Loader2 animate-spin while isPending
- "Back to picker" → onBack

**TechniqueSectionBadge (APPLY-04)**
- shadcn Badge variant="secondary" + BookOpen h-3 w-3 + "from {techniqueName}"; max-w-[200px] truncate
- Display-only in editor (no onNavigate); interactive button when onNavigate provided (Plan 04)

**RecipeSectionCard — technique-owned lock**
- When techniqueName prop is defined: no drag handle, no delete button, name Input disabled, TechniqueSectionBadge rendered
- RecipeStepList receives isLocked=true: pointer-events-none opacity-60, "Add step" hidden

**RecipeSectionList — "Add technique" toolbar + dialog wiring**
- Outer shell is hook-free (preserves existing tests without QueryClient)
- TechniqueNameResolver sub-component (only when recipeId defined): loads useInstancesForRecipe + useTechniquesWithCounts to build instance_id → technique_name map
- TechniqueControls sub-component: mounts TechniquePickerDialog + SlotFillDialog via Radix portals
- "Add technique" ghost button (BookOpen icon) opens picker; insertAfterSectionIndex = sections.length

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RecipeSection.technique_instance_id added as optional**
- **Found during:** Task 1 — first build attempt
- **Issue:** Adding `technique_instance_id: number | null` (required) to `RecipeSection` broke ~15 test fixture objects that omitted the new column. With strict TypeScript, `undefined is not assignable to number | null`.
- **Fix:** Marked as `technique_instance_id?: number | null` (optional) — matches SQLite behavior where the column was added via ALTER TABLE (existing rows have NULL, TypeScript `?` expresses this correctly).
- **Files modified:** `src/types/recipeSection.ts`
- **Commit:** a3ba4eb0

**2. [Rule 2 - Missing functionality] PaintCombobox extended with aria-label + placeholder**
- **Found during:** Task 2 — SlotFillRow needs aria-label for slot accessibility (SLOT-06) and "Assign paint (optional)" placeholder per UI-SPEC
- **Fix:** Added optional `aria-label` and `placeholder` props to PaintComboboxProps; forwarded to the trigger Button.
- **Files modified:** `src/features/recipes/PaintCombobox.tsx`
- **Commit:** 2dff455e

**3. [Rule 1 - Bug] Paint type uses hex_color not color_hex**
- **Found during:** Task 2 — SlotFillRow swatch used `paint.color_hex` from UI-SPEC pseudocode but actual Paint type has `hex_color`
- **Fix:** Changed swatch style to use `paint.hex_color` per `src/types/paint.ts`.
- **Files modified:** `src/features/recipes/SlotFillRow.tsx`
- **Commit:** 2dff455e

**4. [Rule 1 - Bug] RecipeSectionList hooks broke existing tests**
- **Found during:** Task 3 — adding `useInstancesForRecipe` + `useTechniquesWithCounts` directly in RecipeSectionList caused existing FORM-02 tests to fail (components rendered without QueryClient context)
- **Fix:** Refactored to hook-free outer shell + hook-bearing sub-components (`TechniqueNameResolver`, `TechniqueControls`) mounted only when recipeId is defined. Render-props pattern passes the name map to the card list.
- **Files modified:** `src/features/recipes/RecipeSectionList.tsx`
- **Commit:** a0a52f0b

## Human UAT (deferred)

The following UAT steps are deferred to the phase-end checkpoint (per autonomous run protocol):

1. Run `pnpm tauri dev`.
2. Open a recipe in the editor (Recipes → open a recipe → edit). Click "Add technique" in the section toolbar.
3. Confirm the picker Dialog opens (NOT a Sheet), search filters the technique list, and selecting a technique shows a read-only preview of its colour slots and section/step tree.
4. Click "Next: Fill slots". Confirm one row per colour slot with: slot name, role hint, a swatch (dashed when empty), and the paint combobox. Leave at least one slot empty.
5. Click "Apply technique". Confirm the toast "Technique applied." and that a new recipe section appears with a "from technique X" badge, a disabled name input, and no drag handle / delete button.
6. Confirm the technique's steps render read-only inside that section.
7. Apply the SAME technique a second time — confirm a second independent badged section is added.
8. Save the recipe, reopen it in the editor — confirm the technique sections/steps are intact (the saveRecipeGraph guard did not delete or overwrite them).

Resume signal: Type "approved" or describe issues (e.g. dialog nested in Sheet, swatch wrong, empty-slot blocked, steps editable, badge missing).

## Threat Flag Scan

No new network endpoints, auth paths, or trust boundary crossings introduced. T-143-06 (Dialog P6 pitfall) mitigated: TechniquePickerDialog + SlotFillDialog use Radix `DialogPortal` — they render at `document.body` level regardless of mount position in the React tree.

## Known Stubs

None — all exports are fully implemented.

## Self-Check: PASSED

Files exist:
- `src/features/recipes/TechniquePickerCard.tsx` — FOUND
- `src/features/recipes/TechniquePickerDialog.tsx` — FOUND
- `src/features/recipes/SlotFillRow.tsx` — FOUND
- `src/features/recipes/SlotFillDialog.tsx` — FOUND
- `src/features/recipes/TechniqueSectionBadge.tsx` — FOUND

Commits exist:
- a3ba4eb0 — feat(143-03): TechniquePickerCard + TechniquePickerDialog (APPLY-01/02)
- 2dff455e — feat(143-03): SlotFillRow + SlotFillDialog (APPLY-03, SLOT-05/06)
- a0a52f0b — feat(143-03): wire add-technique flow + badge/lock technique sections (APPLY-01/04)
