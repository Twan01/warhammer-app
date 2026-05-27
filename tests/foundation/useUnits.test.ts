/**
 * DATA-09 â€” useUnits mutations must invalidate ["dashboard-stats"]
 * in addition to their own query keys.
 *
 * Pattern mirrors tests/foundation/usePaints.test.ts. Mocks query
 * functions so mutations resolve without tauri-plugin-sql IPC.
 */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/queries/units", () => ({
  getUnits: vi.fn().mockResolvedValue([]),
  getUnitById: vi.fn().mockResolvedValue(null),
  createUnit: vi.fn().mockResolvedValue(1),
  updateUnit: vi.fn().mockResolvedValue(undefined),
  deleteUnit: vi.fn().mockResolvedValue(undefined),
}));

import {
  UNITS_KEY,
  UNIT_KEY,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from "@/hooks/useUnits";

const DASHBOARD_STATS_KEY = ["dashboard-stats"] as const;
const ARMY_READINESS_KEY = ["army-readiness"] as const;

const MIN_CREATE_INPUT = {
  faction_id: 1,
  name: "Test Unit",
  category: null,
  unit_type: null,
  model_count: null,
  owned_count: null,
  points: null,
  status_assembly: 0 as const,
  status_painting: "Not Started" as const,
  painting_percentage: 0,
  status_basing: 0 as const,
  status_varnished: 0 as const,
  is_active_project: 0 as const,
  priority: null,
  target_completion_date: null,
  purchase_date: null,
  purchase_price_pence: null,
  storage_location: null,
  main_image_path: null,
  notes: null,
  lore_notes: null,
  undercoat: null,
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

describe("useUnits â€” UNITS_KEY constant", () => {
  it("UNITS_KEY equals ['units'] literal", () => {
    expect(UNITS_KEY).toEqual(["units"]);
  });

  it("UNIT_KEY(id) equals ['units', id]", () => {
    expect(UNIT_KEY(7)).toEqual(["units", 7]);
  });
});

describe("useUnits â€” useCreateUnit onSuccess invalidations (DATA-09)", () => {
  it("invalidates UNITS_KEY (['units'])", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateUnit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MIN_CREATE_INPUT);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(UNITS_KEY);
  });

  it("invalidates ['dashboard-stats'] (DATA-09)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateUnit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(MIN_CREATE_INPUT);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(DASHBOARD_STATS_KEY);
  });

  it("invalidates ['army-readiness'] (Phase 32)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateUnit(), { wrapper });
    await act(async () => { await result.current.mutateAsync(MIN_CREATE_INPUT); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(ARMY_READINESS_KEY);
  });
});

describe("useUnits â€” useUpdateUnit onSuccess invalidations (DATA-09)", () => {
  it("invalidates UNITS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateUnit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 3, name: "Renamed" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(UNITS_KEY);
  });

  it("invalidates UNIT_KEY(id) for the updated unit", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateUnit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 3, name: "Renamed" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(UNIT_KEY(3));
  });

  it("invalidates ['dashboard-stats'] (DATA-09)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateUnit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 3, name: "Renamed" });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(DASHBOARD_STATS_KEY);
  });

  it("invalidates ['army-readiness'] (Phase 32)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateUnit(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ id: 3, name: "Renamed" }); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(ARMY_READINESS_KEY);
  });
});

describe("useUnits â€” useDeleteUnit onSuccess invalidations (DATA-09)", () => {
  it("invalidates UNITS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteUnit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(3);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(UNITS_KEY);
  });

  it("invalidates ['dashboard-stats'] (DATA-09)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteUnit(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(3);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(DASHBOARD_STATS_KEY);
  });

  it("invalidates ['army-readiness'] (Phase 32)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteUnit(), { wrapper });
    await act(async () => { await result.current.mutateAsync(3); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(ARMY_READINESS_KEY);
  });
});
