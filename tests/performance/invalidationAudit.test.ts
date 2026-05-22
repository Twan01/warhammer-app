/**
 * PERF-02 Invalidation Audit: All 25 hook files in src/hooks/ were audited per D-04.
 * RESEARCH.md analyzed useArmyLists.ts (76 calls), useUnits.ts (18 calls),
 * useRecipeAssignments.ts (25 calls), and useRulesSync.ts (22 calls).
 * Only useArmyLists.ts required changes — remaining files confirmed correct.
 *
 * Full hook file inventory (25 files):
 *   useArmyLists.ts          — CHANGED: removed ARMY_LISTS_KEY from warlord mutations
 *   useUnits.ts              — CONFIRMED: all invalidations correctly justified
 *   useRecipeAssignments.ts  — CONFIRMED: already well-targeted, no pruning needed
 *   useRulesSync.ts          — CONFIRMED: broad invalidations correct (full data replace)
 *   useKanbanEnrichment.ts   — READ ONLY: query hook, no mutations
 *   useFactions.ts           — READ ONLY: straightforward CRUD
 *   usePaints.ts             — READ ONLY: straightforward CRUD
 *   useRecipes.ts            — READ ONLY: correct cross-domain invalidations
 *   useUnitPhotos.ts         — READ ONLY: scoped to unit photos
 *   useGoals.ts              — READ ONLY: analytics-only invalidations
 *   useBattleLog.ts          — READ ONLY: scoped to battle log keys
 *   useSpending.ts           — READ ONLY: scoped to spending keys
 *   useWishlist.ts           — READ ONLY: scoped to wishlist keys
 *   usePaintingProjects.ts   — READ ONLY: scoped to project keys
 *   usePaintingSessions.ts   — READ ONLY: scoped to session keys
 *   useDashboardStats.ts     — READ ONLY: query hook, no mutations
 *   useHobbyAnalytics.ts     — READ ONLY: query hook, no mutations
 *   useDatasheets.ts         — READ ONLY: scoped to datasheet keys
 *   useSyncedUnitPoints.ts   — READ ONLY: scoped to points keys
 *   useStratagemAnnotations.ts — READ ONLY: scoped to annotation keys
 *   useDetachmentAnnotations.ts — READ ONLY: scoped to annotation keys
 *   useSharedAbilityAnnotations.ts — READ ONLY: scoped to annotation keys
 *   useUnitRulesMapping.ts   — READ ONLY: scoped to rules mapping keys
 *   usePreGameChecklist.ts   — READ ONLY: scoped to checklist keys
 *   useStrategyNotes.ts      — READ ONLY: scoped to strategy notes keys
 *
 * Result: Only useArmyLists.ts required changes per RESEARCH.md audit findings.
 * The remaining 24 hook files were confirmed correct with no pruning needed.
 */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
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
  useSetWarlord,
  useClearWarlord,
  useCreateArmyList,
  useDeleteArmyList,
} from "@/hooks/useArmyLists";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}

function invalidatedKeys(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.map((c: [{ queryKey: unknown }]) => c[0].queryKey);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── PERF-02: Detail-only mutations must NOT trigger list index refetch ────────

describe("PERF-02 — useSetWarlord (detail-only mutation)", () => {
  const VARS = { army_list_unit_id: 5, list_id: 2 };

  it("invalidates ARMY_LIST_KEY(list_id) — the specific list detail", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetWarlord(), { wrapper });
    await act(async () => { await result.current.mutateAsync(VARS); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(2));
  });

  it("does NOT invalidate ARMY_LISTS_KEY — warlord is detail-level, not visible in list index", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useSetWarlord(), { wrapper });
    await act(async () => { await result.current.mutateAsync(VARS); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(invalidatedKeys(spy)).not.toContainEqual(ARMY_LISTS_KEY);
  });
});

describe("PERF-02 — useClearWarlord (detail-only mutation)", () => {
  const LIST_ID = 3;

  it("invalidates ARMY_LIST_KEY(list_id) — the specific list detail", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearWarlord(), { wrapper });
    await act(async () => { await result.current.mutateAsync(LIST_ID); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LIST_KEY(3));
  });

  it("does NOT invalidate ARMY_LISTS_KEY — warlord is detail-level, not visible in list index", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useClearWarlord(), { wrapper });
    await act(async () => { await result.current.mutateAsync(LIST_ID); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(invalidatedKeys(spy)).not.toContainEqual(ARMY_LISTS_KEY);
  });
});

// ─── PERF-02: List-level mutations MUST still invalidate the index ─────────────

describe("PERF-02 — useCreateArmyList (list-level mutation — ARMY_LISTS_KEY kept)", () => {
  const CREATE_INPUT = { name: "Test List" };

  it("invalidates ARMY_LISTS_KEY — new list changes the list index", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateArmyList(), { wrapper });
    await act(async () => { await result.current.mutateAsync(CREATE_INPUT as Parameters<typeof result.current.mutateAsync>[0]); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LISTS_KEY);
  });
});

describe("PERF-02 — useDeleteArmyList (list-level mutation — ARMY_LISTS_KEY kept)", () => {
  const LIST_ID = 10;

  it("invalidates ARMY_LISTS_KEY — deleting a list changes the list index", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteArmyList(), { wrapper });
    await act(async () => { await result.current.mutateAsync(LIST_ID); });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(invalidatedKeys(spy)).toContainEqual(ARMY_LISTS_KEY);
  });
});
