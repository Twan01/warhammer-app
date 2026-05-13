# Pitfalls Research

**Domain:** Foundation hardening — migration registration, recipe data integrity, non-destructive saves, stable FK references, section-aware ordering
**Researched:** 2026-05-13
**Confidence:** HIGH (all findings grounded in direct inspection of `src-tauri/src/lib.rs`, `src-tauri/migrations/*.sql`, `src/db/queries/*.ts`, `src/features/recipes/RecipeFormSheet.tsx`, and `.planning/PROJECT.md` Key Decisions table)

---

## Critical Pitfalls

### 1. Migration Registration / File Parity Gap Closes But Re-Opens Silently

**What goes wrong:**
A migration `.sql` file exists on disk but is not registered in `get_migrations()` in `lib.rs`. The app compiles, existing users never see an error (their DB already has the table from a previous run), and the gap is invisible until a fresh install fails with "no such table" at runtime.

The inverse also happens: a migration is registered in `lib.rs` but the `.sql` file is renamed or deleted. Rust's `include_str!()` is a compile-time macro — a missing file is a compile error, which is good. But a file present with the wrong name (e.g., `021_applied_recipe_assignments.sql` registered as version 22) silently runs in the wrong order against a versioned migration table that expects sequential integers.

Current state: as of 2026-05-13, migrations 018/019/020/021 are all registered correctly in `lib.rs`. The pitfall is that future migrations added as `.sql` files without a corresponding `lib.rs` entry will reproduce the gap.

**Why it happens:**
The two-step process (write SQL file, then add Rust struct) requires remembering both steps. When phases are under time pressure, the SQL file is created (often during Wave 1 TDD) but the `lib.rs` registration is deferred. An existing dev DB never triggers the error.

**How to avoid:**
- MIG-01 must include a verification step: count `.sql` files matching `NNN_*.sql` (excluding `rules_*`) and compare against the count of `Migration { version: N }` entries in `get_migrations()`. They must be equal.
- Add a comment block at the top of `lib.rs` listing the highest registered version: `// LAST REGISTERED: v21 — update this when adding a migration`.
- TST-01 data-layer tests must include a "migration count parity" test: read all `.sql` files in the migrations dir and assert the count matches the registered vec length.

**Warning signs:**
- Fresh install via empty `app_data_dir` crashes with "no such table: recipe_sections" or "no such column: section_type".
- `tauri-plugin-sql` emits a panic at startup because the migration table's highest applied version exceeds the registered vec length.
- A new `.sql` file appears in `src-tauri/migrations/` with no corresponding entry added to `lib.rs` in the same commit.

**Phase to address:** MIG-01 — the fix and verification test belong in the same wave.

---

### 2. Non-Destructive Save: Partial Writes Leave a Corrupt Recipe State

**What goes wrong:**
The current recipe save path in `RecipeFormSheet.tsx` (confirmed at lines 234–308) does:
1. DELETE all existing sections (CASCADE removes their steps)
2. Re-INSERT sections
3. Re-INSERT steps with new `lastInsertId` values

When retrofitting to a non-destructive (update-in-place) path, the typical failure is a partial update: sections present in DB but absent in the form draft are not deleted, leaving orphaned sections. Steps reassigned to a different section in the form keep their old `section_id` from before the save. The visual result is a recipe that looks correct in the form but renders with phantom sections and misrouted steps in the timeline view.

A second common failure: the diff algorithm matches sections by `localId` (a client-side UUID), not by `id` (the DB primary key). On re-open, `buildDraftSections` must restore `dbId` from the existing DB rows. If `localId` and `dbId` are confused, every save treats all sections as new, silently deleting and re-creating them — identical behavior to the current DELETE-all pattern, defeating the entire purpose of the hardening.

**Why it happens:**
Non-destructive saves require a three-way reconciliation: (A) sections/steps in the DB but not the draft → DELETE, (B) sections/steps in both → UPDATE, (C) sections/steps in the draft but not the DB → INSERT. The simpler DELETE-all + re-INSERT sidesteps all three cases at the cost of ID stability. When retrofitting, developers often implement case (C) correctly (INSERT new items) but forget case (A) (DELETE removed items), leaving orphaned rows.

**How to avoid:**
- `buildDraftSections` must preserve `dbId` on each draft section and step when loading from existing DB data. The diff on save uses `dbId` to route rows to UPDATE vs INSERT.
- Deletion pass first: for each DB section/step not present in the draft (by `dbId`), issue DELETE before any INSERT or UPDATE.
- Only after the deletion pass: UPDATE existing rows, then INSERT new rows.
- The form's `key={recipe?.id ?? "new"}` on `SheetContent` forces a re-mount when switching recipes — this is correct and must be preserved; the non-destructive save path must not break the re-mount contract.
- Write a round-trip test: create recipe → open form → save without changes → assert section/step IDs are identical before and after save.

**Warning signs:**
- Painting session records with `recipe_step_id` are orphaned (point to deleted step IDs) after a recipe is saved without changes to its steps.
- `unit_recipe_step_progress` rows are wiped on every recipe save because the CASCADE on `recipe_steps` deletes them.
- `buildDraftSections` returns draft objects where `localId` is a fresh UUID even in edit mode (instead of the DB id serialized as a string).
- After saving, a second open of the same recipe shows a "Steps" default section that was not there before — a sign the backfill migration re-ran.

**Phase to address:** REC-02 — the draft data model change (`dbId` field on `DraftSection` and `DraftStep`) must land before the form submit path is touched.

---

### 3. COALESCE Blocking Null Assignment — The Clearing Problem

**What goes wrong:**
`updateRecipeSection` in `recipeSections.ts` (confirmed at lines 50–78) uses:
```sql
SET section_type = COALESCE($7, section_type)
```
When the user clears the `section_type` dropdown (sets it to null), the form passes `null` for `$7`. `COALESCE(null, section_type)` returns the old value. The field is never cleared. The UI shows "cleared" but the DB retains the stale value. On next open, the form re-populates the field from the DB — the clear was silently lost.

The same COALESCE is applied to `technique`, `execution_mode`, and `applies_to` — all four workflow metadata fields added in migration 020. All four cannot be cleared.

The confusion arises from a legitimate COALESCE use elsewhere: `updateRecipe` in `recipes.ts` (lines 44–82) uses COALESCE for `name`, `faction_id`, `unit_id`, `area` and similar non-optional identity fields, while using direct assignment for `style`, `surface`, `effect`, `difficulty` which are genuinely nullable. The section metadata fields were mistakenly placed in the COALESCE group.

**Why it happens:**
The COALESCE pattern was designed for partial-update APIs: pass only the fields you want to change, leave others as `null` to signal "unchanged." This works when null is not a valid domain value. For workflow metadata (`section_type` etc.), null is explicitly a valid value meaning "not configured." The two semantics conflict. The bug is easy to miss in testing because most testers set values but rarely clear them.

**How to avoid:**
- REC-03 must change `section_type`, `technique`, `execution_mode`, and `applies_to` to direct assignment (same as `surface` and `notes` already are in the same UPDATE).
- The rule: use COALESCE only for fields where null is not a meaningful domain value (e.g., a required name field where null means "caller didn't provide it"). Use direct assignment for every nullable field where null means "intentionally empty."
- Add a test: set `section_type` to a value, then call `updateRecipeSection` with `section_type: null` and assert the DB row has `section_type IS NULL`.

**Warning signs:**
- User sets section metadata, clears it, saves — next open still shows the old value.
- `updateRecipeSection` test only covers setting a value, not clearing one.
- The UPDATE statement for any nullable field reads `SET field = COALESCE($N, field)`.

**Phase to address:** REC-03. Self-contained SQL change; no schema migration needed.

---

### 4. Stable Section Reference: Denormalized Name Drifts Out of Sync With Renamed Sections

**What goes wrong:**
`painting_sessions` stores `section_name TEXT` (migration 020, line 10) as a denormalized copy to survive the DELETE-all + re-INSERT save pattern. REC-04 adds a `recipe_section_id INTEGER` FK column alongside it. But if both columns are written independently and the section is later renamed, `section_name` becomes stale while `recipe_section_id` remains valid. UI code that displays `section_name` will show the old name even though the section still exists under its new name.

The FK column is the authoritative source; the name is a display fallback for deleted sections (where the FK is SET NULL by CASCADE). Code that reads `section_name` for live sections (where `recipe_section_id IS NOT NULL`) is reading stale data.

**Why it happens:**
The same problem exists for `detachment_name` on `army_lists` (confirmed in Key Decisions), but that pattern is intentionally read-only after sync — detachments don't get renamed by users. Recipe sections DO get renamed. The denormalization pattern was correct for the DELETE-all save (no stable FK existed), but becomes a maintenance hazard once a stable FK is added.

**How to avoid:**
- After adding `recipe_section_id FK`, update `updateRecipeSection` (or a wrapper) to also update `painting_sessions.section_name` for all sessions referencing that `section_id`. A single UPDATE: `UPDATE painting_sessions SET section_name = $1 WHERE recipe_section_id = $2`.
- In read queries for sessions: JOIN on `recipe_sections.name` when `recipe_section_id IS NOT NULL`, fall back to `section_name` only when `recipe_section_id IS NULL` (section was deleted). Document this read pattern in a comment.
- Never use `section_name` as the primary display value when `recipe_section_id` is available and the section still exists.

**Warning signs:**
- Session log shows old section name after a section rename.
- `getSessionsByUnit` query reads `section_name` directly without a JOIN to `recipe_sections`.
- `updateRecipeSection` only updates `recipe_sections` rows, not the denormalized copies in `painting_sessions`.

**Phase to address:** REC-04. The migration adding `recipe_section_id` and the `updateRecipeSection` name-propagation update must land in the same wave.

---

### 5. Section-Aware Step Ordering: Recipe-Level Query Returns Steps From Correct Sections in Wrong Order

**What goes wrong:**
`getRecipePaintsByRecipe` in `recipePaints.ts` (line 7) orders by `order_index ASC` only. Within a recipe, step `order_index` values are set per-section by the form (each section's steps start from 0). Two steps in different sections can have the same `order_index`. The result: `ORDER BY order_index ASC` on a multi-section recipe returns steps interleaved — section B step 0 before section A step 1 — because the order is computed flat across all sections.

The `SectionedTimeline` component avoids this because it reads sections and steps separately (one query per section effectively). But `duplicateRecipe` in `recipes.ts` (line 168) uses `getRecipePaintsByRecipe`-style ordering (`ORDER BY order_index ASC` alone) and would duplicate steps in the wrong section-interleaved order if steps were fetched globally for duplication.

Applied recipe progress calculations will have the same issue: `computeCompletionPercentage` takes a list of steps and checks `order_index` for matching. If steps arrive in the wrong order, progress mapped by index position is misattributed.

**Why it happens:**
When recipes had no sections, global `order_index` was unique and monotonically increasing per recipe. After section support was added (migration 018), `order_index` became per-section. The old queries were not updated because the `SectionedTimeline` component already worked around them. The flat queries still "work" for display (steps appear in some order) but produce incorrect orderings for programmatic uses.

**How to avoid:**
- REC-05 must update `getRecipePaintsByRecipe` (and the `duplicateRecipe` step fetch) to `ORDER BY section.order_index ASC, step.order_index ASC` via a JOIN: `SELECT rs.* FROM recipe_steps rs LEFT JOIN recipe_sections sec ON sec.id = rs.section_id WHERE rs.recipe_id = $1 ORDER BY sec.order_index ASC, rs.order_index ASC`.
- The LEFT JOIN handles steps with `section_id IS NULL` (legacy flat recipes) gracefully — NULL sorts last in SQLite's default collation, preserving backward compat.
- TST-01 must include a test with a 2-section recipe and assert the returned step order is section-0 steps first, then section-1 steps.

**Warning signs:**
- Steps from section B appear between steps of section A in the `SectionedTimeline` after duplication (the copy has reordered steps).
- `computeCompletionPercentage` returns wrong percentages for multi-section recipes.
- `getRecipePaintsByRecipe` SQL has `ORDER BY order_index ASC` with no JOIN to `recipe_sections`.

**Phase to address:** REC-05. Must be fixed before Phase 62 (Applied Recipe Data Layer) consumes step ordering for progress tracking.

---

### 6. Paintless Step Silently Excluded From All Recipe Operations

**What goes wrong:**
`getRecipePaintsByRecipe` uses `SELECT * FROM recipe_steps WHERE recipe_id = $1` — this is fine. But `getRecipeSwatchColors` (line 73) does `JOIN paints p ON p.id = rp.paint_id` (not LEFT JOIN). Steps with `paint_id IS NULL` are excluded from the swatch. This is documented as intentional for swatches.

The undocumented problem: `getRecipePaintAvailability` (line 128) also uses `JOIN paints p` (not LEFT JOIN) with a `WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0` guard. Steps without paint are excluded from availability counts. If a recipe has 5 steps where 2 are paintless technique steps, the availability count shows "3/3 owned" rather than "3/5 steps have paints, 3 owned." The recipe appears 100% paint-ready when two steps still require execution (just no paint).

Additionally, the `RecipeFormSheet.tsx` save path (lines 292–309) skips steps with `paint_id === null`: `if (s.paint_id !== null)`. Paintless steps are silently dropped on every save and never persisted.

**Why it happens:**
The original recipe model was built around paint linkage — every step was a paint application step. Paintless steps (dry brushing with no specific paint, physical assembly steps) were not in scope. The form's conditional insert was a quick fix to avoid FK violations with null paint_id. But as the data model matured, this left a category of legitimate workflow steps unrepresented.

**How to avoid:**
- REC-01 must remove the `if (s.paint_id !== null)` guard in the save path, allowing steps with null paint_id to be inserted.
- The `recipe_steps` table already allows `paint_id` to be NULL (the FK column is nullable). No schema migration is needed — just a query-layer fix.
- `getRecipePaintAvailability` must document in a comment that it counts only paint-linked steps by design, and the count represents "paints available" not "steps covered."
- The availability badge in the UI must label itself accurately: "N paints available" not "N steps ready."

**Warning signs:**
- A paintless step is added to a recipe in the form, the form is saved, the recipe is reopened — the step is gone.
- `getStepCountsByRecipe` shows a lower step count than the user sees in the form editor.
- The availability badge shows "all owned" on a recipe that has unmixed / unspecified technique steps.

**Phase to address:** REC-01. The form save guard removal is a one-line change; the availability label fix is a UI-layer correction.

---

### 7. Version Hygiene Mismatch Causing Stale Version Displays and Build Confusion

**What goes wrong:**
`package.json` and `tauri.conf.json` can drift independently. `tauri.conf.json` is the authoritative source for the app's display version (shown in the OS title bar and About panel). `package.json` drives `npm` / `pnpm` version tooling. When they differ, `pnpm version` commands bump `package.json` but leave `tauri.conf.json` untouched. The OS shows the old version. Any CI or build script that reads `package.json` for the release tag produces a mismatched artifact.

Current state per PROJECT.md: VER-01 is an open requirement. The installed app shows v0.2.6 (from `tauri.conf.json`) while the codebase is at v0.2.11 level.

**Why it happens:**
Two canonical sources for one logical value is always a maintenance hazard. Tauri's tooling does not auto-sync them. The workflow "bump package.json, forget tauri.conf.json" (or vice versa) is the natural path of least resistance.

**How to avoid:**
- VER-01: align both files to the current release version in a single commit.
- Document the update procedure in a comment in `tauri.conf.json`: `// version must match package.json — bump both together`.
- A TST-01 test can read both files and assert they have identical `version` strings.

**Warning signs:**
- `tauri.conf.json` `"version"` field differs from `package.json` `"version"` field.
- The Tauri window title or About dialog shows a version number from a prior milestone.

**Phase to address:** VER-01. Trivial fix; do it in the same wave as migration registration verification to consolidate foundation fixes.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| DELETE-all + re-INSERT for recipe saves | No diff algorithm; clean ordering; no orphan risk for the recipe itself | Every save destroys step and section PKs; any downstream FK (progress, session links) breaks or must be denormalized | Never acceptable once `unit_recipe_step_progress` is in production — all progress is wiped on every recipe edit |
| `COALESCE($N, field)` for nullable metadata fields | Enables partial-update callers to omit fields they don't change | Null (intentional clear) is indistinguishable from null (caller didn't provide value) — the field can never be cleared | Acceptable only for fields where null is not a valid domain value (e.g., a required name field) |
| Denormalized `section_name TEXT` on sessions | Survives FK destruction from DELETE-all saves; no JOIN needed for display | Drifts out of sync when section is renamed; requires propagation logic when stable FK is added | Acceptable as a read-only display fallback for deleted sections; not acceptable as the primary value when the FK is live |
| `ORDER BY order_index ASC` without section JOIN | Simple; worked when order_index was globally unique per recipe | Returns steps in undefined interleaved order for multi-section recipes; breaks progress calculations | Never acceptable after migration 018 (recipe_sections) — all recipe-level step queries must include section ordering |
| Skip paintless steps on form save | Avoids FK violation on `paint_id NOT NULL` (before the column was nullable) | Steps with no paint are silently dropped; recipe step count drifts; paintless workflow steps are unrepresentable | Never acceptable — the FK column is already nullable; the guard has been unnecessary since migration 012 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `tauri-plugin-sql` migrations | Registering migrations out of version order (version: 3 before version: 2 in the vec) | The vec must be in ascending version order; `tauri-plugin-sql` applies them in vec order, not by the `version` field |
| `tauri-plugin-sql` migrations | Editing an already-applied migration file | `tauri-plugin-sql` applies each version only once (tracked in `_sqlx_migrations`); editing an applied file has no effect on existing DBs; create a new migration file for any schema change |
| `include_str!()` in lib.rs | Registering the wrong filename string | `include_str!()` resolves at compile time relative to the file; a typo compiles silently only if the referenced path exists but has wrong content |
| `ON DELETE CASCADE` with non-destructive saves | Assuming CASCADE still fires when using UPDATE-in-place | CASCADE only fires on DELETE; UPDATE-in-place that changes `section_id` on a step does NOT trigger cascade cleanup on the old parent section |
| React Query invalidation after non-destructive save | Invalidating only the recipe key, not the sections/steps key | Non-destructive save must still invalidate `RECIPE_SECTIONS_KEY(id)`, `RECIPE_PAINTS_KEY(id)`, and progress keys if assignments exist |
| SQLite `NULL` in COALESCE | Passing TypeScript `undefined` instead of `null` to a parameterized query | `tauri-plugin-sql` serializes `undefined` differently from `null`; always pass explicit `null` for empty optional fields |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Non-transactional multi-step save (DELETE sections → INSERT sections → INSERT steps) | Partial recipe state on window close mid-save; step photo paths orphaned | Wrap in explicit `BEGIN / COMMIT` if `tauri-plugin-sql` exposes it; otherwise accept the risk for a personal desktop tool | Any save interrupted mid-way; low frequency but real on a slow disk |
| Section metadata rename propagation: UPDATE painting_sessions per renamed section | Fires one UPDATE per section rename; acceptable for 1–10 sections | Use batch UPDATE with `WHERE recipe_section_id = $1` — single SQL statement regardless of session count | Not a performance issue at current data scale; document as O(sessions) but constant factor is tiny |
| `getRecipePaintsByRecipe` without section JOIN | No performance impact today; the query returns all steps | After adding `ORDER BY sec.order_index, rs.order_index`, the LEFT JOIN adds one indexed scan | Never degrades below current performance — section index is small |

---

## "Looks Done But Isn't" Checklist

- [ ] **MIG-01 verification:** Count of `NNN_*.sql` files (non-rules) matches count of `get_migrations()` entries in `lib.rs` — not just "latest migration file exists"
- [ ] **REC-01 paintless steps:** A step with `paint_id: null` saved in the form is retrievable on next open — not silently dropped
- [ ] **REC-02 non-destructive save:** Section and step DB IDs are unchanged after a save that modifies only the recipe name — confirmed by comparing IDs before and after
- [ ] **REC-02 orphan cleanup:** Sections removed in the form editor are actually DELETEd from DB, not just absent from the INSERT pass
- [ ] **REC-03 null clearing:** Setting `section_type` to null in the form and saving results in `section_type IS NULL` in DB — confirmed by opening the recipe again and seeing an empty dropdown
- [ ] **REC-04 FK column:** `painting_sessions` has a `recipe_section_id` column AND a `section_name` column — both written on session create
- [ ] **REC-04 name propagation:** Renaming a section updates `painting_sessions.section_name` for all existing sessions linked to that section
- [ ] **REC-05 section ordering:** `getRecipePaintsByRecipe` returns steps ordered by `section.order_index ASC, step.order_index ASC` — not just `step.order_index ASC`
- [ ] **VER-01:** `package.json` `"version"` and `tauri.conf.json` `"version"` are identical strings
- [ ] **Fresh install:** Launching the app with an empty `app_data_dir` succeeds — all tables and columns expected by current query modules are present
- [ ] **TST-01 migration parity:** A test exists that reads the migrations directory and asserts file count matches `get_migrations()` length

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Unregistered migration on fresh install | MEDIUM | Add migration entry to `lib.rs`, rebuild Tauri, re-distribute; existing users unaffected (they have the table already from a prior run when a workaround existed or the dev DB was pre-seeded) |
| DELETE-all save wiped `unit_recipe_step_progress` | HIGH | No recovery without a backup; the progress data is gone; users must re-mark completed steps; prevention is the only real answer |
| COALESCE blocked a null clear | LOW | Fix the SQL to direct assignment; no data migration needed; fields that were "stuck" can now be cleared normally |
| `section_name` drifted from renamed section | LOW | One-time UPDATE: `UPDATE painting_sessions SET section_name = (SELECT name FROM recipe_sections WHERE id = painting_sessions.recipe_section_id) WHERE recipe_section_id IS NOT NULL` |
| Steps returned in wrong order for multi-section recipes | LOW | SQL fix only; existing data is correct, only the query order was wrong |
| Version mismatch visible to user | LOW | Update the lagging file to match; rebuild and re-run |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 Migration registration gap | MIG-01 | TST-01 migration-parity test passes; fresh launch from empty app_data_dir succeeds with no "no such table" errors |
| #2 Non-destructive save partial writes | REC-02 | Round-trip test: save recipe without changes, assert section/step IDs unchanged; save with one step removed, assert that step is deleted from DB |
| #3 COALESCE blocking null clear | REC-03 | Unit test: set section_type, then updateRecipeSection with section_type: null, assert DB row has NULL |
| #4 Section name drift after rename | REC-04 | Test: rename section, assert painting_sessions.section_name updated for linked sessions |
| #5 Section-aware step ordering | REC-05 | Test: 2-section recipe, assert getRecipePaintsByRecipe returns section-0 steps before section-1 steps |
| #6 Paintless step dropped on save | REC-01 | Test: create step with paint_id: null, save, reload, assert step exists in DB |
| #7 Version mismatch | VER-01 | Automated check: read both files, assert version strings are equal |

---

## Sources

- `src-tauri/src/lib.rs` — `get_migrations()` vec (versions 1–21 confirmed registered); `include_str!()` compile-time path resolution
- `src-tauri/migrations/018_recipe_sections.sql` — DELETE-all + re-INSERT pattern documentation; CASCADE chain
- `src-tauri/migrations/020_workflow_metadata.sql` — workflow metadata columns (section_type, technique, execution_mode, applies_to); section_name on painting_sessions
- `src/db/queries/recipeSections.ts` — COALESCE on section metadata fields (the bug); direct assignment on surface/notes (the correct pattern); confirmed at lines 54–77
- `src/db/queries/recipePaints.ts` — `ORDER BY order_index ASC` without section JOIN (lines 7–9); JOIN (not LEFT JOIN) on paints for availability (line 128); swatch exclusion of paintless steps
- `src/db/queries/recipes.ts` — `ORDER BY order_index ASC` in duplicateRecipe step fetch (line 168); COALESCE for required fields, direct assignment for nullable fields (lines 44–82 — the correct model)
- `src/db/queries/paintingSessions.ts` — `section_name TEXT` denormalized column on insert (line 22); absence of `recipe_section_id` FK column
- `src/features/recipes/RecipeFormSheet.tsx` — DELETE-all save path (lines 234–240); paintless step guard (line 292); `if (s.paint_id !== null)` silently drops steps
- `.planning/PROJECT.md` — Key Decisions table (COALESCE for recipe metadata; raw assignment for nullable fields; ON DELETE SET NULL for session-recipe FKs; denormalized section_name rationale); v0.2.11 active requirements (MIG-01, MIG-02, REC-01 through REC-05, VER-01, TST-01)

---
*Pitfalls research for: v0.2.11 Foundation Hardening — migration registration, recipe data integrity, non-destructive saves, stable FK references, section-aware ordering*
*Researched: 2026-05-13*
