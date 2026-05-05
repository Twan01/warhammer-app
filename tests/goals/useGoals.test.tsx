/**
 * Phase 22 — useGoals / useGoalProgress / useCreateGoal / useDeleteGoal hook tests.
 *
 * Covers ANLY-01 (useGoals query, useCreateGoal/useDeleteGoal cache invalidation),
 *         ANLY-02 (useGoalProgress enabled behavior, useCreatePaintingSession goal-progress invalidation).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the DB query module
vi.mock("@/db/queries/goals", () => ({
  getGoals: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  getGoalProgress: vi.fn(),
}));

import {
  useGoals,
  useGoalProgress,
  useCreateGoal,
  useDeleteGoal,
  GOALS_KEY,
  GOAL_PROGRESS_KEY,
} from "@/hooks/useGoals";
import * as goalQueries from "@/db/queries/goals";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
    qc,
  };
}

describe("useGoals hook (ANLY-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns goals from getGoals query", async () => {
    vi.mocked(goalQueries.getGoals).mockResolvedValue([]);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useGoalProgress hook (ANLY-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is disabled when goals are undefined", async () => {
    // goals query is not resolved yet → goals is undefined
    vi.mocked(goalQueries.getGoals).mockReturnValue(new Promise(() => {})); // never resolves
    vi.mocked(goalQueries.getGoalProgress).mockResolvedValue(new Map());
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGoalProgress(), { wrapper });
    // Should not be fetching since enabled = (goals !== undefined) = false
    expect(result.current.fetchStatus).toBe("idle");
    expect(goalQueries.getGoalProgress).not.toHaveBeenCalled();
  });

  it("is enabled when goals is empty array", async () => {
    vi.mocked(goalQueries.getGoals).mockResolvedValue([]);
    vi.mocked(goalQueries.getGoalProgress).mockResolvedValue(new Map());
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGoalProgress(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(goalQueries.getGoalProgress).toHaveBeenCalledWith([]);
  });
});

describe("useCreateGoal mutation (ANLY-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates goals and goal-progress keys on success", async () => {
    vi.mocked(goalQueries.createGoal).mockResolvedValue(1);
    const { wrapper, qc } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useCreateGoal(), { wrapper });
    result.current.mutate({
      name: "Paint 5 units",
      target_count: 5,
      timeframe: "month",
      period: "2026-05",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: GOALS_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: GOAL_PROGRESS_KEY });
  });
});

describe("useDeleteGoal mutation (ANLY-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates goals and goal-progress keys on success", async () => {
    vi.mocked(goalQueries.deleteGoal).mockResolvedValue(undefined);
    const { wrapper, qc } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useDeleteGoal(), { wrapper });
    result.current.mutate(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: GOALS_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: GOAL_PROGRESS_KEY });
  });
});

describe("useCreatePaintingSession invalidation (ANLY-02)", () => {
  it("invalidates goal-progress key on success", async () => {
    // Verify the source file contains the invalidation (structural test)
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      __dirname,
      "../../src/hooks/useJournalSessions.ts"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('queryKey: ["goal-progress"]');
  });
});
