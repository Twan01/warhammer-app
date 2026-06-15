/**
 * Phase 90 — LoadoutBuilderSheet tests (DL-01, DL-02).
 *
 * Covers tier selection, datasheet (weapons + abilities) display, ghost unit
 * badge, points override warning, and the empty/unlinked datasheet states.
 *
 * Wargear is sourced from the canonical unit database (useUdbUnitDetail) and
 * rendered via PlaybookDatasheet — NOT the legacy synced_loadout_options table.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadoutBuilderSheet } from "@/features/army-lists/LoadoutBuilderSheet";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";

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

let currentMockTiers = mockTiers;

vi.mock("@/hooks/useLoadoutOptions", () => ({
  useTiersByUdbUnitId: () => ({
    data: currentMockTiers,
    isLoading: false,
  }),
  UDB_TIERS_KEY: (udbUnitId: string) => ["udb-tiers", udbUnitId] as const,
}));

// Canonical datasheet source — drives the Wargear & Abilities section.
const mockDatasheet: UdbUnitDetail = {
  id: "000000123",
  faction_id: "SM",
  name: "Intercessor Squad",
  role: "Battleline",
  base_points: 80,
  damaged_w: null,
  damaged_desc: null,
  models: [],
  weapons: [
    {
      id: 1,
      unit_id: "000000123",
      weapon_group: 1,
      line_order: 1,
      name: "Bolt rifle",
      category: "Ranged",
      range: "24",
      attacks: "2",
      skill: "3",
      strength: "4",
      ap: "-1",
      damage: "1",
      keywords: null,
    },
    {
      id: 2,
      unit_id: "000000123",
      weapon_group: 2,
      line_order: 1,
      name: "Astartes chainsword",
      category: "Melee",
      range: "Melee",
      attacks: "4",
      skill: "3",
      strength: "4",
      ap: "-1",
      damage: "1",
      keywords: null,
    },
  ],
  abilities: [
    {
      id: 1,
      unit_id: "000000123",
      line_order: 1,
      name: "Oath of Moment",
      description: "Faction ability description.",
      ability_type: "Faction",
    },
  ],
  keywords: [],
  points: [],
  composition: [],
};

let currentMockDatasheet: UdbUnitDetail | null = mockDatasheet;

vi.mock("@/hooks/useUnitDatabase", () => ({
  useUdbUnitDetail: () => ({
    data: currentMockDatasheet,
    isLoading: false,
  }),
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
    sort_order: 0,
    created_at: "2024-01-01",
    unit_name: "Intercessors",
    unit_points: 100,
    udb_unit_id: "000000123",
    faction_id: 1,
    unit_category: null, unit_model_count: null,
    status_assembly: 1,
    status_painting: "Completed",
    udb_base_points: null,
    udb_role: null,
    udb_keywords: null,
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
    currentMockDatasheet = mockDatasheet;
  });

  // DL-01: Tier selection
  it("renders tier selector with available tiers from synced data", () => {
    renderSheet(makeUnit());
    expect(screen.getByText("Model Count")).toBeInTheDocument();
    // The select trigger shows "Default" when no tier selected.
    expect(screen.getAllByText("Default").length).toBeGreaterThanOrEqual(1);
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

  // DL-02: Datasheet (weapons + abilities) display from canonical UDB source
  it("renders weapons from the canonical datasheet", () => {
    renderSheet(makeUnit());
    expect(screen.getByText("Bolt rifle")).toBeInTheDocument();
    expect(screen.getByText("Astartes chainsword")).toBeInTheDocument();
  });

  it("renders datasheet abilities", () => {
    renderSheet(makeUnit());
    expect(screen.getByText("Oath of Moment")).toBeInTheDocument();
  });

  it("shows empty datasheet state when the unit has no weapons or abilities", () => {
    currentMockDatasheet = { ...mockDatasheet, weapons: [], abilities: [] };
    renderSheet(makeUnit());
    expect(
      screen.getByText("No datasheet data available for this unit."),
    ).toBeInTheDocument();
  });

  it("shows unlinked state when the unit has no udb_unit_id (ghost/planned)", () => {
    currentMockDatasheet = null;
    renderSheet(makeUnit({ unit_id: null, ghost_unit_name: "Hellblasters", udb_unit_id: null }));
    expect(
      screen.getByText(/not linked to the unit database/),
    ).toBeInTheDocument();
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
