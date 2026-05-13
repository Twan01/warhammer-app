// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb, createRulesDb } from "./db-helpers";

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

describe("schema shape", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createHobbyforgeDb();
  });

  afterEach(() => {
    db.close();
  });

  it("expected tables exist after full migration chain (D-12)", () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_sqlx%' ORDER BY name",
      )
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    // recipe_paints was renamed to recipe_steps in migration 012
    const expectedTables = [
      "factions",
      "units",
      "paints",
      "painting_recipes",
      "recipe_steps",
      "army_lists",
      "army_list_units",
      "unit_strategy_notes",
      "battle_logs",
      "image_assets",
      "painting_sessions",
      "recipe_sections",
      "unit_recipe_assignments",
      "unit_recipe_step_progress",
    ];

    for (const table of expectedTables) {
      expect(tableNames).toContain(table);
    }
  });

  it("recipe_sections has workflow metadata columns (D-13 - migration 020)", () => {
    const columns = db.pragma("table_info(recipe_sections)") as ColumnInfo[];

    const metadataColumns = [
      "section_type",
      "technique",
      "execution_mode",
      "applies_to",
    ];

    for (const colName of metadataColumns) {
      const col = columns.find((c) => c.name === colName);
      expect(col, `column ${colName} should exist`).toBeDefined();
      expect(col!.notnull, `column ${colName} should be nullable`).toBe(0);
    }
  });

  it("recipe_steps.paint_id is nullable (D-13 - migration 022)", () => {
    const columns = db.pragma("table_info(recipe_steps)") as ColumnInfo[];
    const paintId = columns.find((c) => c.name === "paint_id");
    expect(paintId, "paint_id column should exist").toBeDefined();
    expect(paintId!.notnull, "paint_id should be nullable").toBe(0);
  });

  it("painting_sessions.recipe_section_id exists and is nullable (D-13 - migration 023)", () => {
    const columns = db.pragma(
      "table_info(painting_sessions)",
    ) as ColumnInfo[];
    const recipeSectionId = columns.find(
      (c) => c.name === "recipe_section_id",
    );
    expect(
      recipeSectionId,
      "recipe_section_id column should exist",
    ).toBeDefined();
    expect(
      recipeSectionId!.notnull,
      "recipe_section_id should be nullable",
    ).toBe(0);
  });

  it("rules DB tables exist (D-12 for rules)", () => {
    db.close(); // close hobbyforge db from beforeEach
    const rulesDb = createRulesDb();

    const tables = rulesDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    // Rules tables use "rw_" prefix (e.g., rw_datasheets, rw_factions)
    expect(tableNames).toContain("rw_datasheets");

    rulesDb.close();
    // Recreate hobbyforge db so afterEach close doesn't error
    db = createHobbyforgeDb();
  });
});
