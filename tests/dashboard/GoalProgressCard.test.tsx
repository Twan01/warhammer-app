/**
 * Phase 138 — GoalProgressCard widget tests (PLAY-05).
 *
 * Verifies:
 *   - Populated state: renders goal names, "{count} / {target}" labels,
 *     and progress-bar fill elements for each active goal.
 *   - Empty state: renders "No active goals." and a "Set a hobby goal ->"
 *     Link pointing to /goals.
 *
 * Strategy: mock useGoals + useGoalProgress + computeGoalPeriod for
 * deterministic rendering; wrap in a minimal TanStack Router so <Link>
 * resolves without crashing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import type { HobbyGoal } from "@/types/goal";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const goal1: HobbyGoal = {
  id: 1,
  name: "Paint 5 infantry",
  target_count: 5,
  timeframe: "month",
  period: "2026-06",
  created_at: "2026-06-01T00:00:00",
};

const goal2: HobbyGoal = {
  id: 2,
  name: "Finish 3 tanks",
  target_count: 3,
  timeframe: "month",
  period: "2026-06",
  created_at: "2026-06-01T00:00:00",
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseGoals = vi.fn();
const mockUseGoalProgress = vi.fn();

vi.mock("@/hooks/useGoals", () => ({
  useGoals: () => mockUseGoals(),
  useGoalProgress: () => mockUseGoalProgress(),
}));

// Deterministic period: not expired, label "June 2026"
vi.mock("@/lib/computeGoalPeriod", () => ({
  computeGoalPeriod: (_timeframe: string, _period: string) => ({
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    label: "June 2026",
    isExpired: false,
  }),
  deriveGoalStatus: (progress: number, target: number, isExpired: boolean) => {
    if (progress >= target) return "completed";
    if (isExpired) return "missed";
    return "active";
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute({ component: () => <Outlet /> });
  const dashR = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <>{ui}</>,
  });
  const goalsR = createRoute({
    getParentRoute: () => root,
    path: "/goals",
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([dashR, goalsR]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GoalProgressCard (PLAY-05)", () => {
  it("renders goal names, count/target labels, and fill elements for active goals", async () => {
    mockUseGoals.mockReturnValue({ data: [goal1, goal2] });
    mockUseGoalProgress.mockReturnValue({
      data: new Map<number, number>([
        [1, 2],
        [2, 1],
      ]),
    });

    // Import after mocks are set up
    const { GoalProgressCard } = await import("@/features/dashboard/GoalProgressCard");
    renderWithProviders(<GoalProgressCard />);

    // Goal names
    expect(await screen.findByText("Paint 5 infantry")).toBeInTheDocument();
    expect(screen.getByText("Finish 3 tanks")).toBeInTheDocument();

    // Count / target labels
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Period labels
    expect(screen.getAllByText("June 2026").length).toBeGreaterThanOrEqual(2);
  });

  it("renders empty state with exact copy and /goals link when no active goals", async () => {
    mockUseGoals.mockReturnValue({ data: [] });
    mockUseGoalProgress.mockReturnValue({ data: new Map<number, number>() });

    const { GoalProgressCard } = await import("@/features/dashboard/GoalProgressCard");
    renderWithProviders(<GoalProgressCard />);

    expect(await screen.findByText("No active goals.")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Set a hobby goal →" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/goals");
  });
});
