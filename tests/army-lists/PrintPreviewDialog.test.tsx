/**
 * Phase 94 â€” PrintPreviewDialog tests (EXP-02).
 *
 * Covers: renders army name, renders unit names, Print button present,
 * does not render content when closed.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrintPreviewDialog } from "@/features/army-lists/PrintPreviewDialog";
import type { ArmyList, ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Mock exportArmyList â€” the dialog calls formatArmyListForExport internally
// ---------------------------------------------------------------------------
vi.mock("@/lib/exportArmyList", () => ({
  formatArmyListForExport: (
    list: ArmyList,
    units: ArmyListUnitRow[],
    enhancements: ArmyListEnhancement[],
    factionName: string | null,
  ) => ({
    list,
    factionName,
    sortedUnits: units.map((u) => ({
      displayName: u.unit_name,
      points: u.effective_points,
      isWarlord: u.is_warlord === 1,
      isGhost: u.unit_id === null,
      leaderLabel: null,
      enhancementName: null,
    })),
    enhancements,
    totalPoints: units.reduce((s, u) => s + u.effective_points, 0),
    enhancementTotal: enhancements.reduce((s, e) => s + e.enhancement_points, 0),
  }),
}));

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockList: ArmyList = {
  id: 1,
  name: "Alpha Strike Force",
  faction_id: 1,
  points_limit: 2000,
  list_type: null,
  notes: null,
  detachment_id: null,
  detachment_name: "Gladius Task Force",
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
};

const mockUnits: ArmyListUnitRow[] = [
  {
    id: 10,
    list_id: 1,
    unit_id: 100,
    ghost_unit_name: null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
    points_override: null,
    notes: null,
    sort_order: 0,
    created_at: "2025-01-01",
    unit_name: "Intercessors",
    canonical_name: null,
    unit_points: 80,
    effective_points: 80,
    faction_id: 1,
    unit_category: null, unit_model_count: null,
    status_assembly: null,
    status_painting: null,
    painting_percentage: null,
    tactical_role: null,
    synced_points: null,
    override_points: null,
    tier_points: null,
  },
  {
    id: 11,
    list_id: 1,
    unit_id: 101,
    ghost_unit_name: null,
    is_warlord: 1,
    selected_model_count: null,
    leader_attached_to_id: null,
    points_override: null,
    notes: null,
    sort_order: 0,
    created_at: "2025-01-01",
    unit_name: "Captain",
    canonical_name: null,
    unit_points: 80,
    effective_points: 80,
    faction_id: 1,
    unit_category: null, unit_model_count: null,
    status_assembly: null,
    status_painting: null,
    painting_percentage: null,
    tactical_role: null,
    synced_points: null,
    override_points: null,
    tier_points: null,
  },
];

const mockEnhancements: ArmyListEnhancement[] = [];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PrintPreviewDialog", () => {
  it("renders army name when open=true and list provided", () => {
    render(
      <PrintPreviewDialog
        open={true}
        list={mockList}
        units={mockUnits}
        enhancements={mockEnhancements}
        factionName="Space Marines"
        onClose={vi.fn()}
      />,
    );

    // Army name appears in both DialogDescription and the print header h1
    const matches = screen.getAllByText("Alpha Strike Force");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders unit names from the units array", () => {
    render(
      <PrintPreviewDialog
        open={true}
        list={mockList}
        units={mockUnits}
        enhancements={mockEnhancements}
        factionName="Space Marines"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Captain")).toBeInTheDocument();
  });

  it("has a Print button with text 'Print'", () => {
    render(
      <PrintPreviewDialog
        open={true}
        list={mockList}
        units={mockUnits}
        enhancements={mockEnhancements}
        factionName="Space Marines"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });

  it("does not render content when open=false", () => {
    render(
      <PrintPreviewDialog
        open={false}
        list={mockList}
        units={mockUnits}
        enhancements={mockEnhancements}
        factionName="Space Marines"
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryAllByText("Alpha Strike Force")).toHaveLength(0);
    expect(screen.queryByText("Intercessors")).not.toBeInTheDocument();
  });

  it("shows (Warlord) suffix for warlord units", () => {
    render(
      <PrintPreviewDialog
        open={true}
        list={mockList}
        units={mockUnits}
        enhancements={mockEnhancements}
        factionName="Space Marines"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("(Warlord)")).toBeInTheDocument();
  });

  it("shows points totals", () => {
    render(
      <PrintPreviewDialog
        open={true}
        list={mockList}
        units={mockUnits}
        enhancements={mockEnhancements}
        factionName="Space Marines"
        onClose={vi.fn()}
      />,
    );

    // Grand total line
    expect(screen.getByText("TOTAL: 160pts / 2000pts")).toBeInTheDocument();
  });
});
