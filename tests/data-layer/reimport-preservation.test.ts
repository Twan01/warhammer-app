// @vitest-environment node

/**
 * DAT-03 D-07: Re-import preservation guarantee.
 *
 * Asserts that user data in hobbyforge.db tables (unit_overrides,
 * rules_favorites, rules_notes) is NOT touched by a simulated DELETE-all+INSERT
 * of udb_* tables (the re-import cycle that runs on every app launch or
 * bulk_sync_rules Tauri command).
 *
 * Also asserts that units.udb_unit_id (nullable FK ON DELETE SET NULL, migration 039)
 * resolves to a non-null udb_units row after re-import, because the udb_units row
 * is re-inserted with the same Wahapedia ID.
 *
 * The re-import simulation deletes all udb_* tables under FK-OFF; the order is
 * functionally irrelevant because FK enforcement is disabled during the delete pass.
 * (The real lib.rs import also runs all deletes under FK-OFF for the same reason.)
 *
 * Uses createHobbyforgeDb() from db-helpers (all 50+ migrations, PRAGMA FK = ON).
 * Each test gets a fresh in-memory DB via beforeEach/afterEach — no state leaks.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb, createTestFaction, createTestUnit } from "./db-helpers";

// ---------------------------------------------------------------------------
// Helpers for seeding udb_* rows
// ---------------------------------------------------------------------------

/** Seed one udb_factions row. */
function seedUdbFaction(db: Database.Database, id: string, name: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO udb_factions (id, name, updated_at) VALUES (?, ?, datetime('now'))`,
  ).run(id, name);
}

/** Seed one udb_units row (minimal columns). */
function seedUdbUnit(db: Database.Database, unitId: string, factionId: string, name: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO udb_units
       (id, faction_id, name, role, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  ).run(unitId, factionId, name, "Battleline");
}

/**
 * Simulate the re-import: FK OFF, delete all udb_* tables in lib.rs order,
 * re-insert the same udb_* rows (same Wahapedia IDs), FK ON.
 */
function simulateReimport(
  db: Database.Database,
  udbFactions: Array<{ id: string; name: string }>,
  udbUnits: Array<{ id: string; factionId: string; name: string }>,
): void {
  db.pragma("foreign_keys = OFF");

  // DELETE all udb_* tables under FK-OFF — order is irrelevant because FK
  // enforcement is disabled during the delete pass (same as lib.rs behavior)
  db.prepare(`DELETE FROM udb_leader_targets`).run();
  db.prepare(`DELETE FROM udb_unit_keywords`).run();
  db.prepare(`DELETE FROM udb_unit_points`).run();
  db.prepare(`DELETE FROM udb_unit_composition`).run();
  db.prepare(`DELETE FROM udb_unit_abilities`).run();
  db.prepare(`DELETE FROM udb_unit_weapons`).run();
  db.prepare(`DELETE FROM udb_unit_models`).run();
  db.prepare(`DELETE FROM udb_units`).run();
  // Also delete detachment / stratagem tables to mirror full re-import
  db.prepare(`DELETE FROM udb_detachment_abilities`).run();
  db.prepare(`DELETE FROM udb_detachments`).run();
  db.prepare(`DELETE FROM udb_enhancements`).run();
  db.prepare(`DELETE FROM udb_stratagems`).run();
  db.prepare(`DELETE FROM udb_meta`).run();
  db.prepare(`DELETE FROM udb_factions`).run();

  // Re-INSERT with same Wahapedia IDs
  for (const f of udbFactions) {
    seedUdbFaction(db, f.id, f.name);
  }
  for (const u of udbUnits) {
    seedUdbUnit(db, u.id, u.factionId, u.name);
  }

  db.pragma("foreign_keys = ON");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reimport preservation (DAT-03 D-07)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createHobbyforgeDb();
  });

  afterEach(() => {
    db.close();
  });

  // -------------------------------------------------------------------------
  // Test 1: rules_favorites survive re-import
  // -------------------------------------------------------------------------
  it("rules_favorites survive DELETE-all+INSERT re-import of udb_* tables", () => {
    // 1. Seed udb_* rows (FK OFF to avoid ordering constraints during seed)
    db.pragma("foreign_keys = OFF");
    seedUdbFaction(db, "SM", "Space Marines");
    seedUdbUnit(db, "000000001", "SM", "Intercessor Squad");
    db.pragma("foreign_keys = ON");

    // 2. Seed rules_favorites pointing to the Wahapedia unit/ability ID
    //    rule_type must be one of: 'stratagem', 'detachment_ability', 'shared_ability'
    db.prepare(
      `INSERT INTO rules_favorites (rule_id, rule_type, rule_name) VALUES (?, ?, ?)`,
    ).run("000000001", "shared_ability", "And They Shall Know No Fear");

    // Verify row was inserted
    const before = db
      .prepare(`SELECT rule_id, rule_type FROM rules_favorites WHERE rule_id = ?`)
      .get("000000001") as { rule_id: string; rule_type: string } | undefined;
    expect(before).toBeDefined();
    expect(before!.rule_id).toBe("000000001");

    // 3. Simulate re-import
    simulateReimport(
      db,
      [{ id: "SM", name: "Space Marines" }],
      [{ id: "000000001", factionId: "SM", name: "Intercessor Squad" }],
    );

    // 4. Assert rules_favorites row survived
    const after = db
      .prepare(`SELECT rule_id, rule_type, rule_name FROM rules_favorites WHERE rule_id = ?`)
      .get("000000001") as { rule_id: string; rule_type: string; rule_name: string } | undefined;
    expect(after, "rules_favorites row should survive re-import").toBeDefined();
    expect(after!.rule_id).toBe("000000001");
    expect(after!.rule_type).toBe("shared_ability");
    expect(after!.rule_name).toBe("And They Shall Know No Fear");
  });

  // -------------------------------------------------------------------------
  // Test 2: rules_notes survive re-import
  // -------------------------------------------------------------------------
  it("rules_notes survive DELETE-all+INSERT re-import of udb_* tables", () => {
    // 1. Seed udb_* rows
    db.pragma("foreign_keys = OFF");
    seedUdbFaction(db, "NEC", "Necrons");
    seedUdbUnit(db, "000000100", "NEC", "Warriors");
    db.pragma("foreign_keys = ON");

    // 2. Seed rules_notes
    db.prepare(
      `INSERT INTO rules_notes (rule_id, rule_type, rule_name, note_text) VALUES (?, ?, ?, ?)`,
    ).run("000000100", "stratagem", "Enmitic Obliterator", "Use before shooting phase");

    // Verify
    const before = db
      .prepare(`SELECT note_text FROM rules_notes WHERE rule_id = ?`)
      .get("000000100") as { note_text: string } | undefined;
    expect(before).toBeDefined();

    // 3. Simulate re-import
    simulateReimport(
      db,
      [{ id: "NEC", name: "Necrons" }],
      [{ id: "000000100", factionId: "NEC", name: "Warriors" }],
    );

    // 4. Assert rules_notes row survived
    const after = db
      .prepare(`SELECT rule_id, rule_type, note_text FROM rules_notes WHERE rule_id = ?`)
      .get("000000100") as { rule_id: string; rule_type: string; note_text: string } | undefined;
    expect(after, "rules_notes row should survive re-import").toBeDefined();
    expect(after!.rule_id).toBe("000000100");
    expect(after!.note_text).toBe("Use before shooting phase");
  });

  // -------------------------------------------------------------------------
  // Test 3: unit_overrides survive re-import
  // -------------------------------------------------------------------------
  it("unit_overrides survive DELETE-all+INSERT re-import of udb_* tables", () => {
    // 1. Seed udb_* rows
    db.pragma("foreign_keys = OFF");
    seedUdbFaction(db, "SM", "Space Marines");
    seedUdbUnit(db, "000000001", "SM", "Intercessor Squad");
    db.pragma("foreign_keys = ON");

    // 2. Seed a collection faction + unit (the unit_overrides are keyed on units.id)
    const factionId = createTestFaction(db);
    const unitId = createTestUnit(db, factionId);

    // Override points and toughness for this collection unit
    db.prepare(
      `INSERT INTO unit_overrides (unit_id, points, toughness) VALUES (?, ?, ?)`,
    ).run(unitId, 150, 5);

    // Verify
    const before = db
      .prepare(`SELECT points, toughness FROM unit_overrides WHERE unit_id = ?`)
      .get(unitId) as { points: number; toughness: number } | undefined;
    expect(before).toBeDefined();
    expect(before!.points).toBe(150);

    // 3. Simulate re-import
    simulateReimport(
      db,
      [{ id: "SM", name: "Space Marines" }],
      [{ id: "000000001", factionId: "SM", name: "Intercessor Squad" }],
    );

    // 4. Assert unit_overrides row survived
    const after = db
      .prepare(`SELECT unit_id, points, toughness FROM unit_overrides WHERE unit_id = ?`)
      .get(unitId) as { unit_id: number; points: number; toughness: number } | undefined;
    expect(after, "unit_overrides row should survive re-import").toBeDefined();
    expect(after!.unit_id).toBe(unitId);
    expect(after!.points).toBe(150);
    expect(after!.toughness).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Test 4: units.udb_unit_id resolves non-null after re-import
  // -------------------------------------------------------------------------
  it("units.udb_unit_id stays non-null after re-import when udb_unit is re-inserted with same ID", () => {
    const wahapediaId = "000000042";

    // 1. Seed udb_* rows
    db.pragma("foreign_keys = OFF");
    seedUdbFaction(db, "SM", "Space Marines");
    seedUdbUnit(db, wahapediaId, "SM", "Captain");
    db.pragma("foreign_keys = ON");

    // 2. Seed a collection unit and link it to the udb_unit
    const factionId = createTestFaction(db);
    const unitId = createTestUnit(db, factionId);

    // Set the udb_unit_id FK (migration 039 — nullable, ON DELETE SET NULL)
    db.prepare(`UPDATE units SET udb_unit_id = ? WHERE id = ?`).run(wahapediaId, unitId);

    // Verify link exists
    const before = db
      .prepare(`SELECT udb_unit_id FROM units WHERE id = ?`)
      .get(unitId) as { udb_unit_id: string | null } | undefined;
    expect(before).toBeDefined();
    expect(before!.udb_unit_id).toBe(wahapediaId);

    // 3. Simulate re-import (re-inserts with SAME Wahapedia ID)
    simulateReimport(
      db,
      [{ id: "SM", name: "Space Marines" }],
      [{ id: wahapediaId, factionId: "SM", name: "Captain" }],
    );

    // 4. Assert udb_unit_id still non-null (ON DELETE SET NULL should NOT have fired
    //    because the row was re-inserted with the same ID)
    const after = db
      .prepare(`SELECT udb_unit_id FROM units WHERE id = ?`)
      .get(unitId) as { udb_unit_id: string | null } | undefined;
    expect(after, "units row should still exist after re-import").toBeDefined();
    expect(after!.udb_unit_id, "udb_unit_id should be non-null when udb_unit is re-inserted with same ID").toBe(wahapediaId);

    // 5. Verify the udb_units row also exists (cross-check FK resolves)
    const udbUnit = db
      .prepare(`SELECT id FROM udb_units WHERE id = ?`)
      .get(wahapediaId) as { id: string } | undefined;
    expect(udbUnit, "udb_units row should exist after re-import").toBeDefined();
    expect(udbUnit!.id).toBe(wahapediaId);
  });

  // -------------------------------------------------------------------------
  // Test 5: Idempotency — second re-import also leaves user rows intact
  // -------------------------------------------------------------------------
  it("re-import is idempotent: second DELETE/re-INSERT does not clobber user rows", () => {
    // 1. Seed udb_* rows
    db.pragma("foreign_keys = OFF");
    seedUdbFaction(db, "DG", "Death Guard");
    seedUdbUnit(db, "000000200", "DG", "Plague Marines");
    db.pragma("foreign_keys = ON");

    // 2. Seed all three user tables
    db.prepare(
      `INSERT INTO rules_favorites (rule_id, rule_type, rule_name) VALUES (?, ?, ?)`,
    ).run("000000200", "shared_ability", "Inexorable Advance");

    db.prepare(
      `INSERT INTO rules_notes (rule_id, rule_type, rule_name, note_text) VALUES (?, ?, ?, ?)`,
    ).run("000000200", "stratagem", "Plague Weapon", "Roll 6+ for extra mortal wound");

    const factionId = createTestFaction(db);
    const unitId = createTestUnit(db, factionId);
    db.prepare(`INSERT INTO unit_overrides (unit_id, wounds) VALUES (?, ?)`).run(unitId, 3);

    // 3. First re-import
    simulateReimport(
      db,
      [{ id: "DG", name: "Death Guard" }],
      [{ id: "000000200", factionId: "DG", name: "Plague Marines" }],
    );

    // 4. Second re-import (idempotency assertion)
    simulateReimport(
      db,
      [{ id: "DG", name: "Death Guard" }],
      [{ id: "000000200", factionId: "DG", name: "Plague Marines" }],
    );

    // 5. Assert all three user tables still intact after second re-import
    const fav = db
      .prepare(`SELECT rule_id FROM rules_favorites WHERE rule_id = ?`)
      .get("000000200") as { rule_id: string } | undefined;
    expect(fav, "rules_favorites survives second re-import").toBeDefined();

    const note = db
      .prepare(`SELECT note_text FROM rules_notes WHERE rule_id = ?`)
      .get("000000200") as { note_text: string } | undefined;
    expect(note, "rules_notes survives second re-import").toBeDefined();
    expect(note!.note_text).toBe("Roll 6+ for extra mortal wound");

    const override = db
      .prepare(`SELECT wounds FROM unit_overrides WHERE unit_id = ?`)
      .get(unitId) as { wounds: number } | undefined;
    expect(override, "unit_overrides survives second re-import").toBeDefined();
    expect(override!.wounds).toBe(3);
  });
});
