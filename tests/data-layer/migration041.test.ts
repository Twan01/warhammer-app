// @vitest-environment node
/**
 * Gap 10 (FR-01) -- Migration 041 behavioral tests.
 *
 * FR-01: Migration 041 adds sub_faction and _fr columns to udb_* tables.
 * Uses the same better-sqlite3 in-memory DB approach as migration038.test.ts.
 */
import { describe, it, expect } from "vitest";
import { createHobbyforgeDb } from "./db-helpers";

describe("migration 041 — udb_sub_faction_fr schema", () => {
  it("adds sub_faction TEXT column to udb_units", () => {
    const db = createHobbyforgeDb();
    const cols = db.pragma("table_info(udb_units)") as Array<{ name: string; type: string }>;
    db.close();

    const subFaction = cols.find((c) => c.name === "sub_faction");
    expect(subFaction).toBeDefined();
    expect(subFaction!.type.toUpperCase()).toBe("TEXT");
  });

  it("adds name_fr TEXT column to udb_factions", () => {
    const db = createHobbyforgeDb();
    const cols = db.pragma("table_info(udb_factions)") as Array<{ name: string; type: string }>;
    db.close();

    const nameFr = cols.find((c) => c.name === "name_fr");
    expect(nameFr).toBeDefined();
    expect(nameFr!.type.toUpperCase()).toBe("TEXT");
  });

  it("adds name_fr TEXT column to udb_units", () => {
    const db = createHobbyforgeDb();
    const cols = db.pragma("table_info(udb_units)") as Array<{ name: string; type: string }>;
    db.close();

    const nameFr = cols.find((c) => c.name === "name_fr");
    expect(nameFr).toBeDefined();
    expect(nameFr!.type.toUpperCase()).toBe("TEXT");
  });

  it("adds name_fr TEXT column to udb_unit_abilities", () => {
    const db = createHobbyforgeDb();
    const cols = db.pragma("table_info(udb_unit_abilities)") as Array<{ name: string; type: string }>;
    db.close();

    const nameFr = cols.find((c) => c.name === "name_fr");
    expect(nameFr).toBeDefined();
    expect(nameFr!.type.toUpperCase()).toBe("TEXT");
  });

  it("adds description_fr TEXT column to udb_unit_abilities", () => {
    const db = createHobbyforgeDb();
    const cols = db.pragma("table_info(udb_unit_abilities)") as Array<{ name: string; type: string }>;
    db.close();

    const descFr = cols.find((c) => c.name === "description_fr");
    expect(descFr).toBeDefined();
    expect(descFr!.type.toUpperCase()).toBe("TEXT");
  });

  it("adds name_fr TEXT column to udb_unit_weapons", () => {
    const db = createHobbyforgeDb();
    const cols = db.pragma("table_info(udb_unit_weapons)") as Array<{ name: string; type: string }>;
    db.close();

    const nameFr = cols.find((c) => c.name === "name_fr");
    expect(nameFr).toBeDefined();
    expect(nameFr!.type.toUpperCase()).toBe("TEXT");
  });

  it("adds keyword_fr TEXT column to udb_unit_keywords", () => {
    const db = createHobbyforgeDb();
    const cols = db.pragma("table_info(udb_unit_keywords)") as Array<{ name: string; type: string }>;
    db.close();

    const kwFr = cols.find((c) => c.name === "keyword_fr");
    expect(kwFr).toBeDefined();
    expect(kwFr!.type.toUpperCase()).toBe("TEXT");
  });

  it("all 7 new columns are nullable (no NOT NULL constraint)", () => {
    const db = createHobbyforgeDb();

    // Insert a faction and unit without providing any _fr or sub_faction values
    db.prepare("INSERT INTO udb_factions (id, name) VALUES ('SM', 'Space Marines')").run();
    db.prepare(
      "INSERT INTO udb_units (id, faction_id, name) VALUES ('unit-1', 'SM', 'Intercessors')"
    ).run();
    db.prepare(
      "INSERT INTO udb_unit_abilities (unit_id, line_order, name, description, ability_type) VALUES ('unit-1', 1, 'Test Ability', 'Desc', 'core')"
    ).run();
    db.prepare(
      "INSERT INTO udb_unit_weapons (unit_id, name) VALUES ('unit-1', 'Bolt Rifle')"
    ).run();
    db.prepare(
      "INSERT INTO udb_unit_keywords (unit_id, keyword, is_faction) VALUES ('unit-1', 'INFANTRY', 0)"
    ).run();

    // All new columns default to NULL
    const unit = db.prepare("SELECT sub_faction, name_fr FROM udb_units WHERE id = 'unit-1'").get() as {
      sub_faction: string | null;
      name_fr: string | null;
    };
    expect(unit.sub_faction).toBeNull();
    expect(unit.name_fr).toBeNull();

    const faction = db.prepare("SELECT name_fr FROM udb_factions WHERE id = 'SM'").get() as {
      name_fr: string | null;
    };
    expect(faction.name_fr).toBeNull();

    const ability = db.prepare(
      "SELECT name_fr, description_fr FROM udb_unit_abilities WHERE unit_id = 'unit-1'"
    ).get() as { name_fr: string | null; description_fr: string | null };
    expect(ability.name_fr).toBeNull();
    expect(ability.description_fr).toBeNull();

    const weapon = db.prepare(
      "SELECT name_fr FROM udb_unit_weapons WHERE unit_id = 'unit-1'"
    ).get() as { name_fr: string | null };
    expect(weapon.name_fr).toBeNull();

    const keyword = db.prepare(
      "SELECT keyword_fr FROM udb_unit_keywords WHERE unit_id = 'unit-1'"
    ).get() as { keyword_fr: string | null };
    expect(keyword.keyword_fr).toBeNull();

    db.close();
  });

  it("sub_faction column can store a string value", () => {
    const db = createHobbyforgeDb();

    db.prepare("INSERT INTO udb_factions (id, name) VALUES ('SM', 'Space Marines')").run();
    db.prepare(
      "INSERT INTO udb_units (id, faction_id, name, sub_faction) VALUES ('unit-1', 'SM', 'Intercessors', 'Ultramarines')"
    ).run();

    const unit = db.prepare("SELECT sub_faction FROM udb_units WHERE id = 'unit-1'").get() as {
      sub_faction: string | null;
    };
    expect(unit.sub_faction).toBe("Ultramarines");

    db.close();
  });

  it("migration 041 does NOT contain ALTER TABLE udb_search (FTS5 virtual table cannot be ALTERed)", () => {
    // The migration file may reference udb_search in comments but must not
    // contain any ALTER TABLE udb_search statement (FTS5 tables cannot be ALTERed).
    const { readFileSync } = require("node:fs");
    const { resolve, dirname } = require("node:path");
    const { fileURLToPath } = require("node:url");
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const sql = readFileSync(
      resolve(repoRoot, "src-tauri/migrations/041_udb_sub_faction_fr.sql"),
      "utf-8"
    );
    // Strip SQL comments before checking for ALTER TABLE udb_search
    const sqlWithoutComments = sql.replace(/--[^\n]*/g, "");
    expect(sqlWithoutComments).not.toContain("ALTER TABLE udb_search");
  });

  it("migration 041 contains exactly 7 ALTER TABLE statements", () => {
    const { readFileSync } = require("node:fs");
    const { resolve, dirname } = require("node:path");
    const { fileURLToPath } = require("node:url");
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const sql = readFileSync(
      resolve(repoRoot, "src-tauri/migrations/041_udb_sub_faction_fr.sql"),
      "utf-8"
    );
    const alterStatements = (sql.match(/ALTER TABLE/g) ?? []).length;
    expect(alterStatements).toBe(7);
  });
});
