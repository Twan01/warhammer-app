// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

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

  it("army_list_unit_wargear has expected columns (D-03 - migration 047)", () => {
    const columns = db.pragma(
      "table_info(army_list_unit_wargear)",
    ) as ColumnInfo[];

    const expectedColumns = [
      "id",
      "army_list_unit_id",
      "weapon_name",
      "quantity",
      "created_at",
    ];

    for (const colName of expectedColumns) {
      const col = columns.find((c) => c.name === colName);
      expect(col, `column ${colName} should exist`).toBeDefined();
    }
  });

  // Phase 107: rules.db eliminated — rules DB table test removed
  it.todo("rules DB tables exist (D-12 for rules) — rules.db removed in Phase 107");
});
