/**
 * DX-02 -- Table counts query and grid rendering tests.
 *
 * Tests:
 *   - getTableCounts returns all 5 fields from DB queries
 *   - TableCountsGrid renders 5 StatCard instances with correct labels
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Part 1: Pure query function test ────────────────────────────────────────

const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

vi.mock("@/db/rules-client", () => ({
  getRulesDb: vi.fn(() => Promise.resolve({ select: vi.fn() })),
}));

import { getTableCounts } from "@/db/queries/diagnostics";

describe("getTableCounts", () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it("returns all 5 table count fields", async () => {
    mockSelect
      .mockResolvedValueOnce([{ c: 10 }])  // units
      .mockResolvedValueOnce([{ c: 5 }])   // painting_recipes
      .mockResolvedValueOnce([{ c: 3 }])   // unit_recipe_assignments
      .mockResolvedValueOnce([{ c: 7 }])   // unit_recipe_step_progress
      .mockResolvedValueOnce([{ c: 2 }]);  // synced_unit_points

    const result = await getTableCounts();

    expect(result).toEqual({
      units: 10,
      painting_recipes: 5,
      unit_recipe_assignments: 3,
      unit_recipe_step_progress: 7,
      synced_unit_points: 2,
    });
  });

  it("defaults to 0 when query returns empty array", async () => {
    mockSelect
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getTableCounts();

    expect(result.units).toBe(0);
    expect(result.painting_recipes).toBe(0);
    expect(result.unit_recipe_assignments).toBe(0);
    expect(result.unit_recipe_step_progress).toBe(0);
    expect(result.synced_unit_points).toBe(0);
  });
});

// ── Part 2: TableCountsGrid component test ──────────────────────────────────

// Mock the hooks to provide data directly
vi.mock("@/hooks/useDiagnostics", () => ({
  useTableCounts: vi.fn(),
}));

// Mock useCountUp so StatCard renders synchronously
vi.mock("@/hooks/useCountUp", () => ({
  useCountUp: (target: number) => target,
}));

// Mock useNavigate for StatCard
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

import { useTableCounts } from "@/hooks/useDiagnostics";
import { TableCountsGrid } from "@/features/data-health/TableCountsGrid";

const mockUseTableCounts = vi.mocked(useTableCounts);

describe("TableCountsGrid", () => {
  it("renders 5 StatCard instances with correct labels when data is loaded", () => {
    mockUseTableCounts.mockReturnValue({
      data: {
        units: 42,
        painting_recipes: 10,
        unit_recipe_assignments: 8,
        unit_recipe_step_progress: 15,
        synced_unit_points: 5,
      },
      isLoading: false,
    } as ReturnType<typeof useTableCounts>);

    render(<TableCountsGrid />);

    expect(screen.getByText("Units")).toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
    expect(screen.getByText("Assignments")).toBeInTheDocument();
    expect(screen.getByText("Step Progress")).toBeInTheDocument();
    expect(screen.getByText("Synced Points")).toBeInTheDocument();

    // Verify values are rendered
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders 5 skeleton cards when loading", () => {
    mockUseTableCounts.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useTableCounts>);

    const { container } = render(<TableCountsGrid />);

    // Should not render any StatCard labels
    expect(screen.queryByText("Units")).not.toBeInTheDocument();

    // Should have skeleton elements in grid
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid!.children.length).toBe(5);
  });
});
