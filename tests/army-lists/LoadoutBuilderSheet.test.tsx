/**
 * Phase 90 — Test scaffold for LoadoutBuilderSheet (Plan 02).
 *
 * Establishes mock infrastructure, factory functions, and test stubs
 * covering DL-01 (tier selection) and DL-02 (wargear display).
 * Plan 02 will implement the component and fill in the test bodies.
 */
import { describe, it, vi } from "vitest";
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

vi.mock("@/hooks/useLoadoutOptions", () => ({
  useTiersByUnitName: () => ({
    data: mockTiers,
    isLoading: false,
  }),
  useLoadoutOptionsForUnit: () => ({
    data: mockWargearOptions,
    isLoading: false,
  }),
  LOADOUT_OPTIONS_KEY: (unitName: string, factionId: string | null) =>
    ["loadout-options", unitName, factionId] as const,
  SYNCED_TIERS_BY_NAME_KEY: (unitName: string, factionId: string | null) =>
    ["synced-tiers-by-name", unitName, factionId] as const,
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
// Tests — Plan 02 will implement the component and fill in test bodies
// ---------------------------------------------------------------------------

describe("LoadoutBuilderSheet", () => {
  // DL-01: Tier selection
  it("renders tier selector with available tiers from synced data", () => {
    // TODO: Plan 02 — render LoadoutBuilderSheet with makeUnit(), verify tier options visible
  });

  it("selecting a tier calls useSetSelectedModelCount with correct args", () => {
    // TODO: Plan 02 — select a tier, verify mockSetModelCount called with { army_list_unit_id, count, list_id }
  });

  it("selecting Default calls useClearSelectedModelCount", () => {
    // TODO: Plan 02 — select Default option, verify mockClearModelCount called
  });

  // DL-02: Wargear display
  it("renders wargear options grouped by group_name", () => {
    // TODO: Plan 02 — verify "Ranged Weapons" and "Melee Weapons" group headers appear
  });

  it("shows Default badge for is_default=1 options", () => {
    // TODO: Plan 02 — verify Badge "Default" appears for Bolt Rifle and Astartes Chainsword
  });

  it("shows Exclusive badge for is_exclusive=1 options", () => {
    // TODO: Plan 02 — verify Badge "Exclusive" appears for Stalker Bolt Rifle
  });

  it("shows empty state when no wargear options", () => {
    // TODO: Plan 02 — override mock to return [], verify "No wargear data available" text
  });

  // DL-10/DL-11: Ghost unit support
  it("shows Planned badge for ghost units", () => {
    // TODO: Plan 02 — makeUnit({ unit_id: null, ghost_unit_name: "Hellblasters" }), verify "Planned" badge
  });

  // Pitfall 6: Points override warning
  it("shows points override warning when points_override is set", () => {
    // TODO: Plan 02 — makeUnit({ points_override: 150 }), verify override warning text
  });
});
