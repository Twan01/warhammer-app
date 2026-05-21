/**
 * Phase 91 — ENH-03: ArmyListSummaryBar enhancement stat line tests.
 *
 * Verifies that enhancement points are reflected in the summary bar:
 * - Enhancement stat line shown when enhancements exist
 * - Enhancement stat line hidden when no enhancements
 * - Total points include enhancement points
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArmyListSummaryBar } from "@/features/army-lists/ArmyListSummaryBar";
import type { ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";

// PointsFreshnessBadge calls hooks internally — mock it
vi.mock("@/features/army-lists/PointsFreshnessBadge", () => ({
  PointsFreshnessBadge: () => <span data-testid="freshness-badge">Fresh</span>,
}));

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1,
    list_id: 1,
    unit_id: 1,
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
    painting_percentage: 100,
    effective_points: 100,
    tactical_role: null,
    tier_points: null,
    ghost_unit_name: null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
    ...overrides,
  };
}

function makeEnhancement(overrides: Partial<ArmyListEnhancement> = {}): ArmyListEnhancement {
  return {
    id: 1,
    list_id: 1,
    army_list_unit_id: 1,
    enhancement_name: "Adeptus Command",
    enhancement_points: 30,
    created_at: "2024-01-01",
    ...overrides,
  };
}

function renderBar(
  units: ArmyListUnitRow[],
  enhancements: ArmyListEnhancement[],
  pointsLimit: number | null = null,
) {
  return render(
    <TooltipProvider>
      <ArmyListSummaryBar
        units={units}
        pointsLimit={pointsLimit}
        freshness="fresh"
        enhancements={enhancements}
      />
    </TooltipProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests: ENH-03
// ---------------------------------------------------------------------------

describe("ArmyListSummaryBar — ENH-03 enhancement stat line", () => {
  it("shows enhancement stat line when enhancements exist", () => {
    const units = [makeUnit({ effective_points: 850 })];
    const enhancements = [
      makeEnhancement({ id: 1, enhancement_points: 30 }),
      makeEnhancement({ id: 2, enhancement_name: "Fire Discipline", enhancement_points: 30 }),
    ];

    renderBar(units, enhancements);

    expect(screen.getByText("Enhancements:")).toBeInTheDocument();
    expect(screen.getByText("60 pts (2)")).toBeInTheDocument();
  });

  it("does not show enhancement stat line when enhancements is empty", () => {
    const units = [makeUnit({ effective_points: 100 })];

    renderBar(units, []);

    expect(screen.queryByText("Enhancements:")).not.toBeInTheDocument();
  });

  it("totalPoints display includes enhancement points", () => {
    const units = [
      makeUnit({ id: 1, effective_points: 500 }),
      makeUnit({ id: 2, effective_points: 350 }),
    ];
    const enhancements = [
      makeEnhancement({ id: 1, enhancement_points: 30 }),
      makeEnhancement({ id: 2, enhancement_name: "Fire Discipline", enhancement_points: 30 }),
    ];

    renderBar(units, enhancements, 2000);

    // Total should be 500 + 350 + 30 + 30 = 910
    expect(screen.getByText("910 / 2000 pts")).toBeInTheDocument();
  });
});
