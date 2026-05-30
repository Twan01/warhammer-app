/**
 * Phase 104 — BUI-03: UdbDatasheetSheet component tests.
 *
 * Mocks useUdbUnitDetail to verify stat block, weapon splitting,
 * ability grouping, keywords, points tiers, and damaged profile display.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

const mockUseUdbUnitDetail = vi.fn();

vi.mock("@/hooks/useUnitDatabase", () => ({
  useUdbUnitDetail: (...args: unknown[]) => mockUseUdbUnitDetail(...args),
}));

import { UdbDatasheetSheet } from "@/features/unit-database/UdbDatasheetSheet";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDetail(overrides: Partial<UdbUnitDetail> = {}): UdbUnitDetail {
  return {
    id: "u1",
    faction_id: "SM",
    name: "Intercessors",
    role: "Battleline",
    base_points: 80,
    damaged_w: null,
    damaged_desc: null,
    models: [
      { id: 1, unit_id: "u1", line_order: 0, name: null, M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 },
    ],
    weapons: [
      { id: 1, unit_id: "u1", weapon_group: 0, line_order: 0, name: "Bolt rifle", category: "Ranged", range: "24\"", attacks: "2", skill: "3+", strength: "4", ap: "-1", damage: "1", keywords: "Assault, Heavy" },
      { id: 2, unit_id: "u1", weapon_group: 1, line_order: 0, name: "Close combat weapon", category: "Melee", range: null, attacks: "3", skill: "3+", strength: "4", ap: "0", damage: "1", keywords: null },
    ],
    abilities: [
      { id: 1, unit_id: "u1", line_order: 0, name: "Oath of Moment", description: "Re-roll hits", ability_type: "Faction" },
      { id: 2, unit_id: "u1", line_order: 1, name: "Deep Strike", description: null, ability_type: "Core" },
      { id: 3, unit_id: "u1", line_order: 2, name: "Objective Secured", description: "Hold objectives", ability_type: "Unit" },
    ],
    keywords: [
      { unit_id: "u1", keyword: "Imperium", is_faction: 1 },
      { unit_id: "u1", keyword: "Infantry", is_faction: 0 },
      { unit_id: "u1", keyword: "Primaris", is_faction: 0 },
    ],
    points: [
      { id: 1, unit_id: "u1", model_count: 5, points: 80 },
      { id: 2, unit_id: "u1", model_count: 10, points: 160 },
    ],
    composition: [
      { id: 1, unit_id: "u1", min_models: 5, max_models: 10, notes: null },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockUseUdbUnitDetail.mockReset();
});

describe("UdbDatasheetSheet", () => {
  it("renders stat block with model stats", () => {
    mockUseUdbUnitDetail.mockReturnValue({ data: makeDetail(), isLoading: false });
    render(<UdbDatasheetSheet unitId="u1" open={true} onOpenChange={() => {}} />);

    // Stat headers should be present
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("SV")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("LD")).toBeInTheDocument();
    expect(screen.getByText("OC")).toBeInTheDocument();
  });

  it("splits weapons into ranged and melee sections", () => {
    mockUseUdbUnitDetail.mockReturnValue({ data: makeDetail(), isLoading: false });
    render(<UdbDatasheetSheet unitId="u1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Ranged Weapons")).toBeInTheDocument();
    expect(screen.getByText("Melee Weapons")).toBeInTheDocument();
    expect(screen.getByText("Bolt rifle")).toBeInTheDocument();
    expect(screen.getByText("Close combat weapon")).toBeInTheDocument();
  });

  it("groups abilities by type", () => {
    mockUseUdbUnitDetail.mockReturnValue({ data: makeDetail(), isLoading: false });
    render(<UdbDatasheetSheet unitId="u1" open={true} onOpenChange={() => {}} />);

    // Ability group labels
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(screen.getByText("Faction")).toBeInTheDocument();
    expect(screen.getByText("Unit")).toBeInTheDocument();

    // Individual abilities
    expect(screen.getByText("Oath of Moment")).toBeInTheDocument();
    expect(screen.getByText("Deep Strike")).toBeInTheDocument();
    expect(screen.getByText("Objective Secured")).toBeInTheDocument();
  });

  it("renders keywords with faction keywords separated", () => {
    mockUseUdbUnitDetail.mockReturnValue({ data: makeDetail(), isLoading: false });
    render(<UdbDatasheetSheet unitId="u1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Faction Keywords")).toBeInTheDocument();
    expect(screen.getByText("Keywords")).toBeInTheDocument();
    expect(screen.getByText("Imperium")).toBeInTheDocument();
    expect(screen.getByText("Infantry")).toBeInTheDocument();
    expect(screen.getByText("Primaris")).toBeInTheDocument();
  });

  it("renders points tiers", () => {
    mockUseUdbUnitDetail.mockReturnValue({ data: makeDetail(), isLoading: false });
    render(<UdbDatasheetSheet unitId="u1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("80 pts (5 models)")).toBeInTheDocument();
    expect(screen.getByText("160 pts (10 models)")).toBeInTheDocument();
  });

  it("shows damaged profile when present", () => {
    const detail = makeDetail({
      damaged_w: "1-4",
      damaged_desc: "Half stats while damaged",
    });
    mockUseUdbUnitDetail.mockReturnValue({ data: detail, isLoading: false });
    render(<UdbDatasheetSheet unitId="u1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Damaged Profile")).toBeInTheDocument();
    expect(screen.getByText(/1-4 wounds remaining/)).toBeInTheDocument();
    expect(screen.getByText("Half stats while damaged")).toBeInTheDocument();
  });

  it("hides damaged profile when absent", () => {
    mockUseUdbUnitDetail.mockReturnValue({ data: makeDetail(), isLoading: false });
    render(<UdbDatasheetSheet unitId="u1" open={true} onOpenChange={() => {}} />);

    expect(screen.queryByText("Damaged Profile")).not.toBeInTheDocument();
  });
});
