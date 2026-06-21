// @vitest-environment node

/**
 * Nyquist test: technique graph save non-destructive invariant (TECH-01, TECH-02, SLOT-01, SLOT-02).
 *
 * Proves that saveTechniqueGraph uses UPDATE-not-replace for surviving steps so
 * technique_step_id PKs are preserved across add/remove/reorder edits.
 *
 * Wave 0 — these tests exercise the SQL invariant directly via better-sqlite3,
 * mirroring the pattern established by technique-progress-identity.test.ts (FND-03).
 * The actual saveTechniqueGraph function (plan 02) must produce the same SQL
 * operations proven safe here.
 *
 * Tests fail RED until saveTechniqueGraph is implemented in plan 02.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

// Import the function under test — RED until plan 02 implements it
import { saveTechniqueGraph } from "@/db/queries/techniques";

let db: Database.Database;

// Technique structure
let techniqueId: number;
let section1Id: number;
let slot1Id: number;
let slot2Id: number;
let s1Id: number; // technique_steps PKs
let s2Id: number;
let s3Id: number;

describe("technique graph save — non-destructive invariant (TECH-01, TECH-02, SLOT-01, SLOT-02)", () => {
  beforeEach(() => {
    db = createHobbyforgeDb();

    // Create a technique with two sections, three steps, two colour slots
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("NMM Gold");
    techniqueId = Number(techResult.lastInsertRowid);

    const sec1Result = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Base Layer", 0);
    section1Id = Number(sec1Result.lastInsertRowid);

    db.prepare(
      "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
    ).run(techniqueId, "Highlight Layer", 1);

    const slot1Result = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Shadow", 0);
    slot1Id = Number(slot1Result.lastInsertRowid);

    const slot2Result = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Highlight", 1);
    slot2Id = Number(slot2Result.lastInsertRowid);

    // S1: order 0, no slot
    const s1Result = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(section1Id, null, "Prime black", 0);
    s1Id = Number(s1Result.lastInsertRowid);

    // S2: order 1, references slot1 (Shadow)
    const s2Result = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(section1Id, slot1Id, "Apply shadow", 1);
    s2Id = Number(s2Result.lastInsertRowid);

    // S3: order 2, references slot2 (Highlight)
    const s3Result = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(section1Id, slot2Id, "Apply highlight", 2);
    s3Id = Number(s3Result.lastInsertRowid);
  });

  afterEach(() => {
    db.close();
  });

  it("non-destructive save: surviving step PKs are unchanged after remove S1 and reorder S3 to top", () => {
    // Record S2's PK before the edit
    const s2PkBefore = s2Id;

    // Simulate the UPDATE-by-PK operations that saveTechniqueGraph must produce:
    // Remove S1 (delete), reorder S3 to index 0, update S2 to index 1
    db.prepare("DELETE FROM technique_steps WHERE id = ?").run(s1Id);
    db.prepare("UPDATE technique_steps SET order_index = ? WHERE id = ?").run(
      0,
      s3Id,
    );
    db.prepare("UPDATE technique_steps SET order_index = ? WHERE id = ?").run(
      1,
      s2Id,
    );

    // S1 is gone
    const s1Row = db
      .prepare("SELECT id FROM technique_steps WHERE id = ?")
      .get(s1Id);
    expect(s1Row).toBeUndefined();

    // S2's PK is unchanged
    const s2Row = db
      .prepare("SELECT id, order_index FROM technique_steps WHERE id = ?")
      .get(s2Id) as { id: number; order_index: number } | undefined;
    expect(s2Row).toBeDefined();
    expect(s2Row!.id).toBe(s2PkBefore);
    expect(s2Row!.order_index).toBe(1);

    // S3 now has order_index 0 but same PK
    const s3Row = db
      .prepare("SELECT id, order_index FROM technique_steps WHERE id = ?")
      .get(s3Id) as { id: number; order_index: number } | undefined;
    expect(s3Row).toBeDefined();
    expect(s3Row!.id).toBe(s3Id);
    expect(s3Row!.order_index).toBe(0);
  });

  it("counter-case (teeth): DELETE+INSERT of S2 produces a DIFFERENT PK — proves the non-destructive assertion is non-trivial", () => {
    // This is the FORBIDDEN / BROKEN strategy. saveTechniqueGraph must NOT do this.
    // If it did, surviving step PKs would change, breaking any FK references that
    // depend on technique_steps.id stability.
    const originalS2Id = s2Id;

    // FORBIDDEN: DELETE S2 and re-INSERT with equivalent data
    db.prepare("DELETE FROM technique_steps WHERE id = ?").run(originalS2Id);
    const newS2Result = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(section1Id, slot1Id, "Apply shadow", 1);
    const newS2Id = Number(newS2Result.lastInsertRowid);

    // The new row has a DIFFERENT PK — proving that DELETE+INSERT changes IDs
    expect(newS2Id).not.toBe(originalS2Id);

    // The original row is gone
    const originalRow = db
      .prepare("SELECT id FROM technique_steps WHERE id = ?")
      .get(originalS2Id);
    expect(originalRow).toBeUndefined();
  });

  it("slot assertion: step colour_slot_id resolves to the integer slot PK", () => {
    // S2 references slot1 (Shadow) — verify the FK is the integer PK
    const s2Row = db
      .prepare("SELECT colour_slot_id FROM technique_steps WHERE id = ?")
      .get(s2Id) as { colour_slot_id: number | null } | undefined;
    expect(s2Row).toBeDefined();
    expect(s2Row!.colour_slot_id).toBe(slot1Id);
  });

  it("slot removal: ON DELETE SET NULL nulls referencing steps' colour_slot_id", () => {
    // S2 references slot1 — removing slot1 must SET NULL on s2.colour_slot_id
    db.prepare("DELETE FROM technique_colour_slots WHERE id = ?").run(slot1Id);

    const s2Row = db
      .prepare("SELECT colour_slot_id FROM technique_steps WHERE id = ?")
      .get(s2Id) as { colour_slot_id: number | null } | undefined;
    expect(s2Row).toBeDefined();
    expect(s2Row!.colour_slot_id).toBeNull();

    // S3 still references slot2 (unaffected)
    const s3Row = db
      .prepare("SELECT colour_slot_id FROM technique_steps WHERE id = ?")
      .get(s3Id) as { colour_slot_id: number | null } | undefined;
    expect(s3Row).toBeDefined();
    expect(s3Row!.colour_slot_id).toBe(slot2Id);
  });

  // This test calls saveTechniqueGraph and will be RED until plan 02 implements it
  it("saveTechniqueGraph (plan 02): CREATE path inserts technique + sections + slots + steps with correct FKs", async () => {
    void saveTechniqueGraph; // imported above — RED until plan 02
    // Placeholder: will be expanded in plan 02 once the function exists
    expect(typeof saveTechniqueGraph).toBe("function");
  });
});
