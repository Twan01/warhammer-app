/**
 * ARMY-06 — ArmyListsPage component tests.
 * Replaces the Wave 0 stub from plan 08-00.
 *
 * Mocks the query module so this is a pure component test (no SQLite dependency).
 * Uses the same provider wrapper pattern as tests/dashboard/DashboardPage.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { ArmyListsPage } from "@/features/army-lists/ArmyListsPage";
import type { ArmyList } from "@/types/armyList";
import type { Faction } from "@/types/faction";

vi.mock("@/db/queries/armyLists", () => ({
  getArmyLists: vi.fn(),
  getArmyListById: vi.fn().mockResolvedValue(null),
  getArmyListWithUnits: vi.fn().mockResolvedValue([]),
  getArmyListsByUnitId: vi.fn().mockResolvedValue([]),
  createArmyList: vi.fn(),
  updateArmyList: vi.fn(),
  deleteArmyList: vi.fn(),
  addUnitToList: vi.fn(),
  removeUnitFromList: vi.fn(),
  updateArmyListUnit: vi.fn(),
}));
vi.mock("@/db/queries/factions", () => ({
  getFactions: vi.fn().mockResolvedValue([] as Faction[]),
  getFactionById: vi.fn().mockResolvedValue(null),
  createFaction: vi.fn(),
  updateFaction: vi.fn(),
  deleteFaction: vi.fn(),
}));
vi.mock("@/db/queries/units", () => ({
  getUnits: vi.fn().mockResolvedValue([]),
  getUnitById: vi.fn().mockResolvedValue(null),
  createUnit: vi.fn(),
  updateUnit: vi.fn(),
  deleteUnit: vi.fn(),
}));

import { getArmyLists } from "@/db/queries/armyLists";

function listFixture(over: Partial<ArmyList> = {}): ArmyList {
  return {
    id: 1,
    name: "List A",
    faction_id: null,
    points_limit: 1000,
    list_type: "Casual",
    notes: null,
    detachment_id: null,
    detachment_name: null,
    created_at: "2026-05-02 00:00:00",
    updated_at: "2026-05-02 00:00:00",
    ...over,
  };
}

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const root = createRootRoute({ component: () => <Outlet /> });
  const armyListsR = createRoute({
    getParentRoute: () => root,
    path: "/army-lists",
    component: () => <>{ui}</>,
  });
  const router = createRouter({
    routeTree: root.addChildren([armyListsR]),
    history: createMemoryHistory({ initialEntries: ["/army-lists"] }),
  });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ArmyListsPage — ARMY-06", () => {
  it("empty state: when useArmyLists returns [], renders 'No army lists yet' heading and a 'New list' CTA button", async () => {
    vi.mocked(getArmyLists).mockResolvedValue([]);
    renderWithProviders(<ArmyListsPage />);

    expect(await screen.findByText("No army lists yet")).toBeInTheDocument();
    // Multiple "New list" buttons exist (page CTA + empty state CTA) — at least one must render
    expect(screen.getAllByRole("button", { name: "New list" }).length).toBeGreaterThanOrEqual(1);
  });

  it("loading state: while useArmyLists is pending, renders skeleton elements (animate-pulse)", async () => {
    // Never-resolving promise keeps query in pending state
    vi.mocked(getArmyLists).mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithProviders(<ArmyListsPage />);

    await waitFor(() => {
      const pulses = container.querySelectorAll(".animate-pulse");
      expect(pulses.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("populated state: when useArmyLists returns 2 lists, renders both names and the page heading", async () => {
    vi.mocked(getArmyLists).mockResolvedValue([
      listFixture({ id: 1, name: "List A" }),
      listFixture({ id: 2, name: "List B" }),
    ]);
    renderWithProviders(<ArmyListsPage />);

    expect(await screen.findByText("List A")).toBeInTheDocument();
    expect(screen.getByText("List B")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Army Lists" })).toBeInTheDocument();
  });
});
