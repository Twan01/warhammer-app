/**
 * Phase 90 — LoadoutBuilderSheet tests (DL-01, DL-02).
 *
 * Covers tier selection, wargear display, ghost unit badge, and points override warning.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadoutBuilderSheet } from "@/features/army-lists/LoadoutBuilderSheet";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { SyncedLoadoutOptionRow } from "@/db/queries/bsdataExtended";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetModelCount = vi.fn();
const mockClearModelCount = vi.fn();

vi.mock("@/hooks/useArmyLists", () => ({
  useSetSelectedModelCount: () => ({
    mutate: mockSetModelCount,
    isPending: false,
  }),
  useClearSelectedModelCount: () => ({
    mutate: mockClearModelCount,
    isPending: false,
  }),
}));

const mockTiers = [
  { model_count: 5, points: 90 },
  { model_count: 10, points: 180 },
];

const mockWargearOptions: SyncedLoadoutOptionRow[] = [
  {
    unit_name: "Intercessors",
    faction_id: "1",
    group_name: "Ranged Weapons",
    option_name: "Bolt Rifle",
    is_default: 1,
    is_exclusive: 0,
  },
  {
    unit_name: "Intercessors",
    faction_id: "1",
    group_name: "Ranged Weapons",
    option_name: "Stalker Bolt Rifle",
    is_default: 0,
    is_exclusive: 1,
  },
  {
    unit_name: "Intercessors",
    faction_id: "1",
    group_name: "Melee Weapons",
    option_name: "Astartes Chainsword",
    is_default: 1,
    is_exclusive: 0,
  },
];

let currentMockTiers = mockTiers;
let currentMockWargear: SyncedLoadoutOptionRow[] = mockWargearOptions;

vi.mock("@/hooks/useLoadoutOptions", () => ({
  useTiersByUnitName: () => ({
    data: currentMockTiers,
    isLoading: false,
  }),
  useLoadoutOptionsForUnit: () => ({
    data: currentMockWargear,
    isLoading: false,
  }),
  LOADOUT_OPTIONS_KEY: (unitName: string, factionId: string | null) =>
    ["loadout-options", unitName, factionId] as const,
  SYNCED_TIERS_BY_NAME_KEY: (unitName: string, factionId: string | null) =>
    ["synced-tiers-by-name", unitName, factionId] as const,
}));

// PointsSourceChip uses Tooltip internally — mock resolveUnitPoints to keep it simple
vi.mock("@/lib/resolveUnitPoints", () => ({
  resolveUnitPoints: () => ({ points: 100, source: "base" }),
}));

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
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

function renderSheet(unit: ArmyListUnitRow, listId = 1, listFactionId: number | null = 1) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <LoadoutBuilderSheet
          open={true}
          unit={unit}
          listId={listId}
          listFactionId={listFactionId}
          onClose={() => {}}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LoadoutBuilderSheet", () => {
  beforeEach(() => {
    mockSetModelCount.mockClear();
    mockClearModelCount.mockClear();
    currentMockTiers = mockTiers;
    currentMockWargear = mockWargearOptions;
  });

  // DL-01: Tier selection
  it("renders tier selector with available tiers from synced data", () => {
    renderSheet(makeUnit());
    expect(screen.getByText("Model Count")).toBeInTheDocument();
    // The select trigger shows "Default" when no tier selected; wargear badges also say "Default"
    const defaultTexts = screen.getAllByText("Default");
    expect(defaultTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("selecting a tier calls useSetSelectedModelCount with correct args", async () => {
    const user = userEvent.setup();
    renderSheet(makeUnit());

    // Open the select dropdown
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    // Select "5 models" tier
    const option = screen.getByText(/5 models/);
    await user.click(option);

    expect(mockSetModelCount).toHaveBeenCalledWith({
      army_list_unit_id: 1,
      count: 5,
      list_id: 1,
    });
  });

  it("selecting Default calls useClearSelectedModelCount", async () => {
    const user = userEvent.setup();
    // Render with a pre-selected tier
    renderSheet(makeUnit({ selected_model_count: 5, tier_points: 90 }));

    // Open the select dropdown
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    // Select "Default"
    const defaultOption = screen.getByRole("option", { name: "Default" });
    await user.click(defaultOption);

    expect(mockClearModelCount).toHaveBeenCalledWith({
      army_list_unit_id: 1,
      list_id: 1,
    });
  });

  // DL-02: Wargear display
  it("renders wargear options grouped by group_name", () => {
    renderSheet(makeUnit());
    expect(screen.getByText("Ranged Weapons")).toBeInTheDocument();
    expect(screen.getByText("Melee Weapons")).toBeInTheDocument();
    expect(screen.getByText("Bolt Rifle")).toBeInTheDocument();
    expect(screen.getByText("Stalker Bolt Rifle")).toBeInTheDocument();
    expect(screen.getByText("Astartes Chainsword")).toBeInTheDocument();
  });

  it("shows Default badge for is_default=1 options", () => {
    renderSheet(makeUnit());
    // "Default" badges should appear (for Bolt Rifle and Astartes Chainsword)
    const defaultBadges = screen.getAllByText("Default");
    // At least 2 Default badges (one for Bolt Rifle, one for Chainsword) + 1 in Select
    expect(defaultBadges.length).toBeGreaterThanOrEqual(2);
  });

  it("shows Exclusive badge for is_exclusive=1 options", () => {
    renderSheet(makeUnit());
    expect(screen.getByText("Exclusive")).toBeInTheDocument();
  });

  it("shows empty state when no wargear options", () => {
    currentMockWargear = [];
    renderSheet(makeUnit());
    expect(screen.getByText("No wargear data available")).toBeInTheDocument();
  });

  // DL-10/DL-11: Ghost unit support
  it("shows Planned badge for ghost units", () => {
    renderSheet(makeUnit({ unit_id: null, ghost_unit_name: "Hellblasters" }));
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  // DL-01: Empty tier state
  it("shows 'No tier data available' when tiers array is empty", () => {
    currentMockTiers = [];
    renderSheet(makeUnit());
    expect(screen.getByText("No tier data available")).toBeInTheDocument();
  });

  // Pitfall 6: Points override warning
  it("shows points override warning when points_override is set", () => {
    renderSheet(makeUnit({ points_override: 150 }));
    expect(
      screen.getByText(/Points manually overridden/),
    ).toBeInTheDocument();
  });
});
