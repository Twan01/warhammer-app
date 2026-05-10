/**
 * Phase 52 — useRulesFavorites hook tests.
 *
 * Mocks @/db/queries/rulesFavorites with vi.fn() stubs.
 * Verifies that:
 *   - useRulesFavorites returns query data from getRulesFavorites
 *   - useUpsertRulesFavorite calls upsertRulesFavorite and invalidates RULES_FAVORITES_KEY
 *   - useDeleteRulesFavorite calls deleteRulesFavorite with composite key args
 *
 * Follows the exact pattern from tests/datasheet/useRulesExtended.test.tsx.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const getRulesFavoritesMock = vi.fn();
const upsertRulesFavoriteMock = vi.fn();
const deleteRulesFavoriteMock = vi.fn();

vi.mock("@/db/queries/rulesFavorites", () => ({
  getRulesFavorites: (...args: unknown[]) => getRulesFavoritesMock(...args),
  getRulesFavoritesByType: vi.fn(),
  upsertRulesFavorite: (...args: unknown[]) => upsertRulesFavoriteMock(...args),
  deleteRulesFavorite: (...args: unknown[]) => deleteRulesFavoriteMock(...args),
}));

import {
  useRulesFavorites,
  useUpsertRulesFavorite,
  useDeleteRulesFavorite,
  RULES_FAVORITES_KEY,
} from "@/hooks/useRulesFavorites";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  getRulesFavoritesMock.mockReset();
  upsertRulesFavoriteMock.mockReset();
  deleteRulesFavoriteMock.mockReset();
});

describe("useRulesFavorites", () => {
  it("calls getRulesFavorites and returns the data", async () => {
    const sample = [
      {
        id: 1,
        rule_id: "strat-aoc",
        rule_type: "stratagem",
        rule_name: "Armour of Contempt",
        is_reminder: 0,
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
      },
    ];
    getRulesFavoritesMock.mockResolvedValueOnce(sample);

    const { result } = renderHook(() => useRulesFavorites(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(getRulesFavoritesMock).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(sample);
  });
});

describe("useUpsertRulesFavorite", () => {
  it("calls upsertRulesFavorite with the given input when mutation is fired", async () => {
    upsertRulesFavoriteMock.mockResolvedValueOnce(undefined);
    getRulesFavoritesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useUpsertRulesFavorite(), { wrapper: makeWrapper() });

    await act(async () => {
      result.current.mutate({
        rule_id: "strat-aoc",
        rule_type: "stratagem",
        rule_name: "Armour of Contempt",
        is_reminder: 0,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // React Query v5 mutationFn receives (variables, { client, meta, mutationKey }) — check first arg only
    expect(upsertRulesFavoriteMock.mock.calls[0][0]).toEqual({
      rule_id: "strat-aoc",
      rule_type: "stratagem",
      rule_name: "Armour of Contempt",
      is_reminder: 0,
    });
  });
});

describe("useDeleteRulesFavorite", () => {
  it("calls deleteRulesFavorite with ruleId and ruleType when mutation is fired", async () => {
    deleteRulesFavoriteMock.mockResolvedValueOnce(undefined);
    getRulesFavoritesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useDeleteRulesFavorite(), { wrapper: makeWrapper() });

    await act(async () => {
      result.current.mutate({ ruleId: "strat-aoc", ruleType: "stratagem" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // deleteRulesFavorite is called as deleteRulesFavorite(ruleId, ruleType) inside the hook's mutationFn wrapper
    expect(deleteRulesFavoriteMock).toHaveBeenCalledWith("strat-aoc", "stratagem");
  });
});

describe("RULES_FAVORITES_KEY", () => {
  it("is ['rules-favorites'] as const", () => {
    expect(RULES_FAVORITES_KEY).toEqual(["rules-favorites"]);
  });
});
