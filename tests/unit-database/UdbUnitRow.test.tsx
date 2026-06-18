/**
 * Phase 104 — BUI-02: UdbUnitRow component tests.
 *
 * Verifies unit name rendering, points display (including null),
 * role badge, and click handler.
 *
 * Updated Phase 138-02: UdbUnitRow now includes a compare toggle so the
 * `useDatabaseBrowserFilters` store must be mocked and button selection is
 * more specific.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UdbUnitRow } from "@/features/unit-database/UdbUnitRow";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Mock the compare store so UdbUnitRow renders without a Zustand provider
// ---------------------------------------------------------------------------
vi.mock("@/features/unit-database/databaseBrowserFilters", () => ({
  useDatabaseBrowserFilters: () => ({
    compareIds: new Set<string>(),
    addToCompare: vi.fn(),
    removeFromCompare: vi.fn(),
  }),
}));

// Mock Tooltip primitives — Radix portals don't work in jsdom
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    if (asChild) return <>{children}</>;
    return <div>{children}</div>;
  },
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const UNIT_WITH_POINTS: UdbUnitSummary = {
  id: "u1",
  faction_id: "SM",
  name: "Intercessors",
  role: "Battleline",
  sub_faction: null,
  base_points: 80,
  min_models: 5,
  max_models: 10,
};

const UNIT_NULL_POINTS: UdbUnitSummary = {
  id: "u2",
  faction_id: "SM",
  name: "Mystery Unit",
  role: null,
  sub_faction: null,
  base_points: null,
  min_models: null,
  max_models: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UdbUnitRow", () => {
  it("renders unit name", () => {
    render(<UdbUnitRow unit={UNIT_WITH_POINTS} onOpen={() => {}} />);
    expect(screen.getByText("Intercessors")).toBeInTheDocument();
  });

  it("shows 'from N pts' when base_points is set", () => {
    render(<UdbUnitRow unit={UNIT_WITH_POINTS} onOpen={() => {}} />);
    expect(screen.getByText("from 80 pts")).toBeInTheDocument();
  });

  it("shows dash when base_points is null", () => {
    render(<UdbUnitRow unit={UNIT_NULL_POINTS} onOpen={() => {}} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders role badge", () => {
    render(<UdbUnitRow unit={UNIT_WITH_POINTS} onOpen={() => {}} />);
    expect(screen.getByText("Battleline")).toBeInTheDocument();
  });

  it("calls onOpen when clicked", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<UdbUnitRow unit={UNIT_WITH_POINTS} onOpen={onOpen} />);

    // The row div carries role="button"; the compare toggle is a nested <button>.
    // Click on the row itself (not the nested compare button).
    await user.click(screen.getByText("Intercessors"));
    expect(onOpen).toHaveBeenCalledWith("u1");
  });
});
