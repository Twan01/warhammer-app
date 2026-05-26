import { vi, describe, it, expect } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/client", () => ({
  getDb: async () => ({
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue({ lastInsertId: 1 }),
  }),
}));

import {
  useCompleteStep,
  STEP_PROGRESS_KEY,
  UNIT_ASSIGNMENTS_KEY,
} from "@/hooks/useRecipeAssignments";
import { NEXT_PAINTING_ACTION_KEY } from "@/hooks/useNextPaintingAction";
import { DASHBOARD_STATS_KEY } from "@/hooks/useDashboardStats";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}

const MUTATION_VARS = {
  assignmentId: 5,
  unitId: 1,
  recipeStepId: 2,
  session: {
    unit_id: 1,
    session_date: "2026-05-19",
    duration_minutes: 30,
  },
} as const;

describe("useCompleteStep", () => {
  it("invalidates exactly 10 keys on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCompleteStep(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ ...MUTATION_VARS });
    });

    expect(spy).toHaveBeenCalledTimes(11);
  });

  it("invalidates STEP_PROGRESS_KEY(assignmentId)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCompleteStep(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ ...MUTATION_VARS });
    });

    const keys = spy.mock.calls.map((c) => c[0]!.queryKey);
    expect(keys).toContainEqual(STEP_PROGRESS_KEY(5));
  });

  it("invalidates UNIT_ASSIGNMENTS_KEY(unitId)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCompleteStep(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ ...MUTATION_VARS });
    });

    const keys = spy.mock.calls.map((c) => c[0]!.queryKey);
    expect(keys).toContainEqual(UNIT_ASSIGNMENTS_KEY(1));
  });

  it("invalidates NEXT_PAINTING_ACTION_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCompleteStep(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ ...MUTATION_VARS });
    });

    const keys = spy.mock.calls.map((c) => c[0]!.queryKey);
    expect(keys).toContainEqual(NEXT_PAINTING_ACTION_KEY);
  });

  it("invalidates DASHBOARD_STATS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCompleteStep(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ ...MUTATION_VARS });
    });

    const keys = spy.mock.calls.map((c) => c[0]!.queryKey);
    expect(keys).toContainEqual(DASHBOARD_STATS_KEY);
  });

  it("uses prefix invalidation for kanban-enrichment and workflow-positions", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCompleteStep(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ ...MUTATION_VARS });
    });

    const keys = spy.mock.calls.map((c) => c[0]!.queryKey);
    expect(keys).toContainEqual(["kanban-enrichment"]);
    expect(keys).toContainEqual(["workflow-positions"]);
  });
});
