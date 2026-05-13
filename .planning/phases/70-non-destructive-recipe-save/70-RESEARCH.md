# Phase 70: Non-Destructive Recipe Save - Research

**Researched:** 2026-05-13
**Domain:** Recipe form state management + SQLite diff-save pattern
**Confidence:** HIGH

## Summary

Phase 70 replaces the current DELETE-all + re-INSERT recipe save with a three-way diff that preserves existing section and step database IDs. The root cause is `buildDraftSections` in `recipeSection.ts`: it discards the DB row `id` when converting sections to draft state, so the save flow has no way to match a draft item back to its DB row — it deletes everything and rebuilds. The fix threads `dbId: number | null` through `DraftSection` and `DraftStep`, populates it during `buildDraftSections`, and replaces the DELETE-all loop in `RecipeFormSheet.tsx onSubmit` with a set-difference algorithm.

The query layer already has everything needed except one missing function: `updateRecipeStep`. The `updateRecipeSection` in `recipeSections.ts` is a ready-made template. The `reorderRecipeSections` function demonstrates the sequential-loop update pattern. The save flow processes sections before steps so that newly inserted sections have DB IDs available for step FK assignment — a topological ordering constraint the planner must respect.

**Primary recommendation:** Add `dbId` to both draft types, fix `buildDraftSections`, add `updateRecipeStep` to `recipePaints.ts`, then replace the DELETE-all block (lines 233-240 of `RecipeFormSheet.tsx`) with the five-phase diff sequence from D-13.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add `dbId: number | null` to both `DraftStep` (recipeSteps.ts) and `DraftSection` (recipeSection.ts). `null` = new item; number = maps to existing DB row.
- **D-02:** `buildDraftSections` must populate `dbId` from the DB row `id` field. Currently assigns only `localId` (fresh UUID) and discards DB ID — root cause of DELETE-all pattern.
- **D-03:** `makeDraftStep()` and `makeDraftSection()` set `dbId: null` for newly created items.
- **D-04:** `onSubmit` diff for sections: UPDATE if `dbId` present in draft, DELETE if DB ID absent from all draft `dbId`s, INSERT if `dbId: null`.
- **D-05:** Same diff logic for steps within each section.
- **D-06:** Diff compares against `existingSections` and `existingSteps` already fetched via React Query hooks — no additional DB fetch.
- **D-07:** Add `updateRecipeStep` to `recipePaints.ts` covering all 13 mutable step columns.
- **D-08:** Save flow passes ALL fields to `updateRecipeSection` (not relying on COALESCE null-preservation).
- **D-09:** Full-row update for any changed item — no field-level diffing.
- **D-10:** Always write `order_index` for ALL surviving sections and steps, even if content didn't change.
- **D-11:** Section order = array position in `sections[]`. Step order = array position within `section.steps[]`. Both 0-based via `computeOrderIndex`.
- **D-12:** For steps moving between sections, the step's `section_id` FK must be updated to the target section's DB ID.
- **D-13:** Save order: (1) delete removed sections, (2) update existing sections, (3) insert new sections, (4) build final sectionIdMap, (5) process steps with correct section_id values.
- **D-14:** No explicit transaction wrapper — Tauri plugin-sql JS bridge doesn't expose BEGIN/COMMIT. Matches existing save pattern.
- **D-15:** Partial failures are acceptable — non-destructive approach means existing IDs survive retry.
- **D-16:** `duplicateRecipe` in `recipes.ts` is unaffected — creates fresh IDs for the copy by design.

### Claude's Discretion
- Whether to extract the diff logic into pure utility functions (`diffSections`, `diffSteps`) or keep it inline in `onSubmit`
- Whether to add `updateRecipeStep` to `recipePaints.ts` alongside existing functions or create a separate file
- Whether to batch or execute sequentially (current pattern is sequential loops)
- How to handle the edge case of a step that existed in section A, was dragged to section B, and section A was then deleted — the step should survive because it's in section B now

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REC-02 | Editing a recipe preserves existing section/step IDs — only changed fields are updated in place, only user-removed sections/steps are deleted | Enabled by: `dbId` tracking in draft state + three-way diff in `onSubmit` + new `updateRecipeStep` query function |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| DB ID tracking in form state | Frontend (recipeSection.ts, recipeSteps.ts) | — | Draft state is a frontend concern; `dbId` is a transparent field the UI ignores but the save flow uses |
| Three-way diff algorithm | Frontend (RecipeFormSheet.tsx onSubmit) | — | All diff inputs (existingSections, existingSteps, draft sections) are already in-memory in the component |
| Step UPDATE query | DB query layer (recipePaints.ts) | — | Query functions are co-located per entity; `updateRecipeStep` belongs alongside `addRecipePaint`/`removeRecipePaint` |
| Section order persistence | DB query layer (recipeSections.ts) | Frontend (onSubmit) | `reorderRecipeSections` already exists; onSubmit drives the order; no new query needed |
| Topological save ordering | Frontend (RecipeFormSheet.tsx onSubmit) | — | JS must control section-before-step ordering because there is no DB-level transaction |

## Standard Stack

No new libraries or dependencies. This phase is a pure refactor of existing TypeScript and query code.

### Core (already installed)
| Component | Version | Purpose | Role in Phase |
|-----------|---------|---------|---------------|
| Tauri plugin-sql | existing | SQLite access via IPC | `db.execute()` for UPDATE/DELETE/INSERT |
| React Query | existing | Server state / cache | `existingSections`, `existingSteps` already fetched; cache invalidation unchanged |
| TypeScript | 5 | Type safety | `dbId` field addition to interfaces |

**No new installations required.**

## Architecture Patterns

### System Architecture Diagram

```
RecipeFormSheet.tsx onSubmit
  ├── [existing] updateRecipe (recipe-level fields)
  │
  ├── [NEW] Section diff against existingSections
  │     ├── Phase 1: DELETE sections (dbId not in draft) → CASCADE deletes child steps
  │     ├── Phase 2: UPDATE existing sections (dbId present in draft)
  │     ├── Phase 3: INSERT new sections (dbId: null) → capture lastInsertId
  │     └── Phase 4: Build sectionIdMap (localId → dbId for all surviving sections)
  │
  ├── [NEW] Step diff against existingSteps (per section in sectionIdMap order)
  │     ├── DELETE steps (dbId not in any draft step)
  │     ├── UPDATE existing steps (dbId present, including section_id if moved)
  │     └── INSERT new steps (dbId: null)
  │
  └── [existing] Invalidate 6 React Query cache keys
```

### Recommended Project Structure

No structural changes. All modifications are within existing files:
```
src/
  features/recipes/
    recipeSteps.ts          # Add dbId to DraftStep + makeDraftStep
    recipeSection.ts        # Add dbId to DraftSection + buildDraftSections + makeDraftSection
    RecipeFormSheet.tsx     # Replace DELETE-all with diff algorithm in onSubmit
  db/queries/
    recipePaints.ts         # Add updateRecipeStep function
```

### Pattern 1: dbId Threading Through Draft State

**What:** Add `dbId: number | null` to both draft interfaces. Populate from DB row `id` in `buildDraftSections`. Set `null` in factory functions.

**When to use:** Any time the save flow needs to match a form item back to its DB row without re-fetching.

**Current code (root cause — discards DB id):**
```typescript
// Source: src/features/recipes/recipeSection.ts line 71-103 [VERIFIED: codebase grep]
// PROBLEM: localId is a fresh UUID, db row id is discarded
return {
  localId: crypto.randomUUID(),  // ← new UUID, no memory of DB id
  name: s.name,
  // ... other fields
};
```

**After fix:**
```typescript
// DraftSection interface — add dbId
export interface DraftSection {
  localId: string;
  dbId: number | null;   // ← NEW: null for new items, DB row id for existing
  name: string;
  // ... rest unchanged
}

// buildDraftSections — populate dbId from DB row
return {
  localId: crypto.randomUUID(),
  dbId: s.id,             // ← NEW: carry the DB id
  name: s.name,
  // ... rest unchanged
};

// makeDraftSection — new items start with null
export function makeDraftSection(name = "Steps"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    dbId: null,            // ← NEW: not yet in DB
    // ... rest unchanged
  };
}
```

### Pattern 2: Set-Difference Diff Algorithm

**What:** Compute which sections/steps to DELETE (DB id absent from draft), UPDATE (DB id present in draft), and INSERT (draft item has `dbId: null`).

**When to use:** Any time form state contains a mix of existing and new items that maps back to DB rows.

**Example — section diff:**
```typescript
// Source: CONTEXT.md D-04/D-13 [VERIFIED: context analysis]

// Step 1: DELETE removed sections (CASCADE handles their steps)
const draftSectionDbIds = new Set(
  sections.map((s) => s.dbId).filter((id): id is number => id !== null)
);
for (const existing of existingSections) {
  if (!draftSectionDbIds.has(existing.id)) {
    await deleteRecipeSection(existing.id);
  }
}

// Step 2: UPDATE existing sections
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

// Step 3: INSERT new sections, capture IDs
const sectionIdMap = new Map<string, number>();
// First: seed map with surviving sections
for (const sec of sections) {
  if (sec.dbId !== null) sectionIdMap.set(sec.localId, sec.dbId);
}
// Then: insert new sections
for (let i = 0; i < sections.length; i++) {
  const sec = sections[i];
  if (sec.dbId === null) {
    const newId = await createRecipeSection({ recipe_id: recipeId, name: sec.name, order_index: i, ... });
    sectionIdMap.set(sec.localId, newId);
  }
}
```

### Pattern 3: updateRecipeStep (new query function)

**What:** UPDATE a step row by id, covering all 13 mutable columns. Template from `updateRecipeSection`.

**When to use:** Editing an existing step's content or moving it to a different section.

**Example:**
```typescript
// Source: recipeSections.ts updateRecipeSection template [VERIFIED: codebase read]
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
      input.id, input.paint_id, input.step_name, input.order_index,
      input.notes ?? null, input.painting_phase ?? null, input.tool ?? null,
      input.technique ?? null, input.dilution ?? null, input.time_estimate_minutes ?? null,
      input.step_photo_path ?? null, input.alt_paint_id ?? null, input.section_id ?? null,
    ]
  );
}
```

### Pattern 4: Section-Deleted-But-Step-Survived Edge Case

**What:** A step that was in section A (now deleted) but was dragged to section B before the delete. The step should survive because its `dbId` appears in section B's draft steps.

**How the diff handles it:** The step-level diff collects ALL draft step `dbId` values across ALL sections before deciding what to delete. A step's survival is based on whether its `dbId` appears anywhere in the remaining draft, not in the section that originally contained it. [VERIFIED: D-04/D-05 diff logic; the section diff runs before the step diff, so when processing steps, the remaining draft sections are the only ones iterated]

**Implementation note:** Collect surviving step `dbId`s first:
```typescript
const draftStepDbIds = new Set(
  sections.flatMap((s) => s.steps)
    .map((st) => st.dbId)
    .filter((id): id is number => id !== null)
);
// Then delete steps whose dbId isn't in this set
for (const existing of existingSteps) {
  if (!draftStepDbIds.has(existing.id)) {
    await removeRecipePaint(existing.id);
  }
}
```

### Anti-Patterns to Avoid

- **Re-fetching sections/steps in onSubmit:** `existingSections` and `existingSteps` are already in scope from React Query hooks — use them directly (D-06).
- **Field-level diffing:** Don't try to detect which specific fields changed. Full-row UPDATE is correct for rows with 13 columns (D-09).
- **Relying on COALESCE null-preservation in `updateRecipeSection`:** Pass ALL fields explicitly so the DB matches form state exactly — COALESCE means null = "don't change", but we want null to clear the field (D-08).
- **Processing steps before sections:** New sections need their `lastInsertId` before steps can reference them as FK. Steps must be processed after the full sectionIdMap is built (D-13).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step UPDATE query | Custom "smart patch" comparing field by field | Full-row UPDATE covering all 13 columns | Field-level diffing adds complexity with no benefit on small rows |
| Section ID mapping | Re-fetching section IDs from DB after insert | `lastInsertId` from `db.execute()` result | Already the established pattern in createRecipeSection |
| Transaction rollback | Manual compensating deletes on failure | Accept partial failure (D-14/D-15) | Tauri plugin-sql JS bridge exposes no BEGIN/COMMIT |

**Key insight:** The complexity in this phase is entirely in the diff algorithm and ordering, not in the DB layer. The query functions are simple CRUD — the intelligence lives in `onSubmit`.

## Common Pitfalls

### Pitfall 1: sectionIdMap seeded only from new inserts
**What goes wrong:** If `sectionIdMap` is only populated from `createRecipeSection` `lastInsertId` calls (as in the current code), existing sections that survived the diff have no entry in the map. Steps belonging to surviving sections get `section_id: null` or throw a Map lookup error.
**Why it happens:** Current code only builds the map during INSERT because it used to delete everything first. After the diff, surviving sections have `dbId !== null` and were never inserted.
**How to avoid:** Seed the map from `sec.dbId` for all surviving sections BEFORE processing INSERT-only sections. Final map must cover all sections (surviving + newly inserted).
**Warning signs:** Steps saved with `section_id = null` after a plain field rename with no section changes.

### Pitfall 2: updateRecipeSection COALESCE null-clearing bug
**What goes wrong:** `updateRecipeSection` uses `COALESCE($2, name)` for `name` and `COALESCE($4, optional)` for `optional`. Passing `null` for these fields means "don't change" — the DB retains the old value instead of clearing it.
**Why it happens:** The existing partial-update design was intentional (Phase 68 COALESCE fix applied to workflow metadata fields, but name/optional still use COALESCE). The Phase 70 save flow passes full state, not partial patches.
**How to avoid:** For the Phase 70 save flow, always pass non-null values for `name` and `optional` (they are required fields in the form schema, so they will never be null in practice). Surface and notes use direct assignment and null-clear correctly.
**Warning signs:** After renaming a section and saving, the section name reverts to the old name on re-open.

### Pitfall 3: Step diff iterates existingSteps per-section instead of globally
**What goes wrong:** If you only look at `existingSteps` filtered to the current section when deciding what to delete, a step that was dragged to a different section appears "missing" from its old section and gets deleted even though it survives in the new section.
**Why it happens:** The temptation is to process steps section-by-section with a per-section filter on `existingSteps`.
**How to avoid:** Collect the global set of surviving step `dbId`s (across ALL sections) before the delete pass. See Pattern 4.
**Warning signs:** Steps disappear from DB when the user drags them between sections.

### Pitfall 4: useEffect re-initialization race
**What goes wrong:** The `useEffect` in `RecipeFormSheet` that calls `buildDraftSections` re-runs when `existingSections.length` or `existingSteps.length` changes. After a save, React Query invalidates the cache and refetches — if `existingSections` momentarily returns empty or partial data, the form reinitializes to an incomplete state.
**Why it happens:** The effect dep array is `[recipe?.id, existingSections.length, existingSteps.length]`. Cache invalidation causes a brief loading state where `existingSections = []`.
**How to avoid:** This is an existing issue unrelated to Phase 70 changes. The `onClose()` call immediately after a successful save means the Sheet is unmounted before the refetch completes — no form reinitialization occurs on successful save. The issue only matters if the Sheet stays open post-save, which it does not.
**Warning signs:** N/A — `onClose()` at line 319 prevents this scenario.

### Pitfall 5: Missing `UpdateRecipeStepInput` type
**What goes wrong:** `recipePaints.ts` only exports `CreateRecipeStepInput` (via re-export from `types/recipePaint.ts`). Adding `updateRecipeStep` requires a corresponding `UpdateRecipeStepInput` type.
**Why it happens:** Steps were previously immutable (line 38 comment: "No updateRecipePaint — links are immutable").
**How to avoid:** Define `UpdateRecipeStepInput` analogous to the existing `UpdateRecipeSectionInput` pattern in `types/recipeSection.ts`.

## Code Examples

### Existing: createRecipeSection (INSERT + lastInsertId pattern)
```typescript
// Source: src/db/queries/recipeSections.ts line 23-42 [VERIFIED: codebase read]
export async function createRecipeSection(input: CreateRecipeSectionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_sections (recipe_id, name, ...) VALUES ($1, $2, ...)`,
    [input.recipe_id, input.name, ...]
  );
  return result.lastInsertId ?? 0;
}
```

### Existing: reorderRecipeSections (sequential UPDATE loop pattern)
```typescript
// Source: src/db/queries/recipeSections.ts line 93-103 [VERIFIED: codebase read]
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

### Current DELETE-all block to replace (RecipeFormSheet.tsx lines 233-240)
```typescript
// Source: src/features/recipes/RecipeFormSheet.tsx lines 233-240 [VERIFIED: codebase read]
// DELETE all existing sections — CASCADE handles step cleanup
for (const existing of existingSections) {
  await deleteRecipeSection(existing.id);
}
// Remove any orphaned steps without section_id (legacy data)
for (const existing of existingSteps) {
  await removeRecipePaint.mutateAsync({ id: existing.id, recipeId });
}
```

### Existing type pattern to extend (UpdateRecipeSectionInput for reference)
```typescript
// Source: src/types/recipeSection.ts line 43-44 [VERIFIED: codebase read]
export type CreateRecipeSectionInput = Omit<RecipeSection, "id" | "created_at" | "updated_at">;
export type UpdateRecipeSectionInput = Partial<Omit<CreateRecipeSectionInput, "recipe_id">> & { id: number };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DELETE-all + re-INSERT for recipe edit | Three-way diff (Phase 70) | This phase | Existing section/step IDs are preserved, enabling downstream FK references (REC-04 Phase 71) |
| Step "immutability" (remove + re-add) | Full UPDATE via updateRecipeStep | This phase | Steps can be edited in place without losing their id |

**Deprecated/outdated after this phase:**
- Line 38 comment in `recipePaints.ts` ("No updateRecipePaint — links are immutable") — replace with `updateRecipeStep`
- The orphaned-step cleanup loop (lines 237-240 of `RecipeFormSheet.tsx`) — no longer needed once sections handle steps via CASCADE or explicit step diff

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `result.lastInsertId` is always populated after INSERT (returns 0 only as fallback) | Code Examples | If lastInsertId is 0 for some inserts, sectionIdMap would have invalid entries causing step FK violations |

If this table is empty of real risks: A1 is established pattern already used in `createRecipeSection` and `addRecipePaint` throughout the codebase. Risk is LOW.

## Open Questions

1. **Where to define `UpdateRecipeStepInput`**
   - What we know: `UpdateRecipeSectionInput` is defined in `src/types/recipeSection.ts`; `CreateRecipeStepInput` is defined in `src/types/recipePaint.ts`
   - What's unclear: Whether to put `UpdateRecipeStepInput` in `src/types/recipePaint.ts` (parallel pattern) or inline in `recipePaints.ts`
   - Recommendation: Follow the parallel pattern — define in `src/types/recipePaint.ts` alongside `CreateRecipeStepInput`. Claude's discretion per CONTEXT.md.

2. **Extracting diff logic to utility functions**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - What's unclear: Whether the diff logic is complex enough to warrant pure utility extraction for testability
   - Recommendation: Extract to `diffSections(draft, existing)` and `diffSteps(draft, existing)` pure functions for testability. This enables the test plan to cover the diff logic with unit tests without mocking DB calls.

## Environment Availability

Step 2.6 SKIPPED — this phase is a pure TypeScript refactor of existing files. No external tools, services, or runtimes beyond what is already installed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/painting/recipeSection.pure.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REC-02 | `buildDraftSections` populates `dbId` from DB row id | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | ✅ (extend existing) |
| REC-02 | `makeDraftSection` and `makeDraftStep` set `dbId: null` | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts tests/painting/recipeSteps.test.ts` | ✅ (extend existing) |
| REC-02 | `updateRecipeStep` issues correct UPDATE SQL with all 13 columns | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | ✅ (extend existing) |
| REC-02 | Section diff: UPDATE surviving, DELETE removed, INSERT new | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | ❌ Wave 0 — new test |
| REC-02 | Step diff: preserves IDs, deletes removed, inserts new | unit | `pnpm test -- tests/painting/recipeSteps.test.ts` | ❌ Wave 0 — new test |
| REC-02 | Step dragged to new section survives if old section deleted | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | ❌ Wave 0 — new test |
| REC-02 | sectionIdMap is seeded from surviving sections before new inserts | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | ❌ Wave 0 — new test |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/recipeSection.pure.test.ts tests/painting/recipeSteps.test.ts tests/painting/recipeSections.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] New tests in `tests/painting/recipeSection.pure.test.ts` covering diff logic (section diff, sectionIdMap seeding, step-dragged-to-new-section edge case)
- [ ] New tests in `tests/painting/recipeSteps.test.ts` covering `dbId` on `DraftStep` + `makeDraftStep`
- [ ] New tests in `tests/painting/recipeSections.test.ts` (or new file) covering `updateRecipeStep` SQL

If diff logic is extracted to pure utility functions (Claude's discretion), those functions are pure and trivially unit-testable without any mocks — strongly preferred.

## Security Domain

No security-sensitive changes. This phase modifies only internal form state types and a DB save flow. No user input validation changes, no auth changes, no new network surface.

ASVS V5 Input Validation: All form inputs pass through the existing `recipeSchema` Zod validation before `onSubmit` is called — unchanged.

## Sources

### Primary (HIGH confidence)
- `src/features/recipes/RecipeFormSheet.tsx` — onSubmit function, DELETE-all block at lines 233-240, section/step creation loop at lines 268-308 [VERIFIED: codebase read]
- `src/features/recipes/recipeSection.ts` — `DraftSection` interface, `buildDraftSections`, `makeDraftSection` [VERIFIED: codebase read]
- `src/features/recipes/recipeSteps.ts` — `DraftStep` interface, `makeDraftStep`, `computeOrderIndex` [VERIFIED: codebase read]
- `src/db/queries/recipePaints.ts` — `addRecipePaint`, `removeRecipePaint`, line 38 immutability comment [VERIFIED: codebase read]
- `src/db/queries/recipeSections.ts` — `updateRecipeSection`, `deleteRecipeSection`, `reorderRecipeSections` [VERIFIED: codebase read]
- `src/types/recipePaint.ts` — `RecipeStep`, `CreateRecipeStepInput` [VERIFIED: codebase read]
- `src/types/recipeSection.ts` — `RecipeSection`, `UpdateRecipeSectionInput` [VERIFIED: codebase read]
- `.planning/phases/70-non-destructive-recipe-save/70-CONTEXT.md` — all decisions D-01 through D-16 [VERIFIED: codebase read]
- `.planning/REQUIREMENTS.md` — REC-02 definition [VERIFIED: codebase read]
- `tests/painting/recipeSection.pure.test.ts` — existing test coverage for `buildDraftSections` [VERIFIED: codebase read]
- `tests/painting/recipeSteps.test.ts` — existing test coverage for `makeDraftStep`, `computeOrderIndex` [VERIFIED: codebase read]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all verified from codebase
- Architecture: HIGH — diff algorithm decisions are fully locked in CONTEXT.md; code structure verified
- Pitfalls: HIGH — derived from concrete code analysis of `buildDraftSections` and `updateRecipeSection`

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable codebase; no fast-moving dependencies)
