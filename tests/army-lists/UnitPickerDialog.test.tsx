/**
 * Phase 101 gap coverage -- UnitPickerDialog readiness + budget tests.
 *
 * BRP-02: Readiness indicators per unit row (Battle Ready badge or 4 dots).
 * BRP-03: Budget-aware affordability filter (remaining pts, Fits Budget toggle).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnitPickerDialog } from "@/features/army-lists/UnitPickerDialog";
import type { EnrichedUnit } from "@/types/unit";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAddMutate = vi.fn();

vi.mock("@/hooks/useArmyLists", () => ({
  useAddUnitToList: () => ({
    mutate: mockAddMutate,
    isPending: false,
  }),
}));

// Factory for enriched units
function makeEnrichedUnit(overrides: Partial<EnrichedUnit> = {}): EnrichedUnit {
  return {
    id: 1,
    faction_id: 1,
    name: "Intercessors",
    category: "Battleline",
    unit_type: null,
    model_count: 5,
    owned_count: null,
    points: 100,
    status_assembly: 1,
    status_painting: "Completed",
    painting_percentage: 100,
    status_basing: 1,
    status_varnished: 1,
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
    status_assembly_override: 0,
    status_basing_override: 0,
    status_varnished_override: 0,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
    effective_points: 100,
    synced_points: null,
    is_synced: false,
    ...overrides,
  };
}

// Battle-ready unit (all 4 checks pass)
const battleReadyUnit = makeEnrichedUnit({
  id: 1,
  name: "Intercessors",
  status_assembly: 1,
  status_painting: "Completed",
  status_basing: 1,
  status_varnished: 1,
  effective_points: 100,
});

// Not battle-ready unit (painting incomplete, not varnished)
const notReadyUnit = makeEnrichedUnit({
  id: 2,
  name: "Hellblasters",
  status_assembly: 1,
  status_painting: "Primed",
  status_basing: 0,
  status_varnished: 0,
  effective_points: 200,
});

// Cheap unit for budget filter tests
const cheapUnit = makeEnrichedUnit({
  id: 3,
  name: "Scouts",
  status_assembly: 0,
  status_painting: "Not Started",
  status_basing: 0,
  status_varnished: 0,
  effective_points: 50,
});

let mockUnits: EnrichedUnit[] = [battleReadyUnit, notReadyUnit, cheapUnit];

vi.mock("@/hooks/useUnits", () => ({
  useUnitsEnriched: () => ({
    data: mockUnits,
    isLoading: false,
  }),
}));

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderPicker(
  overrides: Partial<Parameters<typeof UnitPickerDialog>[0]> = {},
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <UnitPickerDialog
        open={true}
        listId={1}
        factionId={1}
        onClose={() => {}}
        {...overrides}
      />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// BRP-02: Readiness indicators per unit row
// ---------------------------------------------------------------------------

describe("UnitPickerDialog -- BRP-02: Readiness indicators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [battleReadyUnit, notReadyUnit, cheapUnit];
  });

  it("renders 'Battle Ready' badge for a unit where all 4 readiness checks pass", () => {
    renderPicker();
    expect(screen.getByText("Battle Ready")).toBeInTheDocument();
  });

  it("does NOT render 'Battle Ready' badge for a unit with incomplete readiness", () => {
    // notReadyUnit has painting=Primed, basing=0, varnished=0
    // Should show dots instead of Battle Ready badge
    mockUnits = [notReadyUnit];
    renderPicker();
    expect(screen.queryByText("Battle Ready")).not.toBeInTheDocument();
  });

  it("renders readiness dots for non-battle-ready units", () => {
    // Only render the non-ready unit so we can inspect dot structure
    mockUnits = [notReadyUnit];
    renderPicker();

    // The 4 readiness dots share a parent flex container.
    // Find all small dot spans by filtering for elements with both h-1.5 and w-1.5 classes.
    const allSpans = document.querySelectorAll("span");
    const dots = Array.from(allSpans).filter(
      (el) => el.classList.contains("h-1.5") && el.classList.contains("w-1.5") && el.classList.contains("rounded-full"),
    );
    expect(dots.length).toBe(4);
  });

  it("shows effective_points for each unit row", () => {
    renderPicker();
    expect(screen.getByText("100 pts")).toBeInTheDocument();
    expect(screen.getByText("200 pts")).toBeInTheDocument();
    expect(screen.getByText("50 pts")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BRP-03: Budget-aware affordability filter
// ---------------------------------------------------------------------------

describe("UnitPickerDialog -- BRP-03: Budget filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnits = [battleReadyUnit, notReadyUnit, cheapUnit];
  });

  it("shows remaining points header when pointsLimit is set", () => {
    renderPicker({ pointsLimit: 2000, remaining: 150 });
    expect(screen.getByText("150 pts remaining")).toBeInTheDocument();
  });

  it("hides budget UI when pointsLimit is null", () => {
    renderPicker({ pointsLimit: null, remaining: null });
    expect(screen.queryByText(/pts remaining/)).not.toBeInTheDocument();
    expect(screen.queryByText("Fits budget")).not.toBeInTheDocument();
  });

  it("shows 'Fits budget' checkbox when pointsLimit is set", () => {
    renderPicker({ pointsLimit: 2000, remaining: 150 });
    expect(screen.getByText("Fits budget")).toBeInTheDocument();
  });

  it("applies destructive styling when remaining <= 0", () => {
    renderPicker({ pointsLimit: 2000, remaining: 0 });
    const remainingText = screen.getByText("0 pts remaining");
    expect(remainingText).toHaveClass("text-destructive");
  });

  it("filters out over-budget units when 'Fits budget' is toggled on", async () => {
    const user = userEvent.setup();
    // remaining=150 means only units with effective_points <= 150 should show
    // battleReadyUnit=100 (fits), notReadyUnit=200 (over), cheapUnit=50 (fits)
    renderPicker({ pointsLimit: 2000, remaining: 150 });

    // All 3 units visible initially
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Hellblasters")).toBeInTheDocument();
    expect(screen.getByText("Scouts")).toBeInTheDocument();

    // Click the Fits budget checkbox
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // Hellblasters (200 pts) should be filtered out
    expect(screen.queryByText("Hellblasters")).not.toBeInTheDocument();
    // Intercessors (100 pts) and Scouts (50 pts) should remain
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Scouts")).toBeInTheDocument();
  });

  it("shows budget-specific empty state when filter active and no units match", async () => {
    const user = userEvent.setup();
    // remaining=10 means no unit fits (cheapest is 50 pts)
    renderPicker({ pointsLimit: 2000, remaining: 10 });

    // Toggle fits budget on
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // All units filtered out -- should show budget empty message
    expect(
      screen.getByText("No units fit the remaining budget."),
    ).toBeInTheDocument();
  });
});
