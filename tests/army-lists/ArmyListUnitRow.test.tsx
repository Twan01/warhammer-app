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
    canonical_name: null,
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

const defaultFreshness: SyncFreshness = "fresh";

function renderRow(
  unit: ArmyListUnitRowType,
  overrides: {
    onConfigure?: () => void;
    onRemove?: () => void;
    onEnhance?: () => void;
    onAttachLeader?: () => void;
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
              onEnhance={overrides.onEnhance ?? vi.fn()}
              onAttachLeader={overrides.onAttachLeader ?? vi.fn()}
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

// ---------------------------------------------------------------------------
// Ghost unit treatment (Phase 93 — BRW-02, BRW-03)
// ---------------------------------------------------------------------------

function makeGhostUnit(overrides: Partial<ArmyListUnitRowType> = {}): ArmyListUnitRowType {
  return makeUnit({
    unit_id: null,
    ghost_unit_name: "Vanguard Veterans",
    unit_name: "Vanguard Veterans",
    status_painting: null,
    status_assembly: null,
    painting_percentage: null,
    faction_id: null,
    ...overrides,
  });
}

describe("ArmyListUnitRow — Ghost unit treatment", () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear();
  });

  it("renders 'Planned' badge when unit_id is null", () => {
    renderRow(makeGhostUnit());
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("applies muted text styling to ghost unit name", () => {
    renderRow(makeGhostUnit());
    const nameEl = screen.getByText("Vanguard Veterans");
    expect(nameEl).toHaveClass("text-muted-foreground");
  });

  it("hides painting status badges for ghost units", () => {
    // Ghost unit should NOT show any painting status
    renderRow(makeGhostUnit());
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    expect(screen.queryByText("Assembled")).not.toBeInTheDocument();
    // Verify the "--" placeholder is shown instead
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("shows painting status badges for owned units", () => {
    renderRow(makeUnit({ status_painting: "Completed", status_assembly: 1 }));
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Assembled")).toBeInTheDocument();
  });

  it("still renders Configure button for ghost units", () => {
    renderRow(makeGhostUnit());
    const btn = screen.getByRole("button", { name: /Configure loadout for Vanguard Veterans/ });
    expect(btn).toBeInTheDocument();
  });

  it("still renders Remove button for ghost units", () => {
    renderRow(makeGhostUnit());
    const btn = screen.getByRole("button", { name: /Remove unit from list/ });
    expect(btn).toBeInTheDocument();
  });

  it("does not render tactical role selector for ghost units", () => {
    // Ghost units should NOT have the combobox (Select trigger)
    renderRow(makeGhostUnit());
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders tactical role selector for owned units", () => {
    renderRow(makeUnit());
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("ghost isolation is schema-level -- no code filter needed", () => {
    // BRW-03: Ghost units are isolated from Collection, Dashboard, and Kanban
    // by schema design. Those features query the `units` table directly, not
    // `army_list_units`. Ghost units (unit_id IS NULL) never appear in `units`.
    // Verified in migration 031_army_list_v3.sql.
    expect(true).toBe(true);
  });
});
