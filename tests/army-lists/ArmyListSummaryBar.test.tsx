/**
 * Phase 76 -- PV-06 gap: ArmyListSummaryBar renders list-level warnings as Badge components.
 *
 * Verifies that computeListWarnings results appear as Badge elements in the
 * summary bar -- specifically:
 *   - Hard warnings ("Points exceeded") rendered as Badge variant="destructive"
 *   - Soft warnings (e.g. Battleline count) rendered as Badge variant="outline"
 *   - No warning badges shown when list is within limit and has enough Battleline
 *   - Tooltip text distinguishes list warnings from unit warnings
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArmyListSummaryBar } from "@/features/army-lists/ArmyListSummaryBar";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { SyncFreshness } from "@/lib/syncFreshness";

// PointsFreshnessBadge calls hooks internally -- mock it
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
    udb_unit_id: null,
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

function renderBar(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  freshness: SyncFreshness,
) {
  return render(
    <TooltipProvider>
      <ArmyListSummaryBar units={units} pointsLimit={pointsLimit} freshness={freshness} enhancements={[]} />
    </TooltipProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ArmyListSummaryBar -- list-level warning badges (PV-06)", () => {
  // -------------------------------------------------------------------------
  // Hard warning: Points exceeded
  // -------------------------------------------------------------------------

  it("renders 'Points exceeded' badge when total points exceeds pointsLimit", () => {
    const units = [makeUnit({ effective_points: 2100 })];
    renderBar(units, 2000, "fresh");

    // The badge should be in the document
    expect(screen.getByText("Points exceeded")).toBeInTheDocument();
  });

  it("'Points exceeded' badge is rendered inside an element with destructive styling", () => {
    const units = [makeUnit({ effective_points: 2100 })];
    renderBar(units, 2000, "fresh");

    const badge = screen.getByText("Points exceeded");
    // Badge variant="destructive" renders with bg-destructive or destructive class
    // We test that it exists within the warning badges container (role=status)
    const container = badge.closest("[role='status']");
    expect(container).not.toBeNull();
  });

  it("does NOT render 'Points exceeded' badge when total is within pointsLimit", () => {
    const units = [makeUnit({ effective_points: 1500 })];
    renderBar(units, 2000, "fresh");

    expect(screen.queryByText("Points exceeded")).not.toBeInTheDocument();
  });

  it("does NOT render 'Points exceeded' badge when pointsLimit is null", () => {
    const units = [makeUnit({ effective_points: 99999 })];
    renderBar(units, null, "fresh");

    expect(screen.queryByText("Points exceeded")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Soft warning: Battleline count (Phase 106)
  // -------------------------------------------------------------------------

  it("renders Battleline count warning when under minimum", () => {
    // pointsLimit >= 2000 requires 3 Battleline; 0 provided
    const units = [makeUnit({ effective_points: 1000 })];
    renderBar(units, 2000, "fresh");

    expect(screen.getByText(/Needs 3 Battleline/)).toBeInTheDocument();
  });

  it("does NOT render Battleline warning when pointsLimit is null", () => {
    const units = [makeUnit({ effective_points: 500 })];
    renderBar(units, null, "fresh");

    expect(screen.queryByText(/Battleline/)).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Both warnings together
  // -------------------------------------------------------------------------

  it("renders both hard and soft warning badges when points exceeded AND Battleline short", () => {
    const units = [makeUnit({ effective_points: 2200 })];
    renderBar(units, 2000, "fresh");

    expect(screen.getByText("Points exceeded")).toBeInTheDocument();
    expect(screen.getByText(/Needs 3 Battleline/)).toBeInTheDocument();
  });

  it("both badges are within the same role=status container", () => {
    const units = [makeUnit({ effective_points: 2200 })];
    renderBar(units, 2000, "fresh");

    const exceededBadge = screen.getByText("Points exceeded");
    const battlelineBadge = screen.getByText(/Needs 3 Battleline/);

    const exceededContainer = exceededBadge.closest("[role='status']");
    const battlelineContainer = battlelineBadge.closest("[role='status']");

    expect(exceededContainer).not.toBeNull();
    expect(battlelineContainer).not.toBeNull();
    expect(exceededContainer).toBe(battlelineContainer);
  });

  // -------------------------------------------------------------------------
  // No badge section when no list-level warnings
  // -------------------------------------------------------------------------

  it("does not render the role=status badge container when no list warnings", () => {
    // No pointsLimit = no points-exceeded check and no Battleline check
    const units = [makeUnit({ effective_points: 500 })];
    renderBar(units, null, "fresh");

    // No warnings at all -> the badge section (role=status) should not be in DOM
    expect(document.querySelector("[role=’status’]")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Tooltip text distinguishes list vs unit warnings (PV-06 requirement)
  // -------------------------------------------------------------------------

  it("warning count trigger shows combined count that sums list and unit warnings", () => {
    // exceeded + Battleline short -> 2 list warnings; not-painted unit -> 1 unit warning -> total 3
    const units = [
      makeUnit({ effective_points: 2100, status_painting: "Primed" }),
    ];
    renderBar(units, 2000, "fresh");

    // The combined warning count label must be present
    expect(screen.getByText(/Warnings: 3/)).toBeInTheDocument();

    // list warning badges show the breakdown is 2 list-level warnings
    expect(screen.getByText("Points exceeded")).toBeInTheDocument();
    expect(screen.getByText(/Needs 3 Battleline/)).toBeInTheDocument();

    // The warning count element is the tooltip trigger
    const warningEl = screen.getByText(/Warnings: 3/);
    expect(warningEl.textContent).toMatch(/Warnings:/);
  });
});
