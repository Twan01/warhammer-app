# Phase 68: Infrastructure Quick Wins - Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 7 (5 source + 2 test)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/queries/recipeSections.ts` | query module | CRUD | `src/db/queries/recipeSections.ts` itself (in-place fix) | exact |
| `src/db/queries/recipePaints.ts` | query module | CRUD | `src/db/queries/recipeSections.ts` (same JOIN pattern exists in `getRecipeSwatchColors`) | exact |
| `src/db/queries/recipes.ts` | query module | CRUD | `src/db/queries/recipeSections.ts` (section INSERT already has 10-column pattern in `createRecipeSection`) | exact |
| `tests/painting/recipeSections.test.ts` | test | — | `tests/painting/duplicateRecipe.test.ts` (same mock setup, SQL assertion style) | exact |
| `tests/painting/duplicateRecipe.test.ts` | test | — | `tests/painting/recipeSections.test.ts` (same mock setup, SQL assertion style) | exact |
| `package.json` | config | — | `src-tauri/tauri.conf.json` (parallel version field) | role-match |
| `src-tauri/tauri.conf.json` | config | — | `package.json` (parallel version field) | role-match |

---

## Pattern Assignments

### `src/db/queries/recipeSections.ts` — `updateRecipeSection` (REC-03 fix)

**Change:** Lines 59–62 — remove `COALESCE` from 4 workflow metadata fields.

**Current buggy pattern** (lines 52–77 of `src/db/queries/recipeSections.ts`):
```typescript
await db.execute(
  `UPDATE recipe_sections
   SET name = COALESCE($2, name),
       surface = $3,
       optional = COALESCE($4, optional),
       order_index = COALESCE($5, order_index),
       notes = $6,
       section_type = COALESCE($7, section_type),   // BUG — blocks null from clearing
       technique = COALESCE($8, technique),          // BUG
       execution_mode = COALESCE($9, execution_mode), // BUG
       applies_to = COALESCE($10, applies_to),       // BUG
       updated_at = datetime('now')
   WHERE id = $1`,
  [
    input.id,
    input.name ?? null,
    input.surface ?? null,
    input.optional ?? null,
    input.order_index ?? null,
    input.notes ?? null,
    input.section_type ?? null,
    input.technique ?? null,
    input.execution_mode ?? null,
    input.applies_to ?? null,
  ],
);
```

**Copy this fixed pattern** — direct assignment for clearable fields (`surface` and `notes` already use this; extend to `$7–$10`):
```typescript
// src/db/queries/recipeSections.ts lines 55, 58 — the existing correct model:
surface = $3,         // direct assignment: null means "clear to null"
notes = $6,           // direct assignment: null means "clear to null"

// Apply the same pattern to $7–$10:
section_type = $7,
technique = $8,
execution_mode = $9,
applies_to = $10,
```

**Rule:** Use `COALESCE($N, column)` only when the caller passing `null` means "don't touch this field" (e.g., `name`, `optional`, `order_index`). Use direct assignment `column = $N` when null is a valid user intent (clearing the field).

---

### `src/db/queries/recipePaints.ts` — `getRecipePaintsByRecipe` (REC-05 fix)

**Change:** Lines 6–9 — add `LEFT JOIN recipe_sections` and section-aware `ORDER BY`.

**Current buggy pattern** (lines 4–10 of `src/db/queries/recipePaints.ts`):
```typescript
export async function getRecipePaintsByRecipe(recipeId: number): Promise<RecipeStep[]> {
  const db = await getDb();
  return db.select<RecipeStep[]>(
    "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC",
    [recipeId]
  );
}
```

**Copy this fixed pattern** — section-aware ORDER BY with LEFT JOIN and COALESCE sentinel for unsectioned steps:
```typescript
export async function getRecipePaintsByRecipe(recipeId: number): Promise<RecipeStep[]> {
  const db = await getDb();
  return db.select<RecipeStep[]>(
    `SELECT rs.*
     FROM recipe_steps rs
     LEFT JOIN recipe_sections s ON s.id = rs.section_id
     WHERE rs.recipe_id = $1
     ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC`,
    [recipeId]
  );
}
```

**Why `COALESCE(s.order_index, 999999)`:** SQLite sorts NULLs first in ASC order. Steps with no `section_id` (legacy unsectioned recipes) produce a NULL join result — the sentinel `999999` sends them to the end of the list instead of the beginning.

**Analog for the JOIN pattern** — `getRecipeSwatchColors` in the same file (lines 72–81) shows the project's established JOIN style:
```typescript
// src/db/queries/recipePaints.ts lines 74–80
return db.select<RecipeSwatchEntry[]>(
  `SELECT rp.recipe_id, rp.paint_id, p.hex_color
   FROM recipe_steps rp
   JOIN paints p ON p.id = rp.paint_id
   ORDER BY rp.recipe_id ASC, rp.order_index ASC`,
  [],
);
```

---

### `src/db/queries/recipes.ts` — `duplicateRecipe` (REC-05 + D-09 fix)

**Change 1 (D-09):** Lines 158–163 — section INSERT is missing 4 workflow metadata columns.

**Current buggy section INSERT** (lines 158–163 of `src/db/queries/recipes.ts`):
```typescript
const sectionResult = await db.execute(
  `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [newRecipeId, section.name, section.surface, section.optional, section.order_index, section.notes ?? null]
);
```

**Copy this fixed pattern** — the 10-column INSERT already exists in `createRecipeSection` (lines 25–42 of `recipeSections.ts`):
```typescript
// Analog: src/db/queries/recipeSections.ts lines 25-41 (createRecipeSection)
const result = await db.execute(
  `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes, section_type, technique, execution_mode, applies_to)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
  [
    input.recipe_id,
    input.name,
    input.surface ?? null,
    input.optional,
    input.order_index,
    input.notes ?? null,
    input.section_type ?? null,
    input.technique ?? null,
    input.execution_mode ?? null,
    input.applies_to ?? null,
  ],
);
```

**Applied to `duplicateRecipe` section copy:**
```typescript
const sectionResult = await db.execute(
  `INSERT INTO recipe_sections
   (recipe_id, name, surface, optional, order_index, notes,
    section_type, technique, execution_mode, applies_to)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
  [
    newRecipeId, section.name, section.surface, section.optional,
    section.order_index, section.notes ?? null,
    section.section_type ?? null, section.technique ?? null,
    section.execution_mode ?? null, section.applies_to ?? null,
  ]
);
```

**Change 2 (REC-05):** Lines 167–170 — step SELECT is not section-aware.

**Current buggy step SELECT** (lines 167–170 of `src/db/queries/recipes.ts`):
```typescript
const steps = await db.select<RecipeStep[]>(
  "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC",
  [originalId]
);
```

**Fixed pattern** — identical to `getRecipePaintsByRecipe` fix above:
```typescript
const steps = await db.select<RecipeStep[]>(
  `SELECT rs.*
   FROM recipe_steps rs
   LEFT JOIN recipe_sections s ON s.id = rs.section_id
   WHERE rs.recipe_id = $1
   ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC`,
  [originalId]
);
```

---

### `tests/painting/recipeSections.test.ts` — Group 3 update (REC-03)

**Change:** Lines 204–224 — Group 3 test "UPDATE uses COALESCE for workflow metadata $7-$10" asserts the buggy COALESCE behavior. After the fix this test must be inverted.

**Current test that will break** (lines 204–224):
```typescript
it("UPDATE uses COALESCE for workflow metadata $7-$10 and has 10 params total", async () => {
  // ...
  expect(sql).toContain("COALESCE($7, section_type)");
  expect(sql).toContain("COALESCE($8, technique)");
  expect(sql).toContain("COALESCE($9, execution_mode)");
  expect(sql).toContain("COALESCE($10, applies_to)");
  // ...
});
```

**Copy this replacement pattern** — model is the existing test at lines 226–236 (direct assignment assertion):
```typescript
it("surface and notes use direct assignment (not COALESCE) to allow clearing", async () => {
  const input: UpdateRecipeSectionInput = { id: 3, surface: null, notes: null };
  await updateRecipeSection(input);
  const [sql] = executeMock.mock.calls[0];
  // surface and notes should NOT appear inside COALESCE
  expect(sql).not.toContain("COALESCE($3");
  expect(sql).not.toContain("COALESCE($6");
  // but they must appear as direct assignments
  expect(sql).toContain("surface = $3");
  expect(sql).toContain("notes = $6");
});
```

**New test to add** (parallel to the surface/notes test, for workflow metadata fields):
```typescript
it("workflow metadata fields use direct assignment (not COALESCE) to allow clearing", async () => {
  const input: UpdateRecipeSectionInput = {
    id: 5, section_type: null, technique: null, execution_mode: null, applies_to: null,
  };
  await updateRecipeSection(input);
  const [sql, params] = executeMock.mock.calls[0];
  // must NOT appear inside COALESCE
  expect(sql).not.toContain("COALESCE($7");
  expect(sql).not.toContain("COALESCE($8");
  expect(sql).not.toContain("COALESCE($9");
  expect(sql).not.toContain("COALESCE($10");
  // must appear as direct assignments
  expect(sql).toContain("section_type = $7");
  expect(sql).toContain("technique = $8");
  expect(sql).toContain("execution_mode = $9");
  expect(sql).toContain("applies_to = $10");
  expect(params).toHaveLength(10);
});
```

**Old test to remove/replace:** The test at line 204 titled "UPDATE uses COALESCE for workflow metadata $7-$10 and has 10 params total" asserts the buggy behavior. Remove it (or rename + invert) and replace with the above.

---

### `tests/painting/duplicateRecipe.test.ts` — section INSERT assertion update (D-09)

**Change:** Line 157 test "inserts section copies with new recipe_id and all 6 columns" — params arrays will be length 10 after the INSERT is expanded.

**Current assertion that will break** (lines 157–166):
```typescript
it("inserts section copies with new recipe_id and all 6 columns", async () => {
  await duplicateRecipe(1, "Copy of Space Marine Blue");
  const [sql1, params1] = executeMock.mock.calls[1];
  expect(sql1).toContain("INSERT INTO recipe_sections");
  expect(params1).toEqual([100, "Armour", "smooth", 0, 0, null]);

  const [, params2] = executeMock.mock.calls[2];
  expect(params2).toEqual([100, "Cloth", null, 1, 1, "optional block"]);
});
```

**Copy this replacement pattern** — same assertion style but with 10 params:
```typescript
it("inserts section copies with new recipe_id and all 10 columns including workflow metadata", async () => {
  await duplicateRecipe(1, "Copy of Space Marine Blue");
  const [sql1, params1] = executeMock.mock.calls[1];
  expect(sql1).toContain("INSERT INTO recipe_sections");
  expect(params1).toEqual([100, "Armour", "smooth", 0, 0, null, null, null, null, null]);

  const [, params2] = executeMock.mock.calls[2];
  expect(params2).toEqual([100, "Cloth", null, 1, 1, "optional block", null, null, null, null]);
});
```

**Note:** The 4 new null values at positions 6–9 correspond to `section_type`, `technique`, `execution_mode`, `applies_to` from `SECTION_FIXTURES` (all null in the test fixture at lines 47–78 of the test file).

---

### `package.json` — version bump (VER-01)

**Change:** Line 4 — `"version": "0.2.7"` → `"version": "0.2.11"`.

**Current state** (line 4):
```json
"version": "0.2.7",
```

**Target:**
```json
"version": "0.2.11",
```

---

### `src-tauri/tauri.conf.json` — version bump (VER-01)

**Change:** Line 3 — `"version": "0.2.7"` → `"version": "0.2.11"`.

**Important:** Do NOT change the `$schema` URL at line 1. Only the top-level `"version"` key at line 3.

**Current state** (line 3):
```json
"version": "0.2.7",
```

**Target:**
```json
"version": "0.2.11",
```

---

## Shared Patterns

### SQL Parameter Binding
**Source:** All files in `src/db/queries/*.ts`
**Apply to:** All SQL edits in this phase

Tauri plugin-sql requires positional `$1, $2, $3` syntax. Never use `?` placeholders.

```typescript
// Correct — positional $N syntax
db.execute("UPDATE recipe_sections SET name = $2 WHERE id = $1", [id, name]);

// Wrong — ? placeholder (not supported by tauri-plugin-sql)
db.execute("UPDATE recipe_sections SET name = ? WHERE id = ?", [name, id]);
```

### Null Coercion in Parameter Arrays
**Source:** `src/db/queries/recipeSections.ts` lines 66–76, `src/db/queries/recipePaints.ts` lines 21–26
**Apply to:** All new/modified INSERT and UPDATE parameter arrays

Optional fields always use `?? null` in the params array (never `undefined`):
```typescript
// Correct — null flows to SQLite NULL
input.notes ?? null,
input.section_type ?? null,

// Wrong — undefined causes tauri-plugin-sql binding failure
input.notes,
```

### Test Mock Setup
**Source:** `tests/painting/recipeSections.test.ts` lines 15–78, `tests/painting/duplicateRecipe.test.ts` lines 6–131
**Apply to:** Any new tests added in this phase

Standard mock pattern for query module tests:
```typescript
const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});
```

SQL assertions use `.toContain()` (not exact match) to avoid brittleness from whitespace/formatting:
```typescript
const [sql, params] = selectMock.mock.calls[0];
expect(sql).toContain("FROM recipe_steps");
expect(sql).toContain("ORDER BY COALESCE");
expect(params[0]).toBe(recipeId);
```

---

## No Analog Found

All files in this phase are in-place modifications to existing files. No new files are created. Every fix has a direct pattern source within the same file or a sibling file in `src/db/queries/`.

| File | Reason |
|---|---|
| `src-tauri/src/lib.rs` | Verification only — no code change required (MIG-01/MIG-02 confirmed complete per RESEARCH.md) |

---

## Metadata

**Analog search scope:** `src/db/queries/`, `tests/painting/`, `package.json`, `src-tauri/tauri.conf.json`
**Files scanned:** 7
**Pattern extraction date:** 2026-05-13
