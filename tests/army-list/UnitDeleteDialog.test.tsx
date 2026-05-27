/**
 * ARMY-05 â€” UnitDeleteDialog enhanced state tests.
 * Replaces the Wave 0 stub from plan 08-00.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnitDeleteDialog } from "@/features/units/UnitDeleteDialog";
import type { Unit } from "@/types/unit";

vi.mock("@/db/queries/armyLists", () => ({
  getArmyListsByUnitId: vi.fn(),
}));
vi.mock("@/db/queries/units", () => ({
  getUnits: vi.fn().mockResolvedValue([]),
  getUnitById: vi.fn().mockResolvedValue(null),
  createUnit: vi.fn(),
  updateUnit: vi.fn(),
  deleteUnit: vi.fn().mockResolvedValue(undefined),
}));

import { getArmyListsByUnitId } from "@/db/queries/armyLists";

function unitFixture(over: Partial<Unit> = {}): Unit {
  return {
    id: 42,
    faction_id: 1,
    name: "Intercessors",
    category: "Battleline",
    unit_type: null,
    model_count: 5,
    owned_count: 5,
    points: 100,
    status_assembly: 1,
    status_painting: "Built",
    painting_percentage: 0,
    status_basing: 0,
    status_varnished: 0,
    is_active_project: 0,
    priority: null,
    target_completion_date: null,
    purchase_date: null,
    purchase_price_pence: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    lore_notes: null,
    undercoat: null,
    created_at: "2026-05-02 00:00:00",
    updated_at: "2026-05-02 00:00:00",
    ...over,
  };
}

function renderWithQueryClient(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UnitDeleteDialog (army list membership) â€” ARMY-05", () => {
  it("normal state: when unit is in 0 army lists, renders simple confirm with 'Delete unit?' title and 'Delete' button", async () => {
    vi.mocked(getArmyListsByUnitId).mockResolvedValue([]);
    renderWithQueryClient(
      <UnitDeleteDialog open unit={unitFixture()} onClose={vi.fn()} />,
    );
    expect(await screen.findByText("Delete unit?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep Unit" })).toBeInTheDocument();
    // Warning state copy must NOT render
    expect(screen.queryByText("This unit is in active army lists")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Anyway" })).not.toBeInTheDocument();
  });

  it("warning state: when unit is in 2 army lists, renders 'This unit is in active army lists' title, lists names in the body, and 'Delete Anyway' button", async () => {
    vi.mocked(getArmyListsByUnitId).mockResolvedValue([
      { id: 1, name: "My 1000pt List" },
      { id: 2, name: "Starter Game" },
    ]);
    renderWithQueryClient(
      <UnitDeleteDialog open unit={unitFixture()} onClose={vi.fn()} />,
    );

    expect(await screen.findByText("This unit is in active army lists")).toBeInTheDocument();
    // Warning body should contain both list names and the unit name in the same string
    const description = screen.getByText(/Intercessors.*is in 2 army lists.*My 1000pt List.*Starter Game/);
    expect(description).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Anyway" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep Unit" })).toBeInTheDocument();
    // Simple-confirm copy must NOT render
    expect(screen.queryByText("Delete unit?")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
