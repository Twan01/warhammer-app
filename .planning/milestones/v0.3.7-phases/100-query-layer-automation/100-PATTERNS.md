# Phase 100: Query-Layer Automation - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 6 (1 new migration, 4 modified source files, 1 new test file + 1 extended test file)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/migrations/037_override_flags.sql` | migration | batch | `src-tauri/migrations/008_enrichment.sql` | exact |
| `src/types/recipeSection.ts` | config/types | transform | `src/types/unit.ts` (const array pattern) | exact |
| `src/types/unit.ts` | model | transform | self — extend existing Unit interface | exact |
| `src/db/queries/recipeAssignments.ts` | service | CRUD | self — extend existing functions in-place | exact |
| `src/db/queries/units.ts` | service | CRUD | self — extend updateUnit() positional params | exact |
| `src/features/units/StatusPopover.tsx` | component | request-response | self — extend existing mutation payload | exact |
| `tests/painting/recipeAssignments.test.ts` | test | — | self — extend existing test groups | exact |
| `tests/painting/syncDerivedStatuses.test.ts` | test | — | `tests/painting/recipeAssignments.test.ts` | exact |

---

## Pattern Assignments

### `src-tauri/migrations/037_override_flags.sql` (migration, batch)

**Analog:** `src-tauri/migrations/008_enrichment.sql`

**Full analog** (`008_enrichment.sql`, lines 1–9):
```sql
-- 008_enrichment.sql — HobbyForge v2.2 Phase 17 (ENRCH-01..04)
-- Adds lore_notes + undercoat on units, lore_notes on factions,
-- purchase_date on paints. Additive only: ALTER TABLE ADD COLUMN.
-- All columns are TEXT NULL — no defaults, no NOT NULL constraints.

ALTER TABLE units    ADD COLUMN lore_notes    TEXT;
ALTER TABLE units    ADD COLUMN undercoat     TEXT;
ALTER TABLE factions ADD COLUMN lore_notes    TEXT;
ALTER TABLE paints   ADD COLUMN purchase_date TEXT;
```

**Pattern to copy:** Same header comment, same ALTER TABLE ADD COLUMN structure. For override columns use `INTEGER NOT NULL DEFAULT 0` (not TEXT NULL) so every existing unit defaults to auto-derivation enabled.

**New migration shape:**
```sql
-- 037_override_flags.sql
-- Adds manual-override guard columns for assembly/basing/varnished auto-derivation (SAD-04).
-- DEFAULT 0 means all existing units start with auto-derivation enabled.
-- Additive only: ALTER TABLE ADD COLUMN.

ALTER TABLE units ADD COLUMN status_assembly_override  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN status_basing_override    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN status_varnished_override INTEGER NOT NULL DEFAULT 0;
```

---

### `src/types/recipeSection.ts` (config/types, transform)

**Analog:** self — the `SECTION_TYPES` const array at lines 5–7

**Current const array** (lines 5–7):
```typescript
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "detail", "effect", "finishing",
] as const;
export type SectionType = typeof SECTION_TYPES[number];
```

**Pattern:** Extend the array inline on the same line or split across two lines. D-04 adds `'assembly'`, `'basing'`, `'varnish'` — 10 total values. No other code changes needed in this file.

**Check before extending:** Grep for `SectionType` usage in switch/case contexts to confirm no exhaustive switch exists. The research confirms there are none (dropdown-only usage), but verify.

---

### `src/types/unit.ts` (model, transform)

**Analog:** existing `Unit` interface, lines 24–51

**Current boolean field pattern** (lines 34–39):
```typescript
// SQLite stores booleans as INTEGER 0/1 (Pitfall 1)
status_assembly: 0 | 1;
status_painting: PaintingStatus;
painting_percentage: number;
status_basing: 0 | 1;
status_varnished: 0 | 1;
is_active_project: 0 | 1;
```

**Pattern to copy:** Same `0 | 1` union type for booleans stored as SQLite integers. Add after `status_varnished`:
```typescript
status_assembly_override: 0 | 1;   // migration 037 — Phase 100 SAD-04
status_basing_override: 0 | 1;
status_varnished_override: 0 | 1;
```

**Type cascade:** `CreateUnitInput` is `Omit<Unit, "id" | "created_at" | "updated_at">` — the three new fields automatically appear in `CreateUnitInput` and `UpdateUnitInput`. SQLite DEFAULT 0 handles new rows without requiring explicit values in the INSERT (see Open Question 2 in RESEARCH.md). Verify that `createUnit()` does not break TypeScript strict mode after this addition.

---

### `src/db/queries/recipeAssignments.ts` (service, CRUD)

**Analog:** self — four functions to extend in-place

#### A. `syncDerivedStatuses()` — full current implementation (lines 211–272)

**Current SELECT** (lines 212–213):
```typescript
const unitRows = await db.select<{ painting_percentage: number }[]>(
  "SELECT painting_percentage FROM units WHERE id = $1",
  [unitId],
);
```
**Change:** Add the three override columns to this SELECT so they are read in one round-trip:
```typescript
const unitRows = await db.select<{
  painting_percentage: number;
  status_assembly_override: number;
  status_basing_override: number;
  status_varnished_override: number;
}[]>(
  "SELECT painting_percentage, status_assembly_override, status_basing_override, status_varnished_override FROM units WHERE id = $1",
  [unitId],
);
```

**Current basing pattern** (lines 229–246 — exact shape to replicate for assembly):
```typescript
const basingRows = await db.select<{ incomplete: number }[]>(
  `SELECT COUNT(*) AS incomplete
   FROM recipe_steps rs
   JOIN recipe_sections sec ON sec.id = rs.section_id
   JOIN unit_recipe_assignments a ON a.recipe_id = rs.recipe_id AND a.unit_id = $1
   LEFT JOIN unit_recipe_step_progress sp ON sp.assignment_id = a.id AND sp.recipe_step_id = rs.id
   WHERE LOWER(sec.name) LIKE '%basing%'
     AND (sp.completed IS NULL OR sp.completed = 0)`,
  [unitId],
);
const hasBasingSections = await db.select<{ cnt: number }[]>(
  `SELECT COUNT(*) AS cnt
   FROM recipe_sections sec
   JOIN unit_recipe_assignments a ON a.recipe_id = sec.recipe_id AND a.unit_id = $1
   WHERE LOWER(sec.name) LIKE '%basing%'`,
  [unitId],
);
const basing = (hasBasingSections[0]?.cnt ?? 0) > 0 && (basingRows[0]?.incomplete ?? 1) === 0 ? 1 : 0;
```

**SAD-02 change:** Replace `LOWER(sec.name) LIKE '%basing%'` with dual-path in both queries:
```sql
WHERE (sec.section_type = 'basing'
   OR (sec.section_type IS NULL AND LOWER(sec.name) LIKE '%basing%'))
```
Same dual-path for varnish replacing `LIKE '%varnish%'`.

**SAD-01 assembly check:** Add identical block before basing check, substituting `'assembly'`/`'%assembly%'` and computing `const assembly = ...`.

**Override guard pattern** — wrap each derived value before the final UPDATE:
```typescript
const assembly = (!unitRows[0].status_assembly_override) ? derivedAssembly : undefined;
const basing   = (!unitRows[0].status_basing_override)   ? derivedBasing   : undefined;
const varnished = (!unitRows[0].status_varnished_override) ? derivedVarnished : undefined;
```

**Current final UPDATE** (lines 268–271):
```typescript
await db.execute(
  `UPDATE units SET status_painting = $2, status_basing = $3, status_varnished = $4, updated_at = datetime('now') WHERE id = $1`,
  [unitId, status, basing, varnished],
);
```
**Change:** Add `status_assembly` to the UPDATE, use COALESCE to skip override-guarded fields, and add auto-clear of `is_active_project` at 100%. See Shared Patterns section for the full UPDATE shape.

#### B. `createAssignment()` — lines 96–104

**Current implementation** (lines 98–103):
```typescript
const result = await db.execute(
  "INSERT INTO unit_recipe_assignments (unit_id, recipe_id) VALUES ($1, $2)",
  [input.unit_id, input.recipe_id],
);
await syncPaintingPercentageByUnitId(db, input.unit_id);
return result.lastInsertId ?? 0;
```

**APL-01 change:** Add one `db.execute()` after the INSERT and before `syncPaintingPercentageByUnitId`:
```typescript
await db.execute(
  "UPDATE units SET is_active_project = 1, updated_at = datetime('now') WHERE id = $1",
  [input.unit_id],
);
```

#### C. `bulkCreateAssignments()` — lines 167–179

**Current loop body** (lines 172–178):
```typescript
for (const unitId of unitIds) {
  await db.execute(
    "INSERT OR IGNORE INTO unit_recipe_assignments (unit_id, recipe_id) VALUES ($1, $2)",
    [unitId, recipeId],
  );
  await syncPaintingPercentageByUnitId(db, unitId);
}
```

**APL-01 change:** Add same `UPDATE units SET is_active_project = 1` after INSERT, before syncPaintingPercentageByUnitId. This changes execute call count from 2 to 3 per unitId — existing test at line 217 asserts `toHaveBeenCalledTimes(6)` for 3 unitIds, must be updated to `9`.

---

### `src/db/queries/units.ts` (service, CRUD)

**Analog:** self — `updateUnit()` lines 73–114

**Current UPDATE SQL** ends at `$23` (`undercoat`). After migration 037 adds three override columns, `updateUnit()` must handle them so StatusPopover can write override flags.

**Current last params** (lines 98, 110–111):
```typescript
            undercoat               = $23,
// ...
      input.undercoat ?? null,
```

**Pattern to extend** — add three new positional params at $24, $25, $26:
```typescript
// In SQL:
            status_assembly_override  = COALESCE($24, status_assembly_override),
            status_basing_override    = COALESCE($25, status_basing_override),
            status_varnished_override = COALESCE($26, status_varnished_override),

// In params array (after input.undercoat ?? null):
      input.status_assembly_override ?? null,
      input.status_basing_override ?? null,
      input.status_varnished_override ?? null,
```

Note: COALESCE allows callers that don't pass override flags to leave them unchanged — consistent with the existing COALESCE pattern for all other fields.

---

### `src/features/units/StatusPopover.tsx` (component, request-response)

**Analog:** self — `handleSelect()` lines 27–48

**Current mutation call** (lines 40–47):
```typescript
updateUnit.mutate(
  { id: unit.id, status_painting: newStatus },
  {
    onError: () => {
      qc.setQueryData(UNITS_KEY, previous);
      toast.error("Status update failed. The change has been reverted.");
    },
  }
);
```

**D-02 change:** StatusPopover handles `status_painting` only. The UI surfaces for `status_assembly`, `status_basing`, `status_varnished` (likely boolean toggles in UnitSheet or a separate component) must pass the override flag. When any of those boolean statuses is manually set, the same mutation pattern applies:
```typescript
updateUnit.mutate(
  {
    id: unit.id,
    status_assembly: newValue,
    status_assembly_override: 1,   // D-02: mark as user-controlled
  },
  { onError: () => { /* rollback + toast */ } }
);
```

**Important:** The planner must locate all UI surfaces that write `status_assembly`, `status_basing`, `status_varnished` (not just StatusPopover — see Open Question 1 in RESEARCH.md). The pattern is the same for each: add the corresponding `_override: 1` field to the mutation input.

**Optimistic cache update pattern** (lines 32–38) — copy for boolean status surfaces:
```typescript
const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
  old?.map((u) =>
    u.id === unit.id ? { ...u, status_assembly: newValue, status_assembly_override: 1 } : u
  ) ?? []
);
```

---

### `tests/painting/syncDerivedStatuses.test.ts` (test, new file)

**Analog:** `tests/painting/recipeAssignments.test.ts` — exact template

**Mock setup pattern** (lines 1–51 of analog):
```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";

const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import { syncDerivedStatuses_TEST } from "@/db/queries/recipeAssignments";
// NOTE: syncDerivedStatuses is currently unexported — exporting it (or a testable wrapper)
// is required. Planner decision: export the function or expose it via a thin wrapper.

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});
```

**SQL assertion pattern** (from analog lines 119–128):
```typescript
it("INSERT contains unit_id, recipe_id columns and $1, $2 placeholders", async () => {
  await createAssignment({ unit_id: 1, recipe_id: 2 });
  const [sql, params] = executeMock.mock.calls[0];
  expect(sql).toContain("...");
  expect(params).toEqual([...]);
});
```

**selectMock multi-call sequence pattern** — use `mockResolvedValueOnce` chaining for the multi-SELECT path in `syncDerivedStatuses`:
```typescript
// First call returns unit row with override flags:
selectMock.mockResolvedValueOnce([{
  painting_percentage: 100,
  status_assembly_override: 0,
  status_basing_override: 0,
  status_varnished_override: 0,
}]);
// Second call: assignment existence check
selectMock.mockResolvedValueOnce([{ id: 1 }]);
// Subsequent calls: section count and incomplete step queries
selectMock.mockResolvedValueOnce([{ cnt: 1 }]);  // hasAssemblySections
selectMock.mockResolvedValueOnce([{ incomplete: 0 }]); // assemblyRows
// ... etc
```

**Test groups to write:**
1. SAD-01: assembly complete → `status_assembly = 1`; assembly incomplete → stays 0; no assembly sections → stays 0
2. SAD-02: `section_type = 'basing'` triggers basing; `section_type IS NULL + LIKE` triggers basing (backward compat); same for varnish
3. SAD-04: `status_assembly_override = 1` skips assembly write; `status_basing_override = 1` skips basing write; override = 0 allows write
4. APL-02: `painting_percentage = 100` triggers `is_active_project = 0` in UPDATE
5. APL-03: `syncDerivedStatuses` does NOT set `is_active_project = 1` (that is only in `createAssignment`)

---

### `tests/painting/recipeAssignments.test.ts` (test, extend existing)

**Pitfall 3 fix:** Group 8 line 217 asserts `toHaveBeenCalledTimes(6)` for 3 unitIds. After adding `UPDATE units SET is_active_project = 1` per unitId, this becomes `toHaveBeenCalledTimes(9)`. Update the assertion and add a new assertion verifying the UPDATE SQL appears once per unitId.

**APL-01 tests to add to Group 4 (createAssignment):**
```typescript
it("sets is_active_project = 1 on the target unit after INSERT", async () => {
  await createAssignment({ unit_id: 5, recipe_id: 3 });
  const allSqls = executeMock.mock.calls.map(([sql]: [string]) => sql);
  expect(allSqls.some((sql: string) => sql.includes("is_active_project = 1"))).toBe(true);
});
```

---

## Shared Patterns

### Boolean 0|1 Column Write
**Source:** `src/db/queries/units.ts` lines 62–63, `src/db/queries/recipeAssignments.ts` line 150
**Apply to:** All new boolean column writes (override flags, is_active_project)
```typescript
// On write: ternary to integer
input.status_assembly ? 1 : 0
// Or for literal true: pass 1 directly
await db.execute("UPDATE units SET is_active_project = 1 ...", [...]);
// On read: typed as 0 | 1 in the interface, no cast needed
```

### Parameterized Query Positional Syntax
**Source:** `src/db/queries/units.ts` lines 75–113, `src/db/queries/recipeAssignments.ts` lines 98–101
**Apply to:** All new SQL in this phase
```typescript
// Always $1, $2, $3... — never named params or template literal interpolation
await db.execute("UPDATE units SET col = $2 WHERE id = $1", [id, value]);
```

### COALESCE Partial Update Pattern
**Source:** `src/db/queries/units.ts` lines 76–98 (`updateUnit` SQL)
**Apply to:** Adding override columns to `updateUnit()` SQL
```typescript
// Existing fields use COALESCE to skip null params:
status_assembly = COALESCE($9, status_assembly),
// Override columns follow the same pattern at $24, $25, $26
status_assembly_override = COALESCE($24, status_assembly_override),
```

### syncDerivedStatuses Final UPDATE
**Source:** `src/db/queries/recipeAssignments.ts` lines 268–271
**Apply to:** The modified UPDATE in `syncDerivedStatuses()` after Phase 100 changes
**Extended shape (add status_assembly + conditional is_active_project auto-clear):**
```typescript
await db.execute(
  `UPDATE units
   SET status_painting    = $2,
       status_assembly    = CASE WHEN $3 IS NOT NULL THEN $3 ELSE status_assembly END,
       status_basing      = CASE WHEN $4 IS NOT NULL THEN $4 ELSE status_basing END,
       status_varnished   = CASE WHEN $5 IS NOT NULL THEN $5 ELSE status_varnished END,
       is_active_project  = CASE WHEN $6 = 1 THEN 0 ELSE is_active_project END,
       updated_at         = datetime('now')
   WHERE id = $1`,
  [
    unitId,
    status,
    assembly,      // null if override=1 (skip write)
    basing,        // null if override=1
    varnished,     // null if override=1
    pct === 100 ? 1 : 0,  // auto-clear trigger
  ],
);
```
Note: Alternative implementation passes computed integer values with override guards applied before the execute call — either approach is valid; prefer whichever keeps the SQL simpler. The planner picks the approach.

### Optimistic Cache Update + Error Rollback
**Source:** `src/features/units/StatusPopover.tsx` lines 32–48
**Apply to:** Any UI surface that adds override flag writes to existing mutation calls
```typescript
const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
  old?.map((u) => u.id === unit.id ? { ...u, ...patch } : u) ?? []
);
updateUnit.mutate(patch, {
  onError: () => {
    qc.setQueryData(UNITS_KEY, previous);
    toast.error("Status update failed. The change has been reverted.");
  },
});
```

---

## No Analog Found

All files in this phase have strong existing analogs within the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/types/`, `src/features/units/`, `src-tauri/migrations/`, `tests/painting/`
**Files scanned:** 8 source files read in full
**Migration count confirmed:** 036 is last — `037_override_flags.sql` is correct next filename
**updateUnit param count confirmed:** Ends at `$23` (undercoat) — override flags will be `$24`, `$25`, `$26`
**Pattern extraction date:** 2026-05-28
