// @vitest-environment node

/**
 * Data-layer test for the faction-scoped canonical point-tiers query
 * (Phase 140 WR-03 — relocated out of DatasheetPointsTab into the queries layer).
 *
 * Exercises the join SQL used by getUdbPointsByFaction:
 *   SELECT u.name AS unit_name, u.faction_id, up.model_count, up.points
 *   FROM udb_units u
 *   JOIN udb_unit_points up ON up.unit_id = u.id
 *   WHERE u.faction_id = ?
 *   ORDER BY u.name, up.model_count
 *
 * NOTE: better-sqlite3 uses `?` for positional binding; the production Tauri query
 * uses `$1` (tauri-plugin-sql requirement) — this divergence is intentional and
 * is replicated inline here rather than importing the async production function.
 *
 * Three cases:
 *   1. Correct ordered tiers for faction 'FA' (by unit name, then model_count).
 *   2. Cross-faction exclusion — FA query returns no FB rows.
 *   3. Unknown faction returns empty array.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = resolve(repoRoot, "src-tauri/migrations");

/** Creates an in-memory DB with the full migration chain applied (PRAGMA FK = ON). */
function createFullDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(
      (a, b) =>
        Number.parseInt(a.slice(0, 3), 10) -
        Number.parseInt(b.slice(0, 3), 10),
    );
  for (const file of files) {
    db.exec(readFileSync(resolve(migrationsDir, file), "utf-8"));
  }
  return db;
}

// SQL replicating getUdbPointsByFaction — `?` for better-sqlite3
// (production uses `$1` for Tauri plugin-sql; divergence is intentional)
const UDB_POINTS_BY_FACTION_SQL = `
  SELECT u.name AS unit_name, u.faction_id, up.model_count, up.points
  FROM udb_units u
  JOIN udb_unit_points up ON up.unit_id = u.id
  WHERE u.faction_id = ?
  ORDER BY u.name, up.model_count
`;

interface Row {
  unit_name: string;
  faction_id: string | null;
  model_count: number;
  points: number;
}

describe("getUdbPointsByFaction — faction-scoped point tiers (Phase 140 WR-03)", () => {
  function seedDb(db: Database.Database): void {
    // Insert seed data with FK enforcement OFF to avoid ordering constraints
    db.pragma("foreign_keys = OFF");

    // 2 factions
    db.prepare(
      `INSERT OR IGNORE INTO udb_factions (id, name, updated_at)
       VALUES ('FA', 'Faction A', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_factions (id, name, updated_at)
       VALUES ('FB', 'Faction B', datetime('now'))`,
    ).run();

    // 3 units: 2 for FA, 1 for FB
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('UA1', 'FA', 'Alpha Squad', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('UA2', 'FA', 'Bravo Squad', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('UB1', 'FB', 'Charlie Squad', datetime('now'))`,
    ).run();

    // Point tiers: Alpha has two brackets (5/10 models), Bravo one, Charlie (FB) one.
    // Insert Alpha's 10-model tier first to prove ORDER BY model_count works.
    db.prepare(
      `INSERT OR IGNORE INTO udb_unit_points (unit_id, model_count, points)
       VALUES ('UA1', 10, 180)`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_unit_points (unit_id, model_count, points)
       VALUES ('UA1', 5, 95)`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_unit_points (unit_id, model_count, points)
       VALUES ('UA2', 3, 60)`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_unit_points (unit_id, model_count, points)
       VALUES ('UB1', 1, 40)`,
    ).run();

    // Re-enable FK enforcement before querying
    db.pragma("foreign_keys = ON");
  }

  it("querying 'FA' returns tiers ordered by unit name then model_count", () => {
    const db = createFullDb();
    seedDb(db);

    const rows = db.prepare(UDB_POINTS_BY_FACTION_SQL).all("FA") as Row[];

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      unit_name: "Alpha Squad",
      faction_id: "FA",
      model_count: 5,
      points: 95,
    });
    expect(rows[1]).toEqual({
      unit_name: "Alpha Squad",
      faction_id: "FA",
      model_count: 10,
      points: 180,
    });
    expect(rows[2]).toEqual({
      unit_name: "Bravo Squad",
      faction_id: "FA",
      model_count: 3,
      points: 60,
    });

    db.close();
  });

  it("querying 'FA' returns no rows for Faction B units (cross-faction exclusion)", () => {
    const db = createFullDb();
    seedDb(db);

    const rows = db.prepare(UDB_POINTS_BY_FACTION_SQL).all("FA") as Row[];

    const hasCharlie = rows.some((r) => r.unit_name === "Charlie Squad");
    expect(hasCharlie).toBe(false);

    db.close();
  });

  it("querying 'UNKNOWN' returns an empty array", () => {
    const db = createFullDb();
    seedDb(db);

    const rows = db.prepare(UDB_POINTS_BY_FACTION_SQL).all("UNKNOWN") as Row[];

    expect(rows).toHaveLength(0);

    db.close();
  });
});
