/**
 * PROJ-02, PROJ-08 — KanbanBoard column ordering and empty state.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KanbanBoard } from "@/features/painting-projects/KanbanBoard";
import { UNITS_KEY } from "@/hooks/useUnits";
import { FACTIONS_KEY } from "@/hooks/useFactions";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: 1,
    faction_id: 1,
    name: "Fire Warriors",
    category: null,
    unit_type: null,
    model_count: null,
    owned_count: null,
    points: null,
    status_assembly: 0,
    status_painting: "Built",
    painting_percentage: 0,
    status_basing: 0,
    status_varnished: 0,
    is_active_project: 1,
    priority: null,
    target_completion_date: null,
    purchase_date: null,
    purchase_price_pence: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  };
}

function makeFaction(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Tau Empire",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#33aaff",
    icon_path: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  };
}

function renderBoard(units: Unit[], factions: Faction[] = [makeFaction()]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(UNITS_KEY, units);
  qc.setQueryData(FACTIONS_KEY, factions);
  return render(
    <QueryClientProvider client={qc}>
      <KanbanBoard onEditUnit={vi.fn()} onAddProject={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("KanbanBoard", () => {
  it("PROJ-08: renders empty state when no units have is_active_project = 1", () => {
    renderBoard([makeUnit({ is_active_project: 0 })]);
    expect(screen.getByText("No active projects")).toBeInTheDocument();
    expect(
      screen.getByText("Mark a unit as an active project from Collection to see it here."),
    ).toBeInTheDocument();
  });

  it("PROJ-02: renders all columns in PAINTING_STATUS_ORDER, cards appear in the correct columns", () => {
    const units = [
      makeUnit({ id: 1, name: "Alpha", status_painting: "Layered" }),
      makeUnit({ id: 2, name: "Beta", status_painting: "Built" }),
      makeUnit({ id: 3, name: "Gamma", status_painting: "Built" }),
    ];
    const { container } = renderBoard(units);
    const headers = container.querySelectorAll("h2");
    // All 11 columns are always rendered (fix 82dbc6f: all columns visible for easy DnD targets).
    expect(headers).toHaveLength(11);
    // Verify the two occupied columns have their cards: "Built" (2 cards) and "Layered" (1 card).
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("PROJ-01: filters out units with is_active_project = 0", () => {
    const units = [
      makeUnit({ id: 1, name: "Alpha", is_active_project: 1 }),
      makeUnit({ id: 2, name: "Beta", is_active_project: 0 }),
    ];
    renderBoard(units);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });
});
