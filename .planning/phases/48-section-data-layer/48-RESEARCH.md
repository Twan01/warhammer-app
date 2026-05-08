# Phase 48: Section Data Layer — Research

**Researched:** 2026-05-08
**Domain:** SQLite migration + Tauri plugin-sql query layer + React Query cache contract
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Migration number is **018** (016_rules_snapshot.sql and 017_unit_overrides.sql already exist; confirmed by listing migrations directory)
- Table: `CREATE TABLE recipe_sections (id, recipe_id FK, name, surface, optional, order_index, notes, created_at, updated_at)`
- Column: `ALTER TABLE recipe_steps ADD COLUMN section_id` — nullable FK to recipe_sections with ON DELETE CASCADE
- Data migration: for each existing recipe, INSERT one default section named "Steps", then UPDATE all recipe_steps for that recipe to point at it
- Default section name is "Steps" (neutral, describes content)
- `surface` column is TEXT nullable — same domain values as `painting_recipes.surface` (Armour, Cloth, Skin, Weapons, Base etc.) but not enforced as enum
- `optional` is 0|1 integer (SQLite boolean discipline); default 0; means "section can be skipped in painting workflow"
- FK cascades: `recipe_sections.recipe_id` ON DELETE CASCADE; `recipe_steps.section_id` ON DELETE CASCADE — never delete steps manually before deleting a section
- **useDeleteRecipeSection.onSuccess must invalidate all 5 keys:** RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY
- useCreateRecipeSection and useUpdateRecipeSection invalidate RECIPE_SECTIONS_KEY only
- useReorderRecipeSections invalidates RECIPE_SECTIONS_KEY only
- New: `getStepCountsBySection()` — per-section GROUP BY; existing `getStepCountsByRecipe()` preserved unchanged
- New file: `src/db/queries/recipeSections.ts` — 6 functions
- New file: `src/hooks/useRecipeSections.ts` — query + 4 mutations
- New file: `src/types/recipeSection.ts` — RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput
- RecipeStep interface gains nullable `section_id` field (added in this phase)

### Claude's Discretion

- Exact reorder implementation (sequential UPDATE vs. delete-and-recreate)
- Whether to add `section_id` to `addRecipePaint` INSERT in this phase or defer to Phase 50
- Test file structure and assertion granularity
- ORDER BY strategy for sections query (`order_index ASC, id ASC` as tiebreaker)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SECT-01 | User can see recipe sections stored in a new recipe_sections table (id, recipe_id, name, surface, optional, order_index, notes, timestamps) | Migration 018 CREATE TABLE pattern; verified against 017_unit_overrides.sql style |
| SECT-02 | User's existing recipe steps gain a section_id FK linking them to their section | ALTER TABLE pattern verified in 012_recipe_steps.sql; nullable FK is the correct additive migration idiom |
| SECT-03 | User's existing recipes are auto-migrated with one default section per recipe, all steps pointed at it (zero data loss) | INSERT-per-recipe + batch UPDATE pattern; SQLite subquery for recipe list; verified cascade chain won't destroy sessions (014 uses SET NULL) |
| SECT-04 | User can create, read, update, and delete recipe sections through typed query/hook layer | Direct codebase verification of recipePaints.ts and useRecipePaints.ts patterns; all code shapes confirmed |
| SECT-05 | User can reorder sections via persisted order_index (drag-and-drop at data layer) | Reorder is a data-layer concern only in this phase; sequential UPDATE or delete-recreate both viable |
| SECT-06 | User can see per-section step counts via batch GROUP BY query helper | getStepCountsByRecipe() is an exact template; GROUP BY section_id with section_id IS NOT NULL guard needed |

</phase_requirements>

---

## Summary

Phase 48 is a pure data-layer phase with no UI. Its scope is tightly bounded: one migration file (018), three new source files (types, queries, hooks), and one field addition to an existing type. Every pattern required already exists in the codebase and has been verified by direct source inspection — this phase has no research-phase unknowns.

The highest-risk item is the migration data migration step (SECT-03): the `INSERT ... SELECT DISTINCT recipe_id` loop plus the `UPDATE recipe_steps SET section_id` batch update must be written as a single atomic transaction with no gaps. SQLite processes migrations sequentially and does not support partial rollback within a migration file, so the data migration SQL must be correct on first run. The cascade chain is safe: 014_session_recipe_link.sql confirms that `painting_sessions.recipe_step_id` uses ON DELETE SET NULL, so deleting a section cascades to step deletion which then SET NULLs session links — no orphan sessions.

The second highest-risk item is cache invalidation completeness on delete (Pitfall: Cache Invalidation Asymmetry). The five-key contract is locked in CONTEXT.md, but it must be implemented as an explicit comment block in `useRecipeSections.ts` so future contributors do not silently break it.

**Primary recommendation:** Write migration 018 first and test it manually against a copy of a dev database before writing any TypeScript. The SQL data migration is the irreversible part; every other file is easily corrected.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | 2.x (already installed) | DB access via `$1/$2` positional params | Project standard; no ORM |
| @tanstack/react-query | 5.x (already installed) | Query + mutation caching layer | Project standard for all server state |
| TypeScript | 5.x (already installed) | Type definitions for new entities | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.x (already installed) | Unit tests for query functions and hook invalidation | All new query modules get test coverage |

**No new packages required.** This phase adds zero dependencies.

---

## Architecture Patterns

### Recommended File Layout

```
src/
  types/
    recipeSection.ts          # NEW — RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput
  db/
    queries/
      recipeSections.ts       # NEW — 6 query functions
  hooks/
    useRecipeSections.ts      # NEW — RECIPE_SECTIONS_KEY + query + 4 mutations
    useRecipePaints.ts        # EXISTING — no changes; 5 exported keys referenced by new hook

src-tauri/
  migrations/
    018_recipe_sections.sql   # NEW — CREATE TABLE + ALTER TABLE + data migration

tests/
  painting/
    recipeSections.test.ts    # NEW — migration logic assertions, query SQL coverage
```

### Pattern 1: Migration with Data Migration (SECT-03)

**What:** A single `.sql` file that creates the new table, alters the existing table, and then populates default sections for all existing recipes.

**When to use:** Any time a schema change must maintain data integrity for existing rows.

**Critical constraint:** SQLite does not support stored procedures or looping constructs. The INSERT for default sections must use `INSERT INTO recipe_sections (recipe_id, name, order_index, created_at, updated_at) SELECT id, 'Steps', 0, datetime('now'), datetime('now') FROM painting_recipes`. Then a single `UPDATE recipe_steps SET section_id = (SELECT id FROM recipe_sections WHERE recipe_id = recipe_steps.recipe_id LIMIT 1)` handles all existing steps in one statement.

```sql
-- Source: verified pattern from 017_unit_overrides.sql + 012_recipe_steps.sql
-- 018_recipe_sections.sql — Phase 48: Section data layer

-- Step 1: Create recipe_sections table
CREATE TABLE IF NOT EXISTS recipe_sections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id   INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'Steps',
    surface     TEXT,
    optional    INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Add nullable section_id FK to recipe_steps
ALTER TABLE recipe_steps ADD COLUMN section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE;

-- Step 3: Data migration — create one default "Steps" section per existing recipe
INSERT INTO recipe_sections (recipe_id, name, order_index, created_at, updated_at)
SELECT id, 'Steps', 0, datetime('now'), datetime('now')
FROM painting_recipes;

-- Step 4: Point all existing steps at their recipe's default section
UPDATE recipe_steps
SET section_id = (
    SELECT id FROM recipe_sections
    WHERE recipe_sections.recipe_id = recipe_steps.recipe_id
    LIMIT 1
)
WHERE section_id IS NULL;
```

### Pattern 2: Type Triple (SECT-01, SECT-04)

**What:** Entity / CreateInput / UpdateInput mirrors the `RecipeStep` pattern in `recipePaint.ts`.

```typescript
// Source: src/types/recipePaint.ts pattern — extended for sections
// src/types/recipeSection.ts

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

### Pattern 3: Query Module (SECT-04, SECT-05, SECT-06)

**What:** One file per entity in `src/db/queries/`, parameterized with `$1/$2` positional syntax, `getDb()` singleton, `db.select` for reads, `db.execute` for writes.

```typescript
// Source: src/db/queries/recipePaints.ts — verified template
// src/db/queries/recipeSections.ts

import { getDb } from "@/db/client";
import type { RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput } from "@/types/recipeSection";

export async function getRecipeSections(recipeId: number): Promise<RecipeSection[]> {
  const db = await getDb();
  return db.select<RecipeSection[]>(
    "SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY order_index ASC, id ASC",
    [recipeId]
  );
}

export async function createRecipeSection(input: CreateRecipeSectionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.recipe_id, input.name, input.surface ?? null, input.optional, input.order_index, input.notes ?? null]
  );
  return result.lastInsertId ?? 0;
}

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
    [input.id, input.name ?? null, input.surface ?? null, input.optional ?? null, input.order_index ?? null, input.notes ?? null]
  );
}

export async function deleteRecipeSection(id: number): Promise<void> {
  const db = await getDb();
  // ON DELETE CASCADE handles recipe_steps cleanup automatically
  await db.execute("DELETE FROM recipe_sections WHERE id = $1", [id]);
}

export async function reorderRecipeSections(
  sections: { id: number; order_index: number }[]
): Promise<void> {
  const db = await getDb();
  for (const { id, order_index } of sections) {
    await db.execute(
      "UPDATE recipe_sections SET order_index = $1, updated_at = datetime('now') WHERE id = $2",
      [order_index, id]
    );
  }
}
```

### Pattern 4: Batch GROUP BY Query (SECT-06)

**What:** Exact mirror of `getStepCountsByRecipe()` but grouped by `section_id`.

**Key detail:** Steps with `section_id IS NULL` are excluded from the count (NULL rows belong to no section; this is a valid guard for backward-compat steps that predate Phase 48 migration, though data migration ensures all should be assigned).

```typescript
// Source: src/db/queries/recipePaints.ts getStepCountsByRecipe() — direct template
export interface SectionStepCount {
  section_id: number;
  step_count: number;
}

export async function getStepCountsBySection(): Promise<SectionStepCount[]> {
  const db = await getDb();
  return db.select<SectionStepCount[]>(
    `SELECT section_id, COUNT(*) AS step_count
     FROM recipe_steps
     WHERE section_id IS NOT NULL
     GROUP BY section_id`,
    []
  );
}
```

### Pattern 5: Hook Module with Cache Invalidation Contract (SECT-04)

**What:** One hook file per entity, exports ENTITY_KEY constants plus useQuery + useMutation hooks. Delete mutation carries the full 5-key invalidation contract.

```typescript
// Source: src/hooks/useRecipePaints.ts — verified template
// src/hooks/useRecipeSections.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecipeSections, createRecipeSection, updateRecipeSection,
  deleteRecipeSection, reorderRecipeSections, getStepCountsBySection,
} from "@/db/queries/recipeSections";
import {
  RECIPE_PAINTS_KEY,
  STEP_COUNTS_KEY,
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
} from "@/hooks/useRecipePaints";
import type { CreateRecipeSectionInput, UpdateRecipeSectionInput } from "@/types/recipeSection";

export const RECIPE_SECTIONS_KEY = (recipeId: number) => ["recipe-sections", recipeId] as const;
export const SECTION_STEP_COUNTS_KEY = ["section-step-counts"] as const;

export function useRecipeSections(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? RECIPE_SECTIONS_KEY(recipeId) : ["recipe-sections"],
    queryFn: () => recipeId !== undefined ? getRecipeSections(recipeId) : Promise.resolve([]),
    enabled: recipeId !== undefined,
  });
}

export function useCreateRecipeSection() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipeSectionInput>({
    mutationFn: createRecipeSection,
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(input.recipe_id) });
    },
  });
}

export function useUpdateRecipeSection() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateRecipeSectionInput & { recipe_id: number }>({
    mutationFn: ({ recipe_id: _r, ...rest }) => updateRecipeSection(rest),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(variables.recipe_id) });
    },
  });
}

export function useDeleteRecipeSection() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; recipeId: number }>({
    mutationFn: ({ id }) => deleteRecipeSection(id),
    /**
     * CASCADE INVALIDATION CONTRACT — do not reduce.
     * Deleting a section cascades to recipe_steps (ON DELETE CASCADE).
     * Those step deletions make 4 additional cache keys stale:
     *   RECIPE_PAINTS_KEY   — per-recipe step list
     *   STEP_COUNTS_KEY     — batch step counts
     *   RECIPE_AVAILABILITY_KEY — paint availability badge
     *   RECIPE_SWATCH_KEY   — swatch color strip
     * All 5 keys must be invalidated to keep UI consistent.
     */
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(variables.recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
    },
  });
}

export function useReorderRecipeSections() {
  const qc = useQueryClient();
  return useMutation<void, Error, { sections: { id: number; order_index: number }[]; recipeId: number }>({
    mutationFn: ({ sections }) => reorderRecipeSections(sections),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(variables.recipeId) });
    },
  });
}
```

### Anti-Patterns to Avoid

- **Passing `recipe_id` as a DB primary key to `useSortable`:** Phase 50 DnD must use UUID localIds. This phase only establishes the data shape; the localId convention is a Phase 50 concern. Do not conflate them.
- **Deleting steps before deleting a section:** The CASCADE handles it; manual step deletion before section deletion is redundant and risks violating the cache invalidation contract (step deletion would also need to invalidate STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, etc. separately).
- **Using `datetime('now')` in TypeScript:** Use `todayISO()` from `@/lib/dates` only for `YYYY-MM-DD` date fields. `updated_at` in this schema is a SQLite `TEXT` datetime string — set via `datetime('now')` directly in SQL, not from TypeScript.
- **Adding `section_id` to `addRecipePaint` INSERT now without deciding:** CONTEXT.md marks this as Claude's Discretion. If deferring to Phase 50, the INSERT simply omits `section_id` and it defaults to NULL. If adding now, the `CreateRecipeStepInput` type and INSERT must both change. Choose one path and be consistent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cascade delete logic in TypeScript | Manual loop deleting steps then section | `ON DELETE CASCADE` on `recipe_steps.section_id` | Atomicity — partial JS loops can leave orphan rows if they throw mid-loop |
| Reorder with gap-filling | Custom algorithm to recompact `order_index` | Sequential UPDATE loop (0, 1, 2, ...) from array position | Array position IS the canonical order; DraftSection[] array index maps directly to order_index |
| Batch step count by section | N+1 `getRecipeSections` then `getRecipePaintsByRecipe` per section | `getStepCountsBySection()` GROUP BY | Exact same pattern already proven in `getStepCountsByRecipe()` |
| Data migration loop | JS script run via Tauri command | Pure SQL `INSERT ... SELECT` + `UPDATE ... WHERE section_id IS NULL` | Migration runs atomically in a single transaction; JS loop cannot run at migration time |

**Key insight:** SQLite's declarative cascade and single-query GROUP BY eliminate entire categories of application-level complexity. Use SQL for what SQL is good at.

---

## Common Pitfalls

### Pitfall 1: Cache Invalidation Asymmetry on Section Delete

**What goes wrong:** useDeleteRecipeSection.onSuccess invalidates only RECIPE_SECTIONS_KEY. The cascade silently deletes recipe_steps rows. STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, and RECIPE_SWATCH_KEY become stale. Recipe cards show wrong step counts; paint badges show wrong ownership stats.

**Why it happens:** The cascade is invisible from TypeScript — `db.execute("DELETE FROM recipe_sections WHERE id = $1")` returns nothing about how many steps were deleted downstream.

**How to avoid:** Copy the 5-key invalidation block from the code example above verbatim. Document it with the CASCADE INVALIDATION CONTRACT comment block so the reason is visible.

**Warning signs:** Step count badge on recipe card does not update after deleting a section. Paint availability badge stays green after deleting steps via section delete.

### Pitfall 2: Migration Step 4 Leaving NULL section_ids

**What goes wrong:** Step 4 of the migration (`UPDATE recipe_steps SET section_id = ...`) uses a correlated subquery. If a recipe has no corresponding row in `recipe_sections` (e.g., Step 3 INSERT silently failed for some recipes), those steps remain with `section_id = NULL` after migration.

**Why it happens:** SQLite does not raise an error when a subquery returns NULL — it simply sets the column to NULL.

**How to avoid:** Step 3 uses `INSERT ... SELECT id FROM painting_recipes` — this will always produce one section per recipe. The correlated subquery in Step 4 is guaranteed to find a match because Step 3 just inserted it. No gaps possible in a single migration file run as one transaction.

**Warning signs:** After running the migration, `SELECT COUNT(*) FROM recipe_steps WHERE section_id IS NULL` should return 0.

### Pitfall 3: Cascade Chain Through Sessions

**What goes wrong:** Developer assumes deleting a section is safe without understanding the full cascade chain. In fact: section delete → step delete → painting_sessions.recipe_step_id SET NULL (from migration 014).

**Why it happens:** The FK on `painting_sessions.recipe_step_id` uses ON DELETE SET NULL, not CASCADE, so sessions are not deleted — their `recipe_step_id` is merely cleared. This is the correct behavior, but it must be understood.

**How to avoid:** No code change needed — 014's SET NULL is already correct behavior. Document in the delete query comment that session links are cleared, not session rows deleted.

**Warning signs:** Not applicable (this is intentional behavior, not a bug to detect).

### Pitfall 4: Missing `section_id` in RecipeStep Interface

**What goes wrong:** `section_id` is added to the `recipe_steps` table via migration but the `RecipeStep` TypeScript interface in `src/types/recipePaint.ts` is not updated. TypeScript compiles fine (the field just isn't in the interface), but any code that reads `step.section_id` gets `undefined` and TypeScript doesn't warn.

**Why it happens:** The type and the table schema are maintained separately with no automatic sync.

**How to avoid:** Update `RecipeStep` in `src/types/recipePaint.ts` to add `section_id: number | null` as part of this phase. The existing `CreateRecipeStepInput = Omit<RecipeStep, "id" | "created_at">` will automatically gain the field — check whether `addRecipePaint` INSERT should include it.

### Pitfall 5: Sequential UPDATE Reorder Hitting FK Conflicts

**What goes wrong:** During `reorderRecipeSections`, updating `order_index` values in sequence hits a UNIQUE constraint on `(recipe_id, order_index)` — if such a constraint exists. An update from position 2 → 1 when position 1 already exists would conflict.

**Why it happens:** A UNIQUE constraint on `(recipe_id, order_index)` is a natural design choice but causes ordering conflict during sequential UPDATE.

**How to avoid:** Do NOT add a UNIQUE constraint on `(recipe_id, order_index)` in the migration. `order_index` is not a natural key; it is a display hint. No uniqueness constraint. The reorder loop updates each row with the new position from the array index directly.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `recipe_paints` table with no ordering concept | `recipe_steps` with `order_index` and structured fields | Migration 012 (Phase 37) | Established the pattern this phase extends |
| Flat step list | Section-grouped step list (this phase adds the data model) | Migration 018 (Phase 48) | Sections become a first-class concept; steps are scoped to sections |
| `getStepCountsByRecipe()` only | Both `getStepCountsByRecipe()` (preserved) and `getStepCountsBySection()` (new) | Phase 48 | Phase 49 UI can show per-section counts; Phase 51 recipe cards show section count |

---

## Open Questions

1. **Should `addRecipePaint` INSERT include `section_id` in this phase?**
   - What we know: `section_id` becomes nullable on `recipe_steps`; not including it means new steps get `section_id = NULL` until Phase 50 wires the form
   - What's unclear: Whether Phase 49 (read-only UI) needs steps to have a `section_id` to display correctly in the sectioned timeline
   - Recommendation: Add `section_id` to `CreateRecipeStepInput` and `addRecipePaint` INSERT now (defaults to null if not provided). This costs one parameter slot but avoids a breaking change in Phase 50. Mark Claude's Discretion — either path works; choose in the plan.

2. **Should `SECTION_STEP_COUNTS_KEY` be exported from `useRecipeSections.ts` or `useRecipePaints.ts`?**
   - What we know: `STEP_COUNTS_KEY` (by-recipe) lives in `useRecipePaints.ts`; symmetrically `SECTION_STEP_COUNTS_KEY` (by-section) should live in `useRecipeSections.ts`
   - What's unclear: Nothing — this is unambiguous. Export from `useRecipeSections.ts`.
   - Recommendation: Declare alongside `RECIPE_SECTIONS_KEY` in `useRecipeSections.ts`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + jsdom |
| Config file | `vite.config.ts` (test block) |
| Quick run command | `pnpm test -- tests/painting/recipeSections.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SECT-01 | RecipeSection type shape matches table columns | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Wave 0 |
| SECT-02 | RecipeStep interface has nullable section_id field | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Wave 0 |
| SECT-03 | Migration SQL data migration: all existing steps get a section_id (zero NULL) | manual-only | Manual SQL verification after migration runs | N/A — migration runs at app start |
| SECT-04 | createRecipeSection SQL: INSERT with correct 6 params | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Wave 0 |
| SECT-04 | deleteRecipeSection SQL: single DELETE + 5-key invalidation contract | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Wave 0 |
| SECT-05 | reorderRecipeSections SQL: UPDATE order_index per section id | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Wave 0 |
| SECT-06 | getStepCountsBySection SQL: GROUP BY section_id with IS NOT NULL guard | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Wave 0 |

SECT-03 migration correctness cannot be automated in jsdom — it requires the Tauri runtime to execute SQL. The post-migration SQL verification (`SELECT COUNT(*) FROM recipe_steps WHERE section_id IS NULL`) is the manual acceptance check for SECT-03.

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting/recipeSections.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/painting/recipeSections.test.ts` — covers SECT-01, SECT-02, SECT-04, SECT-05, SECT-06 SQL assertions
- [ ] No framework install needed — Vitest already configured

---

## Sources

### Primary (HIGH confidence)

- `src-tauri/migrations/012_recipe_steps.sql` — ALTER TABLE + RENAME migration pattern; verified directly
- `src-tauri/migrations/017_unit_overrides.sql` — Latest hobbyforge.db migration; confirmed 018 is next
- `src-tauri/migrations/014_session_recipe_link.sql` — ON DELETE SET NULL cascade chain; verified directly
- `src/db/queries/recipePaints.ts` — Full query module: `getStepCountsByRecipe()` GROUP BY template; `addRecipePaint` INSERT column list; batch helpers; verified directly
- `src/hooks/useRecipePaints.ts` — All 5 exported cache keys; invalidation patterns; Map-based transforms; verified directly
- `src/types/recipePaint.ts` — RecipeStep interface; CreateRecipeStepInput pattern; verified directly
- `src/types/recipe.ts` — PaintingRecipe interface; CreateRecipeInput Omit pattern; verified directly
- `src/hooks/useRecipes.ts` — Cross-key invalidation on delete; useDuplicateRecipe key list; verified directly
- `src/db/queries/recipes.ts` — `duplicateRecipe` step copy loop; confirmed section_id not yet included; verified directly
- `src/lib/dates.ts` — `todayISO()` signature; confirmed it returns `YYYY-MM-DD` not datetime; verified directly
- `.planning/phases/48-section-data-layer/48-CONTEXT.md` — All locked decisions; canonical refs; discretion areas
- `.planning/research/SUMMARY.md` — DndContext conflict resolution; architecture patterns; critical pitfalls; cascade contract
- `ls src-tauri/migrations/` — Confirmed migration 018 is next (017 is latest)

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — SECT-01 through SECT-06 acceptance criteria; confirmed against CONTEXT.md decisions
- `.planning/STATE.md` — Accumulated decisions carried forward; confirms 0|1 boolean discipline, query-in-queries pattern, todayISO() standard

---

## Metadata

**Confidence breakdown:**

- Migration SQL: HIGH — patterns verified from migrations 012, 014, 017 directly; data migration SQL (`INSERT ... SELECT` + correlated `UPDATE`) is standard SQLite with no edge cases in this schema
- Type definitions: HIGH — `RecipeSection` triple follows exact `RecipeStep`/`PaintingRecipe` pattern verified from source
- Query module: HIGH — 6 functions follow exact shape of `recipePaints.ts`; GROUP BY template is a direct copy of `getStepCountsByRecipe()`
- Hook module: HIGH — 5-key invalidation contract is locked in CONTEXT.md; key exports follow exact pattern of `useRecipePaints.ts`
- Test strategy: HIGH — Vitest + mock getDb() pattern is established across 20+ existing test files in `tests/painting/`

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable stack — no fast-moving dependencies)
