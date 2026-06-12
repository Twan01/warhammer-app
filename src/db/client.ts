/**
 * SQLite client singleton for HobbyForge.
 *
 * - Loads the database once and reuses the connection (Pattern 1 — Architecture).
 * - FK enforcement is guaranteed at the POOL level, not by the pragma below.
 *   tauri-plugin-sql wraps an sqlx::Pool<Sqlite> and statements run on whichever
 *   pooled connection is free. SQLite's `foreign_keys` is a per-connection
 *   setting, so a pragma run once here would only cover a single connection.
 *   The real guarantee comes from sqlx 0.8: SqliteConnectOptions defaults
 *   `foreign_keys = ON` and applies it to EVERY connection the pool opens
 *   (see sqlx-sqlite options/mod.rs). The `PRAGMA foreign_keys = ON` below is
 *   therefore redundant reinforcement, kept for documentation/defensiveness —
 *   do NOT assume removing it disables FK enforcement, and do NOT assume it
 *   alone enforces FKs pool-wide. (The same applies to busy_timeout: sqlx
 *   defaults 5s on every connection; the 10s set here only affects this one.)
 *   NOTE: this means cross-connection ATOMICITY is the real limitation — explicit
 *   BEGIN/COMMIT across multiple db.execute() calls is unsafe over a pool, not FK
 *   enforcement. See .planning/debug/recipe-section-save-fails.md.
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
      await db.execute("PRAGMA journal_mode = WAL");
      await db.execute("PRAGMA busy_timeout = 10000");
      return db;
    })().catch((err) => {
      _dbPromise = null;
      // Wrap with context so call-site toasts/logs are actionable.
      throw new Error(`Failed to initialize hobbyforge.db: ${err instanceof Error ? err.message : String(err)}`);
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
