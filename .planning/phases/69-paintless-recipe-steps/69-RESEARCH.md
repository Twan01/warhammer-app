# Phase 69: Paintless Recipe Steps - Research

**Researched:** 2026-05-13
**Domain:** SQLite schema migration + TypeScript null-safety
**Confidence:** HIGH

## Summary

This phase makes `recipe_steps.paint_id` nullable so users can create recipe steps without selecting a paint. The work is small and well-scoped: one SQLite table-rebuild migration (because SQLite lacks `ALTER COLUMN`), one guard removal in the form save path, one type change, and a null-safety audit of downstream components.

The codebase is already substantially null-safe for paint_id. The form layer (`DraftStep`) uses `paint_id: number | null`, the `PaintCombobox` handles null values, the availability query (`getRecipePaintAvailability`) already has `WHERE rs.paint_id IS NOT NULL`, and `RecipeStepTimeline` already renders "(no paint linked)" for missing paints. The main risk is the table-rebuild migration (data loss if columns are missed) and one undiscovered null-safety gap in `SectionedTimeline.tsx`.

**Primary recommendation:** Execute the table-rebuild migration carefully, preserving all 13 columns accumulated across migrations 001/012/013/018. Audit every `step.paint_id` reference in `src/` for null handling.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: paint_id is NOT NULL in 001_core_schema.sql line 93. SQLite has no ALTER COLUMN. Table-rebuild migration required.
- D-02: FK changes from NOT NULL REFERENCES to nullable REFERENCES. NULL FKs skip FK checks (correct SQLite semantics).
- D-03: Rebuild must preserve columns from migrations 012, 013, 014, 018 and the FK from painting_sessions.recipe_step_id.
- D-04: Migration number is next available after latest registered migration.
- D-05: Remove the `if (s.paint_id !== null)` guard at RecipeFormSheet.tsx line 292.
- D-06: Update CreateRecipeStepInput type: paint_id from `number` to `number | null`.
- D-07: getRecipePaintAvailability already has WHERE clause excluding null paint_id. No change needed.
- D-08: getRecipeSwatchColors JOINs on paints, naturally excluding null paint_id. No change needed.
- D-09: getStepCountsByRecipe uses COUNT(*), includes all steps. No change needed.
- D-10: RecipeDetailSheet missingPaints filter already excludes null paint_id. No change needed.
- D-11: RecipeStepTimeline should gracefully handle null paint lookup. Currently renders "(no paint linked)" for undefined paint.
- D-12: RecipeStepRow form works with null paint_id via PaintCombobox. No form changes needed.

### Claude's Discretion
- Whether to add a "No paint" visual indicator on paintless steps in timeline, or just omit the swatch area
- Exact FK pragma handling during the table-rebuild migration
- Whether to add indexes on the rebuilt table matching existing indexes

### Deferred Ideas (OUT OF SCOPE)
None.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REC-01 | User can create and save a recipe step without selecting a paint; paintless steps persist across edit/reopen and are excluded from paint availability calculations | Schema migration (nullable paint_id), guard removal (RecipeFormSheet line 292), type update (RecipeStep.paint_id), null-safety in SectionedTimeline availability computation |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema nullable migration | Database / Storage | -- | DDL change to recipe_steps table |
| Guard removal (save path) | Frontend (React) | -- | RecipeFormSheet.tsx form submission logic |
| Type definition update | Frontend (TypeScript) | -- | RecipeStep interface in types/ |
| Null-safety in UI | Frontend (React) | -- | SectionedTimeline availability computation |

## Standard Stack

No new libraries needed. This phase modifies existing code only.

### Core (already in project)
| Library | Purpose | Role in Phase |
|---------|---------|---------------|
| Tauri plugin-sql | SQLite migration runner | Runs the table-rebuild migration at app start |
| TypeScript | Type safety | RecipeStep.paint_id type change propagation |

## Architecture Patterns

### System Flow: Paintless Step Save Path

```
User creates step (no paint selected)
      |
PaintCombobox value = null
      |
DraftStep { paint_id: null, step_name: "Varnish coat", ... }
      |
RecipeFormSheet.handleSave() -- guard REMOVED, all steps saved
      |
addRecipePaint(input) -- input.paint_id = null bound to $2
      |
INSERT INTO recipe_steps (..., paint_id, ...) VALUES (..., NULL, ...)
      |
recipe_steps row persists with paint_id = NULL
```

### Pattern 1: SQLite Table-Rebuild Migration

**What:** SQLite cannot alter column constraints. To make paint_id nullable, recreate the table with the desired schema, copy data, drop old, rename new.

**When to use:** Any time you need to change NOT NULL, type, or default on an existing column in SQLite.

**Example:**
```sql
-- Disable FK checks so we can drop/rename tables with FK references
PRAGMA foreign_keys = OFF;

-- 1. Create new table with nullable paint_id
CREATE TABLE recipe_steps_new (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id   INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    paint_id    INTEGER REFERENCES paints(id) ON DELETE RESTRICT,  -- NOW NULLABLE
    step_name   TEXT    NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    -- 012 columns
    painting_phase TEXT,
    tool           TEXT,
    technique      TEXT,
    dilution       TEXT,
    time_estimate_minutes INTEGER,
    -- 013 columns
    step_photo_path TEXT,
    alt_paint_id    INTEGER REFERENCES paints(id),
    -- 018 column
    section_id      INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE
);

-- 2. Copy all data
INSERT INTO recipe_steps_new
SELECT id, recipe_id, paint_id, step_name, order_index, notes, created_at,
       painting_phase, tool, technique, dilution, time_estimate_minutes,
       step_photo_path, alt_paint_id, section_id
FROM recipe_steps;

-- 3. Drop old table
DROP TABLE recipe_steps;

-- 4. Rename new table
ALTER TABLE recipe_steps_new RENAME TO recipe_steps;

-- 5. Re-enable FK checks
PRAGMA foreign_keys = ON;
```

[VERIFIED: src-tauri/migrations/001_core_schema.sql, 012, 013, 018 -- column inventory confirmed by reading all four migration files]

### Anti-Patterns to Avoid
- **Forgetting columns in rebuild:** The recipe_steps table has 14 columns accumulated across 4 migrations. Missing any column in the rebuild causes silent data loss. Always enumerate every column explicitly.
- **Leaving PRAGMA foreign_keys = OFF:** Must re-enable at end of migration. The app's `client.ts` sets it ON per-connection, but leaving it OFF in the migration could affect subsequent migrations in the same connection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Column alteration | Manual ALTER attempts | Table-rebuild pattern | SQLite does not support ALTER COLUMN |

## Common Pitfalls

### Pitfall 1: SectionedTimeline Counts Paintless Steps as "Missing"
**What goes wrong:** `SectionedTimeline.tsx` line 41 checks `step.paint_id === 0` but NOT `step.paint_id === null`. When paint_id is null, `paintMap.get(null)` returns undefined, and `isPaintMissing(undefined)` returns true, incorrectly counting paintless steps as "missing paint."
**Why it happens:** The original code assumed paint_id was always a number (never null). The `=== 0` check was a legacy guard for the "no paint" sentinel value.
**How to avoid:** Add `step.paint_id === null` to the exclusion condition on line 41: `if (step.section_id === null || step.paint_id === null || step.paint_id === 0) continue;`
**Warning signs:** Paintless steps show as "missing" in section availability badges.

### Pitfall 2: RecipeStepTimeline paintMap.get(null)
**What goes wrong:** `RecipeStepTimeline.tsx` line 21 calls `paintMap.get(step.paint_id)` where paint_id could be null.
**Why it happens:** Map.get(null) returns undefined in JavaScript.
**How to avoid:** This actually works correctly by accident -- undefined paint triggers the `else` branch at line 58 which renders "(no paint linked)". However, the `isPaintMissing` call at line 22 returns true for undefined paint, which is semantically wrong for paintless steps (they're not "missing" a paint, they intentionally have none).
**Warning signs:** The timeline node dot renders without a color (muted) and the component treats it as a missing paint rather than an intentionally paintless step. Current rendering is acceptable but the isPaintMissing flag name is misleading. Cosmetic only -- no data bug.

### Pitfall 3: duplicateRecipe Copies Null paint_id
**What goes wrong:** `recipes.ts` line 182 copies `step.paint_id` directly into the new recipe's steps. If paint_id is null, this inserts NULL which is correct after the schema migration.
**Why it happens:** The existing code already passes paint_id as-is without transformation.
**How to avoid:** No action needed -- this works correctly after the schema migration. [VERIFIED: src/db/queries/recipes.ts line 182]

### Pitfall 4: Migration Column Count Mismatch
**What goes wrong:** The INSERT-SELECT in the rebuild migration has a different number of columns than the CREATE TABLE, causing SQLite to error or silently drop data.
**Why it happens:** Columns were added across 4 separate migrations (001, 012, 013, 018). Easy to miss one.
**How to avoid:** The complete column list is: id, recipe_id, paint_id, step_name, order_index, notes, created_at, painting_phase, tool, technique, dilution, time_estimate_minutes, step_photo_path, alt_paint_id, section_id (14 columns total).
**Warning signs:** Migration fails at app startup, or steps lose data after upgrade.

### Pitfall 5: PRAGMA foreign_keys Inside Transaction
**What goes wrong:** `PRAGMA foreign_keys = OFF` must be executed outside any transaction -- it has no effect inside a transaction in SQLite.
**Why it happens:** Tauri plugin-sql may wrap migrations in transactions.
**How to avoid:** Check whether Tauri plugin-sql wraps each migration in a transaction. If so, the PRAGMA must be issued before the transaction starts. In practice, the migration SQL file runs as a single batch -- PRAGMAs at the top should work if the plugin does not auto-wrap.
**Warning signs:** FK constraint violations during the DROP TABLE step.

## Code Examples

### Migration File: 022_paintless_steps.sql (next after 021)
```sql
-- Source: SQLite documentation for table rebuild pattern
-- [VERIFIED: lib.rs shows version 21 as latest migration]

PRAGMA foreign_keys = OFF;

CREATE TABLE recipe_steps_new (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id             INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    paint_id              INTEGER REFERENCES paints(id) ON DELETE RESTRICT,
    step_name             TEXT    NOT NULL,
    order_index           INTEGER NOT NULL DEFAULT 0,
    notes                 TEXT,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    painting_phase        TEXT,
    tool                  TEXT,
    technique             TEXT,
    dilution              TEXT,
    time_estimate_minutes INTEGER,
    step_photo_path       TEXT,
    alt_paint_id          INTEGER REFERENCES paints(id),
    section_id            INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE
);

INSERT INTO recipe_steps_new
    (id, recipe_id, paint_id, step_name, order_index, notes, created_at,
     painting_phase, tool, technique, dilution, time_estimate_minutes,
     step_photo_path, alt_paint_id, section_id)
SELECT id, recipe_id, paint_id, step_name, order_index, notes, created_at,
       painting_phase, tool, technique, dilution, time_estimate_minutes,
       step_photo_path, alt_paint_id, section_id
FROM recipe_steps;

DROP TABLE recipe_steps;

ALTER TABLE recipe_steps_new RENAME TO recipe_steps;

PRAGMA foreign_keys = ON;
```

### Registration in lib.rs
```rust
// [VERIFIED: lib.rs -- version 21 is latest, so version 22 is next]
Migration {
    version: 22,
    description: "paintless_steps",
    sql: include_str!("../migrations/022_paintless_steps.sql"),
    kind: MigrationKind::Up,
},
```

### Type Change in recipePaint.ts
```typescript
// [VERIFIED: src/types/recipePaint.ts line 8]
// Before: paint_id: number;
// After:
export interface RecipeStep {
  // ...
  paint_id: number | null;  // nullable after migration 022
  // ...
}
```

### Guard Removal in RecipeFormSheet.tsx
```typescript
// [VERIFIED: src/features/recipes/RecipeFormSheet.tsx line 292]
// Before:
//   if (s.paint_id !== null) {
//     await addRecipePaint.mutateAsync({ ... });
//   }
// After (remove the if-guard, keep the mutateAsync call):
await addRecipePaint.mutateAsync({
  recipe_id: recipeId,
  paint_id: s.paint_id,
  step_name: s.step_name,
  // ...rest of fields
});
```

### SectionedTimeline Null Fix
```typescript
// [VERIFIED: src/features/recipes/SectionedTimeline.tsx line 41]
// Before:
//   if (step.section_id === null || step.paint_id === 0) continue;
// After (also exclude null paint_id from availability count):
if (step.section_id === null || step.paint_id === null || step.paint_id === 0) continue;
```

## Complete paint_id Reference Audit

All `step.paint_id` / `s.paint_id` references in `src/`:

| File | Line | Current Behavior | Action Needed |
|------|------|------------------|---------------|
| `RecipeFormSheet.tsx` | 292 | Guards save on non-null | REMOVE guard (D-05) |
| `RecipeFormSheet.tsx` | 295 | Passes paint_id to mutation | Works with null after type change |
| `recipePaints.ts` | 137-138 | Availability query excludes null | Already correct (D-07) |
| `recipePaints.ts` | 75-78 | Swatch query JOINs on paint_id | Naturally excludes null (D-08) |
| `recipePaints.ts` | 100 | Step count uses COUNT(*) | Already correct (D-09) |
| `RecipeDetailSheet.tsx` | 95 | missingPaints filters null | Already correct (D-10) |
| `RecipeStepTimeline.tsx` | 21 | paintMap.get(paint_id) | Returns undefined for null, renders "(no paint linked)" -- correct |
| `SectionedTimeline.tsx` | 41 | Checks `=== 0` but NOT null | **FIX: add null check** |
| `SectionedTimeline.tsx` | 42 | paintMap.get(paint_id) | After null check at 41, only reached with non-null paint_id |
| `RecipeStepRow.tsx` | 103 | PaintCombobox value | Already handles null (D-12) |
| `RecipeCard.tsx` | 139 | Swatch strip key={s.paint_id} | Swatches come from getRecipeSwatchColors which JOINs on paint_id, so null rows never appear here |
| `recipes.ts` | 182 | duplicateRecipe copies paint_id | Works with null after schema change |

## State of the Art

No changes to libraries or approaches. SQLite table-rebuild is the canonical method for altering column constraints -- unchanged since SQLite 3.0. [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tauri plugin-sql does not auto-wrap individual migrations in transactions (PRAGMAs execute outside transactions) | Common Pitfalls / Pitfall 5 | PRAGMA foreign_keys=OFF has no effect, migration fails with FK errors |

## Open Questions

1. **Tauri plugin-sql transaction wrapping**
   - What we know: The plugin runs migrations sequentially at app startup. `bulk_sync_rules` in lib.rs explicitly manages its own transaction.
   - What's unclear: Whether each migration SQL file is executed inside an implicit transaction by the plugin.
   - Recommendation: Test the migration on a local dev database. If PRAGMA fails inside a transaction, move it outside the migration file (but this is unlikely to be an issue -- SQLite PRAGMAs typically work in the plugin's execution context). [ASSUMED]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 (jsdom) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/painting/recipeDetailSheet.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REC-01a | Paintless step saves without error | unit | `pnpm test -- tests/recipes/paintlessSteps.test.ts` | No -- Wave 0 |
| REC-01b | Paintless steps excluded from availability | unit | `pnpm test -- tests/recipes/paintlessSteps.test.ts` | No -- Wave 0 |
| REC-01c | SectionedTimeline excludes null paint_id from availability | unit | `pnpm test -- tests/recipes/sectionedTimeline.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/recipes/paintlessSteps.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/recipes/paintlessSteps.test.ts` -- covers REC-01 save path and availability exclusion
- [ ] Test for SectionedTimeline null paint_id handling (can be in same file or separate)

Note: Data-layer migration testing is deferred to Phase 72 (TST-01). Phase 69 tests focus on the TypeScript/component layer.

## Security Domain

No security-relevant changes. The migration preserves existing FK constraints. No new user input surfaces are introduced. The schema change only relaxes a NOT NULL constraint on an internal FK column.

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` -- migration registration, latest version is 21
- `src-tauri/migrations/001_core_schema.sql` lines 90-98 -- original table definition
- `src-tauri/migrations/012_recipe_steps.sql` -- RENAME + structured columns
- `src-tauri/migrations/013_step_photos_alt_paint.sql` -- photo + alt_paint columns
- `src-tauri/migrations/014_session_recipe_link.sql` -- painting_sessions FK
- `src-tauri/migrations/018_recipe_sections.sql` -- section_id column
- `src/types/recipePaint.ts` -- RecipeStep interface (paint_id: number)
- `src/features/recipes/recipeSteps.ts` -- DraftStep (paint_id: number | null)
- `src/features/recipes/RecipeFormSheet.tsx` line 292 -- guard to remove
- `src/features/recipes/SectionedTimeline.tsx` line 41 -- null-safety gap found
- `src/db/queries/recipePaints.ts` -- availability/swatch/count queries
- `src/features/recipes/RecipeStepTimeline.tsx` -- already null-safe rendering

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all changes in existing code
- Architecture: HIGH -- every file and line number verified by reading source
- Pitfalls: HIGH -- complete grep audit of all paint_id references in src/

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable -- schema migration patterns do not change)
