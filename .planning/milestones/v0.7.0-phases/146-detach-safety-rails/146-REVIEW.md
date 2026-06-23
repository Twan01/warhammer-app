---
phase: 146-detach-safety-rails
reviewed: 2026-06-23T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/db/queries/recipeTechniqueDetach.ts
  - src/features/recipes/DetachConfirmDialog.tsx
  - src/features/recipes/RecipeSectionCard.tsx
  - src/features/recipes/RecipeSectionList.tsx
  - src/features/techniques/TechniqueDeleteDialog.tsx
  - src/features/techniques/TechniqueLibraryTab.tsx
  - src/hooks/useTechniqueDetach.ts
  - src/hooks/useTechniques.ts
  - tests/data-layer/detach-technique.test.ts
  - tests/techniques/TechniqueDeleteDialog.test.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 146: Code Review Report

**Reviewed:** 2026-06-23T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The detach safety-rails implementation is structurally sound. The critical SQL ordering invariant (bake paint_id before DELETE fires CASCADE) is correctly implemented, and the single-db-handle contract is respected throughout. FND-03 (recipe_step.id stability) is preserved — only FK columns are cleared, no DELETE+INSERT occurs.

Two critical issues were found: the `detachTechniqueInstance` function never sets `detached = 1` on the `recipe_technique_instances` row before deleting it (the row is simply gone, which is the intent), but more importantly the instance row is DELETEd immediately rather than being soft-marked. This is by design — however the `detached` column is queried elsewhere to filter "still live" instances, and the function that detaches a single instance (user-initiated, not delete-all) does not update `detached = 1` before deleting: this means that if the DELETE fails mid-sequence, subsequent `getNonDetachedInstanceCount` calls will still count the (partially-cleared) instance as live. That is a recoverable inconsistency, not data loss, but there is one genuine data-loss path: `SLOT_MAP_BY_INSTANCE_KEY` and `UNFILLED_SLOT_COUNT_KEY` are never invalidated by `useDetachTechniqueInstance`, leaving stale Painting-Mode UI state after a single-section detach. The broader `useDeleteTechnique` path (which detaches all then deletes) also misses these two keys.

---

## Critical Issues

### CR-01: `useDetachTechniqueInstance` does not invalidate `SLOT_MAP_BY_INSTANCE_KEY` or `UNFILLED_SLOT_COUNT_KEY` after detach

**File:** `src/hooks/useTechniqueDetach.ts:48-58`

**Issue:** `invalidateAfterDetach` invalidates 9 keys (lines 49–57), but it omits `SLOT_MAP_BY_INSTANCE_KEY(instanceId)` and `UNFILLED_SLOT_COUNT_KEY(recipeId)`. Both of these caches are keyed on instance/recipe data that the detach operation destroys:

- `SLOT_MAP_BY_INSTANCE_KEY(instanceId)` — the slot fill map for that specific instance. After detach the instance row is deleted, yet React Query's cache still holds the pre-detach slot map. Any Painting-Mode consumer that uses `useSlotMapByInstance` (e.g., `SlotReassignMiniDialog`) will render stale data.
- `UNFILLED_SLOT_COUNT_KEY(recipeId)` — the unfilled-slot count badge. After detach the slots are gone (baked); the badge will keep showing the pre-detach "N unfilled" count until the cache expires (staleTime = 5 minutes).

The same omission applies in `useDeleteTechnique` in `useTechniques.ts` (lines 153–163), which also does not invalidate either key after `detachAllAndDeleteTechnique`.

Precedent for both invalidations exists in `useTechniqueInstances.ts` lines 123–128 (the `useUpdateSlotMap` hook), which correctly invalidates `SLOT_MAP_BY_INSTANCE_KEY` + `UNFILLED_SLOT_COUNT_KEY` after slot edits.

**Fix:**
```ts
// useTechniqueDetach.ts — invalidateAfterDetach
import {
  SLOT_RESOLUTION_MAP_KEY,
  SLOT_MAP_BY_INSTANCE_KEY,
  UNFILLED_SLOT_COUNT_KEY,
} from "@/hooks/useSlotResolutionMap";

function invalidateAfterDetach(
  qc: QueryClient,
  recipeId: number,
  instanceId: number,   // add parameter
): void {
  // ... existing 9 keys ...
  qc.invalidateQueries({ queryKey: SLOT_MAP_BY_INSTANCE_KEY(instanceId) });
  qc.invalidateQueries({ queryKey: UNFILLED_SLOT_COUNT_KEY(recipeId) });
}

// In useDetachTechniqueInstance.onSuccess:
onSuccess: (_, variables) => {
  invalidateAfterDetach(qc, variables.recipeId, variables.instanceId);
},
```

For `useDeleteTechnique` in `useTechniques.ts`, since `recipeId` is unknown at delete time, add prefix invalidations:
```ts
// useTechniques.ts — useDeleteTechnique.onSuccess
qc.invalidateQueries({ queryKey: ["slot-map-by-instance"] });   // prefix clears all instances
qc.invalidateQueries({ queryKey: ["unfilled-slot-count"] });    // prefix clears all recipes
```

---

### CR-02: `detachTechniqueInstance` does not set `detached = 1` before deleting — leaves no audit trail and breaks mid-flight crash recovery

**File:** `src/db/queries/recipeTechniqueDetach.ts:62-128`

**Issue:** The function deletes the `recipe_technique_instances` row (Step 5, line 124). The `detached` column exists precisely to mark instances as having been through this flow (it is the sentinel queried by `getNonDetachedInstanceCount`, `resyncTechniqueInstances`, and `getSlotResolutionMap`). If the app crashes between Step 2 (paint baking) and Step 5 (DELETE), the instance row survives with `detached = 0`. On restart, the resync logic will attempt to re-sync the now-stale instance, overwriting the manually-baked `paint_id` values that Step 2 wrote. This silently un-bakes the colours the user just detached.

The correct recovery posture is to set `detached = 1` as Step 2.5 (between baking and clearing FKs). Once `detached = 1`, resync skips the instance, so even if Step 5 never fires the instance is inert and the baked colours are safe. The DELETE in Step 5 can then remain for clean-up.

**Fix:**
```ts
// After Step 2 (bake loop), add Step 2.5:
// ── Step 2.5: Mark instance as detached (crash-safety sentinel) ─────────
// If the process dies after this point, resync will skip this instance
// and the baked paint_id values remain safe.
await db.execute(
  `UPDATE recipe_technique_instances SET detached = 1 WHERE id = $1`,
  [instanceId],
);

// Step 3 … Step 5 continue unchanged.
```

Note: the detach test suite (`tests/data-layer/detach-technique.test.ts`) does not assert the value of `detached` on the deleted row — add a test that verifies `detached = 1` is written before DELETE if the row survives (e.g., test a crashed-after-bake scenario or simply verify the column after a successful detach while the row still exists at Step 2.5).

---

## Warnings

### WR-01: `onConfirm` in `RecipeSectionCard` closes the dialog and fires the async mutation without `await`, silently swallowing errors that occur synchronously during dispatch

**File:** `src/features/recipes/RecipeSectionCard.tsx:326-330`

**Issue:**
```tsx
onConfirm={() => {
  setDetachOpen(false);
  onDetach?.();   // fire-and-forget — no await, no error handling here
}}
```

`onDetach` is the closure defined in `RecipeSectionList.tsx` lines 184–196, which calls `detach.mutateAsync(...).then(...).catch(...)`. The `.catch` correctly shows a toast. However, closing the dialog first (`setDetachOpen(false)`) and then calling the mutation means that if the mutation rejects synchronously (e.g., `getDb()` throws immediately), the dialog is already closed and the user sees an error toast with no visible affordance to retry. This is minor UX but the real issue is that `isPendingDetach` is passed to `RecipeSectionCard` as a component-level prop (line 325: `isPendingDetach={detach?.isPending}`), so it reflects the _global_ mutation pending state for **all** detach operations across **all** sections. If one section is detaching, every section's Unlink button shows `isPendingDetach=true` and is disabled — preventing the user from initiating a parallel detach on a different section that has no in-flight mutation.

**Fix:** Pass a per-instance `isPending` flag rather than the mutation's global `isPending`. This requires either tracking which `instanceId` is pending in local state or restructuring `onDetach` to return a `boolean` setter:
```tsx
// In RecipeSectionList renderCards:
const [pendingInstanceId, setPendingInstanceId] = useState<number | null>(null);

const onDetach = isTechniqueOwned && detach
  ? () => {
      const instanceId = section.technique_instance_id as number;
      setPendingInstanceId(instanceId);
      detach.mutateAsync({ instanceId, recipeId: recipeId as number })
        .then(() => { toast.success("Technique detached — now plain recipe content"); })
        .catch(() => { toast.error("Failed to detach technique. Please try again."); })
        .finally(() => setPendingInstanceId(null));
    }
  : undefined;

// Pass per-instance flag:
isPendingDetach={pendingInstanceId === section.technique_instance_id}
```

---

### WR-02: `TechniqueDeleteDialog` calls `onClose()` even on error path, dismissing the dialog before the user acknowledges failure

**File:** `src/features/techniques/TechniqueDeleteDialog.tsx:39-41`

**Issue:**
```ts
} catch {
  toast.error("Failed to delete technique. Please try again.");
  onClose();   // <-- dialog closes on error
}
```

The intent of the toast "Please try again" is undermined by immediately closing the dialog — the user must reopen the delete flow from scratch. The "Keep Technique" button and the "Delete" button are no longer accessible after the error. Since `detachAllAndDeleteTechnique` involves multiple sequential DB writes (one per instance + the technique delete), a partial failure partway through is plausible, and closing the dialog silently abandons the retry path.

**Fix:** Remove `onClose()` from the catch branch; let the user dismiss manually or retry:
```ts
} catch {
  toast.error("Failed to delete technique. Please try again.");
  // Do NOT call onClose() — keep dialog open so user can retry or cancel.
}
```

---

### WR-03: `nonDetachedCountQuery` in `TechniqueLibraryTab` uses ad-hoc query key `["technique-nondetached-count", deleting?.id]` that is never invalidated after a successful detach or delete

**File:** `src/features/techniques/TechniqueLibraryTab.tsx:42-46`

**Issue:**
```ts
const nonDetachedCountQuery = useQuery({
  queryKey: ["technique-nondetached-count", deleting?.id],
  queryFn: () => getNonDetachedInstanceCount(deleting!.id),
  enabled: deleting != null,
});
```

This query key (`"technique-nondetached-count"`) is never invalidated anywhere in the codebase — not in `useDetachTechniqueInstance.onSuccess`, not in `useDeleteTechnique.onSuccess`. The cache for this key has the global default `staleTime` of 5 minutes. Consequently:

1. User opens delete dialog for Technique A → count fetched = 2.
2. User cancels.
3. User detaches one of the live instances from the recipe editor.
4. User reopens delete dialog for Technique A within 5 minutes → stale count of 2 shown, dialog copy says "live-linked to 2 recipes", button says "Detach 2 recipes & delete". Actual live count is now 1.

This is a confusing (though not data-corrupting) incorrect count in the destructive-action confirmation dialog.

**Fix:** Either:
- Set `staleTime: 0` on this query (always fresh when the dialog opens), or
- Add `qc.invalidateQueries({ queryKey: ["technique-nondetached-count"] })` to `invalidateAfterDetach` in `useTechniqueDetach.ts` and to `useDeleteTechnique.onSuccess`.

The simplest fix:
```ts
const nonDetachedCountQuery = useQuery({
  queryKey: ["technique-nondetached-count", deleting?.id],
  queryFn: () => getNonDetachedInstanceCount(deleting!.id),
  enabled: deleting != null,
  staleTime: 0,   // always re-fetch when dialog opens
});
```

---

## Info

### IN-01: `detachTechniqueInstance` Step 2 iterates `slotRows` but resolves paint from `slotMap` using the same row — the intermediate `Map` is unnecessary indirection

**File:** `src/db/queries/recipeTechniqueDetach.ts:83-96`

**Issue:** `slotMap` is built from `slotRows` (line 83) and then read back from `slotMap.get(row.recipe_step_id)` during the loop over `slotRows` (line 92). Because `row.recipe_step_id` is always the key that was just inserted, `slotMap.get(row.recipe_step_id)` always equals `row.paint_id`. The `Map` adds no resolution logic — it is equivalent to just using `row.paint_id ?? null` directly. The comment on lines 89–91 describes "effectivePaintId collapse" as the purpose, but there is no slot-level indirection happening; the query itself already joins through the slot map.

This is not a bug — the output is correct — but the dead `Map` round-trip slightly obscures what the code does and could mislead future maintainers into thinking there is a lookup table for cross-step resolution.

**Fix:** Simplify the bake loop to use `row.paint_id` directly and remove the `slotMap`:
```ts
// Step 2: bake directly from the query result rows
for (const row of slotRows) {
  await db.execute(
    `UPDATE recipe_steps SET paint_id = $1 WHERE id = $2`,
    [row.paint_id ?? null, row.recipe_step_id],
  );
}
```
If a future version needs true multi-source resolution (e.g., technique default vs. slot fill fallback), the `Map` can be reintroduced at that point with meaningful logic.

---

### IN-02: Test file `detach-technique.test.ts` does not assert the `detached` column state; paired with CR-02 this means the crash-recovery invariant is untested

**File:** `tests/data-layer/detach-technique.test.ts:135-313`

**Issue:** The 10-case SAFE-02 suite verifies row survival, FK nulling, paint baking, and slot-map deletion, but never checks that `recipe_technique_instances.detached = 1` is written before the row is deleted (the crash-safety sentinel from CR-02). If CR-02's fix is applied, a test should verify the sentinel is written:

```ts
it("detached column is set to 1 before instance row is deleted (crash-safety)", async () => {
  // Intercept between bake and DELETE — not easily testable after the fact.
  // Simplest proxy: after a successful full detach, confirm the row is gone
  // (instance deleted) AND that a second call is a no-op / doesn't crash.
  const bridge = createDbBridge(db);
  await detachTechniqueInstance(bridge as never, instanceId);
  // If the row were still present with detached=1, verify it here.
  // Since the row is deleted, verify idempotency (second call should not throw):
  await expect(detachTechniqueInstance(bridge as never, instanceId)).resolves.toBeUndefined();
});
```

A stronger test would intercept execution between Step 2.5 and Step 5 (e.g., via a mock that throws on the DELETE) and verify `detached = 1` is committed. That requires either test-infrastructure changes or a two-phase assertion.

---

_Reviewed: 2026-06-23T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
