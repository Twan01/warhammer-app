# Phase 73: Schema Foundation + Version Parity - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase extends the SQLite schema with two new migrations and adds a CI-friendly version parity check script. Migration 026 creates the `unit_rules_mapping` table (consumed by Phase 76). Migration 027 adds Game Day after-action columns to `battle_logs` (consumed by Phase 78). A Node script enforces that package.json and tauri.conf.json version numbers match.

No UI work. No query/hook layer. Pure schema + tooling.

</domain>

<decisions>
## Implementation Decisions

### unit_rules_mapping Table (Migration 026)
- **D-01:** Table schema: `unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE`, `rules_datasheet_id TEXT` (Wahapedia datasheets use text IDs), `match_status TEXT NOT NULL DEFAULT 'auto'` (values: auto/confirmed/manual), `source TEXT` (e.g. "wahapedia-sync", "user"), `created_at TEXT NOT NULL DEFAULT (datetime('now'))`, `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
- **D-02:** UNIQUE constraint on `unit_id` — one mapping per unit. Phase 76 handles the UI for confirming/overriding.
- **D-03:** ON DELETE CASCADE on unit_id — deleting a unit removes its mapping. No FK to rules.db (cross-DB FK not supported in SQLite; rules_datasheet_id is a TEXT copy, same pattern as weapon_name and detachment_name).

### battle_logs After-Action Columns (Migration 027)
- **D-04:** Add columns via ALTER TABLE: `forgotten_rules TEXT` (JSON array of strings), `mvp_notes TEXT`, `underperformer_notes TEXT`, `promoted_to_reminder INTEGER NOT NULL DEFAULT 0` (boolean 0|1 pattern)
- **D-05:** JSON array for forgotten_rules — no junction table needed for a personal tool with low cardinality. Phase 78 parses at the TypeScript layer.
- **D-06:** Existing mvp_unit_id and underperforming_unit_id FKs are kept as-is. The new columns add free-text notes alongside the FK references.

### Version Parity Script
- **D-07:** Node script at `scripts/check-version.mjs` registered as `"check:version"` in package.json scripts section.
- **D-08:** Script reads both package.json and src-tauri/tauri.conf.json, compares version strings, exits 0 on match, exits 1 with a clear error message on mismatch.
- **D-09:** No build-time integration yet — just a manual `pnpm check:version` command. CI integration deferred (no CI pipeline exists).

### Claude's Discretion
- Migration file naming follows established pattern (026_*.sql, 027_*.sql)
- Column ordering and DEFAULT expressions follow existing schema conventions
- Script error message formatting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema patterns
- `src-tauri/migrations/001_core_schema.sql` — battle_logs table definition (lines 142-162), FK patterns, datetime defaults
- `src-tauri/migrations/024_points_import_history.sql` — synced_unit_points table (similar cross-DB reference pattern)
- `src-tauri/src/lib.rs` — Migration registration pattern (get_migrations function, include_str! macro)

### Type patterns
- `src/types/battleLog.ts` — BattleLog interface and input types (must be updated for new columns)

### Requirements
- `.planning/REQUIREMENTS.md` — DI-05 (version parity), full requirement list for downstream phases

### Accumulated decisions
- `.planning/STATE.md` §Accumulated Context — Carried-forward decisions about transactions, VACUUM INTO, COALESCE divergence

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 25 existing migrations following `NNN_snake_case.sql` naming convention
- `get_migrations()` in lib.rs uses `include_str!` macro with sequential version numbering
- Version currently at package.json=0.2.11, tauri.conf.json=0.2.12 (already diverged — script will catch this)

### Established Patterns
- ALTER TABLE for adding columns (see migrations 004-025)
- ON DELETE CASCADE / SET NULL FK conventions established in 001_core_schema.sql
- Boolean as `INTEGER NOT NULL DEFAULT 0` (0|1 pattern used throughout)
- Cross-DB references use TEXT copy columns (weapon_name, detachment_name, rules_datasheet_id follows same pattern)
- `datetime('now')` for created_at/updated_at defaults

### Integration Points
- lib.rs `get_migrations()` — new migrations must be registered here
- `src/types/battleLog.ts` — BattleLog interface needs new columns added (Phase 78 will build UI)
- `src/db/queries/battleLogs.ts` — query layer needs new columns in SELECT/INSERT/UPDATE (Phase 78)
- New `src/types/unitRulesMapping.ts` type file needed (Phase 76 will build query/hook layer)

</code_context>

<specifics>
## Specific Ideas

- Version parity script should be dead-simple — read two JSON files, compare one field, exit code. No dependencies beyond Node built-ins.
- Note the existing version divergence (0.2.11 vs 0.2.12) — the script should help catch this going forward, and both should be bumped to 0.2.13 as part of this phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 73-Schema Foundation + Version Parity*
*Context gathered: 2026-05-14*
