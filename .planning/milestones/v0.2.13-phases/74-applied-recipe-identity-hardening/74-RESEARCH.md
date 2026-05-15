# Phase 74: Applied Recipe Identity Hardening - Research

**Researched:** 2026-05-14
**Domain:** SQLite schema migration + TypeScript data layer refactor
**Confidence:** HIGH

## Summary

Phase 74 replaces the `order_index`-keyed step progress system with a `recipe_step_id`-keyed system, ensuring that reordering recipe steps never moves or loses completion markers. The change spans four layers: a SQLite table-rebuild migration (028), the query module (`recipeAssignments.ts`), the pure computation function (`computeAssignmentProgress.ts`), and three UI consumer sites (AssignmentChecklist, LogSessionSheet, DashboardPage/KanbanEnrichment).

The migration is the riskiest piece: it must back-fill existing `order_index`-keyed progress rows to `recipe_step_id` by joining through the assignment's recipe to its steps. Multi-section recipes complicate this because `order_index` resets per section, so the JOIN must reconstruct global step ordering. The CONTEXT.md decisions (D-01 through D-12) provide a clear, locked implementation path.

**Primary recommendation:** Implement as a migration-first, then query/type layer, then UI consumers sequence. The migration (028) uses the table-rebuild pattern already proven in migration 022. All consumer changes are mechanical find-and-replace of `order_index` with `recipe_step_id`/`step.id`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Table-rebuild pattern (CREATE new, INSERT...SELECT with JOIN, DROP old, RENAME) since SQLite cannot ALTER CONSTRAINT
- **D-02:** Back-fill JOIN path: progress -> assignments (get recipe_id) -> recipe_steps (match on recipe_id AND order_index AND section_id)
- **D-03:** Section context handling: flat recipes (section_id IS NULL) have globally unique order_index; sectioned recipes need per-section disambiguation
- **D-04:** New table schema: id, assignment_id (FK), recipe_step_id (FK), completed, completed_at, UNIQUE(assignment_id, recipe_step_id)
- **D-05:** FK on recipe_step_id with ON DELETE CASCADE
- **D-06:** Orphaned progress rows dropped during back-fill (unmappable = stale)
- **D-07:** Migration logs dropped rows as comment (best-effort; Phase 77 Data Health handles ongoing detection)
- **D-08:** StepProgress type: order_index -> recipe_step_id, clean break
- **D-09:** upsertStepProgress signature: orderIndex -> recipeStepId, ON CONFLICT updates accordingly
- **D-10:** getStepProgress query ordering changes (planner decides JOIN vs direct ORDER BY)
- **D-11:** computeAssignmentProgress: progressMap key changes from order_index to step.id
- **D-12:** AssignmentChecklist: completedSet from Set<order_index> to Set<recipe_step_id>, handleToggle passes step.id

### Claude's Discretion
- Migration file naming (028_*.sql)
- Whether getStepProgress orders by recipe_step_id directly or JOINs to recipe_steps for order_index-based display ordering
- Test file structure and coverage strategy

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DI-01 | Applied recipe step progress keyed by recipe_step_id, not order_index -- reordering steps does not move completion | Migration 028 rebuilds table with recipe_step_id FK + UNIQUE(assignment_id, recipe_step_id); query/hook/component layers updated to use step.id instead of order_index |
| DI-02 | Existing progress rows migrated safely from order_index to recipe_step_id with section-disambiguated back-fill | Back-fill INSERT...SELECT JOINs through unit_recipe_assignments -> recipe_steps matching on recipe_id + order_index + section_id; orphaned rows dropped per D-06 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema migration (table rebuild + back-fill) | Database / Storage | -- | Pure SQL migration, runs at app start via Tauri plugin-sql |
| Step progress CRUD | API / Backend (query layer) | -- | `src/db/queries/recipeAssignments.ts` owns all DB access |
| Progress computation | Frontend (pure function) | -- | `computeAssignmentProgress.ts` is a zero-dependency pure function |
| Checklist UI | Browser / Client | -- | React components consume hooks, no server-side rendering |
| Rust migration registration | API / Backend | -- | `lib.rs` get_migrations() must include migration 028 |

## Standard Stack

No new libraries needed. This phase modifies existing code only.

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | (bundled with Tauri 2) | SQLite migration runner + query API | Project's DB layer [VERIFIED: src-tauri/Cargo.toml] |
| @tanstack/react-query | (project dep) | Server state + cache invalidation | Project's data layer [VERIFIED: useRecipeAssignments.ts] |
| vitest | 4.x | Test runner | Project's test framework [VERIFIED: CLAUDE.md] |

## Architecture Patterns

### System Architecture Diagram

```
Migration 028 (app start)
  |
  v
unit_recipe_step_progress (rebuilt with recipe_step_id FK)
  |
  v
recipeAssignments.ts (getStepProgress / upsertStepProgress)
  |
  v
useRecipeAssignments.ts (useStepProgress / useToggleStepProgress hooks)
  |                    \
  v                     v
AssignmentChecklist    LogSessionSheet      DashboardPage / useKanbanEnrichment
(checkbox UI)          (auto-mark step)     (progress display)
  |                     |                    |
  v                     v                    v
computeAssignmentProgress.ts (pure function: step.id matching)
```

### Pattern 1: SQLite Table Rebuild (proven in migration 022)
**What:** Since SQLite cannot ALTER COLUMN or DROP COLUMN, schema changes require creating a new table, copying data via INSERT...SELECT, dropping the old table, and renaming. [VERIFIED: migration 022_paintless_steps.sql]
**When to use:** Any column type change, constraint change, or FK addition on an existing table.
**Example:**
```sql
-- Source: src-tauri/migrations/022_paintless_steps.sql
PRAGMA foreign_keys = OFF;

CREATE TABLE table_new ( ... new schema ... );

INSERT INTO table_new (col1, col2, ...)
SELECT col1, col2, ... FROM old_table;

DROP TABLE old_table;

ALTER TABLE table_new RENAME TO old_table;

PRAGMA foreign_keys = ON;
```

### Pattern 2: Back-Fill JOIN for Identity Resolution
**What:** The migration must map each `(assignment_id, order_index)` progress row to a `recipe_step_id` by joining through `unit_recipe_assignments` to get `recipe_id`, then to `recipe_steps` to find the step with matching `order_index`. [VERIFIED: current schema in migrations 018, 021]
**Critical detail:** For multi-section recipes, `order_index` is NOT globally unique -- it resets per section. However, examining the actual data model reveals that `recipe_steps.section_id` is stored on each step, and section_id is also part of the step's identity. The back-fill can use a ROW_NUMBER() approach or a direct JOIN if order_index values happen to be globally unique within each recipe (see Open Questions).

### Pattern 3: Upsert with ON CONFLICT
**What:** The existing `upsertStepProgress` uses `ON CONFLICT(assignment_id, order_index) DO UPDATE SET`. After migration, this becomes `ON CONFLICT(assignment_id, recipe_step_id) DO UPDATE SET`. [VERIFIED: recipeAssignments.ts lines 88-94]

### Anti-Patterns to Avoid
- **Editing existing migration files:** Never modify 021_applied_recipe_assignments.sql. The migration system runs in filename order; changes to already-run migrations are ignored. [VERIFIED: CLAUDE.md "never edit existing migration files"]
- **Nested transactions:** Tauri plugin-sql cannot nest BEGIN/COMMIT. The migration itself runs as a single transaction managed by the plugin. [VERIFIED: STATE.md accumulated context]
- **Using INSERT OR REPLACE instead of ON CONFLICT DO UPDATE:** INSERT OR REPLACE deletes and re-inserts, losing the original row id. The existing pattern correctly uses ON CONFLICT DO UPDATE SET. [VERIFIED: recipeAssignments.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema migration | Manual ALTER TABLE attempts | Table-rebuild pattern (proven in 022) | SQLite's ALTER TABLE is extremely limited |
| Migration execution | Custom migration runner | Tauri plugin-sql migration system | Already handles ordering, versioning, error rollback |
| Cache invalidation | Manual state sync | React Query invalidateQueries | Project pattern, handles all subscriber updates |

## Common Pitfalls

### Pitfall 1: Multi-Section order_index Ambiguity
**What goes wrong:** In multi-section recipes, order_index can restart at 0 in each section. A naive JOIN on `(recipe_id, order_index)` without section context will match the wrong step or return multiple matches.
**Why it happens:** The original progress table stored only `order_index` with no section context. When recipes have multiple sections, the same order_index value can appear in different sections.
**How to avoid:** The back-fill JOIN must either (a) use ROW_NUMBER() OVER (PARTITION BY recipe_id ORDER BY section order, step order) to create a global ordinal, or (b) determine that order_index values are in fact globally unique per recipe (assigned 0..N across all sections, not per section). See Open Questions.
**Warning signs:** After migration, completed steps appear on wrong steps in multi-section recipes.

### Pitfall 2: PRAGMA foreign_keys = OFF Scope
**What goes wrong:** Forgetting to disable FK checks during the table rebuild causes the DROP TABLE to fail (other tables reference `unit_recipe_step_progress`).
**Why it happens:** SQLite enforces FK constraints on DROP if foreign_keys pragma is ON.
**How to avoid:** Wrap the rebuild in `PRAGMA foreign_keys = OFF` / `PRAGMA foreign_keys = ON`, exactly as migration 022 does. [VERIFIED: 022_paintless_steps.sql lines 3, 36]
**Warning signs:** Migration fails at DROP TABLE step.

### Pitfall 3: LogSessionSheet Consumer (Undocumented in CONTEXT.md)
**What goes wrong:** LogSessionSheet at line 206-209 calls `toggleStepProgress.mutateAsync({ assignmentId, orderIndex: step.order_index, completed: true })`. If this is not updated to use `step.id`, logging a painting session will pass the wrong key.
**Why it happens:** CONTEXT.md D-12 only mentions AssignmentChecklist as the UI consumer, but LogSessionSheet also calls `useToggleStepProgress` directly.
**How to avoid:** Update LogSessionSheet line 208 from `orderIndex: step.order_index` to `recipeStepId: step.id`. [VERIFIED: LogSessionSheet.tsx line 206-209]
**Warning signs:** Logging a session with a recipe step selected creates a progress row with wrong recipe_step_id or fails the UNIQUE constraint.

### Pitfall 4: Orphaned Progress After Step Deletion
**What goes wrong:** With ON DELETE CASCADE on recipe_step_id FK, deleting a recipe step now automatically deletes associated progress rows. Previously (with order_index key), progress rows were orphaned but harmless.
**Why it happens:** This is actually the desired behavior (D-05), but it's a semantic change worth noting.
**How to avoid:** This is correct behavior per D-05. No action needed, just awareness.

### Pitfall 5: getStepProgress ORDER BY After Migration
**What goes wrong:** After migration, `ORDER BY order_index ASC` no longer exists. If changed to `ORDER BY recipe_step_id ASC`, steps display in creation order (step id), not the user's custom display order.
**Why it happens:** recipe_step_id is an autoincrement PK; ordering by it reflects creation order, not display order.
**How to avoid:** Either (a) JOIN to recipe_steps and ORDER BY section order + step order_index for display-correct ordering, or (b) accept recipe_step_id ordering since the UI already fetches steps separately and matches by id (the progress array order doesn't matter if lookup is by key). Recommendation: option (b) -- the UI builds a `completedSet` from progress data and looks up by step id, so progress row ordering is irrelevant. [VERIFIED: AssignmentChecklist.tsx line 30-32]

## Code Examples

### Migration 028: Table Rebuild with Back-Fill
```sql
-- Source: Based on proven pattern from 022_paintless_steps.sql
-- Back-fill JOIN path per D-02

PRAGMA foreign_keys = OFF;

CREATE TABLE unit_recipe_step_progress_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id   INTEGER NOT NULL REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE,
    recipe_step_id  INTEGER NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
    completed       INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT,
    UNIQUE(assignment_id, recipe_step_id)
);

-- Back-fill: resolve order_index -> recipe_step_id via assignment's recipe
INSERT INTO unit_recipe_step_progress_new (assignment_id, recipe_step_id, completed, completed_at)
SELECT
    p.assignment_id,
    rs.id AS recipe_step_id,
    p.completed,
    p.completed_at
FROM unit_recipe_step_progress p
JOIN unit_recipe_assignments a ON a.id = p.assignment_id
JOIN recipe_steps rs ON rs.recipe_id = a.recipe_id AND rs.order_index = p.order_index
-- D-06: rows with no matching step are silently dropped (LEFT JOIN not used)
;

DROP TABLE unit_recipe_step_progress;

ALTER TABLE unit_recipe_step_progress_new RENAME TO unit_recipe_step_progress;

PRAGMA foreign_keys = ON;
```

**Note:** The above JOIN assumes order_index is globally unique per recipe. If it is per-section, the query needs additional disambiguation (see Open Questions).

### Updated upsertStepProgress
```typescript
// Source: Based on current recipeAssignments.ts, updated per D-09
export async function upsertStepProgress(
  assignmentId: number,
  recipeStepId: number,
  completed: boolean,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed, completed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(assignment_id, recipe_step_id) DO UPDATE SET
       completed = excluded.completed,
       completed_at = excluded.completed_at`,
    [
      assignmentId,
      recipeStepId,
      completed ? 1 : 0,
      completed ? new Date().toISOString() : null,
    ],
  );
}
```

### Updated computeAssignmentProgress
```typescript
// Source: Based on current computeAssignmentProgress.ts, updated per D-11
export function computeAssignmentProgress(
  steps: ReadonlyArray<{ id: number; section_id: number | null }>,
  progress: ReadonlyArray<{ recipe_step_id: number; completed: number }>,
): AssignmentProgress {
  // Build lookup: recipe_step_id -> completed (0 | 1)
  const progressMap = new Map<number, number>();
  for (const p of progress) {
    progressMap.set(p.recipe_step_id, p.completed);
  }
  // ... rest unchanged, uses step.id instead of step.order_index
}
```

### Updated AssignmentChecklist (key change)
```typescript
// Source: Based on current AssignmentChecklist.tsx, updated per D-12
const completedSet = useMemo(
  () => new Set(stepProgressRows.filter((p) => p.completed === 1).map((p) => p.recipe_step_id)),
  [stepProgressRows],
);

function handleToggle(recipeStepId: number, checked: boolean) {
  toggleStep.mutate({
    assignmentId: assignment.id,
    recipeStepId,
    completed: checked,
  });
}
// In JSX: step.id instead of step.order_index
```

## Complete Consumer Inventory

All sites that read or write step progress (must all be updated):

| File | Function/Component | Current Usage | Required Change |
|------|--------------------|---------------|-----------------|
| `src/types/recipeAssignment.ts` | StepProgress interface | `order_index: number` | Change to `recipe_step_id: number` |
| `src/db/queries/recipeAssignments.ts` | getStepProgress | `ORDER BY order_index` | `ORDER BY recipe_step_id` (or remove ORDER BY) |
| `src/db/queries/recipeAssignments.ts` | upsertStepProgress | `(assignment_id, order_index)` params + ON CONFLICT | `(assignment_id, recipe_step_id)` params + ON CONFLICT |
| `src/lib/computeAssignmentProgress.ts` | computeAssignmentProgress | `step.order_index` matching | `step.id` / `p.recipe_step_id` matching |
| `src/hooks/useRecipeAssignments.ts` | useToggleStepProgress | `{ orderIndex: number }` in mutation params | `{ recipeStepId: number }` |
| `src/features/recipes/AssignmentChecklist.tsx` | completedSet + handleToggle | `p.order_index` / `step.order_index` | `p.recipe_step_id` / `step.id` |
| `src/features/dashboard/LogSessionSheet.tsx` | auto-mark step (line 206-209) | `orderIndex: step.order_index` | `recipeStepId: step.id` |
| `src/hooks/useKanbanEnrichment.ts` | computeAssignmentProgress call | Passes steps + progressRows (types flow through) | No code change needed -- types propagate |
| `src/features/dashboard/DashboardPage.tsx` | computeAssignmentProgress call | Passes steps + progressRows (types flow through) | No code change needed -- types propagate |
| `src-tauri/src/lib.rs` | get_migrations() | 27 migrations registered | Add migration 28 entry |

[VERIFIED: All entries confirmed via grep of `stepProgress|step_progress|StepProgress|completedSet|order_index.*progress|toggleStepProgress` across src/]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| order_index as progress key | recipe_step_id as progress key | Phase 74 (this phase) | Reordering steps no longer breaks progress tracking |
| No FK on progress -> steps | ON DELETE CASCADE FK | Phase 74 (this phase) | Deleting a step auto-cleans progress (correct behavior) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | order_index values in recipe_steps are globally unique per recipe (0..N across all sections), not per-section | Migration back-fill JOIN | HIGH -- if order_index resets per section, the simple JOIN produces wrong mappings or duplicates. See Open Questions. |

## Open Questions

1. **Are order_index values globally unique per recipe, or do they reset per section?**
   - What we know: The recipe editor assigns order_index values. Migration 018 created sections and back-filled existing steps into a default section. The CONTEXT.md mentions that "order_index resets per section" for multi-section recipes and suggests ROW_NUMBER() approach.
   - What's unclear: Whether the current recipe save logic actually produces per-section order_index (0, 1, 2 in section A; 0, 1, 2 in section B) or global order_index (0, 1, 2 in section A; 3, 4, 5 in section B).
   - Recommendation: The planner should include a verification step early in execution. Query the database: `SELECT rs.recipe_id, rs.section_id, rs.order_index, rs.id FROM recipe_steps rs ORDER BY rs.recipe_id, rs.section_id, rs.order_index` and check if any recipe has duplicate order_index values across sections. If duplicates exist, the back-fill needs the ROW_NUMBER() approach. If order_index is globally unique, the simple JOIN suffices. **Both SQL variants should be prepared in the plan.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DI-01 | computeAssignmentProgress uses step.id matching | unit | `pnpm test -- tests/lib/computeAssignmentProgress.test.ts` | Yes (needs update) |
| DI-01 | AssignmentChecklist passes step.id to toggle | unit | `pnpm test -- tests/applied-recipes/assignmentChecklist.test.ts` | Yes (needs update) |
| DI-02 | Migration back-fill SQL correctness | manual-only | Verify via `SELECT COUNT(*) FROM unit_recipe_step_progress` before/after | N/A (SQL migration) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/lib/computeAssignmentProgress.test.ts tests/applied-recipes/assignmentChecklist.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/computeAssignmentProgress.test.ts` -- update test fixtures from `order_index` to `id`/`recipe_step_id` matching
- [ ] `tests/applied-recipes/assignmentChecklist.test.ts` -- update mock types and assertion from `orderIndex` to `recipeStepId`

## Sources

### Primary (HIGH confidence)
- `src-tauri/migrations/021_applied_recipe_assignments.sql` -- current table schema
- `src-tauri/migrations/022_paintless_steps.sql` -- table-rebuild pattern reference
- `src-tauri/migrations/018_recipe_sections.sql` -- section schema and back-fill pattern
- `src/db/queries/recipeAssignments.ts` -- current query implementations
- `src/types/recipeAssignment.ts` -- current type definitions
- `src/lib/computeAssignmentProgress.ts` -- current pure function
- `src/features/recipes/AssignmentChecklist.tsx` -- current UI consumer
- `src/features/dashboard/LogSessionSheet.tsx` -- additional UI consumer (lines 206-209)
- `src/hooks/useRecipeAssignments.ts` -- current hook layer
- `src/hooks/useKanbanEnrichment.ts` -- indirect consumer via computeAssignmentProgress
- `src-tauri/src/lib.rs` -- migration registration pattern

### Secondary (MEDIUM confidence)
- `src/features/dashboard/DashboardPage.tsx` -- indirect consumer via hooks

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing code verified
- Architecture: HIGH -- all consumer sites identified and verified via grep
- Pitfalls: HIGH -- table-rebuild pattern proven in project, all edge cases documented
- Migration back-fill: MEDIUM -- order_index uniqueness assumption needs runtime verification (A1)

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable -- no external dependencies)
