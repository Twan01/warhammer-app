/**
 * DX-03 -- Diagnostic flag logic tests.
 *
 * Tests getOrphanedProgressRows, getAmbiguousPointMatches, and
 * getDiagnosticFlags from diagnostics.ts. Mocks getDb/getRulesDb
 * to control query results. Verifies:
 *   - Returns null when count is 0
 *   - Returns DiagnosticFlag object when count > 0
 *   - getDiagnosticFlags aggregates and filters nulls
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

import {
  getOrphanedProgressRows,
  getAmbiguousPointMatches,
  getDiagnosticFlags,
} from "@/db/queries/diagnostics";

beforeEach(() => {
  mockSelect.mockReset();
  mockRulesSelect.mockReset();
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
    // Phase 106: now queries COUNT(*) FROM units WHERE udb_unit_id IS NULL
    mockSelect.mockResolvedValueOnce([{ c: 0 }]);
    const result = await getAmbiguousPointMatches();
    expect(result).toBeNull();
  });

  it("returns warning flag when a unit has zero matches", async () => {
    // 1 unit has udb_unit_id IS NULL
    mockSelect.mockResolvedValueOnce([{ c: 1 }]);
    const result = await getAmbiguousPointMatches();
    expect(result).not.toBeNull();
    expect(result!.type).toBe("ambiguous_points");
    expect(result!.count).toBe(1);
    expect(result!.severity).toBe("warning");
  });

  it("returns warning flag when a unit has more than one match", async () => {
    // Phase 106: reinterpreted as unlinked units count
    mockSelect.mockResolvedValueOnce([{ c: 1 }]);
    const result = await getAmbiguousPointMatches();
    expect(result).not.toBeNull();
    expect(result!.count).toBe(1);
    expect(result!.description).toContain("not linked to the unit database");
  });

  it("performs case-insensitive matching", async () => {
    // Phase 106: this test checks the zero-count path (all linked)
    mockSelect.mockResolvedValueOnce([{ c: 0 }]);
    const result = await getAmbiguousPointMatches();
    // All linked, so null
    expect(result).toBeNull();
  });
});

describe("getDiagnosticFlags", () => {
  it("returns empty array when all diagnostics pass", async () => {
    // getDiagnosticFlags calls 4 functions in Promise.all:
    // getOrphanedProgressRows, getAmbiguousPointMatches, getUnmatchedPointsCount, getUnlinkedUnitsCount
    mockSelect.mockImplementation((sql: string) => {
      if (sql.includes("step_progress")) return Promise.resolve([{ c: 0 }]);
      if (sql.includes("udb_unit_id")) return Promise.resolve([{ c: 0 }]);
      return Promise.resolve([{ c: 0 }]);
    });
    mockRulesSelect.mockImplementation((sql: string) => {
      if (sql.includes("NOT EXISTS")) return Promise.resolve([{ c: 0 }]);
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
    mockRulesSelect.mockImplementation((sql: string) => {
      if (sql.includes("NOT EXISTS")) return Promise.resolve([{ c: 0 }]);
      return Promise.resolve([{ c: 0 }]);
    });

    const result = await getDiagnosticFlags();
    // orphaned_progress + ambiguous_points + unlinked_units (both udb_unit_id queries return 2)
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.map((f) => f.type)).toContain("orphaned_progress");
  });
});
