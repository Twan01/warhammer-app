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
  it("returns null when all units have exactly one match", async () => {
    // Units query
    mockSelect.mockResolvedValueOnce([
      { id: 1, name: "Intercessors" },
    ]);
    // Datasheet points query
    mockRulesSelect.mockResolvedValueOnce([
      { datasheet_name: "Intercessors" },
    ]);

    const result = await getAmbiguousPointMatches();
    expect(result).toBeNull();
  });

  it("returns warning flag when a unit has zero matches", async () => {
    mockSelect.mockResolvedValueOnce([
      { id: 1, name: "CustomUnit" },
    ]);
    mockRulesSelect.mockResolvedValueOnce([
      { datasheet_name: "Intercessors" },
    ]);

    const result = await getAmbiguousPointMatches();
    expect(result).not.toBeNull();
    expect(result!.type).toBe("ambiguous_points");
    expect(result!.count).toBe(1);
    expect(result!.severity).toBe("warning");
  });

  it("returns warning flag when a unit has more than one match", async () => {
    mockSelect.mockResolvedValueOnce([
      { id: 1, name: "Intercessors" },
    ]);
    mockRulesSelect.mockResolvedValueOnce([
      { datasheet_name: "Intercessors" },
      { datasheet_name: "intercessors" }, // duplicate (case-insensitive)
    ]);

    const result = await getAmbiguousPointMatches();
    expect(result).not.toBeNull();
    expect(result!.count).toBe(1);
    expect(result!.description).toContain("ambiguous or missing point matches");
  });

  it("performs case-insensitive matching", async () => {
    mockSelect.mockResolvedValueOnce([
      { id: 1, name: "INTERCESSORS" },
    ]);
    mockRulesSelect.mockResolvedValueOnce([
      { datasheet_name: "intercessors" },
    ]);

    const result = await getAmbiguousPointMatches();
    // Exactly one match (case-insensitive), so null
    expect(result).toBeNull();
  });
});

describe("getDiagnosticFlags", () => {
  it("returns empty array when all diagnostics pass", async () => {
    mockSelect.mockImplementation((sql: string) => {
      if (sql.includes("step_progress")) return Promise.resolve([{ c: 0 }]);
      if (sql.includes("synced_unit_points")) return Promise.resolve([]);
      if (sql.includes("udb_unit_id")) return Promise.resolve([{ c: 0 }]);
      return Promise.resolve([{ c: 0 }]);
    });
    mockRulesSelect.mockImplementation((sql: string) => {
      if (sql.includes("NOT EXISTS")) return Promise.resolve([{ c: 0 }]);
      if (sql.includes("datasheet_name")) return Promise.resolve([]);
      return Promise.resolve([{ c: 0 }]);
    });

    const result = await getDiagnosticFlags();
    expect(result).toEqual([]);
  });

  it("aggregates multiple flags when issues exist", async () => {
    mockSelect.mockImplementation((sql: string) => {
      if (sql.includes("step_progress")) return Promise.resolve([{ c: 3 }]);
      if (sql.includes("synced_unit_points")) return Promise.resolve([]);
      if (sql.includes("udb_unit_id")) return Promise.resolve([{ c: 2 }]);
      return Promise.resolve([{ c: 0 }]);
    });
    mockRulesSelect.mockImplementation((sql: string) => {
      if (sql.includes("NOT EXISTS")) return Promise.resolve([{ c: 0 }]);
      if (sql.includes("datasheet_name")) return Promise.resolve([]);
      return Promise.resolve([{ c: 0 }]);
    });

    const result = await getDiagnosticFlags();
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.type)).toContain("orphaned_progress");
    expect(result.map((f) => f.type)).toContain("unlinked_units");
  });
});
