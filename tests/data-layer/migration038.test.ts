// @vitest-environment node

import { describe, it, expect } from "vitest";
import { createHobbyforgeDb } from "./db-helpers";

describe("migration 038 — udb_* schema", () => {
  it("creates all udb_* regular tables", () => {
    const db = createHobbyforgeDb();
    // FTS5 virtual tables appear in sqlite_master with type='table' but also have a
    // 'shadow' set of tables. Filter them out by excluding names ending with known
    // FTS5 shadow suffixes and the main virtual table name.
    const rows = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'udb_%'
         AND name NOT LIKE '%_data' AND name NOT LIKE '%_idx' AND name NOT LIKE '%_content'
         AND name NOT LIKE '%_docsize' AND name NOT LIKE '%_config'
         AND name != 'udb_search'
         ORDER BY name`,
      )
      .all() as { name: string }[];
    db.close();

    const names = rows.map((r) => r.name);
    expect(names).toContain("udb_factions");
    expect(names).toContain("udb_units");
    expect(names).toContain("udb_unit_models");
    expect(names).toContain("udb_unit_weapons");
    expect(names).toContain("udb_unit_abilities");
    expect(names).toContain("udb_unit_keywords");
    expect(names).toContain("udb_unit_points");
    expect(names).toContain("udb_unit_composition");
    expect(names).toContain("udb_meta");
    expect(names).not.toContain("udb_search");
  });

  it("creates udb_search FTS5 virtual table", () => {
    const db = createHobbyforgeDb();
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='udb_search'",
      )
      .get() as { name: string } | undefined;
    db.close();

    expect(row?.name).toBe("udb_search");
  });

  it("udb_meta enforces CHECK(id=1)", () => {
    const db = createHobbyforgeDb();
    // id=1 should succeed
    db.prepare(
      "INSERT INTO udb_meta (id, version, built_at) VALUES (1, '1.0.0', '2026-01-01T00:00:00Z')",
    ).run();

    // id=2 should throw CHECK constraint violation
    expect(() => {
      db.prepare(
        "INSERT INTO udb_meta (id, version, built_at) VALUES (2, '1.0.0', '2026-01-01T00:00:00Z')",
      ).run();
    }).toThrow();

    db.close();
  });

  it("udb_units FK to udb_factions is enforced", () => {
    const db = createHobbyforgeDb();
    // Insert a unit with a non-existent faction_id — should throw FK constraint
    expect(() => {
      db.prepare(
        "INSERT INTO udb_units (id, faction_id, name) VALUES ('unit-1', 'NON_EXISTENT', 'Test Unit')",
      ).run();
    }).toThrow();

    db.close();
  });

  it("udb_unit_points UNIQUE(unit_id, model_count) is enforced", () => {
    const db = createHobbyforgeDb();

    // Insert a faction and a unit first
    db.prepare(
      "INSERT INTO udb_factions (id, name) VALUES ('SM', 'Space Marines')",
    ).run();
    db.prepare(
      "INSERT INTO udb_units (id, faction_id, name) VALUES ('unit-1', 'SM', 'Intercessors')",
    ).run();

    // First insert should succeed
    db.prepare(
      "INSERT INTO udb_unit_points (unit_id, model_count, points) VALUES ('unit-1', 5, 100)",
    ).run();

    // Second insert with same unit_id + model_count should throw UNIQUE constraint
    expect(() => {
      db.prepare(
        "INSERT INTO udb_unit_points (unit_id, model_count, points) VALUES ('unit-1', 5, 110)",
      ).run();
    }).toThrow();

    db.close();
  });

  it("ON DELETE CASCADE removes child rows when unit deleted", () => {
    const db = createHobbyforgeDb();

    // Insert a faction and a unit
    db.prepare(
      "INSERT INTO udb_factions (id, name) VALUES ('SM', 'Space Marines')",
    ).run();
    db.prepare(
      "INSERT INTO udb_units (id, faction_id, name) VALUES ('unit-1', 'SM', 'Intercessors')",
    ).run();

    // Insert child rows
    db.prepare(
      "INSERT INTO udb_unit_models (unit_id, name, M, T, Sv, W, Ld, OC) VALUES ('unit-1', 'Intercessor', '6\"', 4, '3+', 2, '6+', 2)",
    ).run();
    db.prepare(
      "INSERT INTO udb_unit_keywords (unit_id, keyword, is_faction) VALUES ('unit-1', 'INFANTRY', 0)",
    ).run();
    db.prepare(
      "INSERT INTO udb_unit_weapons (unit_id, name) VALUES ('unit-1', 'Bolt Rifle')",
    ).run();

    // Delete the unit
    db.prepare("DELETE FROM udb_units WHERE id = 'unit-1'").run();

    // Child rows must be gone
    const models = db
      .prepare("SELECT COUNT(*) AS cnt FROM udb_unit_models WHERE unit_id = 'unit-1'")
      .get() as { cnt: number };
    expect(models.cnt).toBe(0);

    const keywords = db
      .prepare("SELECT COUNT(*) AS cnt FROM udb_unit_keywords WHERE unit_id = 'unit-1'")
      .get() as { cnt: number };
    expect(keywords.cnt).toBe(0);

    const weapons = db
      .prepare("SELECT COUNT(*) AS cnt FROM udb_unit_weapons WHERE unit_id = 'unit-1'")
      .get() as { cnt: number };
    expect(weapons.cnt).toBe(0);

    db.close();
  });
});
