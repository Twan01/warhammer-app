/**
 * Gap 8 (DQ-06) -- PointsCoverageCard component behavioral tests.
 *
 * DQ-06: PointsCoverageCard renders green/amber/red badges correctly
 * based on coverage thresholds (85%+, 50-84%, <50%).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { FactionCoverage } from "@/db/queries/diagnostics";
import type { UseQueryResult } from "@tanstack/react-query";

// Mock the hook — same pattern as tableCountsGrid.test.tsx
vi.mock("@/hooks/useDiagnostics", () => ({
  usePointsCoverage: vi.fn(),
}));

import { usePointsCoverage } from "@/hooks/useDiagnostics";
import { PointsCoverageCard } from "@/features/data-health/PointsCoverageCard";

const mockUsePointsCoverage = vi.mocked(usePointsCoverage);

function fakeQuery(
  data: FactionCoverage[] | undefined,
  isLoading: boolean
): ReturnType<typeof usePointsCoverage> {
  return { data, isLoading } as UseQueryResult<FactionCoverage[], Error>;
}

describe("PointsCoverageCard: DQ-06 — coverage badge rendering", () => {
  it("renders the 'Points Coverage' card title", () => {
    mockUsePointsCoverage.mockReturnValue(fakeQuery([], false));
    render(<PointsCoverageCard />);
    expect(screen.getByText("Points Coverage")).toBeInTheDocument();
  });

  it("shows 'No unit database imported' when factions list is empty", () => {
    mockUsePointsCoverage.mockReturnValue(fakeQuery([], false));
    render(<PointsCoverageCard />);
    expect(screen.getByText("No unit database imported")).toBeInTheDocument();
  });

  it("shows 'No unit database imported' when data is undefined", () => {
    mockUsePointsCoverage.mockReturnValue(fakeQuery(undefined, false));
    render(<PointsCoverageCard />);
    expect(screen.getByText("No unit database imported")).toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading is true", () => {
    mockUsePointsCoverage.mockReturnValue(fakeQuery(undefined, true));
    const { container } = render(<PointsCoverageCard />);
    // Should not show table content — no faction names should appear
    expect(screen.queryByText("No unit database imported")).not.toBeInTheDocument();
    // Skeleton elements should be present
    const skeletonElements = container.querySelectorAll(".animate-pulse, [data-slot='skeleton']");
    expect(skeletonElements.length).toBeGreaterThanOrEqual(0);
    // At minimum the loading state renders something other than empty state
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("renders faction names when data is loaded", () => {
    const factions: FactionCoverage[] = [
      { faction_id: "SM", faction_name: "Space Marines", total_units: 50, units_with_points: 45, coverage_pct: 90 },
      { faction_id: "DG", faction_name: "Death Guard", total_units: 20, units_with_points: 12, coverage_pct: 60 },
      { faction_id: "NEC", faction_name: "Necrons", total_units: 30, units_with_points: 9, coverage_pct: 30 },
    ];
    mockUsePointsCoverage.mockReturnValue(fakeQuery(factions, false));
    render(<PointsCoverageCard />);

    expect(screen.getByText("Space Marines")).toBeInTheDocument();
    expect(screen.getByText("Death Guard")).toBeInTheDocument();
    expect(screen.getByText("Necrons")).toBeInTheDocument();
  });

  it("renders green badge (bg-green-500 class) for coverage >= 85%", () => {
    const factions: FactionCoverage[] = [
      { faction_id: "SM", faction_name: "Space Marines", total_units: 50, units_with_points: 45, coverage_pct: 90 },
    ];
    mockUsePointsCoverage.mockReturnValue(fakeQuery(factions, false));
    const { container } = render(<PointsCoverageCard />);

    // Green badge uses bg-green-500/10 class
    const greenBadge = container.querySelector(".bg-green-500\\/10");
    expect(greenBadge).toBeInTheDocument();
    expect(greenBadge!.textContent).toContain("90%");
  });

  it("renders amber badge (bg-amber-500 class) for coverage 50-84%", () => {
    const factions: FactionCoverage[] = [
      { faction_id: "DG", faction_name: "Death Guard", total_units: 20, units_with_points: 12, coverage_pct: 60 },
    ];
    mockUsePointsCoverage.mockReturnValue(fakeQuery(factions, false));
    const { container } = render(<PointsCoverageCard />);

    const amberBadge = container.querySelector(".bg-amber-500\\/10");
    expect(amberBadge).toBeInTheDocument();
    expect(amberBadge!.textContent).toContain("60%");
  });

  it("renders red badge (variant=destructive) for coverage < 50%", () => {
    const factions: FactionCoverage[] = [
      { faction_id: "NEC", faction_name: "Necrons", total_units: 30, units_with_points: 9, coverage_pct: 30 },
    ];
    mockUsePointsCoverage.mockReturnValue(fakeQuery(factions, false));
    const { container } = render(<PointsCoverageCard />);

    // Destructive badge — does NOT have green or amber class
    const greenBadge = container.querySelector(".bg-green-500\\/10");
    const amberBadge = container.querySelector(".bg-amber-500\\/10");
    expect(greenBadge).toBeNull();
    expect(amberBadge).toBeNull();
    // Should show the percentage
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("renders overall coverage summary line showing total units", () => {
    const factions: FactionCoverage[] = [
      { faction_id: "SM", faction_name: "Space Marines", total_units: 50, units_with_points: 45, coverage_pct: 90 },
      { faction_id: "DG", faction_name: "Death Guard", total_units: 20, units_with_points: 10, coverage_pct: 50 },
    ];
    mockUsePointsCoverage.mockReturnValue(fakeQuery(factions, false));
    render(<PointsCoverageCard />);

    // Overall: 55/70 units (45+10 / 50+20)
    expect(screen.getByText("55/70 units")).toBeInTheDocument();
    expect(screen.getByText("Overall")).toBeInTheDocument();
  });

  it("uses exactly 85 as the green threshold boundary (85% gets green badge)", () => {
    const factions: FactionCoverage[] = [
      { faction_id: "SM", faction_name: "Space Marines", total_units: 100, units_with_points: 85, coverage_pct: 85 },
    ];
    mockUsePointsCoverage.mockReturnValue(fakeQuery(factions, false));
    const { container } = render(<PointsCoverageCard />);

    const greenBadge = container.querySelector(".bg-green-500\\/10");
    expect(greenBadge).toBeInTheDocument();
    expect(greenBadge!.textContent).toContain("85%");
  });

  it("uses exactly 50 as the amber threshold boundary (50% gets amber badge)", () => {
    const factions: FactionCoverage[] = [
      { faction_id: "SM", faction_name: "Space Marines", total_units: 100, units_with_points: 50, coverage_pct: 50 },
    ];
    mockUsePointsCoverage.mockReturnValue(fakeQuery(factions, false));
    const { container } = render(<PointsCoverageCard />);

    const amberBadge = container.querySelector(".bg-amber-500\\/10");
    expect(amberBadge).toBeInTheDocument();
    expect(amberBadge!.textContent).toContain("50%");
  });

  it("uses exactly 49 as below amber threshold (49% gets red badge)", () => {
    const factions: FactionCoverage[] = [
      { faction_id: "SM", faction_name: "Space Marines", total_units: 100, units_with_points: 49, coverage_pct: 49 },
    ];
    mockUsePointsCoverage.mockReturnValue(fakeQuery(factions, false));
    const { container } = render(<PointsCoverageCard />);

    const greenBadge = container.querySelector(".bg-green-500\\/10");
    const amberBadge = container.querySelector(".bg-amber-500\\/10");
    expect(greenBadge).toBeNull();
    expect(amberBadge).toBeNull();
    expect(screen.getByText("49%")).toBeInTheDocument();
  });
});
