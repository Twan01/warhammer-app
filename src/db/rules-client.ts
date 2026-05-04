/**
 * Phase 15 — sqlite:rules.db singleton client.
 *
 * Mirrors src/db/client.ts exactly except for the connection string.
 * tauri-plugin-sql supports multiple independent Database.load calls — see
 * 15-RESEARCH.md §Pattern 1. The actual file resolves to
 * %APPDATA%/com.hobbyforge.app/rules.db (sibling of hobbyforge.db).
 *
 * Per ARCHITECTURE.md: this file is the ONLY caller of Database.load
 * for the rules.db connection. All read/write logic lives in
 * src/db/queries/datasheets.ts.
 */
import Database from "@tauri-apps/plugin-sql";

let _rulesDb: Database | null = null;

export async function getRulesDb(): Promise<Database> {
  if (!_rulesDb) {
    _rulesDb = await Database.load("sqlite:rules.db");
    // FK enforcement is per-connection. rules.db FKs (e.g. rw_datasheet_models
    // → rw_datasheets) need this same pragma as hobbyforge.db.
    await _rulesDb.execute("PRAGMA foreign_keys = ON");
  }
  return _rulesDb;
}

/**
 * Test-only helper: reset the singleton. Used by Phase 15 verification tests
 * to force a fresh connection. NOT used in production code.
 */
export function __resetRulesDbForTesting(): void {
  _rulesDb = null;
}
