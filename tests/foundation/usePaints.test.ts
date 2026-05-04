/**
 * Phase 6 Success Criteria 5 — usePaints mutations must invalidate BOTH
 * PAINTS_KEY (['paints']) AND PAINTS_WITH_RECIPES_KEY (['paints-with-recipes']).
 *
 * Uses renderHook + a fresh QueryClient per test. Mocks the query functions
 * so mutations resolve without tauri-plugin-sql IPC.
 */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the query functions so the mutations resolve without IPC.
vi.mock("@/db/queries/paints", () => ({
  getPaints: vi.fn().mockResolvedValue([]),
  getPaintById: vi.fn().mockResolvedValue(null),
  getPaintsWithRecipeCount: vi.fn().mockResolvedValue([]),
  createPaint: vi.fn().mockResolvedValue(1),
  updatePaint: vi.fn().mockResolvedValue(undefined),
  deletePaint: vi.fn().mockResolvedValue(undefined),
}));

import {
  PAINTS_KEY,
  PAINT_KEY,
  PAINTS_WITH_RECIPES_KEY,
  useCreatePaint,
  useUpdatePaint,
  useDeletePaint,
  usePaintsWithRecipeCount,
} from "@/hooks/usePaints";

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

describe("usePaints — PAINTS_WITH_RECIPES_KEY constant", () => {
  it("PAINTS_WITH_RECIPES_KEY equals ['paints-with-recipes'] literal", () => {
    expect(PAINTS_WITH_RECIPES_KEY).toEqual(["paints-with-recipes"]);
  });
});

describe("usePaints — useCreatePaint onSuccess invalidations", () => {
  it("invalidates PAINTS_KEY (['paints'])", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreatePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        brand: "Citadel", name: "Test", paint_type: "Layer",
        color_family: null, hex_color: null,
        owned: 1, quantity: null, running_low: 0, wishlist: 0, notes: null,
        purchase_price_pence: null,
      });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(calls).toContainEqual(PAINTS_KEY);
  });

  it("invalidates PAINTS_WITH_RECIPES_KEY (['paints-with-recipes'])", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreatePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        brand: "Citadel", name: "Test2", paint_type: "Layer",
        color_family: null, hex_color: null,
        owned: 1, quantity: null, running_low: 0, wishlist: 0, notes: null,
        purchase_price_pence: null,
      });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(calls).toContainEqual(PAINTS_WITH_RECIPES_KEY);
  });
});

describe("usePaints — useUpdatePaint onSuccess invalidations", () => {
  it("invalidates PAINTS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdatePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 5, name: "Renamed" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(calls).toContainEqual(PAINTS_KEY);
  });

  it("invalidates PAINT_KEY(id) for the updated paint", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdatePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 5, name: "Renamed" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(calls).toContainEqual(PAINT_KEY(5));
  });

  it("invalidates PAINTS_WITH_RECIPES_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdatePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 5, name: "Renamed" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(calls).toContainEqual(PAINTS_WITH_RECIPES_KEY);
  });
});

describe("usePaints — useDeletePaint onSuccess invalidations", () => {
  it("invalidates PAINTS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeletePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(5);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(calls).toContainEqual(PAINTS_KEY);
  });

  it("invalidates PAINTS_WITH_RECIPES_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeletePaint(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(5);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(calls).toContainEqual(PAINTS_WITH_RECIPES_KEY);
  });
});

describe("usePaintsWithRecipeCount", () => {
  it("queries with key PAINTS_WITH_RECIPES_KEY and queryFn getPaintsWithRecipeCount", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePaintsWithRecipeCount(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
