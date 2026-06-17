// @vitest-environment node

/**
 * Schema assertions for migration 050 — udb_leader_targets (PLAY-02).
 *
 * Asserts:
 *  1. udb_leader_targets table exists after the full migration chain.
 *  2. Both columns (leader_unit_id, target_unit_id) are NOT NULL.
 *  3. Composite primary key spans both columns (pk > 0).
 *  4. Two FK rows to udb_units with on_delete = 'CASCADE'.
 *  5. ON DELETE CASCADE is observable: deleting a udb_units row removes
 *     all referencing leader_targets rows.
 *
 * Uses PRAGMA foreign_keys = ON to match production behavior (src/db/client.ts).
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

describe("migration 050 — udb_leader_targets (PLAY-02)", () => {
  it("udb_leader_targets table exists after migration chain", () => {
    const db = createFullDb();
    const row = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'udb_leader_targets'`,
      )
      .get() as { name: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.name).toBe("udb_leader_targets");
    db.close();
  });

  it("both columns are NOT NULL and are the composite primary key", () => {
    const db = createFullDb();
    type ColInfo = { name: string; notnull: number; pk: number };
    const cols = db.pragma("table_info(udb_leader_targets)") as ColInfo[];

    // Exactly two columns
    expect(cols).toHaveLength(2);

    const leaderCol = cols.find((c) => c.name === "leader_unit_id");
    const targetCol = cols.find((c) => c.name === "target_unit_id");

    expect(leaderCol).toBeDefined();
    expect(targetCol).toBeDefined();

    // Both NOT NULL
    expect(leaderCol!.notnull).toBe(1);
    expect(targetCol!.notnull).toBe(1);

    // Both part of the composite PK (pk > 0)
    expect(leaderCol!.pk).toBeGreaterThan(0);
    expect(targetCol!.pk).toBeGreaterThan(0);

    db.close();
  });

  it("has two FK rows to udb_units with ON DELETE CASCADE", () => {
    const db = createFullDb();
    type FkInfo = { table: string; from: string; on_delete: string };
    const fks = db.pragma(
      "foreign_key_list(udb_leader_targets)",
    ) as FkInfo[];

    expect(fks).toHaveLength(2);

    for (const fk of fks) {
      expect(fk.table).toBe("udb_units");
      expect(fk.on_delete).toBe("CASCADE");
    }

    const fromCols = fks.map((f) => f.from).sort();
    expect(fromCols).toEqual(["leader_unit_id", "target_unit_id"]);

    db.close();
  });

  it("ON DELETE CASCADE removes leader_targets row when referenced udb_units row is deleted", () => {
    const db = createFullDb();
    // Disable FK to insert seed rows without ordering constraint (then re-enable)
    db.pragma("foreign_keys = OFF");

    // Seed a minimal udb_factions row
    db.prepare(
      `INSERT OR IGNORE INTO udb_factions (id, name, updated_at)
       VALUES ('TEST_FACTION', 'Test Faction', datetime('now'))`,
    ).run();

    // Seed two udb_units rows
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('UNIT_LEADER', 'TEST_FACTION', 'Test Leader', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('UNIT_TARGET', 'TEST_FACTION', 'Test Target', datetime('now'))`,
    ).run();

    // Seed a leader_targets pair
    db.prepare(
      `INSERT OR IGNORE INTO udb_leader_targets (leader_unit_id, target_unit_id)
       VALUES ('UNIT_LEADER', 'UNIT_TARGET')`,
    ).run();

    // Verify the row exists
    const before = db
      .prepare(
        `SELECT COUNT(*) as c FROM udb_leader_targets
         WHERE leader_unit_id = 'UNIT_LEADER' AND target_unit_id = 'UNIT_TARGET'`,
      )
      .get() as { c: number };
    expect(before.c).toBe(1);

    // Re-enable FK enforcement before the CASCADE test
    db.pragma("foreign_keys = ON");

    // Delete the leader unit — CASCADE should remove the leader_targets row
    db.prepare(`DELETE FROM udb_units WHERE id = 'UNIT_LEADER'`).run();

    const after = db
      .prepare(
        `SELECT COUNT(*) as c FROM udb_leader_targets
         WHERE leader_unit_id = 'UNIT_LEADER'`,
      )
      .get() as { c: number };
    expect(after.c).toBe(0);

    db.close();
  });

  it("duplicate (leader_unit_id, target_unit_id) pair is silently ignored (composite PK dedup)", () => {
    const db = createFullDb();
    db.pragma("foreign_keys = OFF");

    db.prepare(
      `INSERT OR IGNORE INTO udb_factions (id, name, updated_at)
       VALUES ('TEST_FACTION2', 'Test Faction 2', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('UNIT_L2', 'TEST_FACTION2', 'Leader 2', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO udb_units (id, faction_id, name, updated_at)
       VALUES ('UNIT_T2', 'TEST_FACTION2', 'Target 2', datetime('now'))`,
    ).run();

    db.pragma("foreign_keys = ON");

    db.prepare(
      `INSERT OR IGNORE INTO udb_leader_targets (leader_unit_id, target_unit_id)
       VALUES ('UNIT_L2', 'UNIT_T2')`,
    ).run();
    // Second insert must not throw (OR IGNORE) and must not create a duplicate
    db.prepare(
      `INSERT OR IGNORE INTO udb_leader_targets (leader_unit_id, target_unit_id)
       VALUES ('UNIT_L2', 'UNIT_T2')`,
    ).run();

    const count = db
      .prepare(
        `SELECT COUNT(*) as c FROM udb_leader_targets
         WHERE leader_unit_id = 'UNIT_L2' AND target_unit_id = 'UNIT_T2'`,
      )
      .get() as { c: number };
    expect(count.c).toBe(1);

    db.close();
  });
});
