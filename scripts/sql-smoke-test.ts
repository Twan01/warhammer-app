/**
 * Phase 1 SQL pipeline smoke test (ROADMAP Phase 1 Success Criterion 5).
 *
 * Proves that the four sql:allow-* capabilities granted in
 * src-tauri/capabilities/default.json are wired correctly by performing a
 * full CREATE TABLE -> INSERT -> SELECT -> DROP TABLE roundtrip against the
 * production hobbyforge.db file.
 *
 * Why a temporary table? Phase 1 has NO real schema yet -- get_migrations()
 * in lib.rs returns vec![]. The smoke test creates and drops its own
 * scratch table so it leaves no residue and does not depend on Phase 2
 * tables. The table name is prefixed with `__phase1_` to make it
 * distinguishable in case the test crashes before DROP.
 *
 * This module is invoked ONCE during Phase 1 verification (e.g. wired to a
 * temporary "Run smoke test" button in App.tsx, or invoked from the
 * browser devtools console via `window.__phase1Smoke()`). It is NOT
 * imported by any production code path. Phase 2 deletes this file along
 * with any wiring that calls it.
 */
import { getDb } from "../src/db/client";

const SMOKE_TABLE = "__phase1_smoke_test";

export async function runSqlSmokeTest(): Promise<{
  ok: true;
  rowsInserted: number;
  rowsSelected: number;
  dropped: true;
}> {
  const db = await getDb();

  // Defensive: drop any leftover table from a previous failed run.
  await db.execute(`DROP TABLE IF EXISTS ${SMOKE_TABLE}`);

  // CREATE -- exercises sql:allow-execute
  await db.execute(
    `CREATE TABLE ${SMOKE_TABLE} (id INTEGER PRIMARY KEY, label TEXT NOT NULL)`
  );

  // INSERT -- exercises sql:allow-execute (this is the literal "test row" from
  // ROADMAP Success Criterion 5)
  const insertResult = await db.execute(
    `INSERT INTO ${SMOKE_TABLE} (label) VALUES (?)`,
    ["phase1-smoke"]
  );
  const rowsInserted = insertResult.rowsAffected;

  // SELECT -- exercises sql:allow-select; confirms data round-trips
  const rows = await db.select<{ id: number; label: string }[]>(
    `SELECT id, label FROM ${SMOKE_TABLE} WHERE label = ?`,
    ["phase1-smoke"]
  );
  if (rows.length !== 1 || rows[0].label !== "phase1-smoke") {
    throw new Error(
      `Smoke test SELECT mismatch: expected 1 row labeled 'phase1-smoke', got ${JSON.stringify(rows)}`
    );
  }

  // DROP -- exercises sql:allow-execute again, leaves no residue
  await db.execute(`DROP TABLE ${SMOKE_TABLE}`);

  return {
    ok: true,
    rowsInserted,
    rowsSelected: rows.length,
    dropped: true,
  };
}

/**
 * Browser console helper. After running `pnpm tauri dev`, open the webview
 * devtools and call:
 *
 *   await window.__phase1Smoke()
 *
 * Expected output (object): { ok: true, rowsInserted: 1, rowsSelected: 1, dropped: true }
 *
 * Phase 2 removes this global and the entire scripts/ smoke folder.
 */
declare global {
  interface Window {
    __phase1Smoke?: typeof runSqlSmokeTest;
  }
}
if (typeof window !== "undefined") {
  window.__phase1Smoke = runSqlSmokeTest;
}
