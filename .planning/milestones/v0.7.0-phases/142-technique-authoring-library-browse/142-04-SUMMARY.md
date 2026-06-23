---
phase: 142-technique-authoring-library-browse
plan: "04"
subsystem: technique-library
tags: [browse-ui, card-grid, detail-sheet, delete-dialog, filter, tabs, rtl-tests, green-tests, wave-4]
dependency_graph:
  requires: [142-03]
  provides: [TechniqueCard, TechniqueCardGrid, TechniqueDetailSheet, TechniqueDeleteDialog, TechniqueLibraryTab, applyTechniqueFilters, RecipesPage-tabs]
  affects: [143-01]
tech_stack:
  added: []
  patterns: [recipe-analog, shadcn-tabs, card-grid-skeleton, detail-sheet-field-helper, usage-count-dialog]
key_files:
  created:
    - src/features/techniques/applyTechniqueFilters.ts
    - src/features/techniques/TechniqueCard.tsx
    - src/features/techniques/TechniqueCardGrid.tsx
    - src/features/techniques/TechniqueEmptyState.tsx
    - src/features/techniques/TechniqueDeleteDialog.tsx
    - src/features/techniques/TechniqueDetailSheet.tsx
    - src/features/techniques/TechniqueLibraryTab.tsx
    - tests/techniques/TechniqueCard.test.tsx
    - tests/techniques/TechniqueDetailSheet.test.tsx
    - tests/techniques/TechniqueDeleteDialog.test.tsx
    - tests/techniques/TechniqueLibraryTab.test.tsx
  modified:
    - src/features/recipes/RecipesPage.tsx
decisions:
  - "TechniqueDetailSheet renders step tree manually (section/step loop) rather than reusing SectionedTimeline — SectionedTimeline is typed for RecipeSection (with section_id field) and RecipeStep (with paint_id/step_photo_path), both absent from TechniqueSection/TechniqueStep"
  - "TechniqueLibraryTab converts TechniqueWithCounts to Technique inline via toTechnique() helper for props requiring the base Technique type — avoids a parallel union type"
  - "RecipesPage PageHeader 'Add Recipe' button conditionally rendered only when activeTab === 'recipes' — prevents a floating CTA while on the Techniques tab"
  - "TechniqueCard click test uses getByLabelText('View OSL Glow') rather than getByRole('article') — Card renders as a div, not an article element"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-06-21"
  tasks_completed: 4
  tasks_total: 4
  files_created: 11
  files_modified: 1
requirements: [TECH-03, TECH-05, LIB-01, LIB-02, LIB-03, LIB-04]
---

# Phase 142 Plan 04: Technique Library Browse Surface Summary

Seven new components and one modified page deliver the technique library browse surface as a second tab on the /recipes page. The plan-01 RED stub (applyTechniqueFilters) is now GREEN, and all four RTL test files pass. Full pnpm test suite: 329 files / 2983 tests GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | applyTechniqueFilters + TechniqueCard + TechniqueCardGrid + EmptyState + card test | 4675f20a | src/features/techniques/applyTechniqueFilters.ts, TechniqueCard.tsx, TechniqueCardGrid.tsx, TechniqueEmptyState.tsx, tests/techniques/TechniqueCard.test.tsx |
| 2 | TechniqueDetailSheet + TechniqueDeleteDialog + RTL tests | 896e3af6 | src/features/techniques/TechniqueDetailSheet.tsx, TechniqueDeleteDialog.tsx, tests/techniques/TechniqueDetailSheet.test.tsx, TechniqueDeleteDialog.test.tsx |
| 3 | TechniqueLibraryTab + RecipesPage Tabs integration + tab test | e292c956 | src/features/techniques/TechniqueLibraryTab.tsx, src/features/recipes/RecipesPage.tsx, tests/techniques/TechniqueLibraryTab.test.tsx |
| 4 | Full-suite regression gate | (no commit — verification only) | — |

## What Was Built

**`applyTechniqueFilters.ts`** — Pure filter function: `nameFilter` (case-insensitive contains, whitespace trimmed) + `effectFilter` (exact match). Closes the plan-01 RED stub.

**`TechniqueCard.tsx`** — Library card showing name / effect+difficulty badges / slot+step counts (Layers icon) / usage line ("Not used yet" | "Used by N recipe(s)") / action row with Edit (Pencil), Duplicate (Copy), Delete (Trash2 text-destructive) ghost icon buttons. `aria-label="View {name}"` on container. `e.stopPropagation()` on action row. No swatch strip, no availability badge, no faction badge.

**`TechniqueCardGrid.tsx`** — Loading: 6 skeleton cards. Empty+unfiltered: `TechniqueEmptyState`. Empty+filtered: inline "No techniques match your filters." paragraph. Else: auto-fill grid (minmax 280px).

**`TechniqueEmptyState.tsx`** — "No techniques yet" heading + body copy + "Add Technique" CTA per Copywriting Contract.

**`TechniqueDeleteDialog.tsx`** — Usage-count-aware DialogDescription: 0 → permanent-remove copy; N → N recipe(s) warning with cascade note. "Keep Technique" (outline) cancel. "Deleting…" while `useDeleteTechnique.isPending`. Mirrors RecipeDeleteDialog exactly with `usageCount` prop added.

**`TechniqueDetailSheet.tsx`** — `SheetContent side="right" sm:max-w-md`. Three Field sections: Colour Slots (placeholder swatch circle + name + italic role_hint), Technique Steps (sectioned tree when sections > 0; flat list otherwise), Used by (recipe names list; "Not used by any recipes yet." when empty). Footer: Delete Technique (ghost text-destructive) + Duplicate Technique (outline + Copy, "Copy of {name}") + Edit Technique. Hooks: `useTechniqueColourSlots`, `useTechniqueSections`, `useTechniqueSteps`, `useTechniqueUsedByRecipes`, `useDuplicateTechnique`.

**`TechniqueLibraryTab.tsx`** — Self-contained tab component (no props). Local state: nameFilter, effectFilter, selectedTechnique/detailOpen, editing/formOpen, deleting/deleteOpen. Toolbar: Input "Search techniques…" + effect Select (RECIPE_EFFECTS) + "Add Technique" Button + conditional "Clear filters". Renders TechniqueCardGrid + TechniqueDetailSheet + TechniqueFormSheet (key on technique id) + TechniqueDeleteDialog. `useDuplicateTechnique` wired inline with "Copy of {name}" naming.

**`RecipesPage.tsx` (modified)** — Added `Tabs/TabsList/TabsTrigger/TabsContent` from shadcn; `useState<"recipes" | "techniques">("recipes")` for tab state. PageHeader unchanged (title/subtitle); "Add Recipe" action button conditionally hidden on techniques tab. Existing recipes body (filter bar + RecipeCardGrid + sheets) wrapped in `TabsContent value="recipes"`. New `TabsContent value="techniques"` renders `<TechniqueLibraryTab />`. No route change, no router.tsx or AppSidebar modification.

## RTL Test Coverage

| File | Tests | Requirements |
|------|-------|-------------|
| tests/techniques/TechniqueCard.test.tsx | 12 assertions | LIB-02 (counts, usage, badges, actions) |
| tests/techniques/TechniqueDetailSheet.test.tsx | 7 assertions | LIB-04 (used-by empty), TECH-05 (step tree) |
| tests/techniques/TechniqueDeleteDialog.test.tsx | 7 assertions | TECH-03 (usage-count description, buttons) |
| tests/techniques/TechniqueLibraryTab.test.tsx | 8 assertions | LIB-01 (tab renders), LIB-03 (name filter, case-insensitive, clear, filtered-empty) |

## Verification

- `pnpm test` full suite: 329 test files / 2983 tests GREEN (0 failures introduced)
- All technique test files GREEN: applyTechniqueFilters, techniqueSchema, TechniqueCard, TechniqueDetailSheet, TechniqueDeleteDialog, TechniqueLibraryTab (plan-01/02/03 data-layer tests unchanged green)
- `pnpm exec tsc --noEmit`: 0 new errors (1 pre-existing error in technique-progress-identity.test.ts unused variable, unchanged)
- RecipesPage is the only app-shell file modified; router.tsx and AppSidebar untouched

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TechniqueDetailSheet step tree rendered manually (not via SectionedTimeline)**
- **Found during:** Task 2 implementation
- **Issue:** `SectionedTimeline` requires `RecipeSection[]` (with `section_id` on steps) and `RecipeStep[]` (with `paint_id`, `step_photo_path`). `TechniqueSection` and `TechniqueStep` use `technique_section_id` and lack paint/photo fields — structural typing mismatch.
- **Fix:** Rendered a local section→step loop directly in TechniqueDetailSheet showing section name, step names, painting_phase/tool/dilution inline. Simple and correct.
- **Files modified:** src/features/techniques/TechniqueDetailSheet.tsx

**2. [Rule 1 - Bug] TechniqueCard.test.tsx click test used wrong role**
- **Found during:** Task 1 test run
- **Issue:** `screen.getByRole("article", { name: "View OSL Glow" })` failed — shadcn Card renders as `<div>` not `<article>`.
- **Fix:** Changed to `screen.getByLabelText("View OSL Glow")` which matches the `aria-label` on the Card container.
- **Files modified:** tests/techniques/TechniqueCard.test.tsx

**3. [Rule 2 - Missing functionality] RecipesPage "Add Recipe" button conditionally hidden**
- **Found during:** Task 3 implementation
- **Issue:** The existing "Add Recipe" button in `PageHeader.actions` floated above the Tabs control. When a user was on the Techniques tab, the "Add Recipe" button would still be visible — confusing UX.
- **Fix:** Added `activeTab === "recipes" ? <Button>...</Button> : undefined` conditional to `PageHeader.actions`. Keeps the CTA context-appropriate.
- **Files modified:** src/features/recipes/RecipesPage.tsx

## Known Stubs

None — all browse/filter/detail/delete/duplicate interactions wire to live data from plan-02 hooks. Usage counts read 0 this phase (no `recipe_technique_instances` until Phase 143) but the plumbing is correct: `useTechniqueUsedByRecipes`, `useTechniquesWithCounts().usage_count`, and the delete dialog `usageCount` prop all flow correctly.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. STRIDE T-142-08 (delete cascade warning) mitigated via TechniqueDeleteDialog showing usage count before confirming (per plan threat register).

## Self-Check: PASSED

Files exist:
- src/features/techniques/applyTechniqueFilters.ts — FOUND
- src/features/techniques/TechniqueCard.tsx — FOUND
- src/features/techniques/TechniqueCardGrid.tsx — FOUND
- src/features/techniques/TechniqueEmptyState.tsx — FOUND
- src/features/techniques/TechniqueDeleteDialog.tsx — FOUND
- src/features/techniques/TechniqueDetailSheet.tsx — FOUND
- src/features/techniques/TechniqueLibraryTab.tsx — FOUND
- tests/techniques/TechniqueCard.test.tsx — FOUND
- tests/techniques/TechniqueDetailSheet.test.tsx — FOUND
- tests/techniques/TechniqueDeleteDialog.test.tsx — FOUND
- tests/techniques/TechniqueLibraryTab.test.tsx — FOUND

Commits exist:
- 4675f20a — feat(142-04): applyTechniqueFilters + TechniqueCard + TechniqueCardGrid + EmptyState + card test (GREEN)
- 896e3af6 — feat(142-04): TechniqueDetailSheet + TechniqueDeleteDialog + RTL tests (GREEN)
- e292c956 — feat(142-04): TechniqueLibraryTab + RecipesPage Tabs integration + tab test (GREEN)
