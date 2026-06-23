---
phase: 144-live-link-re-sync
reviewed: 2026-06-22T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/db/queries/recipeTechniqueResync.ts
  - src/db/queries/techniques.ts
  - src/lib/techniquePreviewDiff.ts
  - src/features/techniques/TechniqueFormSheet.tsx
  - src/hooks/useTechniques.ts
  - src-tauri/migrations/052_technique_resync.sql
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 144: Code Review Report

**Reviewed:** 2026-06-22
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 144 implements the live-link resync engine — the highest-risk piece of the
v0.7.0 milestone. The core invariants (UPDATE-by-PK for survivors, no BEGIN/COMMIT,
single db handle for resync, migration 052 well-formed, confirmation dialog gating,
prefix invalidation on save) are structurally sound. Two critical defects were found:
a silent data-loss path when a recipe section's name/surface/optional/notes diverge
from the technique after a non-structural section edit, and a stale-step orphan window
on the delete path when SET NULL fires before resync runs. Four warnings round out
the report; the two info items are minor quality observations.

---

## Critical Issues

### CR-01: Surviving recipe_sections are only updated for order_index — name/surface/optional/notes are never propagated

**File:** `src/db/queries/recipeTechniqueResync.ts:216-221`

**Issue:** The "UPDATE surviving sections" branch (step 4b) issues:

```sql
UPDATE recipe_sections SET order_index = $2 WHERE id = $1
```

It updates `order_index` only. The technique's `name`, `surface`, `optional`, and
`notes` are **not** propagated to existing recipe_sections rows. This means a
non-structural edit to a technique section (rename, toggle optional, change surface)
is silently ignored in every linked recipe instance.

A user who renames technique section "Base Coat" → "Primer + Base Coat" and hits
Save will see the old name persist in every recipe that uses the technique. There is
no structural change (no add/remove/reorder of steps or sections), so no confirmation
dialog is shown and the save completes — but the recipe's section name is now stale.
Over time this divergence is invisible and irrecoverable without re-applying the
technique.

The invariant described in the module header says only *structural* changes need
the confirmation gate, but the live-link contract (the whole point of this phase)
is that non-detached recipe instances stay in sync with technique content. Metadata
fields on sections are part of that contract.

**Fix:**
```typescript
// In syncInstance step 4b "UPDATE order_index for surviving sections"
// replace the current single-column UPDATE with a full-field UPDATE:
await db.execute(
  `UPDATE recipe_sections
   SET order_index = $2,
       name        = $3,
       surface     = $4,
       optional    = $5,
       notes       = $6
   WHERE id = $1`,
  [
    recipeSectionId,
    si,
    techSec.name,
    techSec.surface ?? null,
    techSec.optional,
    techSec.notes ?? null,
  ],
);
```

---

### CR-02: Orphaned recipe_steps window — DELETE in step 4d uses the pre-delete snapshot; a surviving step whose technique_step_id was SET NULL between snapshot and resync is not cleaned up

**File:** `src/db/queries/recipeTechniqueResync.ts:230-268`

**Issue:** `allInstanceSteps` is loaded at step 4c (line 230):

```typescript
const allInstanceSteps = await db.select<RecipeStepInfo[]>(
  `SELECT rs.id, rs.technique_step_id, rs.section_id, rs.order_index
   FROM recipe_steps rs
   INNER JOIN recipe_sections sec ON rs.section_id = sec.id
   WHERE sec.technique_instance_id = $1`,
  [instance.id],
);
```

This snapshot is taken **after** step 4b deleted the removed sections (which CASCADE-deletes their recipe_steps), but it is taken **before** step 4d runs. The DELETE at step 4d (lines 261-268) iterates over that snapshot to find rows where `technique_step_id IS NULL`.

The problem: step 4b only DELETEs `recipe_sections` rows whose `technique_section_id` is no longer current. The FK `ON DELETE CASCADE` on `recipe_sections → recipe_steps` removes those sections' recipe_steps. However, if a `technique_step` was deleted **while** a `recipe_section` was kept (i.e., the section survived but one of its steps was removed), the FK `ON DELETE SET NULL` fires on `recipe_steps.technique_step_id` at the time the `technique_step` is deleted (inside `saveTechniqueGraph` step "DELETE removed steps"). By the time `resyncTechniqueInstances` runs, those recipe_steps already have `technique_step_id = NULL`.

The snapshot at line 230 **does** capture these NULL rows, so step 4d **does** correctly delete them in the normal path.

However there is a narrower correctness gap: the step-4b section DELETE (line 184) may also CASCADE-delete recipe_steps that were already in the `allInstanceSteps` snapshot (they were deleted from DB before step 4d runs, but the in-memory snapshot still has them). Step 4d then tries to `DELETE FROM recipe_steps WHERE id = ?` for rows that no longer exist — this is a no-op SQL-wise (SQLite silently deletes 0 rows), so it is **not** a crash. But the `existingByTechStepId` map built at step 4c (lines 239-249) is also built from the stale snapshot: it includes technique_step_id values for rows that were already CASCADE-deleted, which means step 4f's belt-and-suspenders DELETE will also fire redundant DELETEs on already-gone rows. This is harmless from a correctness standpoint but indicates the snapshot ordering is fragile.

The actual data-loss risk: if `technique_step_id = NULL` rows exist in a section that is **itself** being deleted in step 4b, the CASCADE already removes them, so step 4d's attempt to re-delete is a benign no-op. But if, due to a race or a test stub where SET NULL did not fire (as noted in comment at line 342), a recipe_step still carries a now-stale `technique_step_id` pointing to a step that was deleted from `allTechniqueSteps`... step 4d (the NULL-only check) will NOT catch it. Step 4f (lines 347-353) is the intended catch, but it only fires for `existingByTechStepId` entries — rows with a non-null `technique_step_id` not in `currentTechStepIds`.

This means there is a genuine gap: if SET NULL fires correctly (the normal path), then `technique_step_id IS NULL` in the snapshot, step 4d catches it. If SET NULL does not fire (the "belt-and-suspenders" path), then `technique_step_id` is still the old non-null ID, the ID is absent from `currentTechStepIds`, step 4f catches it. **Both branches are covered.** The real risk is the window where step 4d deletes a row that step 4b's CASCADE already removed — the DELETE is a no-op, so no data is lost, but a `technique_step_id = NULL` row that lived in a **surviving** section but belonged to a **now-detached** manual step (no `technique_step_id` in origin) would incorrectly be deleted.

**The actual blocker:** step 4d deletes ALL `technique_step_id = NULL` rows found in the instance's sections. The comment correctly says "User-added manual steps in non-technique sections have technique_step_id = NULL but live in sections without technique_instance_id, so they are not affected." However, if a user has manually added a step (paint_id NOT NULL, technique_step_id NULL) inside a **technique-owned section** (one with `technique_instance_id` set), that step **will be deleted** by step 4d. This is a silent data-loss path — the user loses their manually-added step every time the technique is saved.

**Fix:** Scope the NULL deletion to rows that are specifically technique-owned, not manually added. Use `paint_id IS NULL` as the discriminator (technique-materialised steps always have paint_id NULL; user-added steps have paint_id set):

```typescript
// Step 4d — only delete technique-owned orphaned steps (paint_id IS NULL)
for (const rs of allInstanceSteps) {
  if (rs.technique_step_id === null && rs.paint_id === null) {
    await db.execute(
      `DELETE FROM recipe_steps WHERE id = $1`,
      [rs.id],
    );
  }
}
```

This requires adding `paint_id` to the `RecipeStepInfo` interface and the step 4c SELECT:

```typescript
interface RecipeStepInfo {
  id: number;
  technique_step_id: number | null;
  paint_id: number | null;  // ADD THIS
  section_id: number;
  order_index: number;
}

// Step 4c SELECT:
`SELECT rs.id, rs.technique_step_id, rs.paint_id, rs.section_id, rs.order_index
 FROM recipe_steps rs
 INNER JOIN recipe_sections sec ON rs.section_id = sec.id
 WHERE sec.technique_instance_id = $1`
```

---

## Warnings

### WR-01: stepReorders flat-position counter is cross-section — it compares against technique_steps.order_index which is per-section

**File:** `src/lib/techniquePreviewDiff.ts:66-81`

**Issue:** `stepReorders` is computed by walking the **flat** draft step list (all sections concatenated) and comparing the running flat position `pos` against `existing.order_index`. But `existing.order_index` is the per-section order in `technique_steps`, not the global position. So for a technique with two sections [A, B] with steps [A1(order 0), A2(order 1)] and [B1(order 0), B2(order 1)], the flat positions are A1=0, A2=1, B1=2, B2=3. The existing `order_index` for B1 is 0 (per-section), but `pos` computes 2. So B1 is always reported as "reordered" even if no reorder occurred — giving false positives that trigger the confirmation dialog unnecessarily.

This does not cause data loss (the resync uses `ti` — the per-section index — correctly). The consequence is that purely metadata edits on multi-section techniques can incorrectly show the confirmation dialog.

**Fix:** Use per-section position comparison. Track position within the current section, not global flat position:

```typescript
const stepReorders = stepsToUpdate.filter((draftStep) => {
  const existing = existingSteps.find((s) => s.id === draftStep.dbId);
  if (!existing) return false;

  // Walk sections; within each section track per-section position
  for (const sec of draftSections) {
    let secPos = 0;
    for (const st of sec.steps) {
      if (st.dbId === draftStep.dbId) {
        return existing.order_index !== secPos;
      }
      secPos++;
    }
  }
  return false;
}).length;
```

---

### WR-02: INSERT new recipe_sections uses the loop variable `si` (0-based draft position) as order_index, but section DELETEs happen before the INSERT loop — the surviving indices may no longer be contiguous

**File:** `src/db/queries/recipeTechniqueResync.ts:193-222`

**Issue:** Step 4b deletes removed recipe_sections first (lines 182-189), then inserts new ones using `si` (0-based index over `techniqueSections`, lines 193-222). Surviving sections are updated with `si` as their new `order_index` (line 219). This is correct for the **technique-derived** order. However, a recipe may have sections from multiple technique instances plus manual sections. The `order_index` among all recipe_sections is shared; blindly writing 0-based indices derived from the technique's section order can create order_index collisions or displace manual sections.

In practice, recipes today seem to own one technique instance per recipe, so the collision is unlikely — but the code does not guard against it. If two technique instances exist in the same recipe, their sections would both be numbered 0, 1, 2, ... causing silent ordering conflicts.

**Fix:** Either (a) confirm via a comment + unit test that one instance per recipe is enforced, or (b) offset the inserted section's order_index relative to the instance's existing section block rather than using the raw technique section position.

---

### WR-03: `pendingSubmitRef` is not cleared when the Sheet is closed via the Cancel button or ESC — stale pending data can be re-executed if the dialog is reopened without a new submit

**File:** `src/features/techniques/TechniqueFormSheet.tsx:132-136, 543`

**Issue:** `pendingSubmitRef.current` is set in `onSubmit` (line 293) and cleared only inside the "Update Recipes" confirm button handler (line 551). If the user:

1. Submits a structural edit (pending is set, dialog opens)
2. Clicks Cancel on the dialog (dialog closes, but `pendingSubmitRef.current` is still set)
3. Makes additional edits and re-submits (triggering a new structural check)
4. If the new check short-circuits (e.g., count becomes 0 because a race detaches all instances), `executeSave` is called directly — but `pendingSubmitRef.current` still holds the OLD values

The dialog's Cancel handler at line 543 only calls `setConfirmDialog(null)` — it does not clear `pendingSubmitRef.current`. The ref's old values can never be re-used via the dialog path (since the dialog is closed), but it is a latent correctness risk if the flow evolves.

**Fix:** Clear the ref in the Cancel handler:

```typescript
<Button variant="outline" onClick={() => {
  setConfirmDialog(null);
  pendingSubmitRef.current = null;  // ADD THIS
}}>
  Cancel
</Button>
```

---

### WR-04: `useUpdateTechnique` does not invalidate `["recipe-steps"]` or `["painting-steps"]` keys — step-level React Query caches (if they exist) are not refreshed after resync

**File:** `src/hooks/useTechniques.ts:135-141`

**Issue:** After `resyncTechniqueInstances` modifies `recipe_steps` rows (UPDATE order_index/section_id/step_name, INSERT new rows, DELETE removed rows), the hook invalidates `recipe-sections`, `recipe-paints`, `slot-resolution-map`, `STEP_COUNTS_KEY`, `RECIPE_SWATCH_KEY`, and `RECIPE_AVAILABILITY_KEY`. A grep of the hooks directory found no `recipe-steps` key in active use, suggesting this is currently safe. However, if any component subscribes to a per-recipe step list directly (e.g., `["recipe-steps", recipeId]`), those caches would not be invalidated and would serve stale step content.

**Fix:** Add a defensive prefix invalidation:

```typescript
qc.invalidateQueries({ queryKey: ["recipe-steps"] });
```

This is a no-op if no query with that key exists, but guards against future consumers.

---

## Info

### IN-01: Migration 052 does not add a `technique_section_id` index on `recipe_sections` — only `recipe_steps(technique_step_id)` is indexed

**File:** `src-tauri/migrations/052_technique_resync.sql:14-15`

**Issue:** The migration adds `idx_recipe_steps_technique_step_id` (correct). The resync engine also performs a lookup keyed by `recipe_sections.technique_section_id` in the in-memory map (step 4a), but this lookup is done after loading all recipe_sections for an instance into memory, so the column is not used as a DB filter. However, if recipe growth means instances accumulate many sections, a DB-level index on `recipe_sections(technique_section_id)` would make future query evolutions cheaper.

This is not a correctness issue. Consider adding:

```sql
CREATE INDEX IF NOT EXISTS idx_recipe_sections_technique_section_id
    ON recipe_sections(technique_section_id);
```

---

### IN-02: `_techniqueId` parameter in `syncInstance` is unused (prefixed with `_` by convention) — the parameter can be removed or the function can derive it

**File:** `src/db/queries/recipeTechniqueResync.ts:155`

**Issue:** `syncInstance` declares `_techniqueId: number` but never reads it (the technique data is passed pre-loaded via `techniqueSections` / `stepsByTechSection`). The `_` prefix acknowledges it's unused. The parameter occupies a positional slot in the call signature but adds friction for future readers trying to understand the data flow.

**Fix:** Remove the parameter; the caller at line 148 already passes it only because the signature requires it. If a future debug log needs the techniqueId, derive it from `techniqueSections[0]?.technique_id`.

---

_Reviewed: 2026-06-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
