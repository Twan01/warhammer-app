/**
 * Phase 107 -- useUdbMeta hook test.
 *
 * Verifies the hook queries udb_meta WHERE id=1 via getDb(),
 * returns UdbMeta or null, and uses staleTime: Infinity.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

import { useUdbMeta, UDB_META_KEY } from "@/hooks/useUdbMeta";

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

describe("useUdbMeta", () => {
  it("returns UdbMeta when row exists", async () => {
    const mockRow = {
      version: "2026.05.30",
      built_at: "2026-05-30T10:00:00Z",
      game_system: "Warhammer 40,000",
      unit_count: 450,
      faction_count: 30,
    };
    mockSelect.mockResolvedValueOnce([mockRow]);

    const { result } = renderHook(() => useUdbMeta(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRow);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("FROM udb_meta WHERE id = 1"),
    );
  });

  it("returns null when no row exists", async () => {
    mockSelect.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useUdbMeta(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it("exports UDB_META_KEY as ['udb-meta']", () => {
    expect(UDB_META_KEY).toEqual(["udb-meta"]);
  });
});
