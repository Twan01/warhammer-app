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

  describe("when isActive is false (default)", () => {
    it("renders faction name without Active badge", () => {
      render(<FactionSummaryCard stat={mockStat} isActive={false} onActivate={vi.fn()} />);
      expect(screen.getByText("Space Marines")).toBeDefined();
      expect(screen.queryByText("Active")).toBeNull();
    });

    it("calls onActivate and navigates to /collection when clicked", () => {
      const onActivate = vi.fn();
      render(<FactionSummaryCard stat={mockStat} isActive={false} onActivate={onActivate} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/collection" });
    });
  });

  describe("when isActive is true", () => {
    it("renders Active badge", () => {
      render(<FactionSummaryCard stat={mockStat} isActive={true} onActivate={vi.fn()} />);
      expect(screen.getByText("Active")).toBeDefined();
    });

    it("calls onActivate and does NOT navigate when clicked", () => {
      const onActivate = vi.fn();
      render(<FactionSummaryCard stat={mockStat} isActive={true} onActivate={onActivate} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("keyboard activation", () => {
    it("calls onActivate on Enter key when inactive", () => {
      const onActivate = vi.fn();
      render(<FactionSummaryCard stat={mockStat} isActive={false} onActivate={onActivate} />);
      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
      expect(onActivate).toHaveBeenCalled();
    });
  });
});
