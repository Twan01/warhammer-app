/**
 * Phase 78 — getMostRecentAssignmentWithIncompleteStep + useNextPaintingAction tests
 * (Task 78-01-03, Req DB-03).
 *
 * Verifies:
 * - SQL query uses correct JOIN chain and WHERE p.id IS NULL
 * - SQL query uses a.created_at DESC (not updated_at)
 * - SQL query uses rs.time_estimate_minutes (not time_estimate)
 * - Returns null when no rows
 * - Returns first row when rows exist
 */
import { describe, it, vi, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import {
  getMostRecentAssignmentWithIncompleteStep,
  type FirstIncompleteStep,
} from "@/db/queries/recipeAssignments";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

const MOCK_STEP: FirstIncompleteStep = {
  assignment_id: 1,
  unit_id: 10,
  unit_name: "Intercessors",
  recipe_id: 5,
  recipe_name: "Ultramarines Blue",
  recipe_step_id: 3,
  description: "Apply base coat",
  section_name: "Basecoat",
  section_id: 2,
  order_index: 0,
  time_estimate_minutes: 20,
  created_at: "2026-01-10T12:00:00.000Z",
};

describe("getMostRecentAssignmentWithIncompleteStep — SQL structure", () => {
  it("uses WHERE p.id IS NULL to find steps without progress rows", async () => {
    selectMock.mockResolvedValue([]);
    await getMostRecentAssignmentWithIncompleteStep();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toMatch(/WHERE p\.id IS NULL/);
  });

  it("orders by a.created_at DESC (not updated_at) then rs.order_index ASC", async () => {
    selectMock.mockResolvedValue([]);
    await getMostRecentAssignmentWithIncompleteStep();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toMatch(/ORDER BY a\.created_at DESC/);
    expect(sql).toMatch(/rs\.order_index ASC/);
    expect(sql).not.toMatch(/updated_at/);
  });

  it("uses rs.time_estimate_minutes (not rs.time_estimate)", async () => {
    selectMock.mockResolvedValue([]);
    await getMostRecentAssignmentWithIncompleteStep();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toMatch(/time_estimate_minutes/);
    // Should not use a bare 'time_estimate' without _minutes suffix
    expect(sql).not.toMatch(/rs\.time_estimate[^_]/);
  });

  it("applies LIMIT 1 to prevent unbounded result sets", async () => {
    selectMock.mockResolvedValue([]);
    await getMostRecentAssignmentWithIncompleteStep();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toMatch(/LIMIT 1/);
  });

  it("includes LEFT JOIN for unit_recipe_step_progress on both assignment_id and recipe_step_id", async () => {
    selectMock.mockResolvedValue([]);
    await getMostRecentAssignmentWithIncompleteStep();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toMatch(/LEFT JOIN unit_recipe_step_progress/);
    expect(sql).toMatch(/p\.assignment_id\s*=\s*a\.id/);
    expect(sql).toMatch(/p\.recipe_step_id\s*=\s*rs\.id/);
  });
});

describe("getMostRecentAssignmentWithIncompleteStep — return value", () => {
  it("returns null when no incomplete steps exist", async () => {
    selectMock.mockResolvedValue([]);
    const result = await getMostRecentAssignmentWithIncompleteStep();
    expect(result).toBeNull();
  });

  it("returns the first row when incomplete steps are found", async () => {
    selectMock.mockResolvedValue([MOCK_STEP]);
    const result = await getMostRecentAssignmentWithIncompleteStep();
    expect(result).not.toBeNull();
    expect(result?.assignment_id).toBe(1);
    expect(result?.description).toBe("Apply base coat");
    expect(result?.unit_name).toBe("Intercessors");
    expect(result?.time_estimate_minutes).toBe(20);
  });

  it("returns step with null section_name when step has no section", async () => {
    selectMock.mockResolvedValue([{ ...MOCK_STEP, section_name: null, section_id: null }]);
    const result = await getMostRecentAssignmentWithIncompleteStep();
    expect(result?.section_name).toBeNull();
    expect(result?.section_id).toBeNull();
  });
});
