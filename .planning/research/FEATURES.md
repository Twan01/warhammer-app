# Feature Research

**Domain:** SQLite desktop app foundation hardening (Tauri 2 + React 19 + TypeScript)
**Researched:** 2026-05-13
**Milestone:** v0.2.11 Foundation Hardening
**Confidence:** HIGH — all findings drawn directly from codebase inspection of ~290 source files; no ecosystem guessing required for an internal hardening milestone

---

## Context for This Hardening Milestone

v0.2.11 is not a user-facing feature release. The value proposition for each item is
correctness and future-feature enablement, not UX novelty. Every item maps to a named
requirement in PROJECT.md (MIG-*, REC-*, VER-*, TST-*). The "users" of these features
are the developer and the codebase itself.

### What Is Already Built and Working (v0.2.9/v0.2.10 in progress)

| Component | Relevant State |
|-----------|---------------|
| `lib.rs` migration registration | Versions 1–21 registered as of v0.2.11 start; includes `021_applied_recipe_assignments` (Phase 62) |
| `recipe_sections` table | Shipped v0.2.7 (migration 018); workflow metadata columns added v0.2.9 (migration 020) |
| `recipe_steps.paint_id` | `NOT NULL REFERENCES paints(id)` from migration 001 — blocks paintless steps |
| `RecipeFormSheet.tsx` save | Delete-all sections + CASCADE-steps on every edit save (line 234); destroys step/section IDs |
| `updateRecipeSection` COALESCE | `section_type`, `technique`, `execution_mode`, `applies_to` use COALESCE — cannot be cleared to NULL |
| `painting_sessions` section link | `section_name TEXT` (migration 020) only; no FK to `recipe_sections.id` |
| `getRecipePaintsByRecipe` ordering | `ORDER BY order_index ASC` — global, not section-aware |
| Version strings | `tauri.conf.json` shows v0.2.6; `package.json` is the current value |
| Test coverage | 90+ tests; none cover migration registration completeness or non-destructive save contract |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features any correctly-functioning app must have. Missing these means the app is broken
for new installs or introduces silent data corruption.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Migration registration completeness (MIG-01)** | Fresh install is the primary install path; unregistered migrations mean tables never exist on a clean DB. lib.rs is confirmed complete (versions 1–21) as of v0.2.11 start — but formal verification is still required | LOW | Pattern: readFileSync on lib.rs and assert version 1–21 each present with matching `include_str!` path. Existing precedent: `tests/foundation/migration004.test.ts` |
| **Clean DB validation (MIG-02)** | Fresh app launch from an empty `app_data_dir` must succeed without JS errors, missing-table panics, or undefined reference crashes. Currently untested by any automated check | LOW | Smoke test: delete `hobbyforge.db`, relaunch, confirm all page loads return empty arrays not throws. Validates MIG-01 in a real runtime context |
| **Version number alignment (VER-01)** | `package.json` and `tauri.conf.json` must match; mismatch causes window title / about dialog to show wrong version. `tauri.conf.json` currently shows v0.2.6 | LOW | Pure text edit; zero logic change. No code dependencies |
| **Nullable metadata clearing (REC-03)** | `section_type`, `technique`, `execution_mode`, `applies_to` were designed as optional workflow metadata. Users set them, then decide a section is simpler than they thought and want to clear them. The current COALESCE on these four fields silently ignores null input — clearing is impossible | LOW | Fix: replace `COALESCE($7, section_type)` with `$7` (direct assignment) for the four workflow fields. `surface` and `notes` already use direct assignment in the same query — consistent pattern. Zero migration needed |
| **Paintless recipe step support (REC-01)** | Structured painting steps like "let dry 24h", "score surface", "prime with grey" have no paint but are valid workflow steps. The current `NOT NULL` constraint on `recipe_steps.paint_id` (migration 001) prevents creating them. Any recipe with technique-only steps is currently unbuildable | MEDIUM | Requires: (a) migration to make `paint_id` nullable (SQLite workaround: create-new-table, insert-select, drop, rename), (b) `addRecipePaint` to accept `paint_id: null`, (c) `getRecipeSwatchColors` JOIN → LEFT JOIN so paintless steps are included in step lists, (d) `getRecipePaintAvailability` already has `WHERE paint_id IS NOT NULL` — no change needed |

### Differentiators (Competitive Advantage)

Features that raise data integrity and developer confidence above "just works."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Non-destructive recipe edits — ID preservation (REC-02)** | Current `RecipeFormSheet.tsx` `onSubmit` deletes ALL sections (line 234) and CASCADE-deletes all steps on every edit save. This destroys: (a) `painting_sessions.recipe_step_id` FK links (ON DELETE SET NULL fires silently), (b) `unit_recipe_step_progress.order_index` references in applied recipe assignments (Phase 62), (c) any future FK pointing at a step or section ID. Preserving IDs is a prerequisite for applied recipes to function correctly | HIGH | Requires a three-way diff between form state and DB state. Form section state must carry an optional `dbId` field populated when editing an existing section. Algorithm: matched by dbId → UPDATE in place; absent from DB → INSERT; removed from form → DELETE. Step diff mirrors section diff. This is the highest-complexity item in the milestone |
| **Stable recipe_section_id on painting sessions (REC-04)** | Sessions store `section_name` (TEXT copy, migration 020) but no FK to `recipe_sections.id`. After a section rename or delete, the link is cosmetic text with no structural integrity. Adding `recipe_section_id INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL` gives the same FK-safe pattern already used for `recipe_step_id` (migration 014). The denormalized `section_name` stays as display fallback — same rationale as `detachment_name` on army lists | MEDIUM | New migration (022): `ALTER TABLE painting_sessions ADD COLUMN recipe_section_id INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL`. Update `createSession` to accept and persist it. Update `LogSessionSheet` cascading selector to populate it |
| **Section-aware step ordering (REC-05)** | `getRecipePaintsByRecipe` orders by global `order_index ASC`. Steps from section B with lower `order_index` values than section A steps will sort interleaved — sections appear jumbled in any caller that processes steps as a flat list. Correct order: section's `order_index` first, then step's `order_index` within section | LOW | Single query change. `LEFT JOIN recipe_sections rs ON rs.id = rsp.section_id`. `ORDER BY COALESCE(rs.order_index, 999) ASC, rsp.order_index ASC`. No migration needed |
| **Data-layer tests (TST-01)** | 90+ existing tests cover pure functions, hooks, and query shape — but none verify migration registration completeness, the REC-02 preserve-IDs contract, session-section FK column presence, or army list schema shape. These are exactly the bugs that slip through UI testing. Each of the above fixes needs a regression test to prevent future regressions | MEDIUM | Four test files, all using the `readFileSync` + regex pattern established by `tests/foundation/migration004.test.ts`: (a) migration registration completeness for versions 1–21, (b) recipe non-destructive save diff algorithm, (c) session section FK column presence in migration 022 SQL, (d) army list schema shape for detachment/section FK patterns |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full ORM migration (Prisma/Drizzle)** | Typed schema diffs, autocomplete on queries | Prisma is a confirmed dead-end for Tauri production (PROJECT.md). Drizzle adds proxy complexity. Neither provides schema-level safety that typed query functions don't already give. Mid-project ORM introduction creates migration path complexity for zero single-user benefit | Continue typed query functions; Drizzle is the documented v3 escape hatch only if raw queries become unmanageable |
| **Automatic migration repair at startup** | Self-healing database sounds robust | `tauri-plugin-sql` already tracks applied migrations via version numbers. Custom repair logic risks corrupting the migration log. Repair is the wrong answer — correctness assertions are | Write content-assertion tests (migration004 pattern) to catch registration gaps before they reach a running install |
| **Rewrite recipe form state as fully DB-backed** | Would eliminate the form-vs-DB diff problem entirely by removing the form intermediary | Breaks optimistic UX. Every step/section add during editing requires a DB round-trip mid-form. For a 20-step recipe this means 20+ sequential async calls before the user saves | Keep the form-state model. Add the three-way diff algorithm only in `onSubmit`. Cost is isolated to the save path, not the edit experience |
| **Generic schema validation at startup (`PRAGMA integrity_check`)** | Detect corruption on every launch | Adds 50–100ms cold start latency. `integrity_check` is corruption detection, not schema validation. Silently passing is not the same as "schema is correct" | Validate schema via migration file content tests and migration 004-pattern assertions, not at runtime |
| **Global order_index renumbering on every save** | Clean order_index sequences (0, 1, 2, ...) | Unnecessary write load. `order_index` is for sort ordering, not identity. Gaps (0, 2, 5) are harmless and can arise from deletions. Renumbering creates spurious UPDATE rows in tests | Accept gaps; rely on ORDER BY rather than consecutive numbering |

---

## Feature Dependencies

```
MIG-01 (migration registration audit)
    └──enables──> MIG-02 (clean DB validation smoke test)

VER-01 (version string alignment) ── independent

REC-03 (metadata clearing fix) ── independent ── no schema change, no form change

REC-05 (section-aware ordering) ── independent ── single query change

REC-01 (paintless steps — nullable paint_id migration)
    └──required-before──> REC-02 (non-destructive edits)
          because the diff-apply INSERT must handle paint_id = null steps
          without hitting the NOT NULL constraint

REC-02 (non-destructive edits — ID preservation)
    └──required-before──> REC-04 (stable session section FK)
          because session section links are only durable once section IDs
          survive recipe saves; ON DELETE SET NULL fires on every save
          under the current delete-all pattern, making the FK pointless

REC-04 (stable session section FK — migration 022)
    └──enables──> TST-01 (c) session section link test
          test can assert FK column presence once migration exists

TST-01 (data-layer tests)
    └──depends-on──> MIG-01, REC-01, REC-02, REC-04
          tests assert the contracts these features deliver
```

### Dependency Notes

- **REC-01 before REC-02:** The diff algorithm will encounter steps with `paint_id = null`. The migration to make the column nullable must land before any code path attempts to INSERT such a step, or the constraint violation fails silently in tests and loudly in the running app.
- **REC-02 before REC-04:** A session `recipe_section_id` FK only has durable meaning after sections survive saves. Without REC-02, ON DELETE SET NULL fires on every recipe edit, clearing all session section links regardless of whether the section was actually removed.
- **MIG-01 and MIG-02 as sequential pair:** Verify registration first, then smoke-test runtime. Running MIG-02 before MIG-01 wastes effort if registration is incomplete.
- **Independent items (VER-01, REC-03, REC-05):** These can be batched into any phase. Low cost, no risk. Good candidates for a "quick wins" phase that builds momentum before the complex REC-02 work.

---

## Implementation Notes by Feature

### REC-01: Paintless steps — nullable paint_id migration

SQLite does not support `ALTER COLUMN` to drop NOT NULL constraints. The migration
must use the standard five-step workaround:

```sql
-- 1. Create replacement table with nullable paint_id
CREATE TABLE recipe_steps_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
  paint_id INTEGER REFERENCES paints(id) ON DELETE RESTRICT,  -- nullable
  step_name TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  -- ... remaining columns unchanged
  section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE
);
-- 2. Copy all existing data
INSERT INTO recipe_steps_new SELECT * FROM recipe_steps;
-- 3. Drop original
DROP TABLE recipe_steps;
-- 4. Rename replacement
ALTER TABLE recipe_steps_new RENAME TO recipe_steps;
```

Query impact after migration:
- `addRecipePaint`: allow `paint_id: null` in the INSERT
- `getRecipeSwatchColors`: `JOIN paints` → `LEFT JOIN paints` (paintless steps must appear in step lists, just without a swatch color)
- `getRecipePaintAvailability`: already has `WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0` — correctly excludes paintless steps, no change needed
- `getStepCountsByRecipe`: counts all steps regardless of paint — no change needed

### REC-02: Non-destructive edits — three-way diff algorithm

Current code at `RecipeFormSheet.tsx` line 234:
```ts
for (const existing of existingSections) {
  await deleteRecipeSection(existing.id);  // CASCADE wipes all steps
}
```

Replacement: form section objects must carry an optional `dbId?: number` field, populated
from the DB when the form is opened for an existing recipe. The diff at save time:

```
toDelete  = existingSections.filter(s => !formSections.find(fs => fs.dbId === s.id))
toUpdate  = formSections.filter(s => s.dbId !== undefined)
toInsert  = formSections.filter(s => s.dbId === undefined)
```

For sections: UPDATE matched rows (order_index, name, metadata), INSERT new rows,
DELETE removed rows. The same three-way diff applies to steps within each section,
matching on `step.dbId` (the DB `recipe_steps.id`). Steps that survive the diff
retain their `id` — all FK references remain valid.

### REC-04: Stable session section FK

Migration 022:
```sql
ALTER TABLE painting_sessions
  ADD COLUMN recipe_section_id INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL;
```

ON DELETE SET NULL matches the existing `recipe_step_id` pattern from migration 014.
`section_name` TEXT stays in place as the display fallback after section deletion —
same pattern as `detachment_name` on army lists and `weapon_name` on loadouts.

`createSession` call signature gains `recipe_section_id?: number | null`.
`LogSessionSheet` cascading selector (recipe → section → step) populates `recipe_section_id`
alongside the existing `section_name`.

### TST-01: Test file plan

All four test files use `readFileSync` + regex assertions (no Tauri IPC required):

| File | Assertions |
|------|-----------|
| `tests/foundation/migrationRegistration.test.ts` | lib.rs contains version 1–21 entries; each `include_str!` path matches a file that exists; rules migrations contain versions 1–3 |
| `tests/painting/recipeNonDestructiveSave.test.ts` | Pure diff algorithm: given existingSections + formSections, output has correct toDelete/toUpdate/toInsert sets |
| `tests/hobby-journal/sessionSectionLink.test.ts` | Migration 022 SQL contains `recipe_section_id` column; `ON DELETE SET NULL` present; column is nullable (no NOT NULL) |
| `tests/foundation/armyListSchema.test.ts` | army_lists migration SQL contains `detachment_name` denormalized column; unit_recipe_assignments SQL contains `recipe_section_id` references (or confirms its absence as expected) |

---

## MVP Definition for v0.2.11

All 9 requirements are in scope. No deferral candidates. The milestone is a hardening
pass — each item is already scoped to minimum viable correction.

### Phase 1: Zero-Risk Quick Wins (no schema change, no form logic change)

- [ ] MIG-01 — Verify migration registration completeness (audit + test)
- [ ] MIG-02 — Clean DB validation (smoke test fresh install)
- [ ] VER-01 — Align version strings in package.json and tauri.conf.json
- [ ] REC-03 — Replace COALESCE with direct assignment for 4 nullable metadata fields in `updateRecipeSection`
- [ ] REC-05 — Section-aware step ordering (JOIN + ORDER BY fix in `getRecipePaintsByRecipe`)

### Phase 2: Schema Extension (additive migrations, backward-compatible)

- [ ] REC-01 — Paintless steps: nullable `paint_id` migration + query updates
- [ ] REC-04 — Stable session section FK: migration 022 + session insert update + LogSessionSheet wiring

### Phase 3: Form Logic (highest complexity, REC-01 must be complete first)

- [ ] REC-02 — Non-destructive recipe edits: three-way diff in `onSubmit`

### Phase 4: Verification Layer

- [ ] TST-01 — Four data-layer test files covering all of the above

---

## Feature Prioritization Matrix

| Feature | Developer Value | Implementation Cost | Priority | Phase |
|---------|----------------|---------------------|----------|-------|
| MIG-01 migration registration | HIGH (install correctness) | LOW | P1 | 1 |
| MIG-02 clean DB validation | HIGH (install correctness) | LOW | P1 | 1 |
| VER-01 version hygiene | LOW (cosmetic) | LOW | P2 | 1 (batch) |
| REC-03 metadata clearing | MEDIUM (prevents stuck UI state) | LOW | P1 | 1 |
| REC-05 section-aware ordering | MEDIUM (display correctness) | LOW | P1 | 1 |
| REC-01 paintless steps | HIGH (schema correctness, enables new step types) | MEDIUM | P1 | 2 |
| REC-04 stable session section FK | HIGH (data integrity, future-proof) | MEDIUM | P1 | 2 |
| REC-02 non-destructive edits | HIGH (prevents silent data loss, enables AR) | HIGH | P1 | 3 |
| TST-01 data-layer tests | HIGH (regression prevention) | MEDIUM | P1 | 4 |

**All items are P1 except VER-01 (cosmetic, batch with Phase 1).**

---

## Sources

- Direct codebase inspection: `src-tauri/src/lib.rs` (migration registration, confirmed versions 1–21)
- Direct codebase inspection: `src-tauri/migrations/001_core_schema.sql` (paint_id NOT NULL constraint)
- Direct codebase inspection: `src-tauri/migrations/018_recipe_sections.sql` (section schema, CASCADE chain)
- Direct codebase inspection: `src-tauri/migrations/020_workflow_metadata.sql` (section_name on sessions)
- Direct codebase inspection: `src-tauri/migrations/021_applied_recipe_assignments.sql` (order_index-keyed progress)
- Direct codebase inspection: `src/db/queries/recipeSections.ts` (COALESCE vs direct assignment pattern)
- Direct codebase inspection: `src/db/queries/recipePaints.ts` (JOIN assumptions, availability query)
- Direct codebase inspection: `src/db/queries/paintingSessions.ts` (section_name present, section_id absent)
- Direct codebase inspection: `src/features/recipes/RecipeFormSheet.tsx` line 234 (delete-all pattern)
- Direct codebase inspection: `tests/foundation/migration004.test.ts` (readFileSync test pattern)
- PROJECT.md: all MIG-*, REC-*, VER-*, TST-* requirement definitions and key decisions log

---
*Feature research for: v0.2.11 Foundation Hardening (HobbyForge)*
*Researched: 2026-05-13*
