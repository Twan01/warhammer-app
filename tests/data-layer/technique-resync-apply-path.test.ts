// @vitest-environment node

/**
 * Guard-first regression test: proves that applyTechnique populates
 * technique_section_id and that resyncTechniqueInstances subsequently
 * UPDATES (not duplicates) technique-owned recipe_sections.
 *
 * LINK-01 + INTG-05 gap-closure — Phase 146.1 / Plan 01.
 *
 * Critical: this test seeds via the REAL applyTechnique() path.
 * It does NOT contain any manual "UPDATE recipe_sections SET technique_section_id"
 * — that workaround is exactly what masked the original bug in technique-resync.test.ts.
 *
 * RED state (before Task 2 fix): assertion (a) fails because
 * recipeSectionByTechSectionId is always empty (technique_section_id is NULL),
 * so resync INSERTs a fresh section set rather than updating the originals —
 * doubling the count.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createTestFaction,
  createTestUnit,
  createDbBridge,
} from "./db-helpers";

// Mock @/db/client so applyTechnique and saveTechniqueGraph use our in-memory DB
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";

import { applyTechnique } from "@/db/queries/recipeTechniqueInstances";
import { saveTechniqueGraph } from "@/db/queries/techniques";
import { duplicateRecipe } from "@/db/queries/recipes";

import type {
  DraftTechniqueSlot,
  DraftTechniqueSection,
  DraftTechniqueStep,
} from "@/types/technique";
import type { TechniqueColourSlot, TechniqueSection, TechniqueStep } from "@/types/technique";

// ── Module-scoped vars ──────────────────────────────────────────────────────

let db: Database.Database;
let bridge: ReturnType<typeof createDbBridge>;

// Technique structure
let techniqueId: number;
let tSectionId: number;   // technique_sections.id
let colourSlotId: number; // technique_colour_slots.id
let tStep1Id: number;     // technique_steps.id — Basecoat (no slot)
let tStep2Id: number;     // technique_steps.id — Glow Layer (has slot)

// Recipe + instance
let recipeId: number;
let instanceId: number;

// Unit / assignment (for progress tests)
let assignmentId: number;

// ── Helper: build DraftTechniqueSection from DB rows ───────────────────────

/** Build the `sections` argument for saveTechniqueGraph using existing DB rows. */
function buildSections(
  stepRows: Array<{ id: number; step_name: string; colour_slot_id: number | null; order_index: number }>,
  sectionRow: { id: number; name: string },
  slotLocalId: string,
): DraftTechniqueSection[] {
  const steps: DraftTechniqueStep[] = stepRows.map((s) => ({
    localId: `step-${s.id}`,
    dbId: s.id,
    step_name: s.step_name,
    colour_slot_id: s.colour_slot_id != null ? slotLocalId : null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    sectionLocalId: `sec-${sectionRow.id}`,
  }));
  return [
    {
      localId: `sec-${sectionRow.id}`,
      dbId: sectionRow.id,
      name: sectionRow.name,
      surface: null,
      optional: 0,
      notes: null,
      steps,
    },
  ];
}

// ── Fixture builder ─────────────────────────────────────────────────────────

describe("LINK-01 / INTG-05 regression — applyTechnique path (real, no manual UPDATE)", () => {
  beforeEach(async () => {
    db = createHobbyforgeDb();

    // 1. Technique: one section, one colour slot, two steps
    techniqueId = Number(
      db
        .prepare("INSERT INTO techniques (name) VALUES (?)")
        .run("OSL Glow").lastInsertRowid,
    );

    tSectionId = Number(
      db
        .prepare(
          "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
        )
        .run(techniqueId, "Main Steps", 0).lastInsertRowid,
    );

    colourSlotId = Number(
      db
        .prepare(
          "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
        )
        .run(techniqueId, "Glow Core", 0).lastInsertRowid,
    );

    // Step 1: no colour slot
    tStep1Id = Number(
      db
        .prepare(
          "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
        )
        .run(tSectionId, null, "Basecoat", 0).lastInsertRowid,
    );

    // Step 2: references colour slot
    tStep2Id = Number(
      db
        .prepare(
          "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
        )
        .run(tSectionId, colourSlotId, "Glow Layer", 1).lastInsertRowid,
    );

    // 2. Recipe
    recipeId = createTestRecipe(db);

    // 3. Seed a test paint for slot fill FK
    db.prepare(
      "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Test', 'TestPaint', 'Base')",
    ).run(77);

    // 4. Wire the bridge so query functions use our in-memory DB
    bridge = createDbBridge(db);
    vi.mocked(getDb).mockResolvedValue(bridge as never);

    // 5. Apply the technique via the REAL production path
    instanceId = await applyTechnique(
      recipeId,
      techniqueId,
      0,
      new Map([[colourSlotId, 77]]),
    );

    // 6. Unit + assignment + mark step 2 complete
    const factionId = createTestFaction(db);
    const unitId = createTestUnit(db, factionId);

    assignmentId = Number(
      db
        .prepare(
          "INSERT INTO unit_recipe_assignments (unit_id, recipe_id) VALUES (?, ?)",
        )
        .run(unitId, recipeId).lastInsertRowid,
    );

    // Find the recipe_steps row for tStep2 so we can mark it complete
    const step2RecipeRow = db
      .prepare(
        "SELECT id FROM recipe_steps WHERE recipe_id = ? AND technique_step_id = ?",
      )
      .get(recipeId, tStep2Id) as { id: number } | undefined;
    expect(step2RecipeRow).toBeDefined();

    db.prepare(
      "INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed) VALUES (?, ?, 1)",
    ).run(assignmentId, step2RecipeRow!.id);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // ── Describe 1: applyTechnique → resync correctness ────────────────────────

  describe("applyTechnique → structural technique edit → resync", () => {
    it("(b) every recipe_sections row for the instance has non-NULL technique_section_id after apply", () => {
      const sections = db
        .prepare(
          "SELECT technique_section_id FROM recipe_sections WHERE technique_instance_id = ?",
        )
        .all(instanceId) as Array<{ technique_section_id: number | null }>;

      expect(sections.length).toBeGreaterThan(0);
      for (const s of sections) {
        expect(s.technique_section_id).not.toBeNull();
      }
    });

    it("(a) section count is UNCHANGED after resync — no duplicate section set [RED on pre-fix code]", async () => {
      // Record section count immediately after apply
      const beforeCount = (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM recipe_sections WHERE technique_instance_id = ?",
          )
          .get(instanceId) as { n: number }
      ).n;
      expect(beforeCount).toBeGreaterThan(0);

      // Perform a STRUCTURAL technique edit: rename the step (triggers resync)
      const slotLocalId = `slot-${colourSlotId}`;
      const stepRows = db
        .prepare(
          "SELECT id, step_name, colour_slot_id, order_index FROM technique_steps WHERE technique_section_id = ? ORDER BY order_index ASC",
        )
        .all(tSectionId) as Array<{
          id: number;
          step_name: string;
          colour_slot_id: number | null;
          order_index: number;
        }>;

      // Mutate step 1 name so saveTechniqueGraph sees a change
      const modifiedStepRows = stepRows.map((s) =>
        s.id === tStep1Id ? { ...s, step_name: "Basecoat Renamed" } : s,
      );

      const sections = buildSections(
        modifiedStepRows,
        { id: tSectionId, name: "Main Steps" },
        slotLocalId,
      );

      const slotRow = db
        .prepare("SELECT * FROM technique_colour_slots WHERE id = ?")
        .get(colourSlotId) as TechniqueColourSlot;

      const draftSlot: DraftTechniqueSlot = {
        localId: slotLocalId,
        dbId: colourSlotId,
        name: slotRow.name,
        role_hint: slotRow.role_hint ?? null,
        order_index: 0,
      };

      const existingSlots: TechniqueColourSlot[] = [slotRow];

      const tSectionRow = db
        .prepare("SELECT * FROM technique_sections WHERE id = ?")
        .get(tSectionId) as TechniqueSection;
      const existingSections: TechniqueSection[] = [tSectionRow];

      const existingStepRows = db
        .prepare(
          "SELECT * FROM technique_steps WHERE technique_section_id = ? ORDER BY order_index ASC",
        )
        .all(tSectionId) as TechniqueStep[];

      await saveTechniqueGraph(
        techniqueId,
        { name: "OSL Glow", effect: null, difficulty: null, notes: null },
        [draftSlot],
        sections,
        existingSlots,
        existingSections,
        existingStepRows,
      );

      // After resync: count must equal what it was right after apply
      const afterCount = (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM recipe_sections WHERE technique_instance_id = ?",
          )
          .get(instanceId) as { n: number }
      ).n;

      // This is the key assertion — fails on pre-fix code (count doubles)
      expect(afterCount).toBe(beforeCount);
    });

    it("(c) previously-completed step progress row survives resync (FND-03)", async () => {
      // Get the step2 recipe_steps.id so we can find the progress row
      const step2RecipeRow = db
        .prepare(
          "SELECT id FROM recipe_steps WHERE recipe_id = ? AND technique_step_id = ?",
        )
        .get(recipeId, tStep2Id) as { id: number } | undefined;
      expect(step2RecipeRow).toBeDefined();
      const step2RecipeStepId = step2RecipeRow!.id;

      const slotLocalId = `slot-${colourSlotId}`;
      const stepRows = db
        .prepare(
          "SELECT id, step_name, colour_slot_id, order_index FROM technique_steps WHERE technique_section_id = ? ORDER BY order_index ASC",
        )
        .all(tSectionId) as Array<{
          id: number;
          step_name: string;
          colour_slot_id: number | null;
          order_index: number;
        }>;

      // Add a new step to trigger structural change
      const modifiedStepRows = [
        ...stepRows,
        {
          id: 0, // will be null dbId
          step_name: "Final Glaze",
          colour_slot_id: null,
          order_index: stepRows.length,
        },
      ];

      const sections = buildSections(
        modifiedStepRows,
        { id: tSectionId, name: "Main Steps" },
        slotLocalId,
      );
      // The added step has dbId = null (new step)
      sections[0].steps[sections[0].steps.length - 1].dbId = null;

      const slotRow = db
        .prepare("SELECT * FROM technique_colour_slots WHERE id = ?")
        .get(colourSlotId) as TechniqueColourSlot;

      const draftSlot: DraftTechniqueSlot = {
        localId: slotLocalId,
        dbId: colourSlotId,
        name: slotRow.name,
        role_hint: slotRow.role_hint ?? null,
        order_index: 0,
      };

      const tSectionRow = db
        .prepare("SELECT * FROM technique_sections WHERE id = ?")
        .get(tSectionId) as TechniqueSection;

      const existingStepRows = db
        .prepare(
          "SELECT * FROM technique_steps WHERE technique_section_id = ? ORDER BY order_index ASC",
        )
        .all(tSectionId) as TechniqueStep[];

      await saveTechniqueGraph(
        techniqueId,
        { name: "OSL Glow", effect: null, difficulty: null, notes: null },
        [draftSlot],
        sections,
        [slotRow],
        [tSectionRow],
        existingStepRows,
      );

      // The progress row for step2 must still exist (FND-03 invariant)
      const progressRow = db
        .prepare(
          "SELECT completed FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
        )
        .get(step2RecipeStepId) as { completed: number } | undefined;

      expect(progressRow).toBeDefined();
      expect(progressRow!.completed).toBe(1);
    });
  });

  // ── Describe 2: duplicateRecipe carries technique_section_id ───────────────

  describe("duplicateRecipe → resync correctness", () => {
    it("duplicated recipe sections have non-NULL technique_section_id equal to source", async () => {
      const duplicatedId = await duplicateRecipe(recipeId, "Test Recipe (Copy)");

      // Find the duplicate recipe's instance
      const dupInstance = db
        .prepare(
          "SELECT id FROM recipe_technique_instances WHERE recipe_id = ? ORDER BY id ASC",
        )
        .get(duplicatedId) as { id: number } | undefined;
      expect(dupInstance).toBeDefined();

      const dupSections = db
        .prepare(
          "SELECT technique_section_id FROM recipe_sections WHERE technique_instance_id = ?",
        )
        .all(dupInstance!.id) as Array<{ technique_section_id: number | null }>;

      expect(dupSections.length).toBeGreaterThan(0);
      for (const s of dupSections) {
        // Fails on pre-fix code — technique_section_id is NULL because duplicateRecipe
        // did not copy it
        expect(s.technique_section_id).not.toBeNull();
        expect(s.technique_section_id).toBe(tSectionId);
      }
    });

    it("duplicated recipe's sections survive a subsequent resync without duplicating [RED on pre-fix code]", async () => {
      const duplicatedId = await duplicateRecipe(recipeId, "Test Recipe (Copy 2)");

      const dupInstance = db
        .prepare(
          "SELECT id FROM recipe_technique_instances WHERE recipe_id = ? ORDER BY id ASC",
        )
        .get(duplicatedId) as { id: number } | undefined;
      expect(dupInstance).toBeDefined();

      const beforeCount = (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM recipe_sections WHERE technique_instance_id = ?",
          )
          .get(dupInstance!.id) as { n: number }
      ).n;
      expect(beforeCount).toBeGreaterThan(0);

      // Structural edit: rename step1
      const slotLocalId = `slot-${colourSlotId}`;
      const stepRows = db
        .prepare(
          "SELECT id, step_name, colour_slot_id, order_index FROM technique_steps WHERE technique_section_id = ? ORDER BY order_index ASC",
        )
        .all(tSectionId) as Array<{
          id: number;
          step_name: string;
          colour_slot_id: number | null;
          order_index: number;
        }>;

      const modifiedStepRows = stepRows.map((s) =>
        s.id === tStep1Id ? { ...s, step_name: "Basecoat Modified" } : s,
      );

      const sections = buildSections(
        modifiedStepRows,
        { id: tSectionId, name: "Main Steps" },
        slotLocalId,
      );

      const slotRow = db
        .prepare("SELECT * FROM technique_colour_slots WHERE id = ?")
        .get(colourSlotId) as TechniqueColourSlot;

      const draftSlot: DraftTechniqueSlot = {
        localId: slotLocalId,
        dbId: colourSlotId,
        name: slotRow.name,
        role_hint: slotRow.role_hint ?? null,
        order_index: 0,
      };

      const tSectionRow = db
        .prepare("SELECT * FROM technique_sections WHERE id = ?")
        .get(tSectionId) as TechniqueSection;

      const existingStepRows = db
        .prepare(
          "SELECT * FROM technique_steps WHERE technique_section_id = ? ORDER BY order_index ASC",
        )
        .all(tSectionId) as TechniqueStep[];

      await saveTechniqueGraph(
        techniqueId,
        { name: "OSL Glow", effect: null, difficulty: null, notes: null },
        [draftSlot],
        sections,
        [slotRow],
        [tSectionRow],
        existingStepRows,
      );

      const afterCount = (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM recipe_sections WHERE technique_instance_id = ?",
          )
          .get(dupInstance!.id) as { n: number }
      ).n;

      // Fails on pre-fix code (count doubles for duplicated recipe too)
      expect(afterCount).toBe(beforeCount);
    });
  });
});
