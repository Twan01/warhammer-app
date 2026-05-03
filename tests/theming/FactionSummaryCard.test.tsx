import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactionSummaryCard } from "@/features/dashboard/FactionSummaryCard";
import type { FactionStat } from "@/features/dashboard/computeStats";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));
vi.mock("@/features/units/collectionFilters", () => ({
  useCollectionFilters: { setState: vi.fn() },
}));

const mockStat: FactionStat = {
  faction: {
    id: 1,
    name: "Space Marines",
    color_theme: "#0047AB",
    game_system: "40k",
    description: null,
    icon_path: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  modelCount: 10,
  paintedPct: 80,
  pointsOwned: 500,
  pointsPainted: 400,
};

describe("FactionSummaryCard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe("card click (always navigates)", () => {
    it("navigates to /collection when clicking the card (inactive)", () => {
      render(<FactionSummaryCard stat={mockStat} isActive={false} onActivate={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Space Marines" }));
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/collection" });
    });

    it("navigates to /collection when clicking the card (active)", () => {
      render(<FactionSummaryCard stat={mockStat} isActive={true} onActivate={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Space Marines" }));
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/collection" });
    });
  });

  describe("star button (toggles active, no navigation)", () => {
    it("calls onActivate without navigating when star is clicked (inactive)", () => {
      const onActivate = vi.fn();
      render(<FactionSummaryCard stat={mockStat} isActive={false} onActivate={onActivate} />);
      fireEvent.click(screen.getByRole("button", { name: /set as active/i }));
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("calls onActivate without navigating when star is clicked (active)", () => {
      const onActivate = vi.fn();
      render(<FactionSummaryCard stat={mockStat} isActive={true} onActivate={onActivate} />);
      fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("active state visuals", () => {
    it("renders faction name", () => {
      render(<FactionSummaryCard stat={mockStat} isActive={false} onActivate={vi.fn()} />);
      expect(screen.getByText("Space Marines")).toBeDefined();
    });

    it("star button aria-label reflects inactive state", () => {
      render(<FactionSummaryCard stat={mockStat} isActive={false} onActivate={vi.fn()} />);
      expect(screen.getByRole("button", { name: /set as active/i })).toBeDefined();
    });

    it("star button aria-label reflects active state", () => {
      render(<FactionSummaryCard stat={mockStat} isActive={true} onActivate={vi.fn()} />);
      expect(screen.getByRole("button", { name: /deactivate/i })).toBeDefined();
    });
  });
});
