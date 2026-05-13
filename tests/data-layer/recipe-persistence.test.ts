// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createTestSection,
} from "./db-helpers";

describe("recipe persistence", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createHobbyforgeDb();
  });

  afterEach(() => {
    db.close();
  });

  it("paintless step round-trip — paint_id = NULL persists and returns NULL (D-07)", () => {
    const recipeId = createTestRecipe(db);
    const sectionId = createTestSection(db, recipeId, "Base Coat");

    // INSERT a recipe_steps row with paint_id = NULL (paintless step)
    // Migration 022 rebuilt recipe_steps to make paint_id nullable
    const result = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index) VALUES (?, ?, NULL, ?, ?)",
      )
      .run(recipeId, sectionId, "Dry brush highlight", 0);

    const stepId = Number(result.lastInsertRowid);
    expect(stepId).toBeGreaterThan(0);

    // SELECT back and verify paint_id IS NULL
    const row = db
      .prepare("SELECT id, recipe_id, section_id, paint_id, step_name FROM recipe_steps WHERE id = ?")
      .get(stepId) as { id: number; recipe_id: number; section_id: number; paint_id: number | null; step_name: string };

    expect(row).toBeDefined();
    expect(row.id).toBe(stepId);
    expect(row.recipe_id).toBe(recipeId);
    expect(row.section_id).toBe(sectionId);
    expect(row.paint_id).toBeNull();
    expect(row.step_name).toBe("Dry brush highlight");
  });

  it("non-destructive save preserves IDs across UPDATEs (D-08)", () => {
    const recipeId = createTestRecipe(db);
    const sectionId = createTestSection(db, recipeId, "Base Coat");

    // INSERT two recipe_steps rows
    const step1Result = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index) VALUES (?, ?, NULL, ?, ?)",
      )
      .run(recipeId, sectionId, "Step one", 0);
    const step1Id = Number(step1Result.lastInsertRowid);

    const step2Result = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index) VALUES (?, ?, NULL, ?, ?)",
      )
      .run(recipeId, sectionId, "Step two", 1);
    const step2Id = Number(step2Result.lastInsertRowid);

    // Record original IDs
    expect(step1Id).toBeGreaterThan(0);
    expect(step2Id).toBeGreaterThan(0);
    expect(step2Id).not.toBe(step1Id);

    // UPDATE step_name on step 1 (non-destructive: UPDATE in place, not DELETE + re-INSERT)
    db.prepare("UPDATE recipe_steps SET step_name = ? WHERE id = ?").run(
      "Step one updated",
      step1Id,
    );

    // UPDATE section name
    db.prepare("UPDATE recipe_sections SET name = ? WHERE id = ?").run(
      "Base Coat Revised",
      sectionId,
    );

    // SELECT both steps back — IDs must be unchanged
    const steps = db
      .prepare(
        "SELECT id, step_name FROM recipe_steps WHERE section_id = ? ORDER BY order_index",
      )
      .all(sectionId) as { id: number; step_name: string }[];

    expect(steps).toHaveLength(2);
    expect(steps[0].id).toBe(step1Id);
    expect(steps[0].step_name).toBe("Step one updated");
    expect(steps[1].id).toBe(step2Id);
    expect(steps[1].step_name).toBe("Step two");

    // Verify section ID unchanged
    const section = db
      .prepare("SELECT id, name FROM recipe_sections WHERE id = ?")
      .get(sectionId) as { id: number; name: string };

    expect(section.id).toBe(sectionId);
    expect(section.name).toBe("Base Coat Revised");
  });

  it("section deletion cascades to its steps (D-09)", () => {
    const recipeId = createTestRecipe(db);
    const sectionId = createTestSection(db, recipeId, "Wash");

    // INSERT two steps under the section
    db.prepare(
      "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index) VALUES (?, ?, NULL, ?, ?)",
    ).run(recipeId, sectionId, "Apply wash", 0);

    db.prepare(
      "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index) VALUES (?, ?, NULL, ?, ?)",
    ).run(recipeId, sectionId, "Clean up wash", 1);

    // Verify steps exist
    const beforeDelete = db
      .prepare("SELECT id FROM recipe_steps WHERE section_id = ?")
      .all(sectionId);
    expect(beforeDelete).toHaveLength(2);

    // DELETE the section — ON DELETE CASCADE should remove steps
    db.prepare("DELETE FROM recipe_sections WHERE id = ?").run(sectionId);

    // Verify steps are gone
    const afterDelete = db
      .prepare("SELECT id FROM recipe_steps WHERE section_id = ?")
      .all(sectionId);
    expect(afterDelete).toHaveLength(0);

    // Also verify section is gone
    const section = db
      .prepare("SELECT id FROM recipe_sections WHERE id = ?")
      .get(sectionId);
    expect(section).toBeUndefined();
  });
});
