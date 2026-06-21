# Phase 142: Technique Authoring & Library Browse — Research

**Researched:** 2026-06-21
**Domain:** Technique CRUD authoring (Sheet form + section/step/slot structure) + Technique Library browse tab within Recipes page — built as a mirror of the existing recipe authoring stack.
**Confidence:** HIGH — all findings verified directly from codebase source files.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Library Surface & Navigation (Area 1)**
- Tabs control on the existing `/recipes` page ("Recipes" | "Techniques") — one route, zero sidebar change
- Library list is a card grid mirroring `RecipeCardGrid`
- Detail view is a Sheet mirroring `RecipeDetailSheet` — full section/step tree plus "used by N recipes"
- Filtering reuses the Recipes toolbar pattern: name search + effect dropdown

**Authoring Form (Area 2)**
- Form surface is a Sheet mirroring `RecipeFormSheet`
- Reuse / adapt `RecipeSectionList` + `RecipeStepRow` against technique-specific schema
- Step metadata fields: same set as recipes — painting_phase, tool, dilution, time
- Colour slots are a top-level list on the technique (name + free-text role hint); steps reference a slot via dropdown

**Metadata Model (Area 3)**
- Effect category reuses the existing recipe effect enum (`RECIPE_EFFECTS`)
- Difficulty reuses `RECIPE_DIFFICULTIES`
- Slot role hint is free text per slot (e.g. "brightest core")
- Save validity requires name + ≥1 step; colour slots are optional

**Edit / Delete / Duplicate (Area 4)**
- Non-destructive save reuses the `recipeDiff` / `saveRecipeGraph` UPDATE-not-replace pattern so `technique_step_id` survives every structure edit (FND-03 lock applied to authoring; UPDATE existing rows, INSERT only new ones, DELETE only removed ones — never DELETE+INSERT a surviving step)
- Delete shows a confirm dialog displaying "used by N recipes" before proceeding (soft warning, not hard block)
- Duplicate defaults the name to "Copy of {name}" and produces fully independent new IDs across sections, steps, and slots
- Section/step reorder uses dnd-kit drag, mirroring the existing recipe reorder UX

### Claude's Discretion
- Exact Zod schema shape for the technique form (mirror `recipeSchema.ts`)
- Query-module layout under `src/db/queries/` (e.g. `techniques.ts`, `techniqueSections.ts`) and hook files under `src/hooks/`
- Precise slot-picker control (combobox vs select) and empty-state copy (UI-SPEC resolves this: Select with `__none__` sentinel, `w-40` width)
- Test placement under `tests/` mirroring `src/features/recipes` tests

### Deferred Ideas (OUT OF SCOPE)
- Apply-to-recipe slot-fill flow → Phase 143
- Live-link re-sync propagation on technique edit → Phase 144
- Painting Mode / paint-availability / SectionedTimeline integration → Phase 145
- Detach + "from technique X" section badges → Phase 146
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TECH-01 | Users can create a named technique with full section/step structure (painting phase / tool / dilution / time) and named colour slots with role hints | `saveTechniqueGraph` mirrors `saveRecipeGraph` CREATE path; `techniqueSchema.ts` Zod schema; TechniqueFormSheet |
| TECH-02 | Non-destructive structure edit: existing `technique_step_id` values survive add/remove/reorder of sections/steps/slots | `computeSectionDiff` + `computeStepDiff` ported to technique domain; UPDATE-not-replace invariant from FND-03 test |
| TECH-03 | Delete with usage-count warning ("used by N recipes") | `getTechniqueUsageCount` query via COUNT on `recipe_technique_instances`; TechniqueDeleteDialog |
| TECH-04 | Duplicate producing an independent copy with fresh IDs across all sections, steps, and slots | `duplicateTechnique` mirrors `duplicateRecipe` with added slot copy pass |
| TECH-05 | Detail view showing full section/step tree plus "used by N recipes" list | TechniqueDetailSheet querying technique_sections + technique_steps + recipe_technique_instances JOIN painting_recipes |
| SLOT-01 | Named colour slots with role hint on the technique (top-level, not per-step) | `technique_colour_slots` table (migration 051); TechniqueSlotRow + DnD sortable; slot save in `saveTechniqueGraph` |
| SLOT-02 | Each step references a slot via a dropdown (slot, not a fixed paint) | `colour_slot_id` FK on `technique_steps`; Select picker replacing PaintCombobox in TechniqueStepRow |
| LIB-01 | Technique library browse as second tab on /recipes page | shadcn Tabs added to `RecipesPage.tsx`; tab state is local React state |
| LIB-02 | Library list: name / effect / difficulty / usage count | TechniqueCard + TechniqueCardGrid; `getTechniquesWithCounts` query |
| LIB-03 | Name search + effect filter | Zustand `techniqueFilters.ts` store + `applyTechniqueFilters.ts` pure function |
| LIB-04 | Detail view: section/step tree + used-by recipe list | TechniqueDetailSheet querying sections + steps + instances joined to recipe names |
</phase_requirements>

---

## Summary

Phase 142 is a **mirror build**, not a net-new design. Every component, query pattern, diff algorithm, hook convention, and UI primitive has a named recipe counterpart that was already proven in Phases 37–51 and hardened in Phase 70 (REC-02 non-destructive save). The only net-new concept is **colour slots** — a top-level ordered list on a technique where each slot has a name and an optional free-text role hint, and each technique step optionally references one slot via `colour_slot_id`. The slot picker on a step row replaces the `PaintCombobox` (w-40) from `RecipeStepRow`.

The FND-03 lock is the most critical constraint on the authoring save. The `technique-progress-identity.test.ts` green test proves that UPDATE-by-`technique_step_id` preserves progress markers, while DELETE+INSERT loses them. The `saveTechniqueGraph` function this phase must implement must follow the same five-phase diff used in `saveRecipeGraph`: never DELETE+INSERT a surviving step. This applies to sections, steps, and slots alike.

The recipe stack reuse pattern is: `recipeDiff.ts` functions (`computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap`) are pure and can be imported directly by `saveTechniqueGraph` with technique-typed inputs. A parallel `techniqueDiff.ts` is not needed if the diff shapes match (they do, see Architecture Patterns). The one addendum is a **slot diff** for `technique_colour_slots` (analogous to the step diff, keyed by `technique_colour_slot_id`).

**Primary recommendation:** Port `saveRecipeGraph` to `saveTechniqueGraph` in `src/db/queries/techniques.ts`, extend the diff to include a slot phase, and adapt `RecipeSectionList`/`RecipeStepRow` to technique-specific types. No new dependencies needed.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Technique library browse UI | Frontend (React) | — | Read-only display; all data from SQLite via React Query |
| Technique CRUD + graph save | Frontend (React) calling DB queries | SQLite | No Rust command needed; `saveRecipeGraph` runs fully in TS via tauri-plugin-sql |
| Non-destructive save diff | src/lib (pure TS) | Frontend calls it | `recipeDiff.ts` pattern — pure functions, no I/O |
| Colour slot diff | src/lib (pure TS) | Frontend calls it | New `techniqueDiff.ts` or extension of `recipeDiff.ts` |
| Usage count query | src/db/queries | React Query hook | Single GROUP BY on `recipe_technique_instances` |
| Tab state (Recipes / Techniques) | Frontend local state | — | No route change; `useState` in RecipesPage |
| DnD reorder (slots + sections/steps) | Frontend (dnd-kit) | — | Already installed; same `DndContext`+`SortableContext` wiring |
| Slot picker on step rows | Frontend (shadcn Select) | — | Replaces PaintCombobox; options derived from form slot list |

---

## Standard Stack

### Core (all already installed — NO new dependencies)

| Library | Current Version | Purpose | Why Standard |
|---------|----------------|---------|--------------|
| shadcn/ui | installed (new-york/zinc) | Sheet, Form, Input, Button, Select, Dialog, Badge, Card, Tabs, Separator, Skeleton | Design system in use; Tabs already in `src/components/ui/` |
| @dnd-kit/core + sortable | installed | Drag-to-reorder sections, steps, and colour slots | Already used in RecipeSectionList + RecipeStepRow |
| React Hook Form + @hookform/resolvers | installed | Form state + Zod resolver | Pattern used in RecipeFormSheet |
| Zod | installed | Schema validation | `techniqueSchema.ts` mirrors `recipeSchema.ts` |
| @tanstack/react-query | installed | Server state, cache invalidation | Same hook pattern as `useRecipes.ts` |
| Zustand | installed | Technique filter state | Same pattern as recipe filter stores |
| sonner | installed | Toast notifications | Same success/error toasts as recipe mutations |

**No new packages are needed for this phase.** [VERIFIED: direct codebase inspection]

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `src/lib/recipeDiff.ts` | `computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap` — pure diff utilities | Import directly in `saveTechniqueGraph`; types are compatible after creating technique-typed wrappers |
| `src/lib/effectivePaintId.ts` | `effectivePaintId()` resolver — not called this phase | Documents the slot model; Phase 143 wires consumers |
| `tauri-apps/plugin-fs` + `tauri-apps/plugin-dialog` | Photo upload for step_photo_path | Already used in RecipeStepRow; TechniqueStepRow inherits the same upload flow |

---

## Package Legitimacy Audit

No new packages are installed in this phase. All libraries used are already present in `node_modules` from prior phases. [VERIFIED: codebase inspection — no `npm install` command needed]

**Packages removed due to slopcheck:** none (no new packages)
**Packages flagged as suspicious:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User Action (Add/Edit/Delete/Duplicate Technique)
         |
         v
TechniqueFormSheet / TechniqueDeleteDialog / TechniqueDetailSheet
   (src/features/techniques/)
         |
         v
saveTechniqueGraph / deleteTechnique / duplicateTechnique
   (src/db/queries/techniques.ts)
         |
   [Diff phase for EDIT path]
         |
         v
techniqueDiff helpers  ←── src/lib/techniqueDiff.ts  (or recipeDiff.ts re-use)
  computeSectionDiff (technique_sections)
  computeStepDiff    (technique_steps)
  computeSlotDiff    (technique_colour_slots)  ← NEW
         |
         v
tauri-plugin-sql → SQLite hobbyforge.db
  techniques / technique_sections / technique_steps / technique_colour_slots
         |
         v
React Query invalidation → useTechniques / useTechniqueSections / useTechniqueColourSlots
         |
         v
TechniqueCardGrid → TechniqueCard (name, effect, difficulty, usage count, slot count, step count)
TechniqueDetailSheet (section/step tree + used-by recipe list)

Browse Flow:
RecipesPage (tabs: Recipes | Techniques)
  → TechniqueLibraryTab
      → filter bar (name search + effect Select)
      → TechniqueCardGrid
          → TechniqueCard.onClick → TechniqueDetailSheet
          → TechniqueCard.onEdit  → TechniqueFormSheet (edit mode)
          → TechniqueCard.onDelete → TechniqueDeleteDialog
```

### Recommended Project Structure

```
src/features/techniques/
  techniqueSchema.ts          # Zod schema + DraftTechniqueSlot + DraftTechniqueStep types
  techniqueSection.ts         # makeDraftTechniqueSection / buildDraftTechniqueSections helpers
  TechniqueFormSheet.tsx      # create/edit Sheet
  TechniqueSlotRow.tsx        # sortable slot editor row
  TechniqueSectionList.tsx    # DndContext wrapper (mirrors RecipeSectionList)
  TechniqueSectionCard.tsx    # collapsible section card (mirrors RecipeSectionCard)
  TechniqueStepRow.tsx        # step row with slot picker (mirrors RecipeStepRow)
  TechniqueStepList.tsx       # step list within a section (mirrors RecipeStepList)
  TechniqueCard.tsx           # library card (mirrors RecipeCard)
  TechniqueCardGrid.tsx       # grid with skeleton + empty state
  TechniqueDetailSheet.tsx    # detail Sheet with section/step tree + used-by
  TechniqueDeleteDialog.tsx   # confirm dialog with usage count
  TechniqueLibraryTab.tsx     # filter bar + TechniqueCardGrid
  TechniqueEmptyState.tsx     # empty state for zero techniques
  applyTechniqueFilters.ts    # pure filter function
  techniqueFilters.ts         # Zustand filter store

src/db/queries/
  techniques.ts               # getTechniques, getTechnique, saveTechniqueGraph,
                              #   deleteTechnique, duplicateTechnique, getTechniqueUsageCount,
                              #   getTechniqueUsedByRecipes, getTechniquesWithCounts
  techniqueSections.ts        # getTechniqueSections (used by detail Sheet)
  techniqueColourSlots.ts     # getTechniqueColourSlots (used by form + detail)

src/hooks/
  useTechniques.ts            # TECHNIQUES_KEY, useTechniques, useTechnique,
                              #   useCreateTechnique (via saveTechniqueGraph),
                              #   useUpdateTechnique, useDeleteTechnique, useDuplicateTechnique
  useTechniqueSections.ts     # TECHNIQUE_SECTIONS_KEY, useTechniqueSections
  useTechniqueColourSlots.ts  # TECHNIQUE_COLOUR_SLOTS_KEY, useTechniqueColourSlots

src/lib/
  techniqueDiff.ts            # computeSlotDiff (new); re-exports computeSectionDiff /
                              #   computeStepDiff from recipeDiff.ts OR ports them with
                              #   technique-typed overloads

tests/techniques/
  TechniqueFormSheet.test.tsx
  TechniqueCard.test.tsx

tests/data-layer/
  technique-save.test.ts      # Nyquist: non-destructive save, duplicate, usage count
```

### Pattern 1: saveTechniqueGraph — five-phase diff (non-destructive edit)

This is the most critical pattern. It mirrors `saveRecipeGraph` exactly, with an added slot phase. The key invariant: a `technique_step_id` that existed before the save must still exist after the save with the same DB integer PK. Never DELETE+INSERT a surviving step.

```typescript
// Source: src/db/queries/techniques.ts (to be created, mirroring src/db/queries/recipes.ts)

export async function saveTechniqueGraph(
  techniqueId: number | null,
  formValues: TechniqueFormValues,
  slots: DraftTechniqueSlot[],       // NEW: top-level slot list
  sections: DraftTechniqueSection[],
  existingSlots: TechniqueColourSlot[],   // for diff
  existingSections: TechniqueSection[],    // for diff
  existingSteps: TechniqueStep[],          // for diff
): Promise<number> {
  const db = await getDb();
  let finalId: number;

  if (techniqueId === null) {
    // CREATE PATH: INSERT technique → INSERT slots (build slotIdMap) →
    //   INSERT sections (build sectionIdMap) → INSERT steps (resolving slot + section FKs)
    ...
  } else {
    // EDIT PATH: UPDATE technique row →
    //   Phase 1: slot diff (DELETE removed, UPDATE existing, INSERT new) →
    //   Phase 2: section diff (computeSectionDiff from recipeDiff.ts) →
    //   Phase 3: step diff (computeStepDiff from recipeDiff.ts) →
    //   UPDATE/INSERT steps resolving colour_slot_id via slotIdMap
    ...
  }
  return finalId;
}
```

**Slot ID mapping pattern:** Just like `buildSectionIdMap` maps `localId → dbId` for sections, a `buildSlotIdMap` function maps `DraftTechniqueSlot.localId → dbId`. This map is used when saving steps so `colour_slot_id` in `technique_steps` resolves from the draft's `localId` reference to the real DB PK. When a step's `colour_slot_id` is `null` or `"__none__"`, store `null`.

**Auto-commit / WAL note (from `saveRecipeGraph` docblock):** Each `db.execute()` may run on a different connection from the pool; explicit `BEGIN/COMMIT` does not span pool connections. Use auto-commit per statement — in WAL mode each committed write is visible to subsequent FK-checking INSERTs. [VERIFIED: `src/db/queries/recipes.ts` lines 219–235]

### Pattern 2: Slot diff (computeSlotDiff)

Analogous to `computeStepDiff` from `src/lib/recipeDiff.ts`. The slot list is flat (not nested under sections), so the diff is simpler:

```typescript
// Source: src/lib/techniqueDiff.ts (to be created)

export interface SlotDiff {
  toDelete: number[];       // DB ids of slots not in current draft
  toUpdate: DraftTechniqueSlot[];  // draft slots with dbId !== null
  toInsert: DraftTechniqueSlot[];  // draft slots with dbId === null
}

export function computeSlotDiff(
  draftSlots: DraftTechniqueSlot[],
  existingSlots: TechniqueColourSlot[],
): SlotDiff {
  const survivingDbIds = new Set(
    draftSlots.map(s => s.dbId).filter((id): id is number => id !== null)
  );
  return {
    toDelete: existingSlots.filter(s => !survivingDbIds.has(s.id)).map(s => s.id),
    toUpdate: draftSlots.filter(s => s.dbId !== null),
    toInsert: draftSlots.filter(s => s.dbId === null),
  };
}
```

**Slot removal cascades:** When a slot is DELETEd from `technique_colour_slots`, `ON DELETE SET NULL` sets `technique_steps.colour_slot_id = NULL` for any step referencing it (proven in `technique-progress-identity.test.ts` Case 4). Steps are not removed — they become slot-less steps, which is valid per SLOT-05 ("-- no slot --" is a valid step state).

**Slot removal + slot picker live update:** When the user removes a slot from the slot list in the form, any step row that had that `localId` selected in the slot picker must reset its `colour_slot_id` to `null`. This is a pure form-state concern — implement in the form's `onSlotRemove` handler by iterating over all sections' steps.

### Pattern 3: dnd-kit wiring (sections, steps, and slots)

All three lists use the same dnd-kit pattern already in `RecipeSectionList.tsx`:

```typescript
// Source: src/features/recipes/RecipeSectionList.tsx (verified)

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);

// Inside DndContext.onDragEnd:
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIndex = items.findIndex(s => s.localId === active.id);
  const newIndex = items.findIndex(s => s.localId === over.id);
  if (oldIndex === -1 || newIndex === -1) return;
  onChange(arrayMove(items, oldIndex, newIndex));
}
```

The `TechniqueSlotRow` and `TechniqueStepRow` use `useSortable({ id: item.localId })` with `CSS.Transform.toString(transform)` and `opacity: isDragging ? 0.4 : 1` — identical to `RecipeStepRow.tsx` lines 33–40.

The slot list inside the form is a **separate** `DndContext`/`SortableContext` from the section/step list. Both can coexist in the same Sheet because they use different context instances.

### Pattern 4: Hook convention (useTechniques.ts)

Mirror `useRecipes.ts` exactly:

```typescript
// Source: src/hooks/useRecipes.ts (verified)

export const TECHNIQUES_KEY = ["techniques"] as const;
export const TECHNIQUE_KEY = (id: number) => ["techniques", id] as const;
export const TECHNIQUE_SECTIONS_KEY = (id: number) => ["technique-sections", id] as const;
export const TECHNIQUE_COLOUR_SLOTS_KEY = (id: number) => ["technique-colour-slots", id] as const;
// Batch counts key (usage counts per technique)
export const TECHNIQUE_USAGE_COUNTS_KEY = ["technique-usage-counts"] as const;

export function useTechniques() {
  return useQuery({ queryKey: TECHNIQUES_KEY, queryFn: getTechniques });
}

export function useCreateTechnique() {
  const qc = useQueryClient();
  return useMutation<number, Error, TechniqueGraphInput>({
    mutationFn: (input) => saveTechniqueGraph(null, ...),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TECHNIQUES_KEY });
      qc.invalidateQueries({ queryKey: TECHNIQUE_USAGE_COUNTS_KEY });
    },
  });
}
```

**Invalidation symmetry:** Delete and duplicate must invalidate `TECHNIQUES_KEY` + `TECHNIQUE_USAGE_COUNTS_KEY` + per-technique section/slot/step keys (use prefix invalidation `["technique-sections"]`).

### Pattern 5: Usage count query

```typescript
// src/db/queries/techniques.ts

export interface TechniqueUsageCount {
  technique_id: number;
  usage_count: number;
}

export async function getTechniqueUsageCounts(): Promise<TechniqueUsageCount[]> {
  const db = await getDb();
  return db.select<TechniqueUsageCount[]>(
    `SELECT technique_id, COUNT(*) AS usage_count
     FROM recipe_technique_instances
     GROUP BY technique_id`,
    [],
  );
}

// For delete dialog (single technique):
export async function getTechniqueUsageCount(id: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM recipe_technique_instances WHERE technique_id = $1",
    [id],
  );
  return rows[0]?.n ?? 0;
}

// For detail Sheet used-by list:
export async function getTechniqueUsedByRecipes(
  id: number
): Promise<{ recipe_id: number; name: string }[]> {
  const db = await getDb();
  return db.select<{ recipe_id: number; name: string }[]>(
    `SELECT rti.recipe_id, pr.name
     FROM recipe_technique_instances rti
     JOIN painting_recipes pr ON pr.id = rti.recipe_id
     WHERE rti.technique_id = $1
     ORDER BY pr.name ASC`,
    [id],
  );
}
```

Usage counts will be 0 for all techniques until Phase 143 wires the apply flow. The query must be correct now — the 0 display is the expected result.

### Pattern 6: Tabs integration into RecipesPage.tsx

Add shadcn Tabs below PageHeader, wrapping the existing recipes body in `TabsContent value="recipes"` and adding `TabsContent value="techniques"` with `TechniqueLibraryTab`. Tab state is local `useState` on `RecipesPage` — no route change, no URL update.

```typescript
// RecipesPage.tsx modification (verified: src/features/recipes/RecipesPage.tsx)
// Add: import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// Add: import { TechniqueLibraryTab } from "@/features/techniques/TechniqueLibraryTab";
// Add: const [activeTab, setActiveTab] = useState<"recipes" | "techniques">("recipes");

<PageHeader title="Recipes" subtitle="Documented paint schemes for your models" />
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "recipes" | "techniques")}>
  <TabsList>
    <TabsTrigger value="recipes">Recipes</TabsTrigger>
    <TabsTrigger value="techniques">Techniques</TabsTrigger>
  </TabsList>
  <TabsContent value="recipes">
    {/* existing filter bar + RecipeCardGrid */}
  </TabsContent>
  <TabsContent value="techniques">
    <TechniqueLibraryTab />
  </TabsContent>
</Tabs>
```

### Pattern 7: getTechniquesWithCounts — batch query for card display

The card grid needs technique + slot count + step count in one query to avoid N+1:

```typescript
export interface TechniqueWithCounts {
  id: number;
  name: string;
  effect: string | null;
  difficulty: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  slot_count: number;
  step_count: number;
  usage_count: number;
}

export async function getTechniquesWithCounts(): Promise<TechniqueWithCounts[]> {
  const db = await getDb();
  return db.select<TechniqueWithCounts[]>(
    `SELECT t.*,
       COALESCE(sl.slot_count, 0) AS slot_count,
       COALESCE(st.step_count, 0) AS step_count,
       COALESCE(u.usage_count, 0) AS usage_count
     FROM techniques t
     LEFT JOIN (
       SELECT technique_id, COUNT(*) AS slot_count
       FROM technique_colour_slots GROUP BY technique_id
     ) sl ON sl.technique_id = t.id
     LEFT JOIN (
       SELECT ts.technique_section_id,
              COUNT(*) AS step_count,
              sec.technique_id
       FROM technique_steps ts
       JOIN technique_sections sec ON sec.id = ts.technique_section_id
       GROUP BY sec.technique_id
     ) st ON st.technique_id = t.id
     LEFT JOIN (
       SELECT technique_id, COUNT(*) AS usage_count
       FROM recipe_technique_instances GROUP BY technique_id
     ) u ON u.technique_id = t.id
     ORDER BY t.name ASC`,
    [],
  );
}
```

This replaces three separate hooks with one query returning all card data. [ASSUMED — the JOIN structure, while logical, has not been executed against the actual schema; verify against migration 051 column names during implementation]

### Pattern 8: duplicateTechnique

Mirrors `duplicateRecipe` but adds a slot copy pass and builds a `slotIdMap` for step remapping:

```typescript
// src/db/queries/techniques.ts
export async function duplicateTechnique(originalId: number, newName: string): Promise<number> {
  const db = await getDb();
  // 1. Read + INSERT technique (metadata copy)
  // 2. Read + INSERT colour slots → build Map<oldSlotId, newSlotId>
  // 3. Read + INSERT sections → build Map<oldSectionId, newSectionId>
  // 4. Read + INSERT steps → remap colour_slot_id via slotIdMap, section_id via sectionIdMap
  // Returns new technique id
}
```

All steps get fresh `id` PKs (autoincrement). The original `technique_step_id` values in this context are NOT carried over to the duplicate — the duplicate is a standalone new technique with its own `technique_steps.id` PKs.

### Anti-Patterns to Avoid

- **DELETE+INSERT for surviving steps on edit:** Must use UPDATE-by-PK to preserve `technique_step_id`. The counter-case test in `technique-progress-identity.test.ts` proves this is not theoretical.
- **Using transaction BEGIN/COMMIT across `db.execute()` calls:** tauri-plugin-sql uses a connection pool; each call may use a different connection. WAL auto-commit is the only safe pattern. [VERIFIED: `saveRecipeGraph` docblock, lines 219–235]
- **Invalidating only `TECHNIQUES_KEY` on delete:** Must also invalidate per-technique section/step/slot caches or stale section data will show in reopened Sheets.
- **Slot localId as the `colour_slot_id` value in a step row:** Slots use `localId` in the draft state but the persisted `technique_steps.colour_slot_id` must be the integer DB id. Use the `slotIdMap` (localId → dbId) to resolve this at save time.
- **Forgetting to clear steps' slot reference when a slot is removed from the form:** When `onSlotRemove` fires, iterate all sections → steps and null out any step whose `colour_slot_id` references the removed slot's `localId`.

---

## Migration 051 — Exact Column Sets

[VERIFIED: `src-tauri/migrations/051_technique_library_foundation.sql`]

### `techniques`
| Column | Type | Constraint |
|--------|------|-----------|
| id | INTEGER | PK AUTOINCREMENT |
| name | TEXT | NOT NULL |
| effect | TEXT | nullable |
| difficulty | TEXT | nullable |
| notes | TEXT | nullable |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) |
| updated_at | TEXT | NOT NULL DEFAULT (datetime('now')) |

### `technique_sections`
| Column | Type | Constraint |
|--------|------|-----------|
| id | INTEGER | PK AUTOINCREMENT |
| technique_id | INTEGER | NOT NULL REFERENCES techniques(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL DEFAULT 'Steps' |
| surface | TEXT | nullable |
| optional | INTEGER | NOT NULL DEFAULT 0 |
| order_index | INTEGER | NOT NULL DEFAULT 0 |
| notes | TEXT | nullable |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) |
| updated_at | TEXT | NOT NULL DEFAULT (datetime('now')) |

### `technique_colour_slots`
| Column | Type | Constraint |
|--------|------|-----------|
| id | INTEGER | PK AUTOINCREMENT |
| technique_id | INTEGER | NOT NULL REFERENCES techniques(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| role_hint | TEXT | nullable |
| order_index | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) |

Note: **No `updated_at` column on `technique_colour_slots`** — this column is absent from the migration. Do not include it in queries.

### `technique_steps`
| Column | Type | Constraint |
|--------|------|-----------|
| id | INTEGER | PK AUTOINCREMENT |
| technique_section_id | INTEGER | NOT NULL REFERENCES technique_sections(id) ON DELETE CASCADE |
| colour_slot_id | INTEGER | REFERENCES technique_colour_slots(id) ON DELETE SET NULL |
| step_name | TEXT | NOT NULL |
| order_index | INTEGER | NOT NULL DEFAULT 0 |
| notes | TEXT | nullable |
| painting_phase | TEXT | nullable |
| tool | TEXT | nullable |
| technique | TEXT | nullable |
| dilution | TEXT | nullable |
| time_estimate_minutes | INTEGER | nullable |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) |

Note: **No `updated_at` on `technique_steps`** — absent from migration. No `step_photo_path` either (techniques have no per-step photos in Phase 142 unless explicitly added). Also no `alt_paint_id` — technique steps carry no paint references of their own.

### `recipe_technique_instances`
| Column | Type | Constraint |
|--------|------|-----------|
| id | INTEGER | PK AUTOINCREMENT |
| recipe_id | INTEGER | NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE |
| technique_id | INTEGER | NOT NULL REFERENCES techniques(id) ON DELETE CASCADE |
| detached | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) |

### `recipe_technique_slot_maps`
| Column | Type | Constraint |
|--------|------|-----------|
| id | INTEGER | PK AUTOINCREMENT |
| instance_id | INTEGER | NOT NULL REFERENCES recipe_technique_instances(id) ON DELETE CASCADE |
| slot_id | INTEGER | NOT NULL REFERENCES technique_colour_slots(id) ON DELETE CASCADE |
| paint_id | INTEGER | REFERENCES paints(id) ON DELETE RESTRICT |
| — | — | UNIQUE(instance_id, slot_id) |

### Columns added to existing tables (ALTER TABLE in migration 051)
- `recipe_sections.technique_instance_id`: INTEGER nullable, REFERENCES recipe_technique_instances(id) ON DELETE SET NULL
- `recipe_steps.technique_step_id`: INTEGER nullable, REFERENCES technique_steps(id) ON DELETE SET NULL

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Section/step diff (determine UPDATE vs INSERT vs DELETE) | Custom diff logic | `computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap` from `src/lib/recipeDiff.ts` | Already proven, handles cross-section step drags correctly |
| Non-destructive graph save | Custom save loop | Port `saveRecipeGraph` pattern verbatim | The FND-03 invariant is complex to get right; recipe version is tested |
| Drag-and-drop sort | Custom DnD | dnd-kit (`useSortable`, `DndContext`, `SortableContext`, `arrayMove`) | Already installed, used in RecipeSectionList + RecipeStepRow |
| Effect/difficulty enums | New enum arrays | `RECIPE_EFFECTS`, `RECIPE_DIFFICULTIES` from `recipeSchema.ts` | Identical values per Area 3 decision |
| Card grid skeleton loading | Custom skeleton | Copy `RecipeCardGrid` loading branch (6 cells, `rounded-xl border bg-card p-6 flex flex-col gap-3`) | Exact pixel parity required per UI-SPEC |
| Usage count per technique | Custom counter state | `getTechniqueUsageCounts()` GROUP BY query | Single SQL, invalidated on mutation |

---

## Common Pitfalls

### Pitfall 1: Slot localId vs DB id in step rows
**What goes wrong:** The slot picker in the form shows slots by `localId`. If you store `localId` as the `colour_slot_id` value in the step draft and then pass it directly to the SQL INSERT/UPDATE, the DB receives a string UUID instead of an integer FK, causing a constraint violation or silent null.
**Why it happens:** The draft-state pattern uses `localId` for React keys and DnD IDs; DB ids only exist after INSERT.
**How to avoid:** Always use the `slotIdMap` (localId → dbId) to resolve `colour_slot_id` at save time, exactly as `sectionIdMap` resolves `section_id` for steps in `saveRecipeGraph`.
**Warning signs:** A step's `colour_slot_id` in the DB is NULL despite the form showing a slot selected.

### Pitfall 2: Slot removal not clearing step slot references in form state
**What goes wrong:** User removes Slot A from the slot list. Step row 3 still has `colour_slot_id = slot-A-localId`. On save, the slot diff DELETEs the slot; the step diff tries to UPDATE `technique_steps.colour_slot_id = slotIdMap.get("slot-A-localId")` which returns `undefined`, coercing to NULL — this accidentally clears the slot reference rather than failing visibly.
**Why it happens:** The slot list and step list are two independent form state arrays.
**How to avoid:** In the form's `removeSlot` handler, scan all sections → steps and null out `colour_slot_id` for any step referencing the removed slot's `localId`. The UI-SPEC (interaction contracts) explicitly requires this.

### Pitfall 3: Missing `updated_at` columns in technique_steps and technique_colour_slots
**What goes wrong:** Code copies the recipe step UPDATE pattern which includes `updated_at = datetime('now')`, causing a `no such column` SQLite error at runtime.
**Why it happens:** Migration 051 only has `created_at` on `technique_steps` and `technique_colour_slots` — `updated_at` was intentionally omitted.
**How to avoid:** Check migration 051 column set before writing UPDATE SQL. Only `techniques` and `technique_sections` have `updated_at`.

### Pitfall 4: step_photo_path and alt_paint_id not in technique_steps
**What goes wrong:** Code copies `RecipeStepRow` which has photo upload (`step_photo_path`) and `alt_paint_id`. Technique steps have neither column in migration 051.
**Why it happens:** Mindless port of the recipe step row UI.
**How to avoid:** `TechniqueStepRow` omits the photo upload button and alt-paint combobox. The line-1 layout replaces `PaintCombobox` with the slot picker Select; line-2 retains tool/technique/dilution/time but the 5th grid cell is empty or absent (per UI-SPEC: "alt removed, replaced with empty cell or omitted").

### Pitfall 5: Tabs component not yet in src/components/ui/
**What goes wrong:** The Tabs import fails at runtime because the shadcn component was never added.
**Why it happens:** shadcn components must be explicitly added via CLI or manual file copy — they are not auto-included.
**How to avoid:** Verify `src/components/ui/tabs.tsx` exists before wiring the import. If absent, add with `npx shadcn@latest add tabs` or copy the component.
**Warning signs:** Build error "Cannot find module '@/components/ui/tabs'".

### Pitfall 6: Invalid query key for section-scoped step count
**What goes wrong:** The step count displayed on a TechniqueCard shows 0 because the count query joins `technique_steps` through `technique_sections` but the GROUP BY is wrong.
**Why it happens:** `technique_steps.technique_section_id` references `technique_sections`, not `techniques` directly. A naive `GROUP BY technique_id` on `technique_steps` fails because `technique_steps` has no `technique_id` column.
**How to avoid:** The step count sub-query must JOIN `technique_steps → technique_sections` to get `technique_id`. See `getTechniquesWithCounts` pattern above.

### Pitfall 7: React key collision when adding / removing slots during a session
**What goes wrong:** Two slots appear to swap names or a removed slot re-appears.
**Why it happens:** Using `index` as the React key for slot rows instead of `slot.localId`.
**How to avoid:** Always key on `slot.localId` (a UUID assigned at draft creation). Same pattern as sections and steps in `RecipeSectionList`.

---

## Code Examples

### DraftTechniqueSlot type

```typescript
// src/features/techniques/techniqueSchema.ts
// [VERIFIED: mirrors DraftStep from src/types/recipe.ts + DraftSection from same file]

export interface DraftTechniqueSlot {
  localId: string;       // UUID — React key + DnD id + slotIdMap key
  dbId: number | null;   // null until persisted; non-null for existing slots
  name: string;          // required for save (non-empty)
  role_hint: string | null;
  order_index: number;   // derived from array index at save time
}

export interface DraftTechniqueStep {
  localId: string;
  dbId: number | null;
  step_name: string;
  colour_slot_id: string | null;  // references DraftTechniqueSlot.localId in form state
                                  // resolved to DB integer via slotIdMap at save time
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
  // NO step_photo_path — technique_steps has no such column (migration 051)
  // NO alt_paint_id — technique steps carry no paint references this phase
}

export interface DraftTechniqueSection {
  localId: string;
  dbId: number | null;
  name: string;
  surface: string | null;
  optional: number;       // 0 = required, 1 = skippable
  notes: string | null;
  steps: DraftTechniqueStep[];
}
```

### techniqueSchema Zod definition

```typescript
// src/features/techniques/techniqueSchema.ts
// [VERIFIED: mirrors recipeSchema.ts from src/features/recipes/recipeSchema.ts]

import { z } from "zod";
import { RECIPE_EFFECTS, RECIPE_DIFFICULTIES } from "@/features/recipes/recipeSchema";

export { RECIPE_EFFECTS, RECIPE_DIFFICULTIES }; // re-export for local import convenience

export const techniqueSchema = z.object({
  name: z.string().min(1, "Technique name is required.").max(120, "Name must be 120 characters or fewer"),
  effect: z.string().nullable(),
  difficulty: z.string().nullable(),
  estimated_minutes: z.number().int().min(1).nullable(),
  result_photo_path: z.string().nullable(),   // optional result photo on the technique (not per-step)
  notes: z.string().max(2000).nullable(),
  description: z.string().max(500).nullable(), // short description field (from UI-SPEC)
});

export type TechniqueFormValues = z.infer<typeof techniqueSchema>;
```

Note: Slot validation (name non-empty, max 80 chars) and step validation (step_name required) are validated in `saveTechniqueGraph` via toast warnings, not in the Zod schema — consistent with the recipe authoring pattern.

### Slot picker in TechniqueStepRow

```tsx
// Source: 142-UI-SPEC.md (verified — replaces PaintCombobox in RecipeStepRow)

<Select
  value={step.colour_slot_id ?? "__none__"}
  onValueChange={(v) =>
    onChange({ ...step, colour_slot_id: v === "__none__" ? null : v })
  }
>
  <SelectTrigger className="w-40">
    <SelectValue placeholder="Colour slot" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__none__">-- no slot --</SelectItem>
    {slots.map((s) => (
      <SelectItem key={s.localId} value={s.localId}>
        {s.name || <span className="text-muted-foreground italic">Unnamed slot</span>}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

`slots` is the live `DraftTechniqueSlot[]` from the parent form — updates instantly as the user edits or removes slots.

### RecipeSectionList / RecipeStepRow adaptation surface

The only changes from the recipe originals:
1. `RecipeStepRow.tsx` → `TechniqueStepRow.tsx`: replace `PaintCombobox` (w-40) + photo button with slot picker `Select` (w-40); remove alt-paint combobox; remove photo upload handler; pass `slots: DraftTechniqueSlot[]` as a prop.
2. `RecipeSectionList.tsx` → `TechniqueSectionList.tsx`: change `DraftSection[]` to `DraftTechniqueSection[]`; pass `slots` down to each section card.
3. `RecipeSectionCard.tsx` → `TechniqueSectionCard.tsx`: remove workflow metadata fields (`section_type`, `technique`, `execution_mode`, `applies_to`); pass `slots` down to step list. The technique section only has `name`, `surface`, `optional`, `notes`.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 + better-sqlite3 (data-layer) |
| Config file | `vitest.config.ts` (jsdom for component tests, node environment for data-layer) |
| Quick run command | `pnpm test -- tests/techniques/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TECH-01 | Create technique: graph save inserts technique + sections + steps + slots with correct FKs | data-layer (better-sqlite3) | `pnpm test -- tests/data-layer/technique-save.test.ts` | ❌ Wave 0 |
| TECH-02 | Non-destructive save: edit preserves `technique_step_id` PKs across add/remove/reorder | data-layer (better-sqlite3) | `pnpm test -- tests/data-layer/technique-save.test.ts` | ❌ Wave 0 |
| TECH-03 | Delete: usage count query returns correct count; dialog displays it | unit (RTL) | `pnpm test -- tests/techniques/TechniqueDeleteDialog.test.tsx` | ❌ Wave 0 |
| TECH-04 | Duplicate: produces fully fresh IDs; slot IDs not shared with original | data-layer (better-sqlite3) | `pnpm test -- tests/data-layer/technique-save.test.ts` | ❌ Wave 0 |
| TECH-05 | Detail Sheet: shows section/step tree; shows used-by list (0 recipes correct) | unit (RTL) | `pnpm test -- tests/techniques/TechniqueDetailSheet.test.tsx` | ❌ Wave 0 |
| SLOT-01 | Slot list: add/remove/reorder slots; names + role hints persist on save | data-layer (better-sqlite3) | `pnpm test -- tests/data-layer/technique-save.test.ts` | ❌ Wave 0 |
| SLOT-02 | Slot picker: step's colour_slot_id resolves via slotIdMap; null step accepted | data-layer (better-sqlite3) | `pnpm test -- tests/data-layer/technique-save.test.ts` | ❌ Wave 0 |
| LIB-01 | Techniques tab renders on RecipesPage; switching tabs preserves state | unit (RTL) | `pnpm test -- tests/techniques/TechniqueLibraryTab.test.tsx` | ❌ Wave 0 |
| LIB-02 | Card shows name/effect/difficulty/usage count/slot count/step count | unit (RTL) | `pnpm test -- tests/techniques/TechniqueCard.test.tsx` | ❌ Wave 0 |
| LIB-03 | Name filter narrows card list; effect filter narrows card list; clear works | unit (RTL) | `pnpm test -- tests/techniques/TechniqueLibraryTab.test.tsx` | ❌ Wave 0 |
| LIB-04 | Detail Sheet: used-by section shows "Not used by any recipes yet." when count is 0 | unit (RTL) | `pnpm test -- tests/techniques/TechniqueDetailSheet.test.tsx` | ❌ Wave 0 |

### Critical data-layer tests (technique-save.test.ts)

These three behaviors MUST be proven by better-sqlite3 tests before the feature ships:

1. **Non-destructive save preserves `technique_step_id` across add/remove/reorder:** Create a technique with steps S1/S2/S3. Record S1.id and S2.id. Edit: remove S1, reorder S3 to top. Assert S2.id is unchanged. Assert S1 row is gone. Assert S3 has new order_index but same PK.

2. **Duplicate produces fully-fresh IDs:** Duplicate a technique. Assert all `technique_colour_slots.id` values differ between original and copy. Assert all `technique_steps.id` values differ. Assert `technique_sections.id` values differ. Assert `techniques.id` differs.

3. **Usage count query correctness:** Insert a technique. Insert 2 `recipe_technique_instances` referencing it. Assert `getTechniqueUsageCounts()` returns `usage_count: 2` for that technique. Delete one instance. Assert count drops to 1.

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/techniques/ tests/data-layer/technique-save.test.ts`
- **Per wave merge:** `pnpm test` (full 2916+ suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/data-layer/technique-save.test.ts` — covers TECH-01, TECH-02, TECH-04, SLOT-01, SLOT-02
- [ ] `tests/techniques/TechniqueCard.test.tsx` — covers LIB-02
- [ ] `tests/techniques/TechniqueDetailSheet.test.tsx` — covers TECH-05, LIB-04
- [ ] `tests/techniques/TechniqueDeleteDialog.test.tsx` — covers TECH-03
- [ ] `tests/techniques/TechniqueLibraryTab.test.tsx` — covers LIB-01, LIB-03

---

## Security Domain

No new authentication, session management, access control, or cryptography is introduced. The technique data lives in the same SQLite database as all other app data, using the same parameterized `$1/$2` query pattern with FK enforcement on every connection (`PRAGMA foreign_keys = ON` in `client.ts`).

Applicable ASVS:
- V5 Input Validation: enforced via Zod schema on form submit + max-length constraints on slot name (80) and role_hint (120) fields. [VERIFIED: recipeSchema.ts pattern + 142-UI-SPEC.md]

No new threat patterns beyond what the recipe layer already handles.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| DELETE+INSERT all steps on save | UPDATE surviving rows, INSERT new, DELETE removed | FND-03: progress markers survive technique edits (Phase 141 invariant test) |
| paint_id directly on steps | colour_slot_id on technique steps; paint resolved via slot map in recipe context | Enables reuse across recipes with different palettes (Phase 143+) |

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely TypeScript/React/SQLite code changes. No external tools, services, CLIs, runtimes, or databases beyond what is already running are required.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getTechniquesWithCounts` JOIN structure (step count sub-query joining through technique_sections) produces correct results without a GROUP BY ambiguity error | Architecture Patterns / Pattern 7 | Wrong step counts on cards; need to adjust sub-query |
| A2 | `src/components/ui/tabs.tsx` exists (shadcn Tabs component was added in a prior phase) | Common Pitfalls / Pitfall 5 | Import failure; need to add component before Tab integration |
| A3 | `technique_sections` has `updated_at` column (migration 051 shows it has both `created_at` and `updated_at`) | Migration 051 column sets | UPDATE SQL would fail if absent; verified against migration file |

Note: A3 is actually VERIFIED from the migration file read — `technique_sections` does have `updated_at`. Only A1 and A2 are genuinely assumed.

---

## Open Questions

1. **Does `src/components/ui/tabs.tsx` already exist?**
   - What we know: shadcn Tabs is used in the Settings page (tabbed Preferences/Data/About — Phase 121). It was likely added then.
   - What's unclear: the file was not directly verified in this research session.
   - Recommendation: Wave 0 task should verify and add if absent (`npx shadcn@latest add tabs`).

2. **Should `saveTechniqueGraph` live in `techniques.ts` or should `techniqueDiff.ts` export the shared save logic?**
   - What we know: `saveRecipeGraph` lives in `recipes.ts` and imports from `src/lib/recipeDiff.ts`.
   - What's unclear: whether it's cleaner to reuse `computeSectionDiff`/`computeStepDiff` directly from `recipeDiff.ts` (they are generic enough) or to create technique-typed variants.
   - Recommendation: Import the diff functions directly from `recipeDiff.ts` — their TypeScript signatures use structural typing that is compatible with technique draft types. Only add `computeSlotDiff` to a new `techniqueDiff.ts` (the slot diff is new). This keeps the diff library small and avoids duplication.

3. **Step photo upload on technique steps?**
   - What we know: Migration 051 has no `step_photo_path` column on `technique_steps`. The UI-SPEC omits the photo button.
   - What's unclear: Whether to add it later.
   - Recommendation: Omit entirely in Phase 142. If needed, it requires a new migration column.

---

## Sources

### Primary (HIGH confidence — verified from codebase source files)
- `src/lib/recipeDiff.ts` — `computeSectionDiff`, `computeStepDiff`, `buildSectionIdMap` exact implementations
- `src/db/queries/recipes.ts` — `saveRecipeGraph` full implementation (CREATE + EDIT paths with five-phase diff)
- `src-tauri/migrations/051_technique_library_foundation.sql` — exact column definitions for all 6 technique tables + ALTER TABLE columns
- `src/features/recipes/RecipeSectionList.tsx` — dnd-kit wiring pattern
- `src/features/recipes/RecipeStepRow.tsx` — step row layout (3 lines, grid-cols-5 gap-1.5)
- `src/features/recipes/RecipeCard.tsx` — card structure + difficultyColors map
- `src/features/recipes/RecipeCardGrid.tsx` — grid layout + skeleton pattern
- `src/features/recipes/RecipeDeleteDialog.tsx` — delete dialog pattern
- `src/features/recipes/RecipeDetailSheet.tsx` — detail sheet pattern
- `src/features/recipes/RecipeFormSheet.tsx` — form Sheet pattern
- `src/features/recipes/recipeSchema.ts` — `RECIPE_EFFECTS`, `RECIPE_DIFFICULTIES`, `PAINTING_PHASES`, `recipeSchema` Zod definition
- `src/hooks/useRecipes.ts` — hook convention + invalidation symmetry
- `src/hooks/useRecipePaints.ts` — STEP_COUNTS_KEY, batch count hook pattern
- `src/db/queries/recipeSections.ts` — batch count query pattern (`getSectionCountsByRecipe`)
- `src/lib/effectivePaintId.ts` — slot model definition (Phase 143+ consumer)
- `src/types/recipe.ts` — `DraftStep`, `DraftSection`, `PaintingRecipe` type shapes
- `tests/data-layer/technique-progress-identity.test.ts` — FND-03 invariant test (exact SQL operations and assertions)
- `.planning/phases/142-technique-authoring-library-browse/142-CONTEXT.md` — all locked decisions
- `.planning/phases/142-technique-authoring-library-browse/142-UI-SPEC.md` — approved UI design contract
- `.planning/config.json` — `nyquist_validation: true`

### Secondary (MEDIUM confidence)
- `src/features/recipes/RecipesPage.tsx` (first 80 lines) — tab integration point, filter state shape
- `src/features/recipes/RecipeSectionCard.tsx` (first 60 lines) — section card structure

---

## Metadata

**Confidence breakdown:**
- Migration 051 schema: HIGH — read directly from file
- saveRecipeGraph diff pattern: HIGH — read full implementation
- Component adaptation scope: HIGH — read all recipe counterparts
- getTechniquesWithCounts JOIN query: MEDIUM — structural logic is sound but not executed
- Tabs component availability: MEDIUM — inferred from Settings page; not directly verified

**Research date:** 2026-06-21
**Valid until:** 2026-07-21 (stable — no external dependencies, all sources are local codebase)
