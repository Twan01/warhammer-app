// @vitest-environment node

/**
 * Nyquist test: technique usage counts and step count JOIN query (TECH-03, TECH-05, LIB-01, LIB-02).
 *
 * Key correctness constraint: technique_steps has NO technique_id column.
 * Step counts must be derived via JOIN through technique_sections:
 *   technique_steps → technique_sections.id → technique_sections.technique_id
 *
 * A naive GROUP BY on technique_steps.technique_id would fail (column doesn't exist).
 * These tests verify the correct JOIN path and the usage_count query against
 * recipe_technique_instances.
 *
 * Wave 0 — RED until getTechniquesWithCounts and getTechniqueUsageCounts are
 * implemented in plan 02.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb, createTestRecipe, createDbBridge } from "./db-helpers";

// Mock the Tauri DB client so the query functions use our better-sqlite3 instance
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";

// Import functions under test — RED until plan 02 implements them
import {
  getTechniquesWithCounts,
  getTechniqueUsageCounts,
} from "@/db/queries/techniques";

let db: Database.Database;
let techniqueId: number;

describe("technique usage counts and step count via JOIN (TECH-03, TECH-05, LIB-01, LIB-02)", () => {
  beforeEach(() => {
    db = createHobbyforgeDb();
    // Wire the getDb mock to use our better-sqlite3 instance via the bridge
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);

    // Create a technique with two sections and 3 steps across them
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("Wet Blend Skin");
    techniqueId = Number(techResult.lastInsertRowid);

    const sec1Result = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Base Tones", 0);
    const sec1Id = Number(sec1Result.lastInsertRowid);

    const sec2Result = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Highlight Tones", 1);
    const sec2Id = Number(sec2Result.lastInsertRowid);

    // 2 steps in section 1
    db.prepare(
      "INSERT INTO technique_steps (technique_section_id, step_name, order_index) VALUES (?, ?, ?)",
    ).run(sec1Id, "Basecoat mix", 0);
    db.prepare(
      "INSERT INTO technique_steps (technique_section_id, step_name, order_index) VALUES (?, ?, ?)",
    ).run(sec1Id, "First blend", 1);

    // 1 step in section 2
    db.prepare(
      "INSERT INTO technique_steps (technique_section_id, step_name, order_index) VALUES (?, ?, ?)",
    ).run(sec2Id, "Highlight blend", 0);
  });

  afterEach(() => {
    db.close();
  });

  // step_count via JOIN through technique_sections (not a direct GROUP BY on technique_steps)
  it("getTechniquesWithCounts: step_count is derived via JOIN through technique_sections (3 steps across 2 sections)", async () => {
    const results = await getTechniquesWithCounts();
    const technique = results.find((t) => t.id === techniqueId);

    expect(technique).toBeDefined();
    // 2 steps in section 1 + 1 step in section 2 = 3 total
    expect(technique!.step_count).toBe(3);
  });

  it("getTechniquesWithCounts: usage_count is 0 when no recipe instances reference the technique", async () => {
    const results = await getTechniquesWithCounts();
    const technique = results.find((t) => t.id === techniqueId);

    expect(technique).toBeDefined();
    expect(technique!.usage_count).toBe(0);
  });

  it("getTechniqueUsageCounts: returns usage_count = 2 after inserting 2 recipe_technique_instances", async () => {
    const recipe1Id = createTestRecipe(db);
    const recipe2Id = createTestRecipe(db);

    db.prepare(
      "INSERT INTO recipe_technique_instances (recipe_id, technique_id) VALUES (?, ?)",
    ).run(recipe1Id, techniqueId);
    db.prepare(
      "INSERT INTO recipe_technique_instances (recipe_id, technique_id) VALUES (?, ?)",
    ).run(recipe2Id, techniqueId);

    const counts = await getTechniqueUsageCounts();
    const entry = counts.find((c) => c.technique_id === techniqueId);

    expect(entry).toBeDefined();
    expect(entry!.usage_count).toBe(2);
  });

  it("getTechniqueUsageCounts: usage_count drops to 1 after deleting one recipe_technique_instance", async () => {
    const recipe1Id = createTestRecipe(db);
    const recipe2Id = createTestRecipe(db);

    const instance1Result = db
      .prepare(
        "INSERT INTO recipe_technique_instances (recipe_id, technique_id) VALUES (?, ?)",
      )
      .run(recipe1Id, techniqueId);
    const instance1Id = Number(instance1Result.lastInsertRowid);

    db.prepare(
      "INSERT INTO recipe_technique_instances (recipe_id, technique_id) VALUES (?, ?)",
    ).run(recipe2Id, techniqueId);

    // Delete instance 1
    db.prepare(
      "DELETE FROM recipe_technique_instances WHERE id = ?",
    ).run(instance1Id);

    const counts = await getTechniqueUsageCounts();
    const entry = counts.find((c) => c.technique_id === techniqueId);

    expect(entry).toBeDefined();
    expect(entry!.usage_count).toBe(1);
  });

  it("getTechniquesWithCounts: slot_count reflects technique_colour_slots count", async () => {
    // Add 2 slots to the technique
    db.prepare(
      "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
    ).run(techniqueId, "Shadow", 0);
    db.prepare(
      "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
    ).run(techniqueId, "Highlight", 1);

    const results = await getTechniquesWithCounts();
    const technique = results.find((t) => t.id === techniqueId);

    expect(technique).toBeDefined();
    expect(technique!.slot_count).toBe(2);
  });
});
