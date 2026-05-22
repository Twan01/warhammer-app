/**
 * Phase 56 — ChecklistTab component tests.
 *
 * Mocks the game day Zustand store and verifies default checklist items,
 * progress counter, add input, and reset button state.
 *
 * Phase 78 extension: forgotten rules reminders rendering (Task 78-03-*, Req GD-03).
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
let mockForgottenRules: string[] = [];

vi.mock("@/hooks/useBattleLogs", () => ({
  useForgottenRules: () => ({ data: mockForgottenRules, isLoading: false }),
}));

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
      cpHistory: [],
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
    mockForgottenRules = [];
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

// ---------------------------------------------------------------------------
// Phase 78 — Forgotten Rules Reminders (Task 78-03-*, Req GD-03)
// ---------------------------------------------------------------------------

describe("ChecklistTab — forgotten rules reminders (Phase 78, GD-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChecklistItems = DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  });

  it("renders 'Reminders from last games' heading when forgotten rules are present", () => {
    mockForgottenRules = ["Advance and shoot penalty", "CP regen rule"];
    render(<ChecklistTab listId={1} />);
    expect(screen.getByText("Reminders from last games")).toBeInTheDocument();
  });

  it("renders each forgotten rule as a reminder item with its text", () => {
    mockForgottenRules = ["Advance and shoot penalty", "CP regen rule"];
    render(<ChecklistTab listId={1} />);
    expect(screen.getByText("Advance and shoot penalty")).toBeInTheDocument();
    expect(screen.getByText("CP regen rule")).toBeInTheDocument();
  });

  it("renders a 'Reminder' tag for each forgotten rule item", () => {
    mockForgottenRules = ["Advance and shoot penalty", "CP regen rule"];
    render(<ChecklistTab listId={1} />);
    const reminderTags = screen.getAllByText("Reminder");
    expect(reminderTags).toHaveLength(2);
  });

  it("renders reminder items with amber background class", () => {
    mockForgottenRules = ["Advance and shoot penalty"];
    render(<ChecklistTab listId={1} />);
    const amberItems = document.querySelectorAll(".bg-amber-500\\/10");
    expect(amberItems.length).toBeGreaterThan(0);
  });

  it("does NOT render 'Reminders from last games' when forgotten rules array is empty", () => {
    mockForgottenRules = [];
    render(<ChecklistTab listId={1} />);
    expect(screen.queryByText("Reminders from last games")).not.toBeInTheDocument();
  });

  it("does NOT render any reminder items when forgotten rules is empty", () => {
    mockForgottenRules = [];
    render(<ChecklistTab listId={1} />);
    expect(screen.queryByText("Reminder")).not.toBeInTheDocument();
    const amberItems = document.querySelectorAll(".bg-amber-500\\/10");
    expect(amberItems.length).toBe(0);
  });

  it("reminder items have no checkbox (are non-interactive display items)", () => {
    mockForgottenRules = ["Advance and shoot penalty"];
    render(<ChecklistTab listId={1} />);
    // The reminder section should not contain any checkboxes
    const remindersSection = screen.getByText("Reminders from last games").closest("div");
    const checkboxes = remindersSection?.querySelectorAll('[role="checkbox"]');
    expect(checkboxes?.length ?? 0).toBe(0);
  });

  it("renders reminder items ABOVE the pre-game checklist items", () => {
    mockForgottenRules = ["CP regen rule"];
    render(<ChecklistTab listId={1} />);
    const reminderHeading = screen.getByText("Reminders from last games");
    const checklistLabel = screen.getByText("Pre-Game Checklist");
    // Reminder heading should appear after the checklist header but before checklist items
    // We verify by checking that the reminder text node comes before the first checklist item
    const reminderItem = screen.getByText("CP regen rule");
    const firstChecklistItem = screen.getByText("Verify army list points");
    // compareDocumentPosition: 4 means 'following' — reminder should precede checklist item
    const position = reminderItem.compareDocumentPosition(firstChecklistItem);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Also verify both reminder heading and checklist label are present
    expect(reminderHeading).toBeInTheDocument();
    expect(checklistLabel).toBeInTheDocument();
  });
});
