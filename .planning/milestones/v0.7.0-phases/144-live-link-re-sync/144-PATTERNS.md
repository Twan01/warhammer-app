# Phase 144: Live-Link Re-Sync — Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/queries/recipeTechniqueResync.ts` | service | CRUD (diff/mutate) | `src/db/queries/recipeTechniqueInstances.ts` (INSERT shape) + `src/db/queries/techniques.ts` UPDATE path (step diff loop) | exact composite |
| `src/lib/techniquePreviewDiff.ts` | utility | transform | `src/lib/techniqueDiff.ts` (`computeSlotDiff`) + `src/lib/recipeDiff.ts` (`computeStepDiff`) | role-match |
| `src/db/queries/techniques.ts` (MODIFY) | service | CRUD | itself — resync call site inserted after step diff at line 638 | self-patch |
| `src/features/techniques/TechniqueFormSheet.tsx` (MODIFY) | component | request-response | itself — onSubmit intercept pattern (lines 198-250) + `TechniqueDeleteDialog.tsx` (Dialog open/pending state) | self-patch + role-match |
| `src/hooks/useTechniques.ts` (MODIFY) | hook | request-response | `src/hooks/useTechniqueInstances.ts` `invalidateAfterApply` (lines 39-47) — exact key set | exact |
| `tests/data-layer/technique-resync.test.ts` | test | CRUD | `tests/data-layer/technique-progress-identity.test.ts` (same fixture shape) + `tests/data-layer/apply-technique.test.ts` (createDbBridge pattern) | exact |
| `src-tauri/migrations/052_technique_resync_index.sql` (optional) | migration | batch | `src-tauri/migrations/051_technique_library_foundation.sql` lines 75-78 (ALTER TABLE nullable FK pattern) | exact |

---

## Pattern Assignments

---

### `src/db/queries/recipeTechniqueResync.ts` (service, CRUD diff/mutate)

**Primary analog:** `src/db/queries/recipeTechniqueInstances.ts` lines 51-141 (INSERT column list and sequential `await db.execute()` chaining)
**Secondary analog:** `src/db/queries/techniques.ts` lines 436-641 (UPDATE path, step diff loop structure)

**Imports pattern** (from `recipeTechniqueInstances.ts` lines 1-21):
```typescript
// DO NOT call getDb() inside this module — db handle is passed in
import type { TechniqueSection, TechniqueStep } from "@/types/technique";
// No import of getDb — function signature takes db as first param (see Pitfall 2)
```

**Function signature — single db handle, no nested getDb()** (enforced by CONTEXT.md SC#4):
```typescript
// The db parameter type mirrors what getDb() returns but is passed in from saveTechniqueGraph.
// NEVER call getDb() inside this function — it is a sub-operation of saveTechniqueGraph.
export async function resyncTechniqueInstances(
  db: Awaited<ReturnType<typeof import("@/db/client").getDb>>,
  techniqueId: number,
): Promise<void>
```

**Non-detached instance query** (from RESEARCH.md Code Examples + migration 051 line 61 `detached` column):
```typescript
const instances = await db.select<{ id: number; recipe_id: number }[]>(
  `SELECT id, recipe_id FROM recipe_technique_instances
   WHERE technique_id = $1 AND detached = 0
   ORDER BY id ASC`,
  [techniqueId],
);
```

**Technique sections query** (mirrors `applyTechnique` lines 69-72):
```typescript
const techniqueSections = await db.select<TechniqueSection[]>(
  `SELECT * FROM technique_sections WHERE technique_id = $1 ORDER BY order_index ASC`,
  [techniqueId],
);
```

**Recipe sections query for an instance** (mirrors `applyTechnique` section loop structure, uses `technique_instance_id` from migration 051 line 75-76):
```typescript
const recipeSections = await db.select<{ id: number; order_index: number }[]>(
  `SELECT id, order_index FROM recipe_sections
   WHERE technique_instance_id = $1 ORDER BY order_index ASC`,
  [instance.id],
);
```

**Step REORDER — UPDATE in-place, preserve PK** (from `technique-progress-identity.test.ts` lines 192-197 and RESEARCH.md Code Examples):
```typescript
// CRITICAL: UPDATE only — never DELETE+INSERT a surviving step (FND-03 invariant)
await db.execute(
  `UPDATE recipe_steps
   SET order_index = $2, step_name = $3, notes = $4,
       painting_phase = $5, tool = $6, technique = $7,
       dilution = $8, time_estimate_minutes = $9
   WHERE id = $1`,
  [existingRecipeStepId, newOrderIndex, ts.step_name, ts.notes ?? null,
   ts.painting_phase ?? null, ts.tool ?? null, ts.technique ?? null,
   ts.dilution ?? null, ts.time_estimate_minutes ?? null],
);
```

**Step ADD — INSERT with paint_id NULL** (column list from `applyTechnique` lines 106-128):
```typescript
await db.execute(
  `INSERT INTO recipe_steps
   (recipe_id, paint_id, step_name, order_index, notes,
    painting_phase, tool, technique, dilution, time_estimate_minutes,
    step_photo_path, alt_paint_id, section_id, technique_step_id)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
  [instance.recipe_id, null, ts.step_name, newOrderIndex, ts.notes ?? null,
   ts.painting_phase ?? null, ts.tool ?? null, ts.technique ?? null,
   ts.dilution ?? null, ts.time_estimate_minutes ?? null,
   null, null, recipeSectionId, ts.id],
);
```

**Step REMOVE — DELETE by technique_step_id; progress cascade-deletes automatically** (from `technique-progress-identity.test.ts` lines 286-288 and RESEARCH.md Code Examples):
```typescript
// DELETE the recipe_steps row — ON DELETE CASCADE on unit_recipe_step_progress fires automatically
// (migration 028 line 17). No explicit progress DELETE needed.
await db.execute(
  `DELETE FROM recipe_steps WHERE technique_step_id = $1 AND section_id = $2`,
  [techniqueStepId, recipeSectionId],
);
```

**Instance-level step lookup — ALL steps across all sections keyed by technique_step_id** (Pitfall 5 guard — cross-section step moves):
```typescript
// Query ALL recipe_steps for the instance (not per-section) to handle cross-section moves.
// Keyed by technique_step_id so a step moved from section A to B is found and UPDATEd
// rather than DELETEd+INSERTed (which would lose its progress row).
const allInstanceSteps = await db.select<{
  id: number;
  technique_step_id: number | null;
  section_id: number;
  order_index: number;
}[]>(
  `SELECT id, technique_step_id, section_id, order_index
   FROM recipe_steps
   WHERE recipe_id = $1 AND technique_step_id IS NOT NULL`,
  [instance.recipe_id],
);
const existingByTechStepId = new Map(
  allInstanceSteps.map((rs) => [rs.technique_step_id!, { id: rs.id, section_id: rs.section_id }]),
);
```

**Non-detached instance count query** (from RESEARCH.md Code Examples, mirrors `techniques.ts` lines 158-162):
```typescript
export async function getNonDetachedInstanceCount(techniqueId: number): Promise<number> {
  const db = await getDb();  // This standalone query CAN call getDb() — it is not embedded in saveTechniqueGraph
  const rows = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0`,
    [techniqueId],
  );
  return rows[0]?.n ?? 0;
}
```

**Error handling** (matches `applyTechnique` pattern — re-throw; caller (the hook) shows toast):
```typescript
// No try/catch inside resyncTechniqueInstances — errors propagate to saveTechniqueGraph
// which propagates to useUpdateTechnique.mutateAsync, caught in TechniqueFormSheet.onSubmit
```

---

### `src/lib/techniquePreviewDiff.ts` (utility, transform)

**Analog:** `src/lib/techniqueDiff.ts` (pattern for `computeSlotDiff`) + `src/lib/recipeDiff.ts` (`computeStepDiff` global scan approach)

**Imports pattern** (mirroring `techniqueDiff.ts` lines 1-19):
```typescript
import type { DraftTechniqueSection, TechniqueSection, TechniqueStep } from "@/types/technique";
import { computeStepDiff } from "@/lib/recipeDiff";
// Note: computeStepDiff is structurally compatible with DraftTechniqueSection
// (techniqueDiff.ts line 13 comment confirms this)
```

**Return type** (from RESEARCH.md Pattern 2):
```typescript
export interface TechniqueResyncPreview {
  stepAdds: number;
  stepRemoves: number;
  stepReorders: number;
  sectionAdds: number;
  sectionRemoves: number;
  isStructural: boolean; // true if any count > 0
}
```

**Core pure diff pattern** (mirrors `computeSlotDiff` in `techniqueDiff.ts` lines 46-69 — Phase A/B/C/D structure):
```typescript
export function previewTechniqueResyncDiff(
  draftSections: DraftTechniqueSection[],
  existingSections: TechniqueSection[],
  existingSteps: TechniqueStep[],
): TechniqueResyncPreview {
  // Reuse computeStepDiff — structurally compatible (techniqueDiff.ts re-export note)
  const { toDelete, toUpdate, toInsert } = computeStepDiff(draftSections as never, existingSteps as never);

  // Section diff (mirrors computeSectionDiff logic in recipeDiff.ts lines 35-58)
  const survivingSectionDbIds = new Set(
    draftSections.map((s) => s.dbId).filter((id): id is number => id !== null),
  );
  const sectionRemoves = existingSections.filter((s) => !survivingSectionDbIds.has(s.id)).length;
  const sectionAdds = draftSections.filter((s) => s.dbId === null).length;

  // Reorders: surviving steps whose position changed (order_index delta)
  // ... (see RESEARCH.md Pattern 2 for full implementation)

  return {
    stepAdds: toInsert.length,
    stepRemoves: toDelete.length,
    stepReorders,
    sectionAdds,
    sectionRemoves,
    isStructural: toDelete.length > 0 || toInsert.length > 0 || stepReorders > 0
                  || sectionRemoves > 0 || sectionAdds > 0,
  };
}
```

**No-analog note:** The `previewTechniqueResyncDiff` pure function is new, but it directly reuses `computeStepDiff` from `recipeDiff.ts` (structurally compatible per `techniqueDiff.ts` line 13). No DB access — pure transform only.

---

### `src/db/queries/techniques.ts` MODIFICATION — resync call site

**Analog:** itself — the UPDATE path ends at line 641; resync inserts between line 638 (end of step diff) and line 641 (`return finalId`).

**Resync call site pattern** (after the step diff phase, lines 609-641, same db handle):
```typescript
// At the bottom of the EDIT PATH, after all technique_steps writes are done:
// Call resync with the SAME db handle — NO new getDb() call (SC#4).
// Import: import { resyncTechniqueInstances } from "@/db/queries/recipeTechniqueResync";
await resyncTechniqueInstances(db, finalId);

return finalId;  // line 641 (currently)
```

**Import addition** (top of `techniques.ts`):
```typescript
import { resyncTechniqueInstances } from "@/db/queries/recipeTechniqueResync";
```

---

### `src/features/techniques/TechniqueFormSheet.tsx` MODIFICATION — confirmation dialog

**Analog:** `TechniqueDeleteDialog.tsx` (Dialog open/state pattern, lines 1-69) + itself (onSubmit lines 198-250)

**Import additions** (mirroring `TechniqueDeleteDialog.tsx` lines 1-12):
```typescript
import { useRef, useState } from "react";  // add useRef to existing import
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { previewTechniqueResyncDiff } from "@/lib/techniquePreviewDiff";
import type { TechniqueResyncPreview } from "@/lib/techniquePreviewDiff";
import { getNonDetachedInstanceCount } from "@/db/queries/recipeTechniqueResync";
```

**State additions** (mirroring `TechniqueDeleteDialog.tsx` `open` + pending state pattern):
```typescript
// Inside TechniqueFormSheet component, after existing useState calls (lines 110-113):
const [confirmDialog, setConfirmDialog] = useState<{
  open: boolean;
  preview: TechniqueResyncPreview;
  count: number;
} | null>(null);
const pendingSubmitRef = useRef<{
  values: TechniqueFormValues;
  orderedSlots: DraftTechniqueSlot[];
  orderedSections: DraftTechniqueSection[];
} | null>(null);
```

**onSubmit intercept** (inserted into existing `onSubmit` at line 224, before `updateTechnique.mutateAsync`):
```typescript
// In the isEdit && technique branch, BEFORE the mutateAsync call:
const orderedSlots = slots.map((slot, i) => ({ ...slot, order_index: i }));
const orderedSections = sections.map((section, si) => ({
  ...section,
  order_index: si,
  steps: section.steps.map((step, ti) => ({ ...step, order_index: ti })),
}));

if (isEdit && technique) {
  const preview = previewTechniqueResyncDiff(orderedSections, existingSections, existingSteps);
  if (preview.isStructural) {
    const count = await getNonDetachedInstanceCount(technique.id);
    if (count > 0) {
      pendingSubmitRef.current = { values, orderedSlots, orderedSections };
      setConfirmDialog({ open: true, preview, count });
      return; // suspend — wait for dialog Confirm/Cancel
    }
  }
  // Non-structural or count === 0 → proceed directly
}
await executeSave(values, orderedSlots, orderedSections);
```

**executeSave helper** (extracts the current `try/catch` block from `onSubmit` lines 223-249):
```typescript
async function executeSave(
  values: TechniqueFormValues,
  orderedSlots: DraftTechniqueSlot[],
  orderedSections: DraftTechniqueSection[],
) {
  try {
    if (isEdit && technique) {
      await updateTechnique.mutateAsync({ techniqueId: technique.id, formValues: values,
        slots: orderedSlots, sections: orderedSections, existingSlots, existingSections, existingSteps });
      toast.success("Technique saved.");
    } else {
      await createTechnique.mutateAsync({ formValues: values, slots: orderedSlots,
        sections: orderedSections, existingSlots: [], existingSections: [], existingSteps: [] });
      toast.success("Technique created.");
    }
    onClose();
  } catch {
    toast.error("Failed to save technique. Changes were not saved.");
  }
}
```

**Dialog JSX** (mirrors `TechniqueDeleteDialog.tsx` structure lines 41-68):
```tsx
{confirmDialog && (
  <Dialog open={confirmDialog.open} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update {confirmDialog.count} recipe{confirmDialog.count === 1 ? "" : "s"}?</DialogTitle>
        <DialogDescription>
          This technique is used by {confirmDialog.count} recipe{confirmDialog.count === 1 ? "" : "s"}.
          Saving will{" "}
          {[
            confirmDialog.preview.stepAdds > 0 && `add ${confirmDialog.preview.stepAdds} step${confirmDialog.preview.stepAdds === 1 ? "" : "s"}`,
            confirmDialog.preview.stepRemoves > 0 && `remove ${confirmDialog.preview.stepRemoves} step${confirmDialog.preview.stepRemoves === 1 ? "" : "s"}`,
            confirmDialog.preview.stepReorders > 0 && `reorder ${confirmDialog.preview.stepReorders} step${confirmDialog.preview.stepReorders === 1 ? "" : "s"}`,
          ].filter(Boolean).join(", ")}.
          {" "}Step completion progress is preserved.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
        <Button onClick={async () => {
          setConfirmDialog(null);
          if (pendingSubmitRef.current) {
            const { values, orderedSlots, orderedSections } = pendingSubmitRef.current;
            pendingSubmitRef.current = null;
            await executeSave(values, orderedSlots, orderedSections);
          }
        }}>
          Update Recipes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

---

### `src/hooks/useTechniques.ts` MODIFICATION — useUpdateTechnique invalidation

**Analog:** `src/hooks/useTechniqueInstances.ts` `invalidateAfterApply` lines 39-47 (exact key names to add)

**Existing invalidation** (`useTechniques.ts` lines 91-98, `invalidateTechniqueKeys` + TECHNIQUE_KEY):
```typescript
// Current onSuccess (lines 123-126):
onSuccess: (_, variables) => {
  invalidateTechniqueKeys(qc);
  qc.invalidateQueries({ queryKey: TECHNIQUE_KEY(variables.techniqueId) });
},
```

**Extended onSuccess** (add recipe-scoped prefix invalidations, keys verified in `useTechniqueInstances.ts` lines 5-13):
```typescript
import {
  RECIPE_SECTIONS_KEY,
} from "@/hooks/useRecipeSections";
import {
  RECIPE_PAINTS_KEY,
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
  STEP_COUNTS_KEY,
} from "@/hooks/useRecipePaints";
import { SLOT_RESOLUTION_MAP_KEY } from "@/hooks/useSlotResolutionMap";

// In useUpdateTechnique.onSuccess:
onSuccess: (_, variables) => {
  invalidateTechniqueKeys(qc);
  qc.invalidateQueries({ queryKey: TECHNIQUE_KEY(variables.techniqueId) });
  // Resync wrote to all affected recipes — broadcast to every recipe-scoped cache.
  // Prefix invalidation (no recipeId) clears ALL per-recipe entries.
  qc.invalidateQueries({ queryKey: ["recipe-sections"] });
  qc.invalidateQueries({ queryKey: ["recipe-paints"] });
  qc.invalidateQueries({ queryKey: ["slot-resolution-map"] });
  qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
},
```

**Key name verification:** `RECIPE_SECTIONS_KEY` prefix is `["recipe-sections"]` (useTechniqueInstances.ts line 6), `RECIPE_PAINTS_KEY` prefix is `["recipe-paints"]` (line 8), `SLOT_RESOLUTION_MAP_KEY` prefix is `["slot-resolution-map"]` (line 13), `STEP_COUNTS_KEY` / `RECIPE_AVAILABILITY_KEY` / `RECIPE_SWATCH_KEY` are scalars (lines 9-11).

---

### `tests/data-layer/technique-resync.test.ts` (test, CRUD)

**Analog:** `tests/data-layer/technique-progress-identity.test.ts` (entire file — same fixture shape, same better-sqlite3 direct SQL approach, same `createHobbyforgeDb` + module-scoped vars pattern)
**Secondary analog:** `tests/data-layer/apply-technique.test.ts` lines 1-30 (when testing via `createDbBridge` + `vi.mock`)

**File header pattern** (from `technique-progress-identity.test.ts` lines 1-27):
```typescript
// @vitest-environment node

/**
 * LINK-01 data-layer tests: resyncTechniqueInstances correctness.
 *
 * Covers: reorder (progress unmoved), add (new uncompleted row), remove (progress gone),
 * slot CASCADE, multi-recipe (non-detached only), cross-section step move.
 *
 * Uses better-sqlite3 directly — no Tauri bridge needed for pure SQL correctness proofs.
 * Calls resyncTechniqueInstances via createDbBridge (same pattern as apply-technique.test.ts).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createTestFaction,
  createTestUnit,
  createTestSection,
  createDbBridge,
} from "./db-helpers";

vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";
import { resyncTechniqueInstances } from "@/db/queries/recipeTechniqueResync";
```

**beforeEach fixture pattern** (from `technique-progress-identity.test.ts` lines 55-165 — the full materialisation setup; new test extends it with a second recipe for the multi-recipe case):
```typescript
describe("resyncTechniqueInstances (LINK-01)", () => {
  let db: Database.Database;
  // Technique structure
  let techniqueId: number;
  let techniqueSectionId: number;
  let s1Id: number; let s2Id: number; let s3Id: number;
  // Recipe + instance
  let recipeId: number; let instanceId: number; let sectionId: number;
  let s1RecipeStepId: number; let s2RecipeStepId: number;
  let assignmentId: number;

  beforeEach(() => {
    db = createHobbyforgeDb();
    // ... (same INSERT pattern as technique-progress-identity.test.ts lines 62-165)
    // Wire createDbBridge so resyncTechniqueInstances uses the in-memory DB
    const bridge = createDbBridge(db);
    vi.mocked(getDb).mockResolvedValue(bridge as never);
  });
  afterEach(() => db.close());
```

**Reorder test case pattern** (mirrors `technique-progress-identity.test.ts` lines 189-226 but calls `resyncTechniqueInstances` instead of raw SQL):
```typescript
  it("reorder: surviving recipe_step.id unchanged; order_index updated; progress untouched", async () => {
    // Mutate the technique_steps order (simulates saveTechniqueGraph edit)
    db.prepare("UPDATE technique_steps SET order_index = ? WHERE id = ?").run(2, s1Id);
    db.prepare("UPDATE technique_steps SET order_index = ? WHERE id = ?").run(0, s3Id);

    await resyncTechniqueInstances(bridge, techniqueId);

    // Assert order updated in recipe_steps
    const s1Row = db.prepare("SELECT order_index FROM recipe_steps WHERE id = ?").get(s1RecipeStepId);
    expect((s1Row as any).order_index).toBe(2);
    // Assert S2 progress untouched
    const progress = db.prepare(
      "SELECT recipe_step_id, completed FROM unit_recipe_step_progress WHERE recipe_step_id = ?"
    ).get(s2RecipeStepId);
    expect(progress).toBeDefined();
    expect((progress as any).completed).toBe(1);
  });
```

---

### `src-tauri/migrations/052_technique_resync_index.sql` (migration, optional)

**Analog:** `src-tauri/migrations/051_technique_library_foundation.sql` lines 75-78 (ALTER TABLE nullable FK pattern) and the `CREATE INDEX IF NOT EXISTS` idiom used in other migrations.

**Migration content pattern** (from RESEARCH.md Pitfall 6 recommendation):
```sql
-- 052: technique_resync_index
-- Adds technique_section_id to recipe_sections for exact section identity during resync
-- (avoids positional-only matching — see Phase 144 RESEARCH.md Pitfall 3).
-- Adds index on recipe_steps(technique_step_id) for resync step lookup performance.

ALTER TABLE recipe_sections ADD COLUMN technique_section_id INTEGER
    REFERENCES technique_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recipe_steps_technique_step_id
    ON recipe_steps(technique_step_id);
```

**Key constraint:** Migrations are auto-run at startup in filename order by Tauri plugin-sql. Never edit existing migration files. This file runs after 051 and before any future 053.

---

## Shared Patterns

### Single DB Handle (flat inline SQL, no nested BEGIN)

**Source:** `src/db/queries/techniques.ts` lines 315-327 (comment block) + lines 356, 436
**Apply to:** `recipeTechniqueResync.ts` (must receive `db` as parameter, never call `getDb()` internally)

```typescript
// From techniques.ts lines 315-327 (the authoritative explanation):
// NOTE: tauri-plugin-sql uses sqlx::Pool<Sqlite>. Each db.execute() may run on a
// DIFFERENT connection from the pool, so explicit BEGIN TRANSACTION / COMMIT /
// ROLLBACK is broken — the transaction boundary is not shared across calls.
// We use auto-commit mode instead: in WAL mode each committed write is immediately
// visible to all connections, so FK constraints on subsequent operations see
// newly inserted rows.
const db = await getDb();  // saveTechniqueGraph acquires the handle here
// ... all writes below use this same `db` reference ...
await resyncTechniqueInstances(db, finalId);  // passed in — no second getDb() call
```

### Progress Preservation Invariant (FND-03)

**Source:** `tests/data-layer/technique-progress-identity.test.ts` lines 360-419 (counter-case proof)
**Apply to:** `recipeTechniqueResync.ts` — every surviving step MUST be UPDATEd, never DELETEd+INSERTed

The counter-case test at lines 360-419 proves that `DELETE FROM recipe_steps WHERE id = $1` followed by a re-INSERT gives the new row a fresh autoincrement PK, which the `unit_recipe_step_progress` row (keyed by the OLD `recipe_step_id`) no longer points at. The original progress is cascade-deleted. The new row has no progress. The completion is permanently lost.

### `$1, $2` Parameterized SQL

**Source:** `src/db/queries/recipeTechniqueInstances.ts` lines 61-63, 80-91, 106-128
**Apply to:** All SQL in `recipeTechniqueResync.ts`
```typescript
// Correct (Tauri plugin-sql positional params):
await db.execute(`DELETE FROM recipe_steps WHERE technique_step_id = $1 AND section_id = $2`, [tsId, secId]);
// Wrong (string interpolation — forbidden):
await db.execute(`DELETE FROM recipe_steps WHERE technique_step_id = ${tsId}`, []);
```

### Boolean storage as 0|1

**Source:** `src-tauri/migrations/051_technique_library_foundation.sql` line 61 (`detached INTEGER NOT NULL DEFAULT 0`)
**Apply to:** `recipeTechniqueResync.ts` WHERE clause for `detached = 0`
```typescript
// Correct — integer literal, not boolean:
`WHERE technique_id = $1 AND detached = 0`
```

### Dialog open state + pending ref pattern

**Source:** `src/features/techniques/TechniqueDeleteDialog.tsx` lines 26-39 (open prop, onClose, try/catch in handler)
**Apply to:** `TechniqueFormSheet.tsx` confirmation dialog intercept

The `TechniqueDeleteDialog` uses a controlled `open` prop and `onClose` callback. The new confirmation in `TechniqueFormSheet` uses `useState` for `confirmDialog` (the dialog's data payload) and `useRef` for `pendingSubmitRef` (the in-flight form values). This avoids re-triggering form validation on confirmation.

### React Query prefix invalidation

**Source:** `src/hooks/useTechniqueInstances.ts` lines 39-47 (`invalidateAfterApply`)
**Apply to:** `useTechniques.ts` `useUpdateTechnique.onSuccess`

The `invalidateAfterApply` function in `useTechniqueInstances.ts` establishes the canonical set of keys to clear when the recipe step graph changes. `useUpdateTechnique` must broadcast the same keys (using prefix `["recipe-sections"]` rather than per-recipe `RECIPE_SECTIONS_KEY(recipeId)` since potentially many recipes are affected).

### Data-layer test structure

**Source:** `tests/data-layer/technique-progress-identity.test.ts` lines 1-27 (file header) + lines 55-165 (beforeEach fixture) + `tests/data-layer/db-helpers.ts` lines 118-166 (`createDbBridge`)
**Apply to:** `tests/data-layer/technique-resync.test.ts`

- File must begin with `// @vitest-environment node`
- Module-scoped `let db: Database.Database` with `createHobbyforgeDb()` in `beforeEach` and `db.close()` in `afterEach`
- `vi.mock("@/db/client", ...)` + `createDbBridge(db)` + `vi.mocked(getDb).mockResolvedValue(bridge as never)` to test query functions
- Direct `db.prepare(...).run(...)` calls (synchronous better-sqlite3) for fixture setup; async `await resyncTechniqueInstances(bridge, techniqueId)` for the function under test

---

## No Analog Found

All files have close codebase analogs. No file requires falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/lib/`, `src/features/techniques/`, `src/hooks/`, `tests/data-layer/`, `src-tauri/migrations/`
**Files scanned:** 15 (read in full or targeted sections)
**Pattern extraction date:** 2026-06-22
