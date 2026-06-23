# Phase 143: Apply Flow & Slot-Fill System — Research

**Researched:** 2026-06-22
**Domain:** Recipe-Technique materialisation, slot resolution, saveRecipeGraph guard
**Confidence:** HIGH — all findings verified from primary codebase sources

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. "Add technique" is a button in the recipe section-editor toolbar, beside the existing "Add section" affordance.
2. Picker surface is a shadcn Dialog (modal) with name search + a card list.
3. Preview shows the selected technique's colour-slot list AND its section/step tree, read-only.
4. Insertion position: insert after the section where invoked (default end of recipe); no separate position dropdown.
5. Slot-fill runs immediately after picking — a single flow: picker → slot-fill → insert.
6. Per-slot paint control reuses the existing recipe-step paint combobox.
7. Unassigned slots are allowed and saved empty — no validation block.
8. An applied technique renders as a recipe section carrying a "from technique X" badge.
9. Steps materialised at apply time: single db handle, flat inline SQL (mirrors saveRecipeGraph).
10. The same technique may be applied twice — each apply is a distinct instance with an independent slot map.
11. `saveRecipeGraph` guard: skip UPDATE and DELETE of any `recipe_steps` row where `technique_step_id IS NOT NULL`.
12. "Edit colours" affordance in RecipeDetailSheet reuses the slot-fill dialog, pre-populated.
13. Technique-owned steps render read-only in the detail view — swatch resolves via `effectivePaintId()`.
14. The "from technique X" badge links to the technique in the library tab.

### Claude's Discretion

- Exact query-module layout (e.g. `recipeTechniqueInstances.ts`, `recipeTechniqueSlotMaps.ts`) and hook files under `src/hooks/`.
- Precise slot-fill dialog component composition and empty-state copy.
- Test placement under `tests/` mirroring `src/features/recipes`.
- Whether the apply mutation lives in a new query module or extends `recipes.ts`; pick whichever keeps `saveRecipeGraph` cohesive.

### Deferred Ideas (OUT OF SCOPE)

- Live-link re-sync when a technique's structure changes (`resyncTechniqueInstance`) — Phase 144.
- Painting Mode / paint-availability / apply-to-units / SectionedTimeline / Log Session integration — Phase 145.
- Detach (break live link) + persistent section badges/safety rails — Phase 146.
- TQOL items (per-instance timestamp, slot suggestions, bulk reassign, soft-override) — v0.7.0 v2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SLOT-03 | Each recipe application of a technique carries its own slot→paint mapping — same technique, different colours in different recipes | `recipe_technique_slot_maps.UNIQUE(instance_id, slot_id)` enforces per-instance isolation; confirmed in migration 051 |
| SLOT-04 | A single recipe can contain multiple instances of the same technique, each with an independent slot map | `recipe_technique_instances` has no unique constraint on `(recipe_id, technique_id)` — duplicates allowed; confirmed in migration 051 |
| SLOT-05 | An unassigned (empty) slot is valid — treated like a paintless step | `recipe_technique_slot_maps.paint_id` is nullable with no NOT NULL constraint; confirmed in migration 051 |
| SLOT-06 | The slot-fill UI shows each slot's role hint and the currently assigned paint swatch | TechniqueColourSlot.role_hint exists; `SlotFillRow` maps slot → swatch + PaintCombobox |
| APPLY-01 | While editing a recipe, the user can add a technique from the recipe section editor | Toolbar button in RecipeSectionList → opens TechniquePickerDialog |
| APPLY-02 | Technique picker dialog: browse/search library, preview slots and steps, choose insertion position | TechniquePickerDialog uses getTechniquesWithCounts() + useTechniqueColourSlots + useTechniqueSections/Steps |
| APPLY-03 | Slot-fill dialog: assign paint to each slot via existing combobox; empty slots allowed | SlotFillDialog + PaintCombobox (reused as-is); no validation gate |
| APPLY-04 | Applied technique appears as a recipe section with "from technique X" badge | recipe_sections.technique_instance_id FK; TechniqueSectionBadge rendered in RecipeSectionCard header |
| APPLY-05 | User can view/change slot colours from recipe detail view | "Edit colours" button in RecipeDetailSheet technique-sourced sections; re-opens SlotFillDialog pre-populated |
</phase_requirements>

---

## Summary

Phase 143 delivers the apply-to-recipe half of the Technique Library. The central engineering challenge is that every action must follow three non-negotiable constraints: (1) the same flat inline SQL / auto-commit WAL pattern as `saveRecipeGraph`; (2) `effectivePaintId()` as the single resolution spine for technique-owned steps; (3) the `saveRecipeGraph` skip-guard that prevents the recipe editor from ever overwriting live-linked `recipe_steps` rows.

The schema foundation is complete in migration 051. All six tables used by this phase already exist: `recipe_technique_instances`, `recipe_technique_slot_maps`, `technique_colour_slots`, `technique_steps`, and the FK columns `recipe_sections.technique_instance_id` / `recipe_steps.technique_step_id`. No new migration (052) is needed unless performance profiling reveals a missing index — see the Index Gap Analysis section.

The most important code discovery is that `saveRecipeGraph` (lines 436–508 of `src/db/queries/recipes.ts`) has no guard against technique-owned steps today. The guard must be inserted in the DELETE pass (around line 438) and the UPDATE pass (around line 449–479) before any UI can be trusted to edit a recipe containing a technique instance. The Phase 141/142 test harness (`tests/data-layer/db-helpers.ts`) with its `createDbBridge()` adapter makes it straightforward to write data-layer integration tests against the real in-memory schema.

**Primary recommendation:** Implement the apply mutation as a new query module `src/db/queries/recipeTechniqueInstances.ts` (keeps `saveRecipeGraph` cohesive as a diff-based editor function, while the apply mutation is a pure insert-only flow). Add the `saveRecipeGraph` guard in `recipes.ts`. Wire `effectivePaintId()` in `SectionedTimeline` and `RecipeDetailSheet` using a per-recipe `SlotResolutionMap` built from a new `getSlotResolutionMap(recipeId)` query.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Technique browsing / search | Frontend (React) | DB query layer | Reads `techniques` + counts; no backend transform needed |
| Apply mutation (INSERT instance + sections + steps + slot maps) | DB query layer | React Query mutation | Pure SQL INSERT sequence; UI only triggers and invalidates |
| Slot-fill form state | Frontend (React Hook Form) | — | Ephemeral per-dialog state; not persisted until "Apply technique" |
| `effectivePaintId()` resolution | `src/lib/` (pure function) | Consumer components | Zero-side-effect resolver; all consumers call it, no tier owns it |
| SlotResolutionMap construction | DB query layer (new query fn) | React Query hook | Requires a JOIN across `recipe_technique_slot_maps` and `technique_steps`; runs once per recipe open |
| `saveRecipeGraph` skip-guard | DB query layer (guard in `recipes.ts`) | — | Lives adjacent to the UPDATE/DELETE loops it protects |
| Technique-sourced section badge | UI component | RecipeSectionCard / RecipeDetailSheet | Display-only (editor) / interactive link (detail view) |
| "Edit colours" affordance | Frontend (RecipeDetailSheet) | SlotFillDialog + slot-map mutation | Opens pre-populated dialog; saves via `updateSlotMap` mutation |

---

## Standard Stack

No new dependencies. All patterns reuse existing codebase infrastructure.

### Core (unchanged, reused)
| Library | Version | Purpose | Role in this phase |
|---------|---------|---------|-------------------|
| tauri-plugin-sql | existing | SQLite via `getDb()` | All DB writes in apply mutation + guard |
| React Query | existing | Server state | New hooks: `useTechniqueInstances`, `useSlotResolutionMap`, `useApplyTechnique`, `useUpdateSlotMap` |
| React Hook Form + Zod | existing | Form state | Slot-fill dialog form |
| shadcn/ui | existing | UI primitives | Dialog, Badge, Button, Input, ScrollArea, Command |
| Lucide React | existing | Icons | BookOpen (technique badge), Loader2 (saving state) |

### Installation
```bash
# No new packages — zero install step for this phase
```

---

## Package Legitimacy Audit

No external packages are installed in this phase. All new code is hand-authored following established patterns.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Recipe Editor (RecipeFormSheet)
  └─ RecipeSectionList
       └─ RecipeSectionCard (each section)
            └─ [+ Add technique button] ──────────────────┐
                                                           ▼
                                            TechniquePickerDialog
                                             (browse / search / preview)
                                                           │ "Next: Fill slots"
                                                           ▼
                                              SlotFillDialog
                                               (one SlotFillRow per slot)
                                               (PaintCombobox reused)
                                                           │ "Apply technique"
                                                           ▼
                                            applyTechnique() [DB query fn]
                                              INSERT recipe_technique_instances
                                              INSERT recipe_sections (technique_instance_id=)
                                              INSERT recipe_steps × N (technique_step_id=, paint_id=NULL)
                                              INSERT recipe_technique_slot_maps × slots
                                                           │
                                              invalidate RECIPE_SECTIONS_KEY
                                              invalidate RECIPE_PAINTS_KEY
                                              invalidate TECHNIQUE_INSTANCES_KEY

Recipe Detail View (RecipeDetailSheet)
  └─ SectionedTimeline
       └─ for each section with technique_instance_id:
            TechniqueSectionBadge ─────────────── navigate to library tab
            "Edit colours" button ──────────────┐
                                                ▼
                                   SlotFillDialog (pre-populated)
                                                │ "Apply technique" (update mode)
                                                ▼
                                   updateSlotMap() — UPSERT recipe_technique_slot_maps
                                                │
                                   invalidate SLOT_RESOLUTION_MAP_KEY(recipeId)
                                   invalidate RECIPE_PAINTS_KEY(recipeId)

effectivePaintId() resolution spine:
  SlotResolutionMap = Map<technique_step_id, paint_id | null>
  Built once per recipe open from:
    SELECT ts.id AS technique_step_id, sm.paint_id
    FROM recipe_steps rs
    JOIN technique_steps ts ON ts.id = rs.technique_step_id
    LEFT JOIN recipe_technique_slot_maps sm
           ON sm.instance_id = rs.section_id_instance
           AND sm.slot_id = ts.colour_slot_id
    WHERE rs.recipe_id = $1
```

### Recommended Project Structure

```
src/
  db/queries/
    recipes.ts                         # + saveRecipeGraph guard (edit existing)
    recipeTechniqueInstances.ts        # NEW: applyTechnique(), getInstances()
    recipeTechniqueSlotMaps.ts         # NEW: updateSlotMap(), getSlotResolutionMap()
  hooks/
    useTechniqueInstances.ts           # NEW: INSTANCES_KEY + useApplyTechnique
    useSlotResolutionMap.ts            # NEW: SLOT_MAP_KEY(recipeId) + useSlotResolutionMap
  features/recipes/
    TechniquePickerDialog.tsx          # NEW
    SlotFillDialog.tsx                 # NEW
    SlotFillRow.tsx                    # NEW
    TechniqueSectionBadge.tsx          # NEW
    TechniquePickerCard.tsx            # NEW
    RecipeSectionCard.tsx              # EXTENDED: + "Add technique" button + badge render
    RecipeDetailSheet.tsx              # EXTENDED: + "Edit colours" + read-only steps
    SectionedTimeline.tsx              # EXTENDED: + effectivePaintId() wiring
  lib/
    effectivePaintId.ts                # EXISTING — no changes needed
tests/
  data-layer/
    apply-technique.test.ts            # NEW: data-layer integration tests (db-bridge)
    saveRecipeGraph-guard.test.ts      # NEW: guard unit tests (mock pattern)
```

### Pattern 1: Apply Mutation (flat inline SQL, auto-commit)

The apply mutation mirrors `saveRecipeGraph`'s single-db-handle shape exactly. Verified from `src/db/queries/recipes.ts` lines 236–242 (comment block) and `src/db/queries/techniques.ts` lines 312–330.

```typescript
// Source: src/db/queries/recipes.ts saveRecipeGraph comment (lines 216–234)
// + src/db/queries/techniques.ts duplicateTechnique (lines 207–215)
//
// Pattern: single db handle, flat inline SQL, auto-commit per statement.
// NO BEGIN/COMMIT/ROLLBACK — tauri-plugin-sql uses sqlx::Pool<Sqlite>;
// each db.execute() may run on a DIFFERENT connection from the pool.
// WAL mode makes each committed write immediately visible to all connections.

export async function applyTechnique(
  recipeId: number,
  techniqueId: number,
  insertAfterSectionIndex: number,   // order_index for the new section
  slotFills: Map<number, number | null>, // colour_slot_id -> paint_id
): Promise<{ instanceId: number; sectionId: number }> {
  const db = await getDb();

  // 1. INSERT recipe_technique_instances
  const instResult = await db.execute(
    `INSERT INTO recipe_technique_instances (recipe_id, technique_id)
     VALUES ($1, $2)`,
    [recipeId, techniqueId],
  );
  const instanceId = instResult.lastInsertId ?? 0;

  // 2. Read technique sections + steps (source of truth)
  const techSections = await db.select<TechniqueSection[]>(
    `SELECT * FROM technique_sections WHERE technique_id = $1 ORDER BY order_index ASC`,
    [techniqueId],
  );

  // 3. For each technique_section → INSERT recipe_sections + recipe_steps
  for (let si = 0; si < techSections.length; si++) {
    const ts = techSections[si];
    const sectionResult = await db.execute(
      `INSERT INTO recipe_sections
       (recipe_id, name, surface, optional, order_index, notes,
        technique_instance_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        recipeId, ts.name, ts.surface, ts.optional,
        insertAfterSectionIndex + si,   // positional
        ts.notes ?? null,
        instanceId,
      ],
    );
    const newSectionId = sectionResult.lastInsertId ?? 0;

    // 3a. Read technique_steps for this technique_section
    const techSteps = await db.select<TechniqueStep[]>(
      `SELECT * FROM technique_steps WHERE technique_section_id = $1
       ORDER BY order_index ASC`,
      [ts.id],
    );

    // 3b. INSERT materialised recipe_steps (paint_id = NULL, technique_step_id set)
    for (let stepIdx = 0; stepIdx < techSteps.length; stepIdx++) {
      const step = techSteps[stepIdx];
      await db.execute(
        `INSERT INTO recipe_steps
         (recipe_id, section_id, paint_id, step_name, order_index,
          notes, painting_phase, tool, technique, dilution,
          time_estimate_minutes, alt_paint_id, step_photo_path,
          technique_step_id)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, $11)`,
        [
          recipeId, newSectionId, step.step_name, stepIdx,
          step.notes ?? null, step.painting_phase ?? null,
          step.tool ?? null, step.technique ?? null,
          step.dilution ?? null, step.time_estimate_minutes ?? null,
          step.id,   // technique_step_id FK
        ],
      );
    }
  }

  // 4. INSERT recipe_technique_slot_maps for all filled slots
  //    (UPSERT via INSERT OR REPLACE to handle re-apply edge cases)
  for (const [slotId, paintId] of slotFills.entries()) {
    await db.execute(
      `INSERT OR REPLACE INTO recipe_technique_slot_maps
       (instance_id, slot_id, paint_id)
       VALUES ($1, $2, $3)`,
      [instanceId, slotId, paintId],
    );
  }

  return { instanceId, sectionId: /* first section */ 0 };
}
```

**Critical note:** `INSERT OR REPLACE` is safe here because `UNIQUE(instance_id, slot_id)` exists in migration 051. It avoids a separate SELECT-then-UPDATE path while still handling the edge case of re-applying to a recipe that already had partial slot data.

### Pattern 2: saveRecipeGraph Guard

The guard must be inserted in two places in the EDIT path. Verified from `src/db/queries/recipes.ts` lines 436–508.

```typescript
// Source: src/db/queries/recipes.ts (edit path — to be modified)

// Phase 5 — compute step diff
const { toDelete: stepsToDelete } = computeStepDiff(sections, existingSteps);

// ---- NEW GUARD (SC#5): skip DELETE of technique-owned steps ----
// existingSteps carrying technique_step_id IS NOT NULL must never be
// deleted by the recipe editor — they are owned by the technique instance.
for (const id of stepsToDelete) {
  const step = existingSteps.find((s) => s.id === id);
  if (step?.technique_step_id != null) continue;   // GUARD: skip live-linked
  await db.execute("DELETE FROM recipe_steps WHERE id = $1", [id]);
}

// UPDATE existing steps — skip technique-owned steps
for (const sec of sections) {
  const indexedSteps = computeOrderIndex(sec.steps);
  for (const s of indexedSteps) {
    if (s.dbId !== null) {
      // ---- NEW GUARD: skip UPDATE of technique-owned steps ----
      if (s.technique_step_id != null) continue;   // GUARD: never overwrite
      await db.execute(`UPDATE recipe_steps SET ...`, [...]);
    } else {
      await db.execute(`INSERT INTO recipe_steps ...`, [...]);
    }
  }
}
```

**Key insight:** The DELETE guard needs to look up `technique_step_id` on the *existing* DB step (from `existingSteps[]`), not the draft step. The UPDATE guard looks at the *draft* step's `technique_step_id` field — which must be populated when `buildDraftSections` converts DB rows to draft state.

### Pattern 3: buildDraftSections Must Carry technique_step_id

`src/features/recipes/recipeSection.ts` `buildDraftSections()` (lines 51–90) currently discards `technique_step_id` when building `DraftStep` objects. It must carry this field forward so the UPDATE guard can inspect it.

```typescript
// Source: src/features/recipes/recipeSection.ts buildDraftSections (lines 58–74)
// MODIFICATION REQUIRED: add technique_step_id to the DraftStep mapping

.map((st): DraftStep => ({
  localId: crypto.randomUUID(),
  dbId: st.id,
  step_name: st.step_name,
  paint_id: st.paint_id,
  // ...
  technique_step_id: st.technique_step_id ?? null,   // ADD THIS
}))
```

`DraftStep` already declares `technique_step_id?: number | null` (verified: `src/types/recipe.ts` line 55). The field just needs to be forwarded in `buildDraftSections`.

### Pattern 4: SlotResolutionMap Construction

The `effectivePaintId()` function (`src/lib/effectivePaintId.ts` lines 48–61) requires a `SlotResolutionMap` keyed on `technique_step_id`. Building this map requires a JOIN:

```typescript
// New query in src/db/queries/recipeTechniqueSlotMaps.ts
// Joins recipe_steps → technique_steps → recipe_technique_slot_maps

export async function getSlotResolutionMap(
  recipeId: number,
): Promise<Map<number, number | null>> {
  const db = await getDb();
  const rows = await db.select<{ technique_step_id: number; paint_id: number | null }[]>(
    `SELECT rs.technique_step_id, sm.paint_id
     FROM recipe_steps rs
     LEFT JOIN technique_steps ts ON ts.id = rs.technique_step_id
     LEFT JOIN recipe_technique_instances rti ON rti.id = (
       SELECT technique_instance_id FROM recipe_sections
       WHERE id = rs.section_id LIMIT 1
     )
     LEFT JOIN recipe_technique_slot_maps sm
            ON sm.instance_id = rti.id
           AND sm.slot_id = ts.colour_slot_id
     WHERE rs.recipe_id = $1
       AND rs.technique_step_id IS NOT NULL`,
    [recipeId],
  );
  const map = new Map<number, number | null>();
  for (const row of rows) {
    map.set(row.technique_step_id, row.paint_id);
  }
  return map;
}
```

**Simpler alternative JOIN path** (avoids the correlated sub-query):

```sql
SELECT rs.technique_step_id, sm.paint_id
FROM recipe_steps rs
JOIN recipe_sections rsec ON rsec.id = rs.section_id
JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
JOIN technique_steps ts ON ts.id = rs.technique_step_id
LEFT JOIN recipe_technique_slot_maps sm
       ON sm.instance_id = rti.id
      AND sm.slot_id = ts.colour_slot_id
WHERE rs.recipe_id = $1
  AND rs.technique_step_id IS NOT NULL
```

This is the cleaner path — use the INNER JOINs through `rsec → rti → ts`, LEFT JOIN to `sm` for the slot (may be NULL if slot unfilled). No correlated subquery.

### Pattern 5: updateSlotMap (Edit Colours from Detail View)

```typescript
// New mutation in src/db/queries/recipeTechniqueSlotMaps.ts
export async function updateSlotMap(
  instanceId: number,
  slotFills: Map<number, number | null>,  // slot_id -> paint_id | null
): Promise<void> {
  const db = await getDb();
  for (const [slotId, paintId] of slotFills.entries()) {
    await db.execute(
      `INSERT OR REPLACE INTO recipe_technique_slot_maps
       (instance_id, slot_id, paint_id) VALUES ($1, $2, $3)`,
      [instanceId, slotId, paintId],
    );
  }
}
```

### Anti-Patterns to Avoid

- **Passing `technique_step_id` steps through the recipe editor's DnD system:** Technique-owned sections must not be reorderable via DnD. The `RecipeSectionCard` must not render a drag handle for sections where `technique_instance_id IS NOT NULL`. If DnD is enabled on such sections, the editor will attempt to UPDATE their steps via `saveRecipeGraph` with new `order_index` values — but the guard skips those UPDATEs, causing a silent reorder failure.
- **Reading `step.paint_id` directly in `SectionedTimeline`:** Currently, `SectionedTimeline`'s `sectionAvailability` useMemo (lines 41–54) reads `step.paint_id` directly. For Phase 145 integration this needs `effectivePaintId()`, but even in Phase 143 the detail view's step swatch render must use `effectivePaintId()` — otherwise technique steps always show "no paint" even when slots are filled.
- **Omitting slot entries for unassigned slots:** Don't only write `recipe_technique_slot_maps` rows for filled slots. Writing a row with `paint_id = NULL` for explicitly unassigned slots is optional (the LEFT JOIN in the resolution query returns NULL for missing rows anyway), but it is cleaner for "Edit colours" pre-population, which should show the existing combobox selection. Pre-populate from existing rows + fall back to null for missing rows.
- **Inserting recipe_steps with `paint_id` copied from technique_steps:** `technique_steps` has no `paint_id` column (migration 051). All materialised `recipe_steps` from a technique must have `paint_id = NULL`. The real paint resolves via `effectivePaintId()`. Never attempt to copy a paint from the technique step.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Paint picker in slot-fill row | Custom combobox | `PaintCombobox` (existing, `src/features/recipes/PaintCombobox.tsx`) | Already handles owned/missing indicator, search, create-new flow |
| Technique card in picker | New design from scratch | Mirror `TechniqueCard` (existing, `src/features/techniques/TechniqueCard.tsx`) | Condensed version of the same data — consistent visual language |
| Schema for slot-fill form | Ad-hoc validation | `z.record(z.number().nullable())` or a `z.array(SlotFillRowSchema)` — minimal Zod | Matches existing pattern in `techniqueSchema.ts` / `recipeSchema.ts` |
| Dialog backdrop / focus-trap | Hand-rolled portal | shadcn `Dialog` (existing, in shadcn registry) | Already handles accessibility, focus management, escape key |
| SQL transaction | `BEGIN` / `COMMIT` | Auto-commit + WAL (existing pattern) | `tauri-plugin-sql` uses a connection pool — explicit transactions are broken across pool connections |

---

## Runtime State Inventory

Not applicable — this is a greenfield feature adding new rows to existing tables. No stored data exists for `recipe_technique_instances` or `recipe_technique_slot_maps` yet (they were created in migration 051 but no apply flow has existed until now). No rename/refactor involved.

---

## Common Pitfalls

### Pitfall 1: The saveRecipeGraph Guard Must Protect the DELETE Pass Too

**What goes wrong:** Developer adds the guard only to the UPDATE loop (the obvious place), but forgets that `computeStepDiff` marks technique-owned steps as `toDelete` if they do not appear in the draft section's `steps[]` array — which they will not, because `buildDraftSections` skips steps not in the `sections[]` result when `existingSections` is filtered to non-technique sections.

**Why it happens:** `saveRecipeGraph` receives `sections` (the draft form state) and `existingSteps` (all DB steps). Technique-owned steps are in `existingSteps` but are NOT in any draft section (they were excluded during load). So `computeStepDiff` classifies them as `toDelete` — they are in `existingSteps` but not in any `draftSections[].steps[]`.

**How to avoid:** Guard the DELETE loop first:
```typescript
for (const id of stepsToDelete) {
  const step = existingSteps.find((s) => s.id === id);
  if (step?.technique_step_id != null) continue;  // GUARD
  await db.execute("DELETE FROM recipe_steps WHERE id = $1", [id]);
}
```
And guard the UPDATE loop:
```typescript
if (s.dbId !== null) {
  if (s.technique_step_id != null) continue;  // GUARD
  // ... UPDATE
}
```

**Warning signs:** Recipe edit saves without error but technique-owned steps disappear from the detail view after saving.

### Pitfall 2: buildDraftSections Loads Technique-Owned Steps Into the Form

**What goes wrong:** `buildDraftSections` maps ALL `recipe_steps` into draft state. If technique-owned steps are included in draft sections, the recipe editor will try to render them as editable `RecipeStepRow` components. Even with the `saveRecipeGraph` guard, the user sees confusing read/write mixing.

**Why it happens:** `buildDraftSections` groups steps by `section_id` without filtering on `technique_step_id`. A technique-owned section would include its technique steps in `section.steps[]`.

**How to avoid:** When building draft sections for the recipe editor, filter out steps with `technique_step_id != null`:
```typescript
const sectionSteps = steps
  .filter((st) => st.section_id === s.id && st.technique_step_id == null)
  ...
```
Technique-owned sections are displayed as locked/read-only in the editor (no drag handle, no delete, name input disabled). Their steps are shown read-only via a separate render path, not via `RecipeStepRow`.

**Warning signs:** Technique steps appear editable in the recipe form; saving the form appears to succeed but the detail view shows empty steps.

### Pitfall 3: SlotResolutionMap Must Be Keyed by technique_step_id, Not recipe_step_id

**What goes wrong:** Developer builds the map keyed by `recipe_step_id` because that is the primary key visible in the component. `effectivePaintId()` expects `technique_step_id` as the key.

**Why it happens:** The function signature is `effectivePaintId(step, slotMap)` where `step.technique_step_id` is used as the lookup key (`src/lib/effectivePaintId.ts` line 53: `slotMap.get(step.technique_step_id)`).

**How to avoid:** The query building the map must SELECT `rs.technique_step_id` and use it as the Map key — not `rs.id` (the recipe_step_id).

**Warning signs:** All technique step swatches show as unresolved/null despite slots being filled.

### Pitfall 4: Applying a Technique Twice Requires Independent Slot Maps

**What goes wrong:** Developer re-uses the same `recipe_technique_instances` row when the same technique is applied a second time to the same recipe. The `UNIQUE(instance_id, slot_id)` constraint is per-instance, so both instances would share a slot map.

**Why it happens:** The apply mutation checks if an instance already exists and reuses it rather than always creating a new one.

**How to avoid:** Always `INSERT` a fresh `recipe_technique_instances` row — never SELECT-OR-INSERT. The schema intentionally has no UNIQUE constraint on `(recipe_id, technique_id)` to support multiple instances (migration 051 verified).

**Warning signs:** Changing slot colours for the second application of a technique inadvertently changes the first application's colours.

### Pitfall 5: technique_steps Has No paint_id Column

**What goes wrong:** When reading technique steps to materialise them as recipe_steps, code copies `ts.paint_id` into the INSERT. The column does not exist on `technique_steps` (migration 051). The SELECT either fails or silently returns `undefined`.

**Why it happens:** `RecipeStep` has `paint_id`; `TechniqueStep` does not. Easy to confuse.

**How to avoid:** Always insert `paint_id = NULL` for materialised technique steps. The type `TechniqueStep` (verified in `src/types/technique.ts` lines 51–65) confirms: no `paint_id`, no `alt_paint_id`, no `step_photo_path`.

**Warning signs:** TypeScript error on `step.paint_id` when iterating `TechniqueStep[]`; or silent `undefined` stored as paint_id.

### Pitfall 6: SectionedTimeline Uses step.paint_id Directly for Availability

**What goes wrong:** The existing `sectionAvailability` useMemo in `SectionedTimeline` (lines 41–54) reads `step.paint_id` directly. After Phase 143, technique-owned steps have `paint_id = NULL`, so they would never count as "owned" or "missing" even when their slots are filled.

**Why it happens:** `SectionedTimeline` was written before the technique library existed.

**How to avoid:** In Phase 143, the `SectionedTimeline` render of technique-sourced sections should use `effectivePaintId(step, slotMap)` for swatch resolution. The full availability count fix is Phase 145 scope (INTG-02), but the swatch display in the detail view is in scope for Phase 143. Pass the `SlotResolutionMap` down to the section that renders technique-owned steps.

**Warning signs:** Technique step swatches show empty (no paint swatch) even when slots are filled; availability counts show 0 owned for technique sections.

---

## Code Examples

### Verified: migration 051 schema (all tables this phase writes to)

```sql
-- Source: src-tauri/migrations/051_technique_library_foundation.sql lines 56–79
-- recipe_technique_instances — one row per application of a technique into a recipe
CREATE TABLE IF NOT EXISTS recipe_technique_instances (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id     INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    detached      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
-- NOTE: No UNIQUE(recipe_id, technique_id) — same technique can be applied twice

-- recipe_technique_slot_maps — per-instance slot->paint mapping
CREATE TABLE IF NOT EXISTS recipe_technique_slot_maps (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id   INTEGER NOT NULL REFERENCES recipe_technique_instances(id) ON DELETE CASCADE,
    slot_id       INTEGER NOT NULL REFERENCES technique_colour_slots(id) ON DELETE CASCADE,
    paint_id      INTEGER REFERENCES paints(id) ON DELETE RESTRICT,
    UNIQUE(instance_id, slot_id)
    -- paint_id is NULLABLE — unassigned slot is valid (SLOT-05)
);

-- FK columns added to recipe graph
ALTER TABLE recipe_sections ADD COLUMN technique_instance_id INTEGER
    REFERENCES recipe_technique_instances(id) ON DELETE SET NULL;
ALTER TABLE recipe_steps ADD COLUMN technique_step_id INTEGER
    REFERENCES technique_steps(id) ON DELETE SET NULL;
```

### Verified: effectivePaintId resolver signature

```typescript
// Source: src/lib/effectivePaintId.ts lines 34–61
export type SlotResolutionMap = ReadonlyMap<number, number | null>;
// key: technique_step_id; value: resolved paint_id for that step in THIS instance

export function effectivePaintId(
  step: PaintResolvableStep,   // {paint_id, technique_step_id?}
  slotMap: SlotResolutionMap,
): number | null {
  if (step.technique_step_id != null) {
    return slotMap.get(step.technique_step_id) ?? null;
  }
  return step.paint_id;        // FND-04 fallback for plain steps
}
```

### Verified: saveRecipeGraph update/delete loop positions (edit path)

```typescript
// Source: src/db/queries/recipes.ts lines 436–508
// DELETE pass — guard goes here (before the loop body):
for (const id of stepsToDelete) {
  // ADD: const step = existingSteps.find(s => s.id === id);
  // ADD: if (step?.technique_step_id != null) continue;
  await db.execute("DELETE FROM recipe_steps WHERE id = $1", [id]);
}

// UPDATE pass — guard goes on s.dbId !== null branch:
if (s.dbId !== null) {
  // ADD: if (s.technique_step_id != null) continue;
  await db.execute(`UPDATE recipe_steps SET ...`);
}
```

### Verified: DraftStep type already has technique_step_id

```typescript
// Source: src/types/recipe.ts lines 41–56
export interface DraftStep {
  localId: string;
  dbId: number | null;
  step_name: string;
  paint_id: number | null;
  // ... other fields ...
  technique_step_id?: number | null;   // v0.7.0 technique materialisation (Phase 141)
}
```

### Verified: PaintCombobox props (for reuse in SlotFillRow)

```typescript
// Source: src/features/recipes/PaintCombobox.tsx lines 16–18
export interface PaintComboboxProps {
  value: number | null;
  onChange: (paintId: number | null) => void;
  onCreateNew?: () => void;   // optional — omit in SlotFillRow (no create-new in slot context)
}
```

### Verified: getTechniquesWithCounts query (for TechniquePickerDialog list)

```typescript
// Source: src/db/queries/techniques.ts lines 112–139
// Returns techniques + slot_count + step_count + usage_count in one JOIN.
// technique_steps has NO technique_id column — step count derives through technique_sections.
export async function getTechniquesWithCounts(): Promise<TechniqueWithCounts[]>
```

### Verified: existing Query key pattern + invalidation contract

```typescript
// Source: src/hooks/useRecipeSections.ts lines 19, 60–72
// On technique-sourced section changes, these keys must be invalidated:
export const RECIPE_SECTIONS_KEY = (recipeId: number) => ["recipe-sections", recipeId] as const;
// + RECIPE_PAINTS_KEY(recipeId) from useRecipePaints
// + STEP_COUNTS_KEY
// + RECIPE_AVAILABILITY_KEY
// + RECIPE_SWATCH_KEY
```

---

## Index Gap Analysis (Migration 052 Decision)

No new migration is required for correctness. However, two queries created in this phase may benefit from indexes:

| Query | Without index | Recommended index |
|-------|--------------|-------------------|
| `SELECT ... FROM recipe_technique_slot_maps WHERE instance_id = $1` | Full table scan (small table — acceptable now) | `CREATE INDEX IF NOT EXISTS idx_rtsm_instance ON recipe_technique_slot_maps(instance_id)` |
| `SELECT ... FROM recipe_steps WHERE technique_step_id IS NOT NULL AND recipe_id = $1` | Uses existing `recipe_id` index if one exists | Composite: `CREATE INDEX IF NOT EXISTS idx_rs_technique_step ON recipe_steps(recipe_id, technique_step_id) WHERE technique_step_id IS NOT NULL` |
| `SELECT ... FROM recipe_sections WHERE technique_instance_id IS NOT NULL AND recipe_id = $1` | Full scan on recipe_sections | `CREATE INDEX IF NOT EXISTS idx_rsec_instance ON recipe_sections(technique_instance_id)` |

**Decision for Phase 143:** Skip migration 052. Tables are small (personal app with few hundred rows at most). Add a note for Phase 145 to revisit if performance measurement shows slowdown.

[ASSUMED] — index necessity judgment based on expected data volume for a personal hobby app. Could be wrong if a user has thousands of recipes.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recipe steps always have `paint_id` | Technique-owned steps have `paint_id = NULL`; resolved via `effectivePaintId()` | Phase 141 (migration 051) | All paint consumers must call `effectivePaintId()` — direct `step.paint_id` reads are wrong for technique steps |
| All recipe sections are plain editable content | Sections may have `technique_instance_id IS NOT NULL` (live-linked) | Phase 141 (migration 051) | Editor must skip UPDATE/DELETE of their steps; detail view must show badge + read-only |
| No `saveRecipeGraph` skip-guard needed | Guard required for UPDATE + DELETE passes in edit path | Phase 143 (this phase) | Core safety invariant of the entire Technique Library milestone |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test -- tests/data-layer/apply-technique.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APPLY-01/02/03/04 | `applyTechnique()` inserts instance + sections + steps + slot maps correctly | data-layer integration | `pnpm test -- tests/data-layer/apply-technique.test.ts` | No — Wave 0 |
| SLOT-03 | Two applications of same technique have independent slot maps | data-layer integration | `pnpm test -- tests/data-layer/apply-technique.test.ts` | No — Wave 0 |
| SLOT-04 | Same technique applied twice in same recipe yields two distinct instances | data-layer integration | `pnpm test -- tests/data-layer/apply-technique.test.ts` | No — Wave 0 |
| SLOT-05 | Unassigned slot (NULL paint_id) is stored and resolves to null via effectivePaintId() | unit test (pure) | `pnpm test -- tests/data-layer/apply-technique.test.ts` | No — Wave 0 |
| guard | saveRecipeGraph never DELETE or UPDATE technique_step_id-bearing steps | unit (mock) | `pnpm test -- tests/data-layer/saveRecipeGraph-guard.test.ts` | No — Wave 0 |
| FND-04 | effectivePaintId() correct for filled, unfilled, and plain steps | unit (pure) | `pnpm test -- tests/lib/effectivePaintId.test.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/data-layer/apply-technique.test.ts tests/data-layer/saveRecipeGraph-guard.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/data-layer/apply-technique.test.ts` — covers APPLY-01..05, SLOT-03/04/05 using `createDbBridge` (same harness as `technique-progress-identity.test.ts`)
- [ ] `tests/data-layer/saveRecipeGraph-guard.test.ts` — covers the guard (mocks `getDb()` same as `saveRecipeGraph.test.ts`)
- [ ] `tests/lib/effectivePaintId.test.ts` — pure unit tests for `effectivePaintId()` with filled/unfilled/plain step cases

---

## Security Domain

No authentication, no user-facing input that reaches the network, no cryptographic operations. All SQL uses `$1, $2` parameterized queries (verified as the codebase-wide standard). No ASVS categories apply beyond:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | Yes (slot form values) | React Hook Form + Zod schema on SlotFillDialog; paint_id validated as `number | null` |
| V4 Access Control | No | Local desktop app, single user |
| V2 Authentication | No | No auth layer |
| V6 Cryptography | No | No secrets in this flow |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| better-sqlite3 | data-layer tests (`createHobbyforgeDb`) | Yes (verified via existing test suite) | existing | — |
| pnpm test | Vitest runner | Yes | existing | — |

No missing dependencies.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Migration 052 not needed — table sizes are small enough that full scans are acceptable | Index Gap Analysis | If recipe count is high, `getSlotResolutionMap` JOIN may be slow; mitigation: add indexes in Phase 145 |
| A2 | `INSERT OR REPLACE` on `recipe_technique_slot_maps` is safe for both apply and update-slot-map operations | Pattern 1 + Pattern 5 | If REPLACE deletes the old row and a trigger existed on it, data could be lost — but migration 051 has no triggers |
| A3 | `buildDraftSections` should filter out technique-owned steps from the editor's draft state | Pitfall 2 | If filtered differently, editor shows confusing locked rows; alternative is to include them but disable all controls |

---

## Open Questions

1. **How should technique-sourced sections appear in the recipe editor's DnD sort list?**
   - What we know: `RecipeSectionList` wraps sections in `SortableContext` and `useSortable`. If a technique-sourced section is included, DnD will try to reorder it, which is fine at the section level (order_index is on `recipe_sections`, not protected by the guard). Only step-level DnD within a technique section is dangerous.
   - What's unclear: Should the user be allowed to drag the technique-sourced *section* to a new position (fine — the guard only protects steps), or should sections be locked too? CONTEXT.md is silent on this.
   - Recommendation: Allow section-level reorder (it only updates `recipe_sections.order_index`, which is safe). Disable step-level DnD within technique-sourced sections. Render technique-sourced section steps as non-draggable rows.

2. **Pre-populating SlotFillDialog for "Edit colours"**
   - What we know: "Edit colours" must open the slot-fill dialog pre-populated with existing slot→paint mappings. The query `getSlotResolutionMap` returns a `Map<technique_step_id, paint_id>` — but the slot-fill dialog needs `Map<slot_id, paint_id>`.
   - What's unclear: Need a separate query `getSlotMapByInstance(instanceId): Map<slot_id, paint_id | null>` that reads directly from `recipe_technique_slot_maps`.
   - Recommendation: Add `getSlotMapByInstance(instanceId)` to `recipeTechniqueSlotMaps.ts`. This query is simpler than `getSlotResolutionMap` and directly returns the per-instance slot→paint map for the dialog.

---

## Sources

### Primary (HIGH confidence — verified from codebase)
- `src-tauri/migrations/051_technique_library_foundation.sql` — complete schema for all six technique tables + FK columns on recipe_sections/recipe_steps
- `src/db/queries/recipes.ts` lines 210–511 — `saveRecipeGraph` implementation, all five diff phases, exact location of guard insertion points
- `src/lib/recipeDiff.ts` — `computeStepDiff` and `computeSectionDiff` implementations; explains why technique-owned steps appear in `toDelete`
- `src/lib/effectivePaintId.ts` — resolver signature, `SlotResolutionMap` type, resolution rule
- `src/db/queries/techniques.ts` — `saveTechniqueGraph`, `duplicateTechnique`, `getTechniquesWithCounts` — source patterns for the apply mutation
- `src/types/recipe.ts` lines 41–56 — `DraftStep.technique_step_id` already declared
- `src/types/technique.ts` — confirms `TechniqueStep` has no `paint_id`, no `alt_paint_id`, no `step_photo_path`
- `src/features/recipes/recipeSection.ts` — `buildDraftSections` (lines 51–90) — shows where `technique_step_id` must be forwarded
- `src/features/recipes/PaintCombobox.tsx` — confirmed reusable interface for `SlotFillRow`
- `src/features/recipes/RecipeSectionCard.tsx` — existing toolbar structure for "Add technique" button placement
- `src/features/recipes/RecipeDetailSheet.tsx` — existing structure for "Edit colours" affordance placement
- `src/features/recipes/SectionedTimeline.tsx` lines 41–54 — confirms `step.paint_id` direct reads (gap for Phase 143 swatch fix)
- `tests/data-layer/db-helpers.ts` — `createDbBridge`, `createHobbyforgeDb`, factory helpers (confirmed test harness for new tests)
- `tests/data-layer/technique-progress-identity.test.ts` — FND-03 test pattern; template for new `apply-technique.test.ts`
- `tests/painting/saveRecipeGraph.test.ts` — mock pattern for `saveRecipeGraph-guard.test.ts`

### Secondary (MEDIUM confidence)
- `src/hooks/useRecipeSections.ts` — confirmed invalidation contract (5 query keys on section delete); apply mutation must mirror this
- `src/features/techniques/TechniqueDetailSheet.tsx` — confirmed `useTechniqueColourSlots` / `useTechniqueSections` / `useTechniqueSteps` hooks available for picker preview

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps, all existing
- Transaction shape: HIGH — pattern verified in recipes.ts + techniques.ts
- saveRecipeGraph guard locations: HIGH — verified line-by-line in recipes.ts
- effectivePaintId wiring: HIGH — resolver verified; JOIN query is [ASSUMED] correct until tested
- Migration 052 skip decision: MEDIUM — [ASSUMED] based on expected data volume

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stable domain; no fast-moving dependencies)
