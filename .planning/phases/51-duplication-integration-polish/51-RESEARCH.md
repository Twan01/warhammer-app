# Phase 51: Duplication + Integration Polish - Research

**Researched:** 2026-05-08
**Domain:** Recipe duplication ID remapping, batch section count query, RecipeCard extension, regression verification
**Confidence:** HIGH

## Summary

Phase 51 is a focused integration and hardening phase. Three surgical changes are required: (1) extend `duplicateRecipe()` with a section copy pass that builds `Map<oldSectionId, newSectionId>` and remaps each step's `section_id`; (2) add a `getSectionCountsByRecipe` batch query and surface section count on `RecipeCard` behind the `sectionCount > 1` progressive-disclosure threshold; (3) verify all pre-existing recipe consumers work without regressions. No new dependencies, no new architectural patterns — all required infrastructure was delivered by Phases 48–50.

The primary risk is correctness of the ID-remap Map in duplication. If `section_id` values are copied verbatim (without remapping), each step in the duplicate points to sections owned by the original recipe — a silent FK dangling-reference that produces incorrect results in section-grouped views. The existing test file `tests/painting/duplicateRecipe.test.ts` must be extended to assert (a) sections are copied, (b) new step `section_id` values match the new section IDs (not the originals), and (c) edits to a step in the copy do not cascade to the original.

The `RecipesPage → RecipeCardGrid → RecipeCard` prop chain is the only UI path requiring a new prop. Section counts can be derived from a new batch query `getSectionCountsByRecipe` in `recipeSections.ts` following the exact `getStepCountsByRecipe` pattern in `recipePaints.ts`. The cache key for this query must be a new export from `useRecipeSections.ts` and must be added to `useDuplicateRecipe.onSuccess` invalidation.

**Primary recommendation:** Implement in two waves: Wave 1 = duplication fix + tests; Wave 2 = section count on RecipeCard + regression verification.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- `duplicateRecipe` gains a section copy pass between recipe INSERT and step INSERT:
  1. Read original sections ordered by order_index
  2. INSERT each section for the new recipe, capturing new IDs
  3. Build `Map<oldSectionId, newSectionId>` from the insert results
  4. When copying steps, look up each step's section_id in the map and use the remapped value
- Steps with null section_id (shouldn't exist post-migration, but defensive) are inserted with section_id = null
- Section order_index, name, surface, optional, and notes are all copied verbatim
- result_photo_path on the recipe is copied to the duplicate (exact clone)
- step_photo_path on each step is copied to the duplicate (file paths, not binary — both point to the same file)
- User can clear or replace photos on the duplicate after creation
- Display format: `{sectionCount} sections · {stepCount} steps` using LayoutList icon for sections and existing Layers icon for steps
- Only show section count when sectionCount > 1 — single-section recipes display step count only (matches progressive disclosure from Phase 50)
- Data source: existing `getStepCountsByRecipe` for step counts; new batch query `getSectionCountsByRecipe` (GROUP BY recipe_id on recipe_sections) or piggyback on existing section hooks
- Section count displayed in the same text-xs text-muted-foreground row as step count and estimated time
- useDuplicateRecipe.onSuccess adds RECIPE_SECTIONS_KEY to its invalidation list (new sections created during duplication)
- Full invalidation list after update: RECIPES_KEY, kanban-enrichment, recipes/by-unit, RECIPE_SWATCH_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SECTIONS_KEY
- Section step counts (STEP_COUNTS_KEY) already invalidated — no additional change needed there
- Regression scope (INTG-03): paint availability badges, swatch strip, LogSessionSheet recipe/step selectors, bulk wishlist add, recipe CRUD, RecipeDetailSheet flat/sectioned fallback

### Claude's Discretion

- Whether to add getSectionCountsByRecipe as a new batch query or derive section counts from existing hooks
- Exact LayoutList icon sizing and spacing relative to step count
- Test file organization (single file vs. split by concern)
- Whether to wrap the duplication in a transaction (recommended but implementation detail)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTG-01 | User can duplicate a recipe and get correct copies of all sections and steps (ID remapping) | `duplicateRecipe()` in `src/db/queries/recipes.ts` currently copies recipe+steps but omits section copy pass; Map<oldSectionId, newSectionId> remap pattern is the entire fix |
| INTG-02 | User sees section count on recipe cards in RecipesPage | New `getSectionCountsByRecipe` batch query + `SECTION_COUNTS_KEY` hook + `sectionCount` prop threaded through `RecipeCardGrid → RecipeCard`; gated on `sectionCount > 1` |
| INTG-03 | User's existing recipe create/edit/delete/availability/swatch/LogSession flows still work unchanged | Pre-existing consumers (`LogSessionSheet`, batch helpers, `RecipeDetailSheet`, swatch strip, availability badge) require no code changes — regression verification via existing + new tests |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | in use | Positional `$1/$2` parameterized SQLite queries | Project-wide DB access layer — no ORM |
| @tanstack/react-query | in use | Server state + cache invalidation | All data hooks use this |
| Lucide React | in use | `LayoutList` icon for section count | Project-wide icon library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest + RTL | in use | Unit tests for query functions and hooks | All new query functions must have SQL-level assertions |

No new packages needed. All required libraries are already installed.

**Installation:** N/A

---

## Architecture Patterns

### Recommended Project Structure
No new directories. All changes are modifications to existing files plus one new test file:
```
src/db/queries/
  recipes.ts            # duplicateRecipe() — add section copy pass
  recipeSections.ts     # getSectionCountsByRecipe() — new batch query
src/hooks/
  useRecipes.ts         # useDuplicateRecipe() — add SECTION_COUNTS_KEY to invalidation
  useRecipeSections.ts  # SECTION_COUNTS_KEY export + useAllSectionCounts hook
src/features/recipes/
  RecipeCardGrid.tsx    # add sectionCountByRecipe prop, pass to RecipeCard
  RecipeCard.tsx        # add sectionCount prop, conditional section count display
  RecipesPage.tsx       # call useAllSectionCounts, thread into RecipeCardGrid
tests/painting/
  duplicateRecipe.test.ts  # extend existing — add section-aware assertions
  recipeSectionCount.test.ts  # new — getSectionCountsByRecipe + useAllSectionCounts
```

### Pattern 1: Section Copy with ID Remapping in duplicateRecipe()

**What:** After the new recipe INSERT and before the step copy loop, read original sections, insert them for the new recipe, and build a `Map<number, number>` of old-to-new section IDs. Use this map during the step copy loop to remap each step's `section_id`.

**When to use:** Always in `duplicateRecipe()` — no conditional.

**Example:**
```typescript
// --- SECTION COPY PASS (new) ---
// Step 2.5: Read original sections
const sections = await db.select<RecipeSection[]>(
  "SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY order_index ASC",
  [originalId]
);

// Build old→new ID map by inserting each section
const sectionIdMap = new Map<number, number>(); // Map<oldId, newId>
for (const section of sections) {
  const sectionResult = await db.execute(
    `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      newRecipeId,
      section.name,
      section.surface,
      section.optional,
      section.order_index,
      section.notes ?? null,
    ]
  );
  sectionIdMap.set(section.id, sectionResult.lastInsertId ?? 0);
}

// --- MODIFIED STEP COPY PASS ---
// For each step, remap section_id via the map; null stays null (defensive)
const remappedSectionId = step.section_id !== null
  ? (sectionIdMap.get(step.section_id) ?? null)
  : null;
// Pass remappedSectionId as $13 in the step INSERT
```

### Pattern 2: getSectionCountsByRecipe Batch Query

**What:** A single `GROUP BY recipe_id` on `recipe_sections` returning `{recipe_id, section_count}[]`. Exact parallel of `getStepCountsByRecipe` in `recipePaints.ts`.

**When to use:** For the section count display on RecipeCard — called once for all recipes.

**Example:**
```typescript
// Source: mirrors getStepCountsByRecipe in src/db/queries/recipePaints.ts
export interface RecipeSectionCount {
  recipe_id: number;
  section_count: number;
}

export async function getSectionCountsByRecipe(): Promise<RecipeSectionCount[]> {
  const db = await getDb();
  return db.select<RecipeSectionCount[]>(
    `SELECT recipe_id, COUNT(*) AS section_count
     FROM recipe_sections
     GROUP BY recipe_id`,
    [],
  );
}
```

### Pattern 3: SECTION_COUNTS_KEY and useAllSectionCounts Hook

**What:** A new global query key `SECTION_COUNTS_KEY` exported from `useRecipeSections.ts`, plus a `useAllSectionCounts()` hook returning `Map<number, number>`. Must be added to `useDuplicateRecipe.onSuccess`.

**Example:**
```typescript
// In useRecipeSections.ts
export const SECTION_COUNTS_KEY = ["recipe-section-counts"] as const;

export function useAllSectionCounts() {
  return useQuery({
    queryKey: SECTION_COUNTS_KEY,
    queryFn: async () => {
      const rows = await getSectionCountsByRecipe();
      return new Map(rows.map((r) => [r.recipe_id, r.section_count]));
    },
  });
}
```

### Pattern 4: RecipeCard sectionCount Prop with Progressive Disclosure

**What:** Add `sectionCount: number` to `RecipeCardProps`. In the stats row, when `sectionCount > 1`, prepend the section count with `LayoutList` icon before the step count.

**Example:**
```typescript
// RecipeCard.tsx — stats row (line ~171 today)
<div className="flex items-center gap-3 text-xs text-muted-foreground">
  {sectionCount > 1 && (
    <span className="flex items-center gap-1">
      <LayoutList className="h-3 w-3" />
      {sectionCount} sections
    </span>
  )}
  <span className="flex items-center gap-1">
    <Layers className="h-3 w-3" />
    {stepCount} {stepCount === 1 ? "step" : "steps"}
  </span>
  {recipe.estimated_minutes !== null && (
    <span className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {recipe.estimated_minutes} min
    </span>
  )}
</div>
```

Note: `LayoutList` import from `lucide-react` alongside existing `Clock`, `Layers`, `Pencil`, `Trash2`.

### Pattern 5: RecipeCardGrid Prop Thread

**What:** `RecipeCardGrid` receives `sectionCountByRecipe: Map<number, number>` and passes `sectionCountByRecipe.get(recipe.id) ?? 0` to each `RecipeCard`.

**When to use:** Follows the identical pattern already used for `stepCountByRecipe`, `swatchColorsByRecipe`, and `availabilityByRecipe`.

### Anti-Patterns to Avoid

- **Copying sections after steps:** The section copy MUST happen before the step copy loop so the `sectionIdMap` exists when remapping step `section_id` values.
- **Using RECIPE_SECTIONS_KEY(recipeId) for batch invalidation:** `RECIPE_SECTIONS_KEY` is a per-recipe factory key `(recipeId: number) => [...]`. The new `SECTION_COUNTS_KEY` is the global batch key for section counts — both must be invalidated after duplication but via their respective key references.
- **Calling useRecipeSections per recipe for counts:** This creates N queries. Use the batch `getSectionCountsByRecipe` + `useAllSectionCounts` instead.
- **Deriving section count from existing section hooks:** `useRecipeSections(recipeId)` is scoped per-recipe and requires knowing the recipe ID. A batch query is the correct approach for the card grid.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Old-to-new ID mapping | Custom array scan | `Map<number, number>` | O(1) lookup per step — simple and correct |
| Batch section counts | N+1 `getRecipeSections` calls | `getSectionCountsByRecipe` GROUP BY | Single query; exact same pattern as `getStepCountsByRecipe` |
| Icon for sections | Custom SVG | `LayoutList` from `lucide-react` | Lucide is the project-wide icon library; LayoutList semantically correct for ordered list of sections |

**Key insight:** Every pattern in Phase 51 is a copy-and-adapt of an already-working pattern in the codebase. No novel approaches are required.

---

## Common Pitfalls

### Pitfall 1: Verbatim section_id Copy Without Remapping
**What goes wrong:** The step INSERT includes the original `section_id` integer. The new steps reference sections owned by the _original_ recipe. The duplicate appears correct until the detail sheet renders — at which point sections are loaded for the new recipe and steps appear in no section (or the wrong one).
**Why it happens:** The existing `duplicateRecipe` was written before sections existed; `section_id` is now a FK column on `recipe_steps`.
**How to avoid:** Insert sections first, build `Map<oldId, newId>`, remap before every step INSERT.
**Warning signs:** Test asserting `params[12] !== step.section_id` for a step that had a section_id — if this assertion fails, the map lookup is broken.

### Pitfall 2: RECIPE_SECTIONS_KEY Invalidation Gap
**What goes wrong:** After duplication, the `[recipe-sections, newRecipeId]` cache is never populated because the key was never invalidated. The new recipe's detail sheet shows no sections until the page is refreshed.
**Why it happens:** `useDuplicateRecipe.onSuccess` currently invalidates 6 keys but not `RECIPE_SECTIONS_KEY`.
**How to avoid:** Add `qc.invalidateQueries({ queryKey: ["recipe-sections"] })` (prefix invalidation covers all `[recipe-sections, *]` entries) to `useDuplicateRecipe.onSuccess`.
**Warning signs:** Detail sheet opens for the duplicate recipe and shows flat fallback even though sections were created.

### Pitfall 3: SECTION_COUNTS_KEY Missing From Duplication Invalidation
**What goes wrong:** After duplication, the `SECTION_COUNTS_KEY` cache still contains the old batch. The new recipe's card shows `0` or stale section count until the page is refreshed.
**Why it happens:** New key, must be explicitly added.
**How to avoid:** Add `qc.invalidateQueries({ queryKey: SECTION_COUNTS_KEY })` to `useDuplicateRecipe.onSuccess`.
**Warning signs:** Card for the new recipe shows only step count even when it has multiple sections.

### Pitfall 4: RecipeCardGrid Missing the New Prop
**What goes wrong:** TypeScript error or `sectionCount` is always `0` because `RecipeCardGrid` wasn't updated to accept and pass through the new prop.
**Why it happens:** Three-component prop chain — `RecipesPage` → `RecipeCardGrid` → `RecipeCard`.
**How to avoid:** Update `RecipeCardGridProps` interface and the component body in the same change as `RecipeCard`; TypeScript strict mode will catch any gap.
**Warning signs:** `noUnusedLocals` / `noUnusedParameters` compiler errors if the prop is accepted but not used.

### Pitfall 5: Test selectMock Call Index Shift
**What goes wrong:** Existing `duplicateRecipe.test.ts` asserts `selectMock.mock.calls[1]` is the step query. After the section copy, `calls[1]` is the section SELECT and the step SELECT moves to `calls[2]`. All subsequent index-based assertions in the test fail.
**Why it happens:** The section copy adds a second `select` call between recipe read and step read.
**How to avoid:** Update `beforeEach` to set up `selectMock` with three `.mockResolvedValueOnce` calls (recipe, sections, steps). Update all `calls[1]` references for the step SELECT to `calls[2]`. Add section-specific assertions at `calls[1]`.
**Warning signs:** Existing test assertions for step SELECT params start failing after the duplication change.

### Pitfall 6: executeMock Call Index Shift in Tests
**What goes wrong:** `executeMock.mock.calls[1]` (first step INSERT) shifts right by N (number of sections). A recipe with 2 sections means step INSERTs start at `calls[3]` (index 0 = recipe INSERT, 1 = section 1 INSERT, 2 = section 2 INSERT).
**Why it happens:** Same as selectMock — inserting N sections adds N `execute` calls before the step loop.
**How to avoid:** Use a fixture with a known section count. Assert step INSERTs at `calls[1 + sectionCount]` or use a helper that scans calls by SQL string content rather than index.
**Warning signs:** `params[0]` for a step INSERT is a section ID integer rather than `newRecipeId`.

---

## Code Examples

### duplicateRecipe complete modified flow
```typescript
// Source: src/db/queries/recipes.ts — extend existing function
export async function duplicateRecipe(originalId: number, newName: string): Promise<number> {
  const db = await getDb();

  // 1. Read original recipe
  const rows = await db.select<PaintingRecipe[]>(
    "SELECT * FROM painting_recipes WHERE id = $1", [originalId]
  );
  const original = rows[0];
  if (!original) throw new Error("Recipe not found");

  // 2. Insert recipe copy
  const result = await db.execute(/* existing INSERT */, [...]);
  const newRecipeId = result.lastInsertId ?? 0;

  // 3. Read original sections (NEW)
  const sections = await db.select<RecipeSection[]>(
    "SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY order_index ASC",
    [originalId]
  );

  // 4. Copy sections and build old→new ID map (NEW)
  const sectionIdMap = new Map<number, number>();
  for (const section of sections) {
    const sectionResult = await db.execute(
      `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newRecipeId, section.name, section.surface, section.optional, section.order_index, section.notes ?? null]
    );
    sectionIdMap.set(section.id, sectionResult.lastInsertId ?? 0);
  }

  // 5. Read original steps
  const steps = await db.select<RecipeStep[]>(
    "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC",
    [originalId]
  );

  // 6. Copy steps with remapped section_id (MODIFIED — was $12 columns, now $13)
  for (const step of steps) {
    const remappedSectionId = step.section_id !== null
      ? (sectionIdMap.get(step.section_id) ?? null)
      : null;
    await db.execute(
      `INSERT INTO recipe_steps
       (recipe_id, paint_id, step_name, order_index, notes,
        painting_phase, tool, technique, dilution, time_estimate_minutes,
        step_photo_path, alt_paint_id, section_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        newRecipeId, step.paint_id, step.step_name, step.order_index,
        step.notes, step.painting_phase, step.tool, step.technique,
        step.dilution, step.time_estimate_minutes,
        step.step_photo_path ?? null, step.alt_paint_id ?? null,
        remappedSectionId,
      ]
    );
  }

  return newRecipeId;
}
```

Note: RecipeSection type needs to be imported at top of recipes.ts — add `import type { RecipeSection } from "@/types/recipeSection"`.

### Updated duplicateRecipe test structure
```typescript
// tests/painting/duplicateRecipe.test.ts — updated beforeEach
const SECTION_FIXTURES: RecipeSection[] = [
  { id: 20, recipe_id: 1, name: "Armour", surface: "smooth", optional: 0, order_index: 0, notes: null, created_at: "...", updated_at: "..." },
  { id: 21, recipe_id: 1, name: "Cloth", surface: null, optional: 1, order_index: 1, notes: null, created_at: "...", updated_at: "..." },
];

// selectMock: [recipe], [sections], [steps]
selectMock
  .mockResolvedValueOnce([RECIPE_FIXTURE])   // calls[0]: recipe read
  .mockResolvedValueOnce(SECTION_FIXTURES)   // calls[1]: section read
  .mockResolvedValueOnce(STEP_FIXTURES);     // calls[2]: step read

// executeMock: recipe INSERT (calls[0]), section INSERTs (calls[1], calls[2]), step INSERTs (calls[3], calls[4])
executeMock
  .mockResolvedValueOnce({ lastInsertId: 100 })  // recipe
  .mockResolvedValueOnce({ lastInsertId: 200 })  // section 1 → new id 200
  .mockResolvedValueOnce({ lastInsertId: 201 })  // section 2 → new id 201
  .mockResolvedValue({ lastInsertId: 300 });      // steps

// Key new assertion: step's section_id is remapped
it("remaps step section_id using new section IDs", async () => {
  await duplicateRecipe(1, "Copy");
  // STEP_FIXTURES have section_id: null — update fixture to test remap
  // step with old section_id 20 should use new section_id 200
  const [, params] = executeMock.mock.calls[3]; // first step INSERT (after 1 recipe + 2 section inserts)
  // params[12] = $13 = remapped section_id
  expect(params[12]).toBe(200); // not 20
});
```

### useDuplicateRecipe updated invalidation
```typescript
// src/hooks/useRecipes.ts
import { RECIPE_SECTIONS_KEY } from "@/hooks/useRecipeSections";
import { SECTION_COUNTS_KEY } from "@/hooks/useRecipeSections"; // new export

export function useDuplicateRecipe() {
  const qc = useQueryClient();
  return useMutation<number, Error, { originalId: number; newName: string }>({
    mutationFn: ({ originalId, newName }) => duplicateRecipe(originalId, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
      qc.invalidateQueries({ queryKey: ["recipes", "by-unit"] });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
      qc.invalidateQueries({ queryKey: ["recipe-sections"] }); // prefix — covers all recipes
      qc.invalidateQueries({ queryKey: SECTION_COUNTS_KEY });  // new batch key
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `duplicateRecipe` copies recipe + steps (12 columns) | Must copy recipe + sections + steps (13 columns, section_id remapped) | Phase 51 | Missing section copy is structural corruption |
| `RecipeCard` shows step count only | Shows `N sections · M steps` when sectionCount > 1 | Phase 51 | Progressive disclosure aligns with Phase 50 form behavior |
| `useDuplicateRecipe` invalidates 6 cache keys | Must invalidate 8 keys (+ recipe-sections prefix + SECTION_COUNTS_KEY) | Phase 51 | New section data must stay fresh after duplication |

**Deprecated/outdated for this phase:**
- `duplicateRecipe` step INSERT with 12 columns (`$12`): Replace with 13 columns (`$13`) to include `section_id`.

---

## Open Questions

1. **Transaction wrapping for duplicateRecipe**
   - What we know: Tauri plugin-sql does not expose explicit transaction control via the standard JS API; the plugin internally handles individual execute calls sequentially
   - What's unclear: Whether a mid-duplication failure (e.g., section INSERT fails) leaves orphaned records
   - Recommendation: Accept current sequential-execute pattern (same as all other multi-step mutations in the codebase); note in code comment that this is not atomic. The risk is low — duplication is user-initiated with no concurrent writes expected.

2. **RECIPE_SECTIONS_KEY invalidation scope after duplication**
   - What we know: `RECIPE_SECTIONS_KEY = (recipeId: number) => ["recipe-sections", recipeId]` is a per-recipe factory. The new recipe's sections are created during duplication.
   - What's unclear: Whether invalidating the `["recipe-sections"]` prefix (no recipeId) correctly covers the new recipe's key.
   - Recommendation: Use `qc.invalidateQueries({ queryKey: ["recipe-sections"] })` — React Query prefix invalidation matches all keys starting with `"recipe-sections"`, which covers both the old and new recipe's section queries. This is the correct pattern for prefix invalidation.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts (jsdom environment) |
| Quick run command | `pnpm test -- tests/painting/duplicateRecipe.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-01 | duplicateRecipe copies sections with ID remap | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ✅ extend existing |
| INTG-01 | step.section_id in copy ≠ step.section_id in original | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ✅ extend existing |
| INTG-02 | getSectionCountsByRecipe returns GROUP BY rows | unit | `pnpm test -- tests/painting/recipeSectionCount.test.ts` | ❌ Wave 0 |
| INTG-02 | useAllSectionCounts returns Map<recipe_id, count> | unit | `pnpm test -- tests/painting/recipeSectionCount.test.ts` | ❌ Wave 0 |
| INTG-03 | Paint availability batch query unchanged | regression | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ✅ exists |
| INTG-03 | Step counts batch query unchanged | regression | `pnpm test -- tests/foundation/useAllStepCounts.test.ts` | ✅ exists |
| INTG-03 | Swatch data batch query unchanged | regression | `pnpm test -- tests/workshop-play/recipeSwatchData.test.ts` | ✅ exists |
| INTG-03 | RecipeDetailSheet renders correctly | regression | `pnpm test -- tests/painting/recipeDetailSheet.test.ts` | ✅ exists |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/duplicateRecipe.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting/recipeSectionCount.test.ts` — covers INTG-02 (`getSectionCountsByRecipe` SQL assertions + `useAllSectionCounts` Map return)

---

## Sources

### Primary (HIGH confidence)
- `src/db/queries/recipes.ts` — `duplicateRecipe()` current implementation (lines 114–170); 12-column step copy, no section handling
- `src/db/queries/recipeSections.ts` — `createRecipeSection` INSERT pattern; `getStepCountsBySection` GROUP BY template
- `src/db/queries/recipePaints.ts` — `getStepCountsByRecipe` batch query (lines 97–105); exact template for `getSectionCountsByRecipe`
- `src/hooks/useRecipes.ts` — `useDuplicateRecipe` current invalidation list (6 keys, lines 69–82)
- `src/hooks/useRecipeSections.ts` — `RECIPE_SECTIONS_KEY` factory, `SECTION_STEP_COUNTS_KEY` pattern (lines 18–19)
- `src/hooks/useRecipePaints.ts` — 5 exported cache keys, `useAllStepCounts` Map-return pattern
- `src/features/recipes/RecipeCard.tsx` — stats row at line 171; current `Layers` icon + `stepCount` pattern
- `src/features/recipes/RecipeCardGrid.tsx` — `RecipeCardGridProps` interface; `stepCountByRecipe.get(recipe.id) ?? 0` prop-threading pattern
- `src/features/recipes/RecipesPage.tsx` — `useAllStepCounts()` call pattern; `stepCountByRecipe` passed to `RecipeCardGrid`
- `src/types/recipeSection.ts` — `RecipeSection` interface (mirrors `recipe_sections` table)
- `src/types/recipePaint.ts` — `RecipeStep.section_id: number | null` confirmed (line 18)
- `tests/painting/duplicateRecipe.test.ts` — existing test structure; `selectMock`/`executeMock` indexed assertions
- `.planning/research/SUMMARY.md` — v0.2.7 Pitfall 4: "duplicateRecipe omitting section ID remap" documented
- `.planning/phases/51-duplication-integration-polish/51-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `tests/painting/recipeSections.test.ts` — test structure template for new `recipeSectionCount.test.ts`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed and in use; no new dependencies
- Architecture: HIGH — every pattern is a direct extension of an existing verified pattern in the codebase
- Pitfalls: HIGH — test index-shift pitfalls derived from direct reading of existing test file structure; ID-remap pitfall documented in SUMMARY.md and STATE.md

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable patterns, no external dependency changes)
