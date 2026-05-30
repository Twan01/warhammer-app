/**
 * Phase 104 — BUI-02: UdbUnitRow component tests.
 *
 * Verifies unit name rendering, points display (including null),
 * role badge, and click handler.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UdbUnitRow } from "@/features/unit-database/UdbUnitRow";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const UNIT_WITH_POINTS: UdbUnitSummary = {
  id: "u1",
  faction_id: "SM",
  name: "Intercessors",
  role: "Battleline",
  base_points: 80,
  min_models: 5,
  max_models: 10,
};

const UNIT_NULL_POINTS: UdbUnitSummary = {
  id: "u2",
  faction_id: "SM",
  name: "Mystery Unit",
  role: null,
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

    await user.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith("u1");
  });
});
