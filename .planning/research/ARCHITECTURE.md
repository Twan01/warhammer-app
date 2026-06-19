# Architecture Research — v0.7.0 Technique Library

**Domain:** Parameterized, live-linked technique system extending the HobbyForge recipe model
**Researched:** 2026-06-19
**Confidence:** HIGH (based on direct source-code inspection of the full existing system)

---

## Standard Architecture

### System Overview

The technique library is a second-order extension of the existing recipe graph. It adds a
canonical template layer above the recipe layer. The four-layer stack is unchanged; new tables,
queries, hooks, and feature components slot in following established patterns.

```
┌──────────────────────────────────────────────────────────────────────┐
│  UI — src/features/techniques/**, src/features/recipes/**            │
│  TechniqueLibraryPage  TechniqueSheet  RecipeFormSheet (extended)    │
│  SlotFillDialog  TechniqueInstanceBadge  TechniqueDropZone           │
├──────────────────────────────────────────────────────────────────────┤
│  React Query hooks — src/hooks/useTechniques.ts                      │
│  useTechniques  useTechnique  useCreateTechnique  useUpdateTechnique │
│  useDeleteTechnique  useTechniqueSlots  useRecipeTechniqueInstances  │
│  useSlotFills  useUpsertSlotFill  useResyncTechniqueInstance         │
│  useDetachTechniqueInstance                                          │
├──────────────────────────────────────────────────────────────────────┤
│  Query modules — src/db/queries/techniques.ts                        │
│  getTechniques  getTechniqueGraph  saveTechniqueGraph                │
│  createRecipeTechniqueInstance  resyncTechniqueInstance              │
│  detachTechniqueInstance  upsertSlotFill  resolveStepsForRecipe      │
├──────────────────────────────────────────────────────────────────────┤
│  DB client singleton — src/db/client.ts → tauri-plugin-sql → SQLite │
│  hobbyforge.db (migration 051+)                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Schema Design

### New Tables (migration 051)

```sql
-- 051_technique_library.sql

-- Core technique header
CREATE TABLE IF NOT EXISTS techniques (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    description   TEXT,
    difficulty    TEXT,           -- reuse RECIPE_DIFFICULTIES const
    style         TEXT,           -- e.g. "OSL", "NMM", "Wet Blend"
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A technique can have one or more sections (mirrors recipe_sections structure)
CREATE TABLE IF NOT EXISTS technique_sections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    surface       TEXT,
    optional      INTEGER NOT NULL DEFAULT 0,   -- 0 | 1 boolean
    order_index   INTEGER NOT NULL DEFAULT 0,
    notes         TEXT,
    section_type  TEXT,           -- reuse SECTION_TYPES const
    execution_mode TEXT,          -- reuse EXECUTION_MODES const
    applies_to    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Named colour roles/slots for a technique
-- e.g. technique "OSL" -> slots: Glow Core, Glow Mid, Glow Edge, Surface Tint
-- MUST be declared before technique_steps (FK reference)
CREATE TABLE IF NOT EXISTS technique_slots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,      -- e.g. "Glow Core"
    hint          TEXT,               -- optional guidance, e.g. "bright saturated colour"
    order_index   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_technique_slots_technique ON technique_slots(technique_id);

-- Steps within a technique section.
-- paint_id is ABSENT by design -- colour is always resolved through a slot.
-- slot_id is NULLABLE so paintless steps (tools-only) are supported.
CREATE TABLE IF NOT EXISTS technique_steps (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_section_id   INTEGER NOT NULL REFERENCES technique_sections(id) ON DELETE CASCADE,
    technique_id           INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    step_name              TEXT NOT NULL,
    slot_id                INTEGER REFERENCES technique_slots(id) ON DELETE SET NULL,
    notes                  TEXT,
    painting_phase         TEXT,
    tool                   TEXT,
    dilution               TEXT,
    time_estimate_minutes  INTEGER,
    order_index            INTEGER NOT NULL DEFAULT 0,
    created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_technique_steps_slot ON technique_steps(slot_id);
CREATE INDEX IF NOT EXISTS idx_technique_steps_section ON technique_steps(technique_section_id);
CREATE INDEX IF NOT EXISTS idx_technique_steps_technique ON technique_steps(technique_id);
```

### New Tables (migration 052)

```sql
-- 052_recipe_technique_instances.sql

-- Instance table declared first so recipe_sections can FK to it
CREATE TABLE IF NOT EXISTS recipe_technique_instances (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id          INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    technique_id       INTEGER NOT NULL REFERENCES techniques(id) ON DELETE RESTRICT,
    recipe_section_id  INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE,
    detached           INTEGER NOT NULL DEFAULT 0,   -- 0 | 1 boolean
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rti_recipe ON recipe_technique_instances(recipe_id);
CREATE INDEX IF NOT EXISTS idx_rti_technique ON recipe_technique_instances(technique_id);

-- Per-instance slot->paint colour mapping.
-- Each recipe keeps its own colour choices independently of other recipes.
CREATE TABLE IF NOT EXISTS recipe_slot_fills (
    id                           INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_technique_instance_id INTEGER NOT NULL
        REFERENCES recipe_technique_instances(id) ON DELETE CASCADE,
    technique_slot_id            INTEGER NOT NULL REFERENCES technique_slots(id) ON DELETE CASCADE,
    paint_id                     INTEGER REFERENCES paints(id) ON DELETE SET NULL,
    UNIQUE(recipe_technique_instance_id, technique_slot_id)
);
CREATE INDEX IF NOT EXISTS idx_rsf_instance ON recipe_slot_fills(recipe_technique_instance_id);

-- Add technique_instance_id to recipe_sections
-- NULL for all non-technique sections; set when a section is live-linked
ALTER TABLE recipe_sections ADD COLUMN technique_instance_id INTEGER
    REFERENCES recipe_technique_instances(id) ON DELETE SET NULL;

-- Add technique_step_id to recipe_steps
-- NULL for regular steps; set to the source technique_steps.id for live-linked steps
ALTER TABLE recipe_steps ADD COLUMN technique_step_id INTEGER
    REFERENCES technique_steps(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_steps_technique_step ON recipe_steps(technique_step_id);
```

### Complete Table Inventory

| Table | Status | Key Columns |
|-------|--------|-------------|
| `techniques` | NEW | id, name, description, difficulty, style |
| `technique_sections` | NEW | id, technique_id FK CASCADE, name, order_index, section_type |
| `technique_slots` | NEW | id, technique_id FK CASCADE, name, hint, order_index |
| `technique_steps` | NEW | id, technique_section_id FK CASCADE, technique_id FK CASCADE, slot_id FK SET NULL, step_name, order_index |
| `recipe_technique_instances` | NEW | id, recipe_id FK CASCADE, technique_id FK RESTRICT, recipe_section_id FK CASCADE, detached 0\|1 |
| `recipe_slot_fills` | NEW | id, recipe_technique_instance_id FK CASCADE, technique_slot_id FK CASCADE, paint_id FK SET NULL |
| `recipe_sections` | MODIFIED | + technique_instance_id FK SET NULL (nullable) |
| `recipe_steps` | MODIFIED | + technique_step_id FK SET NULL (nullable) |

---

## Live-Link Resolution Strategy

### Chosen Approach: Materialized Rows with Stable technique_step_id Source Linkage

**Rejected alternative — read-time virtual steps:** Resolving technique steps at query time
(joining technique_steps into the recipe step list without storing rows in recipe_steps) would
make every step-reading query complex, break Painting Mode's existing query structure, require
changes to `unit_recipe_step_progress` foreign keys, and make progress tracking impossible
without changing the progress key from `recipe_step_id` (a concrete row PK) to a composite.

**Chosen approach:** When a technique is dropped into a recipe, materialize concrete
`recipe_steps` rows that are FK-linked back to their source `technique_step_id`. The
`recipe_step_id` progress system requires no changes. Re-sync updates those materialized rows
in-place (using the `technique_step_id` linkage to match them), which preserves the
`recipe_step_id` of each row across any technique edit.

**Why this solves the progress stability requirement:**

The existing system keys progress to `recipe_step_id` (a concrete PK in `recipe_steps`,
established by migration 028). When a technique adds/removes/reorders its own steps:

- A step that SURVIVES a technique edit retains the same `technique_step_id`. The re-sync
  algorithm finds the corresponding `recipe_steps` row via the `technique_step_id` FK column
  and UPDATEs its content in place. The `recipe_step_id` (PK) of that row is unchanged.
  Progress keyed to it is undisturbed.
- A step that is REMOVED from the technique: the re-sync DELETEs the corresponding
  `recipe_steps` row. The `recipe_step_id` FK in `unit_recipe_step_progress` carries
  `ON DELETE CASCADE`, so progress for removed steps is cleaned up automatically and honestly
  (the step no longer exists; its completion record should not survive either).
- A step that is ADDED to the technique: the re-sync INSERTs a new `recipe_steps` row with
  the new `technique_step_id`. A new PK is allocated. Progress starts at zero, which is correct.

`technique_step_id` is the stable identity for technique-owned steps, and `recipe_step_id`
remains the stable identity for progress. The two are bound permanently by the FK column on
`recipe_steps.technique_step_id`. No change to the progress system is needed.

### Re-sync Algorithm (resyncTechniqueInstance)

Called after any technique edit that changes structure. Operates on all non-detached instances
of the changed technique. For each affected `recipe_section_id`, using a single `db` handle
(no nested helper calls that would create new pool connections):

```
1. Load all technique_steps for the technique ordered by
   (technique_section.order_index, technique_step.order_index)

2. Load all recipe_steps WHERE technique_step_id IS NOT NULL
   AND section_id = recipeSectionId

3. Build Map<technique_step_id, recipe_steps.id> from existing materialized rows

4. For each technique_step in canonical order:
     If technique_step.id exists in Map:
       UPDATE recipe_steps SET
         step_name = $name,
         notes = $notes,
         painting_phase = $phase,
         tool = $tool,
         dilution = $dilution,
         time_estimate_minutes = $time,
         order_index = $newIndex
       WHERE id = Map[technique_step.id]
       -- recipe_step_id PK and paint_id=NULL untouched
     Else:
       INSERT INTO recipe_steps
         (recipe_id, section_id, technique_step_id, step_name, notes,
          painting_phase, tool, dilution, time_estimate_minutes, order_index,
          paint_id)   -- paint_id always NULL for technique-owned steps
       VALUES ($...)

5. DELETE FROM recipe_steps
   WHERE section_id = recipeSectionId
     AND technique_step_id NOT IN (<current technique step ids>)
   -- ON DELETE CASCADE cleans unit_recipe_step_progress automatically
```

paint_id for technique-owned steps is always NULL in the `recipe_steps` row. The
effective paint is resolved at read time via a LEFT JOIN through `recipe_slot_fills`.
This keeps a single source of truth.

### Enriched Step Read Query

The read query for all recipe consumers (timeline, Painting Mode, apply-to-units count)
adds three LEFT JOINs to the existing step query:

```sql
SELECT
  rs.*,
  COALESCE(rsf.paint_id, NULL) AS resolved_paint_id,
  ts.slot_id               AS technique_slot_id,
  tsl.name                 AS slot_name,
  rti.id                   AS technique_instance_id_from_section
FROM recipe_steps rs
LEFT JOIN recipe_sections sec ON sec.id = rs.section_id
LEFT JOIN recipe_technique_instances rti
  ON rti.id = sec.technique_instance_id
LEFT JOIN technique_steps ts ON ts.id = rs.technique_step_id
LEFT JOIN recipe_slot_fills rsf
  ON rsf.recipe_technique_instance_id = rti.id
  AND rsf.technique_slot_id = ts.slot_id
LEFT JOIN technique_slots tsl ON tsl.id = ts.slot_id
WHERE rs.recipe_id = $1
ORDER BY COALESCE(sec.order_index, 999999) ASC, rs.order_index ASC
```

For regular (non-technique) steps: `resolved_paint_id` falls back to `rs.paint_id` via
COALESCE in the TypeScript layer (or SQL: `COALESCE(rsf.paint_id, rs.paint_id)`).
All three new columns are NULL for regular steps, which is safe for consumers.

---

## Step Progress Identity: Complete Specification

### The Invariant

`unit_recipe_step_progress.recipe_step_id` is ALWAYS a PK of a concrete `recipe_steps` row.
This invariant must never be broken by the technique feature.

### How It Holds Under Every Edit Case

| Event | Effect on recipe_steps | Effect on progress |
|-------|------------------------|-------------------|
| Edit technique step (rename/phase/tool) | UPDATE recipe_steps row in-place (same PK) | Unchanged — same recipe_step_id |
| Reorder technique steps | UPDATE order_index on recipe_steps rows | Unchanged — keyed to PK not order_index |
| Add step to technique | INSERT new recipe_steps row (new PK) | New row starts incomplete; existing untouched |
| Remove step from technique | DELETE recipe_steps row | CASCADE removes progress row — correct, step gone |
| Add slot to technique | No recipe_steps change; new slot row only | No effect on progress |
| Remove slot from technique | technique_steps.slot_id SET NULL; recipe_steps unchanged | resolved_paint_id becomes NULL (unfilled state) |
| Rename slot | No structural change | Slot name visible in UI updates immediately |
| Detach instance | Clear technique_step_id on all steps in section | Progress rows survive; steps now owned by recipe |

### ON DELETE CASCADE on recipe_steps (existing, migration 028)

`unit_recipe_step_progress.recipe_step_id` references `recipe_steps(id)` with
`ON DELETE CASCADE`. When `resyncTechniqueInstance` deletes a `recipe_steps` row for a
removed technique step, the cascade fires and removes the associated progress row across
all unit assignments. This is honest: a completed step that was removed from the technique
no longer exists; its completion should not survive.

Side effect: removing a step from a widely-used technique will decrease `painting_percentage`
for all units using a recipe linked to that technique. The `syncPaintingPercentage` trigger
runs on the next assignment write. If the percentage was 100% (Completed), removing a step
re-opens it — which is the correct representation. The UI should warn the technique author
that removing steps affects all linked recipes and their unit progress.

---

## Component Boundaries

### New Feature Module: src/features/techniques/

| File | Responsibility |
|------|---------------|
| `techniqueSchema.ts` | Zod schema for technique header + slot form values |
| `TechniqueLibraryPage.tsx` | Page listing all techniques with search/filter/sort |
| `TechniqueSheet.tsx` | Create/edit technique: metadata + sections + steps + slots |
| `TechniqueCard.tsx` | Card in library grid (name, style, step count, slot badges) |
| `TechniqueInstanceBadge.tsx` | Badge on linked recipe sections showing technique name + detach action |
| `SlotFillDialog.tsx` | Dialog to fill slots when dropping a technique into a recipe |
| `SlotFillRow.tsx` | One row per slot: name + paint picker dropdown |
| `applyTechniqueFilters.ts` | Pure filter function for library search/filter |
| `techniqueFilters.ts` | Zustand filter store for library page |

### Modified Feature Files

| File | Change |
|------|--------|
| `src/features/recipes/recipeSection.ts` | `makeDraftSection` gains `technique_instance_id: null`; `buildDraftSections` reads `technique_instance_id` from DB row |
| `src/types/recipe.ts` | `DraftSection` + `technique_instance_id: number \| null`; `DraftStep` + `technique_step_id: number \| null` and `resolved_paint_id: number \| null` (read-side only) |
| `src/types/recipeSection.ts` | `RecipeSection` + `technique_instance_id: number \| null` |
| `src/types/recipePaint.ts` | `RecipeStep` + `technique_step_id: number \| null` |
| `src/db/queries/recipes.ts` | `saveRecipeGraph` five-phase diff must skip live-linked steps (technique_step_id != null); they are managed by resync, not the recipe editor |
| `src/db/queries/recipePaints.ts` | `getStepsForRecipe` enriched with slot resolution LEFT JOINs producing `resolved_paint_id`, `slot_name` |
| `src/app/router.tsx` | Add `/techniques` route, lazy-load TechniqueLibraryPage |
| `src/components/common/AppSidebar.tsx` | Workshop group gains "Techniques" nav item |

### New Query Module: src/db/queries/techniques.ts

- `getTechniques()` — list all technique headers for library page
- `getTechniqueGraph(id)` — header + sections + steps + slots in one function (sequential SELECTs, single db handle)
- `saveTechniqueGraph(id | null, formValues, draftSections)` — five-phase diff for technique_sections + technique_steps; mirrors saveRecipeGraph exactly
- `deleteTechnique(id)` — COUNT check for non-detached instances; throw typed error if found; DELETE otherwise
- `createRecipeTechniqueInstance(recipeId, techniqueId, recipeSectionId)` — INSERT instance, INSERT slot_fill placeholders, materialize recipe_steps from technique_steps
- `resyncTechniqueInstance(db, instanceId)` — takes existing db handle, in-place UPDATE/INSERT/DELETE on materialized recipe_steps
- `resyncAllInstancesForTechnique(techniqueId)` — top-level: single db = getDb(), loop over non-detached instances calling resyncTechniqueInstance(db, ...)
- `detachTechniqueInstance(instanceId)` — clear technique_step_id on steps, clear technique_instance_id on section, set detached=1
- `upsertSlotFill(instanceId, slotId, paintId)` — INSERT OR REPLACE into recipe_slot_fills

### New Hook File: src/hooks/useTechniques.ts

```typescript
export const TECHNIQUES_KEY = ["techniques"] as const;
export const TECHNIQUE_KEY = (id: number) => ["techniques", id] as const;
export const TECHNIQUE_INSTANCES_KEY = (recipeId: number) =>
  ["recipe-technique-instances", recipeId] as const;

// List
export function useTechniques() { ... }

// Single graph (header + sections + steps + slots)
export function useTechniqueGraph(id: number) { ... }

// Mutations — all invalidate relevant keys
export function useCreateTechnique() { /* invalidates TECHNIQUES_KEY */ }
export function useUpdateTechniqueGraph() {
  /* invalidates TECHNIQUE_KEY(id) + TECHNIQUES_KEY
     + ["recipe-steps", affectedRecipeId] for all live-linked recipes */
}
export function useDeleteTechnique() { /* invalidates TECHNIQUES_KEY */ }
export function useResyncTechniqueInstance() {
  /* invalidates TECHNIQUE_INSTANCES_KEY(recipeId) + ["recipe-steps", recipeId] */
}
export function useDetachTechniqueInstance() { /* same invalidation as resync */ }
export function useUpsertSlotFill() { /* invalidates ["recipe-steps", recipeId] */ }
```

---

## Data Flow

### Drop Technique into Recipe Section

```
User clicks "Use Technique" on section toolbar in RecipeFormSheet
    |
    v
Technique picker (filtered list from useTechniques)
    |
    v
SlotFillDialog opens: shows all technique_slots for chosen technique
User fills each slot with a paint (or leaves some empty/defers)
    |
    v
createRecipeTechniqueInstance(recipeId, techniqueId, recipeSectionId)
  [single db handle, auto-commit per statement -- no nesting]
  INSERT recipe_technique_instances -> instanceId
  INSERT recipe_slot_fills for all filled slots
  For each technique_step:
    INSERT recipe_steps (technique_step_id=step.id, paint_id=NULL,
                         section_id=recipeSectionId, recipe_id=recipeId)
  UPDATE recipe_sections SET technique_instance_id = instanceId
    |
    v
Invalidate: RECIPE_KEY(recipeId), RECIPE_STEPS_KEY(recipeId),
            TECHNIQUE_INSTANCES_KEY(recipeId)
UI re-renders: section shows TechniqueInstanceBadge; steps show with resolved_paint_id
```

### Edit Technique Structure

```
User saves technique in TechniqueSheet
    |
    v
saveTechniqueGraph(techniqueId, formValues, draftSections)
  Five-phase diff on technique_sections / technique_steps
    |
    v
resyncAllInstancesForTechnique(techniqueId)
  db = getDb()   <-- single connection handle for entire resync pass
  SELECT all non-detached recipe_technique_instances WHERE technique_id = $1
  For each instance:
    resyncTechniqueInstance(db, instanceId)
      diff technique_steps vs materialized recipe_steps (WHERE technique_step_id IS NOT NULL)
      UPDATE / INSERT / DELETE recipe_steps in-place
      ON DELETE CASCADE cleans unit_recipe_step_progress automatically
    |
    v
Invalidate: TECHNIQUE_KEY(id), TECHNIQUES_KEY
  + for each affected recipe: RECIPE_KEY(recipeId), ["recipe-steps", recipeId]
```

### Painting Mode Step Execution (no change required)

```
useRecipeSteps(recipeId)  ->  getStepsForRecipe (enriched query)
  Returns RecipeStep rows with resolved_paint_id, slot_name, technique_step_id
    |
    v
PaintingMode component:
  Displays step_name (from recipe_steps -- updated by resync from technique_steps)
  Displays resolved_paint_id as paint swatch  [was: paint_id]
  resolved_paint_id = NULL && slot_id IS NOT NULL  -> amber "unfilled slot" warning
  resolved_paint_id = NULL && slot_id IS NULL      -> paintless step (no warning)
    |
    v
Mark step done -> upsertStepProgress(assignmentId, recipe_step_id, true)
  recipe_step_id is the PK of the recipe_steps row  [unchanged by resync]
  Progress is preserved across all technique edits
```

### Detach Instance

```
User clicks "Detach" on TechniqueInstanceBadge (with confirmation)
    |
    v
detachTechniqueInstance(instanceId)
  db = getDb()
  SELECT recipe_section_id FROM recipe_technique_instances WHERE id = $1
  UPDATE recipe_steps
    SET technique_step_id = NULL
    WHERE section_id = recipeSectionId AND technique_step_id IS NOT NULL
  UPDATE recipe_sections
    SET technique_instance_id = NULL WHERE id = recipeSectionId
  UPDATE recipe_technique_instances
    SET detached = 1, updated_at = datetime('now') WHERE id = $1
    |
    v
Steps become standard recipe_steps (technique_step_id = NULL)
Section shows no badge; steps become editable directly in recipe editor
Progress records survive -- recipe_step_id PKs are unchanged
Slot fills preserved in recipe_slot_fills (detached=1 instance, harmless)
```

---

## Integration Points

### Painting Mode

No structural change to progress system. Change needed in the step display component:

- Replace `step.paint_id` with `step.resolved_paint_id` for paint swatch display
- Paint readiness warning logic must distinguish:
  - `resolved_paint_id = NULL AND slot_id IS NULL` → genuine paintless step, no warning
  - `resolved_paint_id = NULL AND slot_id IS NOT NULL` → unfilled slot, show amber warning with `slot_name`
- All existing keyboard shortcut and navigation logic is unaffected

### Recipe Timeline (SectionedTimeline)

- Sections with `technique_instance_id != null` render `TechniqueInstanceBadge`
- Steps with `slot_id IS NOT NULL` show `slot_name` alongside the paint swatch area
- Unfilled slots (`resolved_paint_id = NULL`, `slot_id IS NOT NULL`) display slot name in
  amber with "fill slot" affordance linking to `SlotFillDialog`
- Per-section paint availability counts: use `resolved_paint_id` instead of `paint_id`

### Paint Availability Calculation

The existing availability query joins `recipe_steps` to `paints` on `paint_id`. For
technique-owned steps, `recipe_steps.paint_id` is always NULL. The query must be updated
to use `resolved_paint_id` (computed via the slot fill LEFT JOINs). The section join is
already present; the additional JOINs through `recipe_sections.technique_instance_id` →
`recipe_slot_fills` → `paints` are the change. Unfilled slots count as missing paints.

### Apply-to-Units

No change required. `createAssignment` and `upsertStepProgress` reference `recipe_step_id`
(the PK of `recipe_steps` rows, which are materialized for technique-owned steps).
`syncPaintingPercentage` counts `recipe_steps` rows joined through `unit_recipe_assignments`;
technique-owned materialized rows are included automatically.

The `getMostRecentAssignmentWithIncompleteStep` query used by Dashboard / CurrentFocusCard
already JOINs `recipe_steps` -- it will correctly include technique-owned steps and show
their `step_name` (which is kept current by resync).

### saveRecipeGraph Five-Phase Diff

The diff algorithm in `src/lib/recipeDiff.ts` (computeStepDiff) must exclude live-linked
steps from the DELETE and UPDATE passes. The guard is:

```typescript
// In computeStepDiff or before passing existingSteps:
const manualExistingSteps = existingSteps.filter(
  (st) => st.technique_step_id === null
);
```

The recipe editor UI should render technique-linked sections as read-only: their steps
are displayed but not editable. The only recipe-level customization in a linked section
is slot fills. If the user deletes an entire linked section (e.g., removes the section card),
the CASCADE on `recipe_sections` → `recipe_steps` cleans up materialized steps, and
CASCADE on `recipe_sections.id` referenced by `recipe_technique_instances.recipe_section_id`
cleans the instance row as well.

### Recipe Duplication (duplicateRecipe)

The existing `duplicateRecipe` function copies sections and steps. When a section has
`technique_instance_id`, the duplication must:

1. Copy the `recipe_technique_instances` row to the new recipe (new instance ID)
2. Copy `recipe_slot_fills` rows for the new instance ID (same colour choices)
3. Materialize technique steps into the duplicate sections (via the same
   `createRecipeTechniqueInstance` logic)

The duplicate starts live-linked to the same technique with the same colour choices.
It can be detached independently. The `sectionIdMap` pattern from the existing
`duplicateRecipe` extends naturally to carry `technique_instance_id` through.

---

## Propagation Edge Cases

### Add step to technique

Re-sync inserts a new `recipe_steps` row per affected instance with a new PK and the
new `technique_step_id`. Progress for existing units starts at zero for the new step.
Existing progress is untouched. No user-visible disruption except the new step appears
in the timeline and Painting Mode.

### Remove step from technique

Re-sync deletes the `recipe_steps` row. `ON DELETE CASCADE` on
`unit_recipe_step_progress.recipe_step_id` removes all progress records for this step
across all units. `painting_percentage` is recomputed on next syncPaintingPercentage
call. Units that had completed this step will see their completion percentage decrease.
This is honest behavior and matches how a recipe owner deleting a regular step works.

UI recommendation: the technique editor should surface "removing this step will affect
N recipes and M units with existing progress" before deletion.

### Reorder steps within technique

Re-sync UPDATEs `order_index` on the corresponding `recipe_steps` rows. PKs unchanged.
Progress unchanged. Timeline re-renders in new order.

### Add slot to technique

New `technique_slots` row inserted. Technique steps that are updated to use the new slot
get re-synced. Steps that previously had no slot now reference the new slot; their
`resolved_paint_id` becomes NULL (unfilled) for all recipe instances until each recipe
owner fills the slot via `SlotFillDialog`. The recipe timeline shows an amber unfilled
slot indicator. Paint availability degrades (more missing paints). No progress impact.

### Remove slot from technique

`ON DELETE SET NULL` on `technique_steps.slot_id` fires: affected steps have
`slot_id = NULL`. `ON DELETE CASCADE` on `recipe_slot_fills.technique_slot_id` removes
all fills that referenced that slot. On re-sync, affected `recipe_steps` rows resolve
`resolved_paint_id = NULL` and `slot_id = NULL` (making them effectively paintless steps).
This is a destructive action; the technique editor must require confirmation and surface
which recipes are affected.

### Rename slot

`UPDATE technique_slots SET name = ...`. All references via `technique_slot_id` FK remain
valid. `slot_name` in the enriched step read query picks up the new name immediately.
Zero structural impact. No re-sync needed.

### Delete technique (safety guard)

Recommended application-layer guard in `deleteTechnique`:

```typescript
const instances = await db.select(
  `SELECT COUNT(*) AS cnt FROM recipe_technique_instances
   WHERE technique_id = $1 AND detached = 0`, [techniqueId]
);
if (instances[0].cnt > 0) {
  throw new TechniqueInUseError(instances[0].cnt);
}
await db.execute("DELETE FROM techniques WHERE id = $1", [techniqueId]);
// CASCADE handles technique_sections, technique_steps, technique_slots
```

The UI shows: "X recipe(s) are still using this technique. Detach from all recipes before
deleting." The `ON DELETE RESTRICT` FK on `recipe_technique_instances.technique_id` acts
as a DB-level guard; the application guard provides a helpful error message.

### Unfilled slot state

Steps with `slot_id IS NOT NULL AND resolved_paint_id IS NULL`:
- Recipe Timeline: show slot name in amber with a "Fill" button
- Painting Mode: show slot name in amber as an "unfilled slot" warning (distinct from the
  green paintless-step rendering); block "Mark Done" is not blocked but a warning banner
  appears at mode entry
- Paint availability: count unfilled slots as "missing" paints for the section

---

## Architectural Patterns

### Pattern 1: Materialized Template Rows

**What:** Technique steps are materialized as `recipe_steps` rows (FK-linked via
`technique_step_id`) rather than resolved virtually at query time. Re-sync keeps these
rows current.
**When to use:** Whenever a template drives concrete entity rows that need stable identity
for progress tracking or FK references.
**Trade-offs:** Slightly more storage; requires explicit re-sync on template edit. Upside:
zero changes to progress system, Painting Mode, apply-to-units, or any downstream consumer.

### Pattern 2: Single db Handle for Resync

**What:** `resyncAllInstancesForTechnique` calls `getDb()` ONCE at the top and passes the
`db` handle down to `resyncTechniqueInstance`. No helper function calls `getDb()` independently.
**When to use:** Always when a sequence of SQL statements must act on consistent data.
tauri-plugin-sql uses a connection pool; calling `getDb()` multiple times may yield
different pool members. Inline all SQL on the single handle.
**Trade-offs:** Less composable than calling helper functions; acceptable for the technique
domain which has dedicated query functions.

### Pattern 3: Slot Resolution at Read Time

**What:** `recipe_steps.paint_id` is always NULL for technique-owned steps. The effective
paint (`resolved_paint_id`) is computed at read time via LEFT JOIN through
`recipe_slot_fills` and `technique_slots`.
**When to use:** Any case where the same structural row must show different data values per
consuming context (here: different colour fills per recipe).
**Trade-offs:** One extra JOIN on every step read query. Benefit: slot fills are a single
source of truth; changing a fill does not require updating the materialized `recipe_steps` row.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing resolved_paint_id in recipe_steps

**What people do:** Write the resolved `paint_id` into `recipe_steps.paint_id` whenever a
slot fill is created or updated.
**Why it's wrong:** Creates two sources of truth. On slot fill change, every `recipe_steps`
row for every step using that slot across every instance must be updated. The JOIN approach
keeps a single source of truth.
**Do this instead:** Enrich at read time via LEFT JOIN in `getStepsForRecipe`.

### Anti-Pattern 2: Nesting transaction helpers in resync

**What people do:** Call `saveRecipeGraph` or `createRecipeSection` from inside
`resyncTechniqueInstance`, letting each helper call `getDb()` independently.
**Why it's wrong:** tauri-plugin-sql uses a connection pool. Explicit `BEGIN/COMMIT`
does not span pool members. Each independent `getDb()` call may return a different
connection. There is no transactional atomicity across helper calls.
**Do this instead:** All SQL in `resyncTechniqueInstance` uses the SAME `db` handle
obtained once at the top of `resyncAllInstancesForTechnique`.

### Anti-Pattern 3: Keying resync identity to order_index

**What people do:** Identify which materialized `recipe_steps` row corresponds to which
`technique_steps` row by matching `order_index` rather than by `technique_step_id` FK.
**Why it's wrong:** This is the same bug migration 028 fixed for regular recipe steps.
Reordering technique steps would silently swap progress between steps.
**Do this instead:** The `technique_step_id` FK column on `recipe_steps` is the immutable
identity link for every resync operation.

### Anti-Pattern 4: Making technique-owned steps editable in the recipe form

**What people do:** Allow the recipe owner to edit step_name, phase, etc. directly on a
live-linked step via the recipe editor.
**Why it's wrong:** The next technique re-sync will silently overwrite those edits with the
technique's canonical values. The user's changes are lost without warning.
**Do this instead:** Render technique-owned sections/steps as read-only in the recipe editor.
Provide a "Detach" escape hatch for users who need to customize further.

### Anti-Pattern 5: Cascade-deleting technique without user confirmation

**What people do:** DELETE FROM techniques with ON DELETE CASCADE, silently removing all
instances and their materialized steps and progress.
**Why it's wrong:** A painter who completed steps in an OSL technique across multiple models
loses all progress silently.
**Do this instead:** Application-layer COUNT check for non-detached instances; surface count
to user; require explicit detach-all or confirmation before delete.

---

## Recommended Build Order

Dependencies cascade top-to-bottom. Each step must be verified before the next begins.

| Step | Scope | Key Risk |
|------|-------|----------|
| 1. Schema (migrations 051–052) | New tables + column additions | FK declaration order (slots before steps) |
| 2. Technique CRUD + graph save | getTechniques, saveTechniqueGraph, hooks, TechniqueLibraryPage, TechniqueSheet (metadata only) | Five-phase diff correctness |
| 3. Slot system | Slot CRUD in TechniqueSheet, technique_slots table | Slot ordering UX |
| 4. Technique step authoring | Section/step editor in TechniqueSheet with slot picker | Step-slot reference integrity |
| 5. Apply flow (instance + slot-fill) | createRecipeTechniqueInstance, SlotFillDialog, SlotFillRow, upsertSlotFill | Materialization correctness; section_id assignment |
| 6. Enriched step read + resolved paint | getStepsForRecipe JOIN extensions, TypeScript type updates, saveRecipeGraph skip live-linked steps | JOIN correctness; paint availability update |
| 7. Live-link re-sync propagation | resyncTechniqueInstance, resyncAllInstancesForTechnique, data-layer tests | Progress stability under add/remove/reorder |
| 8. Integrations: timeline, Painting Mode, availability | Component updates to consume resolved_paint_id; unfilled slot states | Unfilled-slot vs paintless-step distinction |
| 9. Detach + delete safety | detachTechniqueInstance, deleteTechnique guard, confirmation dialogs | Progress survival through detach |
| 10. Recipe duplication update | duplicateRecipe extended to copy instances + slot fills | sectionIdMap extension; instance ID remapping |

---

## Sources

- Direct source inspection:
  - `src/db/queries/recipes.ts` (saveRecipeGraph, duplicateRecipe, syncDerivedStatuses)
  - `src/db/queries/recipeAssignments.ts` (upsertStepProgress, completeStepWithSession, getKanbanProgressByUnitIds)
  - `src/db/queries/recipeSections.ts` (createRecipeSection, updateRecipeSection)
  - `src/lib/recipeDiff.ts` (computeSectionDiff, computeStepDiff, buildSectionIdMap)
  - `src/types/recipe.ts`, `src/types/recipeSection.ts`, `src/types/recipePaint.ts`, `src/types/recipeAssignment.ts`
  - `src/features/recipes/recipeSection.ts` (DraftSection/DraftStep model)
  - `src/features/recipes/recipeSchema.ts` (RECIPE_EFFECTS, PAINTING_PHASES, RECIPE_SURFACES)
- Migration history: `021_applied_recipe_assignments.sql`, `028_step_progress_identity.sql`,
  full migration list `001–050` confirming current schema at migration 050
- `.planning/PROJECT.md` Key Decisions (recipe_step_id as progress key; flat inline SQL
  for transactions; five-phase diff for non-destructive save; ON DELETE CASCADE for
  recipe_steps.section_id; DELETE-all + re-INSERT vs diff patterns)

---

*Architecture research for: v0.7.0 Technique Library — parameterized live-linked painting techniques*
*Researched: 2026-06-19*
