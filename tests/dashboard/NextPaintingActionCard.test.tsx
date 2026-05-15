/**
 * Phase 78 — NextPaintingActionCard component behavioral tests
 * (Task 78-02-01, Req GD-01/DB-01).
 *
 * Verifies:
 * - Loading state: skeleton renders
 * - Empty state: renders "No painting action found" with correct body text
 * - Data state: renders step description, section_name, time estimate
 * - Paint availability dots: emerald/amber/zinc by status
 * - "Go to recipe" link is present
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { NextPaintingAction } from "@/hooks/useNextPaintingAction";

// Controllable mock state
let mockData: NextPaintingAction | null = null;
let mockIsLoading = false;

vi.mock("@/hooks/useNextPaintingAction", () => ({
  useNextPaintingAction: () => ({ data: mockData, isLoading: mockIsLoading }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import { NextPaintingActionCard } from "@/features/dashboard/NextPaintingActionCard";

const MOCK_STEP: NextPaintingAction = {
  assignment_id: 1,
  unit_id: 10,
  unit_name: "Intercessors",
  recipe_id: 5,
  recipe_name: "Ultramarines Blue",
  recipe_step_id: 3,
  description: "Apply base coat Macragge Blue",
  section_name: "Basecoat",
  section_id: 2,
  order_index: 0,
  time_estimate_minutes: 20,
  created_at: "2026-01-10T12:00:00.000Z",
  paints: [
    { paint_id: 1, name: "Macragge Blue", brand: "Citadel", status: "owned" },
    { paint_id: 2, name: "Contrast Black", brand: "Citadel", status: "missing" },
    { paint_id: 3, name: "Nuln Oil", brand: "Citadel", status: "running-low" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockData = null;
  mockIsLoading = false;
});

describe("NextPaintingActionCard — loading state", () => {
  it("renders a skeleton while the hook is loading", () => {
    mockIsLoading = true;
    render(<NextPaintingActionCard />);
    const skeletons = document.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("NextPaintingActionCard — empty state (no assignments)", () => {
  it("renders 'No painting action found' heading when data is null", () => {
    mockData = null;
    mockIsLoading = false;
    render(<NextPaintingActionCard />);
    expect(screen.getByText("No painting action found")).toBeInTheDocument();
  });

  it("renders the empty state body text directing user to assign a recipe", () => {
    mockData = null;
    render(<NextPaintingActionCard />);
    expect(
      screen.getByText("Assign a recipe to a unit to see your next step here.")
    ).toBeInTheDocument();
  });
});

describe("NextPaintingActionCard — data state (step description)", () => {
  it("renders the step description text", () => {
    mockData = MOCK_STEP;
    render(<NextPaintingActionCard />);
    expect(screen.getByText("Apply base coat Macragge Blue")).toBeInTheDocument();
  });

  it("renders section_name when present", () => {
    mockData = MOCK_STEP;
    render(<NextPaintingActionCard />);
    expect(screen.getByText(/Basecoat/)).toBeInTheDocument();
  });

  it("does not render section separator when section_name is null", () => {
    mockData = { ...MOCK_STEP, section_name: null };
    render(<NextPaintingActionCard />);
    // Section name text should not appear
    expect(screen.queryByText(/Basecoat/)).not.toBeInTheDocument();
  });

  it("renders time estimate row when time_estimate_minutes is not null", () => {
    mockData = MOCK_STEP;
    render(<NextPaintingActionCard />);
    expect(screen.getByText(/Est\. 20 min/)).toBeInTheDocument();
  });

  it("does not render time estimate row when time_estimate_minutes is null", () => {
    mockData = { ...MOCK_STEP, time_estimate_minutes: null };
    render(<NextPaintingActionCard />);
    expect(screen.queryByText(/Est\./)).not.toBeInTheDocument();
  });
});

describe("NextPaintingActionCard — paint availability dots", () => {
  it("renders paint names for all paints in the step", () => {
    mockData = MOCK_STEP;
    render(<NextPaintingActionCard />);
    expect(screen.getByText("Macragge Blue")).toBeInTheDocument();
    expect(screen.getByText("Contrast Black")).toBeInTheDocument();
    expect(screen.getByText("Nuln Oil")).toBeInTheDocument();
  });

  it("renders emerald-500 dot for owned paint", () => {
    mockData = { ...MOCK_STEP, paints: [{ paint_id: 1, name: "Macragge Blue", brand: "Citadel", status: "owned" }] };
    render(<NextPaintingActionCard />);
    const dots = document.querySelectorAll(".bg-emerald-500");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("renders zinc-400 dot for missing paint", () => {
    mockData = { ...MOCK_STEP, paints: [{ paint_id: 2, name: "Contrast Black", brand: "Citadel", status: "missing" }] };
    render(<NextPaintingActionCard />);
    const dots = document.querySelectorAll(".bg-zinc-400");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("renders amber-500 dot for running-low paint", () => {
    mockData = { ...MOCK_STEP, paints: [{ paint_id: 3, name: "Nuln Oil", brand: "Citadel", status: "running-low" }] };
    render(<NextPaintingActionCard />);
    const dots = document.querySelectorAll(".bg-amber-500");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("does not render paint row when paints array is empty", () => {
    mockData = { ...MOCK_STEP, paints: [] };
    render(<NextPaintingActionCard />);
    expect(screen.queryByText("Macragge Blue")).not.toBeInTheDocument();
  });
});

describe("NextPaintingActionCard — navigation link", () => {
  it("renders 'Go to recipe' link pointing to /painting-projects", () => {
    mockData = MOCK_STEP;
    render(<NextPaintingActionCard />);
    const link = screen.getByText("Go to recipe");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/painting-projects");
  });
});
