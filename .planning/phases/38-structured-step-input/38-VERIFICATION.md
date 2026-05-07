---
phase: 38-structured-step-input
verified: 2026-05-07T12:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Create a new recipe with structured steps"
    expected: "Step row shows painting_phase dropdown + title input + PaintCombobox on line 1; tool/technique/dilution/time grid on line 2; Recipe Steps header updates with time sum (e.g. ~15 min)"
    why_human: "Two-line layout and Select dropdown rendering require visual inspection in the Tauri window"
  - test: "Edit mode round-trip — re-open a saved recipe"
    expected: "All step fields (painting_phase, tool, technique, dilution, time_estimate_minutes) are pre-populated from the database"
    why_human: "Edit-mode hydration correctness requires live DB round-trip to verify data is read back correctly"
  - test: "Drag-and-drop step reorder persists after save"
    expected: "After dragging step 2 above step 1, saving, closing, and re-opening, the new order is preserved"
    why_human: "Order persistence after a full remove+re-add cycle requires a live Tauri session to confirm"
  - test: "Old STEP_SUGGESTIONS datalist is gone"
    expected: "Typing in the title field (line 1, center input) shows no autocomplete for 'Primer', 'Basecoat', etc."
    why_human: "Browser datalist suppression is a runtime behavior that cannot be verified by static analysis"
---

# Phase 38: Structured Step Input — Verification Report

**Phase Goal:** Users can build a recipe step-by-step with all relevant painting detail — paint link, phase label, tool, technique, dilution, and time estimate — and reorder steps via drag-and-drop
**Verified:** 2026-05-07T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DraftStep type carries all 9 non-localId fields including painting_phase, tool, technique, dilution, time_estimate_minutes | VERIFIED | `recipeSteps.ts` lines 3-13: all 5 fields typed as `string \| null` or `number \| null` |
| 2 | makeDraftStep() initializes all 5 new fields to null | VERIFIED | `recipeSteps.ts` lines 22-26: explicit `null` initializers for all 5 fields |
| 3 | PAINTING_PHASES const array exported from recipeSchema.ts with 10 phase values | VERIFIED | `recipeSchema.ts` lines 25-29: 10 values ("prime" through "other") plus `PaintingPhase` type |
| 4 | addRecipePaint INSERT writes all 10 columns to recipe_steps table | VERIFIED | `recipePaints.ts` lines 15-23: 10-column INSERT with `$1..$10` positional placeholders and `?? null` guards |
| 5 | computeOrderIndex still spreads all DraftStep fields after extension | VERIFIED | `recipeSteps.ts` line 32: `{ ...s, order_index: i }` spread pattern confirmed; test at `recipeSteps.test.ts` lines 100-112 explicitly verifies spread preserves new fields |
| 6 | RecipeStepRow renders two-line layout with painting_phase Select, tool/technique/dilution/time inputs | VERIFIED | `RecipeStepRow.tsx` lines 56-120: line 1 flex (Select + flex-1 Input + w-40 PaintCombobox), line 2 grid-cols-4 (tool/technique/dilution/time), line 3 notes |
| 7 | RecipeFormSheet passes real DraftStep values on save (not null) in both edit and create branches | VERIFIED | `RecipeFormSheet.tsx` lines 217-221 (edit branch) and 260-264 (create branch): all 5 fields use `s.painting_phase`, `s.tool`, etc. — no `null` literals remain |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/recipes/recipeSchema.ts` | PAINTING_PHASES const array and PaintingPhase type | VERIFIED | Lines 25-29; 10 values, const-asserted, type exported |
| `src/features/recipes/recipeSteps.ts` | Extended DraftStep interface with 5 new fields | VERIFIED | Lines 3-13; all 5 fields typed nullable; makeDraftStep() initializes all |
| `src/db/queries/recipePaints.ts` | 10-column INSERT for recipe_steps | VERIFIED | Lines 15-23; `$10` placeholder present; all 5 new columns wired |
| `tests/painting/recipeSteps.test.ts` | Tests for new DraftStep fields and makeDraftStep initialization | VERIFIED | Lines 84-113: `STEP-01/03/04` describe block with 6 tests; `computeOrderIndex preserves new fields` test passes |
| `src/features/recipes/RecipeStepRow.tsx` | Two-line step row with painting_phase Select, tool/technique/dilution/time inputs | VERIFIED | Full two-line layout implemented; PAINTING_PHASES imported; __none__ sentinel pattern used |
| `src/features/recipes/RecipeFormSheet.tsx` | Edit-mode hydration, real values on save, time sum display | VERIFIED | `formatMinutes` at line 98; `totalMinutes` useMemo at line 132; hydration at lines 147-151; onSubmit at 217-221 and 260-264 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `RecipeStepRow.tsx` | `recipeSteps.ts` | `DraftStep` type with all 9 non-localId fields | WIRED | `step.painting_phase`, `step.tool`, `step.technique`, `step.dilution`, `step.time_estimate_minutes` all referenced in onChange handlers (lines 59, 91, 98, 105, 116) |
| `RecipeStepRow.tsx` | `recipeSchema.ts` | PAINTING_PHASES import for Select dropdown | WIRED | `import { PAINTING_PHASES } from "./recipeSchema"` at line 14; `PAINTING_PHASES.map` at line 66 |
| `RecipeFormSheet.tsx` | `useRecipePaints.ts` | `addRecipePaint.mutateAsync` with all 10 fields | WIRED | Both call sites (lines 211-222 and 254-266) pass all 10 fields including 5 new ones with real DraftStep values |
| `RecipeFormSheet.tsx` | edit-mode hydration | useEffect maps all 9 DraftStep fields from existingSteps | WIRED | `useEffect` at lines 138-158 maps all 9 fields; `painting_phase: s.painting_phase ?? null` pattern used |
| `RecipeStepList.tsx` | `@dnd-kit/sortable` | `arrayMove` reorders steps array on drag end | WIRED | `arrayMove` at line 39 in `handleDragEnd`; order committed via `computeOrderIndex` on submit |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STEP-01 | 38-01, 38-02 | User can add/edit/delete steps with title, phase (prime/basecoat/shade/.../other), and paint link | SATISFIED | `RecipeStepRow.tsx`: painting_phase Select with 10 PAINTING_PHASES values; step_name Input; PaintCombobox; delete Button with `onRemove` |
| STEP-02 | 38-01, 38-02 | User can reorder steps via drag-and-drop (reuses @dnd-kit) | SATISFIED | `RecipeStepList.tsx`: DndContext + SortableContext + `arrayMove` on drag end; `RecipeStepRow.tsx`: `useSortable` with grip handle; `computeOrderIndex` assigns `order_index` from array position on submit |
| STEP-03 | 38-01, 38-02 | User can set tool, dilution, and technique per step | SATISFIED | `RecipeStepRow.tsx` lines 87-105: tool Input with `list="tool-suggestions"` datalist, technique Input with `list="technique-suggestions"` datalist, dilution Input; all wire to `DraftStep` fields and persist via `addRecipePaint` |
| STEP-04 | 38-01, 38-02 | User can set time estimate per step (minutes), which rolls up to recipe total | SATISFIED | `RecipeStepRow.tsx` lines 107-120: number Input with `Math.round()` guard; `RecipeFormSheet.tsx` lines 132-135: `totalMinutes` useMemo sums all `time_estimate_minutes`; lines 588-591: displayed conditionally next to "Recipe Steps" header |

No orphaned requirements found — all 4 STEP-xx IDs mapped to this phase in REQUIREMENTS.md are claimed and satisfied by Plans 01 and 02.

---

### Anti-Patterns Found

No blockers or warnings detected.

- No `STEP_SUGGESTIONS` datalist or `list="recipe-step-suggestions"` remains in any recipe file.
- No `painting_phase: null` / `tool: null` hardcoded literals remain in `RecipeFormSheet.tsx` `onSubmit`.
- No `TODO`, `FIXME`, `HACK`, or stub `return null` patterns found in modified files.
- `Math.round()` guard prevents float values from reaching the SQLite INTEGER column for `time_estimate_minutes`.

---

### Human Verification Required

#### 1. Create a new recipe with structured steps

**Test:** Run `pnpm tauri dev`. Open RecipeFormSheet via "New Recipe". Add a step. Verify line 1 shows painting_phase Select (7.5rem wide) + flex-1 title input (no autocomplete for "Primer"/"Basecoat" etc.) + PaintCombobox. Verify line 2 shows a 4-column grid: tool input (with datalist suggestions), technique input (with datalist suggestions), dilution input, time number input. Set time to "15" and verify the "Recipe Steps" header updates to "~15 min".
**Expected:** Two-line layout renders correctly; header shows time sum; old datalist suggestions absent from title field.
**Why human:** Visual layout and datalist suppression cannot be verified by static analysis.

#### 2. Edit mode field preservation

**Test:** Save a recipe with steps that have painting_phase, tool, technique, dilution, and time_estimate_minutes set. Close and re-open the recipe via the edit flow.
**Expected:** All 5 new fields are pre-populated in the form from the database.
**Why human:** Requires a live DB round-trip — the edit-mode hydration useEffect depends on `existingSteps` data from SQLite which cannot be tested statically.

#### 3. Drag-and-drop order persistence

**Test:** Open a recipe with 2+ steps. Drag step 2 above step 1 using the grip handle icon. Save. Close and re-open.
**Expected:** The new step order is preserved after save/reload.
**Why human:** Order persistence requires a real Tauri session with SQLite writes and the remove+re-add cycle completing successfully.

---

### Gaps Summary

No gaps found. All 7 observable truths are verified, all 6 artifacts exist and are substantive, all 5 key links are fully wired, and all 4 requirement IDs (STEP-01 through STEP-04) are satisfied.

4 items require human verification in a live `pnpm tauri dev` session: visual layout, edit-mode round-trip, drag-and-drop persistence, and datalist removal confirmation. These are behavioral/visual checks that static analysis cannot substitute for.

---

_Verified: 2026-05-07T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
