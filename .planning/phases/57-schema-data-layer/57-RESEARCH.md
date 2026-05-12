# Phase 57: Schema & Data Layer - Research

**Researched:** 2026-05-12
**Domain:** SQLite migration, TypeScript type extension, query updates
**Confidence:** HIGH

## Summary

Phase 57 is a pure data-layer extension: one SQLite migration adds five columns across two tables, TypeScript types gain matching fields, const arrays provide single-source-of-truth values for dropdowns, and query functions are updated to read/write the new fields. No UI changes.

All decisions are locked via CONTEXT.md (14 decisions, D-01 through D-14). The codebase has strong established patterns for every operation needed -- ALTER TABLE additive migrations, `TEXT DEFAULT NULL` columns, COALESCE partial-update queries, const array type exports, and DraftSection factory/mapper extension. The primary risk is the DELETE-all + re-INSERT save path in `RecipeFormSheet.tsx` silently dropping new fields if `createRecipeSection` is not updated atomically with the type and DraftSection changes.

**Primary recommendation:** Implement migration first, then extend types and const arrays together, then update queries and DraftSection atomically in a single commit to prevent any window where save would erase new fields.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `SECTION_TYPES` = `["prep", "basecoat", "shade", "layer", "detail", "effect", "finishing"] as const`
- **D-02:** `TECHNIQUES` = `["brush", "sponge", "drybrush", "airbrush", "oil-enamel", "pigment", "decal", "mixed", "other"] as const`
- **D-03:** `EXECUTION_MODES` = `["sequential", "batch", "parallel"] as const`
- **D-04:** Const arrays live in `src/types/recipeSection.ts` alongside the RecipeSection interface
- **D-05:** All four new section columns (`section_type`, `technique`, `execution_mode`, `applies_to`) are `TEXT DEFAULT NULL`
- **D-06:** `section_name TEXT DEFAULT NULL` on `painting_sessions` -- denormalized text
- **D-07:** Migration file is `020_workflow_metadata.sql`
- **D-08:** `DraftSection` gets four new nullable fields with explicit `null` defaults in `makeDraftSection()`
- **D-09:** `buildDraftSections()` maps all four fields from DB RecipeSection rows
- **D-10:** Save path (DELETE-all + re-INSERT) includes all four fields in INSERT statements
- **D-11:** `createRecipeSection` -- add 4 new fields to INSERT
- **D-12:** `updateRecipeSection` -- add 4 new fields with COALESCE pattern
- **D-13:** `createSession` -- add `section_name` to INSERT
- **D-14:** Read queries use `SELECT *` -- no changes needed

### Claude's Discretion
- Migration column ordering within ALTER TABLE statements
- Whether to use a single ALTER TABLE with multiple ADD COLUMN or separate statements (SQLite requires separate ADD COLUMN per statement)
- Exact naming of exported type aliases (`SectionType`, `Technique`, `ExecutionMode`)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WF-01 | User can set a section type on any recipe section | D-01 const array, D-05 column, D-11/D-12 queries |
| WF-02 | User can set a technique on any recipe section | D-02 const array, D-05 column, D-11/D-12 queries |
| WF-03 | User can set an execution mode on any recipe section | D-03 const array, D-05 column, D-11/D-12 queries |
| WF-04 | User can set a free-text applies_to field on any recipe section | D-05 column, D-11/D-12 queries |
| WF-05 | All workflow metadata fields are nullable and additive | D-05 TEXT DEFAULT NULL, migration is ALTER TABLE only |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Workflow metadata columns | Database / Storage | -- | Pure schema addition via ALTER TABLE |
| Const arrays for dropdowns | Frontend (types) | -- | Single source of truth consumed by forms in Phase 58 |
| Type extensions (RecipeSection, DraftSection) | Frontend (types) | -- | TypeScript interface mirrors DB schema |
| Query updates (CRUD) | Frontend (query layer) | -- | `src/db/queries/` SQL strings, no backend change |
| Session section_name column | Database / Storage | -- | Additive ALTER TABLE |
| Session query update | Frontend (query layer) | -- | `createSession` adds one parameter |

## Standard Stack

No new libraries required. This phase uses only existing stack components.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | 2.x | SQLite access from frontend | Already used for all DB operations [VERIFIED: codebase] |
| zod | 3.x | Schema validation | Already used for form schemas [VERIFIED: codebase] |
| TypeScript | 5.x | Type definitions | Project language [VERIFIED: codebase] |

**Installation:** None needed -- all dependencies already present.

## Architecture Patterns

### System Architecture Diagram

```
Migration 020                TypeScript Types             Query Functions
(020_workflow_metadata.sql)  (src/types/recipeSection.ts) (src/db/queries/recipeSections.ts)
       |                     (src/types/paintingSession.ts)(src/db/queries/paintingSessions.ts)
       |                            |                            |
       v                            v                            v
  ALTER TABLE              RecipeSection interface        createRecipeSection()
  recipe_sections          + 4 nullable fields            + 4 new INSERT params
  + 4 TEXT columns                                        updateRecipeSection()
                           DraftSection interface          + 4 new COALESCE params
  ALTER TABLE              + 4 nullable fields
  painting_sessions                                       createSession()
  + 1 TEXT column          Const arrays                   + 1 new INSERT param
                           SECTION_TYPES
                           TECHNIQUES                RecipeFormSheet.tsx
                           EXECUTION_MODES           save path passes new fields
                                                     through createRecipeSection()
```

### Recommended File Changes (not new structure)
```
src-tauri/migrations/
  020_workflow_metadata.sql       # NEW — 5 ALTER TABLE statements

src/types/
  recipeSection.ts                # MODIFY — add 4 fields + 3 const arrays + 3 type aliases
  paintingSession.ts              # MODIFY — add section_name field + CreateSessionInput

src/features/recipes/
  recipeSection.ts                # MODIFY — DraftSection + makeDraftSection + buildDraftSections

src/db/queries/
  recipeSections.ts               # MODIFY — createRecipeSection, updateRecipeSection
  paintingSessions.ts             # MODIFY — createSession

src/features/recipes/
  RecipeFormSheet.tsx              # MODIFY — save path passes new fields to createRecipeSection
```

### Pattern 1: ALTER TABLE ADD COLUMN (one per statement)
**What:** SQLite requires one ADD COLUMN per ALTER TABLE statement. [VERIFIED: migration 014_session_recipe_link.sql uses separate statements]
**When to use:** Always for SQLite schema changes.
**Example:**
```sql
-- Source: src-tauri/migrations/014_session_recipe_link.sql (existing pattern)
ALTER TABLE recipe_sections ADD COLUMN section_type TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN technique TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN execution_mode TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN applies_to TEXT DEFAULT NULL;

ALTER TABLE painting_sessions ADD COLUMN section_name TEXT DEFAULT NULL;
```

### Pattern 2: Const Array + Type Alias
**What:** Readonly const array exported alongside its derived union type. [VERIFIED: src/types/unit.ts lines 8-22]
**When to use:** Every enum-like value set used in dropdowns.
**Example:**
```typescript
// Source: src/types/unit.ts (existing pattern)
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "detail", "effect", "finishing",
] as const;
export type SectionType = typeof SECTION_TYPES[number];
```

### Pattern 3: COALESCE Partial Update
**What:** New nullable fields use COALESCE so omitting them (null) means "don't change", while passing the value sets it. [VERIFIED: src/db/queries/recipeSections.ts updateRecipeSection]
**When to use:** For TEXT fields where null is a valid cleared state AND the user might want to "not change" a field.
**Critical detail:** The existing `updateRecipeSection` treats surface and notes as direct assignment (allows clearing to null), while name/optional/order_index use COALESCE (null = keep current). The four new workflow fields should use COALESCE because:
1. They are optional metadata -- omitting from an update should not clear them
2. This matches the COALESCE pattern for optional fields in the existing function
**Example:**
```typescript
// Source: src/db/queries/recipeSections.ts (existing pattern extended)
`UPDATE recipe_sections
 SET name = COALESCE($2, name),
     surface = $3,
     optional = COALESCE($4, optional),
     order_index = COALESCE($5, order_index),
     notes = $6,
     section_type = COALESCE($7, section_type),
     technique = COALESCE($8, technique),
     execution_mode = COALESCE($9, execution_mode),
     applies_to = COALESCE($10, applies_to),
     updated_at = datetime('now')
 WHERE id = $1`
```

### Pattern 4: DraftSection Factory Extension
**What:** `makeDraftSection()` returns explicit null for every nullable field. `buildDraftSections()` maps every field from DB rows with null fallback. [VERIFIED: src/features/recipes/recipeSection.ts]
**When to use:** When adding new fields to the section form model.
**Critical detail:** Both functions MUST be updated in the same commit as the type change. If `buildDraftSections()` omits a new field, the DELETE-all + re-INSERT save path in `RecipeFormSheet.tsx` will silently erase that field's value (write null where a value existed).

### Anti-Patterns to Avoid
- **Partial type/query update:** Updating the TypeScript type without updating `createRecipeSection` params causes a TypeScript error but could be missed if types are `any`-cast.
- **Forgetting DraftSection mapping:** The save path re-creates sections from DraftSection state. If `buildDraftSections()` does not map a new DB field into DraftSection, editing a recipe with workflow metadata will erase those fields on save.
- **Using COALESCE for applies_to in update if the intent is to allow clearing:** D-12 says COALESCE, but applies_to is free text and may need clearing. However, the CONTEXT.md decision D-12 explicitly says COALESCE for all four, so follow it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enum validation | Custom string checks | Const array + `as const` type | TypeScript compiler enforces valid values at compile time |
| Migration ordering | Manual tracking | Tauri plugin-sql auto-ordering | Migrations run by filename sort; next is `020_` |
| Null coalescing in SQL | Ternary logic in JS | SQLite COALESCE | Keeps partial update logic in SQL, not application code |

## Common Pitfalls

### Pitfall 1: Silent NULL Erasure on Save
**What goes wrong:** User opens an existing recipe with workflow metadata, edits the name, saves. All workflow metadata is wiped to NULL because the save path DELETE-all + re-INSERT did not include the new fields.
**Why it happens:** `RecipeFormSheet.onSubmit` calls `createRecipeSection()` with a fixed set of params. If the params don't include the new fields, they default to NULL in the INSERT.
**How to avoid:** Update `createRecipeSection()`, `DraftSection` interface, `makeDraftSection()`, `buildDraftSections()`, and the `RecipeFormSheet.tsx` save call site ALL in the same task/commit.
**Warning signs:** Test that edits a recipe with metadata and verifies fields survive the round-trip.

### Pitfall 2: Migration Numbering Collision
**What goes wrong:** Migration file `020_` already exists or sorting puts it before `019_`.
**Why it happens:** Filename-based ordering; a typo could place it wrong.
**How to avoid:** Verify `019_rules_favorites_notes.sql` is the last existing migration. `020_workflow_metadata.sql` sorts after it. [VERIFIED: Glob shows 019 is the last numbered migration]
**Warning signs:** App fails to start after migration.

### Pitfall 3: Parameter Position Drift
**What goes wrong:** Adding params to `createRecipeSection` or `updateRecipeSection` shifts positional `$N` placeholders, causing wrong values in wrong columns.
**Why it happens:** Tauri plugin-sql uses positional `$1, $2` syntax, not named params.
**How to avoid:** Carefully count params. `createRecipeSection` currently has 6 params ($1-$6); adding 4 makes it $1-$10. `updateRecipeSection` currently has 6 params ($1-$6); adding 4 makes it $1-$10. `createSession` currently has 6 params ($1-$6); adding 1 makes it $1-$7.
**Warning signs:** Test that checks param array length and positional values.

### Pitfall 4: Existing Test Fixtures Break
**What goes wrong:** Tests in `recipeSections.test.ts` and `recipeSection.pure.test.ts` have RecipeSection fixtures with 9 fields. After adding 4 fields, TypeScript compilation fails unless fixtures are updated.
**Why it happens:** Test fixtures use inline object literals typed as `RecipeSection`.
**How to avoid:** Update all test fixtures to include the four new nullable fields (set to null for backward compatibility).
**Warning signs:** `pnpm test` fails with missing property errors.

## Code Examples

### Migration File (020_workflow_metadata.sql)
```sql
-- Source: Pattern from 014_session_recipe_link.sql [VERIFIED: codebase]
-- 020_workflow_metadata.sql -- Phase 57: Workflow metadata on recipe sections + session section link
-- Additive only -- 5 nullable TEXT columns via ALTER TABLE.
-- Existing data is unchanged (WF-05).

ALTER TABLE recipe_sections ADD COLUMN section_type TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN technique TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN execution_mode TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN applies_to TEXT DEFAULT NULL;

ALTER TABLE painting_sessions ADD COLUMN section_name TEXT DEFAULT NULL;
```

### RecipeSection Type Extension
```typescript
// Source: src/types/recipeSection.ts [VERIFIED: codebase] + D-01/D-02/D-03/D-04
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "detail", "effect", "finishing",
] as const;
export type SectionType = typeof SECTION_TYPES[number];

export const TECHNIQUES = [
  "brush", "sponge", "drybrush", "airbrush", "oil-enamel", "pigment", "decal", "mixed", "other",
] as const;
export type Technique = typeof TECHNIQUES[number];

export const EXECUTION_MODES = [
  "sequential", "batch", "parallel",
] as const;
export type ExecutionMode = typeof EXECUTION_MODES[number];

export interface RecipeSection {
  id: number;
  recipe_id: number;
  name: string;
  surface: string | null;
  optional: number;
  order_index: number;
  notes: string | null;
  // Phase 57 -- workflow metadata (WF-01..04)
  section_type: string | null;
  technique: string | null;
  execution_mode: string | null;
  applies_to: string | null;
  created_at: string;
  updated_at: string;
}
```

### DraftSection Extension
```typescript
// Source: src/features/recipes/recipeSection.ts [VERIFIED: codebase] + D-08/D-09
export interface DraftSection {
  localId: string;
  name: string;
  surface: string | null;
  optional: number;
  notes: string | null;
  // Phase 57 -- workflow metadata
  section_type: string | null;
  technique: string | null;
  execution_mode: string | null;
  applies_to: string | null;
  steps: DraftStep[];
}

export function makeDraftSection(name = "Steps"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    name,
    surface: null,
    optional: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [],
  };
}
```

### createRecipeSection with New Fields
```typescript
// Source: src/db/queries/recipeSections.ts [VERIFIED: codebase] + D-11
export async function createRecipeSection(input: CreateRecipeSectionInput): Promise<number> {
  const db = await getDb();
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
  return result.lastInsertId ?? 0;
}
```

### RecipeFormSheet Save Path Update
```typescript
// Source: src/features/recipes/RecipeFormSheet.tsx lines 272-280 [VERIFIED: codebase] + D-10
const newSectionId = await createRecipeSection({
  recipe_id: recipeId,
  name: sec.name,
  surface: sec.surface,
  optional: sec.optional,
  order_index: i,
  notes: sec.notes,
  section_type: sec.section_type,
  technique: sec.technique,
  execution_mode: sec.execution_mode,
  applies_to: sec.applies_to,
});
```

## State of the Art

No technology changes relevant to this phase. All patterns are stable SQLite + TypeScript conventions used consistently throughout the codebase since v0.2.5.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| -- | -- | -- | -- |

**All claims in this research were verified or cited -- no user confirmation needed.**

## Open Questions

None. All decisions are locked and all patterns are well-established in the codebase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `pnpm test -- tests/painting/recipeSections.test.ts tests/painting/recipeSection.pure.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WF-01 | RecipeSection type has section_type field; createRecipeSection INSERT includes it | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Exists (update fixtures + add tests) |
| WF-02 | RecipeSection type has technique field; createRecipeSection INSERT includes it | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Exists (update fixtures + add tests) |
| WF-03 | RecipeSection type has execution_mode field; createRecipeSection INSERT includes it | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Exists (update fixtures + add tests) |
| WF-04 | RecipeSection type has applies_to field; createRecipeSection INSERT includes it | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | Exists (update fixtures + add tests) |
| WF-05 | All new fields default to null; existing recipe section fixtures compile without them | unit | `pnpm test -- tests/painting/recipeSection.pure.test.ts` | Exists (update fixtures + add tests) |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/recipeSections.test.ts tests/painting/recipeSection.pure.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Update `RecipeSection` fixtures in `tests/painting/recipeSections.test.ts` -- add 4 null fields to `SECTION_1`, `SECTION_2`, and type shape test (Group 8 expects 9 keys, needs 13)
- [ ] Update `RecipeSection` fixtures in `tests/painting/recipeSection.pure.test.ts` -- same 4 null fields on `SECTION_1`, `SECTION_2`
- [ ] Add tests for `createRecipeSection` with new params ($7-$10 positional check)
- [ ] Add tests for `updateRecipeSection` COALESCE on new params ($7-$10)
- [ ] Add test for `createSession` with `section_name` param ($7)
- [ ] Add test for `DraftSection` type shape (4 new fields present)
- [ ] Add test for `makeDraftSection()` returning null for 4 new fields
- [ ] Add test for `buildDraftSections()` mapping 4 new fields from DB rows
- [ ] Add test for `PaintingSession` type shape including `section_name`

## Security Domain

Security enforcement is not applicable to this phase. This is a pure data-layer extension adding nullable TEXT columns with no user input validation changes, no authentication changes, and no new API surface. All queries use parameterized `$N` syntax (existing pattern) preventing SQL injection. [VERIFIED: codebase]

## Sources

### Primary (HIGH confidence)
- `src/types/recipeSection.ts` -- current RecipeSection interface (9 fields)
- `src/types/paintingSession.ts` -- current PaintingSession interface (8 fields)
- `src/features/recipes/recipeSection.ts` -- DraftSection type, makeDraftSection, buildDraftSections
- `src/db/queries/recipeSections.ts` -- createRecipeSection (6 params), updateRecipeSection (6 params with COALESCE)
- `src/db/queries/paintingSessions.ts` -- createSession (6 params)
- `src/features/recipes/RecipeFormSheet.tsx` -- save path at lines 268-281 (DELETE-all + re-INSERT)
- `src-tauri/migrations/014_session_recipe_link.sql` -- ALTER TABLE pattern reference
- `src-tauri/migrations/018_recipe_sections.sql` -- recipe_sections CREATE TABLE reference
- `src/types/unit.ts` lines 8-22 -- const array pattern reference
- `src/features/recipes/recipeSchema.ts` lines 3-28 -- const array pattern reference
- `tests/painting/recipeSections.test.ts` -- existing test coverage (14 groups)
- `tests/painting/recipeSection.pure.test.ts` -- existing pure function tests

### Secondary (MEDIUM confidence)
None needed -- all claims verified against codebase.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, verified all existing
- Architecture: HIGH -- all patterns verified in codebase, 14 locked decisions
- Pitfalls: HIGH -- identified from direct code inspection of save path and test fixtures

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (stable -- no external dependencies, internal patterns only)
