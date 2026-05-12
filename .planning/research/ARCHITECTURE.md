# Architecture Research

**Domain:** Warhammer hobby management — applied recipes, points import, list validation
**Researched:** 2026-05-12
**Confidence:** HIGH (all findings derived from direct codebase inspection of 290 TypeScript files and 20 migrations; no training-data assumptions)

---

## Existing Architecture Snapshot

Confirmed facts from codebase analysis (not training-data assumptions):

- **Dual DB**: `hobbyforge.db` (all user/app data, 20 migrations applied) + `rules.db` (Wahapedia rules, wiped on every sync). Cross-DB FKs are impossible in SQLite; text-copy denormalization is the established pattern (`detachment_name`, `weapon_name`, `section_name`).
- **Data layer**: `src/db/queries/*.ts` — raw SQL, positional `$1,$2` params, no ORM. 24 query modules.
- **Hook layer**: `src/hooks/use*.ts` — React Query wrappers. Mutation `onSuccess` drives all cache invalidation. Symmetry rule: if `useCreate` invalidates a key, `useDelete` must too.
- **Points COALESCE (current, 3-level)**: `COALESCE(alu.points_override, uo.points, u.points, 0)` — appears in both `getArmyListWithUnits` and `getArmyListReadiness` in `src/db/queries/armyLists.ts`.
- **Recipe structure**: `painting_recipes` → `recipe_sections` (with workflow metadata columns: section_type, technique, execution_mode, applies_to) → `recipe_steps`. Save pattern: DELETE-all + re-INSERT per section. Sessions link to recipe/step via nullable FK (ON DELETE SET NULL).
- **Workflow position**: `computeWorkflowPosition` pure function in `src/lib/`. Consumed by `useWorkflowPositions` batch enrichment hook. Currently derives position from session history (last session with `recipe_step_id` or `section_name`).
- **Annotations pattern**: Page-level `Map<compositeKey, T>` built once via `useMemo`; prop-drilled. No N+1 hooks.
- **Boolean discipline**: SQLite booleans stored as `0 | 1` integers.
- **Points import design**: Pre-designed in `.planning/points-import-design.md`. Schema, COALESCE chain, delta algorithm, and JOIN additions are fully documented and ready to implement.
- **Next available migration number**: `021` (020 was `workflow_metadata.sql`).

---

## New Components

### 1. Applied Recipes — Two New Tables in hobbyforge.db

Migration `021_applied_recipes.sql`:

```sql
-- One assignment per (unit, recipe) pair.
-- unit_id: RESTRICT — delete unit must remove assignment first
-- recipe_id: SET NULL — recipe delete orphans assignment; recipe_name TEXT copy preserves display
CREATE TABLE IF NOT EXISTS unit_recipe_assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    recipe_id   INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL,
    recipe_name TEXT    NOT NULL,
    assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (unit_id, recipe_id)
);

-- Per-step completion. One row per (assignment, step).
-- assignment_id: CASCADE — removing assignment removes all progress
-- step_id: SET NULL — step delete preserves completion record; exclude NULL step_id from counts
-- section_id: denormalized for efficient section-level completion queries
CREATE TABLE IF NOT EXISTS unit_recipe_step_progress (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE,
    step_id       INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL,
    section_id    INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL,
    completed     INTEGER NOT NULL DEFAULT 0,
    completed_at  TEXT,
    UNIQUE (assignment_id, step_id)
);
```

Design rationale:
- `recipe_name` TEXT copy mirrors `detachment_name` and `section_name` patterns — recipe deletion sets `recipe_id = NULL` but preserves display.
- `section_id` denormalized on progress rows enables section-level completion queries (e.g., "Basecoat section: 3/5 steps") without joining through `recipe_steps`.
- `UNIQUE (unit_id, recipe_id)` allows one unit to have multiple assigned recipes (e.g., one for armour, one for basing) — there is no artificial "one recipe per unit" restriction.
- Do NOT use `INSERT OR REPLACE` for progress toggle — it changes the row `id`, breaking any future FK references. Use `INSERT ... ON CONFLICT (assignment_id, step_id) DO UPDATE SET completed = $3, completed_at = $4`.

### 2. Points Import — Two New Tables in hobbyforge.db

Migration `022_points_imports.sql` (pre-designed schema from `.planning/points-import-design.md`):

```sql
CREATE TABLE IF NOT EXISTS points_imports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_name   TEXT    NOT NULL,
    faction_id  TEXT,                              -- Wahapedia text key (e.g. "SM"), NOT factions.id integer
    points      INTEGER NOT NULL,
    source      TEXT    NOT NULL DEFAULT 'csv',
    imported_at TEXT    NOT NULL DEFAULT (datetime('now')),
    version     TEXT,
    UNIQUE (unit_name, faction_id)
);

CREATE TABLE IF NOT EXISTS points_import_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    imported_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    source_file   TEXT,
    version       TEXT,
    row_count     INTEGER NOT NULL DEFAULT 0,
    delta_added   INTEGER NOT NULL DEFAULT 0,
    delta_removed INTEGER NOT NULL DEFAULT 0,
    delta_changed INTEGER NOT NULL DEFAULT 0
);
```

### 3. Tactical Tags — One New Table in hobbyforge.db

Can be part of migration `022_points_imports.sql` or a separate `023_tactical_tags.sql`:

```sql
-- Per-unit role tags for list coverage analysis (LV-02, LV-03).
-- Individual rows (not JSON array) for efficient GROUP BY aggregation.
CREATE TABLE IF NOT EXISTS unit_tactical_tags (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id    INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tag        TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (unit_id, tag)
);
```

### 4. New Query Modules

| File | Contents |
|------|----------|
| `src/db/queries/recipeAssignments.ts` | CRUD for `unit_recipe_assignments`; batch fetch by unit IDs; `bulkAssignRecipe(recipeId, unitIds[])` transaction |
| `src/db/queries/recipeProgress.ts` | Toggle step completion via upsert; get completion summary by assignment; get section-level completion counts |
| `src/db/queries/pointsImports.ts` | Import transaction (snapshot → upsert → delete removals → delta → history); `getLatestImport()`; `getImportHistory()` |
| `src/db/queries/listValidation.ts` | Aggregation queries: points totals with 5-level COALESCE, freshness check, ownership/readiness warnings, tactical tag coverage |
| `src/db/queries/tacticalTags.ts` | CRUD for `unit_tactical_tags`; batch fetch by unit IDs; batch fetch by list (joins through army_list_units) |

### 5. New Hooks

| File | Cache Keys | Invalidated By |
|------|-----------|----------------|
| `src/hooks/useRecipeAssignments.ts` | `["recipe-assignments", unitId]` | useCreateAssignment, useDeleteAssignment |
| `src/hooks/useRecipeProgress.ts` | `["recipe-progress", assignmentId]` | useToggleStepProgress, useCreateAssignment |
| `src/hooks/usePointsImports.ts` | `["points-imports"]`, `["points-import-history"]` | useImportPoints |
| `src/hooks/useListValidation.ts` | `["list-validation", listId]` | useImportPoints, useUpdateArmyListUnit, useAddUnitToList, useRemoveUnitFromList, useCreateTag, useDeleteTag |
| `src/hooks/useTacticalTags.ts` | `["tactical-tags", unitId]` | useCreateTag, useDeleteTag |

### 6. New Pure Functions

| File | Purpose |
|------|---------|
| `src/lib/computeAppliedRecipePosition.ts` | Given assignment + progress rows + sections + steps, returns next incomplete step. Companion to existing `computeWorkflowPosition`. TDD wave 0. |
| `src/lib/pointsDeltaCompute.ts` | Given before-snapshot Map and CSV rows, returns `{added, removed, changed}` counts. Pure function — testable in isolation before the import transaction is wired up. |

### 7. New UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ApplyRecipeSheet.tsx` | `src/features/recipes/` | Recipe-to-unit assignment; recipe preview; unit multi-selector for bulk apply |
| `AppliedRecipeChecklist.tsx` | `src/features/units/` | Section/step completion checklist; tick steps; show section progress bars |
| `AppliedRecipeProgressBadge.tsx` | `src/components/common/` | Compact "X/N steps" badge; shared by Collection rows, Kanban cards, Unit Detail header |
| `PointsImportSheet.tsx` | `src/features/army-lists/` | File picker (Tauri dialog.open) + CSV parse + delta summary display |
| `PointsFreshnessBadge.tsx` | `src/components/common/` | Fresh/stale/no_import status badge; shared by Army List card and ListValidationPanel |
| `ListValidationPanel.tsx` | `src/features/army-lists/` | Health summary: points bar, ownership warnings, readiness %, freshness, tactical coverage |
| `TacticalTagsEditor.tsx` | `src/features/units/` | Add/remove tactical role tags on a unit (multi-select or free-text) |
| `TacticalCoverageBar.tsx` | `src/features/army-lists/` | Tag presence/absence visual for a list (anti-tank, screening, objective holders, etc.) |
| `GameDayWarningBanner.tsx` | `src/features/game-day/` | Pre-game warnings: points exceeded, stale data, unbuilt/unpainted units |

---

## Data Flow Changes

### Applied Recipes Write Path

```
Collection page / Unit Detail
    "Apply Recipe" button
    → ApplyRecipeSheet (recipe selector + unit multi-selector)
    → useCreateAssignment (or useBulkAssignRecipe for multi-unit)
        → INSERT INTO unit_recipe_assignments
        → INSERT INTO unit_recipe_step_progress (one row per step, completed=0)
        → invalidate ["recipe-assignments", unitId]
        → invalidate ["workflow-positions"] prefix  ← Kanban/CurrentFocus must update

AppliedRecipeChecklist
    user ticks a step
    → useToggleStepProgress
        → INSERT ... ON CONFLICT ... DO UPDATE (upsert, preserves row id)
        → invalidate ["recipe-progress", assignmentId]
        → invalidate ["workflow-positions"] prefix
        → invalidate ["kanban-enrichment"] prefix  ← progress badge on Kanban card

LogSessionSheet (existing, extended for AR-05)
    user checks "Mark step complete" while logging session
    → on session save: writes painting_sessions row AND calls useToggleStepProgress
    → single save action, two mutations, one cache invalidation pass
```

### Applied Recipes Read Path

```
KanbanBoard mounts
    → useKanbanEnrichment(unitIds)  ← EXTENDED with 4th parallel query
        → Promise.all([
            getRecipeNamesByUnitIds,
            getPhotoCountsByUnitIds,
            getSectionSummaryByUnitIds,          ← existing (v0.2.9)
            getAssignmentProgressByUnitIds,      ← NEW
          ])
        → KanbanEnrichment now includes Map<unitId, {completed: number, total: number}>
    → KanbanCard renders AppliedRecipeProgressBadge

Unit Detail page
    → useRecipeAssignments(unitId) → list of assignments
    → useRecipeProgress(assignmentId) → per-step completion
    → AppliedRecipeChecklist renders sectioned view with ticks
```

### Points Import Write Path

```
PointsImportSheet
    → Tauri dialog.open() file picker
    → Tauri fs plugin reads file bytes
    → src/lib/csv.ts parses rows (reuse existing utilities)
    → importPointsTransaction() in pointsImports.ts:
        BEGIN TRANSACTION
        snapshot = SELECT unit_name, faction_id, points FROM points_imports WHERE ...
        for each CSV row: INSERT OR REPLACE INTO points_imports
        for each removed row: DELETE FROM points_imports WHERE ...
        {added, removed, changed} = pointsDeltaCompute(snapshot, csvRows)
        INSERT INTO points_import_history (source_file, version, row_count, ...)
        COMMIT
    → useImportPoints onSuccess:
        invalidate ["points-imports"]
        invalidate ["points-import-history"]
        invalidate ["army-list-readiness"]     ← totals now include pi.points
        invalidate ["list-validation"]          ← freshness + warnings change
        invalidate ["dashboard-stats"]          ← forward-compat
        invalidate ["army-lists", id, "units"]  ← all open list detail views
```

### Points Import Read Path (COALESCE chain update)

Two existing query functions in `src/db/queries/armyLists.ts` gain an identical JOIN addition:

```sql
-- Add to both getArmyListWithUnits AND getArmyListReadiness:
LEFT JOIN points_imports pi
  ON pi.unit_name = u.name
 AND (pi.faction_id IS NULL OR pi.faction_id = u.faction_id)
```

COALESCE updates from 3-level to 5-level in both:
```sql
-- Before:
COALESCE(alu.points_override, uo.points, u.points, 0) AS effective_points
-- After:
COALESCE(alu.points_override, pi.points, uo.points, u.points, 0) AS effective_points
```

### List Validation Read Path

```
ArmyListDetailPage
    → useListValidation(listId)
        → listValidation.ts fires 5 parallel queries:
            1. getListPointsSummary(listId)       — 5-level COALESCE sum vs limit
            2. getListOwnershipWarnings(listId)   — units where status_assembly = 0
            3. getListReadinessWarnings(listId)   — units where status_painting != 'Completed'
            4. getListFreshnessStatus(listId)     — join to points_import_history, julianday diff
            5. getListTacticalCoverage(listId)    — GROUP BY tag, count per tag
        → ListValidationPanel renders health summary
        → individual ArmyListUnitRow gets inline warning icon via prop

GameDayPage
    → GameDayWarningBanner reads useListValidation(activeListId)
    → surfaces top-N actionable warnings before play begins
```

---

## Integration Points with Existing Architecture

### Integration Point 1: COALESCE Update (highest risk, must be atomic)

**Files**: `src/db/queries/armyLists.ts` — two functions: `getArmyListWithUnits` and `getArmyListReadiness`

Both functions must gain the identical `LEFT JOIN points_imports` and updated COALESCE in the same commit. If only one is updated, `ArmyListDetailPage` and `ArmyReadinessCard` (on Dashboard) show different totals — a visible split-brain bug.

The `ArmyListUnitRow` TypeScript interface in `src/types/armyList.ts` does not need to change — `effective_points: number` remains; the COALESCE just resolves differently.

### Integration Point 2: useWorkflowPositions — Applied Progress as Primary Source

`src/hooks/useWorkflowPositions.ts` currently queries sessions to derive workflow position. After applied recipes ship, progress rows are the authoritative source.

Recommended approach: `useWorkflowPositions` calls a new `getAssignmentProgressByUnitIds(unitIds[])` batch query. For each unit that has an assignment, call `computeAppliedRecipePosition(assignment, progressRows, sections, steps)`. For units without an assignment, fall back to the existing session-derived logic. This is additive — no existing behavior breaks.

### Integration Point 3: useKanbanEnrichment — 4th Parallel Query

`src/hooks/useKanbanEnrichment.ts` uses `Promise.all` for batch enrichment. Adding `getAssignmentProgressByUnitIds` as a 4th parallel query follows the established pattern exactly. The `KanbanEnrichment` interface gains `appliedProgress: Map<number, {completed: number, total: number}>`.

`KanbanCard` renders `AppliedRecipeProgressBadge` only when `appliedProgress.has(unit.id)`.

### Integration Point 4: LogSessionSheet — Step Completion Checkbox

`src/features/dashboard/LogSessionSheet.tsx` already has `recipe_id`, `recipe_step_id`, and `section_name` fields. For AR-05, add:
- A read from `useRecipeAssignments(unitId)` to find the active assignment for the session's unit
- A checkbox "Mark step complete in recipe" — only shown when `recipe_step_id` is set and an assignment exists
- On submit: if checkbox checked, call `useToggleStepProgress` after the session write succeeds
- Cache invalidation: existing session keys unchanged; add `["recipe-progress", assignmentId]` and `["workflow-positions"]` prefix

### Integration Point 5: UnitDeleteDialog — RESTRICT FK Guard

`unit_recipe_assignments.unit_id` uses ON DELETE RESTRICT (same as `army_list_units.unit_id`). The existing `UnitDeleteDialog` in `src/features/units/` already guards against army list membership. It must also check for recipe assignments. Add a `getAssignmentsByUnitId(unitId)` call to the dialog's pre-delete check — display assignment count if > 0 and block deletion.

### Integration Point 6: Points Import — CSV Parsing Reuse

`src/lib/csv.ts` contains the CSV parsing utilities built for the Wahapedia sync. The points import pipeline should reuse these utilities. The CSV format for points import (unit_name, faction_id, points) is simpler than the Wahapedia format. If `csv.ts` has typed generics, a new `parsePointsCSV` function can be added there; otherwise a thin wrapper in `pointsImports.ts` is acceptable.

### Integration Point 7: Tauri File Picker

The points import sheet needs a file picker. Use `@tauri-apps/plugin-dialog`'s `open()` function (already available — Tauri 2 dialog plugin is in the dependency set). No new Rust commands needed. Read the file with `@tauri-apps/plugin-fs`'s `readTextFile()`.

### Integration Point 8: GameDayPage — Warning Banner Slot

`src/features/game-day/GameDayPage.tsx` has an existing pre-game checklist. `GameDayWarningBanner` slots above or alongside this checklist. It reads from `useListValidation(activeListId)` where `activeListId` is already available via the page's existing state. No new routing or data fetching infrastructure needed.

---

## Suggested Build Order

### Phase 1: Recipe Workflow Hardening (RH-01, RH-02, RH-03)
No new tables. Verify migration order, fix section-aware log session stability, polish section_type values. Build first — hardens the recipe foundation before the applied recipe layer is added on top.

### Phase 2: Applied Recipe Data Layer (AR-01)
1. Migration `021_applied_recipes.sql`
2. `src/types/recipeAssignment.ts` (RecipeAssignment, StepProgress, CreateAssignmentInput types)
3. `src/db/queries/recipeAssignments.ts` + `src/db/queries/recipeProgress.ts`
4. `src/hooks/useRecipeAssignments.ts` + `src/hooks/useRecipeProgress.ts`
5. `src/lib/computeAppliedRecipePosition.ts` + unit tests (TDD wave 0)

### Phase 3: Applied Recipe UX (AR-02, AR-03, AR-04, AR-07)
1. `ApplyRecipeSheet` (assign from Collection/Unit Detail; bulk apply toggle)
2. `AppliedRecipeChecklist` on Unit Detail
3. `AppliedRecipeProgressBadge` shared component
4. Extend `useKanbanEnrichment` with 4th parallel query
5. `KanbanCard` renders progress badge
6. `UnitDeleteDialog` gains recipe assignment guard

### Phase 4: Applied Recipe Log + Kanban/CurrentFocus Integration (AR-05, AR-06)
1. Extend `LogSessionSheet` with step-completion checkbox
2. Update `useWorkflowPositions` to prefer applied progress, fall back to session-derived
3. Update `CurrentFocusCard` to show applied recipe progress when available

### Phase 5: Points Import Data Layer (PI-01, PI-02, PI-03, PI-04)
1. Migration `022_points_imports.sql`
2. `src/types/pointsImport.ts`
3. `src/lib/pointsDeltaCompute.ts` + unit tests
4. `src/db/queries/pointsImports.ts`
5. `src/hooks/usePointsImports.ts`
6. **Critical**: Update `getArmyListWithUnits` + `getArmyListReadiness` with JOIN + 5-level COALESCE (both in same commit)
7. `PointsImportSheet` with file picker, CSV parsing, delta summary
8. `PointsFreshnessBadge` shared component

### Phase 6: Army List Validation (PI-05, LV-01, LV-02, LV-03, LV-04)
1. Migration addendum for `unit_tactical_tags` (part of 022 or separate 023)
2. `src/db/queries/tacticalTags.ts` + `src/hooks/useTacticalTags.ts`
3. `TacticalTagsEditor` on Unit Detail / PlaybookTab
4. `src/db/queries/listValidation.ts` (5 aggregation queries)
5. `src/hooks/useListValidation.ts`
6. `ListValidationPanel` in Army List detail
7. `TacticalCoverageBar` in Army List detail

### Phase 7: Game Day Integration (GD-01)
1. `GameDayWarningBanner` component
2. Wire into `GameDayPage` above pre-game checklist

**Ordering rationale:**
- Applied recipes (Phases 2–4) come before points import (Phase 5) — they are independent data layers, and applied recipes close a visible gap in the painting workflow quickly.
- The COALESCE update in Phase 5 is the most structurally dangerous change (two places, must be atomic). Isolating it in Phase 5 means it can be reviewed/tested in isolation without applied recipe changes complicating the diff.
- Validation (Phase 6) requires both `points_imports` (freshness queries) and `unit_tactical_tags` (coverage queries) — both must exist first.
- Game Day (Phase 7) is additive and purely dependent on `useListValidation` being stable.

---

## Anti-Patterns to Avoid

### 1. User Data in rules.db
Applied recipe assignments, progress, points imports, tactical tags — all go in `hobbyforge.db`. `rules.db` is wiped on every sync. This is not a preference; it is a data loss guarantee.

### 2. effective_points Computed in JavaScript
The 5-level COALESCE must live in SQL in both `getArmyListWithUnits` and `getArmyListReadiness`. After the JOIN addition, the JS side still just sums `effective_points` — no arithmetic. Adding a points import layer will create pressure to "compute it in JS for the validation panel." Resist: add the JOIN to `listValidation.ts` queries too.

### 3. INSERT OR REPLACE for Step Progress Toggle
`INSERT OR REPLACE` deletes the old row and inserts a new one — the `id` changes. Any future FK on `unit_recipe_step_progress.id` breaks silently. Use `INSERT ... ON CONFLICT (assignment_id, step_id) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at` instead.

### 4. points_imports.faction_id as Foreign Key to factions.id
`faction_id` in `points_imports` is the Wahapedia text key (e.g., `"SM"`), not the integer primary key of the `factions` table in `hobbyforge.db`. The text keys are stable across rules re-syncs; integer IDs in `hobbyforge.db` are user-created and may differ. No FK — text copy, exactly like `weapon_name` and `detachment_name`.

### 5. N+1 Progress Queries per Kanban Card
Do not call `useRecipeProgress(assignmentId)` inside `KanbanCard`. Follow `useKanbanEnrichment` pattern: one `getAssignmentProgressByUnitIds(unitIds[])` batch query at board level returning `Map<unitId, {completed, total}>`, prop-drilled to cards.

### 6. Asymmetric COALESCE Update
Updating only `getArmyListWithUnits` but not `getArmyListReadiness` (or vice versa) creates split-brain: Army List detail shows different totals from `ArmyReadinessCard` on the dashboard. Both functions share a JOIN and COALESCE — they must be updated atomically in the same commit.

### 7. Skipping the computeAppliedRecipePosition Pure Function
`useWorkflowPositions` should not contain the position logic inline. Create `computeAppliedRecipePosition` as a pure function in `src/lib/`, write unit tests first (TDD wave 0). This follows the established `computeWorkflowPosition` pattern (12 existing tests) and ensures the logic is verifiable before any UI depends on it.

### 8. Using useFieldArray for the Step Completion Checklist
The applied recipe checklist does not use DnD, but for consistency, do not introduce `useFieldArray`. The existing recipe form avoids it due to ID collision with `@dnd-kit/sortable` (RHF #10607). Use manual array state from the `useRecipeProgress` query result — the checklist is a display + toggle pattern, not a form.

---

## Sources

All findings from direct codebase analysis (HIGH confidence — no WebSearch needed):

- `src-tauri/migrations/001_core_schema.sql` through `020_workflow_metadata.sql` — confirmed table structure, FK policies, boolean discipline, migration numbering
- `src/db/queries/armyLists.ts` — confirmed exact 3-level COALESCE text in `getArmyListWithUnits` and `getArmyListReadiness`; confirmed `detachment_name` TEXT-copy pattern
- `src/db/queries/unitOverrides.ts` — confirmed upsert-not-replace pattern; `unit_overrides` as the `uo` alias precedent
- `src/db/queries/recipes.ts` — confirmed `duplicateRecipe` sectionIdMap pattern; `getRecipeNamesByUnitIds` batch query
- `src/db/queries/recipeSections.ts` — confirmed DELETE-all + re-INSERT save pattern; batch GROUP BY pattern
- `src/db/queries/paintingSessions.ts` — confirmed `section_name` denormalization, ON DELETE SET NULL chain
- `src/hooks/useWorkflowPositions.ts` — confirmed session-derived position logic; sorted-ID key; Promise.all pattern
- `src/hooks/useKanbanEnrichment.ts` — confirmed batch enrichment + sorted-ID cache key + Promise.all pattern
- `src/hooks/useArmyLists.ts` — confirmed cache key constants; invalidation symmetry in all 6 mutations
- `src/types/armyList.ts` — confirmed `ArmyListUnitRow` shape and `effective_points: number` type
- `src/types/recipeSection.ts` — confirmed workflow metadata fields and const-array union type pattern
- `.planning/points-import-design.md` — pre-designed schema, COALESCE precedence, delta algorithm, freshness SQL, JOIN additions
- `.planning/PROJECT.md` — AR-01..AR-07, PI-01..PI-05, LV-01..LV-04, GD-01 requirements; Key Decisions log (cross-referencing 40+ architectural decisions)
