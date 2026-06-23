---
phase: 143-apply-flow-slot-fill-system
verified: 2026-06-22T12:00:00Z
status: passed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Picker → slot-fill → apply flow (editor)"
    expected: "Clicking 'Add technique' opens a Dialog (not a Sheet); search filters list; selecting a technique shows a read-only preview of slots and steps; clicking 'Next: Fill slots' opens the slot-fill dialog with one row per slot (name + role hint + dashed swatch when empty + PaintCombobox); leaving slots empty is allowed (no error gate); clicking 'Apply technique' shows toast 'Technique applied.' and the new section appears with a 'from technique X' badge, disabled name input, no drag handle or delete button"
    why_human: "Radix Dialog portal rendering, visual swatch/badge/lock states, and the full picker interaction flow cannot be verified in jsdom"
  - test: "Double-apply of same technique in one recipe (SLOT-04)"
    expected: "Applying the same technique a second time creates a second independent badged section; the two sections carry different slot fills without interfering"
    why_human: "UI state independence across two simultaneous applied-technique sections requires visual inspection"
  - test: "Save round-trip after applying a technique"
    expected: "After saving the recipe and reopening it in the editor, the technique sections and steps are intact and still locked/badged; the saveRecipeGraph guard did not delete or overwrite them"
    why_human: "Full save→reopen cycle requires a running Tauri app"
  - test: "Detail-view swatch resolution and 'Edit colours' (APPLY-05)"
    expected: "Technique sections in the detail view show the correct paint swatch for filled slots (not empty); unfilled slots show a dashed swatch; clicking 'Edit colours' opens the dialog pre-populated with the current slot fills; changing a paint and saving shows toast 'Colours updated.' and the swatch updates immediately; technique steps are read-only (no per-step paint edit)"
    why_human: "Swatch rendering, pre-populated state, and immediate cache-invalidation refresh all require visual verification in a running app"
  - test: "Interactive badge navigates to library tab"
    expected: "Clicking the 'from technique X' badge in the detail view closes the detail Sheet and switches the Recipes page tab to 'Techniques', landing on the correct technique"
    why_human: "Tab navigation and Sheet close-then-switch sequence requires interactive runtime"
  - test: "Plain recipe regression check"
    expected: "A recipe with no applied techniques still renders normally in both the editor and the detail view — no swatch regressions, no badge artefacts"
    why_human: "Visual regression requires running the app"
---

# Phase 143: Apply Flow & Slot-Fill System — Verification Report

**Phase Goal:** Users can add a technique to a recipe by filling its colour slots with real paints; the resolved paint is the single source of truth for every consumer via `effectivePaintId()`
**Verified:** 2026-06-22
**Status:** human_needed (5/5 automated must-haves verified; 6 interactive UI items deferred to human UAT)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | From the recipe section editor, user can open a technique picker, browse/search the library, preview a technique's slots and steps, and insert it — a `recipe_technique_instances` row is created | VERIFIED (automated) + HUMAN NEEDED (visual) | `TechniquePickerDialog.tsx` and `SlotFillDialog.tsx` exist and are substantive (60+ and 50+ lines respectively); `RecipeSectionList.tsx` renders an "Add technique" button and mounts both dialogs as Radix portals; `useApplyTechnique` hook wired in `SlotFillDialog`; `applyTechnique()` inserts a fresh `recipe_technique_instances` row unconditionally. Visual flow requires human UAT. |
| SC-2 | A slot-fill dialog lets the user assign a paint to each slot (role hint + swatch); unassigned slots are saved as empty without error | VERIFIED (automated) + HUMAN NEEDED (visual) | `SlotFillRow.tsx`: `role_hint` displayed, dashed swatch (`border-dashed`) when `paintId == null`, `PaintCombobox` with `"Assign paint (optional)"` placeholder. `SlotFillDialog.tsx`: no validation gate on `slotFills` (`SLOT-05` comment in file, no `required` guard). Swatch rendering requires visual confirmation. |
| SC-3 | Applied technique appears as a section with a "from technique X" badge; same technique can be applied twice with independent slot mappings | VERIFIED (automated) + HUMAN NEEDED (visual) | `TechniqueSectionBadge.tsx` renders a `Badge` with BookOpen icon; `RecipeSectionCard.tsx` conditionally shows badge + disables name input + hides drag/delete when `isTechniqueOwned`. SLOT-04 data-layer test in `tests/data-layer/apply-technique.test.ts` proves two distinct `instanceId` values are returned for two calls; CR-01 fix rekeys `getSlotResolutionMap` by `recipe_steps.id` (unique per application, not per-technique) preventing map-key collision. Double-apply visual independence requires UAT. |
| SC-4 | User can view and change slot colours from the recipe detail view — not only from the full edit form | VERIFIED (automated) + HUMAN NEEDED (visual) | `RecipeDetailSheet.tsx` calls `useSlotResolutionMap(recipe?.id)`, passes `slotMap` into `SectionedTimeline`, renders `EditColoursDialog` for each technique section, pre-populated via `useSlotMapByInstance`. `EditColoursDialog.tsx` saves via `useUpdateSlotMap` with "Colours updated." toast. Pre-population and swatch-update behaviour require visual check. |
| SC-5 | `saveRecipeGraph` is guarded to skip steps with `technique_step_id IS NOT NULL`, so the editor cannot accidentally overwrite live-linked steps | VERIFIED (automated — test green) | `src/db/queries/recipes.ts` lines 504–508 (DELETE guard) and 519–521 (UPDATE guard) with "SC#5 GUARD" comments. `buildDraftSections` filters `technique_step_id == null` and forwards `technique_step_id` on the `DraftStep`. `tests/data-layer/saveRecipeGraph-guard.test.ts` covers all three cases (DELETE-skip, UPDATE-skip, plain-still-deletes). REVIEW-FIX confirms 2999 tests passed. |

**Score:** 5/5 truths have automated evidence; all 5 also have human UAT items for interactive visual behaviour.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/data-layer/saveRecipeGraph-guard.test.ts` | Guard proof (SC#5) | VERIFIED | Exists, contains `technique_step_id`, 3+ `it()` cases |
| `tests/data-layer/apply-technique.test.ts` | SLOT-03/04 instance independence | VERIFIED | 6 cases green; SLOT-04 double-apply case; SLOT-03 independent slot map case |
| `tests/data-layer/effectivePaintId.test.ts` | Pure unit proof of resolution spine | VERIFIED | Uses `PaintResolvableStep` with `id` field (post CR-01 fix); keyed by `recipe_step_id` |
| `src/db/queries/recipes.ts` | saveRecipeGraph DELETE + UPDATE guards | VERIFIED | SC#5 guards at lines 504–508 and 519–521 |
| `src/features/recipes/recipeSection.ts` | `buildDraftSections` forward/filter | VERIFIED | Filters `technique_step_id == null`; maps `technique_step_id: st.technique_step_id ?? null` |
| `src/db/queries/recipeTechniqueInstances.ts` | `applyTechnique()` + `getInstancesForRecipe()` | VERIFIED | 140 lines; insert-only; no `BEGIN/COMMIT`; throws on missing `lastInsertId` (WR-02 fix) |
| `src/db/queries/recipeTechniqueSlotMaps.ts` | `getSlotResolutionMap()` + `getSlotMapByInstance()` + `updateSlotMap()` | VERIFIED | 128 lines; `getSlotResolutionMap` keyed by `rs.id AS recipe_step_id` (CR-01 fix); `INSERT OR REPLACE` for upserts |
| `src/hooks/useTechniqueInstances.ts` | `useApplyTechnique` + `useUpdateSlotMap` + 7-key CASCADE | VERIFIED | 122 lines; invalidates 7 keys including `SLOT_MAP_BY_INSTANCE_KEY` (WR-01 fix) |
| `src/hooks/useSlotResolutionMap.ts` | `useSlotResolutionMap` + `useSlotMapByInstance` + key exports | VERIFIED | 53 lines; enabled-by-id pattern; both keys exported |
| `src/features/recipes/TechniquePickerCard.tsx` | Clickable card (APPLY-01/02) | VERIFIED | Exists; click-to-select, bg-accent when selected |
| `src/features/recipes/TechniquePickerDialog.tsx` | Browse/search/preview Dialog (APPLY-02) | VERIFIED | 60+ lines; no `applyTechnique` call inside; hands selection to parent via `onPicked` |
| `src/features/recipes/SlotFillRow.tsx` | Slot row: name + hint + swatch + combobox (SLOT-06) | VERIFIED | `role_hint`, `border-dashed` swatch, `PaintCombobox` with `aria-label` and optional placeholder |
| `src/features/recipes/SlotFillDialog.tsx` | Per-slot assignment + applyTechnique (APPLY-03, SLOT-05/06) | VERIFIED | 50+ lines; no validation gate; `useApplyTechnique.mutateAsync`; `toast.success/error` wired |
| `src/features/recipes/TechniqueSectionBadge.tsx` | "from technique X" badge (APPLY-04) | VERIFIED | `Badge variant="secondary"` + `BookOpen`; interactive button when `onNavigate` provided |
| `src/features/recipes/RecipeSectionCard.tsx` | Badge + disabled name + no drag/delete for technique sections | VERIFIED | `isTechniqueOwned` conditional disables drag handle, delete button, name Input; `TechniqueSectionBadge` rendered |
| `src/features/recipes/EditColoursDialog.tsx` | "Edit colours" pre-populated dialog (APPLY-05) | VERIFIED | `useSlotMapByInstance` pre-population; `useUpdateSlotMap` save; "Colours updated." / failure toasts; "Save colours" CTA |
| `src/features/recipes/SectionedTimeline.tsx` | `effectivePaintId()` via `slotMap` prop | VERIFIED | `slotMap?: SlotResolutionMap` prop; `effectivePaintId(step, resolvedSlotMap)` in `sectionAvailability` useMemo and per-step swatch |
| `src/features/recipes/RecipeDetailSheet.tsx` | `useSlotResolutionMap` + `Edit colours` + badge + read-only steps | VERIFIED | All 4 items confirmed by grep: `useSlotResolutionMap(recipe?.id)`, `EditColoursDialog`, `effectivePaintId` for `missingPaints` (CR-03 fix), `onNavigateToTechniques` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `saveRecipeGraph` DELETE loop | `existingSteps[].technique_step_id` | `find + continue` guard | WIRED | Line 504–508 in `recipes.ts`; reads `existingSteps` (DB rows) not draft |
| `saveRecipeGraph` UPDATE branch | `draft step technique_step_id` | `continue` guard as first statement | WIRED | Line 519–521 in `recipes.ts`; first statement inside `if (s.dbId !== null)` |
| `applyTechnique` `recipe_steps` INSERT | `technique_steps.id` | `technique_step_id` FK column, `paint_id = NULL` | WIRED | Line 107–131 in `recipeTechniqueInstances.ts` |
| `getSlotResolutionMap` | `recipe_technique_slot_maps` via 4-table JOIN | LEFT JOIN on `instance_id + slot_id`; keyed by `rs.id` | WIRED | Lines 58–74 in `recipeTechniqueSlotMaps.ts`; CR-01 fix confirmed |
| `RecipeSectionList` "Add technique" button | `TechniquePickerDialog` → `SlotFillDialog` | `pendingTechnique` state; Radix Dialog portals | WIRED | `RecipeSectionList.tsx` imports and mounts both dialogs via `TechniqueControls` sub-component |
| `SlotFillDialog` "Apply technique" | `useApplyTechnique` mutation | `mutateAsync + toast + onClose` | WIRED | `SlotFillDialog.tsx` line ~80; `useApplyTechnique` hook imported |
| `RecipeSectionCard` technique-owned section | `TechniqueSectionBadge` | `isTechniqueOwned` conditional render | WIRED | `RecipeSectionCard.tsx` conditionally renders badge, disables inputs |
| `RecipeDetailSheet` | `useSlotResolutionMap(recipeId)` | passes `slotMap` into `SectionedTimeline` | WIRED | Lines 97 and 351 of `RecipeDetailSheet.tsx` |
| `SectionedTimeline` step swatch | `effectivePaintId(step, slotMap)` | resolution spine; no direct `step.paint_id` read for technique steps | WIRED | `SectionedTimeline.tsx` imports `effectivePaintId`; uses in `sectionAvailability` useMemo + per-step render |
| `RecipeDetailSheet` "Edit colours" | `SlotFillDialog`/`EditColoursDialog` (pre-populated via `useSlotMapByInstance`) → `updateSlotMap` | `useUpdateSlotMap` mutation | WIRED | `EditColoursDialog.tsx` uses `useSlotMapByInstance` + `useUpdateSlotMap`; mounted in `RecipeDetailSheet` |
| `useApplyTechnique` `onSuccess` | RECIPE_SECTIONS_KEY + RECIPE_PAINTS_KEY + STEP_COUNTS_KEY + RECIPE_AVAILABILITY_KEY + RECIPE_SWATCH_KEY + TECHNIQUE_INSTANCES_KEY + SLOT_RESOLUTION_MAP_KEY | `invalidateAfterApply` helper | WIRED | `useTechniqueInstances.ts` lines 39–50; 7-key CASCADE confirmed |
| `useUpdateSlotMap` `onSuccess` | `SLOT_MAP_BY_INSTANCE_KEY(instanceId)` | Added by WR-01 fix | WIRED | `useTechniqueInstances.ts` line 124; `SLOT_MAP_BY_INSTANCE_KEY` imported |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SectionedTimeline.tsx` swatch | `slotMap` (passed as prop) | `useSlotResolutionMap` → `getSlotResolutionMap` → SQL JOIN over `recipe_steps + recipe_technique_slot_maps` | Yes — 4-table LEFT JOIN query | FLOWING |
| `EditColoursDialog.tsx` prefill | `existingSlotMap` | `useSlotMapByInstance` → `getSlotMapByInstance` → `SELECT slot_id, paint_id FROM recipe_technique_slot_maps WHERE instance_id = $1` | Yes — direct DB read | FLOWING |
| `RecipeDetailSheet.tsx` `missingPaints` | `resolvedId` via `effectivePaintId(s, resolvedMap)` | `slotMap` from `useSlotResolutionMap`; CR-03 fix applies `effectivePaintId` | Yes — technique steps included via slot map | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `saveRecipeGraph` guard test | `pnpm test -- tests/data-layer/saveRecipeGraph-guard.test.ts` | 3/3 passed (per REVIEW-FIX: 2999 total, 0 failed) | PASS |
| SLOT-04 double-apply independence | `pnpm test -- tests/data-layer/apply-technique.test.ts` | 6/6 passed; `instanceAId !== instanceBId`; SLOT-03 independent fill case green | PASS |
| `effectivePaintId` pure-unit | `pnpm test -- tests/data-layer/effectivePaintId.test.ts` | All cases pass with `recipe_step_id` as map key (post CR-01) | PASS |
| Full test suite | `pnpm test` (per REVIEW-FIX) | 2999 passed, 6 skipped, 0 failed | PASS |
| TypeScript build | `pnpm build` (per REVIEW-FIX) | tsc strict + vite build clean | PASS |

Step 7b (server spot-checks): SKIPPED — requires running Tauri desktop app; cannot test UI flows without a native window.

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| SLOT-03 | 143-01, 143-02 | Each recipe application carries its own slot→paint mapping | SATISFIED | `applyTechnique` inserts unconditionally; SLOT-03 test case in `apply-technique.test.ts`; `getSlotResolutionMap` JOIN resolves per-instance via `sm.instance_id = rti.id` |
| SLOT-04 | 143-02 | Same technique can be applied twice with independent slot mappings | SATISFIED | No `UNIQUE(recipe_id, technique_id)` on instances table; CR-01 rekeyed `getSlotResolutionMap` by `rs.id`; SLOT-04 test case proves two distinct instance IDs |
| SLOT-05 | 143-01, 143-02, 143-03 | Unassigned slot is valid — no error | SATISFIED | `SlotFillDialog`: no validation gate; `recipe_technique_slot_maps.paint_id` is NULLABLE; `effectivePaintId` returns `null` for unfilled slot (SLOT-05 test case green) |
| SLOT-06 | 143-03, 143-04 | Slot-fill UI shows role hint and current swatch | SATISFIED | `SlotFillRow`: `role_hint` displayed; swatch `border-dashed` when unassigned; `SectionedTimeline` resolves via `effectivePaintId` for detail view swatches. Visual confirmation needed (human UAT). |
| APPLY-01 | 143-02, 143-03 | From recipe editor, user can add a technique | SATISFIED | "Add technique" button in `RecipeSectionList`; opens `TechniquePickerDialog`; `applyTechnique` called from `SlotFillDialog` |
| APPLY-02 | 143-03 | Technique picker: browse/search, preview slots/steps, choose insertion position | SATISFIED | `TechniquePickerDialog`: `CommandInput` search, read-only preview panel via `useTechniqueColourSlots + useTechniqueSections/Steps`; `insertAfterSectionIndex = sections.length` |
| APPLY-03 | 143-03 | Slot-fill dialog: one slot per row, paint combobox, empty slots allowed | SATISFIED | `SlotFillDialog` + `SlotFillRow`; one `SlotFillRow` per slot; no validation gate; `PaintCombobox` reused |
| APPLY-04 | 143-03 | Applied technique appears as a recipe section with "from technique X" badge | SATISFIED | `TechniqueSectionBadge` rendered in `RecipeSectionCard` when `technique_instance_id != null`; name input disabled; no drag/delete |
| APPLY-05 | 143-04 | User can view/change slot colours from detail view | SATISFIED | `EditColoursDialog` in `RecipeDetailSheet`; pre-populated via `useSlotMapByInstance`; saves via `useUpdateSlotMap`; "Colours updated." toast. Pre-population behaviour needs visual check (human UAT). |

All 9 declared requirement IDs (SLOT-03, SLOT-04, SLOT-05, SLOT-06, APPLY-01, APPLY-02, APPLY-03, APPLY-04, APPLY-05) are present in REQUIREMENTS.md and have codebase evidence. No orphaned requirement IDs found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `TBD`, `FIXME`, or `XXX` markers found in any phase-modified file | — | — |
| — | — | No stub returns (`return null`, `return []`, `return {}`) found in UI components | — | — |

---

### Human Verification Required

The following items were deferred from `checkpoint:human-verify` tasks in Plans 03 and 04 (per autonomous run protocol) and from this verifier's own analysis of interactive UI behaviours. All automated checks passed.

#### 1. Picker → Slot-Fill → Apply Flow (editor)

**Test:** Run `pnpm tauri dev`. Open a recipe in the editor (Recipes → open a recipe → Edit). Click "Add technique" in the section toolbar.
**Expected:**
- A Dialog (NOT a Sheet) opens with title "Add technique"
- Search input filters the technique list
- Selecting a technique reveals a read-only preview panel with its colour slots (name + role hint) and section/step tree
- Clicking "Next: Fill slots" opens the slot-fill dialog with one row per slot: slot name, role hint, a dashed swatch when unassigned, and a "Assign paint (optional)" PaintCombobox
- Leaving at least one slot empty and clicking "Apply technique" works without error — toast "Technique applied." appears
- A new recipe section appears with a "from technique X" badge, disabled name input, and no drag handle or delete button
- The technique steps inside the section render in a read-only state (pointer-events-none)

**Why human:** Radix Dialog portal rendering, visual swatch states, badge rendering, and locked-section appearance require a running Tauri window.

---

#### 2. Double-Apply Independence (SLOT-04 — visual)

**Test:** From the same recipe editor session, apply the same technique a second time.
**Expected:**
- A second independent badged section is added
- The two sections can each have their own different slot→paint fills with no interference

**Why human:** Visual independence of two simultaneously applied technique sections cannot be asserted in jsdom.

---

#### 3. Save Round-Trip After Applying a Technique

**Test:** After applying a technique in the editor, save the recipe. Re-open the recipe in the editor.
**Expected:**
- The technique sections/steps are intact (badged, locked, read-only)
- The `saveRecipeGraph` guard did not silently delete or overwrite the materialised technique steps

**Why human:** Full save→reopen cycle requires a running Tauri app with SQLite persistence.

---

#### 4. Detail-View Swatch Resolution and "Edit colours" (APPLY-05)

**Test:** Open the detail view of a recipe that has an applied technique (apply one first if needed).
**Expected:**
- Technique steps with a filled slot show the correct paint swatch (not empty)
- Technique steps with an unfilled slot show an empty/dashed swatch
- None of the technique steps are editable (no per-step paint edit control)
- Clicking "Edit colours" on the technique section opens the slot-fill dialog pre-populated with the current slot→paint selections
- Changing a paint and saving shows toast "Colours updated." and the swatch updates immediately in the detail view

**Why human:** Swatch rendering fidelity, pre-populated dialog state, and immediate React Query invalidation refresh all require visual inspection.

---

#### 5. Interactive Badge Navigates to Library Tab

**Test:** In the recipe detail view, click the "from technique X" badge on a technique section.
**Expected:** The detail Sheet closes and the Recipes page tab switches to "Techniques", landing on (or near) the relevant technique entry.

**Why human:** Tab navigation and Sheet close-then-switch sequencing requires interactive runtime.

---

#### 6. Plain Recipe Regression

**Test:** Open a recipe that has NO applied techniques in both the editor and the detail view.
**Expected:** The recipe renders exactly as before — no swatch regressions, no badge artefacts, no broken paint availability display.

**Why human:** Visual regression check requires running the app.

---

## Gaps Summary

No automated must-haves failed. All 5 ROADMAP Success Criteria have verified codebase implementations.

The 9 code review findings (3 critical, 3 warnings, 3 info) found during the code review phase were all addressed in the REVIEW-FIX pass before this verification:

- **CR-01** (SLOT-04 map key collision): Fixed by rekeying `getSlotResolutionMap` on `recipe_steps.id`; `effectivePaintId` updated to look up by `step.id`
- **CR-02** (`duplicateRecipe` drops technique data): Fixed; `duplicateRecipe` now copies instances, slot maps, `technique_instance_id`, and `technique_step_id`
- **CR-03** (`missingPaints` bypassed `effectivePaintId`): Fixed; memo uses `effectivePaintId(s, resolvedMap)`
- **WR-01** (`useUpdateSlotMap` missing `SLOT_MAP_BY_INSTANCE_KEY` invalidation): Fixed
- **WR-02** (`lastInsertId ?? 0` silent zero-ID fallback): Fixed; throws explicitly
- **WR-03** (JOIN comment clarity): Fixed with SQL comment
- **IN-01/IN-02/IN-03** (unused props, audit comments): Fixed

All 2999 tests pass; `pnpm build` is clean.

Status is `human_needed` because 6 interactive UI behaviours (picker UX feel, swatch rendering fidelity, badge navigation, Edit-colours dialog pre-population, save round-trip, plain-recipe regression) require a running Tauri window and cannot be asserted programmatically.

---

_Verified: 2026-06-22T12:00:00Z_
_Verifier: Claude (gsd-verifier)_

---

**Human verification resolved 2026-06-23:** all human-UAT items accepted by the user after in-app testing of the end-to-end technique flow. See 143-HUMAN-UAT.md (status: passed).
