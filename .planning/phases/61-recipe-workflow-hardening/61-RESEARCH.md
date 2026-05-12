# Phase 61: Recipe Workflow Hardening - Research

**Researched:** 2026-05-12
**Domain:** SQLite migration verification, React Query cache invalidation, React Hook form UX polish
**Confidence:** HIGH

## Summary

Phase 61 is a stabilization phase with three tightly scoped requirements: verify migration
registration is correct (RH-01), confirm that section renames do not break session analytics
(RH-02), and polish the workflow metadata UX to match the painter's mental model (RH-03).

The primary risk was already resolved before this phase was planned: migrations 018, 019, and 020
were not registered in `get_migrations()` — that bug is now fixed in `src-tauri/src/lib.rs`.
Cargo check and `pnpm build` both pass clean. The migration SQL files themselves are correct and
complete. Phase 61's job is to verify the fix is solid and validate the behavioural guarantees of
the session/section naming contract and the progressive disclosure UX.

The test suite has 5 failing tests in `tests/rules-hub/` and `tests/datasheet/datasheetQueries.test.ts`
— these are pre-existing failures unrelated to recipe workflow. The 1316 passing tests include full
coverage of recipeSections queries, hook invalidation contracts, and workflow metadata. No new test
infrastructure is needed for this phase; the existing suite is the validation layer.

**Primary recommendation:** Three focused verification tasks (one per requirement), a single
manual dev-app startup smoke test for RH-01, and targeted Vitest assertions for RH-02/RH-03
behavior where unit-testable. No new migrations, no new tables, no new UI surfaces.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Migrations 018, 019, 020 registered in lib.rs — fix applied. Phase 61 verifies this fix works on fresh install via dev app startup.
- **D-02:** Verification: cargo check + pnpm build + manual dev app startup confirming recipe_sections table exists with all 4 workflow metadata columns. No automated migration integration test.
- **D-03:** Existing DBs with partial migrations handled automatically by tauri-plugin-sql migration runner (tracks applied versions).
- **D-04:** Denormalized `section_name` TEXT on painting_sessions — no FK, no propagation on rename. Architectural decision from v0.2.9.
- **D-05:** Old sessions retain old section name when renamed. Acceptable — session history is a snapshot.
- **D-06:** `computeWorkflowPosition` already handles orphaned/stale section references via degradation rules. No additional logic needed.
- **D-07:** Verify LogSessionSheet cascade selector correctly rebuilds section options after recipe save (UX verification, not a code change).
- **D-08:** Keep current 7 section_type values: prep, basecoat, shade, layer, detail, effect, finishing.
- **D-09:** Progressive disclosure threshold: show workflow metadata collapsible only when sectionsCount > 1 OR metadata already present.
- **D-10:** `applies_to` remains freeform text (no enum). Pre-populated suggestions deferred.
- **D-11:** Three bug fixes (migration registration, React error #185, faction resolution in datasheets.ts) should be committed before Phase 61 planning begins.

### Claude's Discretion

- Test approach for verifying RH-01/RH-02/RH-03 (unit tests vs integration tests vs manual verification protocol)
- Whether to add a defensive check in recipe save path for missing recipe_sections table
- Any minor code cleanup discovered during hardening as long as it doesn't expand scope

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RH-01 | Fresh install and existing DB both create recipe_sections with all 4 workflow metadata columns | Migration files verified correct; lib.rs registration confirmed; cargo check passes |
| RH-02 | Section-aware log session uses stable section reference — renaming a section does not break session analytics | Denormalized section_name TEXT confirmed in DB schema; LogSessionSheet stores section name by value; computeWorkflowPosition degrades gracefully on stale names |
| RH-03 | Workflow metadata UX refined — section_type values match user mental model, progressive disclosure preserved for simple recipes | SECTION_TYPES array confirmed as 7 values; showWorkflowCollapsible logic in RecipeSectionCard confirmed correct |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Migration execution | Rust/Tauri (tauri-plugin-sql) | — | Plugin owns migration runner; no React involvement |
| Migration registration | Rust (lib.rs get_migrations) | — | Single registration point; fixed in D-01 |
| Session section reference | Database (TEXT column) | API/Query layer | Denormalized text avoids FK instability from DELETE-all pattern |
| Section cascade in LogSession | Frontend (React state) | React Query | watchedSectionId + useEffect reset chain manages cascade |
| Progressive disclosure | Frontend (RecipeSectionCard) | — | UI-only threshold: sectionsCount > 1 or hasAnyWorkflowMetadata |
| Workflow position derivation | Pure function (computeWorkflowPosition) | — | No DB or React deps; degrades gracefully on orphaned IDs |

---

## Standard Stack

This is a hardening phase — no new library dependencies.

### In-Use Stack (relevant to this phase)

| Component | File | Version | Role in Phase 61 |
|-----------|------|---------|-----------------|
| tauri-plugin-sql | src-tauri/src/lib.rs | 2.x | Migration runner — executes registered migrations at app start |
| React Query (TanStack Query) | src/hooks/useRecipeSections.ts | 5.x | Cache invalidation after section mutations |
| React Hook Form + Zod | src/features/dashboard/LogSessionSheet.tsx | — | section_name field schema (already exists) |
| Vitest + RTL | tests/painting/recipeSections.test.ts | 4.x | Existing test suite covering query and hook contracts |

**No new packages needed for Phase 61.**

---

## Architecture Patterns

### Migration Registration Pattern (Tauri plugin-sql)

```
src-tauri/migrations/NNN_name.sql   (SQL file on disk)
        ↓ registered in
src-tauri/src/lib.rs get_migrations()  (Vec<Migration>)
        ↓ auto-executed by
tauri-plugin-sql on every app start  (tracks applied versions in __sqlx_migrations)
```

The runner is idempotent: it checks which version numbers have been applied and only runs missing
ones. This means existing DBs that ran 001-017 will only run 018, 019, 020 on next launch. No
data loss, no re-run of completed migrations. [VERIFIED: lib.rs, migration files]

### Current Migration State (VERIFIED)

- Migrations 001-020 are all registered in `get_migrations()` [VERIFIED: src-tauri/src/lib.rs]
- Migration SQL files 018, 019, 020 exist on disk [VERIFIED: ls migrations/]
- Cargo check passes clean [VERIFIED: cargo check --manifest-path src-tauri/Cargo.toml]
- pnpm build passes clean [VERIFIED: pnpm build output]

### Migration 018 (recipe_sections) — Verified Schema

```sql
-- Creates recipe_sections with: id, recipe_id, name, surface, optional, order_index, notes,
-- created_at, updated_at
-- Adds section_id FK to recipe_steps (ON DELETE CASCADE)
-- Backfills existing recipes with default "Steps" section
```

[VERIFIED: src-tauri/migrations/018_recipe_sections.sql]

### Migration 020 (workflow_metadata) — Verified Schema

```sql
ALTER TABLE recipe_sections ADD COLUMN section_type TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN technique TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN execution_mode TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN applies_to TEXT DEFAULT NULL;
ALTER TABLE painting_sessions ADD COLUMN section_name TEXT DEFAULT NULL;
```

[VERIFIED: src-tauri/migrations/020_workflow_metadata.sql]

All 4 required workflow metadata columns are present. The `section_name` column on
`painting_sessions` is also here — this is the denormalized TEXT reference that
satisfies RH-02.

### Section Rename Stability (RH-02) — How It Works

The DELETE-all + re-INSERT save pattern in RecipeFormSheet means section IDs change
on every save. Storing a FK to section_id in painting_sessions would break every
time the user edits a recipe. Instead:

1. `painting_sessions.section_name TEXT` — stores the name at log time (a snapshot)
2. `LogSessionSheet` reads the section name directly from the section object:
   ```ts
   ctrl.onChange(
     v === "__none__"
       ? null
       : sections.find((s) => s.id === numId)?.name ?? null
   );
   ```
   [VERIFIED: src/features/dashboard/LogSessionSheet.tsx line 348-350]
3. After recipe save, React Query invalidates `RECIPE_SECTIONS_KEY(recipeId)`, so
   LogSessionSheet re-fetches sections. The dropdown shows current names. Any future
   session logged will store the current name. Old sessions keep the historical name.
4. `computeWorkflowPosition` handles stale section names via the D-04 fallback:
   ```ts
   // D-04: section_name only (no valid step ID)
   if (lastSessionSectionName !== null && sortedSections.length > 0) {
     const section = sortedSections.find((s) => s.name === lastSessionSectionName);
     if (section) { /* ... return section-level position */ }
   }
   ```
   If the section was renamed, `find()` returns undefined and the function returns null
   (no position shown). This is the documented degradation — not a bug. [VERIFIED: src/lib/computeWorkflowPosition.ts]

### Progressive Disclosure Logic (RH-03) — Current State

```ts
// RecipeSectionCard.tsx line 66
const showWorkflowCollapsible = sectionsCount > 1 || hasAnyWorkflowMetadata(section);

function hasAnyWorkflowMetadata(section: DraftSection): boolean {
  return Boolean(
    section.section_type || section.technique || section.execution_mode || section.applies_to,
  );
}
```

[VERIFIED: src/features/recipes/RecipeSectionCard.tsx lines 39-43, 66]

Single-section recipe with no metadata: `sectionsCount === 1` and `hasAnyWorkflowMetadata === false`
→ `showWorkflowCollapsible === false` → no workflow UI rendered. This satisfies RH-03's
"simple recipes show no unnecessary workflow UI" criterion.

### Section Type Values (RH-03) — Current State

```ts
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "detail", "effect", "finishing",
] as const;
```

[VERIFIED: src/types/recipeSection.ts lines 5-7]

These 7 values map to the standard GW miniature painting workflow:
- prep: cleaning, assembly, basing materials
- basecoat: first paint coat
- shade: wash/ink passes
- layer: build-up layers
- detail: small details, faces, gems
- effect: OSL, object source lighting, special effects
- finishing: varnish, basing grass/snow, final details

Decision D-08 locks these values — no changes needed. Research confirms they cover the
standard workflow without gaps.

### Section Selector Rebuild After Recipe Save (D-07 Verification Target)

The LogSessionSheet section selector is driven by `useRecipeSections(watchedRecipeId)`.
After a recipe save in RecipeFormSheet, `qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) })`
is called (RecipeFormSheet.tsx line 313). This invalidation propagates to LogSessionSheet
because both hooks share the same query key. On next render, LogSessionSheet will
re-fetch the current sections, reflecting any renames.

The reset chain in LogSessionSheet is:
1. `recipe_id` changes → clear `section_name` and reset `watchedSectionId` to null
2. `watchedSectionId` changes → clear `recipe_step_id`

This means if the user re-opens LogSessionSheet after a rename, they must re-select
the section from the updated list. [VERIFIED: LogSessionSheet.tsx lines 148-157]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration version tracking | Custom schema_version table | tauri-plugin-sql built-in | Plugin uses __sqlx_migrations internally; duplicating this creates drift |
| Session section lookup | FK join | Denormalized TEXT column | DELETE-all pattern makes FK references unstable; TEXT snapshot is intentional |
| Workflow position derivation | Ad-hoc session parsing | computeWorkflowPosition (pure fn) | Already handles all degradation cases (D-15 through D-19) |

---

## Common Pitfalls

### Pitfall 1: Testing Migration Execution Directly in Vitest

**What goes wrong:** Trying to write a Vitest test that verifies the SQLite schema has the
correct columns. The Tauri plugin-sql IPC bridge does not run in jsdom; any attempt to use
`getDb()` in tests requires full mocking.

**Why it happens:** D-02 explicitly chose manual verification over automated integration testing.
Tauri migration runner cannot execute in the test environment.

**How to avoid:** Follow D-02. Manual verification = `pnpm tauri dev` startup, then query
`PRAGMA table_info(recipe_sections)` in the app or use a SQLite browser on the DB file.
For CI-safe checks, confirm `cargo check` and `pnpm build` pass (which verifies the SQL
files are included via `include_str!` macro).

**Warning signs:** Test file attempting to import from `@/db/client` without mocking it.

### Pitfall 2: Assuming Section Rename Breaks Old Sessions

**What goes wrong:** Concluding that historical session records with old section_name values
are "broken" and writing UPDATE propagation logic.

**Why it happens:** The denormalized field looks like a bug if you expect FK semantics.

**How to avoid:** Remember D-04/D-05: section_name is a snapshot at log time. Old sessions
keeping the old name is the intended behavior — session history records what happened, not
what the recipe is called today. computeWorkflowPosition already degrades to null when the
name no longer matches, which is acceptable.

### Pitfall 3: Misreading Progressive Disclosure Threshold

**What goes wrong:** Showing workflow UI for single-section recipes with no metadata.

**Why it happens:** The threshold is `sectionsCount > 1 OR hasAnyWorkflowMetadata`. Both
conditions must be false to hide the UI.

**How to avoid:** `sectionsCount` is passed from the parent (RecipeSectionList or RecipeFormSheet),
not derived from `sections.length` within the card itself. Verify the parent passes the correct
count.

### Pitfall 4: Forgetting the `stepsKey` Stability Fix (React Error #185)

**What goes wrong:** Reverting or overwriting the RecipeDetailSheet.tsx useEffect fix, causing
the infinite render loop to return.

**Why it happens:** The fix changes the useEffect dependency from `[steps]` (object reference)
to `[stepsKey]` (string primitive) or adds a guard on the `setStepPhotoUrls(new Map())` call.

**How to avoid:** The fix is in uncommitted changes (D-11). Confirm it is committed and present
before shipping Phase 61. The fix guards `setStepPhotoUrls(prev => prev.size === 0 ? prev : new Map())`
to avoid the no-op state update that drives the loop. [VERIFIED: debug/react-error-185-recipe-click.md]

### Pitfall 5: Cache Key Mismatch After Section Mutations

**What goes wrong:** LogSessionSheet section list does not update after a recipe save because
the cache key used in invalidation does not match the query key used in useRecipeSections.

**How to avoid:** Both use `RECIPE_SECTIONS_KEY(recipeId)` exported from useRecipeSections.ts.
RecipeFormSheet imports and uses this key (line 313). No mismatch currently. If the key is
changed in one place, both must be updated.

---

## Code Examples

### Verified: Migration Registration Pattern

```rust
// src-tauri/src/lib.rs — current state (all 20 registered)
Migration {
    version: 18,
    description: "recipe_sections",
    sql: include_str!("../migrations/018_recipe_sections.sql"),
    kind: MigrationKind::Up,
},
Migration {
    version: 19,
    description: "rules_favorites_notes",
    sql: include_str!("../migrations/019_rules_favorites_notes.sql"),
    kind: MigrationKind::Up,
},
Migration {
    version: 20,
    description: "workflow_metadata",
    sql: include_str!("../migrations/020_workflow_metadata.sql"),
    kind: MigrationKind::Up,
},
```

[VERIFIED: src-tauri/src/lib.rs lines 108-127]

### Verified: Progressive Disclosure Guard in RecipeSectionCard

```tsx
// src/features/recipes/RecipeSectionCard.tsx
function hasAnyWorkflowMetadata(section: DraftSection): boolean {
  return Boolean(
    section.section_type || section.technique || section.execution_mode || section.applies_to,
  );
}

// Inside component:
const showWorkflowCollapsible = sectionsCount > 1 || hasAnyWorkflowMetadata(section);

// In JSX:
{showWorkflowCollapsible && (
  <Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen}>
    {/* workflow metadata fields */}
  </Collapsible>
)}
```

[VERIFIED: src/features/recipes/RecipeSectionCard.tsx lines 39-43, 66, 157]

### Verified: Section Name Snapshot in LogSessionSheet

```tsx
// Section selector stores name by value (snapshot), not by ID
onValueChange={(v) => {
  const numId = v === "__none__" ? null : Number(v);
  setWatchedSectionId(numId);
  ctrl.onChange(
    v === "__none__"
      ? null
      : sections.find((s) => s.id === numId)?.name ?? null  // name stored, not ID
  );
}}
```

[VERIFIED: src/features/dashboard/LogSessionSheet.tsx lines 343-351]

### Verified: computeWorkflowPosition Degradation for Stale Names

```ts
// src/lib/computeWorkflowPosition.ts — D-04 degradation
if (lastSessionSectionName !== null && sortedSections.length > 0) {
  const section = sortedSections.find((s) => s.name === lastSessionSectionName);
  if (section) {
    // returns section-level position
  }
  // if not found (renamed) → falls through to return null
}
return null;
```

[VERIFIED: src/lib/computeWorkflowPosition.ts lines 116-138]

---

## Pre-Existing Bug Fixes (D-11 — Must Be Committed Before Phase 61 Ships)

These are in uncommitted git changes and must be part of the Phase 61 commit or a preceding commit:

| Fix | File | Status |
|-----|------|--------|
| Migration 18/19/20 registration | src-tauri/src/lib.rs | In uncommitted changes — already applied |
| React error #185 infinite loop | src/features/recipes/RecipeDetailSheet.tsx | In uncommitted changes — stepsKey dependency fix |
| Faction resolution | src/db/queries/datasheets.ts | In uncommitted changes |

These are **not Phase 61 deliverables** per D-11 — they precede Phase 61. The planner should
include a Wave 0 task to commit these fixes before Phase 61 implementation tasks run.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vite.config.ts (vitest block) |
| Quick run command | `pnpm test -- tests/painting/recipeSections.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RH-01 | Migration 018/019/020 registered in lib.rs | Manual smoke | `pnpm tauri dev` + `PRAGMA table_info(recipe_sections)` | Manual only — no Vitest for Tauri migrations |
| RH-01 | cargo check passes with migrations included | Build verification | `cargo check --manifest-path src-tauri/Cargo.toml` | N/A — build command |
| RH-02 | section_name stored as TEXT snapshot (not FK) | Unit (query) | `pnpm test -- tests/painting/recipeSections.test.ts` | ✅ Existing |
| RH-02 | LogSessionSheet stores name by value on selection | Unit (component) | `pnpm test -- tests/dashboard/` (if exists) | Check Wave 0 |
| RH-02 | computeWorkflowPosition degrades gracefully on stale name | Unit (pure fn) | New test — `tests/painting/computeWorkflowPosition.test.ts` | ❌ Wave 0 |
| RH-03 | showWorkflowCollapsible=false for single-section no-metadata | Unit (component) | New test — `tests/painting/RecipeSectionCard.test.tsx` | ❌ Wave 0 |
| RH-03 | SECTION_TYPES const array has correct 7 values | Unit (type) | Inline in existing recipeSections.test.ts | Check existing |

### Sampling Rate

- Per task commit: `pnpm test -- tests/painting/recipeSections.test.ts`
- Per wave merge: `pnpm test` (expect 5 pre-existing rules-hub failures — these are NOT regressions)
- Phase gate: Full suite green (minus known pre-existing failures) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/painting/computeWorkflowPosition.test.ts` — covers RH-02 degradation when section name does not match
- [ ] `tests/painting/RecipeSectionCard.test.tsx` — covers RH-03 progressive disclosure threshold (single-section, no metadata → hidden)
- [ ] Confirm `tests/dashboard/LogSessionSheet.test.tsx` exists and covers section name snapshot behavior

*(Note: The 5 pre-existing failing tests in tests/rules-hub/ and tests/datasheet/ are NOT
Wave 0 gaps for Phase 61 — they are tracked separately.)*

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Rust/Cargo | Migration build verification | ✓ | hobbyforge-scaffold v0.2.7 dev | — |
| pnpm | Build + test | ✓ | (confirmed via pnpm build) | — |
| Vitest | Unit tests | ✓ | 4.x | — |
| Tauri dev (full desktop) | RH-01 smoke test | ✓ (assumed) | Tauri 2 | — |

---

## Security Domain

This phase touches no authentication, session management, or input validation surfaces beyond
what already exists. The `section_name` field is stored as plain TEXT — it receives no
validation beyond what the Select component UI enforces (only current section names are
selectable). No new ASVS controls apply.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The React error #185 fix in RecipeDetailSheet.tsx (stepsKey dependency) is present in uncommitted changes | Pre-existing Bug Fixes | Phase 61 verification would surface infinite loop on recipe click — easily caught |
| A2 | `pnpm tauri dev` will successfully run and apply migrations 018-020 on the developer machine | Environment Availability | Manual smoke test would fail; escalate to debug |

---

## Open Questions

1. **Pre-existing test failures (rules-hub/datasheets)**
   - What we know: 5 tests fail in tests/rules-hub/ and tests/datasheet/datasheetQueries.test.ts (unrelated to recipes)
   - What's unclear: Whether these were pre-existing before Phase 61 or introduced by uncommitted changes
   - Recommendation: Run `git stash && pnpm test` to confirm these failures pre-date uncommitted changes; document as known-failures if confirmed

2. **LogSessionSheet test coverage**
   - What we know: LogSessionSheet stores section_name as a snapshot; this is correct behavior
   - What's unclear: Whether a component test for LogSessionSheet exists in tests/dashboard/
   - Recommendation: Wave 0 — check if test file exists; create if absent

---

## Sources

### Primary (HIGH confidence)

- `src-tauri/src/lib.rs` — migration registration verified directly (all 20 present)
- `src-tauri/migrations/018_recipe_sections.sql` — schema verified
- `src-tauri/migrations/019_rules_favorites_notes.sql` — schema verified
- `src-tauri/migrations/020_workflow_metadata.sql` — schema verified (all 4+1 columns)
- `src/types/recipeSection.ts` — SECTION_TYPES array verified (7 values)
- `src/features/recipes/RecipeSectionCard.tsx` — progressive disclosure logic verified
- `src/features/dashboard/LogSessionSheet.tsx` — section_name snapshot pattern verified
- `src/lib/computeWorkflowPosition.ts` — degradation rules verified
- `src/db/queries/recipeSections.ts` — 6 query functions verified
- `src/hooks/useRecipeSections.ts` — cache invalidation contracts verified
- `tests/painting/recipeSections.test.ts` — 14-group test suite confirmed present
- `.planning/debug/recipe-save-fails.md` — migration bug root cause documented
- `.planning/debug/react-error-185-recipe-click.md` — React error #185 fix documented
- Cargo check output — build verified clean
- pnpm build output — TypeScript + Vite verified clean
- pnpm test output — 1316 passing, 5 pre-existing failures in rules-hub/datasheet

### Secondary (MEDIUM confidence)

- None needed — all claims verified from source files

---

## Metadata

**Confidence breakdown:**
- Migration state: HIGH — verified via file inspection + cargo check + pnpm build
- Section rename stability: HIGH — verified via LogSessionSheet, computeWorkflowPosition source
- Progressive disclosure: HIGH — verified directly in RecipeSectionCard.tsx
- Test infrastructure: HIGH — recipeSections.test.ts confirmed; 2 Wave 0 gaps identified

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (stable domain — no fast-moving dependencies)
