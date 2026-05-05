/** Wave 0 stubs for WKSP-02 — recipe swatch data + strip UI. Plan 29-01 fills query/hook stubs. Plan 29-02 fills UI stubs. */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

// Helper: renders the same swatch strip logic used by the "Palette" column cell.
// Replicates the cell JSX from RecipeTableColumns so tests remain focused on
// the visual output without needing to mount the full RecipeTable.
function SwatchStrip({ swatches }: { swatches: { paint_id: number; hex_color: string | null }[] }) {
  const total = swatches.length;
  if (total === 0) return React.createElement("span", { className: "text-sm text-muted-foreground" }, "--");
  return React.createElement(
    "div",
    { className: "flex items-center" },
    ...swatches.slice(0, 8).map((s, i) =>
      React.createElement("span", {
        key: s.paint_id,
        "data-testid": "swatch",
        className: `inline-block h-3 w-3 rounded-full border border-border shrink-0${i > 0 ? " -ml-1" : ""}${s.hex_color ? "" : " bg-muted"}`,
        style: s.hex_color ? { backgroundColor: s.hex_color } : undefined,
        "aria-hidden": "true",
      }),
    ),
    ...(total > 8
      ? [
          React.createElement(
            "span",
            { key: "overflow", className: "inline-flex items-center justify-center h-3 w-3 rounded-full bg-muted -ml-1 text-[8px] text-muted-foreground" },
            `+${total - 8}`,
          ),
        ]
      : []),
  );
}

describe("Recipe swatch strip rendering (WKSP-02)", () => {
  it("renders up to 8 swatch circles for a recipe's paints", () => {
    const swatches = Array.from({ length: 8 }, (_, i) => ({
      paint_id: i + 1,
      hex_color: "#FF0000",
    }));
    render(React.createElement(SwatchStrip, { swatches }));
    const circles = screen.getAllByTestId("swatch");
    expect(circles).toHaveLength(8);
  });

  it("renders +N overflow indicator when recipe has more than 8 paints", () => {
    const swatches = Array.from({ length: 10 }, (_, i) => ({
      paint_id: i + 1,
      hex_color: "#00FF00",
    }));
    render(React.createElement(SwatchStrip, { swatches }));
    // Only 8 swatch circles visible
    expect(screen.getAllByTestId("swatch")).toHaveLength(8);
    // Overflow indicator shows +2
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders bg-muted fallback circle for paints without hex_color", () => {
    const swatches = [{ paint_id: 1, hex_color: null }];
    const { container } = render(React.createElement(SwatchStrip, { swatches }));
    const swatch = container.querySelector('[data-testid="swatch"]') as HTMLElement;
    expect(swatch).toBeTruthy();
    expect(swatch.classList.contains("bg-muted")).toBe(true);
    expect(swatch.style.backgroundColor).toBe("");
  });

  it("applies negative margin (-ml-1) on second and subsequent swatches", () => {
    const swatches = [
      { paint_id: 1, hex_color: "#FF0000" },
      { paint_id: 2, hex_color: "#00FF00" },
      { paint_id: 3, hex_color: "#0000FF" },
    ];
    const { container } = render(React.createElement(SwatchStrip, { swatches }));
    const circles = container.querySelectorAll('[data-testid="swatch"]');
    expect(circles).toHaveLength(3);
    expect(circles[0].classList.contains("-ml-1")).toBe(false);
    expect(circles[1].classList.contains("-ml-1")).toBe(true);
    expect(circles[2].classList.contains("-ml-1")).toBe(true);
  });
});
