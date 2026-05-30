# Phase 105: Collection Integration - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/migrations/039_collection_udb_link.sql` | migration | batch | `src-tauri/migrations/037_override_flags.sql` | exact |
| `src/types/unit.ts` | model | — | `src/types/unit.ts` (self) | self-extend |
| `src/db/queries/units.ts` | service | CRUD | `src/db/queries/units.ts` (self) | self-extend |
| `src/db/queries/unitDatabase.ts` | service | request-response | `src/db/queries/diagnostics.ts` | role-match |
| `src/db/queries/diagnostics.ts` | service | request-response | `src/db/queries/diagnostics.ts` (self) | self-extend |
| `src/hooks/useUnitDatabase.ts` | hook | request-response | `src/hooks/useUnitDatabase.ts` (self) | self-extend |
| `src/hooks/useUnits.ts` | hook | request-response | `src/hooks/useUnits.ts` (self) | self-extend |
| `src/features/unit-database/UdbUnitRow.tsx` | component | request-response | `src/features/unit-database/UdbUnitRow.tsx` (self) | self-extend |
| `src/features/unit-database/UdbUnitList.tsx` | component | request-response | `src/features/unit-database/UdbUnitList.tsx` (self) | self-extend |
| `src/features/unit-database/UdbDatasheetSheet.tsx` | component | request-response | `src/features/unit-database/UdbDatasheetSheet.tsx` (self) | self-extend |
| `src/features/unit-database/DatabaseBrowserPage.tsx` | component | request-response | `src/features/unit-database/DatabaseBrowserPage.tsx` (self) | self-extend |
| `src/features/units/UnitSheet.tsx` | component | CRUD | `src/features/units/UnitSheet.tsx` (self) | self-extend |
| `tests/collection/udbCollectionLink.test.ts` | test | — | `tests/` (existing suite) | role-match |
| `tests/data-health/unlinkedUnitsDiagnostic.test.ts` | test | — | existing test files | role-match |

---

## Pattern Assignments

### `src-tauri/migrations/039_collection_udb_link.sql` (migration, batch)

**Analog:** `src-tauri/migrations/037_override_flags.sql`

**Core pattern — ALTER TABLE + index** (full file, lines 1-9):
```sql
-- 037_override_flags.sql pattern: additive ALTER TABLE with DEFAULT
ALTER TABLE units ADD COLUMN status_assembly_override INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN status_basing_override    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN status_varnished_override INTEGER NOT NULL DEFAULT 0;
```

**Apply to 039:** Follow the same additive-only ALTER TABLE pattern. Migration 039 adds columns to TWO tables (factions then units), then runs two UPDATE backfills, then creates an index:

```sql
-- 039_collection_udb_link.sql
-- Step 1: Bridge column on factions (needed by backfill subquery in Step 4)
ALTER TABLE factions ADD COLUMN wahapedia_faction_id TEXT;

-- Step 2: Backfill factions.wahapedia_faction_id by name match against udb_factions
UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(uf.name) = LOWER(factions.name)
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;

-- Step 3: FK column on units (nullable — custom units keep NULL)
ALTER TABLE units ADD COLUMN udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL;

-- Step 4: Best-effort backfill units by name + faction scope
UPDATE units
SET udb_unit_id = (
  SELECT uu.id
  FROM udb_units uu
  WHERE LOWER(uu.name) = LOWER(units.name)
    AND uu.faction_id = (
      SELECT f.wahapedia_faction_id
      FROM factions f
      WHERE f.id = units.faction_id
    )
  LIMIT 1
)
WHERE udb_unit_id IS NULL;

-- Step 5: Index for reverse join (ownership badge queries)
CREATE INDEX IF NOT EXISTS idx_units_udb_unit_id ON units(udb_unit_id);

PRAGMA user_version = 39;
```

**Key constraint:** SQLite FK enforcement is OFF by default — `client.ts` runs `PRAGMA foreign_keys = ON` on every connection, so the FK reference `REFERENCES udb_units(id)` is enforced at runtime but the backfill UPDATE will silently skip rows if `udb_units` is empty (fresh install). This is expected and harmless.

---

### `src/types/unit.ts` (model, extend)

**Analog:** `src/types/unit.ts` (self-extend)

**Current interface pattern** (lines 24-55):
```typescript
export interface Unit {
  id: number;
  faction_id: number;
  name: string;
  // ... 20+ fields ...
  status_assembly_override: 0 | 1;   // added by migration 037
  status_basing_override: 0 | 1;
  status_varnished_override: 0 | 1;
  created_at: string;
  updated_at: string;
}

export type CreateUnitInput = Omit<Unit, "id" | "created_at" | "updated_at">;
export type UpdateUnitInput = Partial<CreateUnitInput> & { id: number };
```

**Extension pattern — add new nullable field before `created_at`:**
```typescript
// Add after status_varnished_override, before created_at:
udb_unit_id: string | null;  // migration 039 — Phase 105 COL-02: FK to udb_units.id
```

`CreateUnitInput` and `UpdateUnitInput` automatically pick up `udb_unit_id` via the `Omit`/`Partial` pattern — no further type changes needed.

**Also add to `Faction` type** (in `src/types/faction.ts`):
```typescript
wahapedia_faction_id: string | null;  // migration 039 — Phase 105 faction bridge column
```

---

### `src/db/queries/units.ts` (service, CRUD, extend)

**Analog:** `src/db/queries/units.ts` (self-extend)

**Current createUnit INSERT pattern** (lines 43-71):
```typescript
export async function createUnit(input: CreateUnitInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO units (
       faction_id, name, category, unit_type, model_count, owned_count, points,
       status_assembly, status_painting, painting_percentage,
       status_basing, status_varnished, is_active_project,
       priority, target_completion_date, purchase_date, purchase_price_pence,
       storage_location, main_image_path, notes, lore_notes, undercoat
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10,
       $11, $12, $13,
       $14, $15, $16, $17,
       $18, $19, $20, $21, $22
     )`,
    [
      input.faction_id, input.name, input.category ?? null, input.unit_type ?? null,
      // ...22 positional params total
    ]
  );
  return result.lastInsertId ?? 0;
}
```

**Extension:** Add `udb_unit_id` as the 23rd column/param. Count all `$N` params carefully to avoid mismatch (TypeScript does not validate SQL strings):
```typescript
// Add to column list after "undercoat":
//   undercoat, udb_unit_id
// Add to VALUES after $22:
//   $22, $23
// Add to values array after input.undercoat ?? null:
//   input.udb_unit_id ?? null,
// Total: 23 positional parameters
```

**Current updateUnit SET pattern** (lines 73-118): Add `udb_unit_id = $27` using the COALESCE pattern:
```typescript
// After status_varnished_override = COALESCE($26, ...):
udb_unit_id = COALESCE($27, udb_unit_id),
// Add to values array: input.udb_unit_id ?? null
// Total: 27 positional parameters ($1 = id, $2-$27 = fields)
```

**Pitfall:** updateUnit uses `$1` for `id` and `$2...$N` for fields — the update body has 25 SET params + id = 26 total currently. Adding `udb_unit_id` makes it 27. Do NOT use `udb_unit_id = $27` with COALESCE here — use a plain assignment since NULL is a valid value that should be settable:
```sql
udb_unit_id = $27,   -- NOT COALESCE — NULL is valid (unlinking)
```

---

### `src/db/queries/unitDatabase.ts` (service, extend — add ownership query)

**Analog:** `src/db/queries/diagnostics.ts` (same aggregated GROUP BY pattern)

**Existing query structure pattern** (unitDatabase.ts lines 1-8):
```typescript
import { getDb } from "@/db/client";
// All queries target hobbyforge.db (udb_* tables)
// NEVER getRulesDb() from this file
```

**Existing `UdbUnitSummary` type** (lines 19-27):
```typescript
export interface UdbUnitSummary {
  id: string;
  faction_id: string;
  name: string;
  role: string | null;
  base_points: number | null;
  min_models: number | null;
  max_models: number | null;
}
```

**New type + query to add** — follow the same interface-then-async-function pattern established throughout the file:
```typescript
// Add after existing type definitions:
export interface UdbOwnershipEntry {
  udb_unit_id: string;
  owned_count: number;
  // GROUP_CONCAT of all status_painting values, pipe-delimited
  all_statuses: string;
}

export async function getUdbOwnershipByFaction(
  factionId: string,
): Promise<UdbOwnershipEntry[]> {
  const db = await getDb();
  return db.select<UdbOwnershipEntry[]>(
    `SELECT
       u.udb_unit_id,
       COUNT(*) AS owned_count,
       GROUP_CONCAT(u.status_painting, '|') AS all_statuses
     FROM units u
     JOIN udb_units uu ON uu.id = u.udb_unit_id
     WHERE uu.faction_id = $1
       AND u.udb_unit_id IS NOT NULL
     GROUP BY u.udb_unit_id`,
    [factionId],
  );
}
```

**Note on worst_status:** Do NOT use `MIN(status_painting)` — SQLite returns alphabetical minimum, not painting-progression minimum. Use `GROUP_CONCAT` and resolve in JS with `PAINTING_STATUS_ORDER.indexOf()`. See RESEARCH.md Pitfall 1.

---

### `src/db/queries/diagnostics.ts` (service, extend)

**Analog:** `src/db/queries/diagnostics.ts` (self-extend — follow `getOrphanedProgressRows` pattern exactly)

**Pattern to copy** (lines 102-118):
```typescript
export async function getOrphanedProgressRows(): Promise<DiagnosticFlag | null> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    `SELECT COUNT(*) as c
     FROM unit_recipe_step_progress p
     LEFT JOIN recipe_steps rs ON rs.id = p.recipe_step_id
     WHERE rs.id IS NULL`
  );
  const count = rows[0]?.c ?? 0;
  if (count === 0) return null;
  return {
    type: "orphaned_progress",
    count,
    description: `${count} orphaned progress rows -- tracking completion for steps that no longer exist`,
    severity: "warning",
  };
}
```

**New function to add** — identical structure, different query:
```typescript
export async function getUnlinkedUnitsCount(): Promise<DiagnosticFlag | null> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM units WHERE udb_unit_id IS NULL"
  );
  const count = rows[0]?.c ?? 0;
  if (count === 0) return null;
  return {
    type: "unlinked_units",
    count,
    description: `${count} collection unit${count !== 1 ? "s are" : " is"} not linked to the unit database`,
    severity: "warning",
  };
}
```

**getDiagnosticFlags aggregator** (lines 198-205): Add `getUnlinkedUnitsCount()` to the `Promise.all` array:
```typescript
export async function getDiagnosticFlags(): Promise<DiagnosticFlag[]> {
  const results = await Promise.all([
    getOrphanedProgressRows(),
    getAmbiguousPointMatches(),
    getUnmatchedPointsCount(),
    getUnlinkedUnitsCount(),  // Phase 105 COL-06
  ]);
  return results.filter((f): f is DiagnosticFlag => f !== null);
}
```

---

### `src/hooks/useUnitDatabase.ts` (hook, extend)

**Analog:** `src/hooks/useUnitDatabase.ts` (self-extend)

**Existing disabled-pattern** (lines 43-54):
```typescript
export function useUdbUnits(factionId: string | null) {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_UNITS_KEY(factionId)
        : (["udb-units", "disabled"] as const),
    queryFn: () =>
      factionId !== null ? getUdbUnitsByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,  // UDB content is static reference data
  });
}
```

**New hook to add — CRITICAL: use `staleTime: 0`, NOT `Infinity`:**
```typescript
export const UDB_OWNERSHIP_KEY = (factionId: string) =>
  ["udb-ownership", factionId] as const;

export function useUdbOwnership(factionId: string | null) {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_OWNERSHIP_KEY(factionId)
        : (["udb-ownership", "disabled"] as const),
    queryFn: () =>
      factionId !== null
        ? getUdbOwnershipByFaction(factionId)
        : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: 0,  // ownership data changes on unit create/delete — NOT Infinity
  });
}
```

**Add import:** `import { getUdbOwnershipByFaction } from "@/db/queries/unitDatabase";`

---

### `src/hooks/useUnits.ts` (hook, extend)

**Analog:** `src/hooks/useUnits.ts` (self-extend)

**Existing invalidation pattern in `useCreateUnit`** (lines 33-49):
```typescript
export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateUnitInput>({
    mutationFn: createUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNITS_KEY });
      qc.invalidateQueries({ queryKey: UNITS_ENRICHED_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
      qc.invalidateQueries({ queryKey: ["army-readiness"] });
    },
  });
}
```

**Extension:** Add UDB ownership invalidation to `useCreateUnit`, `useUpdateUnit`, and `useDeleteUnit` `onSuccess` handlers. Invalidate the entire `["udb-ownership"]` prefix (faction ID is not available in the mutation's `onSuccess`):
```typescript
// Add to onSuccess in all three mutations:
qc.invalidateQueries({ queryKey: ["udb-ownership"] });  // Phase 105 COL-04/07
```

---

### `src/features/unit-database/UdbUnitRow.tsx` (component, extend)

**Analog:** `src/features/unit-database/UdbUnitRow.tsx` (self-extend)

**Current component** (full file, 34 lines):
```typescript
import { Badge } from "@/components/ui/badge";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

interface UdbUnitRowProps {
  unit: UdbUnitSummary;
  onOpen: (id: string) => void;
}

export function UdbUnitRow({ unit, onOpen }: UdbUnitRowProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 h-10 hover:bg-secondary cursor-pointer transition-colors"
      onClick={() => onOpen(unit.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(unit.id);
        }
      }}
    >
      <span className="text-sm font-medium flex-1 truncate">{unit.name}</span>
      {unit.role && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {unit.role}
        </Badge>
      )}
      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right shrink-0">
        {unit.base_points !== null ? `from ${unit.base_points} pts` : "—"}
      </span>
    </div>
  );
}
```

**Extension:** Add `ownershipData` optional prop and badge rendering between role badge and points:
```typescript
import { PAINTING_STATUS_ORDER } from "@/types/unit";

interface OwnershipData {
  owned_count: number;
  all_statuses: string;  // pipe-delimited GROUP_CONCAT from query
}

interface UdbUnitRowProps {
  unit: UdbUnitSummary;
  onOpen: (id: string) => void;
  ownershipData?: OwnershipData | null;  // undefined = no badge (not owned)
}
```

**Badge rendering — insert before points span:**
```typescript
{ownershipData && ownershipData.owned_count > 0 && (
  <>
    <Badge variant="outline" className="text-xs shrink-0">
      Owned ×{ownershipData.owned_count}
    </Badge>
    <span
      className={`inline-block h-2 w-2 rounded-full shrink-0 ${resolveReadinessDotClass(ownershipData.all_statuses)}`}
      title={resolveReadinessLabel(ownershipData.all_statuses)}
    />
  </>
)}
```

**Pure helper functions** (no DB, no React — can live in same file or a colocated utility):
```typescript
// Use PAINTING_STATUS_ORDER to determine semantic worst status
const DONE_STATUSES = new Set(["Varnished", "Completed"]);
const BATTLE_READY = new Set(["Display Ready", "Battle Ready", "Details Done", "Highlighted"]);

function resolveWorstStatus(allStatuses: string): string {
  const statuses = allStatuses.split("|");
  return statuses.reduce((worst, s) => {
    const wi = PAINTING_STATUS_ORDER.indexOf(worst as typeof PAINTING_STATUS_ORDER[number]);
    const si = PAINTING_STATUS_ORDER.indexOf(s as typeof PAINTING_STATUS_ORDER[number]);
    return si < wi ? s : worst;
  }, statuses[0] ?? "Not Started");
}

function resolveReadinessDotClass(allStatuses: string): string {
  const worst = resolveWorstStatus(allStatuses);
  if (DONE_STATUSES.has(worst)) return "bg-green-500";
  if (worst === "Not Started") return "bg-muted-foreground/40";
  return "bg-amber-500";
}

function resolveReadinessLabel(allStatuses: string): string {
  const worst = resolveWorstStatus(allStatuses);
  if (DONE_STATUSES.has(worst)) return "All copies painted";
  if (worst === "Not Started") return "Not started";
  return `In progress (${worst})`;
}
```

---

### `src/features/unit-database/UdbUnitList.tsx` (component, extend)

**Analog:** `src/features/unit-database/UdbUnitList.tsx` (self-extend)

**Current UdbUnitRow render** (line 94):
```typescript
<UdbUnitRow unit={item.unit} onOpen={onOpenUnit} />
```

**Extension:** Accept `ownershipMap` prop and pass to each row:
```typescript
interface UdbUnitListProps {
  units: UdbUnitSummary[];
  isLoading: boolean;
  onOpenUnit: (id: string) => void;
  ownershipMap?: Map<string, { owned_count: number; all_statuses: string }>;  // NEW
}

// In the virtualizer render:
<UdbUnitRow
  unit={item.unit}
  onOpen={onOpenUnit}
  ownershipData={ownershipMap?.get(item.unit.id) ?? null}
/>
```

---

### `src/features/unit-database/DatabaseBrowserPage.tsx` (component, extend)

**Analog:** `src/features/unit-database/DatabaseBrowserPage.tsx` (self-extend)

**Current `selectedUnitId` state pattern** (lines 56, 109-115):
```typescript
const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
// ...
<UdbDatasheetSheet
  unitId={selectedUnitId}
  open={!!selectedUnitId}
  onOpenChange={(open) => {
    if (!open) setSelectedUnitId(null);
  }}
/>
```

**Extension — add UnitSheet state + ownership hook:**
```typescript
import { useState, useEffect, useMemo } from "react";
import { useUdbFactions, useUdbUnits, useUdbOwnership } from "@/hooks/useUnitDatabase";
import { useFactions } from "@/hooks/useFactions";
import { UnitSheet } from "@/features/units/UnitSheet";
import type { UnitFormValues } from "@/features/units/unitSchema";

// In component body, after existing state:
const [unitSheetOpen, setUnitSheetOpen] = useState(false);
const [unitSheetPrefill, setUnitSheetPrefill] = useState<Partial<UnitFormValues> | null>(null);
const [unitSheetUdbId, setUnitSheetUdbId] = useState<string | null>(null);

// Load collection factions for faction ID mapping
const { data: collectionFactions = [] } = useFactions();

// Ownership data — fetched once per faction view
const { data: ownershipEntries = [] } = useUdbOwnership(selectedFactionId);
const ownershipMap = useMemo(() => {
  const map = new Map<string, { owned_count: number; all_statuses: string }>();
  for (const entry of ownershipEntries) {
    map.set(entry.udb_unit_id, {
      owned_count: entry.owned_count,
      all_statuses: entry.all_statuses,
    });
  }
  return map;
}, [ownershipEntries]);

// "Add to Collection" callback — called by UdbDatasheetSheet
function handleAddToCollection(udbUnit: UdbUnitDetail) {
  // Map udb faction_id (text) to collection faction_id (integer)
  const collFaction = collectionFactions.find(
    (f) => f.wahapedia_faction_id === udbUnit.faction_id,
  );
  const basePoints = udbUnit.points[0]?.points ?? null;
  const minModels = udbUnit.composition[0]?.min_models ?? 1;

  setUnitSheetPrefill({
    faction_id: collFaction?.id ?? 0,
    name: udbUnit.name,
    category: udbUnit.role ?? "",
    points: basePoints,
    model_count: minModels,
  });
  setUnitSheetUdbId(udbUnit.id);
  setSelectedUnitId(null);  // close datasheet sheet first
  setUnitSheetOpen(true);
}
```

**Pass ownershipMap to UdbUnitList and add UnitSheet at end of JSX:**
```typescript
<UdbUnitList
  units={filteredUnits}
  isLoading={unitsLoading}
  onOpenUnit={(id) => setSelectedUnitId(id)}
  ownershipMap={ownershipMap}
/>

// After UdbDatasheetSheet:
<UnitSheet
  open={unitSheetOpen}
  unit={null}
  prefill={unitSheetPrefill ?? undefined}
  prefillUdbUnitId={unitSheetUdbId}
  onClose={() => {
    setUnitSheetOpen(false);
    setUnitSheetPrefill(null);
    setUnitSheetUdbId(null);
  }}
/>
```

---

### `src/features/unit-database/UdbDatasheetSheet.tsx` (component, extend)

**Analog:** `src/features/unit-database/UdbDatasheetSheet.tsx` (self-extend)

**Current props interface** (lines 24-28):
```typescript
interface UdbDatasheetSheetProps {
  unitId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Extension — add callback prop:**
```typescript
interface UdbDatasheetSheetProps {
  unitId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCollection?: (unit: UdbUnitDetail) => void;  // NEW — Phase 105 COL-01
}
```

**"Add to Collection" button — add inside the `!isLoading && unit &&` block, after `<SheetHeader>`:**
```typescript
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// In SheetHeader, after the role Badge:
{onAddToCollection && unit && (
  <Button
    type="button"
    variant="default"
    size="sm"
    className="w-full mt-2"
    onClick={() => onAddToCollection(unit)}
  >
    <Plus className="h-4 w-4 mr-2" />
    Add to Collection
  </Button>
)}
```

The `UdbUnitDetail` type is what `useUdbUnitDetail` returns — it already contains `points`, `composition`, `faction_id`, `name`, `role`.

---

### `src/features/units/UnitSheet.tsx` (component, extend)

**Analog:** `src/features/units/UnitSheet.tsx` (self-extend)

**Current props interface** (lines 23-28):
```typescript
interface UnitSheetProps {
  open: boolean;
  unit: Unit | EnrichedUnit | null;
  defaultFactionId?: number;
  onClose: () => void;
}
```

**Extension:**
```typescript
interface UnitSheetProps {
  open: boolean;
  unit: Unit | EnrichedUnit | null;
  defaultFactionId?: number;
  prefill?: Partial<UnitFormValues>;         // NEW — Phase 105 COL-01: pre-fill from DB entry
  prefillUdbUnitId?: string | null;          // NEW — Phase 105 COL-02: stored separately, not in form schema
  onClose: () => void;
}
```

**`buildDefaultValues` extension** (lines 35-82) — apply prefill only when `unit === null`:
```typescript
function buildDefaultValues(
  unit: Unit | null,
  defaultFactionId?: number,
  prefill?: Partial<UnitFormValues>,
): UnitFormValues {
  if (unit) {
    return { /* existing edit-mode logic unchanged */ };
  }
  // Create mode: start from empty defaults, then overlay prefill
  const empty: UnitFormValues = {
    faction_id: defaultFactionId ?? 0,
    name: "",
    category: "",
    model_count: null,
    // ... all existing empty defaults ...
  };
  return { ...empty, ...prefill };
}
```

**`useEffect` reset** — add `prefill` dependency:
```typescript
useEffect(() => {
  form.reset(buildDefaultValues(unit, defaultFactionId, prefill));
}, [unit, defaultFactionId, prefill]);  // prefill added
```

**`onSubmit` — include `udb_unit_id` in payload** (after existing payload construction):
```typescript
const payload = {
  // ...existing fields...
  udb_unit_id: isEdit ? (unit as Unit).udb_unit_id ?? null : prefillUdbUnitId ?? null,
};
```

**"Database Link" display field** — add to the SheetHeader or above the form fields, read-only:
```typescript
{(unit?.udb_unit_id || prefillUdbUnitId) ? (
  <p className="text-xs text-muted-foreground px-4 pb-0">
    Linked to unit database
  </p>
) : (
  <p className="text-xs text-muted-foreground px-4 pb-0">
    Custom unit — not linked to database
  </p>
)}
```

---

### Test files (test, unit)

**Analog:** Existing test files in `tests/` using `vi.mock("@/db/client")`

**Pattern for `tests/collection/udbCollectionLink.test.ts`:**
- Mock `@/db/client` with `vi.mock`
- Test `getUdbOwnershipByFaction` returns correct shaped data
- Test `resolveWorstStatus` / `resolveReadinessDotClass` pure functions
- Test that `Unit` type accepts `udb_unit_id: string | null`

**Pattern for `tests/data-health/unlinkedUnitsDiagnostic.test.ts`:**
- Mock `@/db/client` with `vi.mock`
- Test `getUnlinkedUnitsCount` returns `null` when count = 0
- Test `getUnlinkedUnitsCount` returns correct `DiagnosticFlag` when count > 0

---

## Shared Patterns

### `$1, $2` positional SQL parameters
**Source:** `src/db/queries/units.ts` (all functions)
**Apply to:** `getUdbOwnershipByFaction`, `getUnlinkedUnitsCount`
```typescript
// Correct: positional $1, $2 syntax required by Tauri plugin-sql
return db.select<T[]>("SELECT ... WHERE faction_id = $1", [factionId]);
// Wrong: named params (@param) or ? placeholders
```

### Boolean storage as `0 | 1` integers
**Source:** `src/db/queries/units.ts` lines 62-66
**Apply to:** Any new SQL reading unit boolean fields
```typescript
input.status_assembly ? 1 : 0,   // write: boolean → integer
!!unit.status_assembly,            // read: integer → boolean
```

### Disabled query pattern (null-guarded hook)
**Source:** `src/hooks/useUnitDatabase.ts` lines 43-54
**Apply to:** `useUdbOwnership` — must be disabled when `factionId` is null
```typescript
queryKey: factionId !== null ? UDB_OWNERSHIP_KEY(factionId) : (["udb-ownership", "disabled"] as const),
enabled: !!factionId,
```

### React Query cache invalidation cascade
**Source:** `src/hooks/useUnits.ts` lines 33-49
**Apply to:** `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit` — add `["udb-ownership"]` to each `onSuccess`
```typescript
qc.invalidateQueries({ queryKey: ["udb-ownership"] });  // invalidates all factions
```

### `DiagnosticFlag` shape
**Source:** `src/db/queries/diagnostics.ts` lines 27-32
**Apply to:** `getUnlinkedUnitsCount` return value
```typescript
export interface DiagnosticFlag {
  type: string;
  count: number;
  description: string;
  severity: "warning" | "info";  // "unlinked_units" uses "warning"
}
```

### Page-level Map anti-N+1
**Source:** RESEARCH.md Pattern 2 (established in Rules Hub annotations)
**Apply to:** `DatabaseBrowserPage` — build `ownershipMap` from `useUdbOwnership` data once, pass to `UdbUnitList` → `UdbUnitRow`
```typescript
const ownershipMap = useMemo(() => {
  const map = new Map<string, OwnershipData>();
  for (const entry of ownershipEntries) map.set(entry.udb_unit_id, entry);
  return map;
}, [ownershipEntries]);
```

---

## No Analog Found

All files have clear analogs or are self-extensions of existing files. No greenfield patterns required.

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/features/unit-database/`, `src/features/units/`, `src/features/data-health/`, `src-tauri/migrations/`, `src/types/`
**Files read:** 12 source files
**Pattern extraction date:** 2026-05-30
