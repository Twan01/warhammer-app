// @vitest-environment node

/**
 * Gap coverage for Phase 96 — Database Hardening (migration 033).
 *
 * Tests:
 * - ERR-05: WAL + busy_timeout PRAGMAs in client.ts (content-shape)
 * - DBH-01: FK indexes on all 30 columns + 1 composite
 * - DBH-02: Temporal DESC indexes
 * - DBH-03: CHECK constraints reject invalid data
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { createHobbyforgeDb, createTestFaction } from "./db-helpers";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ─── ERR-05: WAL + busy_timeout PRAGMAs (content-shape) ────────────────────

describe("ERR-05 — WAL + busy_timeout PRAGMAs in client.ts", () => {
  const clientSrc = readFileSync(
    resolve(repoRoot, "src/db/client.ts"),
    "utf-8",
  );

  it("sets PRAGMA journal_mode = WAL after connection", () => {
    expect(clientSrc).toMatch(/PRAGMA\s+journal_mode\s*=\s*WAL/i);
  });

  it("sets PRAGMA busy_timeout = 10000 after connection", () => {
    expect(clientSrc).toMatch(/PRAGMA\s+busy_timeout\s*=\s*10000/);
  });

  it("WAL and busy_timeout appear after foreign_keys PRAGMA (correct ordering)", () => {
    const fkPos = clientSrc.search(/PRAGMA\s+foreign_keys\s*=\s*ON/i);
    const walPos = clientSrc.search(/PRAGMA\s+journal_mode\s*=\s*WAL/i);
    const btPos = clientSrc.search(/PRAGMA\s+busy_timeout\s*=\s*10000/);
    expect(fkPos).toBeGreaterThanOrEqual(0);
    expect(walPos).toBeGreaterThan(fkPos);
    expect(btPos).toBeGreaterThan(fkPos);
  });
});

// ─── DBH-01: FK indexes on all 30 columns ──────────────────────────────────

describe("DBH-01 — FK indexes exist after migration chain", () => {
  let db: Database.Database;

  beforeAll(() => {
    db = createHobbyforgeDb();
  });

  afterAll(() => {
    db.close();
  });

  it("has at least 31 idx_* indexes (30 FK + 1 composite)", () => {
    const rows = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
      )
      .all() as { name: string }[];
    expect(rows.length).toBeGreaterThanOrEqual(31);
  });

  it.each([
    "idx_units_faction_id",
    "idx_painting_recipes_faction_id",
    "idx_painting_recipes_unit_id",
    "idx_recipe_steps_recipe_id",
    "idx_recipe_steps_paint_id",
    "idx_recipe_steps_alt_paint_id",
    "idx_recipe_steps_section_id",
    "idx_army_lists_faction_id",
    "idx_army_list_units_list_id",
    "idx_army_list_units_unit_id",
    "idx_army_list_units_leader_attached_to_id",
    "idx_unit_strategy_notes_unit_id",
    "idx_battle_logs_army_list_id",
    "idx_battle_logs_mvp_unit_id",
    "idx_battle_logs_underperforming_unit_id",
    "idx_image_assets_entity",
    "idx_painting_sessions_unit_id",
    "idx_painting_sessions_recipe_id",
    "idx_painting_sessions_recipe_step_id",
    "idx_painting_sessions_recipe_section_id",
    "idx_wishlist_items_faction_id",
    "idx_unit_point_tiers_unit_id",
    "idx_unit_loadouts_unit_id",
    "idx_unit_loadout_wargear_loadout_id",
    "idx_recipe_sections_recipe_id",
    "idx_unit_recipe_assignments_unit_id",
    "idx_unit_recipe_assignments_recipe_id",
    "idx_unit_recipe_step_progress_assignment_id",
    "idx_unit_recipe_step_progress_recipe_step_id",
    "idx_army_list_enhancements_list_id",
    "idx_army_list_enhancements_army_list_unit_id",
  ])("index %s exists", (indexName) => {
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name = ?",
      )
      .get(indexName) as { name: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.name).toBe(indexName);
  });
});

// ─── DBH-02: Temporal DESC indexes ─────────────────────────────────────────

describe("DBH-02 — Temporal DESC indexes", () => {
  let db: Database.Database;

  beforeAll(() => {
    db = createHobbyforgeDb();
  });

  afterAll(() => {
    db.close();
  });

  it("idx_painting_sessions_session_date exists", () => {
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_painting_sessions_session_date'",
      )
      .get() as { name: string } | undefined;
    expect(row).toBeDefined();
  });

  it("idx_battle_logs_battle_date exists", () => {
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_battle_logs_battle_date'",
      )
      .get() as { name: string } | undefined;
    expect(row).toBeDefined();
  });

  it("painting_sessions_session_date index includes DESC in its SQL definition", () => {
    const row = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='index' AND name = 'idx_painting_sessions_session_date'",
      )
      .get() as { sql: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.sql).toMatch(/DESC/i);
  });

  it("battle_logs_battle_date index includes DESC in its SQL definition", () => {
    const row = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='index' AND name = 'idx_battle_logs_battle_date'",
      )
      .get() as { sql: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.sql).toMatch(/DESC/i);
  });
});

// ─── DBH-03: CHECK constraints reject invalid data ─────────────────────────

describe("DBH-03 — CHECK constraints reject invalid data", () => {
  let db: Database.Database;
  let factionId: number;

  beforeAll(() => {
    db = createHobbyforgeDb();
    factionId = createTestFaction(db);
  });

  afterAll(() => {
    db.close();
  });

  it("rejects a unit with negative points", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO units (faction_id, name, points, status_painting, painting_percentage) VALUES (?, ?, ?, ?, ?)",
      ).run(factionId, "Bad Unit", -1, "Not Started", 0);
    }).toThrow(/CHECK/i);
  });

  it("rejects a unit with painting_percentage = -1", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO units (faction_id, name, status_painting, painting_percentage) VALUES (?, ?, ?, ?)",
      ).run(factionId, "Bad Unit", "Not Started", -1);
    }).toThrow(/CHECK/i);
  });

  it("rejects a unit with painting_percentage = 101", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO units (faction_id, name, status_painting, painting_percentage) VALUES (?, ?, ?, ?)",
      ).run(factionId, "Bad Unit", "Not Started", 101);
    }).toThrow(/CHECK/i);
  });

  it("rejects a paint with negative quantity", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO paints (brand, name, paint_type, quantity) VALUES (?, ?, ?, ?)",
      ).run("Citadel", "Bad Paint", "Base", -1);
    }).toThrow(/CHECK/i);
  });

  it("rejects a unit with negative model_count", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO units (faction_id, name, status_painting, painting_percentage, model_count) VALUES (?, ?, ?, ?, ?)",
      ).run(factionId, "Bad Unit", "Not Started", 0, -5);
    }).toThrow(/CHECK/i);
  });

  it("rejects a paint with negative purchase_price_pence", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO paints (brand, name, paint_type, purchase_price_pence) VALUES (?, ?, ?, ?)",
      ).run("Citadel", "Bad Paint", "Base", -100);
    }).toThrow(/CHECK/i);
  });

  it("accepts a valid unit with zero points and 50% painting", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO units (faction_id, name, points, status_painting, painting_percentage) VALUES (?, ?, ?, ?, ?)",
      ).run(factionId, "Good Unit", 0, "Not Started", 50);
    }).not.toThrow();
  });

  it("accepts a valid unit with NULL points (unset)", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO units (faction_id, name, status_painting, painting_percentage) VALUES (?, ?, ?, ?)",
      ).run(factionId, "Good Unit Null Points", "Not Started", 0);
    }).not.toThrow();
  });

  it("accepts boundary values: painting_percentage = 0 and 100", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO units (faction_id, name, status_painting, painting_percentage) VALUES (?, ?, ?, ?)",
      ).run(factionId, "Unit at 0%", "Not Started", 0);
    }).not.toThrow();
    expect(() => {
      db.prepare(
        "INSERT INTO units (faction_id, name, status_painting, painting_percentage) VALUES (?, ?, ?, ?)",
      ).run(factionId, "Unit at 100%", "Not Started", 100);
    }).not.toThrow();
  });

  it("accepts a valid paint with positive quantity", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO paints (brand, name, paint_type, quantity) VALUES (?, ?, ?, ?)",
      ).run("Citadel", "Good Paint", "Base", 3);
    }).not.toThrow();
  });
});
