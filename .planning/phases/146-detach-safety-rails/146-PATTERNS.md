# Phase 146: Detach & Safety Rails — Pattern Map

**Mapped:** 2026-06-23
**Files analyzed:** 6 new/modified files
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/queries/recipeTechniqueDetach.ts` | service (data layer) | CRUD / teardown | `src/db/queries/recipeTechniqueResync.ts` | exact — same single-db-handle contract, flat inline SQL, same table graph |
| `src/hooks/useTechniqueDetach.ts` | hook | request-response | `src/hooks/useTechniqueInstances.ts` (`useApplyTechnique`) | exact — same mutation shape + invalidateAfterApply key set |
| `src/features/recipes/DetachConfirmDialog.tsx` | component | request-response | `src/features/recipes/RecipeSectionCard.tsx` (inline AlertDialog, lines 278–293) | exact — identical AlertDialog primitive already authored in this file |
| `src/features/recipes/RecipeSectionCard.tsx` (modified) | component | request-response | self — existing ghost icon button pattern (lines 152–157, 160–170) | self-analog |
| `src/features/techniques/TechniqueDeleteDialog.tsx` (modified) | component | request-response | self — existing Dialog + `usageCount` prop + handleConfirm (lines 1–69) | self-analog |
| `src/hooks/useTechniques.ts` — `useDeleteTechnique` (modified) | hook | request-response | self + `useUpdateTechnique` onSuccess invalidation (lines 123–143) | self-analog |
| `tests/data-layer/technique-detach.test.ts` | test | batch | `tests/data-layer/apply-technique.test.ts` + `technique-resync.test.ts` | exact — same beforeEach fixture structure, same db-helpers, same vi.mock pattern |

---

## Pattern Assignments

### `src/db/queries/recipeTechniqueDetach.ts` (data layer, teardown)

**Analog:** `src/db/queries/recipeTechniqueResync.ts`

**File header / single-db-handle contract** (lines 1–27):
```typescript
/**
 * Recipe Technique Detach — one-way escape hatch (v0.7.0 Phase 146).
 *
 * detachTechniqueInstance: for every technique-owned recipe_steps row in the
 * instance, bakes effectivePaintId() into recipe_steps.paint_id, then NULLs
 * technique_step_id; NULLs technique_instance_id / technique_section_id on the
 * instance's sections; deletes recipe_technique_instances + slot_maps.
 *
 * KEY INVARIANT (SC#3):
 *   recipe_step.id values are NEVER recreated — only FK columns cleared.
 *   unit_recipe_step_progress (keyed by recipe_step_id) survives untouched.
 *
 * CRITICAL ORDERING CONSTRAINT:
 *   Slot maps must be queried and paints baked BEFORE DELETE FROM
 *   recipe_technique_instances fires (which CASCADE-deletes slot_maps).
 *
 * SINGLE DB HANDLE CONTRACT (mirrors recipeTechniqueResync.ts lines 23–26):
 *   detachTechniqueInstance MUST receive db from caller and NEVER call getDb()
 *   internally — used inside the delete loop in detachAllAndDeleteTechnique.
 *
 * detachAllAndDeleteTechnique: calls getDb() ONCE, iterates non-detached
 *   instances, calls detachTechniqueInstance per instance, then deletes technique.
 *
 * getNonDetachedInstanceCount: standalone query, MAY call getDb() — used by
 *   TechniqueDeleteDialog to display live-instance count to the user.
 */
```

**DbHandle type alias** (recipeTechniqueResync.ts line 78 — copy verbatim):
```typescript
import { getDb } from "@/db/client";
type DbHandle = Awaited<ReturnType<typeof getDb>>;
```

**Core detach function shape** (mirrors resyncTechniqueInstances signature at line 94):
```typescript
export async function detachTechniqueInstance(
  db: DbHandle,
  instanceId: number,
): Promise<void> {
  // Step 1: Build slot resolution map BEFORE any DELETE (critical ordering)
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
  // Step 2: Bake paint_id per step (effectivePaintId collapse: ?? null)
  // Step 3: NULL technique_step_id on technique-owned steps (WHERE technique_step_id IS NOT NULL)
  // Step 4: NULL technique_instance_id + technique_section_id on sections
  // Step 5: DELETE instance row — CASCADE fires on slot_maps automatically
}
```

**Manual-step discriminator** (mirrors recipeTechniqueResync.ts lines 283–296):
```typescript
// Discriminator: technique-owned step → technique_step_id IS NOT NULL
// User-added manual step → technique_step_id IS NULL (already plain, skip it)
// All UPDATE / SELECT WHERE clauses must filter: AND technique_step_id IS NOT NULL
```

**auto-detach + delete function** (mirrors single-db-handle loop in resync, lines 100–106):
```typescript
export async function detachAllAndDeleteTechnique(techniqueId: number): Promise<void> {
  const db = await getDb();   // ONE handle for the entire operation
  const instances = await db.select<{ id: number }[]>(
    `SELECT id FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0`,
    [techniqueId],
  );
  for (const inst of instances) {
    await detachTechniqueInstance(db, inst.id);  // same handle passed in
  }
  await db.execute(`DELETE FROM techniques WHERE id = $1`, [techniqueId]);
}
```

**Standalone count query** (copy structure from getNonDetachedInstanceCount, lines 397–407):
```typescript
export async function getNonDetachedInstanceCount(techniqueId: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0`,
    [techniqueId],
  );
  return rows[0]?.n ?? 0;
}
// detachTechniqueInstances.ts already exports this — re-export or move here.
```

**SQL param syntax:** `$1, $2` positional (Tauri plugin-sql). No `BEGIN`/`COMMIT`. No nested `getDb()` inside `detachTechniqueInstance`.

---

### `src/hooks/useTechniqueDetach.ts` (hook, request-response)

**Analog:** `src/hooks/useTechniqueInstances.ts` — `useApplyTechnique` (lines 92–101) and `invalidateAfterApply` (lines 39–47)

**Imports pattern** (mirrors useTechniqueInstances.ts lines 1–14):
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { detachTechniqueInstance } from "@/db/queries/recipeTechniqueDetach";
import { getDb } from "@/db/client";
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
import { TECHNIQUE_INSTANCES_KEY } from "@/hooks/useTechniqueInstances";
import { TECHNIQUES_WITH_COUNTS_KEY, TECHNIQUE_USAGE_COUNTS_KEY } from "@/hooks/useTechniques";
```

**Invalidation set** (mirrors invalidateAfterApply at lines 39–47, plus technique-level keys):
```typescript
// Per-recipe invalidation (used when detaching from editor — single recipeId known)
function invalidateAfterDetach(qc: QueryClient, recipeId: number): void {
  qc.invalidateQueries({ queryKey: TECHNIQUE_INSTANCES_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
  qc.invalidateQueries({ queryKey: SLOT_RESOLUTION_MAP_KEY(recipeId) });
  // Technique-level: usage counts drop when last instance is detached
  qc.invalidateQueries({ queryKey: TECHNIQUES_WITH_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: TECHNIQUE_USAGE_COUNTS_KEY });
}
```

**Mutation hook shape** (mirrors useApplyTechnique lines 92–101):
```typescript
interface DetachTechniqueInput {
  instanceId: number;
  recipeId: number;  // needed for per-recipe key invalidation
}

export function useDetachTechniqueInstance() {
  const qc = useQueryClient();
  return useMutation<void, Error, DetachTechniqueInput>({
    mutationFn: async ({ instanceId }) => {
      const db = await getDb();
      return detachTechniqueInstance(db, instanceId);
    },
    onSuccess: (_, variables) => {
      invalidateAfterDetach(qc, variables.recipeId);
    },
  });
}
```

---

### `src/features/recipes/DetachConfirmDialog.tsx` (component, request-response)

**Analog:** `src/features/recipes/RecipeSectionCard.tsx` — inline AlertDialog (lines 278–293)

**Imports pattern** (already present in RecipeSectionCard lines 7–15 — copy):
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
```

**AlertDialog structure** (RecipeSectionCard lines 279–293 — direct model):
```typescript
// RecipeSectionCard's existing delete confirm — exact primitive structure to copy:
<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete section "{section.name}"?</AlertDialogTitle>
      <AlertDialogDescription>
        This will also delete {section.steps.length} step...
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={onRemove}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**DetachConfirmDialog target shape** (copy primitive structure, swap copy + add loading):
```typescript
export interface DetachConfirmDialogProps {
  open: boolean;
  techniqueName: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DetachConfirmDialog({ open, techniqueName, isPending, onCancel, onConfirm }: DetachConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Detach technique?</AlertDialogTitle>
          <AlertDialogDescription>
            This breaks the live link permanently. Future edits to &quot;{techniqueName}&quot; won&apos;t update this recipe.
            <br /><br />
            Your current steps and colours are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep link</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Detaching…" : "Detach"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Note:** `AlertDialogAction` uses `bg-destructive` className directly (shadcn new-york pattern — the primitive does not accept `variant` prop; class override is the correct approach, matching shadcn docs).

---

### `src/features/recipes/RecipeSectionCard.tsx` (modified — add Unlink button + DetachConfirmDialog)

**Analog:** Self. Existing ghost icon button pattern (lines 150–170).

**Ghost icon button pattern** (lines 152–157 — exact shape to replicate for Unlink):
```typescript
// Existing collapse trigger — exact h-7 w-7 ghost icon button shape:
<CollapsibleTrigger asChild>
  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
    <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
  </Button>
</CollapsibleTrigger>

// Existing delete button (lines 160–170) — h-7 w-7 + text-destructive:
<Button
  type="button"
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-destructive"
  onClick={handleDelete}
>
  <Trash2 className="h-4 w-4" />
</Button>
```

**Technique badge placement** (lines 110–113 — Unlink button inserts AFTER badge):
```typescript
{isTechniqueOwned && techniqueName && (
  <TechniqueSectionBadge techniqueName={techniqueName} />
)}
// Phase 146: add immediately after:
{isTechniqueOwned && techniqueName && (
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
)}
```

**New props required:**
```typescript
interface RecipeSectionCardProps {
  // ... existing props ...
  techniqueName?: string;           // already exists
  onDetach?: () => void;            // NEW — callback; instanceId stays in RecipeSectionList
}
```

**New state required** (mirrors `confirmOpen` useState on line 65):
```typescript
const [detachOpen, setDetachOpen] = useState(false);
```

**New imports required:**
```typescript
import { Unlink } from "lucide-react";           // add to existing lucide import
import { DetachConfirmDialog } from "./DetachConfirmDialog";  // new file
```

---

### `src/features/techniques/TechniqueDeleteDialog.tsx` (modified — extend for case B)

**Analog:** Self. Current full file (lines 1–69) — modify in place.

**Current props** (lines 14–18):
```typescript
export interface TechniqueDeleteDialogProps {
  open: boolean;
  technique: Technique | null;
  usageCount: number;     // ← rename to liveInstanceCount (one call site, safe)
  onClose: () => void;
}
```

**Current description branch** (lines 47–52 — replace with two-case copy):
```typescript
// CURRENT (lines 47–52):
{technique && usageCount > 0
  ? `"${technique.name}" is used by ${usageCount} recipe${usageCount === 1 ? "" : "s"}. Deleting it will remove all applied instances. This cannot be undone.`
  : technique
  ? `This will permanently remove "${technique.name}" and all its steps. This cannot be undone.`
  : "This will permanently remove the selected technique."}

// PHASE 146 replacement (two cases per UI-SPEC lines 148–160):
// Case A (liveInstanceCount === 0): keep existing copy unchanged.
// Case B (liveInstanceCount > 0): new copy surfacing consequence + reassurance.
{technique && liveInstanceCount > 0
  ? `"${technique.name}" is live-linked to ${liveInstanceCount} recipe${liveInstanceCount === 1 ? "" : "s"}. Detaching will bake the current colours into those recipes before removing the technique. No recipe content will be lost.`
  : technique
  ? `This will permanently remove "${technique.name}" and all its steps. This cannot be undone.`
  : "This will permanently remove the selected technique."}
```

**Current confirm button** (lines 58–63 — extend for case B label + loading text):
```typescript
// CURRENT:
<Button variant="destructive" onClick={handleConfirm} disabled={deleteTechnique.isPending}>
  {deleteTechnique.isPending ? "Deleting…" : "Delete"}
</Button>

// PHASE 146 replacement:
<Button variant="destructive" onClick={handleConfirm} disabled={deleteTechnique.isPending}>
  {deleteTechnique.isPending
    ? (liveInstanceCount > 0 ? "Detaching & deleting…" : "Deleting…")
    : (liveInstanceCount > 0
        ? `Detach ${liveInstanceCount} recipe${liveInstanceCount === 1 ? "" : "s"} & delete`
        : "Delete")}
</Button>
```

**mutationFn replacement** (line 27 + line 32 — wire to new function):
```typescript
// CURRENT (line 27):
const deleteTechnique = useDeleteTechnique();

// PHASE 146: useDeleteTechnique's mutationFn is replaced in useTechniques.ts
// to call detachAllAndDeleteTechnique. No change needed here except the
// liveInstanceCount prop rename. The hook reference stays the same.
```

**Success toast case B** (line 33 — extend):
```typescript
// CURRENT:
toast.success("Technique deleted.");

// PHASE 146: conditionally show count-aware message
toast.success(
  liveInstanceCount > 0
    ? `Technique detached from ${liveInstanceCount} recipe${liveInstanceCount === 1 ? "" : "s"} and deleted.`
    : "Technique deleted."
);
```

---

### `src/hooks/useTechniques.ts` — `useDeleteTechnique` (modified)

**Analog:** Self — `useUpdateTechnique` onSuccess invalidation (lines 123–143) for the extended invalidation breadth.

**Current useDeleteTechnique** (lines 147–155):
```typescript
export function useDeleteTechnique() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteTechnique,
    onSuccess: () => {
      invalidateTechniqueKeys(qc);
    },
  });
}
```

**Phase 146 replacement:**
```typescript
import { detachAllAndDeleteTechnique } from "@/db/queries/recipeTechniqueDetach";

export function useDeleteTechnique() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: detachAllAndDeleteTechnique,   // auto-detach loop then DELETE
    onSuccess: () => {
      invalidateTechniqueKeys(qc);
      // Prefix invalidations — N recipes affected, no recipeId known
      // Mirrors useUpdateTechnique lines 134–140:
      qc.invalidateQueries({ queryKey: ["recipe-sections"] });
      qc.invalidateQueries({ queryKey: ["recipe-paints"] });
      qc.invalidateQueries({ queryKey: ["slot-resolution-map"] });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
      qc.invalidateQueries({ queryKey: ["technique-instances"] });
    },
  });
}
```

---

### `tests/data-layer/technique-detach.test.ts` (test, guard-first)

**Analog:** `tests/data-layer/apply-technique.test.ts` (full file) + `tests/data-layer/technique-resync.test.ts` (lines 1–100)

**File header + environment directive** (apply-technique.test.ts line 1 + resync lines 1–18):
```typescript
// @vitest-environment node

/**
 * SAFE-02 data-layer contract — RED until recipeTechniqueDetach.ts exists.
 *
 * Guard-first invariants (written before data-layer implementation, Phase 146):
 *   SC#3: surviving recipe_step.id unchanged after detach (progress preserved)
 *   SAFE-02: paint_id baked from slot map before slot maps are deleted
 *   SAFE-02: technique_step_id NULLed; recipe_sections FK columns NULLed
 *   SAFE-02: recipe_technique_instances row + slot_maps deleted
 *   SAFE-02: unfilled slot → paint_id baked as NULL (validly paintless)
 *   SAFE-02: manual user-added steps (technique_step_id IS NULL) untouched
 */
```

**Mock setup + imports** (apply-technique.test.ts lines 13–29 — copy verbatim structure):
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createDbBridge,
} from "./db-helpers";

vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";

import { applyTechnique } from "@/db/queries/recipeTechniqueInstances";
import { detachTechniqueInstance } from "@/db/queries/recipeTechniqueDetach";
```

**Module-scoped vars + fixture builder** (apply-technique.test.ts lines 33–84 — copy pattern, extend for paint + progress):
```typescript
let db: Database.Database;
let recipeId: number;
let techniqueId: number;
let colourSlotId: number;
let techniqueStepId: number;
let paintId: number;    // paint used in slot fill
let instanceId: number; // set after applyTechnique

describe("detachTechniqueInstance (SAFE-02, SC#3)", () => {
  beforeEach(async () => {
    db = createHobbyforgeDb();
    // ... technique + section + slot + step fixture (mirrors apply-technique.test.ts) ...
    // ... insert paint row (FK constraint) ...
    // ... recipe = createTestRecipe(db) ...
    // ... applyTechnique to get instanceId (bridge → detach also uses bridge) ...
    // ... insert unit_recipe_step_progress row (prove SC#3) ...
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });
```

**Key assertions to write** (each in its own `it()` block, mirroring apply-technique.test.ts style):
```typescript
it("recipe_steps row survives detach with same id (SC#3)", async () => {
  const bridge = createDbBridge(db);
  await detachTechniqueInstance(bridge as never, instanceId);
  const step = db.prepare("SELECT id FROM recipe_steps WHERE id = ?").get(stepId);
  expect(step).toBeDefined();  // same id — not deleted
});

it("technique_step_id NULLed after detach", async () => { ... });

it("paint_id baked to resolved colour (not NULL) after detach", async () => { ... });

it("unit_recipe_step_progress row survives detach (SC#3)", async () => { ... });

it("recipe_sections.technique_instance_id NULLed after detach", async () => { ... });

it("recipe_technique_instances row deleted after detach", async () => { ... });

it("recipe_technique_slot_maps rows deleted after detach", async () => { ... });

it("unfilled slot: paint_id baked as NULL (validly paintless)", async () => { ... });

it("manual step (technique_step_id IS NULL) untouched by detach", async () => { ... });
```

---

## Shared Patterns

### Single DB Handle Contract
**Source:** `src/db/queries/recipeTechniqueResync.ts` header (lines 22–26) + type alias (line 78)
**Apply to:** `recipeTechniqueDetach.ts` and the modified `useDeleteTechnique` mutationFn
```typescript
// File header doc:
// SINGLE DB HANDLE CONTRACT: [function] MUST receive db from caller and NEVER call getDb() internally.
// tauri-plugin-sql uses sqlx::Pool<Sqlite>; a second getDb() call may land on a different pool
// connection and break auto-commit sequencing.

type DbHandle = Awaited<ReturnType<typeof getDb>>;
```

### React Query Mutation Shape
**Source:** `src/hooks/useTechniqueInstances.ts` `useApplyTechnique` (lines 92–101)
**Apply to:** `useDetachTechniqueInstance` in `useTechniqueDetach.ts`
```typescript
export function useXxx() {
  const qc = useQueryClient();
  return useMutation<ReturnType, Error, InputType>({
    mutationFn: ...,
    onSuccess: (_, variables) => { invalidateXxx(qc, variables.recipeId); },
  });
}
```

### AlertDialog Confirmation Pattern
**Source:** `src/features/recipes/RecipeSectionCard.tsx` (lines 278–293)
**Apply to:** `DetachConfirmDialog.tsx`
```typescript
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>…</AlertDialogTitle>
      <AlertDialogDescription>…</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>…</AlertDialogCancel>
      <AlertDialogAction onClick={onConfirm}>…</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Toast Feedback Pattern
**Source:** `src/features/techniques/TechniqueDeleteDialog.tsx` (lines 33–36)
**Apply to:** All mutation onSuccess/onError in DetachConfirmDialog and extended TechniqueDeleteDialog
```typescript
import { toast } from "sonner";
// success:
toast.success("Technique detached — now plain recipe content");
// error:
toast.error("Failed to detach technique. Please try again.");
```

### Prefix Invalidation for Multi-Recipe Writes
**Source:** `src/hooks/useTechniques.ts` `useUpdateTechnique` onSuccess (lines 133–140)
**Apply to:** `useDeleteTechnique` extended onSuccess (prefix, no recipeId — N recipes affected)
```typescript
// Prefix invalidation clears ALL per-recipe entries in the cache:
qc.invalidateQueries({ queryKey: ["recipe-sections"] });
qc.invalidateQueries({ queryKey: ["recipe-paints"] });
qc.invalidateQueries({ queryKey: ["slot-resolution-map"] });
qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
```

### Data-Layer Test Scaffolding
**Source:** `tests/data-layer/apply-technique.test.ts` (full file) + `tests/data-layer/technique-resync.test.ts` (lines 1–100)
**Apply to:** `tests/data-layer/technique-detach.test.ts`
```typescript
// @vitest-environment node
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";
// beforeEach: createHobbyforgeDb() + fixtures + vi.mocked(getDb).mockResolvedValue(createDbBridge(db))
// afterEach: db.close() + vi.clearAllMocks()
// Test bodies: db.prepare(...).get(id) assertions on raw SQLite rows
```

---

## No Analog Found

None. All 6 files have close analogs in the existing codebase.

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/features/recipes/`, `src/features/techniques/`, `tests/data-layer/`, `src/lib/`
**Files scanned:** 12 source files + 2 test files read directly
**Pattern extraction date:** 2026-06-23
