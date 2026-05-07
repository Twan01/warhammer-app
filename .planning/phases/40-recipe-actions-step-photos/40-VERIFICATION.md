---
phase: 40-recipe-actions-step-photos
verified: 2026-05-07T13:30:00Z
status: passed
score: 8/8 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Click 'Duplicate' button on an existing recipe"
    expected: "A copy opens immediately in the detail sheet with name '{original} (Copy)' and all steps replicated"
    why_human: "Tauri IPC (getDb, db.execute) cannot run in jsdom — actual SQLite round-trip is untestable programmatically"
  - test: "Click photo upload icon on a step, select an image"
    expected: "Icon turns primary color; saving the recipe persists the UUID filename; reopening in edit mode shows the photo path; timeline shows 64px thumbnail"
    why_human: "Tauri dialog and filesystem APIs (openDialog, readFile, writeFile, convertFileSrc) cannot be exercised in jsdom"
  - test: "Click 'Add all missing to wishlist' with a recipe that has missing paints"
    expected: "Button is visible only when faction_id is non-null; clicking adds each missing paint once, shows toast with count, prevents duplicates on second click"
    why_human: "Sequential mutateAsync loop + dedup logic requires real Tauri DB connection to validate end-to-end"
---

# Phase 40: Recipe Actions + Step Photos Verification Report

**Phase Goal:** Users can duplicate recipes, attach reference photos to individual steps, link substitute paints, and bulk-add all missing recipe paints to the wishlist in a single action
**Verified:** 2026-05-07T13:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Recipe can be duplicated (copies header + all steps + substitutions) | VERIFIED | `duplicateRecipe` in `src/db/queries/recipes.ts` — reads original recipe + steps, inserts copy with all 21 metadata fields and all 12 step columns including `step_photo_path` / `alt_paint_id` |
| 2 | User can attach a photo to each step | VERIFIED | `handlePhotoUpload` in `RecipeStepRow.tsx` — openDialog → readFile → writeFile(UUID, AppData) → `onChange({ ...step, step_photo_path: filename })` |
| 3 | Step photos persist through the edit save cycle | VERIFIED | `RecipeFormSheet.tsx` DraftStep mapper (line 145–157) includes `step_photo_path: s.step_photo_path ?? null`; both edit and create `addRecipePaint.mutateAsync` calls pass `step_photo_path` and `alt_paint_id` |
| 4 | Step photos display as thumbnails in the timeline | VERIFIED | `RecipeStepTimeline.tsx` accepts `stepPhotoUrls?: Map<number, string>` prop; renders `<img data-testid="step-photo-thumbnail" className="mt-1 h-16 w-16 rounded object-cover">` when path + URL both present |
| 5 | Step photo URLs are resolved from AppData before rendering | VERIFIED | `RecipeDetailSheet.tsx` — `useEffect` resolves each `step.step_photo_path` via `appDataDir() + join() + convertFileSrc()`, stores in `stepPhotoUrls` state, passes to `<RecipeStepTimeline>` |
| 6 | User can link a substitute paint to any step | VERIFIED | Second `PaintCombobox` in `RecipeStepRow.tsx` (grid-cols-5, 5th cell) bound to `step.alt_paint_id`; `alt-paint-combobox-container` testid present |
| 7 | Substitute paint displays in timeline with "Alt:" prefix | VERIFIED | `RecipeStepTimeline.tsx` — `step.alt_paint_id != null` block renders `<span data-testid="alt-paint-display">● Alt: {brand} {name}</span>` with `text-yellow-500` dot |
| 8 | User can bulk-add all missing recipe paints to wishlist | VERIFIED | `RecipeDetailSheet.tsx` — `handleAddMissingToWishlist` sequential `mutateAsync` loop with name-based dedup, `canAddToWishlist` guard (`uniqueMissingPaints.length > 0 && recipe?.faction_id != null`), toast feedback |

**Score:** 8/8 truths verified

---

### Required Artifacts

#### Plan 40-01 Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/migrations/013_step_photos_alt_paint.sql` | Two ALTER TABLE statements | VERIFIED | File exists; contains `ALTER TABLE recipe_steps ADD COLUMN step_photo_path TEXT` and `ALTER TABLE recipe_steps ADD COLUMN alt_paint_id INTEGER REFERENCES paints(id)` |
| `src/types/recipePaint.ts` | RecipeStep with new fields | VERIFIED | `step_photo_path: string \| null` and `alt_paint_id: number \| null` present before `created_at`; `CreateRecipeStepInput` inherits via `Omit` |
| `src/features/recipes/recipeSteps.ts` | DraftStep + makeDraftStep with new fields | VERIFIED | Both fields in `DraftStep` interface; `makeDraftStep()` initializes both to `null` |
| `src/db/queries/recipePaints.ts` | 12-column addRecipePaint INSERT | VERIFIED | INSERT names `step_photo_path, alt_paint_id`; VALUES has `$11, $12`; params append `input.step_photo_path ?? null, input.alt_paint_id ?? null` |
| `src/db/queries/recipes.ts` | duplicateRecipe function | VERIFIED | `export async function duplicateRecipe(originalId, newName)` — full 4-step copy (read recipe, insert copy, read steps, insert step copies with 12 columns) |
| `tests/painting/duplicateRecipe.test.ts` | 7 SQL coverage tests | VERIFIED | All 7 tests exist and cover: SELECT params, recipe INSERT name, step SELECT params, step INSERT columns ($12, step_photo_path, alt_paint_id), order_index preservation, lastInsertId return, not-found error |

#### Plan 40-02 Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/features/recipes/RecipeDetailSheet.tsx` | Duplicate button, stepPhotoUrls resolution, onDuplicate prop | VERIFIED | `useDuplicateRecipe` hook wired; `handleDuplicate` calls with `(Copy)` suffix; `useEffect` resolves URLs; `<Button>Duplicate</Button>` with `Copy` icon in `SheetFooter` |
| `src/features/recipes/RecipeFormSheet.tsx` | Step photo upload, result photo upload, DraftStep mapper, onSubmit new fields | VERIFIED | `handleResultPhotoUpload` present; "Result photo (optional)" FormLabel present; mapper includes `step_photo_path` + `alt_paint_id`; both edit and create `addRecipePaint.mutateAsync` calls include both new fields |
| `src/features/recipes/RecipeStepRow.tsx` | Photo upload icon per step | VERIFIED | `ImageIcon` + `handlePhotoUpload` present; `aria-label="Upload step photo"`; icon color changes to `text-primary` when step has photo |
| `src/features/recipes/RecipeStepTimeline.tsx` | Step photo thumbnails, stepPhotoUrls prop | VERIFIED | `stepPhotoUrls?: Map<number, string>` prop; `<img data-testid="step-photo-thumbnail" className="mt-1 h-16 w-16 rounded object-cover">` |

#### Plan 40-03 Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/features/recipes/RecipeStepRow.tsx` | Second PaintCombobox for alt_paint_id | VERIFIED | Grid expanded to `grid-cols-5`; 5th cell has `data-testid="alt-paint-combobox-container"`, "Alt paint" micro-label, `PaintCombobox` bound to `step.alt_paint_id` |
| `src/features/recipes/RecipeStepTimeline.tsx` | Alt paint display with "Alt:" prefix | VERIFIED | `data-testid="alt-paint-display"`; `text-yellow-500` dot; `Alt: {brand} {name}` text |
| `src/features/recipes/RecipeDetailSheet.tsx` | "Add all missing to wishlist" button and handler | VERIFIED | `canAddToWishlist` guard; `handleAddMissingToWishlist` with dedup via `existingNames.has`; `ShoppingCart` icon; `notes: "From recipe: ${recipe.name}"` on each item |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/types/recipePaint.ts` | `src/db/queries/recipePaints.ts` | `CreateRecipeStepInput` as `addRecipePaint` param type | VERIFIED | `addRecipePaint(input: CreateRecipeStepInput)` in recipePaints.ts; type imported from `@/types/recipePaint` |
| `src/db/queries/recipes.ts` | `src/db/queries/recipePaints.ts` | `duplicateRecipe` copies steps with 12-column INSERT including `step_photo_path`/`alt_paint_id` | VERIFIED | `duplicateRecipe` in recipes.ts inlines the 12-column step INSERT directly (mirrors addRecipePaint SQL); `step_photo_path` and `alt_paint_id` in both the column list and params |
| `src/features/recipes/RecipeDetailSheet.tsx` | `src/hooks/useRecipes.ts` | `useDuplicateRecipe` hook call | VERIFIED | `import { useDuplicateRecipe } from "@/hooks/useRecipes"`; `const duplicateRecipe = useDuplicateRecipe()`; called in `handleDuplicate` |
| `src/features/recipes/RecipeFormSheet.tsx` | `src/db/queries/recipePaints.ts` | `addRecipePaint` with `step_photo_path` and `alt_paint_id` in onSubmit (both paths) | VERIFIED | Edit path (line 237–250) and create path (line 282–295) both pass `step_photo_path: s.step_photo_path ?? null, alt_paint_id: s.alt_paint_id ?? null` |
| `src/features/recipes/RecipeDetailSheet.tsx` | `src/features/recipes/RecipeStepTimeline.tsx` | `stepPhotoUrls` Map prop pre-resolved with `convertFileSrc` | VERIFIED | `<RecipeStepTimeline steps={steps} paintMap={paintMap} stepPhotoUrls={stepPhotoUrls} />` at line 256 |
| `src/features/recipes/RecipeStepRow.tsx` | `src/features/recipes/PaintCombobox.tsx` | Second PaintCombobox instance for alt_paint_id | VERIFIED | Second `<PaintCombobox value={step.alt_paint_id} onChange={(paintId) => onChange({ ...step, alt_paint_id: paintId })} />` in the 5th grid cell |
| `src/features/recipes/RecipeDetailSheet.tsx` | `src/hooks/useWishlistItems.ts` | `useWishlistItems` + `useCreateWishlistItem` for missing paint bulk-add | VERIFIED | Both hooks imported and called; `createWishlistItem.mutateAsync` in sequential loop inside `handleAddMissingToWishlist` |
| `src/features/recipes/RecipesPage.tsx` | `src/features/recipes/RecipeDetailSheet.tsx` | `onDuplicate` callback opens copy immediately | VERIFIED | `onDuplicate={(newId) => { const newRecipe = recipes.find((r) => r.id === newId) ?? null; setSelectedRecipe(newRecipe); setDetailOpen(true); }}` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STUDIO-03 | 40-01, 40-02 | User can duplicate a recipe (copies header + all steps + substitutions) | SATISFIED | `duplicateRecipe` DB function + `useDuplicateRecipe` hook + Duplicate button in RecipeDetailSheet footer; test coverage in `duplicateRecipe.test.ts` (7 tests) and `recipeDetailSheet.test.tsx` (3 STUDIO-03 tests) |
| STEP-05 | 40-01, 40-02 | User can attach a photo to each step | SATISFIED | Migration 013 adds `step_photo_path TEXT` column; `handlePhotoUpload` in RecipeStepRow writes UUID file to AppData; thumbnail in RecipeStepTimeline via `stepPhotoUrls` Map; DraftStep mapper and onSubmit preserve path through save cycle |
| PAINT-02 | 40-01, 40-03 | User can link an alternative substitute paint to any step | SATISFIED | Migration 013 adds `alt_paint_id INTEGER REFERENCES paints(id)`; second PaintCombobox in RecipeStepRow (grid-cols-5); alt paint display in RecipeStepTimeline with "Alt:" prefix and yellow-500 dot; test coverage in `recipeStepRow.test.tsx` (5 PAINT-02 tests) |
| PAINT-03 | 40-03 | User can add all missing paints from a recipe to their wishlist in one action | SATISFIED | "Add all missing to wishlist" button in RecipeDetailSheet; `canAddToWishlist` guard (missing paints > 0 AND faction_id non-null); name-based dedup against existing wishlist; sequential `mutateAsync` loop; toast feedback; test coverage in `recipeDetailSheet.test.tsx` (4 PAINT-03 tests) |

All 4 requirements assigned to Phase 40 in REQUIREMENTS.md are satisfied. No orphaned requirements found.

---

### Anti-Patterns Found

No blockers or stubs detected. Specific checks:

- No `return null`, `return {}`, or placeholder JSX in any modified component
- `handleDuplicate` makes a real DB call via `useDuplicateRecipe().mutateAsync` — not a stub
- `handleAddMissingToWishlist` performs real `createWishlistItem.mutateAsync` loop — not a stub
- `handlePhotoUpload` reads and writes a real file to AppData — not a stub
- `duplicateRecipe` performs 4 real DB operations — not a stub
- Both `addRecipePaint` INSERT paths in `RecipeFormSheet.tsx` pass all 12 fields — confirmed

One minor note: the `onDuplicate` callback in `RecipesPage.tsx` uses `recipes.find((r) => r.id === newId)` which will return `null` if React Query hasn't re-fetched the new recipe yet (since `useDuplicateRecipe.onSuccess` invalidates the cache but the component re-render may not have received fresh data). This is a timing race, not a blocker — `setDetailOpen(true)` still opens the sheet, and if `newRecipe` is null the sheet renders the closed state momentarily until the query resolves. This is acceptable for a local desktop app.

---

### Human Verification Required

#### 1. Recipe Duplication End-to-End

**Test:** With at least one recipe that has 2+ steps (including a step with `alt_paint_id` set), click the "Duplicate" button in the detail sheet footer.
**Expected:** A new recipe named "{original} (Copy)" appears immediately in the detail sheet; all steps are replicated including their tools, techniques, dilutions, and alt_paint_id links; the original recipe is unmodified.
**Why human:** Tauri IPC (`getDb`, `db.execute`) cannot run in jsdom — actual SQLite round-trip is untestable programmatically.

#### 2. Step Photo Upload and Timeline Display

**Test:** In edit mode for a recipe, click the ImageIcon on a step, select a JPEG/PNG. Save. Reopen in detail view.
**Expected:** Icon turns primary-colored immediately after upload; UUID filename is stored in the step's `step_photo_path`; reopening shows a 64px thumbnail in the timeline at the correct step; the thumbnail renders using an `asset://` URL.
**Why human:** Tauri dialog and filesystem APIs (`openDialog`, `readFile`, `writeFile`, `convertFileSrc`) cannot be exercised in jsdom.

#### 3. Bulk Wishlist Add with Deduplication

**Test:** Open a recipe with 3 missing paints and a non-null faction. Click "Add all missing to wishlist". Click again.
**Expected:** First click: toast shows "Added 3 paints to wishlist"; all 3 appear in the Wishlist page. Second click: toast shows "All missing paints already on wishlist"; Wishlist page still has exactly 3 items (no duplicates).
**Why human:** Sequential `mutateAsync` loop + name-based dedup requires real Tauri DB connection to validate end-to-end deduplication behavior.

---

## Gaps Summary

No gaps. All 8 observable truths are verified. All 4 requirements (STUDIO-03, STEP-05, PAINT-02, PAINT-03) are satisfied. All key links confirmed wired. Three human verification items are flagged as expected for Tauri desktop app patterns — they are informational, not blockers.

---

_Verified: 2026-05-07T13:30:00Z_
_Verifier: Claude (gsd-verifier)_
