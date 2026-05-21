/**
 * Phase 90 gap coverage — ArmyListUnitRow Configure button tests.
 *
 * Verifies that the Configure trigger button (Plan 01 Task 2):
 *   - Renders with "Configure" text when no tier is selected
 *   - Renders with tier label (e.g. "5 models") when selected_model_count is set
 *   - Calls onConfigure when clicked
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Table, TableBody } from "@/components/ui/table";
import { ArmyListUnitRow } from "@/features/army-lists/ArmyListUnitRow";
import type { ArmyListUnitRow as ArmyListUnitRowType } from "@/types/armyList";
import type { SyncFreshness } from "@/lib/syncFreshness";

// ---------------------------------------------------------------------------
// Mocks — ArmyListUnitRow has many internal dependencies
// ---------------------------------------------------------------------------

const mockUpdateMutate = vi.fn();
vi.mock("@/hooks/useArmyLists", () => ({
  useUpdateArmyListUnit: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useUnitLoadouts", () => ({
  useUnitLoadouts: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useUnitRulesMapping", () => ({
  useUnitRulesMapping: () => ({ data: null, isLoading: false }),
}));

vi.mock("@/lib/resolveUnitPoints", () => ({
  resolveUnitPoints: () => ({ points: 100, source: "base" }),
}));

vi.mock("@/lib/computeUnitWarnings", () => ({
  computeUnitWarnings: () => ({ hard: [], soft: [] }),
}));

vi.mock("@/db/queries/unitRulesMapping", () => ({
  findMatchingDatasheets: () => Promise.resolve([]),
}));

vi.mock("@/features/army-lists/PointsSourceChip", () => ({
  PointsSourceChip: () => <span data-testid="points-chip">100pts</span>,
}));

vi.mock("@/features/army-lists/MatchStatusIndicator", () => ({
  MatchStatusIndicator: () => null,
}));

vi.mock("@/features/army-lists/RulesMappingSheet", () => ({
  RulesMappingSheet: () => null,
}));

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<ArmyListUnitRowType> = {}): ArmyListUnitRowType {
  return {
    id: 1,
    list_id: 1,
    unit_id: 1,
    ghost_unit_name: null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
    points_override: null,
    notes: null,
    created_at: "2024-01-01",
    unit_name: "Intercessors",
    unit_points: 100,
    faction_id: 1,
    status_assembly: 1,
    status_painting: "Completed",
    synced_points: null,
    override_points: null,
    tier_points: null,
    painting_percentage: 100,
    effective_points: 100,
    tactical_role: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

const defaultFreshness: SyncFreshness = { status: "fresh", lastSync: "2024-01-01", ageMs: 0 };

function renderRow(
  unit: ArmyListUnitRowType,
  overrides: {
    onConfigure?: () => void;
    onRemove?: () => void;
  } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <Table>
          <TableBody>
            <ArmyListUnitRow
              unit={unit}
              totalPoints={100}
              pointsLimit={2000}
              freshness={defaultFreshness}
              onRemove={overrides.onRemove ?? vi.fn()}
              onConfigure={overrides.onConfigure ?? vi.fn()}
            />
          </TableBody>
        </Table>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ArmyListUnitRow — Configure button", () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear();
  });

  it("renders a Configure button with 'Configure' text when no tier is selected", () => {
    renderRow(makeUnit({ selected_model_count: null, tier_points: null }));
    const btn = screen.getByRole("button", { name: /Configure loadout for Intercessors/ });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Configure");
  });

  it("renders tier label when selected_model_count and tier_points are set", () => {
    renderRow(makeUnit({ selected_model_count: 5, tier_points: 90 }));
    const btn = screen.getByRole("button", { name: /Configure loadout for Intercessors/ });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("5 models");
    expect(btn).toHaveTextContent("90pts");
  });

  it("calls onConfigure callback when Configure button is clicked", async () => {
    const user = userEvent.setup();
    const onConfigure = vi.fn();
    renderRow(makeUnit(), { onConfigure });

    const btn = screen.getByRole("button", { name: /Configure loadout for Intercessors/ });
    await user.click(btn);

    expect(onConfigure).toHaveBeenCalledTimes(1);
  });
});
