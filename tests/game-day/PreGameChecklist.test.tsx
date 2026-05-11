/**
 * Phase 56 — ChecklistTab component tests.
 *
 * Mocks the game day Zustand store and verifies default checklist items,
 * progress counter, add input, and reset button state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChecklistTab } from "@/features/game-day/ChecklistTab";
import { DEFAULT_CHECKLIST } from "@/features/game-day/gameDayStore";
import type { ChecklistItem, GameDayListState } from "@/features/game-day/gameDayStore";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToggleChecklistItem = vi.fn();
const mockAddChecklistItem = vi.fn();
const mockResetChecklist = vi.fn();

let mockChecklistItems: ChecklistItem[] = [];

vi.mock("@/features/game-day/gameDayStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/game-day/gameDayStore")>();
  return {
    ...actual,
    useGameDayStore: () => ({
      toggleChecklistItem: mockToggleChecklistItem,
      addChecklistItem: mockAddChecklistItem,
      resetChecklist: mockResetChecklist,
    }),
    useGameDayListState: (): GameDayListState => ({
      cp: 0,
      prevCp: null,
      startingCp: 0,
      checklistItems: mockChecklistItems,
      usedAbilities: [],
    }),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ChecklistTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clone DEFAULT_CHECKLIST so each test starts fresh
    mockChecklistItems = DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  });

  it("renders 5 default checklist items", () => {
    render(<ChecklistTab listId={1} />);
    expect(screen.getByText("Verify army list points")).toBeInTheDocument();
    expect(screen.getByText("Check detachment rules")).toBeInTheDocument();
    expect(screen.getByText("Review stratagems")).toBeInTheDocument();
    expect(screen.getByText("Confirm faction rules")).toBeInTheDocument();
    expect(screen.getByText("Set up terrain")).toBeInTheDocument();
  });

  it("renders progress counter '0/5 complete'", () => {
    render(<ChecklistTab listId={1} />);
    expect(screen.getByText("0/5 complete")).toBeInTheDocument();
  });

  it("renders 'Add a checklist item...' placeholder input", () => {
    render(<ChecklistTab listId={1} />);
    expect(screen.getByPlaceholderText("Add a checklist item...")).toBeInTheDocument();
  });

  it("Reset All button is disabled when no items checked", () => {
    render(<ChecklistTab listId={1} />);
    const resetButton = screen.getByRole("button", { name: /Reset All/i });
    expect(resetButton).toBeDisabled();
  });
});
