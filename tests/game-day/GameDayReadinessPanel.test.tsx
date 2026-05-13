/**
 * Phase 67 -- GameDayReadinessPanel component tests.
 *
 * Tests the pre-game readiness panel: points display, warning counts,
 * collapsible detail, readiness gaps, role coverage pills.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameDayReadinessPanel } from "@/features/game-day/GameDayReadinessPanel";
import type { ArmyListUnitRow } from "@/types/armyList";

// Mock PointsFreshnessBadge — it calls hooks internally
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
    painting_percentage: 100,
    effective_points: 100,
    tactical_role: null,
    ...overrides,
  };
}

const defaultProps = {
  pointsLimit: null as number | null,
  freshness: "fresh" as const,
};

function renderPanel(
  units: ArmyListUnitRow[],
  overrides: Partial<typeof defaultProps> = {},
) {
  return render(
    <TooltipProvider>
      <GameDayReadinessPanel
        units={units}
        {...defaultProps}
        {...overrides}
      />
    </TooltipProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameDayReadinessPanel", () => {
  it("renders points display as 'X / Y pts' when pointsLimit is set", () => {
    renderPanel([makeUnit({ effective_points: 800 })], {
      pointsLimit: 2000,
    });
    expect(screen.getByText("800 / 2000 pts")).toBeInTheDocument();
  });

  it("renders points display as 'X pts' when pointsLimit is null", () => {
    renderPanel([makeUnit({ effective_points: 800 })]);
    expect(screen.getByText("800 pts")).toBeInTheDocument();
  });

  it("points value has text-destructive class when pointsExceeded is true", () => {
    renderPanel([makeUnit({ effective_points: 2500 })], {
      pointsLimit: 2000,
    });
    const pointsText = screen.getByText("2500 / 2000 pts");
    expect(pointsText.className).toContain("text-destructive");
  });

  it("renders PointsFreshnessBadge", () => {
    renderPanel([makeUnit()]);
    expect(screen.getByTestId("freshness-badge")).toBeInTheDocument();
  });

  it("renders warning count with hard+soft split tooltip text", () => {
    // stale freshness triggers soft warnings
    renderPanel(
      [makeUnit({ status_painting: "Primed", effective_points: 2100 })],
      { pointsLimit: 2000, freshness: "stale" },
    );
    // hard: points exceeded; soft: not painted + stale points
    expect(screen.getByText(/Warnings: \d+/)).toBeInTheDocument();
  });

  it("warning count text has text-destructive class when hard warnings present", () => {
    renderPanel(
      [makeUnit({ effective_points: 2100 })],
      { pointsLimit: 2000 },
    );
    const warningText = screen.getByText(/Warnings:/);
    expect(warningText.className).toContain("text-destructive");
  });

  it("warning count text has text-amber-500 class when only soft warnings present", () => {
    renderPanel(
      [makeUnit({ status_painting: "Primed" })],
      { freshness: "fresh" },
    );
    const warningText = screen.getByText(/Warnings:/);
    expect(warningText.className).toContain("text-amber-500");
  });

  it("collapsible detail lists affected units with their warning messages", async () => {
    const user = userEvent.setup();
    renderPanel(
      [makeUnit({ id: 1, unit_name: "Terminators", status_painting: "Primed" })],
      { freshness: "fresh" },
    );
    // Click the warnings trigger to expand
    const trigger = screen.getByText(/Warnings:/);
    await user.click(trigger);
    // Should show unit name and warning message in the collapsible
    expect(screen.getByText("Terminators")).toBeInTheDocument();
    expect(screen.getByText("Not painted")).toBeInTheDocument();
  });

  it("readiness gaps section shows unpainted units with StatusBadge", () => {
    renderPanel([
      makeUnit({ id: 1, unit_name: "Hellblasters", status_painting: "Primed" }),
    ]);
    expect(screen.getByText("Hellblasters")).toBeInTheDocument();
    expect(screen.getByText("Primed")).toBeInTheDocument();
  });

  it("readiness gaps shows 'Not assembled' text for units with status_assembly === 0", () => {
    renderPanel([
      makeUnit({ id: 1, unit_name: "Aggressors", status_assembly: 0 }),
    ]);
    expect(screen.getByText("Not assembled")).toBeInTheDocument();
  });

  it("role coverage pills render with count for each role when hasAnyRole is true", () => {
    renderPanel([
      makeUnit({ id: 1, tactical_role: "anti_tank" }),
      makeUnit({ id: 2, tactical_role: "screening" }),
    ]);
    expect(screen.getByText("Anti-Tank 1")).toBeInTheDocument();
    expect(screen.getByText("Screening 1")).toBeInTheDocument();
  });

  it("uncovered roles show dashed border class", () => {
    renderPanel([
      makeUnit({ id: 1, tactical_role: "anti_tank" }),
    ]);
    // Utility should be uncovered (0 units)
    const utilityPill = screen.getByText("Utility 0");
    expect(utilityPill.className).toContain("border-dashed");
  });

  it("role coverage section hidden when no units have tactical_role", () => {
    renderPanel([makeUnit()]);
    expect(screen.queryByText("Role Coverage")).not.toBeInTheDocument();
  });

  it("shows 'All units battle-ready' when zero warnings and all units complete", () => {
    renderPanel([makeUnit({ status_painting: "Completed", status_assembly: 1 })]);
    expect(screen.getByText("All units battle-ready")).toBeInTheDocument();
  });
});
