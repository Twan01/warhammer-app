// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestFaction,
  createTestUnit,
  createTestRecipe,
  createTestSection,
} from "./db-helpers";

describe("session section FK", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createHobbyforgeDb();
  });

  afterEach(() => {
    db.close();
  });

  it("ON DELETE SET NULL — deleting section nullifies session FK but preserves session and section_name (D-10)", () => {
    // Build full FK chain: faction -> unit -> recipe -> section -> session
    const factionId = createTestFaction(db);
    const unitId = createTestUnit(db, factionId);
    const recipeId = createTestRecipe(db);
    const sectionId = createTestSection(db, recipeId, "Base Coat");

    // INSERT a painting_session with recipe_section_id pointing to the section
    const sessionResult = db
      .prepare(
        `INSERT INTO painting_sessions
           (unit_id, session_date, duration_minutes, recipe_id, recipe_section_id, section_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(unitId, "2026-01-01", 30, recipeId, sectionId, "Base Coat");

    const sessionId = Number(sessionResult.lastInsertRowid);
    expect(sessionId).toBeGreaterThan(0);

    // Verify FK is set before deletion
    const before = db
      .prepare(
        "SELECT recipe_section_id, section_name FROM painting_sessions WHERE id = ?",
      )
      .get(sessionId) as { recipe_section_id: number | null; section_name: string | null };

    expect(before.recipe_section_id).toBe(sectionId);
    expect(before.section_name).toBe("Base Coat");

    // DELETE the section — ON DELETE SET NULL should clear recipe_section_id
    db.prepare("DELETE FROM recipe_sections WHERE id = ?").run(sectionId);

    // Session still exists with recipe_section_id = NULL, section_name preserved
    const after = db
      .prepare(
        "SELECT id, unit_id, recipe_section_id, section_name, duration_minutes FROM painting_sessions WHERE id = ?",
      )
      .get(sessionId) as {
      id: number;
      unit_id: number;
      recipe_section_id: number | null;
      section_name: string | null;
      duration_minutes: number;
    };

    expect(after).toBeDefined();
    expect(after.id).toBe(sessionId);
    expect(after.unit_id).toBe(unitId);
    expect(after.recipe_section_id).toBeNull();
    // Denormalized section_name text is preserved even after FK is nullified
    expect(after.section_name).toBe("Base Coat");
    expect(after.duration_minutes).toBe(30);
  });

  it("dual-write stores section_id and section_name independently (D-11)", () => {
    const factionId = createTestFaction(db);
    const unitId = createTestUnit(db, factionId);
    const recipeId = createTestRecipe(db);
    const sectionId = createTestSection(db, recipeId, "Base Coat");

    // INSERT a painting_session with both recipe_section_id (FK) and section_name (text)
    const sessionResult = db
      .prepare(
        `INSERT INTO painting_sessions
           (unit_id, session_date, duration_minutes, recipe_id, recipe_section_id, section_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(unitId, "2026-01-01", 45, recipeId, sectionId, "Base Coat");

    const sessionId = Number(sessionResult.lastInsertRowid);

    // SELECT back and verify both columns store independently
    const row = db
      .prepare(
        "SELECT recipe_section_id, section_name FROM painting_sessions WHERE id = ?",
      )
      .get(sessionId) as { recipe_section_id: number | null; section_name: string | null };

    expect(row.recipe_section_id).toBe(sectionId);
    expect(row.section_name).toBe("Base Coat");

    // Verify the types are correct (number for FK, string for text)
    expect(typeof row.recipe_section_id).toBe("number");
    expect(typeof row.section_name).toBe("string");
  });
});
