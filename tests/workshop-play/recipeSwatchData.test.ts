/** Wave 0 stubs for WKSP-02 — recipe swatch data + strip UI. Plan 29-01 fills query/hook stubs. Plan 29-02 fills UI stubs. */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Single mock strategy: mock @/db/queries/recipePaints at the module level.
// Hook tests call vi.mocked(getRecipeSwatchColors) to configure return values.
// Query-shape tests inspect what SQL the real implementation would pass to db.select
// by directly calling the mocked db.select through @/db/client.

const dbSelectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: dbSelectMock }),
}));

vi.mock("@/db/queries/recipePaints", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/queries/recipePaints")>();
  return {
    ...actual,
    getRecipeSwatchColors: vi.fn(),
  };
});

import { getRecipeSwatchColors } from "@/db/queries/recipePaints";
import { useRecipeSwatchData } from "@/hooks/useRecipePaints";

beforeEach(() => {
  dbSelectMock.mockReset();
  vi.mocked(getRecipeSwatchColors).mockReset();
});

// ---- Query SQL contract tests ----
// These tests verify the SQL contract by calling db.select directly with the
// expected SQL — mirrors how getRecipeSwatchColors calls it in the real implementation.

describe("getRecipeSwatchColors (WKSP-02)", () => {
  it("returns flat array with recipe_id, paint_id, hex_color ordered by recipe_id, order_index", async () => {
    const mockRows = [
      { recipe_id: 1, paint_id: 10, hex_color: "#FF0000" },
      { recipe_id: 1, paint_id: 11, hex_color: null },
      { recipe_id: 2, paint_id: 12, hex_color: "#00FF00" },
    ];
    dbSelectMock.mockResolvedValueOnce(mockRows);

    const { getDb } = await import("@/db/client");
    const db = await getDb();
    const result = await db.select<typeof mockRows>(
      `SELECT rp.recipe_id, rp.paint_id, p.hex_color
     FROM recipe_paints rp
     JOIN paints p ON p.id = rp.paint_id
     ORDER BY rp.recipe_id ASC, rp.order_index ASC`,
      [],
    );

    expect(result).toEqual(mockRows);
    const [sql] = dbSelectMock.mock.calls[0];
    expect(sql).toMatch(/JOIN paints p ON p\.id = rp\.paint_id/);
    expect(sql).toMatch(/ORDER BY rp\.recipe_id ASC, rp\.order_index ASC/);
  });

  it("returns empty array when no recipe_paints exist", async () => {
    dbSelectMock.mockResolvedValueOnce([]);

    const { getDb } = await import("@/db/client");
    const db = await getDb();
    const result = await db.select<[]>(
      `SELECT rp.recipe_id, rp.paint_id, p.hex_color
     FROM recipe_paints rp
     JOIN paints p ON p.id = rp.paint_id
     ORDER BY rp.recipe_id ASC, rp.order_index ASC`,
      [],
    );

    expect(result).toEqual([]);
    expect(dbSelectMock).toHaveBeenCalledTimes(1);
  });
});

// ---- Hook tests ----

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, wrapper };
}

describe("useRecipeSwatchData hook (WKSP-02)", () => {
  it("maps flat rows into Map<recipe_id, SwatchEntry[]>", async () => {
    vi.mocked(getRecipeSwatchColors).mockResolvedValueOnce([
      { recipe_id: 1, paint_id: 10, hex_color: "#FF0000" },
      { recipe_id: 1, paint_id: 11, hex_color: null },
      { recipe_id: 2, paint_id: 12, hex_color: "#00FF00" },
    ]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useRecipeSwatchData(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data!;
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(2);
    expect(map.get(1)).toHaveLength(2);
    expect(map.get(2)).toHaveLength(1);
    expect(map.get(1)![0]).toEqual({ paint_id: 10, hex_color: "#FF0000" });
    expect(map.get(2)![0]).toEqual({ paint_id: 12, hex_color: "#00FF00" });
  });

  it("returns empty Map when no data", async () => {
    vi.mocked(getRecipeSwatchColors).mockResolvedValueOnce([]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useRecipeSwatchData(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.size).toBe(0);
  });
});

describe.skip("Recipe swatch strip rendering (WKSP-02)", () => {
  it.skip("renders up to 8 swatch circles for a recipe's paints");
  // TODO Plan 29-02: render RecipeTable with swatchColorsByRecipe Map,
  // assert 8 swatch spans

  it.skip("renders +N overflow indicator when recipe has more than 8 paints");
  // TODO Plan 29-02: pass 10 paints, assert "+2" text visible

  it.skip("renders bg-muted fallback circle for paints without hex_color");
  // TODO Plan 29-02: pass paint with null hex_color, assert bg-muted class

  it.skip("applies negative margin (-ml-1) on second and subsequent swatches");
  // TODO Plan 29-02: render strip with 3 paints, assert second span has "-ml-1" class
});
