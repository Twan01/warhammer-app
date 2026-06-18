/**
 * COL-02, COL-03, COL-04, COL-05 — Collection-to-UDB FK link tests.
 *
 * Tests getUdbOwnershipByFaction query and pure functions
 * resolveWorstStatus / resolveReadinessDotClass (defined in Plan 02 Task 1).
 *
 * Note: resolveWorstStatus and resolveReadinessDotClass tests import from
 * "@/features/unit-database/UdbUnitRow" — these will FAIL (RED) until
 * Plan 02 Task 1 implements those exports. The query tests below will pass
 * after Task 2 of this plan implements getUdbOwnershipByFaction.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB client before importing the module under test
const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

import {
  getUdbOwnershipByFaction,
} from "@/db/queries/unitDatabase";

import { PAINTING_STATUS_ORDER } from "@/types/unit";

beforeEach(() => {
  mockSelect.mockReset();
});

// ---------------------------------------------------------------------------
// getUdbOwnershipByFaction
// ---------------------------------------------------------------------------

describe("getUdbOwnershipByFaction", () => {
  it("returns ownership entries grouped by udb_unit_id", async () => {
    mockSelect.mockResolvedValueOnce([
      { udb_unit_id: "unit-001", owned_count: 2, all_statuses: "Built|Primed" },
      { udb_unit_id: "unit-002", owned_count: 1, all_statuses: "Completed" },
    ]);

    const result = await getUdbOwnershipByFaction("SM");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      udb_unit_id: "unit-001",
      owned_count: 2,
      all_statuses: "Built|Primed",
    });
    expect(result[1]).toMatchObject({
      udb_unit_id: "unit-002",
      owned_count: 1,
      all_statuses: "Completed",
    });
  });

  it("returns empty array when no owned units for faction", async () => {
    mockSelect.mockResolvedValueOnce([]);
    const result = await getUdbOwnershipByFaction("NEC");
    expect(result).toEqual([]);
  });

  it("SQL uses $1 positional param for factionId", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getUdbOwnershipByFaction("SM");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("$1"),
      expect.arrayContaining(["SM"]),
    );
  });
});

// ---------------------------------------------------------------------------
// PAINTING_STATUS_ORDER import sanity check (COL-03)
// ---------------------------------------------------------------------------

describe("PAINTING_STATUS_ORDER contract", () => {
  it("contains all expected statuses in order", () => {
    expect(PAINTING_STATUS_ORDER[0]).toBe("Not Started");
    expect(PAINTING_STATUS_ORDER[1]).toBe("Built");
    expect(PAINTING_STATUS_ORDER[2]).toBe("Primed");
    expect(PAINTING_STATUS_ORDER[PAINTING_STATUS_ORDER.length - 1]).toBe("Completed");
  });
});

// ---------------------------------------------------------------------------
// resolveWorstStatus — Plan 02 Task 1 pure function (will FAIL until Plan 02)
// ---------------------------------------------------------------------------

// These tests import from UdbUnitRow.tsx which is created in Plan 02 Task 1.
// They are intentionally RED here and will turn GREEN after Plan 02 Task 1.

describe("resolveWorstStatus (Plan 02 Task 1 — RED until then)", () => {
  let resolveWorstStatus: (statuses: string) => string;

  beforeEach(async () => {
    try {
      const mod = await import("@/features/unit-database/UdbUnitRow");
      resolveWorstStatus = (mod as unknown as Record<string, (s: string) => string>).resolveWorstStatus;
    } catch {
      resolveWorstStatus = () => { throw new Error("UdbUnitRow not yet implemented"); };
    }
  });

  it("returns lowest-index status from pipe-delimited string", () => {
    // "Built" is index 1, "Primed" is index 2, "Varnished" is index 9
    expect(resolveWorstStatus("Varnished|Built|Primed")).toBe("Built");
  });

  it("handles single status", () => {
    expect(resolveWorstStatus("Completed")).toBe("Completed");
  });

  it("handles all same statuses", () => {
    expect(resolveWorstStatus("Primed|Primed")).toBe("Primed");
  });

  // CR-01 regression: an unrecognized segment (e.g. an empty string from a
  // NULL status_painting in GROUP_CONCAT) must NOT lock the "worst" status —
  // recognized statuses must still win.
  it("ignores unrecognized/empty segments and returns a recognized worst", () => {
    expect(resolveWorstStatus("|Built|Primed")).toBe("Built");
    expect(resolveWorstStatus("Varnished|unknown_status|Built")).toBe("Built");
  });
});

// ---------------------------------------------------------------------------
// resolveReadinessDotClass — Plan 02 Task 1 pure function (will FAIL until Plan 02)
// ---------------------------------------------------------------------------

describe("resolveReadinessDotClass (Plan 02 Task 1 — RED until then)", () => {
  let resolveReadinessDotClass: (statuses: string) => string;

  beforeEach(async () => {
    try {
      const mod = await import("@/features/unit-database/UdbUnitRow");
      resolveReadinessDotClass = (mod as unknown as Record<string, (s: string) => string>).resolveReadinessDotClass;
    } catch {
      resolveReadinessDotClass = () => { throw new Error("UdbUnitRow not yet implemented"); };
    }
  });

  it("returns bg-emerald-400 for all-done statuses (Varnished)", () => {
    expect(resolveReadinessDotClass("Varnished|Varnished")).toContain("bg-emerald-400");
  });

  it("returns bg-emerald-400 for all-done statuses (Completed)", () => {
    expect(resolveReadinessDotClass("Completed")).toContain("bg-emerald-400");
  });

  it("returns bg-amber-500 for Display Ready (D-11) — not in DONE_STATUSES", () => {
    expect(resolveReadinessDotClass("Display Ready")).toContain("bg-amber-500");
  });

  it("returns bg-amber-500 for Battle Ready (D-11) — not in DONE_STATUSES", () => {
    expect(resolveReadinessDotClass("Battle Ready")).toContain("bg-amber-500");
  });

  it("returns bg-muted-foreground/50 for all Not Started", () => {
    expect(resolveReadinessDotClass("Not Started|Not Started")).toContain("bg-muted-foreground/50");
  });

  it("returns bg-amber-500 for mixed statuses", () => {
    expect(resolveReadinessDotClass("Completed|Built")).toContain("bg-amber-500");
  });
});
