/**
 * DS-08 (secondary path) — DashboardPage conflict-dialog wiring tests.
 *
 * Verifies that:
 * 1. DashboardPage mounts DatasheetImportDialog in the populated state.
 * 2. The populated UnitDetailSheet receives the three conflict props
 *    (onDatasheetConflict, pendingImportResolution, onClearImportResolution).
 *
 * Strategy: mock UnitDetailSheet and DatasheetImportDialog as stubs that
 * expose received props via data-testid attributes. This lets us assert
 * prop-wiring without pulling in the full Radix Sheet / Dialog machinery.
 *
 * The dashboard query is mocked at the same layer as DashboardPage.test.tsx
 * (getDashboardStats) so no SQLite dependency is introduced.
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
import { ActiveFactionProvider } from "@/context/ActiveFactionContext";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

// ─── Mock dashboard query ─────────────────────────────────────────────────────
// Phase 32: getArmyReadinessByFaction added; mock returns [] so ArmyReadinessCard
// renders the empty-state and does not interfere with existing dashboard tests.
vi.mock("@/db/queries/dashboard", () => ({
  getDashboardStats: vi.fn(),
  getRecentActivity: vi.fn().mockResolvedValue({ sessions: [], battles: [] }),
  getArmyReadinessByFaction: vi.fn().mockResolvedValue([]),
}));
import { getDashboardStats } from "@/db/queries/dashboard";

// ─── Mock factions query (ActiveFactionProvider) ──────────────────────────────
vi.mock("@/db/queries/factions", () => ({
  getFactions: vi.fn().mockResolvedValue([]),
  getFactionById: vi.fn(),
  createFaction: vi.fn(),
  updateFaction: vi.fn(),
  deleteFaction: vi.fn(),
}));

// ─── Mock analytics query (used by DashboardPage's hobby health section) ──────
vi.mock("@/db/queries/analytics", () => ({
  getHobbyAnalytics: vi.fn().mockResolvedValue(null),
}));

// ─── Stub UnitDetailSheet — expose props as data attributes ───────────────────
// DashboardPage mounts two UnitDetailSheet instances:
//   1. Empty-state no-op (key="none-detail", open={false}) — no conflict props
//   2. Populated (key depends on selectedUnit?.id, open={selectedUnitId !== null}) — gets conflict props
// We distinguish them by the "open" prop.
vi.mock("@/features/units/UnitDetailSheet", () => ({
  UnitDetailSheet: (props: {
    open: boolean;
    onDatasheetConflict?: (payload: unknown) => void;
    pendingImportResolution?: unknown;
    onClearImportResolution?: () => void;
    [key: string]: unknown;
  }) => (
    <div
      data-testid={props.open ? "unit-detail-sheet-populated" : "unit-detail-sheet-noop"}
      data-has-conflict-prop={props.onDatasheetConflict !== undefined ? "true" : "false"}
      data-has-pending-prop={props.pendingImportResolution !== undefined ? "true" : "false"}
      data-has-clear-prop={props.onClearImportResolution !== undefined ? "true" : "false"}
    />
  ),
}));

// ─── Stub UnitSheet (edit sheet) ──────────────────────────────────────────────
vi.mock("@/features/units/UnitSheet", () => ({
  UnitSheet: () => <div data-testid="unit-sheet-stub" />,
}));

// ─── Stub UnitDeleteDialog ────────────────────────────────────────────────────
vi.mock("@/features/units/UnitDeleteDialog", () => ({
  UnitDeleteDialog: () => <div data-testid="unit-delete-dialog-stub" />,
}));

// ─── Stub DatasheetImportDialog — expose open prop ───────────────────────────
vi.mock("@/features/units/DatasheetImportDialog", () => ({
  DatasheetImportDialog: (props: { open: boolean; [key: string]: unknown }) => (
    <div
      data-testid="datasheet-import-dialog"
      data-open={props.open ? "true" : "false"}
    />
  ),
}));

// matchMedia polyfill for AnimatedNumber inside StatCard
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockReturnValue({
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList),
});

// ─── Factories ────────────────────────────────────────────────────────────────
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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

// ─── Import DashboardPage after mocks ─────────────────────────────────────────
import { DashboardPage } from "@/features/dashboard/DashboardPage";

describe("DashboardPage — DS-08 conflict dialog wiring", () => {
  it("DS-08: DatasheetImportDialog is mounted in the populated state", async () => {
    const tau = f();
    vi.mocked(getDashboardStats).mockResolvedValue({
      units: [u({ id: 1, faction_id: 1, name: "Fire Warrior" })],
      factions: [tau],
    });

    renderWithProviders(<DashboardPage />);

    // Wait for populated state to render (stat labels appear once data resolves)
    expect(await screen.findByText("Total Models")).toBeInTheDocument();

    // DatasheetImportDialog must be present in the DOM as a sibling mount
    const dialog = screen.getByTestId("datasheet-import-dialog");
    expect(dialog).toBeInTheDocument();
    // It starts closed (no conflict payload until user triggers Re-import)
    expect(dialog.getAttribute("data-open")).toBe("false");
  });

  it("DS-08: populated UnitDetailSheet receives onDatasheetConflict, pendingImportResolution, and onClearImportResolution props", async () => {
    const tau = f();
    vi.mocked(getDashboardStats).mockResolvedValue({
      units: [u({ id: 1, faction_id: 1, name: "Fire Warrior" })],
      factions: [tau],
    });

    renderWithProviders(<DashboardPage />);

    // Wait for populated state
    expect(await screen.findByText("Total Models")).toBeInTheDocument();

    // The populated UnitDetailSheet (open={selectedUnitId !== null}) starts with open=false
    // because no unit has been clicked yet. After data loads, it renders with open=false.
    // Both sheet stubs are in the DOM; the populated one uses the unit id key variant.
    // We verify props by checking the data attributes on the stub.
    // The populated sheet (key={selectedUnit?.id ?? "none-detail"}, open={selectedUnitId !== null})
    // is open=false until a row is clicked — but the stub renders regardless of open value,
    // and we key them by open prop in the mock. Since selectedUnitId starts as null, both
    // sheets start with open=false. We distinguish by checking which sheet has conflict props.

    // The populated-state sheet receives conflict props regardless of open state
    const sheetsWithConflictProps = screen
      .getAllByTestId(/unit-detail-sheet/)
      .filter((el) => el.getAttribute("data-has-conflict-prop") === "true");

    expect(sheetsWithConflictProps).toHaveLength(1);

    const populatedSheet = sheetsWithConflictProps[0];
    expect(populatedSheet.getAttribute("data-has-conflict-prop")).toBe("true");
    expect(populatedSheet.getAttribute("data-has-pending-prop")).toBe("true");
    expect(populatedSheet.getAttribute("data-has-clear-prop")).toBe("true");
  });

  it("DS-08: empty-state no-op UnitDetailSheet does NOT receive conflict props", async () => {
    // Empty state branch: no units
    vi.mocked(getDashboardStats).mockResolvedValue({ units: [], factions: [] });

    renderWithProviders(<DashboardPage />);

    // Wait for empty state (DashboardEmptyState renders "HobbyForge" heading)
    expect(await screen.findByText("HobbyForge")).toBeInTheDocument();

    // The no-op UnitDetailSheet in the empty-state branch has no conflict props
    const noopSheet = screen.getByTestId("unit-detail-sheet-noop");
    expect(noopSheet.getAttribute("data-has-conflict-prop")).toBe("false");
    expect(noopSheet.getAttribute("data-has-pending-prop")).toBe("false");
    expect(noopSheet.getAttribute("data-has-clear-prop")).toBe("false");
  });
});
