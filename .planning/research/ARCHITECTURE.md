# Architecture Research

**Domain:** Foundation hardening — Tauri 2 + tauri-plugin-sql desktop app
**Researched:** 2026-05-13
**Confidence:** HIGH (direct codebase analysis; no external sources needed for this scope)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  UI Layer  (src/features/**/  src/app/**)                        │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ RecipeFormSheet│  │ LogSession   │  │ SectionedTimeline  │   │
│  │ (edit flow)    │  │ Sheet        │  │ (display only)     │   │
│  └───────┬────────┘  └──────┬───────┘  └────────┬───────────┘   │
├──────────┼────────────────────────────────────────┼──────────────┤
│  Hook Layer  (src/hooks/use*.ts)                                  │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ useRecipeSect. │  │ useRecipePa. │  │ usePaintingSessions│   │
│  │ RECIPE_SECT_KEY│  │ RECIPE_PTS_K │  │ SESSION_KEY        │   │
│  └───────┬────────┘  └──────┬───────┘  └────────┬───────────┘   │
├──────────┼────────────────────────────────────────┼──────────────┤
│  Query Layer  (src/db/queries/*.ts)                               │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ recipeSections │  │ recipePaints │  │ paintingSessions   │   │
│  │ .ts            │  │ .ts          │  │ .ts                │   │
│  └───────┬────────┘  └──────┬───────┘  └────────┬───────────┘   │
├──────────┼────────────────────────────────────────┼──────────────┤
│  DB Client  (src/db/client.ts — singleton + FK pragma)            │
├──────────┼────────────────────────────────────────┼──────────────┤
│  tauri-plugin-sql → SQLite (hobbyforge.db)                        │
│  Migrations registered in src-tauri/src/lib.rs                   │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| `lib.rs` `get_migrations()` | Registers all hobbyforge.db migrations as `Vec<Migration>` | Migrations 1-21 registered. Verified correct as of v0.2.10 start. |
| `src/db/client.ts` | DB singleton; applies `PRAGMA foreign_keys = ON` per connection | Stable. Single pattern used across all query files. |
| `src/db/queries/recipeSections.ts` | Section CRUD + reorder + batch counts | Stable. `updateRecipeSection` uses COALESCE for workflow metadata fields — prevents null clearing (REC-03 bug). |
| `src/db/queries/recipePaints.ts` | Step CRUD + batch aggregations | Stable. `addRecipePaint` allows `paint_id = null` in INSERT but form layer guards prevent paintless steps from being created (REC-01 gap). |
| `src/db/queries/paintingSessions.ts` | Session CRUD | Stores denormalized `section_name` (TEXT). No `recipe_section_id` FK (REC-04 gap). |
| `src/features/recipes/RecipeFormSheet.tsx` | Recipe edit form — orchestrates section/step save | DELETE-all + re-INSERT on every save (REC-02 gap). |

---

## The Four Hardening Problems

### Problem 1: Migration Registration (MIG-01, MIG-02)

**Current state:** `lib.rs` correctly registers migrations 1-21 including 018, 019, 020, 021. Verified via direct file inspection.

**Actual gap:** The PROJECT.md lists MIG-01 as "register migrations 018/019/020" — but 021 is also registered and correct. The issue was likely a stale entry written before 021 was added, OR migration registration was out of sync when the milestone was written. Fresh-install validation (MIG-02) is the real test needed.

**What needs to happen:**
- No changes required to `lib.rs` migration list itself (already correct)
- MIG-02 requires a test: boot the app from an empty `app_data_dir`, confirm no Rust panics, no JS query errors, all 21 tables exist
- A data-layer test (`TST-01`) that queries `sqlite_master` for table existence covers this path without requiring a real Tauri window

**Integration point:** `lib.rs` `get_migrations()` is the single registration point. tauri-plugin-sql runs them in `version` order at startup. No code changes needed unless a new migration (022) is added for REC-04.

---

### Problem 2: Paintless Recipe Steps (REC-01)

**Current state:** `recipe_steps.paint_id` is nullable in the schema (confirmed: INSERT in `addRecipePaint` accepts `null`). However, `RecipeFormSheet.tsx` line 294 gates step creation on `if (s.paint_id !== null)` — paintless steps are silently dropped on save.

The paint availability query in `recipePaints.ts` (`getRecipePaintAvailability`) already filters with `WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0` — so paintless steps are naturally excluded from availability counts if they are persisted.

**What changes:**

| Layer | File | Change |
|-------|------|--------|
| Query | `recipePaints.ts` `addRecipePaint` | No change needed — already accepts `paint_id: null` |
| Form layer | `RecipeFormSheet.tsx` `onSubmit` | Remove `if (s.paint_id !== null)` guard; save all steps regardless of paint_id |
| Step row UI | `RecipeStepRow.tsx` | Allow step submission without paint selection |
| Availability query | `recipePaints.ts` `getRecipePaintAvailability` | Already correct — no change needed |
| Swatch query | `recipePaints.ts` `getRecipeSwatchColors` | Uses `JOIN paints p ON p.id = rp.paint_id` — paintless steps excluded from swatches, which is correct |

**No schema migration needed.** `paint_id` is already nullable.

---

### Problem 3: Non-Destructive Recipe Edits (REC-02)

**Current state (the delete-all + re-INSERT pattern):**

`RecipeFormSheet.tsx` `onSubmit` (edit path, lines 233-243):
1. Calls `updateRecipe` (recipe metadata only)
2. Loops over `existingSections` and calls `deleteRecipeSection(existing.id)` for each
3. ON DELETE CASCADE removes all steps belonging to those sections
4. Loops over `existingSteps` and calls `removeRecipePaint` to clean orphans
5. Calls `createRecipeSection` + `addRecipePaint` for every section and step fresh

**The consequence:** Every save creates new `recipe_section.id` and `recipe_step.id` values. Any foreign key or stable-reference consumer is broken by the edit. This is why painting sessions lose their section link and why `unit_recipe_step_progress` uses `order_index` instead of `recipe_step_id` as its key (migration 021).

**What the diff-based pattern needs:**

The form already tracks `DraftSection` objects with `localId` (a local `string` key). Edit mode additionally needs to track the `dbId` (the SQLite `id`) for sections and steps that came from the database. The save path then becomes:

```
For each section in draft state:
  - section.dbId exists AND in existingSections → UPDATE (name, metadata, order_index)
  - section.dbId absent → INSERT (new section)

For removed sections (in existingSections but not in draft state):
  DELETE → CASCADE removes steps

For each step in surviving sections:
  - step.dbId exists AND in existingSteps → UPDATE (paint, metadata, order_index)
  - step.dbId absent → INSERT

For removed steps (in existingSteps but not in draft state):
  DELETE individually
```

**Components that change:**

| Component | Change Type | Description |
|-----------|-------------|-------------|
| `src/features/recipes/recipeSection.ts` (pure helpers) | Modify | Add `dbId?: number` to `DraftSection` and `DraftStep` types; update `buildDraftSections` to populate `dbId` from DB data |
| `src/db/queries/recipeSections.ts` | Add function | `updateRecipeSectionFull(input)` — direct assignment for all fields including metadata (also fixes REC-03) |
| `src/db/queries/recipePaints.ts` | Add function | `updateRecipeStep(input)` — in-place update for a step row |
| `src/features/recipes/RecipeFormSheet.tsx` `onSubmit` | Modify | Replace delete-all loop with diff-based save: compute added/removed/updated sets, fire targeted operations |

**Components that stay the same:** `createRecipeSection`, `deleteRecipeSection`, `addRecipePaint`, `removeRecipePaint` — all still used by the diff logic.

**Stable ID guarantee:** Once REC-02 is implemented, section and step IDs survive edits. This is the prerequisite for REC-04 (stable FK on sessions).

---

### Problem 4: Section Metadata Clearing (REC-03)

**Current state in `updateRecipeSection`:**

```sql
UPDATE recipe_sections
SET section_type   = COALESCE($7, section_type),
    technique      = COALESCE($8, technique),
    execution_mode = COALESCE($9, execution_mode),
    applies_to     = COALESCE($10, applies_to),
```

Passing `null` for any of these fields means "leave unchanged." Users can never clear a workflow metadata field once set.

**Fix:** Direct assignment for all nullable metadata fields (same pattern already used for `surface` and `notes` in the same function):

```sql
section_type   = $7,
technique      = $8,
execution_mode = $9,
applies_to     = $10,
```

**Impact:** Callers that want to preserve an existing value must pass the current value explicitly. The form already loads `existingSections` before opening — it has access to current values and passes them through via `DraftSection` state. This is the established pattern for `surface` and `notes` in the same function.

**Files changed:** Only `src/db/queries/recipeSections.ts` `updateRecipeSection`. Four SQL lines.

---

### Problem 5: Stable recipe_section_id on Painting Sessions (REC-04)

**Current state:** `painting_sessions` has:
- `recipe_id INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL` (migration 014)
- `recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL` (migration 014)
- `section_name TEXT DEFAULT NULL` (migration 020 — denormalized copy)

No `recipe_section_id` column exists.

**Why it was denormalized (PROJECT.md decision log):** "DELETE-all + re-INSERT save pattern destroys FK links; derive section from step's section_id instead." Correct workaround given the old destructive save. Once REC-02 is in place, section IDs are stable and a real FK becomes viable.

**What needs to change:**

1. New migration `022_session_section_fk.sql`:
   ```sql
   ALTER TABLE painting_sessions
     ADD COLUMN recipe_section_id INTEGER
       REFERENCES recipe_sections(id) ON DELETE SET NULL;
   ```
   Existing rows keep `section_name` for backward display compatibility. `recipe_section_id` starts NULL for all historical sessions.

2. `src/db/queries/paintingSessions.ts` `createSession`:
   - Add `recipe_section_id` parameter to `CreateSessionInput` (nullable)
   - Include in `INSERT` statement

3. `src/types/paintingSession.ts`:
   - Add `recipe_section_id: number | null` to `PaintingSession` interface
   - Add `recipe_section_id?: number | null` to `CreateSessionInput`

4. `LogSessionSheet`: already captures `section_name` from cascading selector — also pass the section's `id` when a section is selected.

**Dependency:** REC-04 migration must come after REC-02 is working. If sections are still being deleted and recreated on every save, the FK will be SET NULL on every recipe edit, defeating the purpose.

---

### Problem 6: Section-Aware Step Ordering (REC-05)

**Current state:** `getRecipePaintsByRecipe` in `recipePaints.ts`:
```sql
SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC
```

Steps from different sections may have overlapping `order_index` values (each section's steps start at 0). Cross-section ordering is incorrect in flat-step consumers.

**Fix — add section JOIN:**
```sql
SELECT rs.*, sec.order_index AS section_order_index
FROM recipe_steps rs
LEFT JOIN recipe_sections sec ON sec.id = rs.section_id
WHERE rs.recipe_id = $1
ORDER BY sec.order_index ASC, rs.order_index ASC
```

Alternatively, verify whether `computeOrderIndex` already produces globally-monotonic values across sections in the current save flow. If it does, the query fix alone is sufficient without any form changes.

**Files changed:** `src/db/queries/recipePaints.ts` `getRecipePaintsByRecipe`. No migration needed.

---

## Data Flow Changes

### Before (delete-all + re-INSERT):

```
onSubmit (edit)
  → deleteRecipeSection(each existing section)   [CASCADE removes steps]
  → removeRecipePaint(each orphan step)
  → createRecipeSection(each draft section)       [new IDs every time]
  → addRecipePaint(each step)                     [new IDs every time]
  → FK references in painting_sessions become stale
```

### After (diff-based):

```
onSubmit (edit)
  → updateRecipe(metadata only)
  → diff(existingSections, draftSections)
      → updateRecipeSection(surviving sections with dbId)   [same IDs preserved]
      → deleteRecipeSection(removed sections)
      → createRecipeSection(new sections)
  → diff(existingSteps, draftSteps)
      → updateRecipeStep(surviving steps with dbId)         [same IDs preserved]
      → removeRecipePaint(removed steps)
      → addRecipePaint(new steps)
  → FK references in painting_sessions remain valid
```

---

## New vs Modified Components

### New

| File | Purpose | Required by |
|------|---------|-------------|
| `src-tauri/migrations/022_session_section_fk.sql` | ADD COLUMN recipe_section_id to painting_sessions | REC-04 |
| `updateRecipeStep()` in `recipePaints.ts` | In-place step update (paint, name, metadata, order_index) | REC-02 |

### Modified

| File | What Changes | Required by |
|------|-------------|-------------|
| `src/db/queries/recipeSections.ts` `updateRecipeSection` | Remove COALESCE from workflow metadata fields; direct assignment | REC-03 |
| `src/db/queries/recipePaints.ts` `getRecipePaintsByRecipe` | Add section JOIN for correct cross-section ordering | REC-05 |
| `src/db/queries/paintingSessions.ts` `createSession` | Add `recipe_section_id` param + include in INSERT | REC-04 |
| `src/types/paintingSession.ts` | Add `recipe_section_id` field | REC-04 |
| `src/features/recipes/recipeSection.ts` | Add `dbId?: number` to DraftSection/DraftStep; update `buildDraftSections` | REC-02 |
| `src/features/recipes/RecipeFormSheet.tsx` `onSubmit` | Replace delete-all with diff-based save | REC-02 |
| `src/features/recipes/RecipeFormSheet.tsx` `onSubmit` | Remove `if (s.paint_id !== null)` guard | REC-01 |
| `src-tauri/src/lib.rs` `get_migrations()` | Add migration 022 entry | REC-04 |
| `src/features/journal/LogSessionSheet.tsx` (inferred) | Pass section id alongside section_name on session create | REC-04 |

### Stays the Same

| Component | Why Unchanged |
|-----------|---------------|
| `src/db/client.ts` | Singleton + FK pragma pattern is correct and stable |
| `createRecipeSection`, `deleteRecipeSection` | Still used by diff logic |
| `addRecipePaint`, `removeRecipePaint` | Still used by diff logic |
| `duplicateRecipe` in `recipes.ts` | Uses its own INSERT-based copy loop; unaffected by edit save pattern |
| All rules.db queries | Not in hardening scope |
| `getRecipePaintAvailability` | Already guards `paint_id IS NOT NULL` — correct for paintless steps |
| `getRecipeSwatchColors` | JOIN naturally excludes paintless steps — correct |
| `unit_recipe_step_progress` keying | Uses `order_index` by design (migration 021); not broken by hardening |

---

## Build Order (Dependency Graph)

```
MIG-01/MIG-02  ─── independent (verify existing registrations; no code change)
REC-03         ─── independent (four SQL lines in updateRecipeSection)
REC-01         ─── independent (remove one guard in RecipeFormSheet)
REC-05         ─── independent (fix ORDER BY in getRecipePaintsByRecipe)
VER-01         ─── independent (package.json + tauri.conf.json version sync)

REC-02         ─── must precede REC-04
                   (stable IDs must exist before adding session FK)

REC-04         ─── requires REC-02
                   (migration 022 + type + query + UI wiring)

TST-01         ─── after all above (tests verify all fixes)
```

**Recommended phase grouping:**

Phase A — Independent fixes (one phase, low risk):
- REC-01: remove paintless step guard in RecipeFormSheet
- REC-03: direct assignment in updateRecipeSection
- REC-05: section-ordered query
- VER-01: version alignment
- MIG-02: fresh install smoke test + TST-01 partial (migration schema tests)

Phase B — Non-destructive save (one phase, medium complexity):
- REC-02: DraftSection.dbId tracking + diff-based onSubmit
- Adds updateRecipeStep() query function
- Tests: recipe persist round-trip, section ID stability across edit

Phase C — Stable FK (one phase, additive only):
- REC-04: migration 022 + type changes + session create wiring
- Tests: session FK survives recipe edit, SET NULL on section delete

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `RecipeFormSheet` to `recipeSections.ts` | Direct import (form calls query functions, not via hook) | Acceptable for write path per established pattern. Read path uses hooks. |
| `RecipeFormSheet` to `recipePaints.ts` | Via `useAddRecipePaint` / `useRemoveRecipePaint` hooks | Add `useUpdateRecipeStep` for REC-02 diff path |
| `LogSessionSheet` to `paintingSessions.ts` | Via `useCreateSession` hook | Add `recipe_section_id` to the create input propagated through this chain |
| `lib.rs` to `migrations/` | `include_str!` macro — compile-time inclusion | Must add `022_session_section_fk.sql` file AND entry in `get_migrations()` atomically |
| `unit_recipe_step_progress` to `recipe_steps` | Keyed by `order_index`, not `recipe_step_id` (migration 021 design) | Deliberate workaround for destructive save. After REC-02, a future migration could add a real FK — out of scope for v0.2.11. |

### tauri-plugin-sql Constraints (Unchanged)

- `$1, $2` positional parameter syntax required for all queries
- No TypeScript-accessible transaction API — multi-step writes are sequential `await` chains with no rollback. This is a hard constraint.
- No `ATTACH DATABASE` from TypeScript — dual-DB pattern unchanged
- `result.lastInsertId` is the only way to retrieve auto-increment IDs after INSERT

### React Query Cache Invalidation (After REC-02)

No new cache keys needed. The diff-based save still ends by invalidating the same six keys: `RECIPE_SECTIONS_KEY(recipeId)`, `RECIPE_PAINTS_KEY(recipeId)`, `STEP_COUNTS_KEY`, `RECIPE_AVAILABILITY_KEY`, `RECIPE_SWATCH_KEY`, and `["recipe-step-counts"]`. The diff logic does not introduce new query boundaries.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Partial COALESCE for nullable metadata fields

**What people do:** Use `COALESCE($n, column)` for nullable fields so callers can pass `null` to mean "leave unchanged."
**Why it's wrong:** Users can never clear an optional field. The form has the full state (it loads `existingSections` before opening) so "unchanged" should be communicated by passing the current value, not by passing null.
**Do this instead:** Direct assignment `column = $n` for all nullable fields. Callers always pass the full desired value.

### Anti-Pattern 2: Using order_index as a stable entity reference

**What people do:** Reference a step by `(recipe_id, order_index)` composite key to avoid depending on the auto-increment ID.
**Why it's wrong:** `order_index` changes when steps are reordered. `unit_recipe_step_progress` in migration 021 uses this pattern as a pragmatic workaround for the destructive save — acceptable there because reorder events reset progress explicitly. But it should not be extended to new consumers.
**Do this instead:** After REC-02 makes IDs stable, use the auto-increment `id` as the FK target.

### Anti-Pattern 3: Registering migrations without the SQL file

**What people do:** Add a `Migration { version: N, ... }` entry in `get_migrations()` before creating the `.sql` file.
**Why it's wrong:** `include_str!` is evaluated at compile time. Missing file = compile error, not a runtime surprise. However it halts all development until fixed.
**Do this instead:** Create the `.sql` file in `src-tauri/migrations/` before adding the `lib.rs` entry. Confirm with `pnpm build`.

### Anti-Pattern 4: Calling query functions directly from React components

**What people do:** Import from `src/db/queries/*.ts` directly inside React components.
**Why it's wrong:** Bypasses React Query caching; mutations don't invalidate related cache keys.
**Do this instead:** Components call hooks only. `RecipeFormSheet` currently calls `createRecipeSection` and `deleteRecipeSection` directly in the write orchestration path — this is an accepted narrow exception. Keep it narrow; do not expand to read paths or to new features.

---

## Scaling Considerations

Single-user local-first app. Scale is not a concern. The hardening work addresses data integrity (IDs survive edits) and query correctness (ordering, nullable clearing) — both maintenance correctness concerns.

---

## Sources

- Direct inspection: `src-tauri/src/lib.rs` — migration registration confirmed, versions 1-21 present
- Direct inspection: `src-tauri/migrations/005_hobby_journal.sql`, `014_session_recipe_link.sql`, `018_recipe_sections.sql`, `020_workflow_metadata.sql`, `021_applied_recipe_assignments.sql`
- Direct inspection: `src/db/queries/recipeSections.ts`, `recipePaints.ts`, `paintingSessions.ts`, `recipes.ts`
- Direct inspection: `src/features/recipes/RecipeFormSheet.tsx` — delete-all pattern confirmed at lines 233-243
- Direct inspection: `.planning/PROJECT.md` — v0.2.11 requirements and decision log
- Confidence: HIGH — all findings from direct code analysis of the live codebase

---
*Architecture research for: HobbyForge v0.2.11 Foundation Hardening*
*Researched: 2026-05-13*
