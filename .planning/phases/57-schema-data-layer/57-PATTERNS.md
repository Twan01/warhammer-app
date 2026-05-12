# Phase 57: Schema & Data Layer - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 7 (1 new, 6 modified)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/migrations/020_workflow_metadata.sql` | migration | batch | `src-tauri/migrations/014_session_recipe_link.sql` | exact |
| `src/types/recipeSection.ts` | model | transform | `src/types/unit.ts` | exact |
| `src/types/paintingSession.ts` | model | transform | `src/types/paintingSession.ts` (self) | exact |
| `src/features/recipes/recipeSection.ts` | utility | transform | `src/features/recipes/recipeSection.ts` (self) | exact |
| `src/db/queries/recipeSections.ts` | service | CRUD | `src/db/queries/recipeSections.ts` (self) | exact |
| `src/db/queries/paintingSessions.ts` | service | CRUD | `src/db/queries/paintingSessions.ts` (self) | exact |
| `src/features/recipes/RecipeFormSheet.tsx` | component | CRUD | `src/features/recipes/RecipeFormSheet.tsx` (self) | exact |

## Pattern Assignments

### `src-tauri/migrations/020_workflow_metadata.sql` (migration, batch) -- NEW FILE

**Analog:** `src-tauri/migrations/014_session_recipe_link.sql`

**Full file pattern** (lines 1-5):
```sql
-- 014_session_recipe_link.sql — Phase 41: Link painting sessions to recipes/steps
-- Additive only — two nullable FK columns added via ALTER TABLE.
-- ON DELETE SET NULL: session survives deletion of recipe or step; link is cleared.
ALTER TABLE painting_sessions ADD COLUMN recipe_id INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL;
ALTER TABLE painting_sessions ADD COLUMN recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL;
```

**Key conventions to follow:**
- Header comment: filename, phase reference, description
- One `ALTER TABLE ... ADD COLUMN` per statement (SQLite limitation)
- `TEXT DEFAULT NULL` for nullable text columns (no FK references needed for these)
- Separate tables get separate comment blocks

---

### `src/types/recipeSection.ts` (model, transform) -- MODIFY

**Analog:** `src/types/unit.ts` (const array + type alias pattern)

**Const array + type alias pattern** (lines 8-22):
```typescript
export const PAINTING_STATUS_ORDER = [
  "Not Started",
  "Built",
  "Primed",
  "Basecoated",
  "Shaded",
  "Layered",
  "Highlighted",
  "Details Done",
  "Based",
  "Varnished",
  "Completed",
] as const;

export type PaintingStatus = typeof PAINTING_STATUS_ORDER[number];
```

**Secondary analog:** `src/features/recipes/recipeSchema.ts` (lines 3-6) -- more compact multi-array style:
```typescript
export const RECIPE_STYLES = [
  "Battle Ready", "Parade Ready", "Display", "Tabletop", "Speed Paint", "Competition",
] as const;
export type RecipeStyle = typeof RECIPE_STYLES[number];
```

**Current file to extend** (`src/types/recipeSection.ts` lines 1-21):
```typescript
export interface RecipeSection {
  id: number;
  recipe_id: number;
  name: string;
  surface: string | null;
  optional: number;          // 0 | 1 SQLite boolean
  order_index: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateRecipeSectionInput = Omit<RecipeSection, "id" | "created_at" | "updated_at">;
export type UpdateRecipeSectionInput = Partial<Omit<CreateRecipeSectionInput, "recipe_id">> & { id: number };
```

**What to add:** Three const arrays + type aliases BEFORE the interface. Four new nullable `string | null` fields in the interface AFTER `notes` and BEFORE `created_at`. The `Omit`-based derived types automatically pick up new fields -- no changes needed to `CreateRecipeSectionInput` / `UpdateRecipeSectionInput`.

---

### `src/types/paintingSession.ts` (model, transform) -- MODIFY

**Current file** (lines 1-35):
```typescript
export interface PaintingSession {
  id: number;
  unit_id: number;
  session_date: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  recipe_id: number | null;
  recipe_step_id: number | null;
}

export interface CreateSessionInput {
  unit_id: number;
  session_date: string;
  duration_minutes: number;
  notes?: string | null;
  recipe_id?: number | null;
  recipe_step_id?: number | null;
}
```

**What to add:** `section_name: string | null` to `PaintingSession` (after `recipe_step_id`). `section_name?: string | null` to `CreateSessionInput` (after `recipe_step_id`). Follow the same optional `?` convention used for `recipe_id` and `recipe_step_id` in `CreateSessionInput`.

---

### `src/features/recipes/recipeSection.ts` (utility, transform) -- MODIFY

**Current DraftSection interface** (lines 18-27):
```typescript
export interface DraftSection {
  localId: string;
  name: string;
  surface: string | null;
  optional: number;
  notes: string | null;
  steps: DraftStep[];
}
```

**Current makeDraftSection factory** (lines 33-42):
```typescript
export function makeDraftSection(name = "Steps"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    name,
    surface: null,
    optional: 0,
    notes: null,
    steps: [],
  };
}
```

**Current buildDraftSections mapper** (lines 82-89 -- the return object):
```typescript
    return {
      localId: crypto.randomUUID(),
      name: s.name,
      surface: s.surface,
      optional: s.optional,
      notes: s.notes,
      steps: sectionSteps,
    };
```

**What to add:**
- Four new nullable fields in `DraftSection` interface BEFORE `steps`: `section_type`, `technique`, `execution_mode`, `applies_to` (all `string | null`)
- Four `null` defaults in `makeDraftSection()` return object BEFORE `steps`
- Four field mappings in `buildDraftSections()` return object BEFORE `steps`: `section_type: s.section_type ?? null`, etc. (null fallback matches existing `DraftStep` mapping pattern at lines 73-79)

---

### `src/db/queries/recipeSections.ts` (service, CRUD) -- MODIFY

**Current createRecipeSection** (lines 23-38):
```typescript
export async function createRecipeSection(input: CreateRecipeSectionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.recipe_id,
      input.name,
      input.surface ?? null,
      input.optional,
      input.order_index,
      input.notes ?? null,
    ],
  );
  return result.lastInsertId ?? 0;
}
```

**Current updateRecipeSection** (lines 46-66):
```typescript
export async function updateRecipeSection(input: UpdateRecipeSectionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE recipe_sections
     SET name = COALESCE($2, name),
         surface = $3,
         optional = COALESCE($4, optional),
         order_index = COALESCE($5, order_index),
         notes = $6,
         updated_at = datetime('now')
     WHERE id = $1`,
    [
      input.id,
      input.name ?? null,
      input.surface ?? null,
      input.optional ?? null,
      input.order_index ?? null,
      input.notes ?? null,
    ],
  );
}
```

**What to add to createRecipeSection:** Extend column list with `section_type, technique, execution_mode, applies_to`. Extend VALUES with `$7, $8, $9, $10`. Add four param entries with `?? null` coercion.

**What to add to updateRecipeSection:** Add four COALESCE lines after `notes = $6`: `section_type = COALESCE($7, section_type)`, `technique = COALESCE($8, technique)`, `execution_mode = COALESCE($9, execution_mode)`, `applies_to = COALESCE($10, applies_to)`. Add four param entries in array.

---

### `src/db/queries/paintingSessions.ts` (service, CRUD) -- MODIFY

**Current createSession** (lines 19-32):
```typescript
export async function createSession(input: CreateSessionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      input.unit_id,
      input.session_date,
      input.duration_minutes,
      input.notes ?? null,
      input.recipe_id ?? null,
      input.recipe_step_id ?? null,
    ]
  );
}
```

**What to add:** Extend column list with `section_name`. Extend VALUES with `$7`. Add `input.section_name ?? null` to param array.

---

### `src/features/recipes/RecipeFormSheet.tsx` (component, CRUD) -- MODIFY

**Current save path** (lines 268-281):
```typescript
      const sectionIdMap = new Map<string, number>();
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const newSectionId = await createRecipeSection({
          recipe_id: recipeId,
          name: sec.name,
          surface: sec.surface,
          optional: sec.optional,
          order_index: i,
          notes: sec.notes,
        });
        sectionIdMap.set(sec.localId, newSectionId);
      }
```

**What to add:** Four new properties in the `createRecipeSection()` call object: `section_type: sec.section_type`, `technique: sec.technique`, `execution_mode: sec.execution_mode`, `applies_to: sec.applies_to`.

---

## Shared Patterns

### Const Array + Type Alias
**Source:** `src/types/unit.ts` lines 8-22
**Apply to:** `src/types/recipeSection.ts` (3 new const arrays)
```typescript
export const PAINTING_STATUS_ORDER = [
  "Not Started",
  "Built",
  // ...values...
] as const;
export type PaintingStatus = typeof PAINTING_STATUS_ORDER[number];
```

### Nullable Column with `?? null` Coercion
**Source:** `src/db/queries/recipeSections.ts` lines 31-35
**Apply to:** All query function modifications
```typescript
input.surface ?? null,
input.notes ?? null,
```

### COALESCE Partial Update
**Source:** `src/db/queries/recipeSections.ts` lines 49-55
**Apply to:** `updateRecipeSection` new fields
```typescript
SET name = COALESCE($2, name),
    surface = $3,
    optional = COALESCE($4, optional),
```

### DraftSection Null Fallback Mapping
**Source:** `src/features/recipes/recipeSection.ts` lines 73-79
**Apply to:** `buildDraftSections` new field mapping
```typescript
painting_phase: st.painting_phase ?? null,
tool: st.tool ?? null,
technique: st.technique ?? null,
```

### Test Fixture Update Pattern
**Source:** `tests/painting/recipeSection.pure.test.ts` lines 19-30
**Apply to:** All RecipeSection fixtures in both test files
```typescript
const SECTION_1: RecipeSection = {
  id: 1,
  recipe_id: 10,
  name: "Armor",
  surface: "Smooth",
  optional: 0,
  order_index: 0,
  notes: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};
```
Add four null fields: `section_type: null, technique: null, execution_mode: null, applies_to: null` after `notes`.

---

## No Analog Found

No files without analogs -- all modifications follow well-established codebase patterns.

## Metadata

**Analog search scope:** `src/types/`, `src/db/queries/`, `src/features/recipes/`, `src-tauri/migrations/`, `tests/painting/`
**Files scanned:** 10
**Pattern extraction date:** 2026-05-12
