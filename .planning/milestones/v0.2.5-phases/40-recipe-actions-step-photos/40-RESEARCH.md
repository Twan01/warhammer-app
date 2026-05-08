# Phase 40: Recipe Actions + Step Photos - Research

**Researched:** 2026-05-07
**Domain:** Recipe feature extensions — photo upload, DB migration, transactional duplication, wishlist integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Recipe duplication (STUDIO-03)**
- Duplicate button in RecipeDetailSheet footer alongside Edit/Delete
- Copy named with " (Copy)" suffix
- After duplication, copy opens immediately in RecipeDetailSheet
- Single transaction: insert new recipe row + all steps atomically
- All step fields copied: painting_phase, tool, technique, dilution, time_estimate, notes, photo path, alt_paint_id, order_index
- All recipe metadata copied: style, surface, effect, difficulty, estimated_minutes, result_photo_path
- Copy gets new created_at/updated_at — fully independent entity

**Per-step photo upload (STEP-05)**
- Upload trigger: image button/icon per step row in RecipeFormSheet (edit mode)
- One photo per step: `step_photo_path TEXT` column on recipe_steps (migration 013)
- Reuse JournalTab pattern: Tauri `openDialog` → `readFile` + `writeFile` + UUID-based relative path under AppData
- Display: inline thumbnail below step content in RecipeStepTimeline — clickable for full view
- result_photo_path on painting_recipes also gets upload UI wired in RecipeFormSheet header section

**Substitute paint linking (PAINT-02)**
- New `alt_paint_id INTEGER REFERENCES paints(id)` column on recipe_steps (migration 013)
- Second PaintCombobox in RecipeStepRow after primary paint combobox
- Display in RecipeStepTimeline: secondary paint line below primary with "Alt:" prefix + swatch dot
- alt_paint_id does NOT affect availability badge — primary paint only
- Nullable — most steps won't have a substitute

**Add all missing to wishlist (PAINT-03)**
- "Add all missing to wishlist" button in RecipeDetailSheet near the steps section
- Button only appears when recipe has at least one missing paint (owned !== 1)
- Iterate missing paints, check existing wishlist by paint name to prevent duplicates, bulk-insert new items
- Each item: name = "{paint.brand} {paint.name}", faction_id from recipe, notes = "From recipe: {recipe.name}"
- Toast: "Added N paints to wishlist" or "All missing paints already on wishlist"
- Uses existing `useCreateWishlistItem` hook — sequential inserts (few per recipe)

### Claude's Discretion
- Exact thumbnail size for step photos in the timeline (suggest ~64px square)
- Whether step photo thumbnail has a lightbox overlay or opens in a modal
- Migration 013 column ordering and naming details
- Duplicate button icon choice (Copy icon from Lucide)
- Photo upload loading/progress indicator style
- Whether "Add all missing" button is primary or outline variant
- Exact positioning of the alt paint combobox relative to primary in the two-row step layout

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STUDIO-03 | User can duplicate a recipe (copies header + all steps + substitutions) | Transactional duplication via createRecipe + addRecipePaint loop; no Tauri API needed beyond existing DB layer |
| STEP-05 | User can attach a photo to each step | JournalTab photo pattern (openDialog + readFile + writeFile + UUID); step_photo_path column in migration 013 |
| PAINT-02 | User can link an alternative substitute paint to any step | Second PaintCombobox per step; alt_paint_id column in migration 013; display in timeline |
| PAINT-03 | User can add all missing paints from a recipe to wishlist in one action | useCreateWishlistItem sequential loop; duplicate prevention via wishlist name check |
</phase_requirements>

---

## Summary

Phase 40 adds four discrete, well-bounded capabilities to the recipe studio built in Phases 37–39. The implementation is internal to the recipe feature with two external integration points: the Tauri filesystem API (photo upload) and the wishlist query layer (bulk add). All four capabilities have clear precedents in the codebase, so research is primarily about finding exact patterns to replicate and identifying the specific extension points each requirement touches.

The highest-complexity task is recipe duplication: it requires a new `duplicateRecipe` DB function that runs two INSERT operations atomically (recipe header + all steps), a new `useDuplicateRecipe` mutation hook, and UI wiring in RecipeDetailSheet. The CONTEXT.md decision to open the copy immediately in RecipeDetailSheet means the duplication function must return the new recipe ID and the component must set selectedRecipeId to that ID after mutation success.

The photo upload work (STEP-05) is pattern-replication: the JournalTab already demonstrates the exact Tauri API sequence (`openDialog` → `readFile` + `writeFile` with `BaseDirectory.AppData` + `crypto.randomUUID()` filename → store relative path in DB column). The only new wrinkle is that step photos are stored as part of the DraftStep local state in RecipeFormSheet, then written to DB via the existing remove-all/re-add cycle during save. This means the photo file is written to AppData immediately on selection (before save), but the DB row linking is only written on form submit — a minor UX consideration.

**Primary recommendation:** Implement as four sequential plans in this order: (1) migration + DB + type layer, (2) recipe duplication, (3) step photo upload + result photo upload, (4) alt paint linking + add-to-wishlist. Wave 0 establishes migration 013 and updated types so all subsequent plans build on a stable schema.

---

## Standard Stack

### Core (all already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/plugin-dialog` | project version | File picker (`openDialog`) | Tauri native dialog — only way to access filesystem without path hardcoding |
| `@tauri-apps/plugin-fs` | project version | File I/O (`readFile`, `writeFile`, `BaseDirectory`) | Tauri filesystem access; BaseDirectory.AppData is the established storage root |
| `@tauri-apps/api/core` | project version | `convertFileSrc` — converts file path to asset:// URL for `<img>` | Required to display stored photos in the webview |
| `@tauri-apps/api/path` | project version | `appDataDir`, `join` — resolve full path for convertFileSrc | Required to build absolute path from relative DB-stored filename |
| `tauri-plugin-sql` | project version | SQLite `execute` / `select` with `$1, $2` positional syntax | Project's DB access layer — no ORM |
| React Query | 5.x | Mutation hooks with cache invalidation | Project standard; all DB mutations go through hooks |
| Sonner | project version | Toast notifications | Project standard for user feedback |
| Lucide React | project version | Icons (Copy, Image) | Project icon library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `PaintCombobox` | internal | Paint selector with search | Reuse for alt_paint_id combobox in RecipeStepRow |
| shadcn/ui Dialog or Sheet | project version | Lightbox / full-size photo view | For step photo click-to-enlarge (Claude's discretion) |

### Installation
No new packages required. All dependencies already present in the project.

---

## Architecture Patterns

### Pattern 1: Photo Upload (JournalTab pattern — verified from source)

This is the established pattern in `src/features/units/JournalTab.tsx`:

```typescript
// Source: src/features/units/JournalTab.tsx (lines 98-149)

// Step 1: Open file picker
const result = (await openDialog({
  multiple: false,
  directory: false,
  filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
})) as string | null;
if (result === null) return; // user cancelled

// Step 2: Derive extension
const ext = result.split(".").pop()?.toLowerCase() ?? "jpg";

// Step 3: Read source file (absolute path — NO baseDir option)
const data = await readFile(result);

// Step 4: Write to AppData with UUID filename (relative path stored in DB)
const filename = `${crypto.randomUUID()}.${ext}`;
await writeFile(filename, data, { baseDir: BaseDirectory.AppData });

// Step 5: Store relative filename in DB (not absolute path)
// e.g., store "abc123-uuid.jpg" — NOT the full path
```

**For step photo display (convertFileSrc pattern):**
```typescript
// Source: src/hooks/useUnitPhotos.ts (lines 60-72)

// In a hook or useEffect — resolve appDataDir once, not per thumbnail
const absolute = await join(appDir, row.file_path); // row.file_path = UUID filename
const assetUrl = convertFileSrc(absolute);           // "asset://localhost/..." URL
// Then: <img src={assetUrl} />
```

**Critical pitfall (from existing code comments):**
- `readFile` with an absolute path must NOT receive `baseDir` option — use the raw path
- Store only the UUID filename (relative) in DB — not the full absolute path
- `convertFileSrc` requires the full absolute path — join appDataDir + relative filename

### Pattern 2: Transactional Recipe Duplication

No existing project pattern for multi-table transactions. The approach uses sequential `db.execute` calls within a single async function — SQLite auto-commits each statement, but because it is a single DB connection with no parallel writers in this app, the sequence is effectively atomic for the use case.

```typescript
// In src/db/queries/recipes.ts

export async function duplicateRecipe(
  originalId: number,
  newName: string
): Promise<number> {
  const db = await getDb();

  // 1. Read the original recipe
  const rows = await db.select<PaintingRecipe[]>(
    "SELECT * FROM painting_recipes WHERE id = $1", [originalId]
  );
  const original = rows[0];
  if (!original) throw new Error("Recipe not found");

  // 2. INSERT the copy recipe (all metadata fields copied)
  const result = await db.execute(
    `INSERT INTO painting_recipes (
       name, faction_id, unit_id, area,
       primer, basecoat, shade, layer, highlight, glaze_filter,
       weathering, technical, basing, notes, tutorial_link,
       style, surface, effect, difficulty, estimated_minutes, result_photo_path
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
     )`,
    [
      newName, original.faction_id, original.unit_id, original.area,
      original.primer, original.basecoat, original.shade, original.layer,
      original.highlight, original.glaze_filter, original.weathering,
      original.technical, original.basing, original.notes, original.tutorial_link,
      original.style, original.surface, original.effect, original.difficulty,
      original.estimated_minutes, original.result_photo_path,
    ]
  );
  const newRecipeId = result.lastInsertId ?? 0;

  // 3. Read original steps (already ordered by order_index ASC)
  const steps = await db.select<RecipeStep[]>(
    "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC",
    [originalId]
  );

  // 4. INSERT step copies preserving all Phase 40 fields
  for (const step of steps) {
    await db.execute(
      `INSERT INTO recipe_steps
       (recipe_id, paint_id, step_name, order_index, notes,
        painting_phase, tool, technique, dilution, time_estimate_minutes,
        step_photo_path, alt_paint_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        newRecipeId, step.paint_id, step.step_name, step.order_index,
        step.notes, step.painting_phase, step.tool, step.technique,
        step.dilution, step.time_estimate_minutes,
        step.step_photo_path ?? null, step.alt_paint_id ?? null,
      ]
    );
  }

  return newRecipeId;
}
```

**Note on atomicity:** The CONTEXT.md calls this a "single transaction" for reliability. SQLite supports explicit transactions via `BEGIN`/`COMMIT` but `tauri-plugin-sql`'s `execute` method does not expose raw transaction control. In practice, since this app has a single writer and no concurrent mutations, sequential executes are safe. Document this pattern choice clearly in plan.

### Pattern 3: Add-to-Wishlist with Duplicate Prevention

```typescript
// In RecipeDetailSheet — "Add all missing" handler

async function handleAddMissingToWishlist() {
  // 1. Identify missing paints from current steps + paintMap
  const missingPaints = steps
    .map(s => paintMap.get(s.paint_id))
    .filter((p): p is Paint => p !== undefined && isPaintMissing(p));

  if (missingPaints.length === 0) return;

  // 2. Fetch existing wishlist items to check names
  const existingWishlist = await getWishlistItems(); // direct DB call or from cache
  const existingNames = new Set(existingWishlist.map(w => w.name));

  // 3. Filter out already-listed paints
  const toAdd = missingPaints.filter(p => !existingNames.has(`${p.brand} ${p.name}`));

  if (toAdd.length === 0) {
    toast.info("All missing paints already on wishlist");
    return;
  }

  // 4. Sequential inserts via hook
  for (const paint of toAdd) {
    await createWishlistItem.mutateAsync({
      name: `${paint.brand} ${paint.name}`,
      faction_id: recipe.faction_id ?? 0,
      estimated_cost_pence: null,
      notes: `From recipe: ${recipe.name}`,
    });
  }
  toast.success(`Added ${toAdd.length} paint${toAdd.length !== 1 ? "s" : ""} to wishlist`);
}
```

**Consideration:** `useCreateWishlistItem` invalidates `WISHLIST_ITEMS_KEY` on every `onSuccess`. Calling it N times in a loop invalidates N times. This is acceptable since the wishlist is small (few items per recipe). If performance becomes a concern in a future phase, a batch insert query could be added — but CONTEXT.md explicitly chose sequential inserts.

**Duplicate prevention note:** The check uses `name` string equality (`{brand} {name}`) — not paint_id — because the wishlist does not store paint_id. This matches the CONTEXT.md spec exactly.

### Pattern 4: Step Photo in DraftStep and Save Cycle

The existing save cycle in RecipeFormSheet removes all steps and re-adds them. Phase 40 adds `step_photo_path` and `alt_paint_id` to `DraftStep` so they survive the cycle:

```typescript
// recipeSteps.ts — updated DraftStep
export interface DraftStep {
  localId: string;
  step_name: string;
  paint_id: number | null;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
  step_photo_path: string | null;   // Phase 40 addition
  alt_paint_id: number | null;      // Phase 40 addition
}
```

The photo is written to AppData immediately when the user clicks the upload icon in a step row. The relative UUID filename is stored in `DraftStep.step_photo_path`. On form submit, `addRecipePaint` receives `step_photo_path` in its input. This means if the user cancels the form after uploading, the file exists in AppData but has no DB record — orphaned files. This is the same trade-off accepted by JournalTab and is acceptable for a local desktop app (no cloud storage costs, negligible disk impact).

### Pattern 5: Existing Step Mapper Update

`RecipeFormSheet.tsx` has an existing-step mapper in the `useEffect` that fires when `recipe?.id` changes. It builds `DraftStep[]` from `existingSteps` (loaded from DB). This mapper must be extended to include the new fields:

```typescript
// RecipeFormSheet.tsx useEffect mapper — lines 142-158 (Phase 40 extension)
setSteps(
  existingSteps.map((s) => ({
    localId: crypto.randomUUID(),
    step_name: s.step_name,
    paint_id: s.paint_id,
    notes: s.notes,
    painting_phase: s.painting_phase ?? null,
    tool: s.tool ?? null,
    technique: s.technique ?? null,
    dilution: s.dilution ?? null,
    time_estimate_minutes: s.time_estimate_minutes ?? null,
    step_photo_path: s.step_photo_path ?? null,   // Phase 40
    alt_paint_id: s.alt_paint_id ?? null,          // Phase 40
  })),
);
```

### Recommended Plan Structure

```
Phase 40/
├── 40-01: Schema + DB + Types  (migration 013, type updates, addRecipePaint 12-column, duplicateRecipe query)
├── 40-02: Recipe Duplication   (useDuplicateRecipe hook, Duplicate button in RecipeDetailSheet)
├── 40-03: Photo Upload         (step photo upload in RecipeStepRow/DraftStep, result photo upload, timeline thumbnails)
└── 40-04: Alt Paint + Wishlist (alt_paint_id combobox in RecipeStepRow, alt display in timeline, add-to-wishlist button)
```

### Anti-Patterns to Avoid

- **Direct DB import in components:** Never call `getWishlistItems()` directly in RecipeDetailSheet. Use `useWishlistItems()` hook or pass existing wishlist data down as a prop.
- **Storing absolute file paths in DB:** Store only the UUID filename (e.g., `abc123.jpg`), not the full AppData path. Absolute paths break across machines and OS updates.
- **useFieldArray for step forms:** Already documented in STATE.md and REQUIREMENTS.md — ID collision with @dnd-kit useSortable (RHF #10607). DraftStep with local state is the locked pattern.
- **Nesting Radix portals:** If a photo lightbox uses Dialog, it must not be opened from within a Sheet using a nested portal. Use sibling Sheet/Dialog pattern (open from RecipeDetailSheet's parent, not from inside the Sheet content).
- **COALESCE in metadata UPDATE for clearable fields:** STATE.md decision: style, surface, effect, difficulty, estimated_minutes, result_photo_path use raw assignment (not COALESCE) so users can clear them. Already implemented in updateRecipe — do not change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File picker UI | Custom file input or drag-and-drop | `openDialog` from `@tauri-apps/plugin-dialog` | Native OS dialog; security sandbox requirement; already used in JournalTab |
| Unique file naming | Timestamp-based naming | `crypto.randomUUID()` | Collision-free; already established in JournalTab |
| Image display from AppData | Serving files through a custom endpoint | `convertFileSrc` + `appDataDir` + `join` | Tauri's `asset://` protocol is the only way to display local files in the webview |
| Paint search combobox | Custom search dropdown | `PaintCombobox` component | Already built with `usePaints` + shadcn Command; handles create-new flow |
| Wishlist duplication logic | Database unique constraint | Application-level name check | Wishlist has no unique constraint on name; the spec requires name-based dedup |
| Toasts | Custom notification component | Sonner (`toast.success`, `toast.info`, `toast.error`) | Project standard already wired in all sheets |

---

## Common Pitfalls

### Pitfall 1: readFile absolute path must not receive baseDir
**What goes wrong:** Calling `readFile(absolutePath, { baseDir: BaseDirectory.AppData })` throws because AppData is not a prefix of the arbitrary absolute source path.
**Why it happens:** `baseDir` is for relative paths only. The openDialog result is always absolute.
**How to avoid:** `readFile(absolutePath)` — no second argument. Only `writeFile` uses `{ baseDir: BaseDirectory.AppData }`.
**Warning signs:** Runtime error on photo save; existing JournalTab comment at line 129 documents this exact pitfall.

### Pitfall 2: addRecipePaint column count mismatch after Phase 40
**What goes wrong:** The existing `addRecipePaintQuery.test.ts` asserts exactly 10 columns and `$1..$10` placeholders. Phase 40 adds `step_photo_path` and `alt_paint_id`, making it 12 columns. The test will fail until updated.
**Why it happens:** Test was written against the Phase 38 schema. The test correctly validates SQL column coverage.
**How to avoid:** Update `addRecipePaintQuery.test.ts` in plan 40-01 to assert 12 columns and `$1..$12`. Update `CreateRecipeStepInput` type and `addRecipePaint` INSERT in the same plan.

### Pitfall 3: DraftStep new fields lost if existingStep mapper not updated
**What goes wrong:** When editing an existing recipe that has step photos or alt paints, the fields come back as undefined and get dropped — photo and alt paint data lost on re-save.
**Why it happens:** The useEffect mapper in RecipeFormSheet explicitly maps each field. If `step_photo_path` and `alt_paint_id` are not added to the mapper, they default to undefined, which becomes null in the remove-all/re-add cycle.
**How to avoid:** Update the mapper in the same plan that adds the DB columns. Never edit the INSERT without updating the mapper and type simultaneously.

### Pitfall 4: Cache invalidation asymmetry after duplication
**What goes wrong:** After duplicating a recipe, the RecipesPage card grid shows the original count but not the new copy. Or the step count badge on the new card shows 0.
**Why it happens:** `useDuplicateRecipe` must invalidate all affected keys: `RECIPES_KEY`, `RECIPE_SWATCH_KEY`, `STEP_COUNTS_KEY`, `RECIPE_AVAILABILITY_KEY`.
**How to avoid:** Follow the cache invalidation symmetry rule from STATE.md. Compare against `useCreateRecipe` (which invalidates `RECIPES_KEY`, `["kanban-enrichment"]`, `["recipes", "by-unit"]`) and add the step-count and swatch keys that are also affected.

### Pitfall 5: Wishlist faction_id null handling
**What goes wrong:** If the recipe has no faction_id (faction_id is null), passing null to `createWishlistItem` for `faction_id` may violate a NOT NULL constraint.
**Why it happens:** `wishlist_items.faction_id` schema is not immediately visible — need to check migration 009.
**How to avoid:** Check migration 009 for the wishlist_items schema before implementing. If faction_id is NOT NULL, use a fallback (e.g., 0 or a sentinel). The CONTEXT.md spec says "faction_id from the recipe's faction_id" without addressing the null case.
**Action:** Verify migration 009 during plan 40-04 implementation.

### Pitfall 6: Step photo orphan on form cancel
**What goes wrong:** User uploads photo on a step, then cancels the form. Photo file exists in AppData with no DB row referencing it. Over time, orphan files accumulate.
**Why it happens:** Photo write happens immediately on selection (before form save). This is the same trade-off in JournalTab.
**How to avoid:** Accept as known limitation per JournalTab precedent. Document in plan. No cleanup mechanism needed for v0.2.5.

### Pitfall 7: convertFileSrc requires absolute path — relative path from DB is not enough
**What goes wrong:** Passing the stored UUID filename directly to `convertFileSrc` produces a broken asset URL.
**Why it happens:** `convertFileSrc` needs a full absolute path (`/Users/.../AppData/...`) not a relative filename.
**How to avoid:** Always resolve: `const abs = await join(appDataDir, step.step_photo_path); const url = convertFileSrc(abs);`. This pattern is already used in `useUnitPhotos.ts`.

---

## Code Examples

### Migration 013 (new columns on recipe_steps)
```sql
-- 013_step_photos_alt_paint.sql
ALTER TABLE recipe_steps ADD COLUMN step_photo_path TEXT;
ALTER TABLE recipe_steps ADD COLUMN alt_paint_id INTEGER REFERENCES paints(id);
```

### addRecipePaint — 12-column INSERT (Phase 40 expansion)
```typescript
// src/db/queries/recipePaints.ts
// Expand from 10 to 12 columns: add step_photo_path, alt_paint_id

export async function addRecipePaint(input: CreateRecipeStepInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_steps
     (recipe_id, paint_id, step_name, order_index, notes,
      painting_phase, tool, technique, dilution, time_estimate_minutes,
      step_photo_path, alt_paint_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      input.recipe_id, input.paint_id, input.step_name, input.order_index, input.notes ?? null,
      input.painting_phase ?? null, input.tool ?? null, input.technique ?? null,
      input.dilution ?? null, input.time_estimate_minutes ?? null,
      input.step_photo_path ?? null, input.alt_paint_id ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}
```

### RecipeStepRow — alt paint combobox addition (sketch)
```typescript
// In RecipeStepRow, after the primary PaintCombobox in Line 1:
<div className="w-36">
  <PaintCombobox
    value={step.alt_paint_id}
    onChange={(paintId) => onChange({ ...step, alt_paint_id: paintId })}
    // No onCreateNew for alt — user selects existing paint only
  />
</div>
```

### RecipeStepTimeline — alt paint display addition
```typescript
// In RecipeStepTimeline, after the primary paint span:
{step.alt_paint_id && (() => {
  const altPaint = paintMap.get(step.alt_paint_id);
  return altPaint ? (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span aria-hidden="true" className="text-yellow-500">●</span>
      Alt: {altPaint.brand} {altPaint.name}
    </span>
  ) : null;
})()}
```

### Step photo thumbnail in RecipeStepTimeline (sketch)
```typescript
// After step content, before tool/technique row:
{step.step_photo_path && stepPhotoUrl && (
  <img
    src={stepPhotoUrl}
    alt={`Step ${step.step_name} reference`}
    className="mt-1 h-16 w-16 rounded object-cover cursor-pointer"
    onClick={() => setLightboxUrl(stepPhotoUrl)}
  />
)}
```

**Note:** `stepPhotoUrl` requires async resolution (appDataDir + join + convertFileSrc). RecipeStepTimeline is currently a pure presentational component. Options:
1. Pre-resolve URLs in RecipeDetailSheet and pass a `stepPhotoUrls: Map<number, string>` prop — keeps timeline pure
2. Add a hook internally — breaks the pure pattern but simpler
Recommend option 1 to preserve the established pattern.

---

## Integration Points Checklist

All files that MUST be touched in this phase:

**Schema / DB layer (plan 40-01)**
- `src-tauri/migrations/013_step_photos_alt_paint.sql` — NEW (two ALTER TABLE statements)
- `src/types/recipePaint.ts` — add `step_photo_path: string | null` and `alt_paint_id: number | null` to RecipeStep + CreateRecipeStepInput
- `src/db/queries/recipePaints.ts` — expand addRecipePaint INSERT to 12 columns; add duplicateRecipe query
- `src/db/queries/recipes.ts` — no structural change (duplicateRecipe lives in recipePaints.ts since it also writes steps, OR in recipes.ts for clarity — plan decision)
- `src/features/recipes/recipeSteps.ts` — add `step_photo_path` and `alt_paint_id` to DraftStep + makeDraftStep

**Recipe duplication (plan 40-02)**
- `src/hooks/useRecipes.ts` — add useDuplicateRecipe mutation + cache invalidation
- `src/features/recipes/RecipeDetailSheet.tsx` — add Duplicate button in footer, call useDuplicateRecipe, open copy

**Photo upload (plan 40-03)**
- `src/features/recipes/RecipeStepRow.tsx` — add photo upload icon/button per step row
- `src/features/recipes/RecipeFormSheet.tsx` — update existingStep mapper to include step_photo_path + alt_paint_id; add result_photo_path upload in header; update onSubmit to pass new fields
- `src/features/recipes/RecipeStepTimeline.tsx` — add step photo thumbnail; add step photo URL resolution (or accept pre-resolved Map prop)

**Alt paint + wishlist (plan 40-04)**
- `src/features/recipes/RecipeStepRow.tsx` — add second PaintCombobox for alt_paint_id
- `src/features/recipes/RecipeStepTimeline.tsx` — add alt paint display line
- `src/features/recipes/RecipeDetailSheet.tsx` — add "Add all missing to wishlist" button + handler

**Test files (updated per plan)**
- `tests/painting/addRecipePaintQuery.test.ts` — update to 12-column assertion
- `tests/painting/recipeSteps.test.ts` — add tests for new DraftStep fields
- `tests/painting/recipeDetailSheet.test.tsx` — add tests for Duplicate button, Add-to-wishlist button
- `tests/painting/recipeStepRow.test.tsx` — add tests for alt combobox, photo upload icon
- New: `tests/painting/duplicateRecipe.test.ts` — test duplicateRecipe DB function SQL

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/painting/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STUDIO-03 | duplicateRecipe copies recipe row with correct name suffix | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ❌ Wave 0 |
| STUDIO-03 | duplicateRecipe copies all steps with order_index preserved | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ❌ Wave 0 |
| STUDIO-03 | Duplicate button appears in RecipeDetailSheet footer | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ (extend) |
| STEP-05 | DraftStep includes step_photo_path field initialized to null | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend) |
| STEP-05 | addRecipePaint INSERT includes step_photo_path ($11 position) | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ✅ (update) |
| STEP-05 | RecipeStepRow renders photo upload button | component | `pnpm test -- tests/painting/recipeStepRow.test.tsx` | ✅ (extend) |
| PAINT-02 | DraftStep includes alt_paint_id field initialized to null | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ✅ (extend) |
| PAINT-02 | addRecipePaint INSERT includes alt_paint_id ($12 position) | unit | `pnpm test -- tests/painting/addRecipePaintQuery.test.ts` | ✅ (update) |
| PAINT-02 | RecipeStepRow renders alt paint combobox | component | `pnpm test -- tests/painting/recipeStepRow.test.tsx` | ✅ (extend) |
| PAINT-03 | Add-to-wishlist button visible when recipe has missing paints | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ (extend) |
| PAINT-03 | Add-to-wishlist button hidden when all paints are owned | component | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | ✅ (extend) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting/duplicateRecipe.test.ts` — covers STUDIO-03 DB function (SQL column coverage, step copy, name suffix)
- [ ] Update `tests/painting/addRecipePaintQuery.test.ts` — change 10-column assertions to 12-column for STEP-05 + PAINT-02

*(All other test files exist and need extensions, not creation)*

---

## Open Questions

1. **Wishlist faction_id nullability**
   - What we know: `createWishlistItem` takes `faction_id: number` (not nullable per `CreateWishlistItemInput` type and the INSERT SQL has no NULL check visible in wishlistItems.ts)
   - What's unclear: Whether `migration 009` schema has `faction_id NOT NULL` — if so, passing `recipe.faction_id ?? 0` (using 0 as sentinel) could cause FK violations if faction 0 does not exist
   - Recommendation: Plan 40-04 must check migration 009 and either: (a) allow null by accepting `faction_id: number | null` in CreateWishlistItemInput if the column is nullable, or (b) guard the button so it only shows when `recipe.faction_id !== null`

2. **Step photo URL resolution in RecipeStepTimeline**
   - What we know: RecipeStepTimeline is a pure presentational component receiving `steps` + `paintMap` as props; photo display requires async `appDataDir` + `join` + `convertFileSrc` 
   - What's unclear: Whether to keep the pure pattern (resolve URLs in RecipeDetailSheet and pass a Map) or allow RecipeStepTimeline to have an internal async effect
   - Recommendation: Resolve URLs in RecipeDetailSheet (add `stepPhotoUrlMap: Map<number, string>` prop to RecipeStepTimeline) — preserves pure presentational pattern, easier to test

3. **duplicateRecipe SQL transaction boundary**
   - What we know: tauri-plugin-sql does not expose explicit `BEGIN`/`COMMIT`/`ROLLBACK` in its TypeScript API for sequential execute calls
   - What's unclear: Whether there is a raw transaction API available or if we should use a single SQL INSERT ... SELECT for the recipe row then loop for steps
   - Recommendation: Document as "effectively atomic for single-writer desktop app" and use sequential executes. If a middle-step insert fails, the recipe row will exist orphaned — accept this trade-off or add a delete-on-error catch block

---

## Sources

### Primary (HIGH confidence)
- `src/features/units/JournalTab.tsx` — exact Tauri photo upload pattern (openDialog, readFile, writeFile, BaseDirectory.AppData, UUID naming, cancel handling)
- `src/hooks/useUnitPhotos.ts` — exact convertFileSrc + appDataDir + join URL resolution pattern
- `src/db/queries/recipePaints.ts` — current addRecipePaint INSERT (10-column baseline to expand)
- `src/db/queries/recipes.ts` — current createRecipe INSERT (21-column template for duplicate logic)
- `src/features/recipes/RecipeFormSheet.tsx` — existing DraftStep mapper; save cycle with remove-all/re-add
- `src/features/recipes/RecipeStepRow.tsx` — current two-row layout (extension point for alt combobox + photo icon)
- `src/features/recipes/RecipeStepTimeline.tsx` — current step display (extension point for alt paint + thumbnail)
- `src/features/recipes/RecipeDetailSheet.tsx` — current footer layout (extension point for Duplicate + Add-to-wishlist)
- `src/hooks/useRecipePaints.ts` — all cache keys that need invalidation on duplication
- `src/hooks/useWishlistItems.ts` — useCreateWishlistItem hook signature + WISHLIST_ITEMS_KEY
- `src-tauri/migrations/012_recipe_steps.sql` — current recipe_steps schema (baseline for migration 013)
- `tests/painting/addRecipePaintQuery.test.ts` — existing SQL column assertion pattern (must be updated to 12 columns)
- `.planning/phases/40-recipe-actions-step-photos/40-CONTEXT.md` — all locked implementation decisions

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — architectural decisions and established patterns carried forward
- `src/types/recipePaint.ts` — RecipeStep type (needs step_photo_path, alt_paint_id)
- `src/types/wishlistItem.ts` — CreateWishlistItemInput shape (faction_id type requires verification of nullable status)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture patterns: HIGH — all patterns verified from existing source files
- Photo upload: HIGH — JournalTab is the direct model; exact API sequence confirmed
- Duplication: HIGH — SQL is straightforward; transaction limitation is documented but acceptable
- Add-to-wishlist: HIGH — hook exists, spec is explicit; only open question is faction_id nullability
- Pitfalls: HIGH — most come from existing code comments and established project decisions

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable stack — Tauri APIs, React Query, SQLite patterns)
