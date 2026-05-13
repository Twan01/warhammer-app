# Phase 72: Data-Layer Test Suite - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds a Vitest + better-sqlite3 test suite that runs the full migration chain against a real in-memory SQLite database and asserts data-layer correctness. Four test areas per TST-01: migration parity (all 23 hobbyforge + 3 rules migrations run cleanly from scratch), recipe persistence (paintless steps survive round-trip, non-destructive save preserves IDs), session section FK (ON DELETE SET NULL behavior for recipe_section_id), and schema shape validation (expected columns/types present after full migration).

No production code changes. Tests only.

</domain>

<decisions>
## Implementation Decisions

### Test Infrastructure
- **D-01:** Install `better-sqlite3` as a devDependency. This was decided in earlier milestone planning — better-sqlite3 was chosen over `node:sqlite` due to Vitest 4.x import-stripping bug (#7177).
- **D-02:** Create a shared test helper `tests/data-layer/db-helpers.ts` that: (1) creates an in-memory better-sqlite3 database, (2) reads all migration SQL files from `src-tauri/migrations/` in version order, (3) executes them sequentially, (4) returns the ready database. Helper also sets `PRAGMA foreign_keys = ON` to match production behavior in `src/db/client.ts`.
- **D-03:** The helper reads SQL files directly from disk (`readFileSync`) — same approach used by existing migration content tests (e.g., `tests/datasheet/migration.test.ts`). No Tauri IPC involved.

### Migration Parity
- **D-04:** Test that all 23 hobbyforge migrations execute in order (version 1–23) against a fresh in-memory DB without errors. This is the "fresh install" parity test — mirrors what `lib.rs get_migrations()` does at app startup.
- **D-05:** Test that all 3 rules migrations execute in order against a separate in-memory DB without errors.
- **D-06:** Verify that the number of migrations in `lib.rs` matches the number of migration SQL files on disk — detects forgotten registration.

### Recipe Persistence
- **D-07:** Test paintless step round-trip: INSERT a recipe, INSERT a section, INSERT a step with `paint_id = NULL` → SELECT back → verify `paint_id` is NULL and step persists (validates Phase 69 migration 022 allowing nullable paint_id).
- **D-08:** Test non-destructive save round-trip: INSERT recipe + sections + steps → UPDATE a section name and step instruction → verify IDs are preserved (same row IDs before and after UPDATE). This validates the Phase 70 pattern without the Tauri bridge.
- **D-09:** Test that deleting a section cascades to its steps (ON DELETE CASCADE on recipe_steps.section_id FK).

### Session Section FK
- **D-10:** Test ON DELETE SET NULL: INSERT recipe → INSERT section → INSERT painting_session with recipe_section_id pointing to the section → DELETE the section → verify session's recipe_section_id is NULL (not deleted). This validates Phase 71 migration 023 behavior.
- **D-11:** Test dual-write: INSERT session with both `recipe_section_id` (FK) and `section_name` (text) → verify both columns store independently.

### Schema Shape Validation
- **D-12:** After running all 23 migrations, assert expected tables exist (core 10 + recipe_sections + recipe_step_photos + unit_recipe_assignments + unit_recipe_step_progress + all others).
- **D-13:** Assert specific columns added by recent migrations exist: `recipe_sections.section_type/technique/execution_mode/applies_to` (migration 020), `recipe_step_paints.paint_id` is nullable (migration 022), `painting_sessions.recipe_section_id` (migration 023).
- **D-14:** Use `PRAGMA table_info(table_name)` to inspect columns — standard SQLite introspection.

### Test Organization
- **D-15:** All data-layer tests live in `tests/data-layer/` directory with:
  - `db-helpers.ts` — shared helper (create DB, run migrations, FK pragma)
  - `migration-parity.test.ts` — D-04, D-05, D-06
  - `recipe-persistence.test.ts` — D-07, D-08, D-09
  - `session-section-fk.test.ts` — D-10, D-11
  - `schema-shape.test.ts` — D-12, D-13, D-14

### Claude's Discretion
- Whether to add a `createTestRecipe()` / `createTestSection()` factory helper in db-helpers.ts for DRY test setup, or inline INSERT statements per test
- Whether schema-shape tests should enumerate ALL tables or just the ones touched by recent phases (68-71)
- Whether to add a `rules-migration-parity.test.ts` as a separate file or fold it into `migration-parity.test.ts`
- Exact better-sqlite3 version to install (latest compatible with Node 20+)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Migration Files (must be read to build the test chain)
- `src-tauri/src/lib.rs` lines 5-169 — `get_migrations()` and `get_rules_migrations()` — authoritative list of registered migrations with version numbers
- `src-tauri/migrations/` — All 23 hobbyforge + 3 rules SQL migration files

### Existing Test Patterns
- `tests/datasheet/migration.test.ts` — Content-shape migration test pattern (reads SQL files as strings, asserts content). Phase 72 goes further: executes SQL against real SQLite.
- `tests/setup.ts` — Global Vitest setup (jest-dom, polyfills). Data-layer tests may not need jsdom environment.
- `vitest.config.ts` — Current test config (jsdom environment, verbose reporter)

### Production DB Setup (patterns to mirror in tests)
- `src/db/client.ts` — Sets `PRAGMA foreign_keys = ON` on every connection (tests must do the same)
- `src/db/rules-client.ts` — Rules DB connection pattern

### Key Migrations to Test
- `src-tauri/migrations/022_paintless_steps.sql` — Phase 69: makes paint_id nullable
- `src-tauri/migrations/023_session_section_fk.sql` — Phase 71: adds recipe_section_id FK to painting_sessions
- `src-tauri/migrations/018_recipe_sections.sql` — Phase 48: recipe_sections table
- `src-tauri/migrations/020_workflow_metadata.sql` — Phase 57: workflow metadata columns + session section_name

### Requirements
- `.planning/REQUIREMENTS.md` — TST-01 definition

### Prior Phase Context
- `.planning/phases/70-non-destructive-recipe-save/70-CONTEXT.md` — Non-destructive save decisions (what "ID preservation" means)
- `.planning/phases/71-stable-session-section-fk/71-CONTEXT.md` — Session FK decisions (ON DELETE SET NULL pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/datasheet/migration.test.ts` pattern: `readFileSync` + `resolve(repoRoot, "src-tauri/migrations/...")` for locating SQL files — reuse the same path resolution
- Existing `repoRoot` calculation via `dirname(fileURLToPath(import.meta.url))` — standard pattern across test files

### Established Patterns
- All existing migration tests are content-shape only (string matching, no SQL execution) — Phase 72 introduces a new pattern: actual SQL execution via better-sqlite3
- Tests use `describe/it/expect` from Vitest with verbose reporter
- `$1, $2` parameter syntax is Tauri plugin-sql specific — better-sqlite3 uses `?` or `:name` syntax. Test INSERT/SELECT statements will use better-sqlite3 native syntax, not the production `$1` style. This is acceptable since we're testing schema/data integrity, not query syntax.

### Integration Points
- `package.json` devDependencies — add `better-sqlite3` + `@types/better-sqlite3`
- `vitest.config.ts` — data-layer tests may benefit from `environment: 'node'` override (no need for jsdom). Can use inline `// @vitest-environment node` comment per file.
- `tsconfig.json` — may need `@types/better-sqlite3` in types array

</code_context>

<specifics>
## Specific Ideas

The data-layer tests are the capstone of v0.2.11 Foundation Hardening. They validate that all the migration and data-integrity work from Phases 68-71 is correct at the SQL level — independent of the Tauri bridge. This is the "trust but verify" layer that catches schema regressions before they reach the running app.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 72-Data-Layer Test Suite*
*Context gathered: 2026-05-13*
