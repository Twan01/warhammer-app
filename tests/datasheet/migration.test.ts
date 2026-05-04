/**
 * Phase 15 — Migration content tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 15-01 will:
 *   1. Create src-tauri/migrations/rules_001_schema.sql with the rw_factions, rw_datasheets,
 *      rw_datasheet_models, rw_datasheet_abilities, rw_datasheet_keywords, rw_sources, rw_sync_meta tables.
 *   2. Create src-tauri/migrations/007_datasheet_link.sql adding `datasheet_id TEXT` to unit_strategy_notes
 *      (no FK because cross-database FKs are not supported — see Pitfall 1).
 *   3. Add get_rules_migrations() function to src-tauri/src/lib.rs and chain
 *      .add_migrations("sqlite:rules.db", get_rules_migrations()) onto the SQL plugin.
 *   4. Add version: 7, description: "datasheet_link", include_str!("../migrations/007_datasheet_link.sql")
 *      to get_migrations().
 *   5. Replace each `it.skip` below with `it`.
 *   6. Add real readFileSync assertions matching 15-VALIDATION.md row 15-01-03.
 *
 * Mirrors tests/hobby-journal/migration005.test.ts pattern. Content-shape test only —
 * tauri-plugin-sql IPC cannot run in jsdom.
 */
import { describe, it } from "vitest";

describe("rules_001_schema.sql + migration 007 — Wave 0 stubs", () => {
  it.skip("DS-01: rules_001_schema.sql contains all 7 rw_* tables (rw_factions, rw_datasheets, rw_datasheet_models, rw_datasheet_abilities, rw_datasheet_keywords, rw_sources, rw_sync_meta)", () => {
    // Plan 15-01 will:
    //   - readFileSync("src-tauri/migrations/rules_001_schema.sql", "utf-8")
    //   - assert sql matches /CREATE TABLE IF NOT EXISTS rw_factions/
    //   - assert sql matches /CREATE TABLE IF NOT EXISTS rw_datasheets/
    //   - assert sql matches /CREATE TABLE IF NOT EXISTS rw_datasheet_models/
    //   - assert sql matches /CREATE TABLE IF NOT EXISTS rw_datasheet_abilities/
    //   - assert sql matches /CREATE TABLE IF NOT EXISTS rw_datasheet_keywords/
    //   - assert sql matches /CREATE TABLE IF NOT EXISTS rw_sources/
    //   - assert sql matches /CREATE TABLE IF NOT EXISTS rw_sync_meta/
    //   - assert sql matches /id\s+INTEGER PRIMARY KEY CHECK \(id = 1\)/   // rw_sync_meta single row
    //   - assert sql matches /datasheet_id\s+TEXT.+REFERENCES rw_datasheets\(id\)\s+ON DELETE CASCADE/
    //   - assert sql does NOT match /\bDROP\b/i  (additive only)
    //   - assert sql does NOT match /\bDELETE FROM\b/i
  });

  it.skip("DS-06: 007_datasheet_link.sql adds datasheet_id TEXT column to unit_strategy_notes (NO REFERENCES — cross-DB FK not supported)", () => {
    // Plan 15-01 will:
    //   - readFileSync("src-tauri/migrations/007_datasheet_link.sql", "utf-8")
    //   - assert sql matches /ALTER TABLE unit_strategy_notes ADD COLUMN datasheet_id TEXT/
    //   - assert sql does NOT match /REFERENCES rw_datasheets/  (Pitfall 1: SQLite cannot FK across DB files)
    //   - assert sql does NOT match /\bDROP\b/i
    //   - assert sql does NOT match /\bDELETE FROM\b/i
  });

  it.skip("DS-01 + DS-06: src-tauri/src/lib.rs registers BOTH databases — version: 7 entry for hobbyforge.db AND get_rules_migrations() chained for sqlite:rules.db", () => {
    // Plan 15-01 will:
    //   - readFileSync("src-tauri/src/lib.rs", "utf-8")
    //   - assert libRs matches /version:\s*7\s*,/
    //   - assert libRs matches /description:\s*"datasheet_link"/
    //   - assert libRs matches /007_datasheet_link\.sql/
    //   - assert libRs matches /fn get_rules_migrations\(\)/
    //   - assert libRs matches /version:\s*1\s*,[\s\S]*description:\s*"rules_schema"/   // first rules.db migration
    //   - assert libRs matches /rules_001_schema\.sql/
    //   - assert libRs matches /\.add_migrations\("sqlite:rules\.db",\s*get_rules_migrations\(\)\)/
    //   - readFileSync("src-tauri/tauri.conf.json", "utf-8")
    //   - parsed JSON: assert plugins.sql.preload includes "sqlite:rules.db"
  });
});
