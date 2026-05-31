/**
 * Phase 107 -- useUnitKeywords hook test.
 *
 * Verifies the hook queries udb_unit_keywords joined to udb_units,
 * returns { isCharacter, isEpicHero } based on keyword rows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

import { useUnitKeywords, UNIT_KEYWORDS_KEY } from "@/hooks/useUnitKeywords";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  mockSelect.mockReset();
});

describe("useUnitKeywords", () => {
  it("returns isCharacter=true when 'character' keyword found", async () => {
    mockSelect.mockResolvedValueOnce([{ keyword: "Character" }]);

    const { result } = renderHook(() => useUnitKeywords("Captain"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ isCharacter: true, isEpicHero: false });
  });

  it("returns isEpicHero=true when 'epic hero' keyword found", async () => {
    mockSelect.mockResolvedValueOnce([
      { keyword: "Character" },
      { keyword: "Epic Hero" },
    ]);

    const { result } = renderHook(() => useUnitKeywords("Marneus Calgar"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ isCharacter: true, isEpicHero: true });
  });

  it("returns both false when no relevant keywords", async () => {
    mockSelect.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useUnitKeywords("Intercessors"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ isCharacter: false, isEpicHero: false });
  });

  it("returns safe default when unitName is undefined (disabled)", () => {
    const { result } = renderHook(() => useUnitKeywords(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("queries with case-insensitive unit name matching", async () => {
    mockSelect.mockResolvedValueOnce([{ keyword: "Character" }]);

    renderHook(() => useUnitKeywords("cApTaIn"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockSelect).toHaveBeenCalled());
    const query = mockSelect.mock.calls[0][0] as string;
    expect(query).toContain("LOWER(u.name) = LOWER($1)");
    expect(mockSelect.mock.calls[0][1]).toEqual(["cApTaIn"]);
  });

  it("UNIT_KEYWORDS_KEY produces correct cache key", () => {
    expect(UNIT_KEYWORDS_KEY("Captain")).toEqual(["unit-keywords", "Captain"]);
  });
});
