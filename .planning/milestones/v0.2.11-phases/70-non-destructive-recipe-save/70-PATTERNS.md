# Phase 70: Non-Destructive Recipe Save - Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 4 modified files
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/recipes/recipeSteps.ts` | utility / form-state | transform | `src/features/recipes/recipeSection.ts` | exact (parallel module, same form-state pattern) |
| `src/features/recipes/recipeSection.ts` | utility / form-state | transform | `src/features/recipes/recipeSteps.ts` | exact (parallel module, same form-state pattern) |
| `src/db/queries/recipePaints.ts` | query | CRUD | `src/db/queries/recipeSections.ts` | exact (same entity group, UPDATE + sequential loop pattern) |
| `src/features/recipes/RecipeFormSheet.tsx` | component / orchestrator | request-response | self (onSubmit refactor) + `src/db/queries/recipeSections.ts` (diff ordering) | exact |

---

## Pattern Assignments

### `src/features/recipes/recipeSteps.ts` — add `dbId` to `DraftStep` + `makeDraftStep`

**Analog:** `src/features/recipes/recipeSection.ts`

**Current `DraftStep` interface** (lines 3-15) — add `dbId: number | null` after `localId`:
```typescript
// src/features/recipes/recipeSteps.ts lines 3-15 (CURRENT)
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
  step_photo_path: string | null;
  alt_paint_id: number | null;
}
```

**After change — add `dbId` field immediately after `localId`:**
```typescript
export interface DraftStep {
  localId: string;
  dbId: number | null;   // null = new item not yet in DB; number = maps to recipe_steps.id
  step_name: string;
  // ... rest unchanged
}
```

**`makeDraftStep` factory** (lines 17-31) — set `dbId: null` for new items:
```typescript
// src/features/recipes/recipeSteps.ts lines 17-31 (CURRENT)
export function makeDraftStep(): DraftStep {
  return {
    localId: crypto.randomUUID(),
    step_name: "",
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
  };
}
```

**After change — insert `dbId: null` after `localId`:**
```typescript
export function makeDraftStep(): DraftStep {
  return {
    localId: crypto.randomUUID(),
    dbId: null,           // new steps have no DB row yet
    step_name: "",
    paint_id: null,
    // ... rest unchanged
  };
}
```

**`computeOrderIndex` spread** (lines 33-37) — no change needed; spread (`...s`) carries `dbId` through automatically:
```typescript
// src/features/recipes/recipeSteps.ts lines 33-37 (unchanged — spread includes dbId)
export function computeOrderIndex(
  steps: DraftStep[],
): Array<DraftStep & { order_index: number }> {
  return steps.map((s, i) => ({ ...s, order_index: i }));
}
```

---

### `src/features/recipes/recipeSection.ts` — add `dbId` to `DraftSection`, `buildDraftSections`, `makeDraftSection`

**Analog:** `src/features/recipes/recipeSteps.ts` (parallel structure — same treatment)

**Current `DraftSection` interface** (lines 18-32) — `dbId` field is entirely absent:
```typescript
// src/features/recipes/recipeSection.ts lines 18-32 (CURRENT — no dbId)
export interface DraftSection {
  /** UUID assigned at draft creation; never stored in DB */
  localId: string;
  name: string;
  surface: string | null;
  /** 0 = required, 1 = skippable */
  optional: number;
  notes: string | null;
  section_type: string | null;
  technique: string | null;
  execution_mode: string | null;
  applies_to: string | null;
  steps: DraftStep[];
}
```

**After change — add `dbId` after `localId`:**
```typescript
export interface DraftSection {
  localId: string;
  dbId: number | null;   // null = new section; number = maps to recipe_sections.id
  name: string;
  // ... rest unchanged
}
```

**`makeDraftSection` factory** (lines 38-51) — must set `dbId: null`:
```typescript
// src/features/recipes/recipeSection.ts lines 38-51 (CURRENT)
export function makeDraftSection(name = "Steps"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    name,
    surface: null,
    optional: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [],
  };
}
```

**After change — insert `dbId: null` after `localId`:**
```typescript
export function makeDraftSection(name = "Steps"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    dbId: null,           // new sections have no DB row yet
    name,
    // ... rest unchanged
  };
}
```

**`buildDraftSections` — the root cause** (lines 67-104):
The section return object (lines 91-103) assigns a fresh `crypto.randomUUID()` as `localId` but has no `dbId` field — the DB row `id` is silently discarded. The nested step map (lines 76-89) has the same issue.

```typescript
// src/features/recipes/recipeSection.ts lines 71-103 (CURRENT — root cause)
return sections.map((s) => {
  const sectionSteps = steps
    .filter((st) => st.section_id === s.id)
    .sort((a, b) => a.order_index - b.order_index)
    .map(
      (st): DraftStep => ({
        localId: crypto.randomUUID(),
        // NO dbId — st.id is discarded here
        step_name: st.step_name,
        paint_id: st.paint_id,
        notes: st.notes,
        painting_phase: st.painting_phase ?? null,
        tool: st.tool ?? null,
        technique: st.technique ?? null,
        dilution: st.dilution ?? null,
        time_estimate_minutes: st.time_estimate_minutes ?? null,
        step_photo_path: st.step_photo_path ?? null,
        alt_paint_id: st.alt_paint_id ?? null,
      }),
    );

  return {
    localId: crypto.randomUUID(),
    // NO dbId — s.id is discarded here
    name: s.name,
    surface: s.surface,
    optional: s.optional,
    notes: s.notes,
    section_type: s.section_type ?? null,
    technique: s.technique ?? null,
    execution_mode: s.execution_mode ?? null,
    applies_to: s.applies_to ?? null,
    steps: sectionSteps,
  };
});
```

**After change — add `dbId: s.id` to section return, `dbId: st.id` to step map:**
```typescript
return sections.map((s) => {
  const sectionSteps = steps
    .filter((st) => st.section_id === s.id)
    .sort((a, b) => a.order_index - b.order_index)
    .map(
      (st): DraftStep => ({
        localId: crypto.randomUUID(),
        dbId: st.id,          // carry DB row id for diff
        step_name: st.step_name,
        paint_id: st.paint_id,
        notes: st.notes,
        painting_phase: st.painting_phase ?? null,
        tool: st.tool ?? null,
        technique: st.technique ?? null,
        dilution: st.dilution ?? null,
        time_estimate_minutes: st.time_estimate_minutes ?? null,
        step_photo_path: st.step_photo_path ?? null,
        alt_paint_id: st.alt_paint_id ?? null,
      }),
    );

  return {
    localId: crypto.randomUUID(),
    dbId: s.id,               // carry DB row id for diff
    name: s.name,
    // ... rest unchanged
  };
});
```

---

### `src/db/queries/recipePaints.ts` — add `updateRecipeStep`

**Analog:** `src/db/queries/recipeSections.ts` — `updateRecipeSection` (lines 50-78) is the direct template.

**Template: `updateRecipeSection`** (lines 50-78):
```typescript
// src/db/queries/recipeSections.ts lines 50-78
export async function updateRecipeSection(input: UpdateRecipeSectionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE recipe_sections
     SET name = COALESCE($2, name),
         surface = $3,
         optional = COALESCE($4, optional),
         order_index = COALESCE($5, order_index),
         notes = $6,
         section_type = $7,
         technique = $8,
         execution_mode = $9,
         applies_to = $10,
         updated_at = datetime('now')
     WHERE id = $1`,
    [
      input.id,
      input.name ?? null,
      input.surface ?? null,
      input.optional ?? null,
      input.order_index ?? null,
      input.notes ?? null,
      input.section_type ?? null,
      input.technique ?? null,
      input.execution_mode ?? null,
      input.applies_to ?? null,
    ],
  );
}
```

**`updateRecipeStep` to add** — mirrors this pattern with `recipe_steps` columns. Uses direct assignment (no COALESCE) because Phase 70 always passes full state (D-09):
```typescript
// Add to src/db/queries/recipePaints.ts — after removeRecipePaint, replacing line 38 comment
export async function updateRecipeStep(input: UpdateRecipeStepInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE recipe_steps
     SET paint_id = $2,
         step_name = $3,
         order_index = $4,
         notes = $5,
         painting_phase = $6,
         tool = $7,
         technique = $8,
         dilution = $9,
         time_estimate_minutes = $10,
         step_photo_path = $11,
         alt_paint_id = $12,
         section_id = $13
     WHERE id = $1`,
    [
      input.id,
      input.paint_id ?? null,
      input.step_name,
      input.order_index,
      input.notes ?? null,
      input.painting_phase ?? null,
      input.tool ?? null,
      input.technique ?? null,
      input.dilution ?? null,
      input.time_estimate_minutes ?? null,
      input.step_photo_path ?? null,
      input.alt_paint_id ?? null,
      input.section_id ?? null,
    ],
  );
}
```

**`UpdateRecipeStepInput` type** — add to `src/types/recipePaint.ts` following the `UpdateRecipeSectionInput` pattern from `src/types/recipeSection.ts` line 44:
```typescript
// src/types/recipeSection.ts line 44 — template to copy
export type UpdateRecipeSectionInput = Partial<Omit<CreateRecipeSectionInput, "recipe_id">> & { id: number };

// Add to src/types/recipePaint.ts — analogous:
export type UpdateRecipeStepInput = Partial<Omit<CreateRecipeStepInput, "recipe_id">> & { id: number };
```

**Import update for `recipePaints.ts`** (line 2 — add `UpdateRecipeStepInput`):
```typescript
// src/db/queries/recipePaints.ts line 2 (CURRENT)
import type { RecipeStep, CreateRecipeStepInput } from "@/types/recipePaint";

// After change:
import type { RecipeStep, CreateRecipeStepInput, UpdateRecipeStepInput } from "@/types/recipePaint";
```

---

### `src/features/recipes/RecipeFormSheet.tsx` — replace DELETE-all with three-way diff in `onSubmit`

**Analog:** `src/db/queries/recipeSections.ts` — `reorderRecipeSections` (lines 93-103) demonstrates the sequential `for...of` loop pattern. The `onSubmit` function itself is the analog for the overall structure.

**Sequential loop pattern** (recipeSections.ts lines 93-103):
```typescript
// src/db/queries/recipeSections.ts lines 93-103 — pattern for sequential DB ops
export async function reorderRecipeSections(
  sections: { id: number; order_index: number }[],
): Promise<void> {
  const db = await getDb();
  for (const { id, order_index } of sections) {
    await db.execute(
      "UPDATE recipe_sections SET order_index = $1, updated_at = datetime('now') WHERE id = $2",
      [order_index, id],
    );
  }
}
```

**`lastInsertId` capture pattern** (recipeSections.ts lines 23-42):
```typescript
// src/db/queries/recipeSections.ts lines 23-42 — INSERT + capture lastInsertId
export async function createRecipeSection(input: CreateRecipeSectionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_sections (recipe_id, name, ...) VALUES ($1, $2, ...)`,
    [...]
  );
  return result.lastInsertId ?? 0;
}
```

**Current DELETE-all block to replace** (RecipeFormSheet.tsx lines 233-240):
```typescript
// src/features/recipes/RecipeFormSheet.tsx lines 233-240 (CURRENT — DELETE-all to replace)
// Delete all existing sections — CASCADE handles step cleanup
for (const existing of existingSections) {
  await deleteRecipeSection(existing.id);
}
// Remove any orphaned steps without section_id (legacy data)
for (const existing of existingSteps) {
  await removeRecipePaint.mutateAsync({ id: existing.id, recipeId });
}
```

**Replacement diff algorithm** — five-phase sequence (D-13) replacing lines 233-240 and the section/step creation loops at lines 268-308:

```typescript
// ── Phase 1: Collect surviving section dbIds ──────────────────────────────
const draftSectionDbIds = new Set(
  sections.map((s) => s.dbId).filter((id): id is number => id !== null)
);

// ── Phase 2: DELETE removed sections (CASCADE handles their steps) ─────────
for (const existing of existingSections) {
  if (!draftSectionDbIds.has(existing.id)) {
    await deleteRecipeSection(existing.id);
  }
}

// ── Phase 3: UPDATE existing sections (full-row, no COALESCE reliance) ─────
for (let i = 0; i < sections.length; i++) {
  const sec = sections[i];
  if (sec.dbId !== null) {
    await updateRecipeSection({
      id: sec.dbId,
      name: sec.name,
      surface: sec.surface,
      optional: sec.optional,
      order_index: i,
      notes: sec.notes,
      section_type: sec.section_type,
      technique: sec.technique,
      execution_mode: sec.execution_mode,
      applies_to: sec.applies_to,
    });
  }
}

// ── Phase 4: INSERT new sections, capture IDs ─────────────────────────────
const sectionIdMap = new Map<string, number>();
// Seed map from surviving sections FIRST (critical — prevents step FK errors)
for (const sec of sections) {
  if (sec.dbId !== null) sectionIdMap.set(sec.localId, sec.dbId);
}
// Then insert new sections
for (let i = 0; i < sections.length; i++) {
  const sec = sections[i];
  if (sec.dbId === null) {
    const newId = await createRecipeSection({
      recipe_id: recipeId,
      name: sec.name,
      surface: sec.surface,
      optional: sec.optional,
      order_index: i,
      notes: sec.notes,
      section_type: sec.section_type,
      technique: sec.technique,
      execution_mode: sec.execution_mode,
      applies_to: sec.applies_to,
    });
    sectionIdMap.set(sec.localId, newId);
  }
}

// ── Phase 5: Step diff (must run AFTER sectionIdMap is complete) ───────────
// Collect ALL surviving step dbIds across ALL sections (global set — prevents
// cross-section drag delete, see Pitfall 3)
const draftStepDbIds = new Set(
  sections.flatMap((s) => s.steps)
    .map((st) => st.dbId)
    .filter((id): id is number => id !== null)
);
// DELETE removed steps
for (const existing of existingSteps) {
  if (!draftStepDbIds.has(existing.id)) {
    await removeRecipePaint(existing.id);
  }
}
// UPDATE + INSERT steps per section
for (const sec of sections) {
  const dbSectionId = sectionIdMap.get(sec.localId) ?? null;
  const indexedSteps = computeOrderIndex(sec.steps);
  for (const s of indexedSteps) {
    if (s.dbId !== null) {
      await updateRecipeStep({
        id: s.dbId,
        paint_id: s.paint_id,
        step_name: s.step_name,
        order_index: s.order_index,
        notes: s.notes,
        painting_phase: s.painting_phase,
        tool: s.tool,
        technique: s.technique,
        dilution: s.dilution,
        time_estimate_minutes: s.time_estimate_minutes,
        step_photo_path: s.step_photo_path ?? null,
        alt_paint_id: s.alt_paint_id ?? null,
        section_id: dbSectionId,
      });
    } else {
      await addRecipePaint.mutateAsync({
        recipe_id: recipeId,
        paint_id: s.paint_id,
        step_name: s.step_name,
        order_index: s.order_index,
        notes: s.notes,
        painting_phase: s.painting_phase,
        tool: s.tool,
        technique: s.technique,
        dilution: s.dilution,
        time_estimate_minutes: s.time_estimate_minutes,
        step_photo_path: s.step_photo_path ?? null,
        alt_paint_id: s.alt_paint_id ?? null,
        section_id: dbSectionId,
      });
    }
  }
}
```

**Import additions for RecipeFormSheet.tsx** — `updateRecipeSection` and `updateRecipeStep`:
```typescript
// src/features/recipes/RecipeFormSheet.tsx line 66 (CURRENT)
import { createRecipeSection, deleteRecipeSection } from "@/db/queries/recipeSections";

// After change — add updateRecipeSection:
import { createRecipeSection, deleteRecipeSection, updateRecipeSection } from "@/db/queries/recipeSections";

// Add new import for updateRecipeStep:
import { addRecipePaint, removeRecipePaint, updateRecipeStep } from "@/db/queries/recipePaints";
// (or keep using hook-based addRecipePaint.mutateAsync — confirm which is used in onSubmit)
```

**Note on `removeRecipePaint` call site:** The current `onSubmit` calls `removeRecipePaint.mutateAsync(...)` (hook-based mutation). The diff delete loop should call the direct query function `removeRecipePaint(existing.id)` from `recipePaints.ts` to match the pattern of `deleteRecipeSection(existing.id)` — no hook wrapping for inner loop deletes.

**Cache invalidation block** (lines 311-316) — unchanged:
```typescript
// src/features/recipes/RecipeFormSheet.tsx lines 311-316 (UNCHANGED)
qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
qc.invalidateQueries({ queryKey: ["recipe-step-counts"] });
```

---

## Shared Patterns

### Sequential `for...of` loop for multi-row DB ops
**Source:** `src/db/queries/recipeSections.ts` `reorderRecipeSections` lines 93-103
**Apply to:** All five phases of the diff algorithm in `onSubmit`
```typescript
for (const { id, order_index } of sections) {
  await db.execute(
    "UPDATE recipe_sections SET order_index = $1, updated_at = datetime('now') WHERE id = $2",
    [order_index, id],
  );
}
```
No batch API — always `await` each execute call inside the loop.

### `lastInsertId` capture after INSERT
**Source:** `src/db/queries/recipeSections.ts` `createRecipeSection` line 41
**Apply to:** `createRecipeSection` call in Phase 4 of diff (new section INSERT)
```typescript
return result.lastInsertId ?? 0;
```

### Positional parameter binding `$1, $2`
**Source:** `src/db/queries/recipePaints.ts` `addRecipePaint` lines 17-32
**Apply to:** `updateRecipeStep` SQL string
All Tauri plugin-sql queries use `$1, $2, ...` positional syntax — not `?` or named params.

### Null coalescing on write
**Source:** `src/db/queries/recipePaints.ts` `addRecipePaint` lines 23-29
**Apply to:** `updateRecipeStep` parameter array
```typescript
input.notes ?? null,
input.painting_phase ?? null,
input.tool ?? null,
// ... all nullable fields
```

### `updated_at = datetime('now')` on UPDATE
**Source:** `src/db/queries/recipeSections.ts` `updateRecipeSection` line 63, `reorderRecipeSections` line 99
**Apply to:** `updateRecipeStep` SQL — include `updated_at = datetime('now')` if `recipe_steps` has this column. Verify against migration before adding.

### Error handling wrapper in `onSubmit`
**Source:** `src/features/recipes/RecipeFormSheet.tsx` lines 213-323
**Apply to:** Entire diff algorithm (keep inside existing `try { ... } catch { toast.error(...) }`)
```typescript
async function onSubmit(values: RecipeFormValues) {
  try {
    // ... all diff phases
  } catch {
    toast.error("Failed to save recipe. Changes were not saved.");
  }
}
```

---

## Test Patterns

### Pure-function unit test structure
**Source:** `tests/painting/recipeSection.pure.test.ts`
**Apply to:** New diff logic tests (if diff is extracted to pure utility functions)

```typescript
// Pattern: no mocks, direct function import, fixture objects at top of file
import { describe, it, expect } from "vitest";
import { buildDraftSections } from "@/features/recipes/recipeSection";
import type { RecipeSection } from "@/types/recipeSection";

const SECTION_1: RecipeSection = { id: 1, recipe_id: 10, name: "Armor", ... };

describe("function name", () => {
  it("Test N: description of behavior", () => {
    const result = functionUnderTest(input);
    expect(result).toEqual(expected);
  });
});
```

### `DraftStep`/`DraftSection` factory helper in tests
**Source:** `tests/painting/recipeSteps.test.ts` lines 8-23
**Apply to:** New `dbId` tests — use the same `step(over)` helper pattern:
```typescript
function step(over: Partial<DraftStep> = {}): DraftStep {
  return {
    localId: "x",
    dbId: null,        // add this after Phase 70
    step_name: "",
    paint_id: null,
    // ... rest of fields
    ...over,
  };
}
```

---

## No Analog Found

All modified files have close analogs in the codebase. No file in this phase is greenfield.

---

## Critical Anti-Patterns (from RESEARCH.md)

| Anti-Pattern | Why Wrong | Correct Pattern |
|---|---|---|
| Seed `sectionIdMap` only from INSERT results | Surviving sections never get an entry — their steps get `section_id: null` | Seed from `sec.dbId` for all surviving sections BEFORE processing inserts (Pitfall 1) |
| Rely on COALESCE in `updateRecipeSection` for null-clearing | COALESCE means `null` = "don't change", not "clear the field" | Pass non-null values for `name` and `optional` (always required fields in form schema) (Pitfall 2) |
| Per-section step delete using filtered `existingSteps` | Step dragged to another section looks "missing" from old section and gets deleted | Collect global `draftStepDbIds` set across ALL sections before any delete pass (Pitfall 3) |
| Process steps before sections are fully committed | New sections have no DB ID yet — FK assignment for new steps fails | Always complete all section phases (delete + update + insert + map) before any step phases (D-13) |

---

## Metadata

**Analog search scope:** `src/features/recipes/`, `src/db/queries/`, `src/types/`, `tests/painting/`
**Files scanned:** 9 source files, 2 test files
**Pattern extraction date:** 2026-05-13
