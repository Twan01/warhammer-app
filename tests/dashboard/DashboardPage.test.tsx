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

// jsdom does not define window.matchMedia — install it via Object.defineProperty so
// useCountUp (called by AnimatedNumber inside the hero StatCards) has a working
// implementation. Tests can override per-test via vi.spyOn. vi.restoreAllMocks() in
// beforeEach restores the spy back to this base implementation between tests.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockReturnValue({
    matches: false,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList),
});

function f(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Tau",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#3a4f96",
    icon_path: null,
    lore_notes: null,
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
    purchase_price_pence: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    lore_notes: null,
    undercoat: null,
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
  const armyListsR = createRoute({
    getParentRoute: () => root,
    path: "/army-lists",
    component: () => null,
  });
  const paintingProjectsR = createRoute({
    getParentRoute: () => root,
    path: "/painting-projects",
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([dashboardR, collectionR, armyListsR, paintingProjectsR]),
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
  vi.restoreAllMocks();
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

    // DASH-01 — stat labels (top row)
    expect(await screen.findByText("Total Models")).toBeInTheDocument();
    expect(screen.getByText("Fully Painted")).toBeInTheDocument();
    expect(screen.getByText("Battle-Ready Points")).toBeInTheDocument();
    expect(screen.getAllByText("Active Projects").length).toBeGreaterThanOrEqual(1);

    // DASH-01 — page title is now "Hobby Command Center" (Wave 3 rework)
    expect(screen.getByRole("heading", { level: 1, name: "Hobby Command Center" })).toBeInTheDocument();

    // DASH-05 — By Faction section
    expect(screen.getByText("By Faction")).toBeInTheDocument();
    expect(screen.getAllByText("Tau").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ultra").length).toBeGreaterThanOrEqual(1);

    // DASH-04 — HobbyPipeline replaces the old Progress section (no "Progress" heading)
    expect(screen.queryByText("Progress")).not.toBeInTheDocument();
    expect(screen.queryByText("Painting Progress")).not.toBeInTheDocument();

    // DASH-06 — old two-column list headings are replaced by RecentActivityFeed
    expect(screen.queryByText("Recently Updated")).not.toBeInTheDocument();
  });

  it("renders empty state when no units exist (DASH-08)", async () => {
    vi.mocked(getDashboardStats).mockResolvedValue({ units: [], factions: [] });
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("HobbyForge")).toBeInTheDocument();
    expect(screen.getByText("Your collection is empty")).toBeInTheDocument();
    expect(
      screen.getByText(
        "HobbyForge tracks what you own, what's painted, and what's ready to play. Add your first unit to get started.",
        { normalizer: (text) => text.replace(/\s+/g, " ").trim() }
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add your first unit" })).toBeInTheDocument();

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

  it("animates hero stat values to their final integers after data loads (UI-07)", async () => {
    // Force useCountUp to short-circuit to target by faking prefers-reduced-motion=true.
    // This makes the test deterministic — no fake-timer plumbing needed; useCountUp returns
    // target immediately (Pitfall 5 short-circuit). The visual animation behavior is
    // covered by the unit tests in tests/dashboard/useCountUp.test.ts.
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);

    const tau = f({ id: 1, name: "Tau" });
    vi.mocked(getDashboardStats).mockResolvedValue({
      units: [
        u({ id: 1, faction_id: 1, name: "Fire Warrior", points: 100, status_painting: "Completed" }),
        u({ id: 2, faction_id: 1, name: "Crisis Suit", points: 150, status_painting: "Completed" }),
      ],
      factions: [tau],
    });

    renderWithProviders(<DashboardPage />);

    // Wait for data to load — labels appear once stats compute.
    expect(await screen.findByText("Total Models")).toBeInTheDocument();

    // The 4 hero values: totalModels=2, fullyPainted=2, battleReadyPoints=250 (both painted),
    // activeProjectsCount=2 (both have is_active_project=1 in the u() factory default).
    // Because reduced-motion is true, useCountUp returns target immediately — the final
    // integer is in the DOM by the time the labels render.
    // Use getAllByText because "2" appears multiple times (Total Models, Fully Painted, Active Projects).
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    // "250" now appears in both the Battle-Ready Points StatCard and the FactionSummaryCard
    // pts line — use getAllByText to assert at least one match exists.
    expect(screen.getAllByText("250").length).toBeGreaterThanOrEqual(1);
  });

  it("active FactionSummaryCard has ring-2 ring-faction-accent class when faction is active (UI-08)", async () => {
    // Pre-set the active faction in localStorage BEFORE render so ActiveFactionProvider's
    // synchronous useState initializer picks it up — no flash of inactive state.
    window.localStorage.setItem("active-faction-id", "1");

    const tau = f({ id: 1, name: "Tau" });
    vi.mocked(getDashboardStats).mockResolvedValue({
      units: [
        u({ id: 1, faction_id: 1, name: "Fire Warrior", points: 100, status_painting: "Completed" }),
      ],
      factions: [tau],
    });

    renderWithProviders(<DashboardPage />);

    // Wait for data to load
    expect(await screen.findByText("Total Models")).toBeInTheDocument();

    // FactionSummaryCard renders as role="button" with aria-label={faction.name}.
    // When isActive=true, its className includes "ring-2 ring-faction-accent".
    const factionCard = screen.getByRole("button", { name: "Tau" });
    expect(factionCard.className).toContain("ring-2");
    expect(factionCard.className).toContain("ring-faction-accent");

    // Cleanup — leave localStorage clean for downstream tests
    window.localStorage.removeItem("active-faction-id");
  });

  it("uses grid layout container in error state (LAYOUT-01 atomicity)", async () => {
    vi.mocked(getDashboardStats).mockRejectedValue(new Error("DB unreachable"));
    const { container } = renderWithProviders(<DashboardPage />);
    await screen.findByText("Failed to load dashboard. Try refreshing the app.");
    const gridContainer = container.querySelector(".grid.grid-cols-1");
    expect(gridContainer).not.toBeNull();
  });

  it("StatCards in top row have role='button' for navigation (LAYOUT-02)", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);

    const tau = f({ id: 1, name: "Tau" });
    vi.mocked(getDashboardStats).mockResolvedValue({
      units: [u({ id: 1, faction_id: 1, name: "Fire Warrior", points: 100, status_painting: "Completed" })],
      factions: [tau],
    });
    renderWithProviders(<DashboardPage />);
    await screen.findByText("Total Models");

    // The 4 top-row StatCards with to props should be present as buttons.
    // FactionSummaryCard also renders role="button", so we find by text content.
    const buttons = screen.getAllByRole("button");
    const totalModelsButton = buttons.find((b) => b.textContent?.includes("Total Models"));
    expect(totalModelsButton).toBeDefined();
  });

  it("Hobby Health StatCards do NOT have role='button' (no to prop — LAYOUT-02 backward compat)", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);

    const tau = f({ id: 1, name: "Tau" });
    vi.mocked(getDashboardStats).mockResolvedValue({
      units: [u({ id: 1, faction_id: 1, name: "Fire Warrior", points: 100, status_painting: "Completed" })],
      factions: [tau],
    });

    renderWithProviders(<DashboardPage />);
    await screen.findByText("Total Models");

    // Hobby Health StatCards (velocity, streak) do NOT have to prop — must not be role=button
    const allButtons = screen.getAllByRole("button");
    const velocityButton = allButtons.find((b) => b.textContent?.includes("Hobby Velocity"));
    expect(velocityButton).toBeUndefined();
  });
});
