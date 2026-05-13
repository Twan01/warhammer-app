# Phase 62: Applied Recipe Data Layer - Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src-tauri/migrations/021_applied_recipe_assignments.sql` | migration | batch | `src-tauri/migrations/018_recipe_sections.sql` | exact |
| `src-tauri/src/lib.rs` | config | request-response | `src-tauri/src/lib.rs` lines 109-127 | exact (in-place edit) |
| `src/types/recipeAssignment.ts` | model | — | `src/types/recipeSection.ts` | exact |
| `src/db/queries/recipeAssignments.ts` | service | CRUD | `src/db/queries/recipeSections.ts` | exact |
| `src/hooks/useRecipeAssignments.ts` | hook | request-response | `src/hooks/useRecipeSections.ts` | exact |
| `src/lib/computeAssignmentProgress.ts` | utility | transform | `src/lib/computeWorkflowPosition.ts` | exact |
| `tests/painting/recipeAssignments.test.ts` | test | CRUD | `tests/painting/recipeSections.test.ts` | exact |
| `tests/lib/computeAssignmentProgress.test.ts` | test | transform | `tests/lib/computeWorkflowPosition.test.ts` | exact |

---

## Pattern Assignments

### `src-tauri/migrations/021_applied_recipe_assignments.sql` (migration, batch)

**Analog:** `src-tauri/migrations/018_recipe_sections.sql`

**Core migration pattern** (018_recipe_sections.sql lines 1-21):
```sql
-- Header comment: file name, phase, purpose
-- Step comments describing each DDL block

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
```

**Apply for Phase 62 — both tables in a single file:**
```sql
-- 021_applied_recipe_assignments.sql — Phase 62: Applied recipe data layer

CREATE TABLE IF NOT EXISTS unit_recipe_assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    recipe_id   INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(unit_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS unit_recipe_step_progress (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE,
    order_index   INTEGER NOT NULL,
    completed     INTEGER NOT NULL DEFAULT 0,
    completed_at  TEXT,
    UNIQUE(assignment_id, order_index)
);
```

Key differences from section migration: no data migration needed (greenfield tables), UNIQUE constraints on both tables, second table has a nullable `completed_at` column.

---

### `src-tauri/src/lib.rs` (config, in-place edit)

**Analog:** `src-tauri/src/lib.rs` lines 121-127

**Migration registration pattern** (lib.rs lines 121-127):
```rust
        Migration {
            version: 20,
            description: "workflow_metadata",
            sql: include_str!("../migrations/020_workflow_metadata.sql"),
            kind: MigrationKind::Up,
        },
    ]   // <-- closing bracket of get_migrations() vec
```

**Insert before the closing `]`:**
```rust
        Migration {
            version: 21,
            description: "applied_recipe_assignments",
            sql: include_str!("../migrations/021_applied_recipe_assignments.sql"),
            kind: MigrationKind::Up,
        },
```

The edit target is line 126 (before the `]` on line 127). Append the new `Migration { ... }` block inside `get_migrations()` — not `get_rules_migrations()`.

---

### `src/types/recipeAssignment.ts` (model)

**Analog:** `src/types/recipeSection.ts`

**Full type file pattern** (recipeSection.ts lines 26-44):
```typescript
export interface RecipeSection {
  id: number;
  recipe_id: number;
  name: string;
  // ... fields mirroring table columns ...
  optional: number;          // 0 | 1 SQLite boolean — 0 = required, 1 = skippable
  created_at: string;
  updated_at: string;
}

export type CreateRecipeSectionInput = Omit<RecipeSection, "id" | "created_at" | "updated_at">;
export type UpdateRecipeSectionInput = Partial<Omit<CreateRecipeSectionInput, "recipe_id">> & { id: number };
```

**Apply for Phase 62:**
```typescript
export interface RecipeAssignment {
  id: number;
  unit_id: number;
  recipe_id: number;
  created_at: string;
}

export type CreateRecipeAssignmentInput = Omit<RecipeAssignment, "id" | "created_at">;

export interface StepProgress {
  id: number;
  assignment_id: number;
  order_index: number;
  completed: number;        // 0 | 1 SQLite boolean — cast to completed === 1 at use site
  completed_at: string | null;
}

export interface AssignmentProgress {
  total: number;
  completed: number;
  percentage: number;
  bySectionId: Map<number | null, { total: number; completed: number }>;
}
```

Note: `AssignmentProgress` can also live in `src/lib/computeAssignmentProgress.ts` as the pure function's return type — either location is acceptable; keep it co-located with the function to avoid a cross-module import from `@/lib` → `@/types`.

---

### `src/db/queries/recipeAssignments.ts` (service, CRUD)

**Analog:** `src/db/queries/recipeSections.ts`

**Imports pattern** (recipeSections.ts lines 1-3):
```typescript
import { getDb } from "@/db/client";
import type { RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput } from "@/types/recipeSection";
```

**Apply:**
```typescript
import { getDb } from "@/db/client";
import type { RecipeAssignment, CreateRecipeAssignmentInput, StepProgress } from "@/types/recipeAssignment";
```

**SELECT with ORDER BY pattern** (recipeSections.ts lines 12-18):
```typescript
export async function getRecipeSections(recipeId: number): Promise<RecipeSection[]> {
  const db = await getDb();
  return db.select<RecipeSection[]>(
    "SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY order_index ASC, id ASC",
    [recipeId],
  );
}
```

**Apply for `getAssignmentsByUnit` and `getAssignmentsByRecipe`:**
```typescript
export async function getAssignmentsByUnit(unitId: number): Promise<RecipeAssignment[]> {
  const db = await getDb();
  return db.select<RecipeAssignment[]>(
    "SELECT * FROM unit_recipe_assignments WHERE unit_id = $1 ORDER BY created_at ASC",
    [unitId],
  );
}

export async function getAssignmentsByRecipe(recipeId: number): Promise<RecipeAssignment[]> {
  const db = await getDb();
  return db.select<RecipeAssignment[]>(
    "SELECT * FROM unit_recipe_assignments WHERE recipe_id = $1 ORDER BY created_at ASC",
    [recipeId],
  );
}
```

**INSERT returning lastInsertId pattern** (recipeSections.ts lines 23-42):
```typescript
export async function createRecipeSection(input: CreateRecipeSectionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_sections (...) VALUES ($1, $2, ...)`,
    [...],
  );
  return result.lastInsertId ?? 0;
}
```

**Apply for `createAssignment`:**
```typescript
export async function createAssignment(input: CreateRecipeAssignmentInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO unit_recipe_assignments (unit_id, recipe_id) VALUES ($1, $2)`,
    [input.unit_id, input.recipe_id],
  );
  return result.lastInsertId ?? 0;
}
```

**DELETE pattern** (recipeSections.ts lines 84-87):
```typescript
export async function deleteRecipeSection(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM recipe_sections WHERE id = $1", [id]);
}
```

**Loop pattern for bulk operations** (recipeSections.ts lines 93-103):
```typescript
export async function reorderRecipeSections(
  sections: { id: number; order_index: number }[],
): Promise<void> {
  const db = await getDb();
  for (const { id, order_index } of sections) {
    await db.execute(
      "UPDATE recipe_sections SET order_index = $1, updated_at = datetime('now') WHERE id = $2",
      [order_index, id],
    );
  }
}
```

**Apply for `bulkCreateAssignments` (INSERT OR IGNORE avoids UNIQUE constraint error on duplicates):**
```typescript
export async function bulkCreateAssignments(
  unitIds: number[],
  recipeId: number,
): Promise<void> {
  const db = await getDb();
  for (const unitId of unitIds) {
    await db.execute(
      `INSERT OR IGNORE INTO unit_recipe_assignments (unit_id, recipe_id) VALUES ($1, $2)`,
      [unitId, recipeId],
    );
  }
}
```

**Upsert pattern (novel for this phase — no existing analog, use ON CONFLICT DO UPDATE SET):**
```typescript
export async function upsertStepProgress(
  assignmentId: number,
  orderIndex: number,
  completed: boolean,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO unit_recipe_step_progress (assignment_id, order_index, completed, completed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(assignment_id, order_index) DO UPDATE SET
       completed = excluded.completed,
       completed_at = excluded.completed_at`,
    [assignmentId, orderIndex, completed ? 1 : 0, completed ? new Date().toISOString() : null],
  );
}
```

Note: `ON CONFLICT DO UPDATE SET` preserves the existing row `id`. Do NOT use `INSERT OR REPLACE` — it assigns a new `id` on each upsert.

**Step progress SELECT (ORDER BY order_index ASC — not id):**
```typescript
export async function getStepProgress(assignmentId: number): Promise<StepProgress[]> {
  const db = await getDb();
  return db.select<StepProgress[]>(
    "SELECT * FROM unit_recipe_step_progress WHERE assignment_id = $1 ORDER BY order_index ASC",
    [assignmentId],
  );
}
```

---

### `src/hooks/useRecipeAssignments.ts` (hook, request-response)

**Analog:** `src/hooks/useRecipeSections.ts`

**Imports pattern** (useRecipeSections.ts lines 1-18):
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecipeSections,
  createRecipeSection,
  // ... other query functions
} from "@/db/queries/recipeSections";
import type { CreateRecipeSectionInput, UpdateRecipeSectionInput } from "@/types/recipeSection";
```

**Cache key exports pattern** (useRecipeSections.ts lines 19-21):
```typescript
export const RECIPE_SECTIONS_KEY = (recipeId: number) => ["recipe-sections", recipeId] as const;
export const SECTION_STEP_COUNTS_KEY = ["section-step-counts"] as const;
export const SECTION_COUNTS_KEY = ["recipe-section-counts"] as const;
```

**Apply for Phase 62 (D-12):**
```typescript
export const ASSIGNMENTS_KEY = ["recipe-assignments"] as const;
export const UNIT_ASSIGNMENTS_KEY = (unitId: number) =>
  ["recipe-assignments", "by-unit", unitId] as const;
export const RECIPE_ASSIGNMENTS_KEY = (recipeId: number) =>
  ["recipe-assignments", "by-recipe", recipeId] as const;
export const STEP_PROGRESS_KEY = (assignmentId: number) =>
  ["recipe-assignments", "progress", assignmentId] as const;
```

**useQuery with enabled guard pattern** (useRecipeSections.ts lines 23-29):
```typescript
export function useRecipeSections(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? RECIPE_SECTIONS_KEY(recipeId) : ["recipe-sections"],
    queryFn: () => (recipeId !== undefined ? getRecipeSections(recipeId) : Promise.resolve([])),
    enabled: recipeId !== undefined,
  });
}
```

**useMutation + single-key invalidation pattern** (useRecipeSections.ts lines 31-38):
```typescript
export function useCreateRecipeSection() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipeSectionInput>({
    mutationFn: createRecipeSection,
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(input.recipe_id) });
    },
  });
}
```

**Apply for Phase 62 — symmetric multi-key invalidation (D-13):**
```typescript
export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipeAssignmentInput>({
    mutationFn: createAssignment,
    onSuccess: (_, input) => {
      // Symmetry rule (D-13): create and delete invalidate the same keys
      qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(input.unit_id) });
      qc.invalidateQueries({ queryKey: RECIPE_ASSIGNMENTS_KEY(input.recipe_id) });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; unitId: number; recipeId: number }>({
    mutationFn: ({ id }) => deleteAssignment(id),
    onSuccess: (_, variables) => {
      // Symmetry rule (D-13): same keys as useCreateAssignment
      qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(variables.unitId) });
      qc.invalidateQueries({ queryKey: RECIPE_ASSIGNMENTS_KEY(variables.recipeId) });
    },
  });
}
```

**Cascade invalidation comment pattern** (useRecipeSections.ts lines 57-65):
```typescript
/**
 * CASCADE INVALIDATION CONTRACT -- do not reduce.
 * [Explanation of why each key is invalidated]
 */
```

**Apply this doc comment on useDeleteAssignment and useBulkCreateAssignments** to document D-13 symmetry and bulk invalidation (Pitfall 5).

**useBulkCreateAssignments — broad prefix invalidation for multi-unit operations:**
```typescript
export function useBulkCreateAssignments() {
  const qc = useQueryClient();
  return useMutation<void, Error, { unitIds: number[]; recipeId: number }>({
    mutationFn: ({ unitIds, recipeId }) => bulkCreateAssignments(unitIds, recipeId),
    onSuccess: (_, variables) => {
      // Invalidate the broad prefix to refresh all per-unit views (Pitfall 5)
      qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_ASSIGNMENTS_KEY(variables.recipeId) });
    },
  });
}
```

**useToggleStepProgress — invalidates progress key only:**
```typescript
export function useToggleStepProgress() {
  const qc = useQueryClient();
  return useMutation<void, Error, { assignmentId: number; orderIndex: number; completed: boolean }>({
    mutationFn: ({ assignmentId, orderIndex, completed }) =>
      upsertStepProgress(assignmentId, orderIndex, completed),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: STEP_PROGRESS_KEY(variables.assignmentId) });
    },
  });
}
```

---

### `src/lib/computeAssignmentProgress.ts` (utility, transform)

**Analog:** `src/lib/computeWorkflowPosition.ts`

**File header + interface pattern** (computeWorkflowPosition.ts lines 1-27):
```typescript
/**
 * Phase N — [description].
 *
 * Pure function that computes [purpose]. [Consumed by which components].
 *
 * [Named rules or degradation cases]
 */
import type { SomeType } from "@/types/someType";

export interface WorkflowPosition {
  // ... output shape
}
```

**Pure function structure** (computeWorkflowPosition.ts lines 29-35):
```typescript
export function computeWorkflowPosition(
  // ... params: plain data types only, no React, no DB
): WorkflowPosition | null {
  // guard: early return on missing data
  if (condition) return null;

  // ... pure computation, no side effects
}
```

**Apply for Phase 62 (D-07, D-09) — no imports from `@/db/*` or React:**
```typescript
/**
 * Phase 62 — Applied recipe completion tracking (AR-01).
 *
 * Pure functions for computing progress from step progress records.
 * No React or DB dependencies — safe to test without mocks.
 */

export interface AssignmentProgress {
  total: number;
  completed: number;
  percentage: number;
  bySectionId: Map<number | null, { total: number; completed: number }>;
}

export function computeCompletionPercentage(totalSteps: number, completedSteps: number): number {
  if (totalSteps === 0) return 0;
  return Math.round((completedSteps / totalSteps) * 100);
}

export function computeAssignmentProgress(
  steps: { order_index: number; section_id: number | null }[],
  progress: { order_index: number; completed: number }[],
): AssignmentProgress {
  const progressMap = new Map(progress.map((p) => [p.order_index, p.completed]));
  const bySectionId = new Map<number | null, { total: number; completed: number }>();

  let total = 0;
  let completed = 0;

  for (const step of steps) {
    total++;
    const isCompleted = (progressMap.get(step.order_index) ?? 0) === 1;
    if (isCompleted) completed++;

    const key = step.section_id;
    const bucket = bySectionId.get(key) ?? { total: 0, completed: 0 };
    bucket.total++;
    if (isCompleted) bucket.completed++;
    bySectionId.set(key, bucket);
  }

  return { total, completed, percentage: computeCompletionPercentage(total, completed), bySectionId };
}
```

---

### `tests/painting/recipeAssignments.test.ts` (test, CRUD)

**Analog:** `tests/painting/recipeSections.test.ts`

**File header + mock setup pattern** (recipeSections.test.ts lines 1-22):
```typescript
/**
 * [Phase] — [module] query module and hook contract coverage.
 *
 * [What groups cover / what invariants are tested]
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import { ... } from "@/db/queries/recipeAssignments";
```

**beforeEach reset pattern** (recipeSections.test.ts lines 73-78):
```typescript
beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});
```

**makeWrapper helper** (recipeSections.test.ts lines 321-327):
```typescript
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

**SQL assertion pattern for SELECT** (recipeSections.test.ts lines 84-97):
```typescript
describe("getRecipeSections — SECT-04 read", () => {
  it("queries recipe_sections filtered by recipe_id with correct order", async () => {
    await getRecipeSections(42);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("FROM recipe_sections WHERE recipe_id = $1");
    expect(sql).toContain("ORDER BY order_index ASC, id ASC");
    expect(params).toEqual([42]);
  });
});
```

**Hook invalidation spy pattern** (recipeSections.test.ts lines 421-445):
```typescript
it("invalidates RECIPE_SECTIONS_KEY(recipeId) on success", async () => {
  const { spy, wrapper } = makeWrapper();
  const { result } = renderHook(() => useDeleteRecipeSection(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ id: 7, recipeId: 3 });
  });
  await waitFor(() => expect(spy).toHaveBeenCalled());

  const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
  expect(keys).toContainEqual(RECIPE_SECTIONS_KEY(3));
});
```

**Apply for Phase 62 — symmetry verification test (D-13):**
```typescript
it("useDeleteAssignment invalidates exactly the same keys as useCreateAssignment", async () => {
  // Verify D-13 symmetry: both mutations hit UNIT_ASSIGNMENTS_KEY + RECIPE_ASSIGNMENTS_KEY
  const { spy, wrapper } = makeWrapper();
  const { result } = renderHook(() => useDeleteAssignment(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ id: 1, unitId: 5, recipeId: 10 });
  });
  await waitFor(() => expect(spy).toHaveBeenCalled());

  const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
  expect(keys).toContainEqual(UNIT_ASSIGNMENTS_KEY(5));
  expect(keys).toContainEqual(RECIPE_ASSIGNMENTS_KEY(10));
  expect(spy).toHaveBeenCalledTimes(2);
});
```

---

### `tests/lib/computeAssignmentProgress.test.ts` (test, transform)

**Analog:** `tests/lib/computeWorkflowPosition.test.ts`

**File structure pattern** (computeWorkflowPosition.test.ts lines 1-48):
```typescript
/**
 * Phase N — computeFunctionName pure function tests.
 *
 * Covers [cases listed].
 */
import { describe, it, expect } from "vitest";
import { computeFunction } from "@/lib/computeFunction";

// ---------------------------------------------------------------------------
// Helpers — minimal fixture builders (only fields the function uses)
// ---------------------------------------------------------------------------

function makeFixture(overrides: Partial<Type> & { required: RequiredField }): Type {
  return {
    defaultField: defaultValue,
    ...overrides,
  };
}
```

Note: pure function tests use NO `vi.mock()` — functions have no side effects or external deps. The only imports are `vitest` and the function under test.

---

## Shared Patterns

### Boolean Storage and Casting
**Source:** `src/types/recipeSection.ts` line 32 comment + `src/db/queries/recipeSections.ts` generally
**Apply to:** `src/types/recipeAssignment.ts` (StepProgress.completed), `src/db/queries/recipeAssignments.ts` (upsertStepProgress)
```typescript
// In type definition:
completed: number;        // 0 | 1 SQLite boolean — cast to completed === 1 at use site

// In query write:
completed ? 1 : 0

// In pure function read:
const isCompleted = (progressMap.get(step.order_index) ?? 0) === 1;
```

### Parameterized Query Syntax
**Source:** `src/db/queries/recipeSections.ts` (all functions)
**Apply to:** `src/db/queries/recipeAssignments.ts` (all functions)

All queries use `$1, $2, ...` positional params (tauri-plugin-sql requirement). Never use named params or `?` placeholders.

### Error Handling (query layer)
**Source:** `src/db/queries/recipeSections.ts` — no explicit try/catch in query modules
**Apply to:** `src/db/queries/recipeAssignments.ts`

Query functions do NOT catch errors. Errors propagate to the React Query `useMutation` error state, which surfaces in the UI via the hook caller's error handling. Exception: document UNIQUE constraint behavior in JSDoc for `createAssignment` — callers can use `INSERT OR IGNORE` or handle the thrown error.

### Cache Key Contract (symmetry rule)
**Source:** `src/hooks/useRecipeSections.ts` lines 51-73 (CASCADE INVALIDATION CONTRACT comment)
**Apply to:** `src/hooks/useRecipeAssignments.ts` — useCreateAssignment, useDeleteAssignment, useBulkCreateAssignments

Add the `CASCADE INVALIDATION CONTRACT -- do not reduce` comment on any mutation that touches multiple cache keys.

### getDb() Import
**Source:** `src/db/queries/recipeSections.ts` line 1
**Apply to:** `src/db/queries/recipeAssignments.ts` line 1
```typescript
import { getDb } from "@/db/client";
```

---

## No Analog Found

All files have close analogs. No files require falling back to RESEARCH.md patterns exclusively.

| File | Note |
|---|---|
| `upsertStepProgress` function within `recipeAssignments.ts` | The `ON CONFLICT DO UPDATE SET` SQL pattern has no direct analog in the codebase (recipeSections uses sequential UPDATEs instead). Use the RESEARCH.md Pattern 3 excerpt exactly. |

---

## Metadata

**Analog search scope:** `src/db/queries/`, `src/hooks/`, `src/lib/`, `src/types/`, `src-tauri/migrations/`, `src-tauri/src/`, `tests/painting/`, `tests/lib/`
**Files scanned:** 8 analog files read in full
**Key constraint verified:** Migration 020 is the highest existing migration — next number is 021. `get_migrations()` in `lib.rs` ends at version 20, line 127.
**order_index scope (A2):** `RecipeStep.order_index` is per-step across the flat `recipe_steps` table — globally unique per recipe (not reset per section). The `ORDER BY order_index ASC, id ASC` tiebreaker in `getRecipeSections` confirms order_index is not guaranteed globally unique, but for `recipe_steps` the RESEARCH.md D-05 decision treats it as the stable position identifier. Verify by reading `addRecipePaint` INSERT in `recipePaints.ts` during implementation if needed.
**Pattern extraction date:** 2026-05-13
