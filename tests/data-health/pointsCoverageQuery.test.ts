/**
 * Gap 9 (DQ-06) -- getPointsCoverage SQL query behavioral test.
 *
 * DQ-06: getPointsCoverage returns FactionCoverage[] with correct fields.
 * Uses the same mock pattern as diagnosticFlags.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

import { getPointsCoverage, type FactionCoverage } from "@/db/queries/diagnostics";

beforeEach(() => {
  mockSelect.mockReset();
});

describe("getPointsCoverage: DQ-06 — per-faction points coverage query", () => {
  it("returns an array of FactionCoverage objects matching the query result shape", async () => {
    const mockRows: FactionCoverage[] = [
      {
        faction_id: "SM",
        faction_name: "Space Marines",
        total_units: 50,
        units_with_points: 45,
        coverage_pct: 90.0,
      },
      {
        faction_id: "DG",
        faction_name: "Death Guard",
        total_units: 20,
        units_with_points: 10,
        coverage_pct: 50.0,
      },
    ];
    mockSelect.mockResolvedValueOnce(mockRows);

    const result = await getPointsCoverage();

    expect(result).toHaveLength(2);
    expect(result[0].faction_id).toBe("SM");
    expect(result[0].faction_name).toBe("Space Marines");
    expect(result[0].total_units).toBe(50);
    expect(result[0].units_with_points).toBe(45);
    expect(result[0].coverage_pct).toBe(90.0);
  });

  it("returns empty array when no factions exist in the unit database", async () => {
    mockSelect.mockResolvedValueOnce([]);
    const result = await getPointsCoverage();
    expect(result).toEqual([]);
  });

  it("passes a SQL query that references udb_factions and udb_units tables", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getPointsCoverage();

    const sqlArg: string = mockSelect.mock.calls[0][0];
    expect(sqlArg).toContain("udb_factions");
    expect(sqlArg).toContain("udb_units");
  });

  it("passes a SQL query that LEFT JOINs udb_unit_points", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getPointsCoverage();

    const sqlArg: string = mockSelect.mock.calls[0][0];
    expect(sqlArg).toContain("udb_unit_points");
  });

  it("passes a SQL query that orders results by faction name", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getPointsCoverage();

    const sqlArg: string = mockSelect.mock.calls[0][0];
    expect(sqlArg).toMatch(/ORDER BY.*f\.name/i);
  });

  it("passes a SQL query that computes coverage_pct via ROUND and COUNT", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getPointsCoverage();

    const sqlArg: string = mockSelect.mock.calls[0][0];
    expect(sqlArg).toContain("coverage_pct");
    expect(sqlArg).toContain("ROUND");
    expect(sqlArg).toContain("COUNT");
  });

  it("FactionCoverage interface has all required fields", async () => {
    const coverage: FactionCoverage = {
      faction_id: "SM",
      faction_name: "Space Marines",
      total_units: 50,
      units_with_points: 45,
      coverage_pct: 90.0,
    };
    // Structural type check — if FactionCoverage lacks any field this won't compile
    expect(coverage.faction_id).toBe("SM");
    expect(coverage.faction_name).toBe("Space Marines");
    expect(coverage.total_units).toBe(50);
    expect(coverage.units_with_points).toBe(45);
    expect(coverage.coverage_pct).toBe(90.0);
  });
});
