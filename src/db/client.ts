/**
 * SQLite client singleton for HobbyForge.
 *
 * - Loads the database once and reuses the connection (Pattern 1 — Architecture).
 * - Activates PRAGMA foreign_keys = ON immediately on first load.
 *   SQLite FKs are OFF by default per connection (Pitfall 2). Without this
 *   pragma, REFERENCES clauses are accepted but never enforced — silent data
 *   corruption.
 *
 * The database file resolves to %APPDATA%\com.hobbyforge.app\hobbyforge.db
 * on Windows because the connection string is just `sqlite:hobbyforge.db`
 * (no absolute path) — tauri-plugin-sql appends app_data_dir() automatically.
 *
 * Per ARCHITECTURE.md Component Boundaries: this file is the ONLY caller of
 * @tauri-apps/plugin-sql. All other modules go through src/db/queries/*.ts
 * (added in Phase 2) which call getDb() from here.
 */
import Database from "@tauri-apps/plugin-sql";

let _dbPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const db = await Database.load("sqlite:hobbyforge.db");
      await db.execute("PRAGMA foreign_keys = ON");
      return db;
    })().catch((err) => {
      _dbPromise = null;
      throw err;
    });
  }
  return _dbPromise;
}

/**
 * Test-only helper: reset the singleton. Used by Phase 2 verification tests
 * to force a fresh connection with the FK pragma re-applied. NOT used in
 * production code.
 */
export function __resetDbForTesting(): void {
  _dbPromise = null;
}
