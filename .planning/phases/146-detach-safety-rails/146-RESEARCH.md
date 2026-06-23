# Phase 146: Detach & Safety Rails — Research

**Researched:** 2026-06-23
**Domain:** SQLite FK teardown sequence, React Query invalidation, shadcn AlertDialog/Dialog, data-layer test scaffolding
**Confidence:** HIGH — all findings drawn directly from existing codebase files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Detach mechanics (data layer):**
- `detachTechniqueInstance(db, instanceId)`: bake `effectivePaintId()` into `recipe_steps.paint_id` for each technique-owned step, then NULL `technique_step_id`; NULL `technique_instance_id` + `technique_section_id` on instance sections; DELETE the `recipe_technique_instances` row + its `recipe_technique_slot_maps`.
- Granularity: per technique-instance (all sections/steps at once), not per-section.
- Progress preservation: `recipe_step.id` values are NEVER recreated — only FK columns are cleared. `unit_recipe_step_progress` (keyed by `recipe_step_id`) survives untouched. Zero remap.
- Code shape: single db handle, flat inline SQL, no nested `getDb()`, no nested `BEGIN`. Data-layer test written FIRST (guard-first discipline mirroring Phases 143/144).

**Badge presentation & detach trigger (UI):**
- Badge: existing shadcn `Badge variant="secondary"` with `BookOpen` icon, rendered in both `RecipeSectionCard` (editor) and `SectionedTimeline` (read-only).
- Detach action: editor only — `Unlink` ghost icon button (`h-7 w-7`) adjacent to badge; SectionedTimeline badge is read-only display only.
- Confirmation: shadcn `AlertDialog` with title "Detach technique?", warning + reassurance copy.
- Post-detach: success toast "Technique detached — now plain recipe content" + invalidate recipe/section/step/progress/slot-map query keys.

**Technique delete safety rail (KEY DECISION):**
- Extend `TechniqueDeleteDialog` to surface non-detached live-instance count (reuse/extend `getNonDetachedInstanceCount`).
- On delete with live instances: AUTO-DETACH FIRST (iterate non-detached instances, run detach = bake paints → plain content), then delete technique. Single db handle, flat inline SQL.
- Confirm button label (count > 0): `"Detach {N} recipe{s} & delete"`.
- Case A (count = 0): keep existing simple "permanently remove" copy unchanged.

**Edge cases:**
- Unfilled slots at detach: bake `NULL` paint_id (step stays validly paintless).
- Manual user-added steps (paint_id ≠ NULL) inside technique section: left untouched (already plain).
- Re-attach / re-link after detach: OUT OF SCOPE.
- Bulk detach across recipes: OUT OF SCOPE.

### Claude's Discretion

- Module placement of `detachTechniqueInstance` (extend `recipeTechniqueInstances.ts` vs `recipeTechniqueResync.ts` vs new module).
- Exact badge component composition and the menu/affordance used to host Detach action in editor (dropdown vs inline button).
- React Query hook shape for detach mutation (`useDetachTechniqueInstance`) and invalidation symmetry.
- Test file naming under `tests/data-layer/` mirroring existing conventions.

### Deferred Ideas (OUT OF SCOPE)

- Re-attach / re-link a detached section back to its technique.
- Bulk detach across multiple recipes at once.
- TQOL items (per-instance timestamp, slot suggestions, bulk reassign, soft-override flow).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAFE-01 | Every technique-sourced section shows a "from technique X" badge in both the recipe editor and the SectionedTimeline | Badge already rendered in both surfaces via `TechniqueSectionBadge`; phase adds Unlink button in editor only |
| SAFE-02 | User can detach a technique instance — materializing sections/steps into plain editable recipe content, remapping progress correctly, removing the live link | `detachTechniqueInstance` SQL sequence + `effectivePaintId()` bake ordering; proven by data-layer test |
| SAFE-03 | Detach requires confirmation; result is fully editable plain section with no half-linked state | `AlertDialog` confirmation + extended `TechniqueDeleteDialog` auto-detach path |

</phase_requirements>

---

## Summary

Phase 146 adds the one-way escape hatch (detach) and persistent link visibility (badges) to the v0.7.0 Technique Library. All prior phases (141–145) have already shipped the foundation schema (migration 051), resync engine, apply flow, and badge rendering infrastructure. This phase has zero new dependencies and zero new migrations.

The core engineering challenge is the **detach SQL sequence ordering constraint**: resolved paints (`effectivePaintId()` via the slot map) must be baked into `recipe_steps.paint_id` BEFORE the `recipe_technique_slot_maps` rows are deleted — once the slot maps are gone, the paint cannot be recovered. Every other operation (NULL-ing FK columns, deleting the instance row) is safe to perform afterwards because SQLite FK `ON DELETE SET NULL` / `ON DELETE CASCADE` behaviors are well-understood from migration 051.

The **delete safety rail** requires the `useDeleteTechnique` mutation to call detach for each non-detached instance before issuing the technique DELETE. Because `recipe_technique_instances` has `ON DELETE CASCADE` from `techniques`, a naive technique DELETE would cascade-delete instances and their slot maps without baking the paints first — destroying recipe content. The auto-detach loop prevents this.

**Primary recommendation:** Implement `detachTechniqueInstance(db, instanceId)` in a new `recipeTechniqueDetach.ts` module (keeps apply/resync/detach as distinct peer files). Write the data-layer test first. Then wire the UI surface changes and the delete safety rail mutation update.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Detach SQL sequence | DB queries layer (`src/db/queries/`) | — | All DB writes are in query modules; mirrors apply and resync patterns |
| Paint bake before slot-map delete | DB queries layer | `src/lib/effectivePaintId.ts` | `effectivePaintId()` is a pure function called during the detach query sequence |
| `useDetachTechniqueInstance` hook | React Query hooks (`src/hooks/`) | — | One hook file per entity; mirrors `useTechniqueInstances.ts` `useApplyTechnique` shape |
| Auto-detach-before-delete loop | `useDeleteTechnique` mutation in `src/hooks/useTechniques.ts` | `detachTechniqueInstance` query fn | Delete mutation must call detach loop, then technique DELETE, all on same db handle |
| Detach confirmation dialog (DetachConfirmDialog) | `src/features/recipes/` | `RecipeSectionCard.tsx` host | Local to the recipe editor surface; AlertDialog pattern already in RecipeSectionCard |
| Unlink button in RecipeSectionCard | `src/features/recipes/RecipeSectionCard.tsx` | — | Adjacent to existing `TechniqueSectionBadge`; editor-only |
| SectionedTimeline badge (SAFE-01) | `src/features/recipes/SectionedTimeline.tsx` | — | Badge already rendered when `techniqueSectionInfoMap` is populated — NO change needed |
| Extended TechniqueDeleteDialog | `src/features/techniques/TechniqueDeleteDialog.tsx` | `useDeleteTechnique` | Extends existing dialog; prop rename for live instance count |
| Cache invalidation after detach | `src/hooks/useTechniqueInstances.ts` or new hook | Query keys from `useTechniqueInstances.ts` | Post-detach invalidation must mirror `invalidateAfterApply` breadth |
| Data-layer test | `tests/data-layer/` | `db-helpers.ts` | Guard-first test written before UI, mirroring `apply-technique.test.ts` |

---

## Standard Stack

No new packages. All components already installed. [VERIFIED: codebase inspection]

### Existing Assets Used in This Phase

| Asset | File | Role in Phase 146 |
|-------|------|-------------------|
| `Badge variant="secondary"` | `@/components/ui/badge` | "From {technique}" badge (already rendered) |
| `AlertDialog` + sub-parts | `@/components/ui/alert-dialog` | DetachConfirmDialog — already imported in `RecipeSectionCard.tsx` |
| `Dialog` + sub-parts | `@/components/ui/dialog` | `TechniqueDeleteDialog` (already Dialog) |
| `Button variant="destructive"` | `@/components/ui/button` | Confirm CTAs |
| `Button variant="ghost" size="icon"` | `@/components/ui/button` | Unlink trigger (h-7 w-7 matching existing icon buttons in card) |
| Sonner `toast` | `sonner` | Post-detach/delete feedback |
| `Unlink` icon | `lucide-react` | Detach trigger button icon |
| `BookOpen` icon | `lucide-react` | Already on `TechniqueSectionBadge` — no change |
| `TechniqueSectionBadge` | `src/features/recipes/TechniqueSectionBadge.tsx` | Already rendered in editor + SectionedTimeline; no structural changes needed for SAFE-01 |

---

## Package Legitimacy Audit

No new packages in this phase. Not applicable.

---

## Architecture Patterns

### Detach SQL Sequence (CRITICAL ORDERING CONSTRAINT)

The ordering is not arbitrary — it is dictated by FK dependencies:

```
Step 1: SELECT recipe_steps WHERE section IN (sections for instanceId) AND technique_step_id IS NOT NULL
Step 2: For each technique-owned step:
          resolvedPaint = effectivePaintId(step, slotMap)
          UPDATE recipe_steps SET paint_id = $resolvedPaint WHERE id = $stepId
          -- paint_id baked BEFORE slot maps are deleted
Step 3: UPDATE recipe_steps SET technique_step_id = NULL
        WHERE section_id IN (SELECT id FROM recipe_sections WHERE technique_instance_id = $instanceId)
        AND technique_step_id IS NOT NULL
Step 4: UPDATE recipe_sections
        SET technique_instance_id = NULL, technique_section_id = NULL
        WHERE technique_instance_id = $instanceId
Step 5: DELETE FROM recipe_technique_instances WHERE id = $instanceId
        -- ON DELETE CASCADE fires on recipe_technique_slot_maps (instance_id FK)
        -- Nothing else cascades from this DELETE (recipe_sections.technique_instance_id is SET NULL, already NULLed in Step 4)
```

**Why Step 2 must precede Step 5:** `recipe_technique_slot_maps` has `ON DELETE CASCADE` from `recipe_technique_instances(id)`. When the instance row is deleted in Step 5, the slot maps are gone. If paint was not baked first, `effectivePaintId()` can no longer resolve it.

**Why Step 4 must precede Step 5:** `recipe_sections.technique_instance_id` has `ON DELETE SET NULL` from `recipe_technique_instances(id)`. If Step 5 fires without Step 4, the SET NULL fires automatically — correct, but it also NULLs `technique_section_id` via the same cascade (migration 052 confirms `technique_section_id REFERENCES technique_sections(id) ON DELETE SET NULL`). Doing Step 4 explicitly before Step 5 is belt-and-suspenders and makes the intent clear.

**What does NOT cascade on instance DELETE:**
- `recipe_sections` rows: NOT deleted (SET NULL on technique_instance_id). Sections survive.
- `recipe_steps` rows: NOT deleted (SET NULL on technique_step_id). Steps survive.
- `unit_recipe_step_progress`: NOT deleted (it references `recipe_steps.id` which survives). Progress preserved.

**What DOES cascade on instance DELETE:**
- `recipe_technique_slot_maps`: CASCADE deleted (instance_id FK with ON DELETE CASCADE). Safe because paint was already baked in Step 2.

### `effectivePaintId()` in the Detach Context

[VERIFIED: codebase inspection — `src/lib/effectivePaintId.ts`]

The function signature:
```typescript
export function effectivePaintId(
  step: PaintResolvableStep,  // needs: { id, paint_id, technique_step_id? }
  slotMap: SlotResolutionMap, // ReadonlyMap<recipe_step_id, paint_id|null>
): number | null
```

For detach, the `slotMap` must be built from `recipe_technique_slot_maps` BEFORE deleting them. The detach function must query `getSlotResolutionMap(recipeId)` (or a direct SQL equivalent) up front, build the map, then iterate steps. Since `detachTechniqueInstance` receives a `db` handle, it should query the slot map directly via SQL (same db handle, no `getDb()` call), not call `getSlotResolutionMap` which calls `getDb()` internally.

**Slot map SQL for detach context:**
```sql
SELECT rs.id AS recipe_step_id, sm.paint_id
FROM recipe_steps rs
INNER JOIN recipe_sections sec ON rs.section_id = sec.id
INNER JOIN technique_steps ts ON rs.technique_step_id = ts.id
LEFT JOIN recipe_technique_slot_maps sm
  ON sm.instance_id = sec.technique_instance_id
 AND sm.slot_id = ts.colour_slot_id
WHERE sec.technique_instance_id = $1
  AND rs.technique_step_id IS NOT NULL
```

Result is a `Map<recipe_step_id, paint_id|null>` — the same shape as `SlotResolutionMap`. Then call `effectivePaintId(step, slotMap)` per step.

### Manual-Step Discrimination During Detach

[VERIFIED: codebase inspection — `recipeTechniqueResync.ts` lines 283-296]

Resync established the discriminator: a technique-owned (materialised) step always has `paint_id = NULL` (effectivePaintId spine); a user-added manual step has `paint_id != NULL`. The detach loop must only bake and clear steps where `technique_step_id IS NOT NULL`. Steps with `technique_step_id IS NULL` (manual steps) inside the same section are already plain — skip them entirely. This matches the resync orphan-cleanup logic.

### Single DB Handle Contract

[VERIFIED: codebase inspection — `recipeTechniqueResync.ts` header, lines 23-26]

`detachTechniqueInstance` MUST accept `db: DbHandle` as its first parameter and NEVER call `getDb()` internally when called from `useDeleteTechnique`'s auto-detach loop. The delete mutation needs to call detach for N instances on the same handle before issuing `DELETE FROM techniques WHERE id = $1`.

However: when detach is triggered from the per-recipe editor (the UI Unlink button), it is a standalone operation. In that case, `detachTechniqueInstance` MAY call `getDb()` internally (similar to `getNonDetachedInstanceCount`). The cleanest solution is to write `detachTechniqueInstance(db, instanceId)` that takes a db handle, then write a thin `detachTechniqueInstanceStandalone(instanceId)` wrapper that calls `getDb()` and delegates — OR accept that the UI hook calls `getDb()` once and passes the handle.

The simpler resolution: accept `db: DbHandle` and export separately. The UI hook (`useDetachTechniqueInstance`) creates its own `const db = await getDb()` and calls `detachTechniqueInstance(db, instanceId)`.

### Auto-Detach Loop in `useDeleteTechnique`

[VERIFIED: codebase inspection — `useTechniques.ts` lines 147-155; `TechniqueDeleteDialog.tsx`]

Current `useDeleteTechnique`:
```typescript
export function useDeleteTechnique() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteTechnique,   // ← calls getDb() internally, then DELETE FROM techniques
    onSuccess: () => { invalidateTechniqueKeys(qc); },
  });
}
```

Phase 146 change: the `mutationFn` must become a new function (e.g. `detachAllAndDeleteTechnique(techniqueId)`) that:
1. `const db = await getDb()`
2. Queries non-detached instances for the technique
3. For each: `await detachTechniqueInstance(db, instance.id)`
4. `await db.execute('DELETE FROM techniques WHERE id = $1', [techniqueId])`

On Step 4, `ON DELETE CASCADE` fires from `techniques` → `technique_sections` → `technique_steps` (and `technique_colour_slots`). The `recipe_technique_instances` row has ALREADY been deleted by detach in Step 3, so the cascade from techniques does NOT double-delete it (SQLite skips already-absent rows). The recipe content (sections, steps) is untouched.

Crucially: `onSuccess` invalidation must be extended to include recipe-level keys (matching `invalidateAfterApply`) because detach writes to `recipe_sections` and `recipe_steps`.

### `TechniqueDeleteDialog` Extension

[VERIFIED: codebase inspection — `TechniqueDeleteDialog.tsx`]

Current prop: `usageCount: number` — used for two purposes today (guard text + button label). Phase 146 renames the semantic to "non-detached live instance count". Options:
1. Add a new prop `liveInstanceCount: number` alongside `usageCount` and use `liveInstanceCount` for the new case-B text.
2. Rename the prop (breaking change to parent callers — find all call sites).

The UI-SPEC (line 164) defers this to the executor. Research finds `TechniqueDeleteDialog` is called from the technique library page — one call site. Renaming is safe.

The dialog must also become aware of the pending/loading state of the extended mutation (currently just `deleteTechnique.isPending`). The label changes: "Detaching & deleting…" when pending in case B.

### Recommended Project Structure

No new directories. New files:

```
src/
  db/queries/
    recipeTechniqueDetach.ts    ← new: detachTechniqueInstance(db, instanceId)
  hooks/
    useTechniqueDetach.ts       ← new: useDetachTechniqueInstance() mutation hook
  features/recipes/
    DetachConfirmDialog.tsx     ← new: AlertDialog component (or inline in RecipeSectionCard)
tests/data-layer/
  technique-detach.test.ts     ← new: guard-first invariant tests
```

The `TechniqueDeleteDialog.tsx` and `useTechniques.ts` are modified in place.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detach confirmation UI | Custom modal | shadcn `AlertDialog` | Already imported in `RecipeSectionCard.tsx`; Radix focus trap + Escape handling |
| Delete confirmation UI | New modal | Extend existing `TechniqueDeleteDialog` (shadcn `Dialog`) | Existing dialog already has the correct props + layout |
| Success/error feedback | Custom notification | sonner `toast` | Already used throughout; `toast.success()` / `toast.error()` |
| Cache refresh after detach | Manual state update | React Query `invalidateQueries` | Existing 7-key invalidation contract in `useTechniqueInstances.ts` |
| FK teardown logic | Custom cascade code | SQLite FK `ON DELETE CASCADE` / `SET NULL` | Already configured in migration 051 — just DELETE the instance row after baking paints |
| Slot map resolution for baking | Custom JOIN | Re-use `effectivePaintId()` pure function | Already proven correct for all slot-fill edge cases (Phase 143/145) |

---

## FK Behaviors Verified from Migration 051+052

[VERIFIED: codebase inspection — migration files]

Critical table: which rows DELETE vs survive when `DELETE FROM recipe_technique_instances WHERE id = $instanceId` fires:

| Table | FK column | ON DELETE behavior | Effect |
|-------|-----------|-------------------|--------|
| `recipe_technique_slot_maps` | `instance_id → recipe_technique_instances(id)` | CASCADE | Slot maps deleted — GOOD (paint was already baked) |
| `recipe_sections` | `technique_instance_id → recipe_technique_instances(id)` | SET NULL | Sections survive; `technique_instance_id` becomes NULL — GOOD |
| `recipe_sections` | `technique_section_id → technique_sections(id)` (migration 052) | SET NULL | Sections survive; `technique_section_id` becomes NULL — GOOD |

Critical: there is NO CASCADE from `recipe_technique_instances` that would delete `recipe_steps` rows. Steps survive because:
- `recipe_steps.technique_step_id → technique_steps(id) ON DELETE SET NULL` (migration 051) — only fires when the `technique_steps` row is deleted, not when the instance is deleted.
- `recipe_steps.section_id → recipe_sections(id) ON DELETE CASCADE` — sections are NOT deleted (only SET NULL their instance FK), so this cascade does NOT fire.

Therefore: after detach, `recipe_steps` rows persist with `technique_step_id = NULL` (baked paint, plain steps). `unit_recipe_step_progress` rows persist because they reference `recipe_steps(id) ON DELETE CASCADE` — and those steps still exist.

---

## Common Pitfalls

### Pitfall 1: Baking Paint AFTER Deleting Slot Maps

**What goes wrong:** If the instance row is deleted first, `ON DELETE CASCADE` removes `recipe_technique_slot_maps`. The slot map is now gone. `effectivePaintId()` returns `null` for every technique step. Baking null means steps lose their colour — invisible destruction of user data.

**Why it happens:** Natural "delete the instance cleanly first" intuition, without realising slot maps are the only source of truth for resolved colours on technique-owned steps.

**How to avoid:** Always query the slot map and bake paints in Step 2 (before any DELETE). Data-layer test must assert that after detach, `recipe_steps.paint_id` equals the expected resolved colour, NOT null.

**Warning signs:** Any test that deletes the instance before calling `effectivePaintId()` will silently pass because `effectivePaintId(step, emptyMap) → null` and `UPDATE ... SET paint_id = NULL` succeeds without error.

### Pitfall 2: Calling `getDb()` Inside `detachTechniqueInstance` During the Delete Loop

**What goes wrong:** If `detachTechniqueInstance` calls `getDb()` internally and the delete loop also calls `getDb()`, the two handles may be on different SQLite pool connections. Auto-commit sequencing breaks: the technique DELETE on handle A may see a different view of slot_maps than the detach on handle B.

**Why it happens:** Resync documents this same pitfall (file header lines 23-26). A standalone `detach` function naturally calls `getDb()` for convenience.

**How to avoid:** Accept `db: DbHandle` as first parameter. The delete mutation (`detachAllAndDeleteTechnique`) creates ONE `const db = await getDb()` and passes it to every detach call + the final DELETE.

**Warning signs:** Tests that call detach standalone (UI path) won't catch this — integration tests are needed or careful code review of the delete mutation path.

### Pitfall 3: Missing Manual-Step Discrimination

**What goes wrong:** A user may have added plain steps (with their own `paint_id`) inside a technique-owned section. If the detach loop processes ALL steps in the section (not just those with `technique_step_id IS NOT NULL`), it would overwrite manual step paint_ids via `effectivePaintId()` which returns `step.paint_id` for plain steps — actually harmless in the paint bake, but the subsequent `UPDATE technique_step_id = NULL` WHERE clause would also fire. Correct WHERE clause prevents issues.

**How to avoid:** Filter steps by `technique_step_id IS NOT NULL` in all detach UPDATE statements. Manual steps are already plain and do not need baking.

### Pitfall 4: Incomplete Cache Invalidation After Delete with Auto-Detach

**What goes wrong:** `useDeleteTechnique` currently only invalidates technique-level query keys (`TECHNIQUES_KEY`, `TECHNIQUES_WITH_COUNTS_KEY`, etc.). After auto-detach, recipe sections/steps/slot-maps have also changed. If recipe-level keys are not invalidated, the recipe editor shows stale technique badges on sections that are now plain.

**How to avoid:** Extend `onSuccess` in `useDeleteTechnique` to also call the full recipe invalidation (prefix invalidation, no recipeId needed — mirrors `useUpdateTechnique`'s lines 134-140 in `useTechniques.ts`).

### Pitfall 5: `TechniqueDeleteDialog` receiving stale `usageCount` after detach-in-editor

**What goes wrong:** If a user detaches some instances manually (via editor), then opens the delete dialog, the dialog might show a stale count if `getNonDetachedInstanceCount` is not re-queried. The dialog currently receives `usageCount` as a prop from its parent — the parent must re-query after detach invalidates the technique-instances cache.

**How to avoid:** The parent calling `TechniqueDeleteDialog` should derive the count from a live query hook (not a stale prop from before the dialog opened). Since `getNonDetachedInstanceCount` is called in the dialog parent, verify the parent re-fetches this value, or pass it as a query result that invalidates on detach.

---

## Code Examples

### detachTechniqueInstance — Skeleton (verified against file patterns)

```typescript
// Source: recipeTechniqueResync.ts header (single-db-handle contract)
// Source: recipeTechniqueInstances.ts (14-column step shape)
// Source: effectivePaintId.ts (PaintResolvableStep interface)

type DbHandle = Awaited<ReturnType<typeof getDb>>;

export async function detachTechniqueInstance(
  db: DbHandle,
  instanceId: number,
): Promise<void> {
  // Step 1: Build slot resolution map BEFORE any DELETE
  const slotRows = await db.select<{ recipe_step_id: number; paint_id: number | null }[]>(
    `SELECT rs.id AS recipe_step_id, sm.paint_id
     FROM recipe_steps rs
     INNER JOIN recipe_sections sec ON rs.section_id = sec.id
     INNER JOIN technique_steps ts ON rs.technique_step_id = ts.id
     LEFT JOIN recipe_technique_slot_maps sm
       ON sm.instance_id = sec.technique_instance_id
      AND sm.slot_id = ts.colour_slot_id
     WHERE sec.technique_instance_id = $1
       AND rs.technique_step_id IS NOT NULL`,
    [instanceId],
  );
  const slotMap = new Map<number, number | null>(
    slotRows.map((r) => [r.recipe_step_id, r.paint_id]),
  );

  // Step 2: Bake resolved paint into each technique-owned step
  for (const row of slotRows) {
    const resolvedPaint = slotMap.get(row.recipe_step_id) ?? null;
    await db.execute(
      `UPDATE recipe_steps SET paint_id = $1 WHERE id = $2`,
      [resolvedPaint, row.recipe_step_id],
    );
  }

  // Step 3: NULL technique_step_id on technique-owned steps
  await db.execute(
    `UPDATE recipe_steps SET technique_step_id = NULL
     WHERE section_id IN (
       SELECT id FROM recipe_sections WHERE technique_instance_id = $1
     )
     AND technique_step_id IS NOT NULL`,
    [instanceId],
  );

  // Step 4: NULL technique FK columns on sections
  await db.execute(
    `UPDATE recipe_sections
     SET technique_instance_id = NULL, technique_section_id = NULL
     WHERE technique_instance_id = $1`,
    [instanceId],
  );

  // Step 5: Delete instance row — CASCADE deletes slot_maps automatically
  await db.execute(
    `DELETE FROM recipe_technique_instances WHERE id = $1`,
    [instanceId],
  );
}
```

### Auto-Detach Loop in `detachAllAndDeleteTechnique`

```typescript
// Source: pattern from resyncTechniqueInstances (single db handle, flat inline SQL)

export async function detachAllAndDeleteTechnique(techniqueId: number): Promise<void> {
  const db = await getDb();

  // Query non-detached instances BEFORE deleting them
  const instances = await db.select<{ id: number }[]>(
    `SELECT id FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0`,
    [techniqueId],
  );

  // Detach each instance (bakes paints, clears FKs, deletes instance + slot maps)
  for (const inst of instances) {
    await detachTechniqueInstance(db, inst.id);
  }

  // Now safe to delete the technique (cascade removes sections/steps/slots)
  await db.execute(
    `DELETE FROM techniques WHERE id = $1`,
    [techniqueId],
  );
}
```

### Data-Layer Test Scaffold (mirroring `technique-resync.test.ts`)

```typescript
// Source: tests/data-layer/technique-resync.test.ts (structure pattern)
// Source: tests/data-layer/apply-technique.test.ts (fixture pattern)

// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHobbyforgeDb, createTestRecipe, createDbBridge } from "./db-helpers";
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";
import { applyTechnique } from "@/db/queries/recipeTechniqueInstances";
import { detachTechniqueInstance } from "@/db/queries/recipeTechniqueDetach";

describe("detachTechniqueInstance (SAFE-02, SAFE-03) — progress preserved, paint baked", () => {
  it("surviving recipe_step.id unchanged; technique_step_id NULLed; paint_id baked", () => {
    // fixture: technique + slot + step + paint, recipe + assignment + slot fill + progress
    // call detach, assert:
    // - recipe_steps row still exists (same id)
    // - technique_step_id IS NULL
    // - paint_id equals resolved paint (not NULL)
    // - unit_recipe_step_progress row still exists (completed = 1)
    // - recipe_sections row still exists (technique_instance_id IS NULL)
    // - recipe_technique_instances row is gone
    // - recipe_technique_slot_maps rows are gone
  });

  it("unfilled slot → paint_id baked as NULL (step stays validly paintless)", () => { ... });
  it("manual user-added step (paint_id != NULL) is untouched by detach", () => { ... });
  it("recipe_steps count unchanged after detach (no rows deleted)", () => { ... });
});
```

### RecipeSectionCard: Unlink Button Placement

```typescript
// Source: RecipeSectionCard.tsx lines 110-112 (badge already rendered)
// Phase 146 adds the Unlink ghost button AFTER the TechniqueSectionBadge, BEFORE the Surface select

{isTechniqueOwned && techniqueName && (
  <>
    <TechniqueSectionBadge techniqueName={techniqueName} />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={() => setDetachOpen(true)}
      aria-label="Detach technique from this section"
    >
      <Unlink className="h-4 w-4" />
    </Button>
  </>
)}
```

The `RecipeSectionCard` needs: `instanceId: number | undefined` prop (or a callback `onDetach`) to pass to `DetachConfirmDialog`. The `techniqueName` prop already arrives; the `section.technique_instance_id` value is available in the `DraftSection` type and is already passed via `RecipeSectionList` (line 181: `section.technique_instance_id != null`).

### Query Keys to Invalidate After Detach

From `useTechniqueInstances.ts` `invalidateAfterApply` (7 keys) + technique-level keys:

```typescript
// SAFE invalidation set for detach (mirrors invalidateAfterApply + invalidateTechniqueKeys)
qc.invalidateQueries({ queryKey: TECHNIQUE_INSTANCES_KEY(recipeId) });
qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
qc.invalidateQueries({ queryKey: SLOT_RESOLUTION_MAP_KEY(recipeId) });
// Technique-level: usage count drops if no more instances
qc.invalidateQueries({ queryKey: TECHNIQUES_WITH_COUNTS_KEY });
qc.invalidateQueries({ queryKey: TECHNIQUE_USAGE_COUNTS_KEY });
```

For delete with auto-detach: same set but use prefix invalidation (no recipeId) because N recipes are affected.

---

## SectionedTimeline Badge Status (SAFE-01 — Already Satisfied)

[VERIFIED: codebase inspection — `SectionedTimeline.tsx` lines 118-153]

The `SectionedTimeline` already renders `TechniqueSectionBadge` when `techniqueSectionInfoMap` has an entry for the section:

```typescript
const techniqueInfo = techniqueSectionInfoMap?.get(section.id);
const isTechniqueSection = techniqueInfo !== undefined;
// ...
{isTechniqueSection && (
  <TechniqueSectionBadge
    techniqueName={techniqueInfo.techniqueName}
    onNavigate={onNavigateToTechniques}
  />
)}
```

Phase 146 adds NO structural changes to `SectionedTimeline`. The badge was already shipped in Phase 144/145 (INTG-04). SAFE-01 for the SectionedTimeline surface is already satisfied by the existing code. The phase only needs to verify it is correctly displaying in both contexts (editor + timeline) and add the `Unlink` affordance to the editor surface only.

---

## RecipeSectionCard DraftSection: `technique_instance_id` Availability

[VERIFIED: codebase inspection — `RecipeSectionList.tsx` lines 180-184]

The `techniqueName` prop is already derived from `section.technique_instance_id` in `RecipeSectionList`:
```typescript
techniqueName={
  section.technique_instance_id != null
    ? (nameMap.get(section.technique_instance_id) ?? "technique")
    : undefined
}
```

The `RecipeSectionCard` therefore knows `isTechniqueOwned = techniqueName !== undefined`. For the Unlink button to trigger detach, it also needs the `instanceId`. Two options:
1. Pass `instanceId?: number` prop to `RecipeSectionCard` alongside `techniqueName`.
2. Pass an `onDetach?: () => void` callback so RecipeSectionCard is mutation-free.

Option 2 (callback) keeps RecipeSectionCard from holding a mutation hook — consistent with existing pattern (RecipeSectionCard has no React Query hooks today). The callback is supplied by the parent that owns the mutation (`RecipeSectionList` or a new wrapper).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Technique delete silently cascades instances and recipe content | Delete auto-detaches first (bakes paints), then deletes | Phase 146 (this phase) | No recipe content lost on technique delete |
| Badge display-only with no escape hatch | Badge + adjacent Unlink button in editor | Phase 146 | User has explicit one-way detach control |
| `usageCount` in DeleteDialog = total count | `liveInstanceCount` = non-detached count | Phase 146 | Accurate — detached instances are already plain and unaffected |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `recipe_sections.technique_section_id ON DELETE SET NULL` fires automatically when instance row is deleted (migration 052) | FK Behaviors | If behavior is CASCADE instead, sections would be deleted — verify migration 052 directly (already verified: SET NULL confirmed) |

**If this table has only one entry:** All other claims in this research were verified directly from codebase inspection.

---

## Open Questions

1. **Module placement of `detachTechniqueInstance`**
   - What we know: CONTEXT.md leaves this to Claude's discretion.
   - Recommendation: New file `recipeTechniqueDetach.ts` — keeps apply/resync/detach as distinct peer files, matching the SRP each file already demonstrates. The alternative (extending `recipeTechniqueInstances.ts`) risks making that file too large and mixing materialisation with teardown semantics.

2. **`useDeleteTechnique` mutation function replacement**
   - What we know: current `mutationFn: deleteTechnique` calls `getDb()` internally and issues a bare DELETE. Phase 146 needs a new function with the detach loop.
   - Recommendation: Add `detachAllAndDeleteTechnique(techniqueId)` to `recipeTechniqueDetach.ts` and replace `mutationFn` in `useDeleteTechnique`. Keep `deleteTechnique` in `techniques.ts` as an internal helper (no callers outside `detachAllAndDeleteTechnique` after this change).

3. **RecipeSectionCard prop vs callback for detach**
   - Recommendation: `onDetach?: () => void` callback (passed from `RecipeSectionList`) keeps the card mutation-free. The mutation + `instanceId` resolution stays in `RecipeSectionList`/`TechniqueNameResolver` context.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure code changes to existing layers, no new CLIs, services, or runtimes required).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (inferred from `pnpm test` command) |
| Quick run command | `pnpm test -- tests/data-layer/technique-detach.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAFE-02 | Progress survives detach; step id stable; paint baked | unit (data-layer) | `pnpm test -- tests/data-layer/technique-detach.test.ts` | ❌ Wave 0 |
| SAFE-02 | Unfilled slot bakes as NULL paint | unit (data-layer) | same file | ❌ Wave 0 |
| SAFE-02 | Manual steps untouched by detach | unit (data-layer) | same file | ❌ Wave 0 |
| SAFE-02 | Instance + slot maps deleted; sections/steps survive | unit (data-layer) | same file | ❌ Wave 0 |
| SAFE-01 | SectionedTimeline badge renders for technique sections | visual/manual | Painting Mode / RecipeDetailSheet | Existing code — no new test needed |
| SAFE-03 | AlertDialog confirmation flow; delete dialog case B copy | component (manual) | `pnpm dev` visual inspection | Manual-only |

### Sampling Rate

- Per task commit: `pnpm test -- tests/data-layer/technique-detach.test.ts`
- Per wave merge: `pnpm test`
- Phase gate: full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/data-layer/technique-detach.test.ts` — guard-first invariant tests for SAFE-02 (must be written before data-layer implementation, matching Phase 143/144 discipline)

---

## Security Domain

No new authentication, session, input validation, or cryptography concerns. This phase manipulates existing rows in an already-trusted local SQLite database. No network, no user input beyond confirmations, no new attack surface. Security domain: NOT APPLICABLE for this phase.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `src-tauri/migrations/051_technique_library_foundation.sql` — FK ON DELETE behaviors for all technique tables
- `src-tauri/migrations/052_technique_resync.sql` — `technique_section_id ON DELETE SET NULL` on recipe_sections
- `src-tauri/migrations/028_step_progress_identity.sql` — `unit_recipe_step_progress` FK: `recipe_step_id REFERENCES recipe_steps(id) ON DELETE CASCADE`
- `src/db/queries/recipeTechniqueInstances.ts` — `applyTechnique` shape (14-column INSERT, single db handle pattern)
- `src/db/queries/recipeTechniqueResync.ts` — single-db-handle contract, manual-step discriminator (`paint_id IS NULL`), orphan cleanup logic
- `src/lib/effectivePaintId.ts` — `PaintResolvableStep` interface, `SlotResolutionMap` type, resolution rule
- `src/features/recipes/RecipeSectionCard.tsx` — existing `TechniqueSectionBadge` placement, `isTechniqueOwned` pattern, existing AlertDialog import
- `src/features/recipes/RecipeSectionList.tsx` — `TechniqueNameResolver` pattern, `technique_instance_id` → name map, `techniqueName` prop passing
- `src/features/recipes/SectionedTimeline.tsx` — existing badge rendering (`techniqueSectionInfoMap?.get(section.id)`) — SAFE-01 already satisfied
- `src/features/recipes/TechniqueSectionBadge.tsx` — `Badge variant="secondary"` + `BookOpen` icon, `onNavigate` prop
- `src/features/techniques/TechniqueDeleteDialog.tsx` — existing Dialog structure, `usageCount` prop, `handleConfirm` flow
- `src/hooks/useTechniques.ts` — `useDeleteTechnique` mutation shape, `invalidateTechniqueKeys` helper
- `src/hooks/useTechniqueInstances.ts` — `invalidateAfterApply` 7-key set, `TECHNIQUE_INSTANCES_KEY` factory
- `src/hooks/useSlotResolutionMap.ts` — query key factories for slot/step caches
- `tests/data-layer/db-helpers.ts` — `createHobbyforgeDb`, `createDbBridge`, `createTestRecipe` helpers
- `tests/data-layer/apply-technique.test.ts` — fixture pattern (technique + slot + step + paint + recipe)
- `tests/data-layer/technique-resync.test.ts` — test structure pattern (beforeEach fixtures, `vi.mock("@/db/client")`)

### Secondary (MEDIUM confidence)

- `.planning/phases/146-detach-safety-rails/146-CONTEXT.md` — locked decisions authoritative
- `.planning/phases/146-detach-safety-rails/146-UI-SPEC.md` — visual/interaction contract authoritative

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components already installed, verified in codebase
- Architecture: HIGH — FK behaviors verified from migration SQL; detach sequence derived from first principles of migration 051 FK definitions
- Pitfalls: HIGH — Pitfalls 1–2 verified from existing resync code's own documentation of the same class of bug; Pitfalls 3–5 derived from codebase inspection

**Research date:** 2026-06-23
**Valid until:** Stable — no external dependencies; valid until schema changes
