/**
 * COL-06 — Unlinked units diagnostic query tests.
 *
 * Tests getUnlinkedUnitsCount from diagnostics.ts.
 * Verifies null return when no unlinked units, DiagnosticFlag with
 * warning severity when units lack a udb_unit_id.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock both DB clients before importing the module under test
const mockSelect = vi.fn();
const mockRulesSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

vi.mock("@/db/rules-client", () => ({
  getRulesDb: vi.fn(() => Promise.resolve({ select: mockRulesSelect })),
}));

import { getUnlinkedUnitsCount } from "@/db/queries/diagnostics";

beforeEach(() => {
  mockSelect.mockReset();
  mockRulesSelect.mockReset();
});

describe("getUnlinkedUnitsCount", () => {
  it("returns null when count is 0", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 0 }]);
    const result = await getUnlinkedUnitsCount();
    expect(result).toBeNull();
  });

  it("returns DiagnosticFlag with warning severity when count > 0", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 5 }]);
    const result = await getUnlinkedUnitsCount();
    expect(result).not.toBeNull();
    expect(result!.type).toBe("unlinked_units");
    expect(result!.count).toBe(5);
    expect(result!.severity).toBe("warning");
  });

  it("description uses plural for count > 1", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 3 }]);
    const result = await getUnlinkedUnitsCount();
    expect(result!.description).toContain("units are");
  });

  it("description uses singular for count = 1", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 1 }]);
    const result = await getUnlinkedUnitsCount();
    expect(result!.description).toContain("unit is");
  });
});
