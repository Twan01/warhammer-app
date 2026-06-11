/**
 * Phase 22 — GoalsPage component tests.
 *
 * Mocks React Query hooks with vi.mock — no real DB or Tauri bridge needed.
 * Sub-components (GoalSheet, GoalDeleteDialog) are mocked to render null.
 *
 * Covers ANLY-03 (GoalsPage renders Active / Completed / Missed section groupings and empty state).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { GoalsPage } from "@/features/goals/GoalsPage";
import type { HobbyGoal } from "@/types/goal";

// ---------------------------------------------------------------------------
// Mock fixtures
// ---------------------------------------------------------------------------

const activeGoal: HobbyGoal = {
  id: 1,
  name: "Paint 5 infantry",
  target_count: 5,
  timeframe: "month",
  period: "2026-05",
  created_at: "2026-05-01T00:00:00",
};

const completedGoal: HobbyGoal = {
  id: 2,
  name: "Paint 3 tanks",
  target_count: 3,
  timeframe: "month",
  period: "2026-05",
  created_at: "2026-05-01T00:00:00",
};

const missedGoal: HobbyGoal = {
  id: 3,
  name: "Paint 10 elites",
  target_count: 10,
  timeframe: "month",
  period: "2026-03", // expired — past month
  created_at: "2026-03-01T00:00:00",
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// computeGoalPeriod returns isExpired: true for missedGoal period "2026-03"
// and false for active/completed goals period "2026-05"
vi.mock("@/lib/computeGoalPeriod", () => ({
  computeGoalPeriod: (_timeframe: string, period: string) => ({
    startDate: period + "-01",
    endDate: period + "-31",
    label: period,
    isExpired: period === "2026-03",
  }),
  deriveGoalStatus: (progress: number, target: number, isExpired: boolean) => {
    if (progress >= target) return "completed";
    if (isExpired) return "missed";
    return "active";
  },
  currentPeriod: () => "2026-05",
}));

vi.mock("@/features/goals/GoalSheet", () => ({
  GoalSheet: () => null,
}));

vi.mock("@/features/goals/GoalDeleteDialog", () => ({
  GoalDeleteDialog: () => null,
}));

const mockUseGoals = vi.fn();
const mockUseGoalProgress = vi.fn();
const mockUseDeleteGoal = vi.fn();

vi.mock("@/hooks/useGoals", () => ({
  useGoals: () => mockUseGoals(),
  useGoalProgress: () => mockUseGoalProgress(),
  useDeleteGoal: () => mockUseDeleteGoal(),
}));

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ---------------------------------------------------------------------------
// Defaults / reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockUseGoalProgress.mockReturnValue({
    data: new Map<number, number>(),
    isLoading: false,
  });
  mockUseDeleteGoal.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GoalsPage (ANLY-03)", () => {
  it("renders 'Active Goals' section for in-progress goals", () => {
    mockUseGoals.mockReturnValue({
      data: [activeGoal],
      isLoading: false,
      isError: false,
    });
    // progress = 2, target = 5, not expired → active
    mockUseGoalProgress.mockReturnValue({
      data: new Map([[1, 2]]),
      isLoading: false,
    });

    render(<GoalsPage />, { wrapper: Wrapper });

    expect(screen.getByText("Active Goals")).toBeInTheDocument();
    expect(screen.getByText("Paint 5 infantry")).toBeInTheDocument();
  });

  it("renders 'Completed' section for goals with progress >= target", () => {
    mockUseGoals.mockReturnValue({
      data: [completedGoal],
      isLoading: false,
      isError: false,
    });
    // progress = 3, target = 3 → completed
    mockUseGoalProgress.mockReturnValue({
      data: new Map([[2, 3]]),
      isLoading: false,
    });

    render(<GoalsPage />, { wrapper: Wrapper });

    // "Completed" appears in both section heading and GoalCard status badge — use getAllByText
    const completedElements = screen.getAllByText("Completed");
    expect(completedElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Paint 3 tanks")).toBeInTheDocument();
  });

  it("renders 'Missed' section for expired goals with progress < target", () => {
    mockUseGoals.mockReturnValue({
      data: [missedGoal],
      isLoading: false,
      isError: false,
    });
    // progress = 1, target = 10, isExpired = true (period 2026-03) → missed
    mockUseGoalProgress.mockReturnValue({
      data: new Map([[3, 1]]),
      isLoading: false,
    });

    render(<GoalsPage />, { wrapper: Wrapper });

    // "Missed" appears in both the section heading and GoalCard status badge — use getAllByText
    const missedElements = screen.getAllByText("Missed");
    expect(missedElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Paint 10 elites")).toBeInTheDocument();
  });

  it("renders empty state when no goals exist", () => {
    mockUseGoals.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<GoalsPage />, { wrapper: Wrapper });

    expect(screen.getByText("No goals set yet")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Phase 127 — VIS-03: Section heading CSS standardization
// ---------------------------------------------------------------------------
describe("GoalsPage — VIS-03: section headings use standardized classes", () => {
  it("all section headings use text-sm font-semibold uppercase tracking-widest text-muted-foreground", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../src/features/goals/GoalsPage.tsx"),
      "utf-8",
    );
    const standardClass = "text-sm font-semibold uppercase tracking-widest text-muted-foreground";
    // Must have exactly 3 occurrences (Active Goals, Completed, Missed)
    const matches = source.match(new RegExp(standardClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(3);
  });

  it("no h2 elements with text-base class remain", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../src/features/goals/GoalsPage.tsx"),
      "utf-8",
    );
    expect(source).not.toMatch(/<h2[^>]*text-base/);
  });

  it("no text-battle-gold class remains", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../src/features/goals/GoalsPage.tsx"),
      "utf-8",
    );
    expect(source).not.toContain("text-battle-gold");
  });
});

// ---------------------------------------------------------------------------
// FIX-07: Goal delete catch block does NOT call toast.error (dedup to hook)
// ---------------------------------------------------------------------------

describe("GoalsPage — FIX-07 delete toast dedup", () => {
  it("GoalsPage source catch block does not contain toast.error call", () => {
    // Structural verification: the handleDeleteConfirm catch block must NOT
    // call toast.error — the hook-level onError handles error toasts.
    // We verify by reading the source and checking the catch block.
    const fs = require("node:fs");
    const path = require("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../src/features/goals/GoalsPage.tsx"),
      "utf-8",
    );

    // Extract the catch block from handleDeleteConfirm
    const catchMatch = source.match(/catch\s*(\([^)]*\))?\s*\{([^}]*)\}/g);
    expect(catchMatch).not.toBeNull();
    // Verify none of the catch blocks contain toast.error
    for (const block of catchMatch!) {
      expect(block).not.toContain("toast.error");
    }
  });
});
