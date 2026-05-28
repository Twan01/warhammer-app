/**
 * Phase 100 SAD-01, SAD-02, SAD-04, APL-02, APL-03 — syncDerivedStatuses coverage.
 *
 * Tests all derivation paths (assembly, basing, varnish), section_type-first
 * matching with name-LIKE backward-compat fallback, override guards for all
 * three status fields, is_active_project auto-clear at 100%, and the guarantee
 * that syncDerivedStatuses never sets is_active_project = 1.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 *
 * SELECT call order inside syncDerivedStatuses (after Phase 100 implementation):
 *   0: unit row (painting_percentage + 3 override flags)
 *   1: assignment existence check
 *   2: hasAssemblySections (cnt)
 *   3: assemblyRows (incomplete count)
 *   4: hasBasingSections (cnt)
 *   5: basingRows (incomplete count)
 *   6: hasVarnishSections (cnt)
 *   7: varnishRows (incomplete count)
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import { syncDerivedStatuses_TEST } from "@/db/queries/recipeAssignments";

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});

/** Build a mock db handle (mirrors the shape of the real db from getDb()) */
const mockDb = { select: selectMock, execute: executeMock } as Parameters<typeof syncDerivedStatuses_TEST>[0];

// ---------------------------------------------------------------------------
// Helper: set up the standard 8-select sequence with all overrides = 0
// ---------------------------------------------------------------------------
function setupSelects({
  pct = 50,
  assemblyOverride = 0,
  basingOverride = 0,
  varnishedOverride = 0,
  hasAssembly = 1,
  assemblyIncomplete = 0,
  hasBasing = 1,
  basingIncomplete = 0,
  hasVarnish = 1,
  varnishIncomplete = 0,
}: {
  pct?: number;
  assemblyOverride?: number;
  basingOverride?: number;
  varnishedOverride?: number;
  hasAssembly?: number;
  assemblyIncomplete?: number;
  hasBasing?: number;
  basingIncomplete?: number;
  hasVarnish?: number;
  varnishIncomplete?: number;
} = {}) {
  // 0: unit row
  selectMock.mockResolvedValueOnce([{
    painting_percentage: pct,
    status_assembly_override: assemblyOverride,
    status_basing_override: basingOverride,
    status_varnished_override: varnishedOverride,
  }]);
  // 1: assignment existence
  selectMock.mockResolvedValueOnce([{ id: 1 }]);
  // 2: hasAssemblySections
  selectMock.mockResolvedValueOnce([{ cnt: hasAssembly }]);
  // 3: assemblyRows incomplete
  selectMock.mockResolvedValueOnce([{ incomplete: assemblyIncomplete }]);
  // 4: hasBasingSections
  selectMock.mockResolvedValueOnce([{ cnt: hasBasing }]);
  // 5: basingRows incomplete
  selectMock.mockResolvedValueOnce([{ incomplete: basingIncomplete }]);
  // 6: hasVarnishSections
  selectMock.mockResolvedValueOnce([{ cnt: hasVarnish }]);
  // 7: varnishRows incomplete
  selectMock.mockResolvedValueOnce([{ incomplete: varnishIncomplete }]);
}

// ---------------------------------------------------------------------------
// Group 1 — SAD-01: Assembly derivation
// ---------------------------------------------------------------------------
describe("SAD-01: assembly auto-derivation", () => {
  it("sets status_assembly derived value to 1 when all assembly section steps are complete", async () => {
    setupSelects({ hasAssembly: 1, assemblyIncomplete: 0 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("status_assembly");
    // $3 is the assembly param (unitId=$1, status=$2, assembly=$3...)
    expect(params[2]).toBe(1);
  });

  it("sets status_assembly derived value to 0 when assembly steps are incomplete", async () => {
    setupSelects({ hasAssembly: 1, assemblyIncomplete: 3 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [, params] = executeMock.mock.calls[0];
    expect(params[2]).toBe(0);
  });

  it("sets status_assembly derived value to 0 when no assembly sections exist", async () => {
    setupSelects({ hasAssembly: 0, assemblyIncomplete: 0 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [, params] = executeMock.mock.calls[0];
    expect(params[2]).toBe(0);
  });

  it("assembly section query uses section_type = 'assembly' dual-path clause", async () => {
    setupSelects({ hasAssembly: 1, assemblyIncomplete: 0 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const assemblySqls = selectMock.mock.calls
      .map(([sql]: [string]) => sql)
      .filter((sql: string) => sql.includes("assembly"));

    expect(assemblySqls.length).toBeGreaterThanOrEqual(1);
    const hasDualPath = assemblySqls.some(
      (sql: string) =>
        sql.includes("section_type = 'assembly'") &&
        sql.includes("LIKE '%assembly%'"),
    );
    expect(hasDualPath).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group 2 — SAD-02: section_type matching for basing and varnish
// ---------------------------------------------------------------------------
describe("SAD-02: section_type-first matching with name-LIKE fallback", () => {
  it("basing query uses section_type = 'basing' dual-path clause", async () => {
    setupSelects({ hasBasing: 1, basingIncomplete: 0 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const basingSqls = selectMock.mock.calls
      .map(([sql]: [string]) => sql)
      .filter((sql: string) => sql.includes("basing"));

    const hasDualPath = basingSqls.some(
      (sql: string) =>
        sql.includes("section_type = 'basing'") &&
        sql.includes("LIKE '%basing%'"),
    );
    expect(hasDualPath).toBe(true);
  });

  it("basing name-LIKE fallback preserves backward compat (null section_type + name match)", async () => {
    setupSelects({ hasBasing: 1, basingIncomplete: 0 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const basingSqls = selectMock.mock.calls
      .map(([sql]: [string]) => sql)
      .filter((sql: string) => sql.includes("basing"));

    // The fallback must check section_type IS NULL before the LIKE
    const hasNullFallback = basingSqls.some(
      (sql: string) =>
        sql.includes("section_type IS NULL") &&
        sql.includes("LIKE '%basing%'"),
    );
    expect(hasNullFallback).toBe(true);
  });

  it("varnish query uses section_type = 'varnish' dual-path clause", async () => {
    setupSelects({ hasVarnish: 1, varnishIncomplete: 0 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const varnishSqls = selectMock.mock.calls
      .map(([sql]: [string]) => sql)
      .filter((sql: string) => sql.includes("varnish"));

    const hasDualPath = varnishSqls.some(
      (sql: string) =>
        sql.includes("section_type = 'varnish'") &&
        sql.includes("LIKE '%varnish%'"),
    );
    expect(hasDualPath).toBe(true);
  });

  it("varnish name-LIKE fallback preserves backward compat (null section_type + name match)", async () => {
    setupSelects({ hasVarnish: 1, varnishIncomplete: 0 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const varnishSqls = selectMock.mock.calls
      .map(([sql]: [string]) => sql)
      .filter((sql: string) => sql.includes("varnish"));

    const hasNullFallback = varnishSqls.some(
      (sql: string) =>
        sql.includes("section_type IS NULL") &&
        sql.includes("LIKE '%varnish%'"),
    );
    expect(hasNullFallback).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group 3 — SAD-04: Override guards prevent auto-derivation
// ---------------------------------------------------------------------------
describe("SAD-04: override guards skip derivation when override = 1", () => {
  it("status_assembly_override = 1: assembly param is null in UPDATE (CASE WHEN preserved)", async () => {
    setupSelects({
      assemblyOverride: 1,
      hasAssembly: 1,
      assemblyIncomplete: 0,
    });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [sql, params] = executeMock.mock.calls[0];
    // CASE WHEN $3 IS NOT NULL pattern must exist
    expect(sql).toContain("$3 IS NOT NULL");
    // When override = 1, the assembly param must be null so CASE WHEN skips
    expect(params[2]).toBeNull();
  });

  it("status_basing_override = 1: basing param is null in UPDATE", async () => {
    setupSelects({
      basingOverride: 1,
      hasBasing: 1,
      basingIncomplete: 0,
    });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("$4 IS NOT NULL");
    expect(params[3]).toBeNull();
  });

  it("status_varnished_override = 1: varnished param is null in UPDATE", async () => {
    setupSelects({
      varnishedOverride: 1,
      hasVarnish: 1,
      varnishIncomplete: 0,
    });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("$5 IS NOT NULL");
    expect(params[4]).toBeNull();
  });

  it("all overrides = 0: all three derived values are non-null in UPDATE", async () => {
    setupSelects({
      assemblyOverride: 0,
      basingOverride: 0,
      varnishedOverride: 0,
      hasAssembly: 1,
      assemblyIncomplete: 0,
      hasBasing: 1,
      basingIncomplete: 0,
      hasVarnish: 1,
      varnishIncomplete: 0,
    });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [, params] = executeMock.mock.calls[0];
    // params: [unitId, status, assembly, basing, varnished, activeProjectClear]
    expect(params[2]).not.toBeNull(); // assembly
    expect(params[3]).not.toBeNull(); // basing
    expect(params[4]).not.toBeNull(); // varnished
  });
});

// ---------------------------------------------------------------------------
// Group 4 — APL-02: is_active_project auto-clear at 100%
// ---------------------------------------------------------------------------
describe("APL-02: is_active_project auto-clear at 100%", () => {
  it("painting_percentage = 100 triggers is_active_project clear (param $6 = 1)", async () => {
    setupSelects({ pct: 100 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [sql, params] = executeMock.mock.calls[0];
    // UPDATE must contain the CASE WHEN $6 = 1 THEN 0 pattern
    expect(sql).toContain("is_active_project");
    expect(sql).toContain("$6");
    // $6 should be 1 (trigger the clear) when pct = 100
    expect(params[5]).toBe(1);
  });

  it("painting_percentage < 100 does NOT trigger is_active_project clear (param $6 = 0)", async () => {
    setupSelects({ pct: 75 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [, params] = executeMock.mock.calls[0];
    // $6 should be 0 (no clear) when pct < 100
    expect(params[5]).toBe(0);
  });

  it("painting_percentage = 0 does NOT trigger is_active_project clear", async () => {
    setupSelects({ pct: 0 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [, params] = executeMock.mock.calls[0];
    expect(params[5]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group 5 — APL-03: syncDerivedStatuses never sets is_active_project = 1
// ---------------------------------------------------------------------------
describe("APL-03: syncDerivedStatuses never sets is_active_project = 1 (only creates do)", () => {
  it("no UPDATE SQL contains 'is_active_project = 1'", async () => {
    setupSelects({ pct: 100 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const updateSqls = executeMock.mock.calls.map(([sql]: [string]) => sql);
    const setsActiveToOne = updateSqls.some((sql: string) =>
      sql.includes("is_active_project = 1"),
    );
    expect(setsActiveToOne).toBe(false);
  });

  it("is_active_project update uses CASE WHEN to set 0, never unconditionally sets 1", async () => {
    setupSelects({ pct: 100 });

    await syncDerivedStatuses_TEST(mockDb, 1);

    const [sql] = executeMock.mock.calls[0];
    // Must contain CASE WHEN pattern for safe conditional clear
    expect(sql).toContain("CASE WHEN");
    expect(sql).toContain("THEN 0");
    // Must NOT have a literal = 1 assignment for is_active_project
    expect(sql).not.toContain("is_active_project = 1");
  });
});

// ---------------------------------------------------------------------------
// Group 6 — Early-exit guards
// ---------------------------------------------------------------------------
describe("early-exit guards", () => {
  it("returns early without executing UPDATE when unit row is missing", async () => {
    // unit row returns empty
    selectMock.mockResolvedValueOnce([]);

    await syncDerivedStatuses_TEST(mockDb, 999);

    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns early without executing UPDATE when no recipe assignments exist", async () => {
    // unit row present
    selectMock.mockResolvedValueOnce([{
      painting_percentage: 50,
      status_assembly_override: 0,
      status_basing_override: 0,
      status_varnished_override: 0,
    }]);
    // no assignments
    selectMock.mockResolvedValueOnce([]);

    await syncDerivedStatuses_TEST(mockDb, 1);

    expect(executeMock).not.toHaveBeenCalled();
  });
});
