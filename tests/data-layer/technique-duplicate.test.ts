// @vitest-environment node

/**
 * Nyquist test: technique duplicate produces fully-fresh IDs (TECH-04).
 *
 * Proves that duplicateTechnique creates a completely independent copy —
 * no shared PKs between original and duplicate across techniques, sections,
 * steps, and colour slots.
 *
 * Wave 0 — RED until duplicateTechnique is implemented in plan 02.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb, createDbBridge } from "./db-helpers";

// Mock the Tauri DB client so the query functions use our better-sqlite3 instance
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";

// Import the function under test — RED until plan 02 implements it
import { duplicateTechnique } from "@/db/queries/techniques";

let db: Database.Database;

let originalTechniqueId: number;

describe("technique duplicate — fresh IDs (TECH-04)", () => {
  beforeEach(() => {
    db = createHobbyforgeDb();
    // Wire the getDb mock to use our better-sqlite3 instance via the bridge
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);

    // Seed a technique with sections, steps, and slots
    const techResult = db
      .prepare("INSERT INTO techniques (name, effect, difficulty) VALUES (?, ?, ?)")
      .run("OSL Glow", "OSL", "Advanced");
    originalTechniqueId = Number(techResult.lastInsertRowid);

    const section1Result = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(originalTechniqueId, "Glow Base", 0);
    const section1Id = Number(section1Result.lastInsertRowid);

    const section2Result = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(originalTechniqueId, "Glow Bloom", 1);
    const section2Id = Number(section2Result.lastInsertRowid);

    const slotResult = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, role_hint, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(originalTechniqueId, "Glow Core", "brightest point", 0);
    const slotId = Number(slotResult.lastInsertRowid);

    db.prepare(
      "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
    ).run(section1Id, null, "Basecoat", 0);

    db.prepare(
      "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
    ).run(section1Id, slotId, "First glow layer", 1);

    db.prepare(
      "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
    ).run(section2Id, slotId, "Second glow bloom", 0);
  });

  afterEach(() => {
    db.close();
  });

  // RED until plan 02 implements duplicateTechnique
  it("duplicateTechnique returns a new technique id that differs from the original", async () => {
    const newId = await duplicateTechnique(
      originalTechniqueId,
      "Copy of OSL Glow",
    );
    expect(newId).not.toBe(originalTechniqueId);
    expect(typeof newId).toBe("number");
  });

  it("all technique_colour_slots ids in the copy differ from the original's slot ids", async () => {
    const newId = await duplicateTechnique(
      originalTechniqueId,
      "Copy of OSL Glow",
    );

    const originalSlotIds = (
      db
        .prepare(
          "SELECT id FROM technique_colour_slots WHERE technique_id = ? ORDER BY id",
        )
        .all(originalTechniqueId) as { id: number }[]
    ).map((r) => r.id);

    const copySlotIds = (
      db
        .prepare(
          "SELECT id FROM technique_colour_slots WHERE technique_id = ? ORDER BY id",
        )
        .all(newId) as { id: number }[]
    ).map((r) => r.id);

    expect(copySlotIds.length).toBe(originalSlotIds.length);
    expect(copySlotIds.length).toBeGreaterThan(0);

    // No shared PKs between original and copy
    const shared = originalSlotIds.filter((id) => copySlotIds.includes(id));
    expect(shared).toHaveLength(0);
  });

  it("all technique_sections ids in the copy differ from the original's section ids", async () => {
    const newId = await duplicateTechnique(
      originalTechniqueId,
      "Copy of OSL Glow",
    );

    const originalSectionIds = (
      db
        .prepare(
          "SELECT id FROM technique_sections WHERE technique_id = ? ORDER BY id",
        )
        .all(originalTechniqueId) as { id: number }[]
    ).map((r) => r.id);

    const copySectionIds = (
      db
        .prepare(
          "SELECT id FROM technique_sections WHERE technique_id = ? ORDER BY id",
        )
        .all(newId) as { id: number }[]
    ).map((r) => r.id);

    expect(copySectionIds.length).toBe(originalSectionIds.length);

    const shared = originalSectionIds.filter((id) => copySectionIds.includes(id));
    expect(shared).toHaveLength(0);
  });

  it("all technique_steps ids in the copy differ from the original's step ids", async () => {
    const newId = await duplicateTechnique(
      originalTechniqueId,
      "Copy of OSL Glow",
    );

    // Get all original step ids (joining through sections)
    const originalStepIds = (
      db
        .prepare(
          `SELECT ts.id FROM technique_steps ts
           JOIN technique_sections sec ON sec.id = ts.technique_section_id
           WHERE sec.technique_id = ?
           ORDER BY ts.id`,
        )
        .all(originalTechniqueId) as { id: number }[]
    ).map((r) => r.id);

    const copyStepIds = (
      db
        .prepare(
          `SELECT ts.id FROM technique_steps ts
           JOIN technique_sections sec ON sec.id = ts.technique_section_id
           WHERE sec.technique_id = ?
           ORDER BY ts.id`,
        )
        .all(newId) as { id: number }[]
    ).map((r) => r.id);

    expect(copyStepIds.length).toBe(originalStepIds.length);
    expect(copyStepIds.length).toBeGreaterThan(0);

    const shared = originalStepIds.filter((id) => copyStepIds.includes(id));
    expect(shared).toHaveLength(0);
  });

  it("copy technique has the new name and same effect/difficulty as original", async () => {
    const newId = await duplicateTechnique(
      originalTechniqueId,
      "Copy of OSL Glow",
    );

    const original = db
      .prepare("SELECT name, effect, difficulty FROM techniques WHERE id = ?")
      .get(originalTechniqueId) as
      | { name: string; effect: string; difficulty: string }
      | undefined;

    const copy = db
      .prepare("SELECT name, effect, difficulty FROM techniques WHERE id = ?")
      .get(newId) as
      | { name: string; effect: string; difficulty: string }
      | undefined;

    expect(copy).toBeDefined();
    expect(copy!.name).toBe("Copy of OSL Glow");
    expect(copy!.effect).toBe(original!.effect);
    expect(copy!.difficulty).toBe(original!.difficulty);
  });
});
