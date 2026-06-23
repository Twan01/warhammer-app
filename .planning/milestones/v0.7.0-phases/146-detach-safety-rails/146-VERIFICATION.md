---
phase: 146-detach-safety-rails
verified: 2026-06-23T08:35:00Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Apply a technique to a recipe, then open the editor. Click the Unlink icon adjacent to the 'From {technique}' badge. Verify the AlertDialog opens with title 'Detach technique?', the locked warning copy, and buttons labelled 'Keep link' and 'Detach'."
    expected: "Dialog appears with correct copy, 'Detach' button is enabled, 'Keep link' button dismisses the dialog."
    why_human: "AlertDialog rendering, exact copy, and button state require visual inspection in the running app."
  - test: "With the AlertDialog open, click 'Detach'. Observe the toast and confirm the section re-renders as plain editable content (badge and Unlink button gone, name input enabled, drag handle reappears)."
    expected: "Toast reads 'Technique detached — now plain recipe content'. The section loses its badge and Unlink affordance. The recipe's step and colour data are intact."
    why_human: "Post-detach UI state and toast appearance require end-to-end observation in the running app."
  - test: "In the technique library, select a technique that is live-linked to at least one recipe. Click the delete action. Verify the TechniqueDeleteDialog shows Case B copy ('live-linked to N recipe(s)', 'Detaching will bake…', 'No recipe content will be lost.') and the confirm button reads 'Detach N recipe(s) & delete'."
    expected: "Dialog shows honest consequence count sourced from a live query (not the stale usage_count). Confirm button is pluralised correctly."
    why_human: "Dialog copy, plural/singular logic, and live query freshness require visual verification in the running app."
  - test: "Confirm the delete. Navigate to the recipe that was live-linked. Verify its sections and steps still exist as plain editable content with the baked paint colours visible."
    expected: "Recipe content survives delete intact. Sections have no technique badge. Steps have paint data. Painting progress (completed steps) is unchanged."
    why_human: "End-to-end recipe-content preservation after auto-detach-then-delete requires inspection in the running app."
---

# Phase 146: Detach Safety Rails — Verification Report

**Phase Goal:** Users can permanently break a technique live link, materialising its sections/steps as plain editable recipe content with progress correctly remapped; every live-linked section is visibly badged so the user always knows what is linked

**Verified:** 2026-06-23T08:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                                | Status     | Evidence                                                                                                                                                                                        |
|----|----------------------------------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | After detach, the recipe_steps row still exists with its original id (never recreated)                               | ✓ VERIFIED | Test "recipe_steps row survives detach with same id (SC#3)" GREEN. `recipeTechniqueDetach.ts` contains NO `DELETE FROM recipe_steps` — only UPDATE statements on FK/paint columns.               |
| 2  | After detach, the resolved slot-fill colour is baked into recipe_steps.paint_id                                       | ✓ VERIFIED | Test "paint_id baked to the resolved slot colour" GREEN. `UPDATE recipe_steps SET paint_id` at line 95, before `DELETE FROM recipe_technique_instances` at line 133 — bake-before-delete ordering confirmed. |
| 3  | After detach, unit_recipe_step_progress for that step still exists (FND-03 invariant)                                | ✓ VERIFIED | Test "unit_recipe_step_progress row survives with completed = 1 after detach (FND-03)" GREEN. Step IDs never recreated; progress FK never broken.                                                |
| 4  | After detach, technique_step_id is NULL and the section's technique_instance_id / technique_section_id are NULL      | ✓ VERIFIED | Tests 2 + 5 GREEN. Step 3 NULLs technique_step_id; Step 4 NULLs section FKs — both verified by raw SQL assertions.                                                                              |
| 5  | After detach, the recipe_technique_instances row and its recipe_technique_slot_maps are gone                          | ✓ VERIFIED | Tests 6 + 7 GREEN. Step 5 `DELETE FROM recipe_technique_instances` with CASCADE on slot_maps confirmed.                                                                                          |
| 6  | Deleting a technique with live instances auto-detaches each one first, then removes the technique, preserving recipe  | ✓ VERIFIED | Test "deleting a technique with one live instance bakes paint, removes instance + technique, and keeps recipe section/step rows" GREEN. `useDeleteTechnique.mutationFn` is `detachAllAndDeleteTechnique` (confirmed in `useTechniques.ts` line 150).  |
| 7  | Every technique-sourced section shows a badge in both the recipe editor and SectionedTimeline (SAFE-01)              | ✓ VERIFIED | `RecipeSectionCard.tsx` line 128 renders `TechniqueSectionBadge` when `isTechniqueOwned && techniqueName`. `SectionedTimeline.tsx` line 149 renders `TechniqueSectionBadge` when `isTechniqueSection`. Both surfaces confirmed. REQUIREMENTS.md checkbox `[ ]` is stale — the badge code was shipped in Phase 143. |
| 8  | Clicking Unlink opens a confirmation dialog (title, warning, reassurance) and confirms detach (SAFE-02)               | ✓ VERIFIED | `RecipeSectionCard.tsx` line 132 gates Unlink button on `isTechniqueOwned && techniqueName && onDetach`. `DetachConfirmDialog.tsx` renders title "Detach technique?", locked warning + reassurance copy, "Keep link" cancel, destructive "Detach" confirm with isPending guard. |
| 9  | After detach, all affected query keys are invalidated so every surface refreshes                                       | ✓ VERIFIED | `useTechniqueDetach.ts` `invalidateAfterDetach` invalidates 11 keys (7 per-recipe + 2 technique-level + SLOT_MAP_BY_INSTANCE_KEY + UNFILLED_SLOT_COUNT_KEY). `useDeleteTechnique.onSuccess` invalidates technique keys + 9 prefix keys.    |
| 10 | Delete dialog surfaces the non-detached live-instance count and labels the confirm button with the consequence (SAFE-03) | ✓ VERIFIED | `TechniqueDeleteDialog.tsx` prop is `liveInstanceCount` (no remaining `usageCount`). Case B copy confirmed: "live-linked to N recipe(s)", "bake the current colours", "No recipe content will be lost." Button label: "Detach N recipe(s) & delete" (pluralised). Tests 8/8 GREEN. `TechniqueLibraryTab.tsx` feeds count from live `getNonDetachedInstanceCount` query with `staleTime: 0`. |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact                                              | Expected                                                      | Status     | Details                                                                                       |
|-------------------------------------------------------|---------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| `src/db/queries/recipeTechniqueDetach.ts`             | detachTechniqueInstance, detachAllAndDeleteTechnique, re-export getNonDetachedInstanceCount | ✓ VERIFIED | All three exports present. 185 lines, substantive implementation with documented ordering constraints. |
| `tests/data-layer/detach-technique.test.ts`           | 11+ it() blocks, guard-first, GREEN                           | ✓ VERIFIED | 11 tests across 2 describe blocks. All GREEN (verified by test run).                          |
| `src/hooks/useTechniqueDetach.ts`                     | useDetachTechniqueInstance with 11-key invalidation           | ✓ VERIFIED | Exports `useDetachTechniqueInstance`. Invalidates 11 keys. mutationFn calls `getDb()` then `detachTechniqueInstance(db, instanceId)`. |
| `src/features/recipes/DetachConfirmDialog.tsx`        | AlertDialog with locked copy, loading state                   | ✓ VERIFIED | Exports `DetachConfirmDialog`. Title, warning, reassurance, "Keep link", "Detach"/"Detaching…" — all match locked UI-SPEC. |
| `src/features/recipes/RecipeSectionCard.tsx`          | Unlink button gated on isTechniqueOwned+onDetach, no mutation hook | ✓ VERIFIED | Unlink button at lines 132-143, gated correctly. No React Query imports in card. `DetachConfirmDialog` rendered at lines 326-334.  |
| `src/features/recipes/RecipeSectionList.tsx`          | useDetachTechniqueInstance wired; onDetach per technique-owned section | ✓ VERIFIED | `useDetachTechniqueInstance` imported and called in `TechniqueNameResolver`. onDetach passed only when `recipeId !== undefined && section.technique_instance_id != null`. |
| `src/hooks/useTechniques.ts`                          | useDeleteTechnique mutationFn = detachAllAndDeleteTechnique   | ✓ VERIFIED | `mutationFn: detachAllAndDeleteTechnique` at line 150. Extended onSuccess with 9 prefix invalidations. |
| `src/features/techniques/TechniqueDeleteDialog.tsx`   | Two-case copy, liveInstanceCount prop, no usageCount          | ✓ VERIFIED | prop is `liveInstanceCount`, no remaining `usageCount`. Case A/B copy confirmed. Confirm button: "Detach N recipe(s) & delete" / "Delete". |
| `src/features/techniques/TechniqueLibraryTab.tsx`     | Live getNonDetachedInstanceCount query, feeds liveInstanceCount | ✓ VERIFIED | `useQuery` at lines 42-47 with `getNonDetachedInstanceCount(deleting!.id)`, `staleTime: 0`, `enabled: deleting != null`. Passed as `liveInstanceCount` prop. |
| `tests/techniques/TechniqueDeleteDialog.test.tsx`     | liveInstanceCount prop, Case B copy assertions, 8/8 GREEN     | ✓ VERIFIED | All 8 tests use `liveInstanceCount`, assert Case B copy ("live-linked", "No recipe content will be lost"), singular/plural confirm labels. GREEN confirmed by test run. |

---

### Key Link Verification

| From                                          | To                               | Via                                                              | Status     | Details                                                                                            |
|-----------------------------------------------|----------------------------------|------------------------------------------------------------------|------------|----------------------------------------------------------------------------------------------------|
| `recipeTechniqueDetach.ts`                    | `recipe_steps.paint_id`          | `UPDATE recipe_steps SET paint_id` before `DELETE` (line 95 vs 133) | ✓ WIRED    | Bake-before-delete ordering confirmed. No `DELETE FROM recipe_steps` anywhere in file.             |
| `detachAllAndDeleteTechnique`                 | `detachTechniqueInstance`        | Single shared db handle; loop then `DELETE FROM techniques`       | ✓ WIRED    | `const db = await getDb()` at line 157 (once). `detachTechniqueInstance(db, inst.id)` inside loop. |
| `RecipeSectionCard.tsx`                       | `DetachConfirmDialog`            | Unlink button opens dialog; onConfirm calls onDetach with onSuccess callback | ✓ WIRED    | Lines 132-143 (button), 326-334 (dialog). `onDetach?.(() => setDetachOpen(false))` wired correctly. |
| `RecipeSectionList.tsx`                       | `useDetachTechniqueInstance`     | `detach.mutateAsync({ instanceId, recipeId })` in onDetach handler | ✓ WIRED    | Lines 206-219: handler calls `detach.mutateAsync` with `section.technique_instance_id` and `recipeId`. toast.success/error on result. |
| `useTechniqueDetach.ts`                       | `detachTechniqueInstance`        | `mutationFn: async ({ instanceId }) => { const db = await getDb(); return detachTechniqueInstance(db, instanceId); }` | ✓ WIRED    | Lines 89-92. recipeId not passed to data layer — used only for cache invalidation.                 |
| `useTechniques.ts`                            | `detachAllAndDeleteTechnique`    | `mutationFn: detachAllAndDeleteTechnique`                         | ✓ WIRED    | Line 150. Replaces former bare `deleteTechnique` call. `deleteTechnique` import removed.           |
| `TechniqueDeleteDialog.tsx`                   | `liveInstanceCount`              | Case A/B copy + confirm button label conditional on `liveInstanceCount > 0` | ✓ WIRED    | Lines 51-71. Both description and button label branch on `liveInstanceCount > 0`.                  |
| `TechniqueLibraryTab.tsx`                     | `getNonDetachedInstanceCount`    | Live `useQuery` with `staleTime: 0`, feeds `liveInstanceCount` prop | ✓ WIRED    | Lines 42-47 (query), line matching `liveInstanceCount={nonDetachedCountQuery.data ?? 0}` prop pass. |

---

### Data-Flow Trace (Level 4)

| Artifact                          | Data Variable           | Source                                               | Produces Real Data | Status     |
|-----------------------------------|-------------------------|------------------------------------------------------|--------------------|------------|
| `TechniqueDeleteDialog.tsx`        | `liveInstanceCount`     | `getNonDetachedInstanceCount` SQL query via `useQuery` | Yes — `COUNT(*)` WHERE `detached = 0` against live DB | ✓ FLOWING |
| `RecipeSectionList.tsx`            | `nameMap` (technique name) | `useInstancesForRecipe` + `useTechniquesWithCounts` — React Query from DB | Yes | ✓ FLOWING |
| `recipeTechniqueDetach.ts`         | `slotRows`              | SQL SELECT joining recipe_steps → recipe_technique_slot_maps BEFORE DELETE | Yes — reads live slot map before CASCADE removes it | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior                                          | Command                                                                  | Result                         | Status  |
|---------------------------------------------------|--------------------------------------------------------------------------|--------------------------------|---------|
| detach test suite (11 invariants)                 | `pnpm test -- tests/data-layer/detach-technique.test.ts`                | 11/11 GREEN (exit 0)           | ✓ PASS  |
| TechniqueDeleteDialog tests (8 assertions)        | `pnpm test -- tests/techniques/TechniqueDeleteDialog.test.tsx`          | 8/8 GREEN (exit 0, 3069 total) | ✓ PASS  |
| Full suite regression check                       | `pnpm test` (full run)                                                   | 3069 passed, 0 phase-relevant failures; 1 known timing flake in recentActivityQuery.test.ts unrelated to this phase | ✓ PASS  |
| Bake-before-delete ordering (grep)                | `grep -n "UPDATE recipe_steps SET paint_id" recipeTechniqueDetach.ts`   | Line 95 (DELETE at line 133)   | ✓ PASS  |
| No DELETE FROM recipe_steps/sections (grep)       | `grep -n "DELETE FROM recipe_steps\|DELETE FROM recipe_sections" recipeTechniqueDetach.ts` | No matches | ✓ PASS  |
| SectionedTimeline unmodified (grep)               | `grep "DetachConfirmDialog\|onDetach\|useDetachTechniqueInstance" SectionedTimeline.tsx` | No matches | ✓ PASS  |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                                    | Status       | Evidence                                                                                                                                                        |
|-------------|------------|----------------------------------------------------------------------------------------------------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| SAFE-01     | 146-02     | Every technique-sourced section shows a "from technique X" badge in both the recipe editor and SectionedTimeline. | ✓ SATISFIED  | Badge implemented in Phase 143 (`TechniqueSectionBadge`). `RecipeSectionCard.tsx` line 128 and `SectionedTimeline.tsx` line 149 both render it. REQUIREMENTS.md checkbox is stale — the code is live. |
| SAFE-02     | 146-01, 02 | User can detach a technique instance — materializing sections/steps into plain editable content, remapping progress, removing the live link. | ✓ SATISFIED  | `detachTechniqueInstance` fully implemented and tested (11/11). Editor Unlink affordance + DetachConfirmDialog wired end-to-end. Progress (FND-03) survives.     |
| SAFE-03     | 146-01, 02, 03 | Detach requires confirmation ("this breaks the live link permanently"), result is fully editable, no half-linked state. | ✓ SATISFIED  | AlertDialog with "Detach technique?" title + locked warning copy guards detach. `detachAllAndDeleteTechnique` in `useDeleteTechnique`. TechniqueDeleteDialog two-case copy with live count. All tests GREEN. |

---

### Anti-Patterns Found

No TBD, FIXME, XXX, return null stubs, empty handlers, or placeholder patterns found in any of the 10 files modified or created by this phase. No anti-patterns to report.

---

### Human Verification Required

The automated checks are complete and all code evidence is present. The following items require end-to-end verification in the running desktop app (`pnpm tauri dev`):

#### 1. Editor Unlink Dialog Copy and Behaviour

**Test:** Apply a technique to a recipe, open the recipe editor, and click the Unlink icon button (adjacent to the "From {technique}" badge on a technique-owned section).
**Expected:** An AlertDialog appears titled "Detach technique?", with the warning "This breaks the live link permanently. Future edits to '{technique name}' won't update this recipe." and the reassurance "Your current steps and colours are kept." Cancel button reads "Keep link"; confirm button reads "Detach". Clicking "Keep link" dismisses the dialog with no changes.
**Why human:** AlertDialog visual rendering, exact localised copy, and modal interaction can only be confirmed in the running Tauri window.

#### 2. Detach Execution — Toast and Section Transition

**Test:** With the detach AlertDialog open, click "Detach". Observe the mutation outcome.
**Expected:** A success toast appears reading "Technique detached — now plain recipe content". The section immediately re-renders as plain editable content: the "From {technique}" badge is gone, the Unlink button is gone, the section name input is re-enabled, the drag handle reappears. Step names, paint data, and step-completion state are intact.
**Why human:** Post-mutation UI state (badge removal, input re-enablement, drag handle reappearance) and toast appearance require live visual inspection.

#### 3. TechniqueDeleteDialog Case B Count and Copy

**Test:** In the technique library, find or create a technique that is live-linked to at least one recipe. Click its delete action.
**Expected:** The delete dialog shows Case B copy: `"{technique}" is live-linked to N recipe(s). Detaching will bake the current colours into those recipes before removing the technique. No recipe content will be lost.` The confirm button reads "Detach N recipe(s) & delete" (singular "recipe" when N=1, plural "recipes" when N>1).
**Why human:** The live count freshness (from `getNonDetachedInstanceCount`, not stale `usage_count`) and correct singular/plural rendering require inspection in the app with real data.

#### 4. Auto-Detach-Then-Delete Preserves Recipe Content

**Test:** From the delete dialog in test #3, click "Detach N recipe(s) & delete". After the technique is removed, navigate to the previously live-linked recipe and inspect its sections and steps.
**Expected:** A toast appears: "Technique detached from N recipe(s) and deleted." The recipe's sections and steps still exist with the baked paint colours. No half-linked state (technique_step_id fields are NULL; sections show no badge). Previously completed steps remain completed.
**Why human:** End-to-end data preservation after auto-detach-then-delete — including progress survival — requires live inspection with real DB state.

---

### Gaps Summary

No gaps. All 10 must-have truths are VERIFIED by codebase evidence and live test results. The 4 human verification items above cover UX behaviour (dialog copy, toast appearance, post-detach render state, end-to-end content survival in the running app) that cannot be confirmed programmatically.

Note on SAFE-01 REQUIREMENTS.md checkbox: The `[ ]` checkbox and "Pending" traceability entry for SAFE-01 are stale artefacts — the badge code was shipped in Phase 143 (`TechniqueSectionBadge` in both `RecipeSectionCard.tsx` and `SectionedTimeline.tsx`) and is live in the codebase. This is a documentation gap in REQUIREMENTS.md, not a code gap.

---

_Verified: 2026-06-23T08:35:00Z_
_Verifier: Claude (gsd-verifier)_

---

**Human verification resolved 2026-06-23:** all human-UAT items accepted by the user after in-app testing of the end-to-end technique flow. See 146-HUMAN-UAT.md (status: passed).
