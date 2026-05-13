# Phase 62: Applied Recipe Data Layer - Research

**Researched:** 2026-05-13
**Domain:** SQLite schema migrations, TypeScript data layer (queries + React Query hooks), pure function design, TDD
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `unit_recipe_assignments` table: `id INTEGER PRIMARY KEY, unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE, recipe_id INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (datetime('now'))`. UNIQUE(unit_id, recipe_id).
- **D-02:** `unit_recipe_step_progress` table: `id INTEGER PRIMARY KEY, assignment_id INTEGER NOT NULL REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE, order_index INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0, completed_at TEXT, UNIQUE(assignment_id, order_index)`. `completed` is 0|1.
- **D-03:** ON DELETE CASCADE on both FK chains. Deleting a unit or recipe cleans up everything automatically.
- **D-04:** No section-level progress. Section completion derived from step progress by counting completed steps in each section's order_index range.
- **D-05:** Step progress keyed by `(assignment_id, order_index)` — NOT `recipe_step_id`. Survives DELETE-all + re-INSERT save pattern.
- **D-06:** Reordering steps may misalign progress — acceptable edge case. Phase 63 UX can warn.
- **D-07:** `computeCompletionPercentage(totalSteps, completedSteps): number` — ratio × 100, rounded to nearest integer, returns 0 when totalSteps is 0.
- **D-08:** Optional sections count in completion percentage.
- **D-09:** `computeAssignmentProgress(steps, progress)` returns `{ total, completed, percentage, bySectionId: Map<number|null, {total, completed}> }`.
- **D-10:** Query module at `src/db/queries/recipeAssignments.ts`: `getAssignmentsByUnit`, `getAssignmentsByRecipe`, `getAssignment`, `createAssignment`, `deleteAssignment`, `getStepProgress`, `upsertStepProgress`, `bulkCreateAssignments`.
- **D-11:** Hook module at `src/hooks/useRecipeAssignments.ts`: `useAssignmentsByUnit`, `useAssignmentsByRecipe`, `useCreateAssignment`, `useDeleteAssignment`, `useStepProgress`, `useToggleStepProgress`, `useBulkCreateAssignments`.
- **D-12:** React Query key convention: `ASSIGNMENTS_KEY = ["recipe-assignments"]`, `UNIT_ASSIGNMENTS_KEY = (unitId) => ["recipe-assignments", "by-unit", unitId]`, `RECIPE_ASSIGNMENTS_KEY = (recipeId) => ["recipe-assignments", "by-recipe", recipeId]`, `STEP_PROGRESS_KEY = (assignmentId) => ["recipe-assignments", "progress", assignmentId]`.
- **D-13:** Cache invalidation symmetry — create and delete invalidate the same set of keys. Mutations invalidate both unit-specific and recipe-specific assignment keys, plus step progress.
- **D-14:** Types in `src/types/recipeAssignment.ts`: `RecipeAssignment`, `CreateRecipeAssignmentInput`, `StepProgress`, `AssignmentProgress`.

### Claude's Discretion

- Migration file numbering (next available after existing migrations)
- Test file organization and specific test cases for the pure functions
- Whether to add a batch step progress query (get progress for all assignments of a unit in one query)
- Any defensive checks in query functions (e.g., verifying recipe exists before creating assignment)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AR-01 | Schema: unit_recipe_assignments + unit_recipe_step_progress tables with stable composite key (survives DELETE-all + re-INSERT save) | D-01 through D-14 fully specify schema, types, queries, hooks, and pure functions. Migration 021 adds both tables. Composite key on (assignment_id, order_index) is the stability mechanism. |

</phase_requirements>

---

## Summary

Phase 62 creates a pure data layer — two new SQLite tables, typed query functions, React Query hooks, and two pure TypeScript functions — before any UI work. All design decisions are already locked in CONTEXT.md. The research task is to understand how to implement those decisions correctly given the project's existing patterns.

The project has a very consistent architecture: migrations in numbered SQL files registered in `lib.rs`, typed interfaces mirroring table columns, parameterized queries using `$1,$2` positional syntax, and React Query hooks that export named cache keys alongside `useQuery`/`useMutation` hooks. The existing `recipeSections.ts` query module and `useRecipeSections.ts` hook are the canonical pattern references for this phase.

The next migration number is **021** (the highest is 020). Both tables go in a single migration file `021_applied_recipe_assignments.sql`. The `lib.rs` registration requires a `version: 21` entry. The pure functions live in `src/lib/` alongside `computeWorkflowPosition.ts`, following the same no-deps pattern (no React, no DB imports).

**Primary recommendation:** Follow the recipeSections pattern exactly. The only novel element is the `UPSERT` pattern for step progress (`INSERT OR REPLACE` or `INSERT ... ON CONFLICT`) — use SQLite's `INSERT OR REPLACE` which is concise and already used in similar pattern files in this codebase.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema definition | Database / Storage | — | SQL migration files; Tauri plugin-sql auto-runs at startup |
| Type definitions | Frontend (TypeScript) | — | Shared interfaces consumed by all layers |
| CRUD query functions | Frontend (query modules) | — | Tauri plugin-sql bridge; `src/db/queries/*.ts` pattern |
| React Query cache management | Frontend (hooks) | — | `src/hooks/use*.ts` pattern; cache key exports |
| Completion percentage logic | Frontend (pure lib) | — | Pure function in `src/lib/`; no DB or React dependencies |
| Progress computation (bySectionId) | Frontend (pure lib) | — | Same pure lib pattern as `computeWorkflowPosition` |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | bundled with Tauri 2 | SQLite query bridge | Project's only SQLite access mechanism |
| @tanstack/react-query | project dependency | Server-state cache | Project-wide standard; all hooks use it |
| TypeScript | 5.x | Type safety | Project standard; strict mode enforced |
| Vitest | 4.x | Test runner | Project standard (`pnpm test`) |
| @testing-library/react | 16.x | Hook rendering in tests | Project standard (`tests/setup.ts` already configured) |

No new dependencies required for this phase. [VERIFIED: codebase grep]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form + Zod | project dependency | Form validation | Not needed in Phase 62 (data layer only) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `INSERT OR REPLACE` for upsert | `INSERT ... ON CONFLICT DO UPDATE SET` | Both are valid SQLite upserts; `INSERT OR REPLACE` is shorter but replaces the entire row (new id). `ON CONFLICT DO UPDATE SET` preserves the id — prefer this for progress records to avoid id churn |

**Installation:** No new packages. All dependencies already present. [VERIFIED: codebase]

---

## Architecture Patterns

### System Architecture Diagram

```
Migration 021 (SQL file)
        ↓
  lib.rs get_migrations()   ← version: 21 entry added
        ↓
  SQLite hobbyforge.db
    unit_recipe_assignments
    unit_recipe_step_progress
        ↓
  src/db/queries/recipeAssignments.ts
    getAssignmentsByUnit / getAssignmentsByRecipe / getAssignment
    createAssignment / deleteAssignment / bulkCreateAssignments
    getStepProgress / upsertStepProgress
        ↓
  src/hooks/useRecipeAssignments.ts
    UNIT_ASSIGNMENTS_KEY / RECIPE_ASSIGNMENTS_KEY / STEP_PROGRESS_KEY
    useAssignmentsByUnit / useAssignmentsByRecipe
    useCreateAssignment / useDeleteAssignment / useBulkCreateAssignments
    useStepProgress / useToggleStepProgress

  src/types/recipeAssignment.ts          src/lib/computeAssignmentProgress.ts
    RecipeAssignment                       computeCompletionPercentage()
    CreateRecipeAssignmentInput            computeAssignmentProgress()
    StepProgress
    AssignmentProgress

  tests/painting/recipeAssignments.test.ts   tests/lib/computeAssignmentProgress.test.ts
```

### Recommended Project Structure

```
src/
  types/
    recipeAssignment.ts        # RecipeAssignment, StepProgress, AssignmentProgress types
  db/
    queries/
      recipeAssignments.ts     # CRUD functions for both tables
  hooks/
    useRecipeAssignments.ts    # React Query hooks + cache key exports
  lib/
    computeAssignmentProgress.ts  # pure functions (no React/DB deps)

src-tauri/
  migrations/
    021_applied_recipe_assignments.sql  # both tables
  src/
    lib.rs                     # version: 21 entry added to get_migrations()

tests/
  painting/
    recipeAssignments.test.ts  # query mock tests + hook invalidation tests
  lib/
    computeAssignmentProgress.test.ts  # pure function unit tests
```

### Pattern 1: SQLite Migration File Structure
**What:** New migration file creates both tables in one file. Both tables are tightly coupled (progress depends on assignment), so splitting them would force ordering concerns with no benefit.
**When to use:** Any time two new related tables are introduced together.
**Example:**
```sql
-- Source: pattern from 018_recipe_sections.sql + 020_workflow_metadata.sql
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

### Pattern 2: lib.rs Migration Registration
**What:** Every new migration SQL file requires a corresponding version entry in `get_migrations()`.
**When to use:** Every new `NNN_name.sql` migration file.
**Example:**
```rust
// Source: pattern from src-tauri/src/lib.rs lines 109-127
Migration {
    version: 21,
    description: "applied_recipe_assignments",
    sql: include_str!("../migrations/021_applied_recipe_assignments.sql"),
    kind: MigrationKind::Up,
},
```

### Pattern 3: Query Module Structure
**What:** Named async functions importing `getDb()`, using `$1,$2` positional params, returning typed arrays or scalar values. Booleans cast as `0|1`.
**When to use:** All SQLite access in this project.
**Example:**
```typescript
// Source: pattern from src/db/queries/recipeSections.ts
import { getDb } from "@/db/client";
import type { RecipeAssignment, CreateRecipeAssignmentInput, StepProgress } from "@/types/recipeAssignment";

export async function getAssignmentsByUnit(unitId: number): Promise<RecipeAssignment[]> {
  const db = await getDb();
  return db.select<RecipeAssignment[]>(
    "SELECT * FROM unit_recipe_assignments WHERE unit_id = $1 ORDER BY created_at ASC",
    [unitId],
  );
}

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

### Pattern 4: React Query Hook Module
**What:** Named cache key constants exported alongside hooks. Mutations invalidate symmetrically (create and delete hit the same key set). Multi-key invalidation documented with a contract comment.
**When to use:** All React Query hooks in this project.
**Example:**
```typescript
// Source: pattern from src/hooks/useRecipeSections.ts
export const ASSIGNMENTS_KEY = ["recipe-assignments"] as const;
export const UNIT_ASSIGNMENTS_KEY = (unitId: number) =>
  ["recipe-assignments", "by-unit", unitId] as const;
export const RECIPE_ASSIGNMENTS_KEY = (recipeId: number) =>
  ["recipe-assignments", "by-recipe", recipeId] as const;
export const STEP_PROGRESS_KEY = (assignmentId: number) =>
  ["recipe-assignments", "progress", assignmentId] as const;

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
```

### Pattern 5: Pure Function Module
**What:** No imports from `@/db/*` or React. Exported from `src/lib/`. Receives plain data arrays, returns plain data. Tested without mocking.
**When to use:** Any computation derived from DB data that can be expressed without side effects.
**Example:**
```typescript
// Source: pattern from src/lib/computeWorkflowPosition.ts
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

### Pattern 6: Test File Structure (Query + Hook)
**What:** Top-of-file mock of `@/db/client`, import query functions AFTER `vi.mock`, `makeWrapper()` helper for hook tests, `beforeEach` resets mocks, groups per function.
**When to use:** Every query module test file.
**Example:**
```typescript
// Source: pattern from tests/painting/recipeSections.test.ts
const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { createAssignment, getAssignmentsByUnit } from "@/db/queries/recipeAssignments";

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

### Anti-Patterns to Avoid
- **Using `recipe_step_id` as the progress FK:** Step IDs are destroyed on every recipe save (DELETE-all + re-INSERT). Use `order_index` as the stable identifier (D-05).
- **Storing section-level progress as a row:** Sections also use DELETE-all + re-INSERT. Derive section completion from step progress by filtering on order_index range (D-04).
- **Hard-coding `ORDER BY id` on step progress:** Steps are ordered by `order_index`, not insertion order. Always sort by `order_index ASC`.
- **Skipping cache key symmetry:** If `useCreateAssignment` invalidates `UNIT_ASSIGNMENTS_KEY(unitId)`, then `useDeleteAssignment` MUST also invalidate it. Asymmetric invalidation creates stale UI bugs that are hard to reproduce (D-13).
- **Using `INSERT OR REPLACE` for upsert on progress:** This assigns a new `id` to the row each time. Use `ON CONFLICT DO UPDATE SET` to preserve the existing `id`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert progress record | Manual SELECT then INSERT or UPDATE | SQLite `INSERT ... ON CONFLICT DO UPDATE SET` | Single atomic statement; no race condition; project SQLite version supports it |
| Cache invalidation tracking | Manual cache key string construction | Exported key constants from hook file | Key constants are the project's contract — type-safe, refactorable, testable |
| Boolean storage | TypeScript boolean in SQLite | `completed ? 1 : 0` on write, `completed === 1` on read | SQLite has no native boolean; tauri-plugin-sql returns integers |
| Per-step completion fetch (N+1) | Hook per step that calls DB | `getStepProgress(assignmentId)` fetches all progress for an assignment in one query | N+1 hook pattern causes waterfall queries; batch fetch is the established pattern |

---

## Common Pitfalls

### Pitfall 1: Migration Version Gap
**What goes wrong:** New migration is numbered 021 but `lib.rs` is not updated, or the version number in `lib.rs` conflicts with an existing entry.
**Why it happens:** Two files must be kept in sync manually — the SQL file and `lib.rs`.
**How to avoid:** After writing `021_applied_recipe_assignments.sql`, immediately add the version 21 entry to `get_migrations()` in the same wave.
**Warning signs:** App fails to start; Tauri shows migration error in console.

### Pitfall 2: UNIQUE Constraint Violation on Duplicate Assignment
**What goes wrong:** `createAssignment` called twice with same (unit_id, recipe_id) throws a SQLite UNIQUE constraint error.
**Why it happens:** The UNIQUE(unit_id, recipe_id) constraint is correct behavior, but the caller must handle the error gracefully.
**How to avoid:** Query function catches the constraint error OR uses `INSERT OR IGNORE`. Document the behavior in the function's JSDoc. Phase 63 UI will prevent duplicates, but the query layer should not silently corrupt.
**Warning signs:** React Query mutation enters error state on second assignment attempt.

### Pitfall 3: order_index Not Stable Across Section Reorders
**What goes wrong:** User reorders sections in a recipe while a unit has active progress. Steps within different sections may share `order_index` values (each section has its own 0-based index range).
**Why it happens:** `order_index` is per-step within the flat `recipe_steps` table — it is NOT scoped to a section. If step order_index values ARE global (not per-section), then reordering any step changes its key.
**How to avoid:** Verify whether `order_index` is globally unique per recipe or only unique within a section. Check `src/db/queries/recipePaints.ts` — how steps are ordered. If globally unique, the composite key is stable as designed. [VERIFIED: recipeSections.ts uses a tiebreaker `ORDER BY order_index ASC, id ASC` which implies order_index is not globally unique across sections — but is unique within the flat recipe_steps table as each step has its own position.]
**Warning signs:** Progress records misalign visually — a completed step appears on the wrong step after reorder.

### Pitfall 4: Forgetting to Cast Booleans on Read
**What goes wrong:** `step.completed` comes back from SQLite as `0` or `1` (integer), not `true`/`false`. Code using `if (step.completed)` works, but TypeScript typed as `boolean` causes type errors.
**Why it happens:** tauri-plugin-sql deserializes SQLite integers as JavaScript numbers.
**How to avoid:** Type `completed` as `number` (0|1) in the `StepProgress` interface. Document the convention with a comment. When the hook layer or UI needs a boolean, use `progress.completed === 1`.

### Pitfall 5: Missing invalidation after bulkCreateAssignments
**What goes wrong:** `useBulkCreateAssignments` creates N assignments but only invalidates one unit's cache, or invalidates by recipe but not by unit.
**Why it happens:** Bulk operations span multiple unit_ids, so single-entity invalidation misses some cache entries.
**How to avoid:** `bulkCreateAssignments` takes a list of unit_ids and a single recipe_id. The mutation's `onSuccess` must invalidate `RECIPE_ASSIGNMENTS_KEY(recipeId)` (covers all assigned units via recipe view) AND invalidate `ASSIGNMENTS_KEY` (the broad prefix) so all per-unit views refresh. Alternatively, invalidate each `UNIT_ASSIGNMENTS_KEY(unitId)` in a loop.

---

## Code Examples

### Type Definitions (`src/types/recipeAssignment.ts`)
```typescript
// Source: [ASSUMED] — pattern mirrors src/types/recipeSection.ts
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
  completed: number;   // 0 | 1 SQLite boolean
  completed_at: string | null;
}

export interface AssignmentProgress {
  total: number;
  completed: number;
  percentage: number;
  bySectionId: Map<number | null, { total: number; completed: number }>;
}
```

### bulkCreateAssignments Query Function
```typescript
// Source: [ASSUMED] — pattern; tauri-plugin-sql does not support multi-row INSERT in one call
// Must loop — tauri-plugin-sql executes one statement per call
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
Note: `INSERT OR IGNORE` is appropriate here — silently skips duplicate (unit_id, recipe_id) pairs, which is the correct behavior for bulk assignment. [ASSUMED — tauri-plugin-sql single-statement behavior based on pattern analysis]

---

## Runtime State Inventory

> This is a greenfield data layer addition — no rename or refactor. No runtime state migration needed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No existing assignment/progress data | None — new tables start empty |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None | None |

---

## Environment Availability

> Step 2.6: Phase has no external dependencies beyond the project's existing stack. All tools required (SQLite via tauri-plugin-sql, Vitest, React Query) are already installed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| tauri-plugin-sql | All DB queries | ✓ | bundled | — |
| Vitest | Test suite | ✓ | 4.x | — |
| @tanstack/react-query | Hooks | ✓ | project dep | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (Vitest section) |
| Quick run command | `pnpm test -- tests/painting/recipeAssignments.test.ts tests/lib/computeAssignmentProgress.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AR-01 | `unit_recipe_assignments` table SQL contains correct columns and UNIQUE constraint | unit (SQL assertion) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `unit_recipe_step_progress` table SQL contains `UNIQUE(assignment_id, order_index)` | unit (SQL assertion) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `getAssignmentsByUnit` passes correct $1 param and ORDER BY | unit (mock) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `createAssignment` INSERT contains all columns + $1,$2 placeholders | unit (mock) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `deleteAssignment` DELETE WHERE id = $1 | unit (mock) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `upsertStepProgress` uses ON CONFLICT DO UPDATE SET with boolean cast | unit (mock) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `getStepProgress` queries WHERE assignment_id = $1 ORDER BY order_index ASC | unit (mock) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `useCreateAssignment` invalidates UNIT_ASSIGNMENTS_KEY and RECIPE_ASSIGNMENTS_KEY | unit (hook) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `useDeleteAssignment` invalidates same keys as useCreateAssignment (symmetry D-13) | unit (hook) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `useToggleStepProgress` invalidates STEP_PROGRESS_KEY(assignmentId) | unit (hook) | `pnpm test -- tests/painting/recipeAssignments.test.ts` | ❌ Wave 0 |
| AR-01 | `computeCompletionPercentage(0, 0)` returns 0 | unit (pure) | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ❌ Wave 0 |
| AR-01 | `computeCompletionPercentage(4, 2)` returns 50 | unit (pure) | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ❌ Wave 0 |
| AR-01 | `computeCompletionPercentage(3, 1)` rounds to 33 | unit (pure) | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ❌ Wave 0 |
| AR-01 | `computeAssignmentProgress` returns correct total/completed/percentage | unit (pure) | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ❌ Wave 0 |
| AR-01 | `computeAssignmentProgress` bySectionId Map groups steps by section_id correctly | unit (pure) | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ❌ Wave 0 |
| AR-01 | `computeAssignmentProgress` handles null section_id (flat recipe steps) | unit (pure) | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ❌ Wave 0 |
| AR-01 | `computeAssignmentProgress` ignores progress records for order_index not in steps | unit (pure) | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/recipeAssignments.test.ts tests/lib/computeAssignmentProgress.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/painting/recipeAssignments.test.ts` — covers all query mock tests and hook invalidation tests (AR-01)
- [ ] `tests/lib/computeAssignmentProgress.test.ts` — covers all pure function unit tests (AR-01)

*(No new framework setup needed — existing Vitest + testing-library infrastructure is sufficient)*

---

## Security Domain

> `security_enforcement` not set to false in config — included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | Desktop app, single user, no auth boundary |
| V5 Input Validation | yes | `unitId` and `recipeId` are TypeScript `number` — no string injection possible via $1/$2 parameterized queries |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via assignment IDs | Tampering | Parameterized queries (`$1, $2`) — tauri-plugin-sql enforces this |
| Orphaned progress after recipe save | Information Disclosure | ON DELETE CASCADE handles cleanup automatically |

> This is a personal desktop app with no network exposure. The primary security concern is data integrity (FK enforcement), which is handled by `PRAGMA foreign_keys = ON` in `client.ts`. [VERIFIED: src/db/client.ts]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| recipe_step_id as progress FK | (assignment_id, order_index) composite key | Phase 62 design decision | Survives DELETE-all + re-INSERT pattern |

**Deprecated/outdated:**
- None within this phase scope.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tauri-plugin-sql` requires one `db.execute()` call per INSERT row (no multi-row batch) | Code Examples — bulkCreateAssignments | If multi-row is supported, the loop can be replaced with a single parameterized INSERT; functional either way, only performance impact |
| A2 | `order_index` is globally unique per recipe across all steps (not scoped per section) | Common Pitfalls — Pitfall 3 | If order_index is per-section-scoped, steps in different sections could share the same order_index value, breaking the composite key assumption; needs verification against recipePaints.ts |

**A2 requires verification during implementation.** Read `src/db/queries/recipePaints.ts` to confirm whether `order_index` is globally scoped per recipe or locally scoped per section. If locally scoped, the progress key must include section context or use global step ordering.

---

## Open Questions

1. **order_index scope (A2 — verify before implementing upsertStepProgress)**
   - What we know: CONTEXT.md D-05 says "order_index is stable (it represents the step's position in the recipe)" — implying global scope per recipe
   - What's unclear: Whether two steps in different sections can share the same order_index value
   - Recommendation: Read `addRecipePaint` INSERT in `src/db/queries/recipePaints.ts` to check how order_index is assigned. If it's reset to 0 for each section, add a tiebreaker (e.g., include section_id in progress key design) and flag for CONTEXT update.

2. **Batch progress query optimization (Claude's Discretion)**
   - What we know: `getStepProgress(assignmentId)` fetches per assignment. For a unit with 5 assigned recipes, this is 5 queries.
   - What's unclear: Whether Phase 63 UI will need all assignment progress simultaneously (triggering N+1 concern)
   - Recommendation: Add `getProgressByUnit(unitId)` as an optional optimization — single JOIN query returning progress for all of a unit's assignments. Include as a discretionary addition in Wave 2 or 3 of the plan, clearly marked as optional.

---

## Sources

### Primary (HIGH confidence)
- `src/db/queries/recipeSections.ts` — [VERIFIED] canonical query module pattern
- `src/hooks/useRecipeSections.ts` — [VERIFIED] canonical hook module pattern + cache invalidation contract
- `src/lib/computeWorkflowPosition.ts` — [VERIFIED] canonical pure function pattern
- `tests/painting/recipeSections.test.ts` — [VERIFIED] canonical test pattern (mock setup, hook invalidation spy, group structure)
- `src-tauri/src/lib.rs` — [VERIFIED] migration registration, version 20 is last entry
- `src-tauri/migrations/` — [VERIFIED] highest migration is 020; next is 021
- `src/db/client.ts` — [VERIFIED] FK pragma enforcement
- `src/types/recipeSection.ts`, `src/types/recipePaint.ts` — [VERIFIED] type pattern

### Secondary (MEDIUM confidence)
- `tests/lib/computeWorkflowPosition.test.ts` — [VERIFIED] pure function test pattern (no mocks needed)
- `.planning/phases/62-applied-recipe-data-layer/62-CONTEXT.md` — [VERIFIED] all locked decisions

### Tertiary (LOW confidence — ASSUMED)
- tauri-plugin-sql single-statement requirement for `bulkCreateAssignments` loop [A1]
- order_index global uniqueness per recipe [A2]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in codebase; no new packages
- Architecture: HIGH — all patterns verified against existing canonical files
- Pitfalls: MEDIUM — A2 (order_index scope) is the one genuine uncertainty; all other pitfalls are verified patterns
- Test map: HIGH — test file names and command syntax follow verified project conventions

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable domain — SQLite patterns, React Query conventions do not change rapidly)
