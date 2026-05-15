/** Wave 1 — PLAY-01 ArmyListSummaryBar readiness panel upgrade. All 6 stubs activated.
 * Updated for Phase 66: new props (pointsLimit, freshness) and stat labels. */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArmyListSummaryBar } from "@/features/army-lists/ArmyListSummaryBar";
import type { ArmyListUnitRow } from "@/types/armyList";

// StatusBadge renders PaintingStatus as text — no special mocking needed
vi.mock("@/components/ui/status-badge", async (importOriginal) => {
  return importOriginal();
});

// PointsFreshnessBadge is self-contained (calls hooks internally) — mock it
vi.mock("@/features/army-lists/PointsFreshnessBadge", () => ({
  PointsFreshnessBadge: () => <span data-testid="freshness-badge">Fresh</span>,
}));

function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1, list_id: 1, unit_id: 1, points_override: null, notes: null,
    created_at: "2024-01-01", unit_name: "Intercessors", unit_points: 100,
    faction_id: 1, status_assembly: 1, status_painting: "Completed",
    painting_percentage: 100, effective_points: 100, tactical_role: null,
    synced_points: null, override_points: null,
    ...overrides,
  };
}

/** Default props for convenience */
const defaultProps = { pointsLimit: null as number | null, freshness: "fresh" as const };

describe("ArmyListSummaryBar readiness panel (PLAY-01)", () => {
  it("renders a progress bar with width matching battleReadyPct", () => {
    const units = [
      makeUnit({ id: 1, status_painting: "Completed", effective_points: 100 }),
      makeUnit({ id: 2, status_painting: "Primed", effective_points: 100 }),
    ];
    render(<TooltipProvider><ArmyListSummaryBar units={units} {...defaultProps} /></TooltipProvider>);

    // The inner progress bar div has class bg-battle-gold
    const progressBar = document.querySelector(".bg-battle-gold");
    expect(progressBar).not.toBeNull();
    expect((progressBar as HTMLElement).style.width).toBe("50%");
  });

  it("progress bar uses bg-battle-gold class for the filled portion", () => {
    const units = [
      makeUnit({ id: 1, status_painting: "Completed", effective_points: 200 }),
    ];
    render(<TooltipProvider><ArmyListSummaryBar units={units} {...defaultProps} /></TooltipProvider>);

    const progressBar = document.querySelector(".bg-battle-gold");
    expect(progressBar).not.toBeNull();
    expect(progressBar).toHaveClass("bg-battle-gold");
  });

  it("renders not-ready unit list with StatusBadge per non-Completed unit", () => {
    const units = [
      makeUnit({ id: 1, unit_name: "Intercessors", status_painting: "Completed", effective_points: 100 }),
      makeUnit({ id: 2, unit_name: "Hellblaster", status_painting: "Primed", effective_points: 100 }),
    ];
    render(<TooltipProvider><ArmyListSummaryBar units={units} {...defaultProps} /></TooltipProvider>);

    expect(screen.getByText("Hellblaster")).toBeInTheDocument();
    expect(screen.getByText("Primed")).toBeInTheDocument();
    expect(screen.getByText("Not ready (1)")).toBeInTheDocument();
  });

  it("hides not-ready list when all units are Completed", () => {
    const units = [
      makeUnit({ id: 1, status_painting: "Completed", effective_points: 100 }),
      makeUnit({ id: 2, status_painting: "Completed", effective_points: 150 }),
    ];
    render(<TooltipProvider><ArmyListSummaryBar units={units} {...defaultProps} /></TooltipProvider>);

    expect(screen.getByText("All units battle-ready")).toBeInTheDocument();
    expect(screen.queryByText(/Not ready/)).not.toBeInTheDocument();
  });

  it("shows gold-tinted 'All units battle-ready' message at 100%", () => {
    const units = [
      makeUnit({ id: 1, status_painting: "Completed", effective_points: 100 }),
    ];
    render(<TooltipProvider><ArmyListSummaryBar units={units} {...defaultProps} /></TooltipProvider>);

    const msg = screen.getByText("All units battle-ready");
    expect(msg).toHaveClass("text-battle-gold");
  });

  it("renders stat row with Total, Owned, and Ready labels", () => {
    const units = [
      makeUnit({ id: 1, status_painting: "Completed", effective_points: 100 }),
    ];
    render(<TooltipProvider><ArmyListSummaryBar units={units} {...defaultProps} /></TooltipProvider>);

    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText(/Owned:/)).toBeInTheDocument();
    expect(screen.getByText(/Ready:/)).toBeInTheDocument();
  });
});
