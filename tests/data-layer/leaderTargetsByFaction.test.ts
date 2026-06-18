// @vitest-environment node

/**
 * Data-layer test for the faction-scoped canonical leader-targets query (Phase 140, PLAY-02/03).
 *
 * Exercises the double-join SQL used by getLeaderTargetsByFactionCanonical:
 *   SELECT leader_u.name AS leader_name, leader_u.faction_id, target_u.name AS target_name
 *   FROM udb_leader_targets lt
 *   JOIN udb_units leader_u ON leader_u.id = lt.leader_unit_id
 *   JOIN udb_units target_u ON target_u.id = lt.target_unit_id
 *   WHERE leader_u.faction_id = ?
 *   ORDER BY leader_name, target_name
 *
 * NOTE: better-sqlite3 uses `?` for positional binding; the production Tauri query
 * uses `$1` (tauri-plugin-sql requirement) — this divergence is intentional and
 * is replicated inline here rather than importing the async production function.
 *
 * Three cases:
 *   1. Correct ordered pairs for faction 'FA'.
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

// SQL replicating getLeaderTargetsByFactionCanonical — `?` for better-sqlite3
// (production uses `$1` for Tauri plugin-sql; divergence is intentional)
const FACTION_LEADER_TARGETS_SQL = `
  SELECT leader_u.name AS leader_name, leader_u.faction_id, target_u.name AS target_name
  FROM udb_leader_targets lt
  JOIN udb_units leader_u ON leader_u.id = lt.leader_unit_id
  JOIN udb_units target_u ON target_u.id = lt.target_unit_id
  WHERE leader_u.faction_id = ?
  ORDER BY leader_name, target_name
`;

interface Row {
  leader_name: string;
  faction_id: string | null;
  target_name: string;
}

describe("getLeaderTargetsByFactionCanonical — faction-scoped query (Phase 140 PLAY-02/03)", () => {
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

    // 5 units: 3 for FA (1 leader, 2 targets), 2 for FB (1 leader, 1 target)
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('LA', 'FA', 'Leader A', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('TA1', 'FA', 'Target A1', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('TA2', 'FA', 'Target A2', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('LB', 'FB', 'Leader B', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('TB1', 'FB', 'Target B1', datetime('now'))`,
    ).run();

    // 3 leader-target pairs: LA→TA1, LA→TA2, LB→TB1
    db.prepare(
      `INSERT OR IGNORE INTO udb_leader_targets (leader_unit_id, target_unit_id)
       VALUES ('LA', 'TA1')`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_leader_targets (leader_unit_id, target_unit_id)
       VALUES ('LA', 'TA2')`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_leader_targets (leader_unit_id, target_unit_id)
       VALUES ('LB', 'TB1')`,
    ).run();

    // Re-enable FK enforcement before querying
    db.pragma("foreign_keys = ON");
  }

  it("querying 'FA' returns correct ordered pairs for Leader A", () => {
    const db = createFullDb();
    seedDb(db);

    const rows = db.prepare(FACTION_LEADER_TARGETS_SQL).all("FA") as Row[];

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      leader_name: "Leader A",
      faction_id: "FA",
      target_name: "Target A1",
    });
    expect(rows[1]).toEqual({
      leader_name: "Leader A",
      faction_id: "FA",
      target_name: "Target A2",
    });

    db.close();
  });

  it("querying 'FA' returns no rows for Leader B or Target B1 (cross-faction exclusion)", () => {
    const db = createFullDb();
    seedDb(db);

    const rows = db.prepare(FACTION_LEADER_TARGETS_SQL).all("FA") as Row[];

    const hasLeaderB = rows.some((r) => r.leader_name === "Leader B");
    const hasTargetB1 = rows.some((r) => r.target_name === "Target B1");

    expect(hasLeaderB).toBe(false);
    expect(hasTargetB1).toBe(false);

    db.close();
  });

  it("querying 'UNKNOWN' returns an empty array", () => {
    const db = createFullDb();
    seedDb(db);

    const rows = db.prepare(FACTION_LEADER_TARGETS_SQL).all("UNKNOWN") as Row[];

    expect(rows).toHaveLength(0);

    db.close();
  });
});
