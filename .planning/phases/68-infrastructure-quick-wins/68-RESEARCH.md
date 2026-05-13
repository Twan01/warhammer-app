# Phase 68: Infrastructure Quick Wins - Research

**Researched:** 2026-05-13
**Domain:** SQLite query correctness, migration registration, version hygiene
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** The 4 workflow metadata fields (`section_type`, `technique`, `execution_mode`, `applies_to`) in `updateRecipeSection` must switch from `COALESCE($N, column)` to direct assignment (`column = $N`), matching the existing pattern used by `surface` and `notes` in the same function.

**D-02:** The TypeScript caller must explicitly pass `null` (not `undefined`) for cleared fields. The existing `?? null` coercion in the parameter array already handles this — no caller changes needed.

**D-03:** All recipe-level step queries (`getRecipePaintsByRecipe` in `recipePaints.ts`, and the step SELECT inside `duplicateRecipe` in `recipes.ts`) must JOIN on `recipe_sections` and ORDER BY `section.order_index ASC, step.order_index ASC`. Steps without a section_id sort last via `COALESCE(section.order_index, 999999)`.

**D-04:** `duplicateRecipe` in `recipes.ts` step fetch uses `ORDER BY order_index ASC` without section awareness. Fix identically: JOIN + section-first ordering.

**D-05:** No `getStepsWithPaints` batch-fetch path exists in the current codebase (CONTEXT.md referenced a line 78 function that does not exist). The only section-unaware step queries are `getRecipePaintsByRecipe` (line 7, `recipePaints.ts`) and the step SELECT inside `duplicateRecipe` (line 168, `recipes.ts`).

**D-06:** Both `package.json` and `src-tauri/tauri.conf.json` currently show `0.2.7`. Target version is `0.2.11` (current active milestone — v0.2.10 shipped with v0.2.11 work overlapping, and the milestone is v0.2.11 Foundation Hardening). See Version Target section below.

**D-07:** All 21 hobbyforge migrations (001-021) and 3 rules migrations (rules_001-003) are already registered in `lib.rs`. Verification confirms no gaps.

**D-08:** Fresh install validation is a manual smoke test only in this phase (automated test is TST-01, Phase 72 scope).

**D-09:** `duplicateRecipe` section copy (lines 158-163) inserts only 6 columns — missing `section_type`, `technique`, `execution_mode`, `applies_to`. Fix alongside the ordering fix.

### Claude's Discretion

- Whether to extract the section-aware ORDER BY clause into a shared SQL fragment or keep it inline in each query
- Whether to add a comment explaining the COALESCE-vs-direct-assignment distinction in recipeSections.ts
- Exact ordering of the 4 fixes within the plan (migration check first vs. COALESCE first)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIG-01 | All schema migrations (018-021) are registered in lib.rs and applied on fresh install | Verified: lib.rs get_migrations() contains versions 1-21; all 21 SQL files exist on disk |
| MIG-02 | Fresh app launch from empty app data directory creates all required tables/columns without errors | Verified: Registration is complete; fresh-install smoke test procedure documented |
| VER-01 | package.json and tauri.conf.json version numbers match the current release | Verified: both currently show 0.2.7; target is 0.2.11 |
| REC-03 | User can set and clear section workflow metadata; clearing persists after save/reopen | Verified: exact COALESCE lines identified in recipeSections.ts lines 59-62; fix pattern confirmed by existing surface/notes pattern (lines 55, 58) |
| REC-05 | Recipe-level step queries return steps ordered by section index then step index; no interleaving (includes duplicateRecipe fix) | Verified: two affected queries identified; JOIN + COALESCE ORDER BY pattern documented |
</phase_requirements>

---

## Summary

Phase 68 is a surgical correctness pass across four independent infrastructure issues. No new features, tables, UI, or migrations are introduced. Every fix is in an existing file that was already read as part of this research — the scope is tightly bounded.

The migration registration audit (MIG-01/MIG-02) is a pure verification task. Code inspection confirms that `lib.rs` `get_migrations()` already registers all 21 hobbyforge migrations (versions 1-21) and `get_rules_migrations()` registers all 3 rules migrations. All SQL files exist on disk. No code change is needed — the task produces a documented verification checklist rather than new code, plus a manual smoke test procedure.

The COALESCE null-clearing fix (REC-03) is a 4-line SQL change in `updateRecipeSection` in `recipeSections.ts`. The correct pattern already exists in the same function for `surface` (line 55) and `notes` (line 58) — direct assignment. Lines 59-62 apply `COALESCE` to the 4 workflow metadata fields, which blocks null from flowing through when a user clears a field. Removing COALESCE from those 4 lines resolves REC-03 completely. No caller changes needed because the TypeScript parameter array already uses `?? null` coercion.

The section-aware step ordering fix (REC-05) touches two queries: `getRecipePaintsByRecipe` in `recipePaints.ts` (the single-recipe step list) and the inline step SELECT inside `duplicateRecipe` in `recipes.ts`. Both use `ORDER BY order_index ASC` without considering which section the step belongs to. Existing tests for `duplicateRecipe` (at `tests/painting/duplicateRecipe.test.ts`) assert the old 6-column section INSERT — those tests will also need updating when D-09 (section metadata columns in section copy) is fixed. The section-aware ORDER BY uses a LEFT JOIN on `recipe_sections` and `ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC` to handle both sectioned and legacy unsectioned recipes.

The version bump (VER-01) is a 2-character change in two files: `package.json` `"version"` field and `src-tauri/tauri.conf.json` `"version"` field, both from `"0.2.7"` to `"0.2.11"`.

**Primary recommendation:** Execute the four fixes in this order — migration audit first (produces documentation, no code risk), COALESCE fix second (smallest change, most isolated), section ordering third (requires JOIN refactor + test update), version bump last (cosmetic, no risk).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| COALESCE null-clearing fix (REC-03) | Database / Storage | — | Pure SQL query change in query module; no UI or hook changes |
| Section-aware step ordering (REC-05) | Database / Storage | — | SQL ORDER BY change in query module; components receive already-ordered data |
| Migration registration audit (MIG-01/MIG-02) | Database / Storage | — | lib.rs registration + SQL file verification; no application logic |
| Version alignment (VER-01) | Build / Config | — | Metadata-only change in package.json and tauri.conf.json |

---

## Standard Stack

This phase uses only the existing project stack — no new dependencies.

| Tool | Version | Purpose |
|------|---------|---------|
| tauri-plugin-sql | ^2.4.0 | Parameterized query execution (`$1, $2` positional syntax) |
| SQLite (via tauri-plugin-sql) | bundled | `LEFT JOIN` and `COALESCE` in ORDER BY — both standard SQLite features |
| Vitest | ^4.1.5 | Existing test runner; tests updated to reflect new SQL assertions |

**Installation:** No new packages required.

---

## Architecture Patterns

### System Architecture Diagram

```
User Action (clear a metadata field in the UI)
      ↓
RecipeFormSheet (existing component — no change)
      ↓
useUpdateRecipeSection (hook — no change)
      ↓
updateRecipeSection() [recipeSections.ts — CHANGE: remove 4 COALESCEs]
      ↓
db.execute() → SQLite UPDATE
      ↓
null flows to column ✓ (was blocked by COALESCE)
```

```
Component fetches steps for a recipe detail view
      ↓
useRecipePaints / getRecipePaintsByRecipe [recipePaints.ts — CHANGE: add JOIN + ORDER BY]
      ↓
SQLite: SELECT rs.* FROM recipe_steps rs
        LEFT JOIN recipe_sections s ON s.id = rs.section_id
        WHERE rs.recipe_id = $1
        ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC
      ↓
Steps returned in guaranteed section-then-step order ✓
```

### Recommended Project Structure

No structure changes. All edits are in-place modifications to existing files:

```
src/db/queries/
  recipeSections.ts     — updateRecipeSection: remove 4 COALESCEs
  recipePaints.ts       — getRecipePaintsByRecipe: add LEFT JOIN + ORDER BY
  recipes.ts            — duplicateRecipe: fix step ORDER BY + section copy columns

src-tauri/src/
  lib.rs                — no change (already correct, verification only)

package.json            — version: "0.2.7" → "0.2.11"
src-tauri/tauri.conf.json — version: "0.2.7" → "0.2.11"

tests/painting/
  duplicateRecipe.test.ts     — update assertions for new section copy (10 columns)
  recipeSections.test.ts      — update assertions for direct assignment on $7-$10
```

### Pattern 1: Direct Assignment vs COALESCE in UPDATE

**What:** Two distinct patterns are used in `updateRecipeSection` depending on whether NULL is a valid "user intent" value:

- `COALESCE($N, column)` — "don't change if caller passes null" — correct for `name`, `optional`, `order_index` which have no meaningful null state
- `column = $N` — "apply the value as-is, including null" — correct for clearable fields like `surface`, `notes`, and the 4 workflow metadata fields

**When to use direct assignment:** When the user must be able to clear a field back to empty/null through the form UI. The form passes `null` for cleared optional fields via `?? null` coercion.

**Example — current (buggy) vs fixed:**
```typescript
// Source: src/db/queries/recipeSections.ts lines 53-63
// BUGGY — blocks null from clearing the value:
section_type = COALESCE($7, section_type),
technique = COALESCE($8, technique),
execution_mode = COALESCE($9, execution_mode),
applies_to = COALESCE($10, applies_to),

// FIXED — allows null to flow through and clear the value:
section_type = $7,
technique = $8,
execution_mode = $9,
applies_to = $10,
```

### Pattern 2: Section-Aware Step Ordering via LEFT JOIN

**What:** To guarantee that steps from different sections never interleave in results, join `recipe_steps` to `recipe_sections` and order by section's `order_index` first, then step's `order_index`.

**When to use:** Any query that fetches recipe_steps at the recipe level (not scoped to a specific section) where section grouping matters to the consumer.

**COALESCE sentinel for unsectioned steps:** Legacy recipes and steps without a `section_id` return NULL from the join. `COALESCE(s.order_index, 999999)` sorts them last rather than first (SQLite sorts NULLs first in ASC by default).

**Example:**
```sql
-- Source: decision D-03 from CONTEXT.md, verified against SQLite behavior
SELECT rs.*
FROM recipe_steps rs
LEFT JOIN recipe_sections s ON s.id = rs.section_id
WHERE rs.recipe_id = $1
ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC
```

### Pattern 3: Section Copy with Full Metadata Columns (duplicateRecipe)

**What:** The section INSERT in `duplicateRecipe` currently copies only 6 columns (recipe_id, name, surface, optional, order_index, notes), missing the 4 workflow metadata columns added in migration 020. This means duplicated recipes silently lose section metadata.

**Fixed INSERT:**
```sql
-- Source: identified via code inspection of recipes.ts lines 158-163
INSERT INTO recipe_sections
  (recipe_id, name, surface, optional, order_index, notes,
   section_type, technique, execution_mode, applies_to)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
```

### Anti-Patterns to Avoid

- **COALESCE on clearable fields:** When a field should be settable back to NULL through the UI, `COALESCE($N, column)` prevents that. Always distinguish "don't touch if omitted" (COALESCE) from "apply the value" (direct assignment).
- **ORDER BY order_index without section awareness:** Produces interleaved results when steps from section A (order_index 0-2) and section B (order_index 0-2) exist. The result set is ordered globally by step order_index, not per-section.
- **NULL sort order in SQLite:** SQLite's default `ORDER BY col ASC` sorts NULLs first. When NULLs should be last (unsectioned steps), wrap with `COALESCE(col, 999999)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-column ORDER guarantee | Custom sort in TypeScript | SQL `ORDER BY` with JOIN | Single sort pass at DB level; no client-side re-sort needed |
| Migration registration | Custom migration runner | tauri-plugin-sql existing registration | Already battle-tested; just verify completeness |
| Null-clearing in UPDATE | Separate "clear" endpoint | Direct assignment in existing UPDATE | One function covers both set and clear; consistent with codebase pattern |

---

## Migration Registration Audit (MIG-01/MIG-02)

### Verified Registration State

**[VERIFIED: code inspection of src-tauri/src/lib.rs lines 5-157]**

`get_migrations()` registers versions 1-21:

| Version | Description | SQL File | Exists on Disk |
|---------|-------------|----------|----------------|
| 1 | core_schema | 001_core_schema.sql | [VERIFIED] |
| 2 | seed_factions | 002_seed_factions.sql | [VERIFIED] |
| 3 | seed_data | 003_seed_data.sql | [VERIFIED] |
| 4 | unit_playbook_stats | 004_unit_playbook_stats.sql | [VERIFIED] |
| 5 | hobby_journal | 005_hobby_journal.sql | [VERIFIED] |
| 6 | spend_pence | 006_spend_pence.sql | [VERIFIED] |
| 7 | datasheet_link | 007_datasheet_link.sql | [VERIFIED] |
| 8 | enrichment | 008_enrichment.sql | [VERIFIED] |
| 9 | wishlist | 009_wishlist.sql | [VERIFIED] |
| 10 | hobby_goals | 010_hobby_goals.sql | [VERIFIED] |
| 11 | point_tiers_loadouts | 011_point_tiers_loadouts.sql | [VERIFIED] |
| 12 | recipe_steps | 012_recipe_steps.sql | [VERIFIED] |
| 13 | step_photos_alt_paint | 013_step_photos_alt_paint.sql | [VERIFIED] |
| 14 | session_recipe_link | 014_session_recipe_link.sql | [VERIFIED] |
| 15 | sync_errors | 015_sync_errors.sql | [VERIFIED] |
| 16 | rules_snapshot | 016_rules_snapshot.sql | [VERIFIED] |
| 17 | unit_overrides | 017_unit_overrides.sql | [VERIFIED] |
| 18 | recipe_sections | 018_recipe_sections.sql | [VERIFIED] |
| 19 | rules_favorites_notes | 019_rules_favorites_notes.sql | [VERIFIED] |
| 20 | workflow_metadata | 020_workflow_metadata.sql | [VERIFIED] |
| 21 | applied_recipe_assignments | 021_applied_recipe_assignments.sql | [VERIFIED] |

`get_rules_migrations()` registers versions 1-3:

| Version | Description | SQL File | Exists on Disk |
|---------|-------------|----------|----------------|
| 1 | rules_schema | rules_001_schema.sql | [VERIFIED] |
| 2 | wargear_abilities | rules_002_wargear_abilities.sql | [VERIFIED] |
| 3 | sync_meta_counts | rules_003_sync_meta_counts.sql | [VERIFIED] |

**Finding:** Registration is already complete and correct. MIG-01 requires no code change — only a documented verification checklist and manual smoke test procedure. The requirement from REQUIREMENTS.md ("migrations 018-021 are registered") is satisfied. [VERIFIED: code inspection]

### Smoke Test Procedure (MIG-02)

Fresh install validation procedure (manual, one-time):
1. Locate app data directory: `%APPDATA%\com.hobbyforge.app\` on Windows
2. Close the app. Delete (or rename) `hobbyforge.db` and `rules.db` from that directory.
3. Launch via `pnpm tauri dev`
4. Verify the app starts without errors in the Tauri console
5. Open the DevTools console — confirm no SQL errors
6. Navigate to Recipes, Army Lists, Game Day, Rules Hub — confirm pages load (implies all tables exist)
7. Confirm session logging works (writes to painting_sessions which requires migration 014 columns)

---

## Version Target Analysis (VER-01)

**[VERIFIED: package.json line 3, tauri.conf.json line 3 — both show "0.2.7"]**

Current state:
- `package.json` version: `"0.2.7"`
- `src-tauri/tauri.conf.json` version: `"0.2.7"`

Target: `"0.2.11"`

Reasoning: PROJECT.md states "Current Milestone: v0.2.11 Foundation Hardening" and "v0.2.9 shipped 2026-05-12." STATE.md shows v0.2.10 in progress alongside v0.2.11. The version was never bumped past 0.2.7 across milestones 0.2.8, 0.2.9, 0.2.10. The correct target is `0.2.11` to reflect the milestone this phase belongs to.

**[ASSUMED]** Whether to bump to `0.2.10` first then `0.2.11`, or jump directly to `0.2.11`. Given both milestones' work is in progress simultaneously and the goal is alignment, jumping directly to `0.2.11` is the simpler approach and matches the current milestone context.

---

## Common Pitfalls

### Pitfall 1: SQLite NULL Sort Order in ASC

**What goes wrong:** Adding `LEFT JOIN recipe_sections s ON s.id = rs.section_id ORDER BY s.order_index ASC, rs.order_index ASC` — steps with `section_id IS NULL` sort first (before section 0), not last. Legacy unsectioned recipes get their steps mixed in at the top.

**Why it happens:** SQLite's default ASC ordering places NULL before any integer value.

**How to avoid:** Wrap with COALESCE sentinel: `ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC`.

**Warning signs:** Test with a recipe that has both a section and unsectioned steps — the unsectioned steps appear before section-0 steps.

### Pitfall 2: Test Assertions Hardcoded to Old 6-Column Section INSERT

**What goes wrong:** `tests/painting/duplicateRecipe.test.ts` line 162 asserts `params1` equals `[100, "Armour", "smooth", 0, 0, null]` (6 values). After expanding to 10 columns, this assertion fails with a length mismatch.

**Why it happens:** The test was written when the section INSERT only had 6 columns. The workflow metadata columns (section_type, technique, execution_mode, applies_to) did not exist at test-write time.

**How to avoid:** When updating the INSERT SQL in `duplicateRecipe`, update the test assertion in the same plan step — add null for each of the 4 new params (`[100, "Armour", "smooth", 0, 0, null, null, null, null, null]`).

**Warning signs:** `pnpm test` fails with "expected [Array] to equal [Array]" on the section params assertion.

### Pitfall 3: Existing Test in recipeSections.test.ts Asserts Current COALESCE Behavior

**What goes wrong:** `tests/painting/recipeSections.test.ts` Group 3, test "UPDATE uses COALESCE for workflow metadata $7-$10" (line 204) directly asserts `COALESCE($7, section_type)` etc. After the fix, the SQL no longer contains those COALESCE expressions — this test will fail.

**Why it happens:** The test was written to document the current (buggy) behavior. After fixing REC-03, the test spec must flip: workflow metadata should NOT use COALESCE.

**How to avoid:** When updating `updateRecipeSection`, update Group 3 tests in the same plan step:
- Remove the "uses COALESCE for workflow metadata" test (or invert it to assert `NOT` contain COALESCE)
- The existing test "surface and notes use direct assignment (not COALESCE)" at line 226 is the correct model — add a parallel test for workflow metadata fields.

**Warning signs:** `pnpm test -- tests/painting/recipeSections.test.ts` fails on Group 3.

### Pitfall 4: `COALESCE(NULL, 999999)` Works Correctly in SQLite

**What goes wrong:** Developer questions whether `COALESCE(NULL, 999999)` evaluates to 999999 in SQLite. It does — this is standard SQL behavior. No concern.

**Why it happens:** Unfamiliarity with COALESCE in ORDER BY context.

**How to avoid:** Confirm in SQLite docs: COALESCE returns the first non-null argument. In ORDER BY context, this is valid and fully supported.

### Pitfall 5: Version Field Location in tauri.conf.json

**What goes wrong:** Searching for "version" in tauri.conf.json and finding `$schema` URL which contains version numbers in the URL path — editing the wrong thing.

**Why it happens:** Multiple "version" references in a JSON file.

**How to avoid:** The only field to change is the top-level `"version"` key at line 3: `"version": "0.2.7"`. The `$schema` URL at line 1 should not be changed.

---

## Code Examples

### REC-03 Fix: updateRecipeSection in recipeSections.ts

```typescript
// Source: src/db/queries/recipeSections.ts
// BEFORE (buggy) — lines 53-62:
`UPDATE recipe_sections
 SET name = COALESCE($2, name),
     surface = $3,
     optional = COALESCE($4, optional),
     order_index = COALESCE($5, order_index),
     notes = $6,
     section_type = COALESCE($7, section_type),   // BUG: blocks null
     technique = COALESCE($8, technique),          // BUG: blocks null
     execution_mode = COALESCE($9, execution_mode), // BUG: blocks null
     applies_to = COALESCE($10, applies_to),       // BUG: blocks null
     updated_at = datetime('now')
 WHERE id = $1`

// AFTER (fixed):
`UPDATE recipe_sections
 SET name = COALESCE($2, name),
     surface = $3,
     optional = COALESCE($4, optional),
     order_index = COALESCE($5, order_index),
     notes = $6,
     section_type = $7,
     technique = $8,
     execution_mode = $9,
     applies_to = $10,
     updated_at = datetime('now')
 WHERE id = $1`
```

### REC-05 Fix: getRecipePaintsByRecipe in recipePaints.ts

```typescript
// Source: src/db/queries/recipePaints.ts
// BEFORE (buggy) — line 6-8:
return db.select<RecipeStep[]>(
  "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC",
  [recipeId]
);

// AFTER (fixed):
return db.select<RecipeStep[]>(
  `SELECT rs.*
   FROM recipe_steps rs
   LEFT JOIN recipe_sections s ON s.id = rs.section_id
   WHERE rs.recipe_id = $1
   ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC`,
  [recipeId]
);
```

### REC-05 + D-09 Fix: duplicateRecipe step SELECT and section INSERT in recipes.ts

```typescript
// Source: src/db/queries/recipes.ts
// STEP SELECT FIX — line 167-169:
// BEFORE:
const steps = await db.select<RecipeStep[]>(
  "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC",
  [originalId]
);
// AFTER:
const steps = await db.select<RecipeStep[]>(
  `SELECT rs.*
   FROM recipe_steps rs
   LEFT JOIN recipe_sections s ON s.id = rs.section_id
   WHERE rs.recipe_id = $1
   ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC`,
  [originalId]
);

// SECTION INSERT FIX — lines 158-163:
// BEFORE (6 columns — missing 4 workflow metadata):
const sectionResult = await db.execute(
  `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [newRecipeId, section.name, section.surface, section.optional, section.order_index, section.notes ?? null]
);
// AFTER (10 columns — all metadata copied):
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

---

## Test Impact Analysis

Three test files require updates when source code changes:

### tests/painting/recipeSections.test.ts

**Affected group:** Group 3 — `updateRecipeSection` (lines 192-237)

| Test | Current Assertion | Post-Fix Assertion |
|------|------------------|-------------------|
| "UPDATE uses COALESCE for workflow metadata $7-$10" | Asserts SQL contains `COALESCE($7, section_type)` etc. | Must be removed or inverted — SQL will NOT contain these patterns |
| "surface and notes use direct assignment" | Asserts `NOT` COALESCE for $3, $6 | Unchanged — still passes |

**Add new test:** Parallel to the surface/notes test, assert that workflow metadata fields ($7-$10) also use direct assignment syntax (`section_type = $7` etc.), not COALESCE.

### tests/painting/duplicateRecipe.test.ts

**Affected test:** "inserts section copies with new recipe_id and all 6 columns" (line 157)

| Parameter | Current Expected | Post-Fix Expected |
|-----------|-----------------|-------------------|
| params1 | `[100, "Armour", "smooth", 0, 0, null]` (6 values) | `[100, "Armour", "smooth", 0, 0, null, null, null, null, null]` (10 values) |
| params2 | `[100, "Cloth", null, 1, 1, "optional block"]` (6 values) | `[100, "Cloth", null, 1, 1, "optional block", null, null, null, null]` (10 values) |

**Test description update:** "all 6 columns" → "all 10 columns including workflow metadata".

No other tests in this file require changes (step assertions use index-based params that are unaffected by the ORDER BY change, since mock returns data in fixture order regardless of SQL).

### tests/painting/recipeSection.pure.test.ts

Check whether this file asserts SQL patterns in `updateRecipeSection` — if so, same update as recipeSections.test.ts Group 3 applies.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| COALESCE for all nullable fields in UPDATE | Direct assignment for clearable fields | v0.2.5 (pattern established for recipe metadata) | Existing pattern — just not consistently applied to section workflow metadata |
| No sections in recipe_steps queries | Section-aware ORDER BY with JOIN | This phase | Steps guaranteed to be in section order for all recipe-level consumers |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Target version for VER-01 is `0.2.11` (not `0.2.10`) | Version Target Analysis | Low — if planner or user prefers a different target version, it's a 1-character change |
| A2 | `getRecipeSwatchColors` (recipePaints.ts line 73) does not need section-aware ordering because it is used for color swatch display across all recipes, not step-sequence display | Standard Stack / Architecture | Low — if a consumer ever needs swatches in section order, that query would need updating separately |
| A3 | The `getRecipePaintsByRecipe` function is the only recipe-level step query consumer for the RecipeDetailSheet/SectionedTimeline views (i.e., no other function in recipePaints.ts fetches steps by recipe for display purposes) | Code Examples | Low — confirmed via grep: only one single-recipe step SELECT exists in recipePaints.ts |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Version: should it be 0.2.10 or 0.2.11?**
   - What we know: The codebase currently shows 0.2.7. v0.2.8 and v0.2.9 shipped without a version bump. v0.2.10 is in progress simultaneously with v0.2.11.
   - What's unclear: Whether the intended version reflects "work currently being shipped" (0.2.11) or "last completed milestone" (0.2.9 = bump to 0.2.9, then 0.2.10 later).
   - Recommendation: Jump to 0.2.11 to reflect the active milestone. The in-between milestones never had version bumps, so catching up to the current milestone is the most informative signal. This is the assumption in A1.

---

## Environment Availability

Step 2.6: SKIPPED — this phase contains only SQL edits, config file changes, and test updates. No external tools, services, or runtimes beyond the existing project stack are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.5 |
| Config file | `vite.config.ts` (includes Vitest config) |
| Quick run command | `pnpm test -- tests/painting/recipeSections.test.ts tests/painting/duplicateRecipe.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REC-03 | updateRecipeSection allows null to flow through for metadata fields | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | ✅ (needs update) |
| REC-05 | getRecipePaintsByRecipe returns steps in section then step order | unit | `pnpm test -- tests/painting/recipeSections.test.ts` | ❌ Wave 0 (new test needed) |
| REC-05 | duplicateRecipe step SELECT uses section-aware order | unit | `pnpm test -- tests/painting/duplicateRecipe.test.ts` | ✅ (needs update) |
| MIG-01 | All 21 migrations registered in lib.rs | manual/docs | N/A — verification checklist | ✅ (documented in this research) |
| MIG-02 | Fresh install succeeds without errors | manual smoke test | N/A | Manual only |
| VER-01 | package.json and tauri.conf.json version match | manual / TypeScript check | `pnpm build` (tsc would catch type issues; version is a string — manual verify) | Manual |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting/recipeSections.test.ts tests/painting/duplicateRecipe.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] New test in `tests/painting/recipeSections.test.ts` covering section-aware ORDER BY in `getRecipePaintsByRecipe` (REC-05)
  - The existing test file covers `updateRecipeSection` (recipeSections.ts) but not `getRecipePaintsByRecipe` (recipePaints.ts). A new test group should assert the JOIN + COALESCE ORDER BY SQL.

*(No new test files needed — extend existing test files)*

---

## Security Domain

This phase makes no changes to authentication, session management, access control, cryptography, or input handling. It is SQL query correctness and config file changes only.

Security domain: NOT APPLICABLE to Phase 68.

---

## Sources

### Primary (HIGH confidence)

- `src/db/queries/recipeSections.ts` — lines 50-78: direct code inspection of COALESCE bug
- `src/db/queries/recipePaints.ts` — line 6-8: direct code inspection of ordering bug
- `src/db/queries/recipes.ts` — lines 149-168: direct code inspection of duplicateRecipe step SELECT and section INSERT
- `src-tauri/src/lib.rs` — lines 5-157: direct code inspection of get_migrations() and get_rules_migrations()
- `src-tauri/migrations/` — Glob listing: 24 SQL files verified on disk (21 hobbyforge + 3 rules)
- `package.json` line 3 — version "0.2.7" verified
- `src-tauri/tauri.conf.json` line 3 — version "0.2.7" verified
- `tests/painting/duplicateRecipe.test.ts` — line 162: assertion that will break after D-09 fix
- `tests/painting/recipeSections.test.ts` — line 204: assertion that will break after REC-03 fix

### Secondary (MEDIUM confidence)

- `.planning/phases/68-infrastructure-quick-wins/68-CONTEXT.md` — locked decisions D-01 through D-09
- `.planning/REQUIREMENTS.md` — MIG-01, MIG-02, VER-01, REC-03, REC-05 definitions
- `.planning/STATE.md` — accumulated context confirming COALESCE bug and duplicateRecipe ordering bug
- `.planning/PROJECT.md` — v0.2.11 milestone context; version history

---

## Metadata

**Confidence breakdown:**
- Migration audit: HIGH — verified by direct code inspection, zero ambiguity
- COALESCE fix: HIGH — exact lines identified, fix pattern confirmed from existing code
- Section ordering fix: HIGH — exact queries identified, SQL pattern clear, SQLite NULL sort behavior confirmed
- Version target: MEDIUM — jumping to 0.2.11 is logical but not explicitly mandated; flagged as A1
- Test impact: HIGH — test files read, exact assertions identified

**Research date:** 2026-05-13
**Valid until:** Stable — no external dependencies; valid until any of the 5 source files change
