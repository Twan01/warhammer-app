/**
 * SCHEMA-04 — useAllStepCounts hook + STEP_COUNTS_KEY invalidation tests.
 *
 * Verifies:
 *  1. useAllStepCounts returns a Map<number, number> (recipe_id → step_count)
 *     built from the batch query results.
 *  2. useAddRecipePaint.onSuccess invalidates STEP_COUNTS_KEY (["recipe-step-counts"]).
 *  3. useRemoveRecipePaint.onSuccess invalidates STEP_COUNTS_KEY.
 *
 * Pattern mirrors tests/foundation/useRecipes.test.ts — renderHook with a fresh
 * QueryClient per test, spying on invalidateQueries. All query/mutation fns mocked.
 */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/queries/recipePaints", () => ({
  getRecipePaintsByRecipe: vi.fn().mockResolvedValue([]),
  addRecipePaint: vi.fn().mockResolvedValue(10),
  removeRecipePaint: vi.fn().mockResolvedValue(undefined),
  getRecipeIdsByPaintId: vi.fn().mockResolvedValue([]),
  getRecipeSwatchColors: vi.fn().mockResolvedValue([]),
  getStepCountsByRecipe: vi.fn().mockResolvedValue([
    { recipe_id: 1, step_count: 3 },
    { recipe_id: 2, step_count: 5 },
  ]),
}));

import {
  STEP_COUNTS_KEY,
  useAllStepCounts,
  useAddRecipePaint,
  useRemoveRecipePaint,
} from "@/hooks/useRecipePaints";

import type { CreateRecipeStepInput } from "@/types/recipePaint";

const MIN_ADD_INPUT: CreateRecipeStepInput = {
  recipe_id: 1,
  paint_id: 2,
  step_name: "Basecoat",
  order_index: 0,
  notes: null,
  painting_phase: null,
  tool: null,
  technique: null,
  dilution: null,
  time_estimate_minutes: null,
  step_photo_path: null,
  alt_paint_id: null,
  section_id: null,
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAllStepCounts — SCHEMA-04", () => {
  it("STEP_COUNTS_KEY equals ['recipe-step-counts']", () => {
    expect(STEP_COUNTS_KEY).toEqual(["recipe-step-counts"]);
  });

  it("returns a Map<number, number> mapping recipe_id to step_count from batch query results", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllStepCounts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data;
    expect(map).toBeInstanceOf(Map);
    expect(map?.get(1)).toBe(3);
    expect(map?.get(2)).toBe(5);
  });

  it("returns an empty Map when batch query returns no rows", async () => {
    const { getStepCountsByRecipe } = await import("@/db/queries/recipePaints");
    vi.mocked(getStepCountsByRecipe).mockResolvedValueOnce([]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAllStepCounts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data;
    expect(map).toBeInstanceOf(Map);
    expect(map?.size).toBe(0);
  });
});

describe("useAddRecipePaint — STEP_COUNTS_KEY invalidation (SCHEMA-04)", () => {
  it("invalidates STEP_COUNTS_KEY (['recipe-step-counts']) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddRecipePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MIN_ADD_INPUT);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(STEP_COUNTS_KEY);
  });
});

describe("useRemoveRecipePaint — STEP_COUNTS_KEY invalidation (SCHEMA-04)", () => {
  it("invalidates STEP_COUNTS_KEY (['recipe-step-counts']) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveRecipePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 5, recipeId: 1 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(STEP_COUNTS_KEY);
  });
});
