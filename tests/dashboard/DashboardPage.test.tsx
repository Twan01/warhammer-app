/**
 * DASH-01..06, DASH-08 — DashboardPage assembly tests.
 *
 * We use a wrapping QueryClientProvider so useDashboardStats runs in test
 * mode. We mock the underlying queries module so this test stays a pure
 * component test (no SQLite dependency).
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
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ActiveFactionProvider } from "@/context/ActiveFactionContext";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

// Mock the dashboard query module — DashboardPage indirectly consumes this
// through useDashboardStats. Different tests override the return value.
vi.mock("@/db/queries/dashboard", () => ({
  getDashboardStats: vi.fn(),
}));
import { getDashboardStats } from "@/db/queries/dashboard";

// Mock factions query so ActiveFactionProvider doesn't hit SQLite in tests.
vi.mock("@/db/queries/factions", () => ({
  getFactions: vi.fn().mockResolvedValue([]),
  getFactionById: vi.fn(),
  createFaction: vi.fn(),
  updateFaction: vi.fn(),
  deleteFaction: vi.fn(),
}));

function f(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Tau",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#3a4f96",
    icon_path: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function u(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Fire Warrior",
    category: null,
    unit_type: null,
    model_count: null,
    owned_count: null,
    points: 100,
    status_assembly: 1,
    status_painting: "Completed",
    painting_percentage: 100,
    status_basing: 1,
    status_varnished: 1,
    is_active_project: 1,
    priority: null,
    target_completion_date: null,
    purchase_date: null,
    purchase_price: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-05-01 11:00:00",
    ...over,
  };
}

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Minimal router so useNavigate from FactionSummaryCard / DashboardEmptyState doesn't crash.
  // ActiveFactionProvider is inside the root component (mirrors router.tsx pattern).
  const root = createRootRoute({
    component: () => (
      <ActiveFactionProvider>
        <Outlet />
      </ActiveFactionProvider>
    ),
  });
  const dashboardR = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <>{ui}</>,
  });
  const collectionR = createRoute({
    getParentRoute: () => root,
    path: "/collection",
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([dashboardR, collectionR]),
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

describe("DashboardPage", () => {
  it("renders dashboard with all sections (DASH-01..06)", async () => {
    const tau = f({ id: 1, name: "Tau" });
    const ultra = f({ id: 2, name: "Ultra" });
    vi.mocked(getDashboardStats).mockResolvedValue({
      units: [
        u({ id: 1, faction_id: 1, name: "Fire Warrior", points: 100, status_painting: "Completed" }),
        u({
          id: 2,
          faction_id: 2,
          name: "Intercessor",
          points: 200,
          status_painting: "Built",
          is_active_project: 0,
          status_assembly: 1,
          status_basing: 0,
          painting_percentage: 30,
        }),
      ],
      factions: [tau, ultra],
    });
    renderWithProviders(<DashboardPage />);

    // DASH-01 stat labels
    expect(await screen.findByText("Total Models")).toBeInTheDocument();
    expect(screen.getByText("Fully Painted")).toBeInTheDocument();
    expect(screen.getByText("Battle-Ready Points")).toBeInTheDocument();
    // "Active Projects" appears as both a stat card label and a list heading — both are correct
    expect(screen.getAllByText("Active Projects").length).toBeGreaterThanOrEqual(1);

    // DASH-03/04 progress section
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Painting Progress")).toBeInTheDocument();
    expect(screen.getByText("Assembly Progress")).toBeInTheDocument();
    expect(screen.getByText("Basing Progress")).toBeInTheDocument();

    // DASH-02 faction section
    expect(screen.getByText("By Faction")).toBeInTheDocument();
    // Faction names appear in FactionSummaryCard AND in list row Badges — use getAllByText
    expect(screen.getAllByText("Tau").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ultra").length).toBeGreaterThanOrEqual(1);

    // DASH-05/06 list headings
    expect(screen.getAllByText("Active Projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Recently Updated")).toBeInTheDocument();

    // Page heading
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders empty state when no units exist (DASH-08)", async () => {
    vi.mocked(getDashboardStats).mockResolvedValue({ units: [], factions: [] });
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Your collection is empty")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add units to your collection to start tracking your hobby progress."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Collection" })).toBeInTheDocument();

    // None of the section labels should render in empty state
    expect(screen.queryByText("Progress")).not.toBeInTheDocument();
    expect(screen.queryByText("By Faction")).not.toBeInTheDocument();
  });

  it("renders error state when query fails", async () => {
    vi.mocked(getDashboardStats).mockRejectedValue(new Error("DB unreachable"));
    renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByText("Failed to load dashboard. Try refreshing the app.")
    ).toBeInTheDocument();
  });
});
