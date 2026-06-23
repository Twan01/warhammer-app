# Phase 144: Live-Link Re-Sync — Research

**Researched:** 2026-06-22
**Domain:** SQLite data-layer — technique-to-recipe structural propagation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Resync runs **synchronously inside `saveTechniqueGraph`'s UPDATE path**, after the technique's own sections/steps save, on the **same db handle**.
- Resync targets **all non-detached** `recipe_technique_instances` for the technique (`detached = 0`); detached instances are skipped (Phase 146).
- New function **`resyncTechniqueInstances(db, techniqueId, …)`** takes the shared db handle (module placement = Claude's discretion).
- Surviving steps matched by **`technique_step_id`**: UPDATE order_index only — NEVER DELETE+INSERT a surviving step.
- Added technique steps → INSERT new `recipe_steps` (paint_id NULL, technique_step_id set, no progress rows).
- Removed technique steps → DELETE matching `recipe_step`; its `unit_recipe_step_progress` rows cascade-delete via FK.
- Confirmation dialog before a structural save: "**X recipes will be affected**" + aggregated change summary ("adds N steps, removes M steps, reorders K").
- Pure preview diff function — no DB writes during preview.
- Confirm → save + resync; Cancel → abort entire save (no partial writes).
- Slot add/remove handled entirely by FK CASCADE (no extra resync logic for slot maps).
- Single db handle throughout — **no nested `getDb()`, no nested `BEGIN`** (flat inline SQL, SC#4).
- Section-level changes: materialised `recipe_sections` matched by `technique_instance_id` + source section; add/remove/reorder mirror step handling.
- Data-layer tests (better-sqlite3) covering all four cases before any UI surface depends on resync (SC#3).

### Claude's Discretion

- Exact module placement of `resyncTechniqueInstances` (extend `recipes.ts` vs new `recipeTechniqueResync.ts`).
- Precise shape of the pure preview-diff function and its return type.
- Confirmation dialog component composition (reuse shadcn Dialog / AlertDialog).
- Test file naming under `tests/data-layer/` mirroring existing conventions.

### Deferred Ideas (OUT OF SCOPE)

- Painting Mode / paint-availability / SectionedTimeline / Log Session integration of technique-sourced steps (Phase 145).
- Detach + persistent "from technique X" section badges/safety rails (Phase 146).
- TQOL items (per-instance timestamp, slot suggestions, bulk reassign, soft-override flow) — v0.7.0 v2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LINK-01 | Editing a technique's step structure (add / remove / reorder) propagates to every recipe instance using it, while each recipe keeps its own slot colours | resyncTechniqueInstances function; per-instance section/step mutation SQL |
| LINK-02 | Before saving a structural technique change, user sees "X recipes will be affected" warning | preview diff via computeTechniqueStepDiff; instance-count query; confirmation dialog intercept in TechniqueFormSheet.onSubmit |
| LINK-03 | Confirmation shows a change summary ("adds N steps, removes M steps, reorders K"), not just a count | previewTechniqueResyncDiff pure function return type; dialog body |
</phase_requirements>

---

## Summary

Phase 144 delivers the live-link resync loop: when a user saves a structural edit to a technique (add/remove/reorder steps or sections), `saveTechniqueGraph`'s UPDATE path calls `resyncTechniqueInstances(db, techniqueId, ...)` with the already-open db handle, propagating the change to every non-detached recipe that applied the technique, while leaving each recipe's slot colours and existing step-completion progress untouched.

The correctness invariant is enforced by the v0.2.13 FK chain: `unit_recipe_step_progress.recipe_step_id` references `recipe_steps.id` with `ON DELETE CASCADE`. Surviving technique steps are matched to their materialised `recipe_steps` rows by the `technique_step_id` column (migration 051), and are mutated in-place (UPDATE only). The `recipe_step.id` PK never changes for a surviving step, so progress rows are untouched. Removed steps trigger a `DELETE FROM recipe_steps WHERE technique_step_id = $1 AND section_id = $2`; the cascade removes progress automatically.

Before committing, `TechniqueFormSheet.onSubmit` intercepts structural saves, calls a pure preview diff, counts affected recipes, and shows a shadcn AlertDialog. Confirm fires the actual `updateTechnique.mutateAsync`; Cancel returns without any DB writes. The `useUpdateTechnique` hook's `onSuccess` already invalidates technique-scoped keys; it must be extended to additionally invalidate all affected-recipe keys (sections, paints, slot-resolution-maps, step-counts, swatches, availability).

**Primary recommendation:** Implement `resyncTechniqueInstances` in a new `src/db/queries/recipeTechniqueResync.ts` module (keeps `techniques.ts` focused on technique graph CRUD). The function receives the db handle from `saveTechniqueGraph`'s UPDATE path and is pure SQL — no `getDb()` call, no `BEGIN`. Test it with the better-sqlite3 harness before writing any UI.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Resync SQL logic | DB queries layer (`src/db/queries/`) | — | Pure data-layer operation; no React state involved |
| Preview diff (change summary) | Pure lib function (`src/lib/`) | — | Must be callable from UI (no db) AND from the data layer for consistency; zero side-effects |
| Structural-change detection (is confirm needed?) | Form / UI layer (`TechniqueFormSheet`) | Lib (reuse computeTechniqueStepDiff) | The form already has draft + existing state; diff runs client-side |
| Confirmation dialog | UI layer (shadcn AlertDialog) | React Hook Form submit intercept | Standard shadcn pattern; no new component library needed |
| React Query invalidation after resync | Hook layer (`useTechniques.ts` onSuccess) | — | Must also broadcast affected-recipe keys |
| Section-level propagation | DB queries layer | — | Same diff-and-materialise pattern as step propagation |

---

## Standard Stack

### Core (no new dependencies — all existing)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | existing | Data-layer test harness | Already used in all `tests/data-layer/` tests |
| shadcn/ui AlertDialog | existing | Confirmation dialog | Project standard for destructive confirmations (see TechniqueDeleteDialog) |
| React Hook Form | existing | Form submit interception | onSubmit already in TechniqueFormSheet |
| Vitest | 4 | Test runner | Project standard |

**No new packages required.** [VERIFIED: CLAUDE.md "No new runtime or dev dependencies"] [CITED: STATE.md "No new runtime or dev dependencies — every v0.7.0 pattern maps to an existing codebase pattern"]

---

## Package Legitimacy Audit

Not applicable — this phase installs no new packages.

---

## Architecture Patterns

### System Architecture Diagram

```
TechniqueFormSheet.onSubmit
        │
        ├── [create path] → saveTechniqueGraph(null, ...) → INSERT only, no resync
        │
        └── [edit path]
              │
              ├── 1. computePreviewDiff(draftSections, draftSlots, existingSections,
              │          existingSteps, existingSlots)
              │           └── returns { stepAdds, stepRemoves, stepReorders,
              │                        sectionAdds, sectionRemoves }
              │
              ├── 2. getAffectedInstanceCount(techniqueId)  [DB read, returns number]
              │
              ├── 3. isStructural(diff) ?
              │         │
              │         YES → show AlertDialog("X recipes, +N/-M/↕K steps")
              │                   │
              │                   ├── Cancel → return (no DB write)
              │                   └── Confirm ↓
              │         NO  ────────────────────┘
              │
              └── 4. updateTechnique.mutateAsync(...)
                          │
                          └── saveTechniqueGraph(techniqueId, ...)   [techniques.ts]
                                    │
                                    ├── UPDATE technique metadata
                                    ├── Slot diff (DELETE/UPDATE/INSERT technique_colour_slots)
                                    ├── Section diff (DELETE/UPDATE/INSERT technique_sections)
                                    ├── Step diff (DELETE/UPDATE/INSERT technique_steps)
                                    │
                                    └── resyncTechniqueInstances(db, techniqueId)
                                                │
                                                ├── SELECT non-detached instances (recipe_id, id)
                                                │
                                                └── For each instance:
                                                      ├── SELECT current technique_sections ORDER BY order_index
                                                      ├── SELECT recipe_sections WHERE technique_instance_id = instance.id
                                                      ├── Section diff → DELETE removed, UPDATE existing, INSERT added
                                                      ├── SELECT current technique_steps for each section
                                                      ├── SELECT recipe_steps WHERE section_id = recipe_section.id
                                                      ├── Step diff (by technique_step_id):
                                                      │     REORDER  → UPDATE recipe_steps SET order_index = $N WHERE technique_step_id = $M
                                                      │     ADD      → INSERT recipe_steps (paint_id NULL, technique_step_id set)
                                                      │     REMOVE   → DELETE recipe_steps WHERE technique_step_id = $M AND section_id = $S
                                                      └── (slot maps untouched — CASCADE handles removed slots)
```

### Recommended Project Structure

```
src/
  db/queries/
    recipeTechniqueResync.ts    # NEW: resyncTechniqueInstances(db, techniqueId)
    techniques.ts               # MODIFIED: saveTechniqueGraph UPDATE path calls resync
  lib/
    techniquePreviewDiff.ts     # NEW: pure preview diff + isStructuralChange predicate
  features/techniques/
    TechniqueFormSheet.tsx      # MODIFIED: confirmation dialog intercept in onSubmit
  hooks/
    useTechniques.ts            # MODIFIED: useUpdateTechnique onSuccess invalidates recipe keys

tests/data-layer/
  technique-resync.test.ts      # NEW: 4 data-layer cases (reorder/add/remove/slot)
```

### Pattern 1: `resyncTechniqueInstances` — per-instance materialisation update

```typescript
// Source: inferred from applyTechnique (recipeTechniqueInstances.ts lines 51-141)
//         and technique-progress-identity.test.ts (the SQL operations the resync performs)

// recipeTechniqueResync.ts
export async function resyncTechniqueInstances(
  db: Awaited<ReturnType<typeof getDb>>,
  techniqueId: number,
): Promise<void> {
  // 1. Load all non-detached instances for this technique
  const instances = await db.select<{ id: number; recipe_id: number }[]>(
    `SELECT id, recipe_id FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0`,
    [techniqueId],
  );

  // 2. Load the (now-saved) technique sections
  const techniqueSections = await db.select<TechniqueSection[]>(
    `SELECT * FROM technique_sections WHERE technique_id = $1 ORDER BY order_index ASC`,
    [techniqueId],
  );

  // 3. For each instance: sync sections, then steps
  for (const instance of instances) {
    // Load current recipe sections for this instance
    const recipeSections = await db.select<RecipeSection[]>(
      `SELECT * FROM recipe_sections WHERE technique_instance_id = $1 ORDER BY order_index ASC`,
      [instance.id],
    );

    // Map technique_section_id → recipe_section.id (for cross-referencing)
    // NOTE: recipe_sections does NOT have a technique_section_id column (migration 051);
    //       they are matched by order_index position (see Pitfall 3 below).
    //       See Section Identity note.

    // Section sync: reorder surviving, insert new, delete removed
    // ... (see Pitfall 3 for the section-identity challenge)

    // For each technique section, sync its steps
    for (let si = 0; si < techniqueSections.length; si++) {
      const techSec = techniqueSections[si];
      const recipeSec = /* resolved recipe_section for this technique_section */ ...;

      const techniqueSteps = await db.select<TechniqueStep[]>(
        `SELECT * FROM technique_steps WHERE technique_section_id = $1 ORDER BY order_index ASC`,
        [techSec.id],
      );

      const recipeSteps = await db.select<{ id: number; technique_step_id: number | null; order_index: number }[]>(
        `SELECT id, technique_step_id, order_index FROM recipe_steps
         WHERE section_id = $1 AND technique_step_id IS NOT NULL
         ORDER BY order_index ASC`,
        [recipeSec.id],
      );

      // Build set of surviving technique_step_id values
      const survivingTechniqueStepIds = new Set(techniqueSteps.map((ts) => ts.id));

      // REMOVE: DELETE recipe_steps whose technique_step_id is no longer in technique
      for (const rs of recipeSteps) {
        if (rs.technique_step_id !== null && !survivingTechniqueStepIds.has(rs.technique_step_id)) {
          await db.execute(
            `DELETE FROM recipe_steps WHERE id = $1`,
            [rs.id],
          );
          // unit_recipe_step_progress CASCADE-deletes automatically
        }
      }

      // Build lookup: technique_step_id → existing recipe_step.id
      const existingByTechStepId = new Map(
        recipeSteps
          .filter((rs) => rs.technique_step_id !== null)
          .map((rs) => [rs.technique_step_id!, rs.id]),
      );

      // REORDER/ADD: for each technique step in current order
      for (let ti = 0; ti < techniqueSteps.length; ti++) {
        const ts = techniqueSteps[ti];
        const existingRecipeStepId = existingByTechStepId.get(ts.id);

        if (existingRecipeStepId !== undefined) {
          // REORDER: UPDATE order_index + sync metadata
          await db.execute(
            `UPDATE recipe_steps
             SET order_index = $2, step_name = $3, notes = $4,
                 painting_phase = $5, tool = $6, technique = $7,
                 dilution = $8, time_estimate_minutes = $9
             WHERE id = $1`,
            [existingRecipeStepId, ti, ts.step_name, ts.notes ?? null,
             ts.painting_phase ?? null, ts.tool ?? null, ts.technique ?? null,
             ts.dilution ?? null, ts.time_estimate_minutes ?? null],
          );
        } else {
          // ADD: INSERT new recipe_step with technique_step_id, paint_id = NULL
          await db.execute(
            `INSERT INTO recipe_steps
             (recipe_id, paint_id, step_name, order_index, notes,
              painting_phase, tool, technique, dilution, time_estimate_minutes,
              step_photo_path, alt_paint_id, section_id, technique_step_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [instance.recipe_id, null, ts.step_name, ti, ts.notes ?? null,
             ts.painting_phase ?? null, ts.tool ?? null, ts.technique ?? null,
             ts.dilution ?? null, ts.time_estimate_minutes ?? null,
             null, null, recipeSec.id, ts.id],
          );
        }
      }
    }
  }
}
```

**CRITICAL CONSTRAINT — FND-03 invariant:** Surviving steps MUST be identified by `technique_step_id` FK and mutated with UPDATE, never DELETE+INSERT. The counter-case test `technique-progress-identity.test.ts` lines 360–419 proves that DELETE+INSERT loses the `unit_recipe_step_progress` row via cascade.
[VERIFIED: tests/data-layer/technique-progress-identity.test.ts lines 360-419]

### Pattern 2: Pure preview diff for the confirmation dialog

```typescript
// src/lib/techniquePreviewDiff.ts

export interface TechniqueResyncPreview {
  stepAdds: number;     // technique steps with dbId === null
  stepRemoves: number;  // existing technique_steps not in draft
  stepReorders: number; // existing steps whose order_index changes
  sectionAdds: number;
  sectionRemoves: number;
  isStructural: boolean; // true if any count > 0
}

/**
 * Pure function — no DB access. Computes what resync will do.
 * Reuses computeTechniqueStepDiff logic (same inputs).
 * Called before save to populate the confirmation dialog.
 */
export function previewTechniqueResyncDiff(
  draftSections: DraftTechniqueSection[],
  existingSections: TechniqueSection[],
  existingSteps: TechniqueStep[],
): TechniqueResyncPreview {
  const { toDelete: stepRemoveIds, toUpdate: stepsToUpdate, toInsert: stepsToInsert }
    = computeTechniqueStepDiff(draftSections, existingSteps);

  // Reorders: surviving steps whose position in the flat list has changed
  // (compare draft position vs. existing order_index)
  const stepReorders = stepsToUpdate.filter((draftStep) => {
    const existing = existingSteps.find((s) => s.id === draftStep.dbId);
    if (!existing) return false;
    // Find the draft position (global flat index)
    let pos = 0;
    for (const sec of draftSections) {
      for (const st of sec.steps) {
        if (st.dbId === draftStep.dbId) return existing.order_index !== pos;
        pos++;
      }
    }
    return false;
  }).length;

  const survivingSectionDbIds = new Set(
    draftSections.map((s) => s.dbId).filter((id): id is number => id !== null),
  );
  const sectionRemoves = existingSections.filter((s) => !survivingSectionDbIds.has(s.id)).length;
  const sectionAdds = draftSections.filter((s) => s.dbId === null).length;

  return {
    stepAdds: stepsToInsert.length,
    stepRemoves: stepRemoveIds.length,
    stepReorders,
    sectionAdds,
    sectionRemoves,
    isStructural: stepRemoveIds.length > 0 || stepsToInsert.length > 0 || stepReorders > 0
                  || sectionRemoves > 0 || sectionAdds > 0,
  };
}
```

[ASSUMED: exact "reorder" counting approach — the logic above works but the planner should verify whether section-level reorders also count as structural]

### Pattern 3: Confirmation dialog intercept in `TechniqueFormSheet.onSubmit`

The intercept goes between the current validation block and the `updateTechnique.mutateAsync` call. Requires a `useState<boolean>` for dialog open state and a `useRef` to store the pending submit values.

```typescript
// Inside TechniqueFormSheet (src/features/techniques/TechniqueFormSheet.tsx)
// Source: existing onSubmit structure at lines 198-250

const [confirmOpen, setConfirmOpen] = useState(false);
const pendingSubmit = useRef<{ values: TechniqueFormValues; orderedSlots: ...; orderedSections: ... } | null>(null);

async function onSubmit(values: TechniqueFormValues) {
  // ... existing validation ...

  if (isEdit && technique) {
    const preview = previewTechniqueResyncDiff(orderedSections, existingSections, existingSteps);
    if (preview.isStructural) {
      const count = await getAffectedInstanceCount(technique.id); // DB SELECT COUNT(*)
      if (count > 0) {
        pendingSubmit.current = { values, orderedSlots, orderedSections };
        setConfirmDialog({ open: true, preview, count });
        return; // wait for user confirmation
      }
    }
  }

  await executeSave(values, orderedSlots, orderedSections);
}

async function executeSave(values, orderedSlots, orderedSections) {
  // current try/catch + updateTechnique.mutateAsync / createTechnique.mutateAsync
}
```

[CITED: src/features/techniques/TechniqueFormSheet.tsx lines 198-250]

### Pattern 4: React Query invalidation after resync

After resync, every affected recipe's UI caches are stale. The `useUpdateTechnique` hook's `onSuccess` must broadcast to recipe-scoped keys. Since the resync is synchronous inside `saveTechniqueGraph`, the mutation resolves after all recipe DB writes are done.

**Keys that MUST be invalidated after `useUpdateTechnique` succeeds when a structural change occurred:**

```typescript
// src/hooks/useTechniques.ts — extend useUpdateTechnique onSuccess
onSuccess: (_, variables) => {
  invalidateTechniqueKeys(qc);
  qc.invalidateQueries({ queryKey: TECHNIQUE_KEY(variables.techniqueId) });

  // Resync wrote to affected recipes — broadcast to all recipe-scoped caches
  qc.invalidateQueries({ queryKey: ["recipe-sections"] });       // RECIPE_SECTIONS_KEY prefix
  qc.invalidateQueries({ queryKey: ["recipe-paints"] });         // RECIPE_PAINTS_KEY prefix
  qc.invalidateQueries({ queryKey: ["slot-resolution-map"] });   // SLOT_RESOLUTION_MAP_KEY prefix
  qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
},
```

[CITED: src/hooks/useTechniques.ts lines 91-98 + src/hooks/useTechniqueInstances.ts lines 39-47]

### Anti-Patterns to Avoid

- **DELETE+INSERT for surviving steps:** Loses `unit_recipe_step_progress` via cascade. The counter-case test in `technique-progress-identity.test.ts` lines 360-419 is the definitive proof. Always UPDATE surviving `recipe_steps` by PK.
- **Calling `getDb()` inside `resyncTechniqueInstances`:** The function receives the db handle from `saveTechniqueGraph`; calling `getDb()` again acquires a different pool connection, breaking the auto-commit sequencing guarantee.
- **Nested `BEGIN`:** tauri-plugin-sql uses a connection pool (sqlx::Pool<Sqlite>); each `db.execute()` may land on a different connection, so `BEGIN` in one call and `COMMIT` in another do not share a transaction. This is why all saves are auto-commit sequential. [CITED: src/db/queries/techniques.ts lines 315-327]
- **Reordering recipe_steps using DELETE+INSERT for section moves:** If a technique step moves from one section to another (cross-section drag), the resync must UPDATE `recipe_steps.section_id` (to the new recipe_section) rather than deleting and reinserting — otherwise progress is lost. The step still survives via its `technique_step_id`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step diff (surviving vs. deleted vs. new) | Custom set comparison | `computeTechniqueStepDiff` (already in `techniques.ts`) | Already proven correct; same dbId-based logic |
| Slot diff | Custom | `computeSlotDiff` from `src/lib/techniqueDiff.ts` | Already battle-tested in saveTechniqueGraph |
| Confirmation dialog | Custom modal | shadcn `AlertDialog` (same as `TechniqueDeleteDialog`) | Project-standard, accessible, consistent |
| Progress cascade | Application-level DELETE on progress rows | `ON DELETE CASCADE` on `unit_recipe_step_progress.recipe_step_id` (migration 028) | Already wired; deleting the `recipe_steps` row automatically removes progress |

---

## Runtime State Inventory

Not applicable — this is a pure code/schema-adjacent phase. No existing stored data needs migration. Migration 051 already has all required columns (`recipe_steps.technique_step_id`, `recipe_sections.technique_instance_id`, `recipe_technique_instances.detached`). No new migration is expected (see Pitfall 6 for confirmation).

---

## Common Pitfalls

### Pitfall 1: Losing progress via DELETE+INSERT on surviving steps

**What goes wrong:** If the resync deletes the `recipe_steps` row for a step that still exists in the technique (e.g., to "refresh" its content), the FK cascade deletes the `unit_recipe_step_progress` row. The user's completion marker is gone.

**Why it happens:** Confusing "update the recipe step's content" with "replace the recipe step." The content (step_name, notes, etc.) should be synced via UPDATE; only the step's DB identity (`id`) must remain stable.

**How to avoid:** Identify surviving steps by `technique_step_id` match. If a `recipe_steps` row has `technique_step_id = X` and `X` still exists in the technique, UPDATE it. Never DELETE+INSERT it.

**Warning signs:** `unit_recipe_step_progress` rows disappearing after a technique edit; the counter-case test in `technique-progress-identity.test.ts` line 386 (`db.prepare("DELETE FROM recipe_steps WHERE id = ?").run(...)`) is the exact forbidden operation.

[CITED: tests/data-layer/technique-progress-identity.test.ts lines 360-419]

### Pitfall 2: Calling `getDb()` inside `resyncTechniqueInstances`

**What goes wrong:** `resyncTechniqueInstances` is called with the db handle already obtained by `saveTechniqueGraph`. Calling `getDb()` inside resync acquires a different connection from the pool. In WAL mode this is safe for reads, but it means the resync's writes are on a separate auto-commit stream — losing the "single handle" coordination that `saveTechniqueGraph` relies on.

**Why it happens:** Every other query module calls `getDb()` at the top of each function. Resync must NOT do this because it is an embedded sub-operation.

**How to avoid:** The function signature is `resyncTechniqueInstances(db: DbHandle, techniqueId: number): Promise<void>`. The `db` parameter is the handle passed in; the function never calls `getDb()` internally.

**Warning signs:** TypeScript: the return type of `getDb()` should be typed as the db handle type; passing it explicitly is the pattern from `tests/data-layer/db-helpers.ts` `createDbBridge`.

[CITED: 144-CONTEXT.md SC#4; src/db/queries/techniques.ts line 356]

### Pitfall 3: Section identity — `recipe_sections` has no `technique_section_id` column

**What goes wrong:** To resync sections, we need to know which `recipe_sections` row corresponds to which `technique_sections` row. But migration 051 only adds `recipe_sections.technique_instance_id` (pointing to the instance), NOT a `technique_section_id` column. Matching by order_index position is the only available mechanism without a schema addition.

**Why it happens:** Migration 051 (`src-tauri/migrations/051_technique_library_foundation.sql` lines 75-78) adds:
```sql
ALTER TABLE recipe_sections ADD COLUMN technique_instance_id INTEGER
    REFERENCES recipe_technique_instances(id) ON DELETE SET NULL;
```
There is no `technique_section_id` column on `recipe_sections`.

**How to avoid:** The resync must match sections positionally (by order_index rank within the instance's section list). This works correctly for the common case (reorder sections → update order_index; add section → append; remove section → delete). The implication:
- `recipe_sections` for a technique instance are fetched ordered by `order_index ASC`
- `technique_sections` are fetched ordered by `order_index ASC`
- Position i in the technique list maps to position i in the recipe's instance sections
- If counts differ, the surplus recipe sections (at the tail) are deleted; missing sections are inserted

**Alternative (optional migration 052):** Add `ALTER TABLE recipe_sections ADD COLUMN technique_section_id INTEGER REFERENCES technique_sections(id) ON DELETE SET NULL;` to enable exact identity matching (more robust for multi-section techniques). This is the cleaner approach and avoids positional ambiguity. Whether to add migration 052 for this column is a planner decision — the positional approach works for the current four-case test surface.

[CITED: src-tauri/migrations/051_technique_library_foundation.sql lines 75-78]
[ASSUMED: positional matching is sufficient for Phase 144 test cases; planner should decide whether migration 052 for technique_section_id is warranted]

### Pitfall 4: Metadata propagation vs. structural change detection

**What goes wrong:** The confirmation dialog should only trigger for structural changes (step add/remove/reorder, section add/remove/reorder). Pure metadata edits (renaming a step, changing a note) also go through saveTechniqueGraph and resync, but should NOT trigger the confirmation dialog. They still update the materialised recipe_steps content, just without the affected-recipe warning.

**Why it happens:** `isStructural` predicate must correctly exclude renames/note changes. If it treats metadata edits as structural, the user gets confirmation dialogs on every save, degrading UX.

**How to avoid:** `previewTechniqueResyncDiff` only counts: steps added (dbId === null), steps removed (not in draft), step order changes (order_index delta), section adds/removes. Text field changes (step_name, notes, etc.) are not structural.

**Warning signs:** Confirmation dialog appearing on a simple step rename. Test: rename a step → `isStructural` should return false.

### Pitfall 5: Cross-section step moves require `section_id` update, not DELETE+INSERT

**What goes wrong:** If a technique step is dragged from section A to section B in the technique editor, after `saveTechniqueGraph` the `technique_steps` row has a new `technique_section_id`. During resync, the corresponding `recipe_steps` row still has the OLD `section_id` (pointing at the recipe section for the old technique section). A naive "match by technique_step_id within section" would treat the step as removed from the old section (DELETE) and added to the new section (INSERT), losing progress.

**Why it happens:** The resync queries recipe_steps per section. If a step's section changed, the per-section query won't find it.

**How to avoid:** When building the lookup for "existing recipe_steps" during resync, query ALL recipe_steps for the instance (across all sections) keyed by `technique_step_id`, not per-section. Then during the per-section emit, if a step's current `section_id` is wrong, UPDATE it alongside order_index. Only truly removed steps (technique_step_id not in the current technique) get DELETEd.

**Warning signs:** Progress lost after dragging a technique step between sections. Data-layer test: move S2 from section A to section B; assert S2's progress row survives.

[ASSUMED: cross-section step moves need to be in scope for the resync; confirm with planner whether a test case should cover this]

### Pitfall 6: Migration 052 — is it needed?

**What is needed:** No new migration is REQUIRED for the core resync logic. All necessary columns (`recipe_steps.technique_step_id`, `recipe_sections.technique_instance_id`, `recipe_technique_instances.detached`) exist in migration 051.

**Optionally useful:** A `technique_section_id` column on `recipe_sections` (see Pitfall 3) would make section identity exact rather than positional. Also, an index on `recipe_steps.technique_step_id` would speed up the per-step lookup during resync (currently O(n) scan per section). For a personal app with small datasets, neither is critical.

**Decision for planner:** If migration 052 is created, it contains:
```sql
-- Optional: exact section identity for resync
ALTER TABLE recipe_sections ADD COLUMN technique_section_id INTEGER
    REFERENCES technique_sections(id) ON DELETE SET NULL;

-- Optional: index for resync step lookup performance
CREATE INDEX IF NOT EXISTS idx_recipe_steps_technique_step_id
    ON recipe_steps(technique_step_id);
```

**Recommendation:** Add the index in migration 052 (zero risk, small win). The `technique_section_id` column is optional but cleaner — planner decides.

[CITED: src-tauri/migrations/051_technique_library_foundation.sql — confirms no technique_section_id exists]

### Pitfall 7: `unit_recipe_step_progress` FK chain — confirmed ON DELETE CASCADE

**Confirmed cascade path:**
1. `technique_steps.id` → `recipe_steps.technique_step_id` (ON DELETE SET NULL — migration 051 line 78)
2. `recipe_steps.id` → `unit_recipe_step_progress.recipe_step_id` (ON DELETE CASCADE — migration 028 line 17)

**Implication:** Deleting a `technique_steps` row does NOT automatically delete the materialised `recipe_steps` row (it only NULLs the `technique_step_id` FK). The resync must explicitly DELETE the `recipe_steps` row (identified by `technique_step_id`). THEN the `ON DELETE CASCADE` on `unit_recipe_step_progress` fires automatically.

This is the correct two-step path:
1. `DELETE FROM recipe_steps WHERE technique_step_id = $1 AND section_id = $2` (resync explicit)
2. `unit_recipe_step_progress` cascade-deletes automatically (no resync code needed for progress cleanup)

[CITED: src-tauri/migrations/051_technique_library_foundation.sql lines 41-54 (ON DELETE SET NULL on technique_steps.technique_section_id)]
[CITED: src-tauri/migrations/028_step_progress_identity.sql lines 14-17 (ON DELETE CASCADE on unit_recipe_step_progress.recipe_step_id)]

### Pitfall 8: Invalidation scope after resync

**What goes wrong:** `useUpdateTechnique`'s current `onSuccess` only invalidates technique-scoped keys (techniques, technique-sections, technique-colour-slots, technique-used-by). After resync, every affected recipe's step list, swatch, availability badge, and slot resolution map is also stale.

**Why it happens:** The existing invalidation was written before resync existed.

**How to avoid:** Extend `useUpdateTechnique.onSuccess` to also invalidate recipe-scoped prefix keys using prefix invalidation (no recipe_id needed since potentially many recipes are affected):
- `["recipe-sections"]` prefix — covers all per-recipe section queries
- `["recipe-paints"]` prefix — covers all per-recipe step lists
- `["slot-resolution-map"]` prefix — covers all slot resolution maps
- `STEP_COUNTS_KEY` — batch step count
- `RECIPE_SWATCH_KEY` — swatch colours
- `RECIPE_AVAILABILITY_KEY` — paint availability badges

[CITED: src/hooks/useTechniques.ts lines 91-98; src/hooks/useTechniqueInstances.ts lines 39-47]

---

## Code Examples

### Exact SQL shape for resync step operations

```typescript
// Source: technique-progress-identity.test.ts lines 192-225 (REORDER)
// Source: technique-progress-identity.test.ts lines 239-244 (ADD)
// Source: technique-progress-identity.test.ts lines 286-289 (REMOVE)

// REORDER — UPDATE in-place, preserve id PK
await db.execute(
  `UPDATE recipe_steps SET order_index = $2 WHERE technique_step_id = $1 AND section_id = $3`,
  [techniqueStepId, newOrderIndex, recipeSectionId],
);

// ADD — INSERT new row, paint_id NULL (effectivePaintId spine), technique_step_id set
await db.execute(
  `INSERT INTO recipe_steps
   (recipe_id, paint_id, step_name, order_index, notes,
    painting_phase, tool, technique, dilution, time_estimate_minutes,
    step_photo_path, alt_paint_id, section_id, technique_step_id)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
  [recipeId, null, stepName, orderIndex, notes,
   paintingPhase, tool, technique, dilution, timeEst,
   null, null, recipeSectionId, techniqueStepId],
);

// REMOVE — DELETE by technique_step_id (progress cascade-deletes automatically)
await db.execute(
  `DELETE FROM recipe_steps WHERE technique_step_id = $1 AND section_id = $2`,
  [techniqueStepId, recipeSectionId],
);
```

[CITED: tests/data-layer/technique-progress-identity.test.ts lines 192-315]
[CITED: src/db/queries/recipeTechniqueInstances.ts lines 103-128 for INSERT column list]

### Instance count query (for confirmation dialog)

```typescript
// Source: techniques.ts lines 158-162 (getTechniqueUsageCount pattern)
// Needed: count of non-detached instances only

export async function getAffectedInstanceCount(techniqueId: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0`,
    [techniqueId],
  );
  return rows[0]?.n ?? 0;
}
```

[CITED: src/db/queries/techniques.ts lines 158-162]
[CITED: src-tauri/migrations/051_technique_library_foundation.sql lines 57-63 for `detached` column]

### Existing non-detached instances query for resync loop

```typescript
// This query is the iteration source for resyncTechniqueInstances
const instances = await db.select<{ id: number; recipe_id: number }[]>(
  `SELECT id, recipe_id FROM recipe_technique_instances
   WHERE technique_id = $1 AND detached = 0
   ORDER BY id ASC`,
  [techniqueId],
);
```

[CITED: src-tauri/migrations/051_technique_library_foundation.sql line 62 — detached INTEGER NOT NULL DEFAULT 0]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Progress keyed by order_index | Progress keyed by recipe_step_id FK | Migration 028 (v0.2.13) | Enables stable identity for resync; FND-03 invariant |
| Technique steps virtual (not materialised) | Concrete recipe_steps rows with technique_step_id FK (Option A) | Migration 051 (Phase 141) | Resync operates on real rows — identity is the PK, not a virtual composite |
| Recipe save: DELETE+INSERT all steps | Non-destructive diff (UPDATE-by-PK) | Phase 143 / saveRecipeGraph SC#5 guard | Template for resync's own UPDATE-not-replace discipline |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Positional matching (by order_index rank) is sufficient to identify recipe_sections belonging to a technique instance during resync | Pitfall 3 | Section add/remove/reorder resync could mismatch sections if technique has multiple sections with identical names |
| A2 | Cross-section step moves (drag from section A to B in technique editor) need a single-instance-level lookup (not per-section) to preserve progress | Pitfall 5 | Could lose progress if a step is moved between sections and resync queries per-section |
| A3 | `stepReorders` count in `previewTechniqueResyncDiff` using flat draft position vs existing order_index is a valid proxy for "reordered" | Pattern 2 | Over- or under-counting reorders in the confirmation dialog summary (cosmetic issue only; does not affect correctness) |
| A4 | Section-level reorders are "structural" (should trigger confirmation) | Pattern 2 / preview diff | If the planner disagrees, isStructural definition needs updating |
| A5 | Migration 052 is optional; positional section matching is acceptable for Phase 144 test coverage | Pitfall 6 | If technique sections are reordered AND some are added simultaneously, positional matching could produce wrong section-to-section mappings |

---

## Open Questions (RESOLVED)

> RESOLVED during planning (144-0N-PLAN.md): Q1 → migration 052 adds
> `technique_section_id` + index (plan 01 Task 1); Q2 → survivor UPDATE syncs all
> content fields (plan 01 Task 3); Q3 → `getNonDetachedInstanceCount` lives in
> `recipeTechniqueResync.ts` (plan 01).

1. **Should migration 052 add `recipe_sections.technique_section_id`?** — RESOLVED: yes (plan 01 Task 1).
   - What we know: migration 051 does not include this column; positional matching works for simple cases
   - What's unclear: whether multi-section techniques with simultaneous section reorder + add are in Phase 144 test scope
   - Recommendation: Add migration 052 with the `technique_section_id` column AND an index on `recipe_steps(technique_step_id)`. The schema addition is low risk (nullable ALTER ADD COLUMN) and makes resync correct for all cases.

2. **Should `resyncTechniqueInstances` also update metadata fields (step_name, notes, etc.) on surviving steps?**
   - What we know: LINK-01 says "step structure" propagates. The CONTEXT.md decision says "rename, notes, time" propagate via resync but require no confirmation.
   - What's unclear: whether the resync UPDATE for a surviving step should only change `order_index` or also sync all content fields from the technique_step
   - Recommendation: YES — sync all content fields (step_name, notes, painting_phase, tool, technique, dilution, time_estimate_minutes) on surviving steps. This is the correct "live link" behaviour and consistent with "editing once, updating everywhere."

3. **`getAffectedInstanceCount` placement: new query in `recipeTechniqueResync.ts` or in `techniques.ts`?**
   - What we know: `getTechniqueUsageCount` already exists in `techniques.ts` (counts all instances); we need non-detached count
   - Recommendation: Add `getNonDetachedInstanceCount(techniqueId)` to `recipeTechniqueResync.ts` (collocated with the resync logic). Keep `techniques.ts` focused on technique CRUD.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code changes with no external tool dependencies beyond the existing project stack.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + better-sqlite3 (data-layer), React Testing Library 16 (component) |
| Config file | vitest.config.ts (existing) |
| Quick run command | `pnpm test -- tests/data-layer/technique-resync.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LINK-01 (reorder) | Surviving steps keep recipe_step.id PK; order_index updated | data-layer | `pnpm test -- tests/data-layer/technique-resync.test.ts` | ❌ Wave 0 |
| LINK-01 (add) | New recipe_steps row inserted with technique_step_id, no progress | data-layer | same | ❌ Wave 0 |
| LINK-01 (remove) | recipe_steps row deleted; progress CASCADE-deleted | data-layer | same | ❌ Wave 0 |
| LINK-01 (slot remove) | slot_maps orphans gone via CASCADE | data-layer | same (reuse technique-progress-identity.test.ts slot case) | ❌ Wave 0 (extend existing) |
| LINK-01 (multi-recipe) | Resync touches all non-detached instances, skips detached=1 | data-layer | same | ❌ Wave 0 |
| LINK-01 (cross-section step move) | Progress survives a technique_step section change | data-layer | same | ❌ Wave 0 |
| LINK-02 | Confirmation dialog shown when structural change + instances > 0 | manual / component | n/a | N/A |
| LINK-03 | Dialog shows correct adds/removes/reorders count | unit (pure fn) | `pnpm test -- tests/lib/techniquePreviewDiff.test.ts` | ❌ Wave 0 |
| FND-03 (non-regression) | All existing technique-progress-identity.test.ts cases still green | data-layer | `pnpm test -- tests/data-layer/technique-progress-identity.test.ts` | ✅ exists |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/data-layer/technique-resync.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/data-layer/technique-resync.test.ts` — covers LINK-01 reorder, add, remove, slot, multi-recipe, cross-section cases
- [ ] `tests/lib/techniquePreviewDiff.test.ts` — covers LINK-03 pure diff counts (unit test, no DB)
- [ ] `src/db/queries/recipeTechniqueResync.ts` — the resync function itself
- [ ] `src/lib/techniquePreviewDiff.ts` — the pure preview diff function

*(No framework install needed — existing vitest + better-sqlite3 + db-helpers.ts cover everything)*

---

## Security Domain

Security enforcement is enabled. ASVS categories applicable to this phase:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (technique ID param) | Parameterized SQL ($1,$2) — already enforced project-wide |
| V6 Cryptography | no | — |

No threat patterns beyond the existing parameterized-query discipline. The resync function receives a DB-internal integer ID from the caller (not user input) — SSRF/injection risk is negligible.

---

## Sources

### Primary (HIGH confidence)
- `tests/data-layer/technique-progress-identity.test.ts` — exact SQL operations the resync must mirror; counter-case proves UPDATE-not-DELETE+INSERT
- `src/db/queries/recipeTechniqueInstances.ts` — `applyTechnique` INSERT column list and `getInstancesForRecipe` query shape
- `src-tauri/migrations/051_technique_library_foundation.sql` — full schema; `recipe_sections.technique_instance_id`; `recipe_steps.technique_step_id`; `recipe_technique_instances.detached`
- `src-tauri/migrations/028_step_progress_identity.sql` — `unit_recipe_step_progress.recipe_step_id` ON DELETE CASCADE
- `src/db/queries/techniques.ts` lines 338-641 — `saveTechniqueGraph` full UPDATE path; `computeTechniqueStepDiff`; `computeSlotDiff`; single db handle pattern
- `src/db/queries/recipes.ts` lines 299-541 — `saveRecipeGraph` SC#5 guard; section/step diff patterns
- `src/hooks/useTechniques.ts` lines 91-128 — existing invalidation keys; `useUpdateTechnique` shape
- `src/hooks/useTechniqueInstances.ts` lines 39-47 — `invalidateAfterApply` full key set reference
- `src/features/techniques/TechniqueFormSheet.tsx` lines 198-250 — onSubmit structure for dialog intercept
- `tests/data-layer/db-helpers.ts` — `createHobbyforgeDb`, `createDbBridge` harness for new tests

### Secondary (MEDIUM confidence)
- `144-CONTEXT.md` — user decisions (all accepted); resync contract
- `src/lib/techniqueDiff.ts` — `computeSlotDiff`, `buildSlotIdMap` (reuse in preview diff)
- `tests/data-layer/apply-technique.test.ts` — test file structure template for new resync tests

---

## Metadata

**Confidence breakdown:**
- Core resync SQL algorithm: HIGH — the exact SQL is proven by existing data-layer tests
- Section identity matching: MEDIUM — positional approach works but has a known edge-case gap (see Pitfall 3 / A5); migration 052 option resolves it
- Preview diff counting: MEDIUM — logic is correct in spirit; exact reorder-count implementation may need tuning [A3]
- React Query invalidation: HIGH — key names verified directly in hook files
- Confirmation dialog: HIGH — shadcn AlertDialog is an existing project pattern (TechniqueDeleteDialog)

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stable domain — schema is fixed by migration 051)
