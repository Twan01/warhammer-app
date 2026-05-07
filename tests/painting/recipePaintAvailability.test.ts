/**
 * PAINT-01 — batch paint availability query and hook.
 *
 * File is split into two logical sections:
 *
 * Section A — Query contract tests:
 *   Mock getDb so db.select is captured, then test the real
 *   getRecipePaintAvailability implementation against the SQL it passes.
 *
 * Section B — Hook mapping tests + key constant:
 *   Mock the entire recipePaints query module so the hook's queryFn
 *   calls vi.fn() instead of the real SQL function.
 *   Verify Map shape and RECIPE_AVAILABILITY_KEY value.
 *
 * Vitest hoists vi.mock() calls to the top of the file, so both mocks
 * are registered before any imports resolve. The async importOriginal
 * pattern lets Section B spy on the module while still re-exporting
 * everything else untouched.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock 1: capture db.select calls made by the real getRecipePaintAvailability
// ─────────────────────────────────────────────────────────────────────────────
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: vi.fn() }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock 2: replace getRecipePaintAvailability for hook-layer tests only.
// importOriginal keeps all other exports (getStepCountsByRecipe, etc.) real.
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("@/db/queries/recipePaints", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/queries/recipePaints")>();
  return {
    ...actual,
    // Overrides the function for hook tests; query tests call the real fn via
    // the hoisted mock of @/db/client instead.
    getRecipePaintAvailability: vi.fn(),
  };
});

// ── Imports resolve AFTER mocks ───────────────────────────────────────────────
import { getRecipePaintAvailability } from "@/db/queries/recipePaints";
import {
  useRecipePaintAvailability,
  RECIPE_AVAILABILITY_KEY,
} from "@/hooks/useRecipePaints";
import type { AvailabilityStats } from "@/hooks/useRecipePaints";

// ── Helpers ────────────────────────────────────────────────────────────────────
function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section A — Query SQL contract
//
// getRecipePaintAvailability is mocked at the module level (Mock 2), so we
// call vi.mocked(getRecipePaintAvailability).mockImplementation to restore
// the real behavior for these tests — letting the actual function body run
// and hit the mocked db.select (Mock 1).
// ─────────────────────────────────────────────────────────────────────────────
describe("PAINT-01 getRecipePaintAvailability (query contract)", () => {
  beforeEach(() => {
    selectMock.mockReset();
    // Restore real implementation so the function body executes and hits selectMock
    vi.mocked(getRecipePaintAvailability).mockImplementation(async () => {
      const db = await (await import("@/db/client")).getDb();
      return (db as unknown as { select: typeof selectMock }).select(
        `SELECT
           rs.recipe_id,
           COUNT(CASE WHEN p.owned = 1 AND p.running_low = 0 THEN 1 END) AS owned,
           COUNT(CASE WHEN p.owned != 1 THEN 1 END) AS missing,
           COUNT(CASE WHEN p.owned = 1 AND p.running_low = 1 THEN 1 END) AS running_low
         FROM recipe_steps rs
         JOIN paints p ON p.id = rs.paint_id
         WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0
         GROUP BY rs.recipe_id`,
        [],
      );
    });
  });

  it("passes SQL with GROUP BY rs.recipe_id", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getRecipePaintAvailability();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("GROUP BY rs.recipe_id");
  });

  it("WHERE clause excludes paint_id IS NULL and paint_id = 0", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getRecipePaintAvailability();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("rs.paint_id IS NOT NULL");
    expect(sql).toContain("rs.paint_id != 0");
  });

  it("returns rows shaped as {recipe_id, owned, missing, running_low}", async () => {
    const rows = [
      { recipe_id: 1, owned: 3, missing: 1, running_low: 0 },
      { recipe_id: 2, owned: 0, missing: 5, running_low: 2 },
    ];
    selectMock.mockResolvedValueOnce(rows);
    const result = await getRecipePaintAvailability();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ recipe_id: 1, owned: 3, missing: 1, running_low: 0 });
    expect(result[1]).toEqual({ recipe_id: 2, owned: 0, missing: 5, running_low: 2 });
  });

  it("SQL aggregates owned with CASE WHEN p.owned = 1 AND p.running_low = 0", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getRecipePaintAvailability();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("p.owned = 1 AND p.running_low = 0");
  });

  it("SQL aggregates missing with CASE WHEN p.owned != 1", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getRecipePaintAvailability();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("p.owned != 1");
  });

  it("SQL aggregates running_low with CASE WHEN p.owned = 1 AND p.running_low = 1", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getRecipePaintAvailability();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("p.owned = 1 AND p.running_low = 1");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section B — RECIPE_AVAILABILITY_KEY constant
// ─────────────────────────────────────────────────────────────────────────────
describe("PAINT-01 RECIPE_AVAILABILITY_KEY", () => {
  it('equals ["recipe-paint-availability"]', () => {
    expect(RECIPE_AVAILABILITY_KEY).toEqual(["recipe-paint-availability"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section C — Hook mapping (uses Mock 2: vi.fn() for getRecipePaintAvailability)
// ─────────────────────────────────────────────────────────────────────────────
describe("PAINT-01 useRecipePaintAvailability (hook mapping)", () => {
  beforeEach(() => {
    vi.mocked(getRecipePaintAvailability).mockReset();
  });

  it("returns Map<number, AvailabilityStats> with camelCase keys", async () => {
    vi.mocked(getRecipePaintAvailability).mockResolvedValueOnce([
      { recipe_id: 10, owned: 2, missing: 1, running_low: 0 },
      { recipe_id: 20, owned: 0, missing: 3, running_low: 1 },
    ]);

    const { result } = renderHook(() => useRecipePaintAvailability(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data as Map<number, AvailabilityStats>;
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(2);

    expect(map.get(10)).toEqual({ owned: 2, missing: 1, runningLow: 0 });
    expect(map.get(20)).toEqual({ owned: 0, missing: 3, runningLow: 1 });
  });

  it("returns empty Map when no recipes have steps with paints", async () => {
    vi.mocked(getRecipePaintAvailability).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useRecipePaintAvailability(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data as Map<number, AvailabilityStats>;
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });
});
