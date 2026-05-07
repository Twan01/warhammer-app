/**
 * DATA-06 — useRecipes mutations must invalidate ["recipes", "by-unit"]
 * so CurrentFocusCard recipe name refreshes immediately after any recipe
 * create / update / delete.
 *
 * Pattern mirrors tests/foundation/useUnits.test.ts. Mocks query
 * functions so mutations resolve without tauri-plugin-sql IPC.
 */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/queries/recipes", () => ({
  getRecipes: vi.fn().mockResolvedValue([]),
  getRecipeById: vi.fn().mockResolvedValue(null),
  createRecipe: vi.fn().mockResolvedValue(1),
  updateRecipe: vi.fn().mockResolvedValue(undefined),
  deleteRecipe: vi.fn().mockResolvedValue(undefined),
}));

import {
  RECIPES_KEY,
  RECIPE_KEY,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
} from "@/hooks/useRecipes";

const BY_UNIT_KEY = ["recipes", "by-unit"] as const;

const MIN_CREATE_INPUT = {
  name: "Test Recipe",
  faction_id: null,
  unit_id: null,
  area: null,
  primer: null,
  basecoat: null,
  shade: null,
  layer: null,
  highlight: null,
  glaze_filter: null,
  weathering: null,
  technical: null,
  basing: null,
  notes: null,
  tutorial_link: null,
  // v2.5 metadata fields (Phase 37)
  style: null,
  surface: null,
  effect: null,
  difficulty: null,
  estimated_minutes: null,
  result_photo_path: null,
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

describe("useRecipes — RECIPES_KEY constants", () => {
  it("RECIPES_KEY equals ['recipes'] literal", () => {
    expect(RECIPES_KEY).toEqual(["recipes"]);
  });

  it("RECIPE_KEY(id) equals ['recipes', id]", () => {
    expect(RECIPE_KEY(42)).toEqual(["recipes", 42]);
  });
});

describe("useRecipes — useCreateRecipe onSuccess invalidations (DATA-06)", () => {
  it("invalidates RECIPES_KEY (['recipes'])", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MIN_CREATE_INPUT);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPES_KEY);
  });

  it("invalidates ['recipes', 'by-unit'] (DATA-06)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MIN_CREATE_INPUT);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(BY_UNIT_KEY);
  });

  it("invalidates ['kanban-enrichment']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MIN_CREATE_INPUT);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(["kanban-enrichment"]);
  });
});

describe("useRecipes — useUpdateRecipe onSuccess invalidations (DATA-06)", () => {
  it("invalidates RECIPES_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, name: "Renamed Recipe" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPES_KEY);
  });

  it("invalidates RECIPE_KEY(id) for the updated recipe", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, name: "Renamed Recipe" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_KEY(7));
  });

  it("invalidates ['recipes', 'by-unit'] (DATA-06)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, name: "Renamed Recipe" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(BY_UNIT_KEY);
  });

  it("invalidates ['kanban-enrichment']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 7, name: "Renamed Recipe" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(["kanban-enrichment"]);
  });
});

describe("useRecipes — useDeleteRecipe onSuccess invalidations (DATA-06)", () => {
  it("invalidates RECIPES_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(7);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPES_KEY);
  });

  it("invalidates ['recipes', 'by-unit'] (DATA-06)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteRecipe(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(7);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(BY_UNIT_KEY);
  });
});
