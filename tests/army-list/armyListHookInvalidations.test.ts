/**
 * Phase 89 — Cache invalidation tests for the 10 new Army Lists 3.0 mutation hooks.
 *
 * Each hook must invalidate the correct set of React Query cache keys on success.
 * Pattern follows tests/foundation/useUnits.test.ts (renderHook + spy on invalidateQueries).
 *
 * Mocks all query functions from @/db/queries/armyLists since tauri-plugin-sql
 * IPC cannot run in jsdom.
 */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/queries/armyLists", () => ({
  getArmyLists: vi.fn().mockResolvedValue([]),
  getArmyListById: vi.fn().mockResolvedValue(null),
  getArmyListWithUnits: vi.fn().mockResolvedValue([]),
  createArmyList: vi.fn().mockResolvedValue(1),
  updateArmyList: vi.fn().mockResolvedValue(undefined),
  deleteArmyList: vi.fn().mockResolvedValue(undefined),
  addUnitToList: vi.fn().mockResolvedValue(1),
  removeUnitFromList: vi.fn().mockResolvedValue(undefined),
  updateArmyListUnit: vi.fn().mockResolvedValue(undefined),
  getArmyListReadiness: vi.fn().mockResolvedValue([]),
  clearArmyListDetachment: vi.fn().mockResolvedValue(undefined),
  clearArmyListPointsLimit: vi.fn().mockResolvedValue(undefined),
  setWarlord: vi.fn().mockResolvedValue(undefined),
  clearWarlord: vi.fn().mockResolvedValue(undefined),
  addGhostUnitToList: vi.fn().mockResolvedValue(42),
  setLeaderAttachment: vi.fn().mockResolvedValue(undefined),
  clearLeaderAttachment: vi.fn().mockResolvedValue(undefined),
  setSelectedModelCount: vi.fn().mockResolvedValue(undefined),
  clearSelectedModelCount: vi.fn().mockResolvedValue(undefined),
  addEnhancement: vi.fn().mockResolvedValue(7),
  removeEnhancement: vi.fn().mockResolvedValue(undefined),
  getEnhancementsByList: vi.fn().mockResolvedValue([]),
}));

import {
  ARMY_LISTS_KEY,
  ARMY_LIST_KEY,
  ARMY_LIST_UNITS_KEY,
  useSetWarlord,
  useClearWarlord,
  useAddGhostUnitToList,
  useSetLeaderAttachment,
  useClearLeaderAttachment,
  useSetSelectedModelCount,
  useClearSelectedModelCount,
  useAddEnhancement,
  useRemoveEnhancement,
  useEnhancementsByList,
} from "@/hooks/useArmyLists";

const DASHBOARD_STATS_KEY = ["dashboard-stats"] as const;
const ARMY_LIST_READINESS_PREFIX = ["army-list-readiness"] as const;

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}

/** Extract all invalidated query keys from the spy */
function invalidatedKeys(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.map((c: [{ queryKey: unknown }]) => c[0].queryKey);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── useSetWarlord ──────────────────────────────────────────────────────────

describe("useSetWarlord — cache invalidation (Phase 89 D-10)", () => {
  const VARS = { army_list_unit_id: 5, list_id: 2 };

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(2));
  });

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(2));
  });

  it("invalidates ARMY_LISTS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LISTS_KEY);
  });

  it("invalidates ['dashboard-stats']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...DASHBOARD_STATS_KEY]);
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });
});

// ─── useClearWarlord ────────────────────────────────────────────────────────

describe("useClearWarlord — cache invalidation (Phase 89)", () => {
  const LIST_ID = 3;

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(LIST_ID); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(3));
  });

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(LIST_ID); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(3));
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(LIST_ID); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });

  it("does NOT invalidate ['dashboard-stats'] (not needed for warlord clear)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(LIST_ID); });
    expect(invalidatedKeys(spy)).not.toContainEqual([...DASHBOARD_STATS_KEY]);
  });

  it("does NOT invalidate ARMY_LISTS_KEY (not needed for warlord clear)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearWarlord(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(LIST_ID); });
    expect(invalidatedKeys(spy)).not.toContainEqual(ARMY_LISTS_KEY);
  });
});

// ─── useAddGhostUnitToList ──────────────────────────────────────────────────

describe("useAddGhostUnitToList — cache invalidation (Phase 89 D-04)", () => {
  const VARS = { list_id: 4, ghost_unit_name: "Intercessors" };

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddGhostUnitToList(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(4));
  });

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddGhostUnitToList(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(4));
  });

  it("invalidates ARMY_LISTS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddGhostUnitToList(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LISTS_KEY);
  });

  it("invalidates ['dashboard-stats']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddGhostUnitToList(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...DASHBOARD_STATS_KEY]);
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddGhostUnitToList(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });
});

// ─── useSetLeaderAttachment ─────────────────────────────────────────────────

describe("useSetLeaderAttachment — cache invalidation (Phase 89 D-03)", () => {
  const VARS = { army_list_unit_id: 10, target_id: 20, list_id: 5 };

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetLeaderAttachment(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(5));
  });

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetLeaderAttachment(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(5));
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetLeaderAttachment(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });

  it("does NOT invalidate ['dashboard-stats'] (leader attachment does not affect points totals)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetLeaderAttachment(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).not.toContainEqual([...DASHBOARD_STATS_KEY]);
  });
});

// ─── useClearLeaderAttachment ───────────────────────────────────────────────

describe("useClearLeaderAttachment — cache invalidation (Phase 89 D-13)", () => {
  const VARS = { army_list_unit_id: 10, list_id: 5 };

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearLeaderAttachment(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(5));
  });

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearLeaderAttachment(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(5));
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearLeaderAttachment(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });

  it("does NOT invalidate ['dashboard-stats']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearLeaderAttachment(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).not.toContainEqual([...DASHBOARD_STATS_KEY]);
  });
});

// ─── useSetSelectedModelCount ───────────────────────────────────────────────

describe("useSetSelectedModelCount — cache invalidation (Phase 89 D-08)", () => {
  const VARS = { army_list_unit_id: 15, count: 10, list_id: 6 };

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(6));
  });

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(6));
  });

  it("invalidates ARMY_LISTS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LISTS_KEY);
  });

  it("invalidates ['dashboard-stats']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...DASHBOARD_STATS_KEY]);
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });
});

// ─── useClearSelectedModelCount ─────────────────────────────────────────────

describe("useClearSelectedModelCount — cache invalidation (Phase 89 D-13)", () => {
  const VARS = { army_list_unit_id: 15, list_id: 6 };

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(6));
  });

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(6));
  });

  it("invalidates ARMY_LISTS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LISTS_KEY);
  });

  it("invalidates ['dashboard-stats']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...DASHBOARD_STATS_KEY]);
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearSelectedModelCount(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });
});

// ─── useAddEnhancement ──────────────────────────────────────────────────────

describe("useAddEnhancement — cache invalidation (Phase 89 D-01)", () => {
  const VARS = { list_id: 7, army_list_unit_id: 20, enhancement_name: "Iron Will", enhancement_points: 30 };

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(7));
  });

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(7));
  });

  it("invalidates ARMY_LISTS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LISTS_KEY);
  });

  it("invalidates ['dashboard-stats']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...DASHBOARD_STATS_KEY]);
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useAddEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });
});

// ─── useRemoveEnhancement ───────────────────────────────────────────────────

describe("useRemoveEnhancement — cache invalidation (Phase 89)", () => {
  const VARS = { enhancement_id: 99, list_id: 7 };

  it("invalidates ARMY_LIST_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(7));
  });

  it("invalidates ARMY_LIST_UNITS_KEY(list_id)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_UNITS_KEY(7));
  });

  it("invalidates ARMY_LISTS_KEY", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LISTS_KEY);
  });

  it("invalidates ['dashboard-stats']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...DASHBOARD_STATS_KEY]);
  });

  it("invalidates ['army-list-readiness']", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveEnhancement(), { wrapper });
    await waitFor(async () => { await result.current.mutateAsync(VARS); });
    expect(invalidatedKeys(spy)).toContainEqual([...ARMY_LIST_READINESS_PREFIX]);
  });
});

// ─── useEnhancementsByList (query hook) ─────────────────────────────────────

describe("useEnhancementsByList — query key (Phase 89)", () => {
  it("uses ['army-list-enhancements', listId] as query key", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useEnhancementsByList(12), { wrapper });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));

    // Verify the cache has an entry with the expected key
    const cacheEntry = qc.getQueryCache().find({ queryKey: ["army-list-enhancements", 12] });
    expect(cacheEntry).toBeDefined();
  });

  it("is disabled when listId is undefined", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useEnhancementsByList(undefined), { wrapper });

    // Query should not be fetching when disabled
    expect(result.current.fetchStatus).toBe("idle");
  });
});
