# Phase 96: Database Hardening - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the main hobbyforge.db database layer robust: WAL journal mode for concurrent read safety, indexes on all FK and temporal columns for query performance, and CHECK constraints preventing invalid data at the schema level. No new features, no UI changes — purely internal database quality.

</domain>

<decisions>
## Implementation Decisions

### WAL Mode & Busy Timeout (ERR-05)
- **D-01:** Add `PRAGMA journal_mode = WAL` and `PRAGMA busy_timeout = 10000` to `src/db/client.ts` getDb() — matching the exact pattern already established in `src/db/rules-client.ts`. These are connection-time PRAGMAs, not migration statements.

### FK Column Indexes (DBH-01)
- **D-02:** Create indexes on all FK columns that lack them. Target columns from requirements: `units.faction_id`, `recipe_steps.recipe_id`, `army_list_units.list_id`, `painting_sessions.unit_id`, `battle_logs.army_list_id`, `painting_recipes.faction_id`, `painting_recipes.unit_id`, `recipe_sections.recipe_id`. Use `CREATE INDEX IF NOT EXISTS` for idempotency.
- **D-03:** Also index FK columns added in later migrations that the requirements list didn't enumerate (e.g., `army_list_enhancements.list_id`, `army_list_enhancements.army_list_unit_id`, `army_list_units.leader_attached_to_id`, `unit_strategy_notes.unit_id`, `image_assets(entity_type, entity_id)`). The researcher should scan all migrations and identify every FK column missing an explicit index.

### Temporal Indexes (DBH-02)
- **D-04:** Create DESC indexes on `painting_sessions.session_date` and `battle_logs.battle_date` — the two temporal columns used in "most recent" sorting queries.

### CHECK Constraints (DBH-03)
- **D-05:** Add CHECK constraints for data integrity: `points >= 0`, `quantity >= 0`, `painting_percentage BETWEEN 0 AND 100`. The researcher must identify which tables/columns need CHECKs and whether existing data already complies.
- **D-06:** Adding CHECK constraints to existing tables in SQLite requires the rename-create-copy-drop pattern (same as migration 031). The researcher should determine exactly which tables need recreation vs. which already have valid data patterns.
- **D-07:** Before writing CHECK constraint migrations, verify existing data won't violate the new constraints. Include a data cleanup step in the migration if needed (e.g., clamp out-of-range values before recreating the table).

### Migration Strategy
- **D-08:** Use a single new migration file (033_database_hardening.sql) for all index creations. If CHECK constraints require table recreation, those can be in the same migration since it runs as one transaction.
- **D-09:** All index statements use `CREATE INDEX IF NOT EXISTS` to be idempotent.

### Claude's Discretion
- Index naming convention (researcher can follow existing patterns or propose `idx_{table}_{column}`)
- Whether to add any additional non-FK indexes that the query analysis reveals would help (beyond what requirements specify)
- Exact set of columns receiving CHECK constraints beyond the explicitly named ones (points, quantity, painting_percentage)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Layer
- `src/db/client.ts` — Main DB singleton; add WAL + busy_timeout PRAGMAs here
- `src/db/rules-client.ts` — Reference implementation of WAL + busy_timeout pattern (lines 22-23)
- `src-tauri/migrations/001_core_schema.sql` — Original schema with all FK definitions
- `src-tauri/migrations/031_army_list_v3.sql` — Example of rename-create-copy-drop migration pattern for adding constraints

### Requirements
- `.planning/REQUIREMENTS.md` — ERR-05, DBH-01, DBH-02, DBH-03 requirement definitions
- `.planning/ROADMAP.md` §Phase 96 — Success criteria (4 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/rules-client.ts`: Already implements WAL + busy_timeout — copy the exact PRAGMA pattern to client.ts
- Migration 031 (army_list_v3.sql): Proven rename-create-copy-drop pattern for adding CHECK constraints to existing tables

### Established Patterns
- All migrations use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` for idempotency
- Migration numbering is sequential (current latest: 032)
- tauri-plugin-sql auto-runs migrations at startup in filename order
- Migration file naming: `NNN_descriptive_name.sql`
- FK columns defined with REFERENCES but no explicit indexes (standard SQLite behavior — only PK gets auto-indexed)

### Integration Points
- `src/db/client.ts` getDb() — add 2 PRAGMA lines after existing `foreign_keys = ON`
- `src-tauri/migrations/` — add migration 033
- `src-tauri/src/lib.rs` — migration must be registered (verify auto-discovery pattern)
- `tests/` — data-layer tests via better-sqlite3 should verify new constraints

</code_context>

<specifics>
## Specific Ideas

- The WAL + busy_timeout values should match rules-client.ts exactly (WAL mode, 10000ms busy_timeout) for consistency
- Rules-client.ts is the proven reference — this phase brings the main DB up to the same standard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 96-Database Hardening*
*Context gathered: 2026-05-22*
