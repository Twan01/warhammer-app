# Phase 143: Apply Flow & Slot-Fill System — Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 14 new/modified files
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/queries/recipeTechniqueInstances.ts` | query module | CRUD (insert-only) | `src/db/queries/techniques.ts` `duplicateTechnique` | exact — multi-step flat inline INSERT chain |
| `src/db/queries/recipeTechniqueSlotMaps.ts` | query module | CRUD + JOIN | `src/db/queries/techniqueColourSlots.ts` + `techniques.ts` | role-match — simple select + UPSERT |
| `src/db/queries/recipes.ts` (guard edit) | query module | CRUD (guard) | self — lines 436–508 | self-edit — guard inserted in-place |
| `src/features/recipes/recipeSection.ts` (buildDraftSections edit) | utility | transform | self — lines 51–90 | self-edit — forward one field |
| `src/hooks/useTechniqueInstances.ts` | hook | request-response | `src/hooks/useTechniques.ts` | exact — key factory + useQuery + useMutation + invalidation |
| `src/hooks/useSlotResolutionMap.ts` | hook | request-response | `src/hooks/useTechniqueColourSlots.ts` | exact — enabled-by-id, single useQuery |
| `src/features/recipes/TechniquePickerDialog.tsx` | component | request-response | `src/features/recipes/ApplyToUnitsDialog.tsx` | exact — Dialog + Command search + list + footer buttons |
| `src/features/recipes/SlotFillDialog.tsx` | component | request-response | `src/features/recipes/ApplyToUnitsDialog.tsx` | role-match — Dialog + scroll list + mutation call |
| `src/features/recipes/SlotFillRow.tsx` | component | transform | `src/features/recipes/PaintCombobox.tsx` (reused as child) | role-match — row wrapping PaintCombobox |
| `src/features/recipes/TechniqueSectionBadge.tsx` | component | transform | `src/features/techniques/TechniqueCard.tsx` Badge usage | role-match — shadcn Badge + Lucide icon |
| `src/features/recipes/TechniquePickerCard.tsx` | component | transform | `src/features/techniques/TechniqueCard.tsx` | exact — condensed version of same data |
| `src/features/recipes/RecipeSectionCard.tsx` (extend) | component | event-driven | self — toolbar area lines 76–152 | self-edit — add button + conditional badge render |
| `src/features/recipes/RecipeDetailSheet.tsx` (extend) | component | request-response | self + `SectionedTimeline.tsx` | self-edit — add "Edit colours" + read-only steps |
| `src/features/recipes/SectionedTimeline.tsx` (extend) | component | transform | self — lines 1–120 | self-edit — wire effectivePaintId + accept slotMap prop |
| `tests/data-layer/apply-technique.test.ts` | test | batch | `tests/data-layer/technique-progress-identity.test.ts` | exact — createHobbyforgeDb + fixture + SQL assertions |
| `tests/data-layer/saveRecipeGraph-guard.test.ts` | test | CRUD | `tests/data-layer/technique-graph-save.test.ts` | exact — createHobbyforgeDb + getDb mock + function under test |
| `tests/lib/effectivePaintId.test.ts` | test | transform | `tests/data-layer/technique-graph-save.test.ts` (structure) | role-match — pure unit test, no DB |

---

## Pattern Assignments

### `src/db/queries/recipeTechniqueInstances.ts` (query module, insert-only)

**Analog:** `src/db/queries/techniques.ts` `duplicateTechnique` (lines 213–320)

**Imports pattern** (`techniques.ts` lines 1–13):
```typescript
import { getDb } from "@/db/client";
import type {
  Technique,
  TechniqueColourSlot,
  TechniqueSection,
  TechniqueStep,
  // ...
} from "@/types/technique";
```
For the new module:
```typescript
import { getDb } from "@/db/client";
import type { TechniqueSection, TechniqueStep } from "@/types/technique";
```

**Core flat-inline-SQL INSERT chain pattern** (`techniques.ts` lines 213–320):
```typescript
// NOTE from duplicateTechnique (lines 206–212):
// tauri-plugin-sql uses sqlx::Pool<Sqlite> — each db.execute() may run on a
// DIFFERENT connection. NO BEGIN/COMMIT. WAL auto-commit makes each write
// immediately visible to all connections.
export async function duplicateTechnique(originalId: number, newName: string): Promise<number> {
  const db = await getDb();

  // 1. Insert parent row
  const techResult = await db.execute(
    `INSERT INTO techniques (name, effect, difficulty, notes) VALUES ($1, $2, $3, $4)`,
    [newName, original.effect, original.difficulty, original.notes],
  );
  const newTechniqueId = techResult.lastInsertId ?? 0;

  // 2. Insert colour slots — build remapping Map
  const slotIdMap = new Map<number, number>();
  for (const slot of originalSlots) {
    const slotResult = await db.execute(
      `INSERT INTO technique_colour_slots (technique_id, name, role_hint, order_index)
       VALUES ($1, $2, $3, $4)`,
      [newTechniqueId, slot.name, slot.role_hint, slot.order_index],
    );
    slotIdMap.set(slot.id, slotResult.lastInsertId ?? 0);
  }

  // 3. Insert sections and steps with remapped FK IDs
  // ... (full multi-step for loop chain)
}
```

**lastInsertId pattern** (lines 233, 246, 258, 269):
```typescript
const result = await db.execute(`INSERT INTO ...`, [...]);
const newId = result.lastInsertId ?? 0;
```

**Parameterized query syntax** (all query files):
```typescript
// Positional $1, $2, ... — Tauri plugin-sql requirement
await db.execute(`INSERT INTO foo (a, b) VALUES ($1, $2)`, [valA, valB]);
await db.select<Row[]>("SELECT * FROM foo WHERE id = $1", [id]);
```

---

### `src/db/queries/recipeTechniqueSlotMaps.ts` (query module, CRUD + JOIN)

**Analog:** `src/db/queries/techniqueColourSlots.ts` (lines 1–13) + `techniques.ts` UPSERT pattern

**Imports pattern** (`techniqueColourSlots.ts` lines 1–2):
```typescript
import { getDb } from "@/db/client";
import type { TechniqueColourSlot } from "@/types/technique";
```

**Simple select returning typed rows** (`techniqueColourSlots.ts` lines 7–13):
```typescript
export async function getTechniqueColourSlots(techniqueId: number): Promise<TechniqueColourSlot[]> {
  const db = await getDb();
  return db.select<TechniqueColourSlot[]>(
    "SELECT * FROM technique_colour_slots WHERE technique_id = $1 ORDER BY order_index ASC, id ASC",
    [techniqueId],
  );
}
```

**UPSERT pattern** (from RESEARCH.md Pattern 5):
```typescript
// INSERT OR REPLACE is safe — UNIQUE(instance_id, slot_id) exists in migration 051
export async function updateSlotMap(
  instanceId: number,
  slotFills: Map<number, number | null>,
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

**Map-returning select** (for `getSlotResolutionMap` and `getSlotMapByInstance`):
```typescript
// Pattern: select rows, fold into Map via for-loop
const rows = await db.select<{ technique_step_id: number; paint_id: number | null }[]>(
  `SELECT rs.technique_step_id, sm.paint_id
   FROM recipe_steps rs
   JOIN recipe_sections rsec ON rsec.id = rs.section_id
   JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
   JOIN technique_steps ts ON ts.id = rs.technique_step_id
   LEFT JOIN recipe_technique_slot_maps sm
          ON sm.instance_id = rti.id AND sm.slot_id = ts.colour_slot_id
   WHERE rs.recipe_id = $1 AND rs.technique_step_id IS NOT NULL`,
  [recipeId],
);
const map = new Map<number, number | null>();
for (const row of rows) {
  map.set(row.technique_step_id, row.paint_id);
}
return map;
```

---

### `src/db/queries/recipes.ts` — saveRecipeGraph guard (self-edit)

**File:** `src/db/queries/recipes.ts` lines 436–508

**DELETE pass guard insertion point** (after line 436 — current code):
```typescript
// lines 436–441 (current — no guard)
const { toDelete: stepsToDelete } = computeStepDiff(sections, existingSteps);

for (const id of stepsToDelete) {
  await db.execute("DELETE FROM recipe_steps WHERE id = $1", [id]);
}
```
Guard to insert before the `db.execute` call:
```typescript
for (const id of stepsToDelete) {
  const step = existingSteps.find((s) => s.id === id);
  if (step?.technique_step_id != null) continue;  // SC#5 GUARD: skip live-linked
  await db.execute("DELETE FROM recipe_steps WHERE id = $1", [id]);
}
```

**UPDATE pass guard insertion point** (after line 448 — current code):
```typescript
// lines 448–480 (current — no guard)
if (s.dbId !== null) {
  // UPDATE existing step
  await db.execute(`UPDATE recipe_steps SET ...`, [...]);
}
```
Guard to insert as first line inside the `if (s.dbId !== null)` branch:
```typescript
if (s.dbId !== null) {
  if (s.technique_step_id != null) continue;  // SC#5 GUARD: never overwrite
  await db.execute(`UPDATE recipe_steps SET ...`, [...]);
}
```

---

### `src/features/recipes/recipeSection.ts` — buildDraftSections forward (self-edit)

**File:** `src/features/recipes/recipeSection.ts` lines 51–90

**Current mapping** (lines 60–74 — field to add):
```typescript
.map(
  (st): DraftStep => ({
    localId: crypto.randomUUID(),
    dbId: st.id,
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
    // ADD:
    technique_step_id: st.technique_step_id ?? null,
  }),
)
```

Also filter out technique-owned steps for the editor's draft (add before `.map()`):
```typescript
const sectionSteps = steps
  .filter((st) => st.section_id === s.id && st.technique_step_id == null)
  .sort(...)
  .map(...)
```

---

### `src/hooks/useTechniqueInstances.ts` (hook, request-response)

**Analog:** `src/hooks/useTechniques.ts` (lines 1–151) — full pattern

**Key factory pattern** (lines 25–28):
```typescript
export const TECHNIQUES_KEY = ["techniques"] as const;
export const TECHNIQUE_KEY = (id: number) => ["techniques", id] as const;
export const TECHNIQUES_WITH_COUNTS_KEY = ["techniques-with-counts"] as const;
```
Apply to new file:
```typescript
export const TECHNIQUE_INSTANCES_KEY = (recipeId: number) =>
  ["technique-instances", recipeId] as const;
```

**Shared invalidation helper pattern** (lines 91–99):
```typescript
function invalidateTechniqueKeys(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: TECHNIQUES_KEY });
  qc.invalidateQueries({ queryKey: TECHNIQUES_WITH_COUNTS_KEY });
  // prefix invalidation clears all per-technique caches
  qc.invalidateQueries({ queryKey: ["technique-sections"] });
}
```
Apply to new file — invalidate recipe-adjacent keys after apply:
```typescript
function invalidateAfterApply(qc: ReturnType<typeof useQueryClient>, recipeId: number) {
  qc.invalidateQueries({ queryKey: TECHNIQUE_INSTANCES_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
}
```

**Mutation with typed input struct pattern** (lines 106–115):
```typescript
export function useCreateTechnique() {
  const qc = useQueryClient();
  return useMutation<number, Error, TechniqueGraphInput>({
    mutationFn: ({ formValues, slots, sections, existingSlots, existingSections, existingSteps }) =>
      saveTechniqueGraph(null, formValues, ...),
    onSuccess: () => {
      invalidateTechniqueKeys(qc);
    },
  });
}
```

---

### `src/hooks/useSlotResolutionMap.ts` (hook, request-response)

**Analog:** `src/hooks/useTechniqueColourSlots.ts` (lines 1–27) — enabled-by-id pattern

**Full pattern** (lines 1–27):
```typescript
import { useQuery } from "@tanstack/react-query";
import { getTechniqueColourSlots } from "@/db/queries/techniqueColourSlots";

export const TECHNIQUE_COLOUR_SLOTS_KEY = (id: number) =>
  ["technique-colour-slots", id] as const;

export function useTechniqueColourSlots(id: number | undefined) {
  return useQuery({
    queryKey:
      id !== undefined
        ? TECHNIQUE_COLOUR_SLOTS_KEY(id)
        : ["technique-colour-slots"],
    queryFn: () =>
      id !== undefined ? getTechniqueColourSlots(id) : Promise.resolve([]),
    enabled: id !== undefined,
  });
}
```
Apply to new file — same enabled-by-id shape:
```typescript
export const SLOT_RESOLUTION_MAP_KEY = (recipeId: number) =>
  ["slot-resolution-map", recipeId] as const;

export function useSlotResolutionMap(recipeId: number | undefined) {
  return useQuery({
    queryKey:
      recipeId !== undefined
        ? SLOT_RESOLUTION_MAP_KEY(recipeId)
        : ["slot-resolution-map"],
    queryFn: () =>
      recipeId !== undefined
        ? getSlotResolutionMap(recipeId)
        : Promise.resolve(new Map()),
    enabled: recipeId !== undefined,
  });
}
```

---

### `src/features/recipes/TechniquePickerDialog.tsx` (component, request-response)

**Analog:** `src/features/recipes/ApplyToUnitsDialog.tsx` (lines 1–70+)

**Imports pattern** (lines 1–28):
```typescript
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
```

**Dialog + Command search pattern** (lines 44–70):
```typescript
export function ApplyToUnitsDialog({ open, recipe, onClose }: ApplyToUnitsDialogProps) {
  const { data: units = [] } = useUnits();
  // ...
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<number>>(new Set());

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) setSelectedUnitIds(new Set());
  }, [open]);
  // ...
}
```

**State-reset on open pattern** (applies to TechniquePickerDialog — reset selected technique):
```typescript
useEffect(() => {
  if (open) setSelectedTechniqueId(undefined);
}, [open]);
```

**Footer CTA disabled-until-selection pattern** (from ApplyToUnitsDialog footer):
```typescript
<DialogFooter>
  <Button variant="outline" onClick={onClose}>Close picker</Button>
  <Button
    disabled={selectedTechniqueId === undefined}
    onClick={() => onNextSlotFill()}
  >
    Next: Fill slots
  </Button>
</DialogFooter>
```

---

### `src/features/recipes/SlotFillDialog.tsx` (component, request-response)

**Analog:** `src/features/recipes/ApplyToUnitsDialog.tsx` — Dialog shell + `src/hooks/useTechniques.ts` mutation pattern

**Saving state + toast pattern** (from multiple recipe mutation consumers):
```typescript
const applyTechnique = useApplyTechnique();

async function handleApply() {
  try {
    await applyTechnique.mutateAsync({ recipeId, techniqueId, insertAfterSectionIndex, slotFills });
    toast.success("Technique applied.");
    onClose();
  } catch {
    toast.error("Failed to apply technique. Please try again.");
  }
}
```

**Saving button loading state** (UI-SPEC pattern):
```typescript
<Button
  disabled={applyTechnique.isPending}
  onClick={handleApply}
>
  {applyTechnique.isPending && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
  Apply technique
</Button>
```

---

### `src/features/recipes/SlotFillRow.tsx` (component, transform)

**Analog:** `src/features/recipes/PaintCombobox.tsx` (reused as child component)

**PaintCombobox reuse interface** (lines 16–20):
```typescript
export interface PaintComboboxProps {
  value: number | null;
  onChange: (paintId: number | null) => void;
  onCreateNew?: () => void;  // OMIT in SlotFillRow — no create-new in slot context
}
```

**Row layout pattern** (from UI-SPEC.md SlotFillRow layout):
```tsx
// div flex items-center gap-3 rounded-md border p-2
<div className="flex items-center gap-3 rounded-md border p-2">
  <div className="flex flex-col gap-1 w-36 shrink-0">
    <span className="text-sm font-medium">{slot.name}</span>
    <span className="text-xs text-muted-foreground">{slot.role_hint ?? "No hint"}</span>
  </div>
  {/* Swatch: filled = colored circle, unassigned = dashed */}
  <div
    className={cn(
      "h-4 w-4 rounded-full",
      paintId == null
        ? "border border-dashed border-muted-foreground"
        : undefined,
    )}
    style={paintId != null ? { backgroundColor: resolvedColor } : undefined}
    aria-hidden="true"
  />
  <div className="flex-1">
    <PaintCombobox value={paintId} onChange={onChange} />
  </div>
</div>
```

---

### `src/features/recipes/TechniqueSectionBadge.tsx` (component, transform)

**Analog:** `src/features/techniques/TechniqueCard.tsx` Badge usage (lines 43–57) + `RecipeDetailSheet.tsx` Badge import (line 13)

**shadcn Badge pattern** (`TechniqueCard.tsx` lines 43–57):
```tsx
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

// secondary variant — bg-secondary text-secondary-foreground
<Badge variant="secondary" className="max-w-[200px] truncate">
  <BookOpen className="h-3 w-3 mr-1" aria-hidden="true" />
  from {technique.name}
</Badge>
```

**Interactive badge (detail view) pattern** — wrap in button:
```tsx
// Detail view: badge is a <button> that navigates to technique library tab
<button
  type="button"
  aria-label={`View technique ${technique.name} in library`}
  onClick={onNavigateToTechnique}
  className="inline-flex"
>
  <Badge variant="secondary" ...>
    <BookOpen ... /> from {technique.name}
  </Badge>
</button>
```

---

### `src/features/recipes/TechniquePickerCard.tsx` (component, transform)

**Analog:** `src/features/techniques/TechniqueCard.tsx` (lines 1–114) — condensed version

**Card structure pattern** (lines 31–70):
```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, ListChecks } from "lucide-react";
import type { TechniqueWithCounts } from "@/types/technique";

// Condensed: no action buttons, click-to-select behavior, bg-accent when selected
<Card
  className={cn(
    "cursor-pointer transition-colors",
    isSelected ? "bg-accent" : "hover:bg-accent/50",
  )}
  onClick={() => onSelect(technique)}
>
  <CardHeader className="pb-0">
    <span className="text-sm font-medium">{technique.name}</span>
  </CardHeader>
  <CardContent className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
    <span className="flex items-center gap-1">
      <Layers className="h-3 w-3" />
      {technique.slot_count} slots
    </span>
    <span className="flex items-center gap-1">
      <ListChecks className="h-3 w-3" />
      {technique.step_count} steps
    </span>
  </CardContent>
</Card>
```

---

### `src/features/recipes/RecipeSectionCard.tsx` — extend (self-edit)

**File:** `src/features/recipes/RecipeSectionCard.tsx` lines 76–152

**Toolbar button addition pattern** (after line 140, before collapse trigger at line 134):
```tsx
// Pattern: ghost icon button in toolbar — matches existing collapse/delete buttons
<Button
  type="button"
  variant="ghost"
  size="sm"
  className="h-7 gap-1 text-xs"
  onClick={onAddTechnique}
>
  <BookOpen className="h-3.5 w-3.5" />
  Add technique
</Button>
```

**Drag handle disable pattern** (conditional render — from UI-SPEC.md):
```tsx
// For technique-sourced sections: no drag handle, Input disabled, no delete button
// Existing drag handle (lines 80–89) — wrap in conditional:
{!section.technique_instance_id && (
  <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
    <GripVertical className="h-4 w-4" />
  </button>
)}
// Input disabled for technique sections:
<Input
  className="h-7 flex-1 text-sm font-medium"
  value={section.name}
  onChange={...}
  disabled={section.technique_instance_id != null}
/>
```

---

### `src/features/recipes/SectionedTimeline.tsx` — extend (self-edit)

**File:** `src/features/recipes/SectionedTimeline.tsx` lines 1–120

**Props extension pattern** (current interface lines 10–15):
```typescript
export interface SectionedTimelineProps {
  sections: RecipeSection[];
  steps: RecipeStep[];
  paintMap: Map<number, Paint>;
  stepPhotoUrls?: Map<number, string>;
  // ADD:
  slotMap?: SlotResolutionMap;  // optional — plain recipes pass undefined
}
```

**sectionAvailability gap to fix** (lines 40–54 — current reads `step.paint_id` directly):
```typescript
// Current (lines 43–44) — BROKEN for technique steps:
if (step.section_id === null || step.paint_id === null || step.paint_id === 0) continue;

// Fix — use effectivePaintId with slotMap fallback:
import { effectivePaintId } from "@/lib/effectivePaintId";
// ...
const resolvedPaintId = effectivePaintId(step, slotMap ?? new Map());
if (step.section_id === null || resolvedPaintId === null) continue;
```

---

### `tests/data-layer/apply-technique.test.ts` (test, batch)

**Analog:** `tests/data-layer/technique-progress-identity.test.ts` (lines 1–160+) — exact harness

**File header + imports pattern** (lines 1–27):
```typescript
// @vitest-environment node

import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createTestSection,
} from "./db-helpers";
```

**Fixture build pattern** (lines 55–160):
```typescript
describe("apply technique (APPLY-01..05, SLOT-03/04/05)", () => {
  let db: Database.Database;
  let techniqueId: number;
  // ... fixture vars

  beforeEach(() => {
    db = createHobbyforgeDb();
    // INSERT technique + sections + slots + steps via direct SQL
    // INSERT recipe
    // Do NOT call applyTechnique() here — tests call it themselves
  });

  it("inserts instance + sections + steps + slot maps", async () => {
    // Wire getDb mock via createDbBridge(db)
    // Call applyTechnique(...)
    // Assert row counts via db.prepare().all()
  });
});
```

**createDbBridge integration pattern** (from `db-helpers.ts` lines 118–143):
```typescript
// In test file:
import { vi } from "vitest";
import { getDb } from "@/db/client";
import { createDbBridge } from "./db-helpers";

vi.mock("@/db/client", () => ({ getDb: vi.fn() }));

beforeEach(() => {
  db = createHobbyforgeDb();
  const bridge = createDbBridge(db);
  vi.mocked(getDb).mockResolvedValue(bridge as never);
});
```

---

### `tests/data-layer/saveRecipeGraph-guard.test.ts` (test, CRUD)

**Analog:** `tests/data-layer/technique-graph-save.test.ts` (lines 1–60+) — import function under test + createHobbyforgeDb + mock

**Imports + function under test pattern** (lines 1–25):
```typescript
// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

// Import the function under test — RED until guard is implemented
import { saveRecipeGraph } from "@/db/queries/recipes";

let db: Database.Database;
```

**Test structure pattern** (lines 35–80):
```typescript
describe("saveRecipeGraph guard (SC#5)", () => {
  beforeEach(() => {
    db = createHobbyforgeDb();
    // Set up: recipe + technique + technique instance + materialised steps
  });

  it("never DELETEs a recipe_step with technique_step_id", async () => { ... });
  it("never UPDATEs a recipe_step with technique_step_id", async () => { ... });
  it("still DELETEs plain recipe_steps normally", async () => { ... });
});
```

---

### `tests/lib/effectivePaintId.test.ts` (test, transform)

**No DB analog — pure unit test.** Use vitest `describe/it/expect` without DB.

**Pure unit test pattern** (Vitest, no `@vitest-environment node` needed):
```typescript
import { describe, it, expect } from "vitest";
import { effectivePaintId } from "@/lib/effectivePaintId";

describe("effectivePaintId", () => {
  it("returns slot map paint for technique-owned step", () => {
    const slotMap = new Map([[42, 7]]);
    expect(effectivePaintId({ paint_id: null, technique_step_id: 42 }, slotMap)).toBe(7);
  });
  it("returns null for unfilled slot", () => { ... });
  it("returns step.paint_id for plain step", () => { ... });
});
```

---

## Shared Patterns

### Auto-commit WAL — no BEGIN/COMMIT
**Source:** `src/db/queries/techniques.ts` lines 206–212 (comment block)
**Apply to:** `recipeTechniqueInstances.ts` `applyTechnique()`, any multi-step INSERT chain

```typescript
// tauri-plugin-sql uses sqlx::Pool<Sqlite> — each db.execute() may run on a
// DIFFERENT connection from the pool. Explicit BEGIN/COMMIT is broken.
// In WAL mode each committed write is immediately visible to all connections.
// Pattern: single `const db = await getDb()` at top, flat sequential awaits.
const db = await getDb();
const r1 = await db.execute(`INSERT INTO ...`, [...]);
const newId = r1.lastInsertId ?? 0;
const r2 = await db.execute(`INSERT INTO ... VALUES ($1, ...)`, [newId, ...]);
```

### getDb singleton + boolean-as-integer
**Source:** `src/db/queries/recipes.ts` lines 1–8, `src/db/queries/recipeSections.ts` lines 26–42
**Apply to:** all new query modules

```typescript
// Always: const db = await getDb()
// Booleans: stored as 0 | 1; cast on read, pass ? ? 1 : 0 on write
// Nullables: use ?? null (never undefined in SQL params)
input.optional,          // number 0|1 stored as-is
input.surface ?? null,   // nullable string
```

### RECIPE_SECTIONS invalidation contract (5 keys)
**Source:** `src/hooks/useRecipeSections.ts` lines 51–73 (deleteRecipeSection comment block)
**Apply to:** `useTechniqueInstances.ts` `useApplyTechnique` onSuccess

```typescript
// CASCADE INVALIDATION CONTRACT — do not reduce.
// After any change to recipe_sections or recipe_steps:
qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
```

### enabled-by-id query hook
**Source:** `src/hooks/useTechniqueColourSlots.ts` lines 16–26
**Apply to:** `useSlotResolutionMap.ts`, any hook where id may be undefined

```typescript
return useQuery({
  queryKey: id !== undefined ? KEY(id) : ["key-disabled"],
  queryFn: () => (id !== undefined ? fetchFn(id) : Promise.resolve(defaultValue)),
  enabled: id !== undefined,
});
```

### Dialog + Command search (no Sheet)
**Source:** `src/features/recipes/ApplyToUnitsDialog.tsx` lines 1–70
**Apply to:** `TechniquePickerDialog.tsx`, `SlotFillDialog.tsx`

```typescript
// Critical architecture note (from ApplyToUnitsDialog JSDoc):
// Rendered as a SIBLING to Sheet (NOT inside SheetContent — P6 pitfall).
// Dialog must be mounted outside the Sheet component tree.
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from "@/components/ui/command";
```

### Toast error handling
**Source:** `src/features/recipes/ApplyToUnitsDialog.tsx` (mutation consumers throughout codebase)
**Apply to:** SlotFillDialog mutation handlers

```typescript
import { toast } from "sonner";
try {
  await mutation.mutateAsync(input);
  toast.success("Technique applied.");
  onClose();
} catch {
  toast.error("Failed to apply technique. Please try again.");
}
```

### State-reset on dialog open
**Source:** `src/features/recipes/ApplyToUnitsDialog.tsx` (useEffect pattern)
**Apply to:** `TechniquePickerDialog.tsx`, `SlotFillDialog.tsx`

```typescript
useEffect(() => {
  if (open) {
    setSelected(undefined);  // reset selection state
  }
}, [open]);
```

---

## No Analog Found

No files in this phase are without an analog. All new files map cleanly to existing patterns.

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/features/recipes/`, `src/features/techniques/`, `tests/data-layer/`, `src/lib/`
**Files scanned:** 18 source files read directly
**Pattern extraction date:** 2026-06-22
