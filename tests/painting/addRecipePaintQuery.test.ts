/**
 * STEP-01/03/04 â€” addRecipePaint INSERT column coverage.
 *
 * Verifies the 10-column INSERT SQL string and the $1..$10 positional
 * placeholders used by addRecipePaint (Phase 38 Plan 01).
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Asserts the exact SQL columns, placeholder sequence, and params array.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: vi.fn(), execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import { addRecipePaint } from "@/db/queries/recipePaints";
import type { CreateRecipeStepInput } from "@/types/recipePaint";

function makeInput(over: Partial<CreateRecipeStepInput> = {}): CreateRecipeStepInput {
  return {
    recipe_id: 1,
    paint_id: 2,
    step_name: "Basecoat",
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: null,
    ...over,
  };
}

beforeEach(() => {
  executeMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 99 });
});

describe("addRecipePaint â€” 12-column INSERT coverage (STEP-01/03/04)", () => {
  it("calls db.execute with all 12 columns in the INSERT statement", async () => {
    await addRecipePaint(makeInput());
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("recipe_id");
    expect(sql).toContain("paint_id");
    expect(sql).toContain("step_name");
    expect(sql).toContain("order_index");
    expect(sql).toContain("notes");
    expect(sql).toContain("painting_phase");
    expect(sql).toContain("tool");
    expect(sql).toContain("technique");
    expect(sql).toContain("dilution");
    expect(sql).toContain("time_estimate_minutes");
    expect(sql).toContain("step_photo_path");
    expect(sql).toContain("alt_paint_id");
  });

  it("uses positional placeholders $1 through $12 in the VALUES clause", async () => {
    await addRecipePaint(makeInput());
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("$1");
    expect(sql).toContain("$2");
    expect(sql).toContain("$3");
    expect(sql).toContain("$4");
    expect(sql).toContain("$5");
    expect(sql).toContain("$6");
    expect(sql).toContain("$7");
    expect(sql).toContain("$8");
    expect(sql).toContain("$9");
    expect(sql).toContain("$10");
    expect(sql).toContain("$11");
    expect(sql).toContain("$12");
  });

  it("passes all 12 params in the correct positional order", async () => {
    const input = makeInput({
      recipe_id: 10,
      paint_id: 20,
      step_name: "Shade",
      order_index: 1,
      notes: "thin it",
      painting_phase: "shade",
      tool: "Size 0 brush",
      technique: "Wash",
      dilution: "1:3 water",
      time_estimate_minutes: 15,
      step_photo_path: "photo.jpg",
      alt_paint_id: 55,
    });
    await addRecipePaint(input);
    const [, params] = executeMock.mock.calls[0];
    expect(params[0]).toBe(10);          // $1 recipe_id
    expect(params[1]).toBe(20);          // $2 paint_id
    expect(params[2]).toBe("Shade");     // $3 step_name
    expect(params[3]).toBe(1);           // $4 order_index
    expect(params[4]).toBe("thin it");   // $5 notes
    expect(params[5]).toBe("shade");     // $6 painting_phase
    expect(params[6]).toBe("Size 0 brush"); // $7 tool
    expect(params[7]).toBe("Wash");      // $8 technique
    expect(params[8]).toBe("1:3 water"); // $9 dilution
    expect(params[9]).toBe(15);          // $10 time_estimate_minutes
    expect(params[10]).toBe("photo.jpg"); // $11 step_photo_path
    expect(params[11]).toBe(55);          // $12 alt_paint_id
  });

  it("applies ?? null guards â€” passes null for undefined-like new fields", async () => {
    const input = makeInput({
      painting_phase: null,
      tool: null,
      technique: null,
      dilution: null,
      time_estimate_minutes: null,
      step_photo_path: null,
      alt_paint_id: null,
    });
    await addRecipePaint(input);
    const [, params] = executeMock.mock.calls[0];
    expect(params[5]).toBeNull();  // $6 painting_phase
    expect(params[6]).toBeNull();  // $7 tool
    expect(params[7]).toBeNull();  // $8 technique
    expect(params[8]).toBeNull();  // $9 dilution
    expect(params[9]).toBeNull();  // $10 time_estimate_minutes
    expect(params[10]).toBeNull(); // $11 step_photo_path
    expect(params[11]).toBeNull(); // $12 alt_paint_id
  });

  it("returns the lastInsertId from db.execute result", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 42 });
    const result = await addRecipePaint(makeInput());
    expect(result).toBe(42);
  });
});
