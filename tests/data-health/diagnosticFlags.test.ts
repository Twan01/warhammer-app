/**
 * DX-03 -- Diagnostic flag logic tests.
 *
 * Tests getOrphanedProgressRows, getAmbiguousPointMatches, getUnlinkedUnitsCount,
 * and getDiagnosticFlags from diagnostics.ts. Mocks getDb to control query results.
 * Verifies:
 *   - Returns null when count is 0
 *   - Returns DiagnosticFlag object when count > 0
 *   - getDiagnosticFlags aggregates 3 checks and filters nulls
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

import {
  getOrphanedProgressRows,
  getAmbiguousPointMatches,
  getUnlinkedUnitsCount,
  getDiagnosticFlags,
} from "@/db/queries/diagnostics";

beforeEach(() => {
  mockSelect.mockReset();
});

describe("getOrphanedProgressRows", () => {
  it("returns null when count is 0", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 0 }]);
    const result = await getOrphanedProgressRows();
    expect(result).toBeNull();
  });

  it("returns a warning DiagnosticFlag when count > 0", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 5 }]);
    const result = await getOrphanedProgressRows();
    expect(result).not.toBeNull();
    expect(result!.type).toBe("orphaned_progress");
    expect(result!.count).toBe(5);
    expect(result!.severity).toBe("warning");
    expect(result!.description).toContain("5 orphaned progress rows");
  });
});

describe("getAmbiguousPointMatches", () => {
  it("returns null when all units are linked (udb_unit_id IS NOT NULL)", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 0 }]);
    const result = await getAmbiguousPointMatches();
    expect(result).toBeNull();
  });

  it("returns warning flag when units have no udb_unit_id", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 3 }]);
    const result = await getAmbiguousPointMatches();
    expect(result).not.toBeNull();
    expect(result!.type).toBe("ambiguous_points");
    expect(result!.count).toBe(3);
    expect(result!.severity).toBe("warning");
    expect(result!.description).toContain("not linked to the unit database");
  });
});

describe("getUnlinkedUnitsCount", () => {
  it("returns null when all units are linked", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 0 }]);
    const result = await getUnlinkedUnitsCount();
    expect(result).toBeNull();
  });

  it("returns warning flag with correct pluralization (singular)", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 1 }]);
    const result = await getUnlinkedUnitsCount();
    expect(result).not.toBeNull();
    expect(result!.type).toBe("unlinked_units");
    expect(result!.count).toBe(1);
    expect(result!.severity).toBe("warning");
    expect(result!.description).toContain("1 collection unit is not linked");
  });

  it("returns warning flag with correct pluralization (plural)", async () => {
    mockSelect.mockResolvedValueOnce([{ c: 4 }]);
    const result = await getUnlinkedUnitsCount();
    expect(result).not.toBeNull();
    expect(result!.description).toContain("4 collection units are not linked");
  });
});

describe("getDiagnosticFlags", () => {
  it("returns empty array when all diagnostics pass", async () => {
    // getDiagnosticFlags calls 3 functions in Promise.all:
    // getOrphanedProgressRows, getAmbiguousPointMatches, getUnlinkedUnitsCount
    mockSelect.mockImplementation((sql: string) => {
      if (sql.includes("step_progress")) return Promise.resolve([{ c: 0 }]);
      if (sql.includes("udb_unit_id")) return Promise.resolve([{ c: 0 }]);
      return Promise.resolve([{ c: 0 }]);
    });

    const result = await getDiagnosticFlags();
    expect(result).toEqual([]);
  });

  it("aggregates multiple flags when issues exist", async () => {
    mockSelect.mockImplementation((sql: string) => {
      if (sql.includes("step_progress")) return Promise.resolve([{ c: 3 }]);
      if (sql.includes("udb_unit_id")) return Promise.resolve([{ c: 2 }]);
      return Promise.resolve([{ c: 0 }]);
    });

    const result = await getDiagnosticFlags();
    // orphaned_progress (step_progress query) + unlinked_units (udb_unit_id query)
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.map((f) => f.type)).toContain("orphaned_progress");
    expect(result.map((f) => f.type)).toContain("unlinked_units");
  });

  it("returns exactly 2 flags when all checks fail", async () => {
    mockSelect.mockResolvedValue([{ c: 1 }]);

    const result = await getDiagnosticFlags();
    expect(result.length).toBe(2);
    const types = result.map((f) => f.type).sort();
    expect(types).toEqual(["orphaned_progress", "unlinked_units"]);
  });
});
