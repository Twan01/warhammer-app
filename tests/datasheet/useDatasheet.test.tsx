/**
 * Phase 107 -- useDatasheet hooks tests.
 *
 * Verifies the rewritten hooks query udb_* tables via getDb() and
 * unitDatabase.ts query functions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve({ select: mockSelect })),
}));

const mockGetUdbUnitDetail = vi.fn();
const mockGetUdbUnitsByFaction = vi.fn();
const mockGetUdbFactions = vi.fn();

vi.mock("@/db/queries/unitDatabase", () => ({
  getUdbUnitDetail: (...args: unknown[]) => mockGetUdbUnitDetail(...args),
  getUdbUnitsByFaction: (...args: unknown[]) => mockGetUdbUnitsByFaction(...args),
  getUdbFactions: (...args: unknown[]) => mockGetUdbFactions(...args),
}));


import {
  useDatasheet,
  useDatasheetsByFaction,
  useDatasheetsByFactionWithPoints,
  useWahapediaFactions,
  useWahapediaFactionId,
  DATASHEET_KEY,
  DATASHEETS_BY_FACTION_KEY,
  WAHAPEDIA_FACTIONS_KEY,
} from "@/hooks/useDatasheet";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  mockSelect.mockReset();
  mockGetUdbUnitDetail.mockReset();
  mockGetUdbUnitsByFaction.mockReset();
  mockGetUdbFactions.mockReset();
});

describe("useDatasheet", () => {
  it("returns unit detail when unit has udb_unit_id", async () => {
    mockSelect.mockResolvedValueOnce([{ udb_unit_id: "SM-001" }]);
    const mockDetail = { id: "SM-001", name: "Intercessors", faction_id: "SM" };
    mockGetUdbUnitDetail.mockResolvedValueOnce(mockDetail);

    const { result } = renderHook(() => useDatasheet(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDetail);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("udb_unit_id"),
      [42],
    );
    expect(mockGetUdbUnitDetail).toHaveBeenCalledWith("SM-001", "en");
  });

  it("returns null when unit has no udb_unit_id link", async () => {
    mockSelect.mockResolvedValueOnce([{ udb_unit_id: null }]);

    const { result } = renderHook(() => useDatasheet(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mockGetUdbUnitDetail).not.toHaveBeenCalled();
  });

  it("is disabled when unitId is undefined", async () => {
    const { result } = renderHook(() => useDatasheet(undefined), {
      wrapper: createWrapper(),
    });

    // Should not fetch
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useDatasheetsByFaction", () => {
  it("returns unit summaries for a faction", async () => {
    const mockUnits = [
      { id: "SM-001", name: "Intercessors", faction_id: "SM", role: "Battleline" },
    ];
    mockGetUdbUnitsByFaction.mockResolvedValueOnce(mockUnits);

    const { result } = renderHook(() => useDatasheetsByFaction("SM"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUnits);
    expect(mockGetUdbUnitsByFaction).toHaveBeenCalledWith("SM", "en");
  });

  it("is disabled when factionId is undefined", () => {
    const { result } = renderHook(() => useDatasheetsByFaction(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useDatasheetsByFactionWithPoints", () => {
  it("calls getUdbUnitsByFaction (same data source as base hook)", async () => {
    const mockUnits = [
      { id: "SM-002", name: "Hellblasters", faction_id: "SM", base_points: 125 },
    ];
    mockGetUdbUnitsByFaction.mockResolvedValueOnce(mockUnits);

    const { result } = renderHook(() => useDatasheetsByFactionWithPoints("SM"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUnits);
  });
});

describe("useWahapediaFactions", () => {
  it("returns all factions from udb_factions", async () => {
    const mockFactions = [
      { id: "SM", name: "Space Marines", short_name: "SM" },
      { id: "NEC", name: "Necrons", short_name: "NEC" },
    ];
    mockGetUdbFactions.mockResolvedValueOnce(mockFactions);

    const { result } = renderHook(() => useWahapediaFactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFactions);
  });
});

describe("useWahapediaFactionId", () => {
  it("resolves faction name to id via case-insensitive match", async () => {
    const mockFactions = [
      { id: "SM", name: "Space Marines", short_name: "SM" },
      { id: "NEC", name: "Necrons", short_name: "NEC" },
    ];
    mockGetUdbFactions.mockResolvedValueOnce(mockFactions);

    const { result } = renderHook(() => useWahapediaFactionId("space marines"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("SM");
  });

  it("returns null when faction name does not match", async () => {
    const mockFactions = [
      { id: "SM", name: "Space Marines", short_name: "SM" },
    ];
    mockGetUdbFactions.mockResolvedValueOnce(mockFactions);

    const { result } = renderHook(() => useWahapediaFactionId("Unknown Faction"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("is disabled when name is undefined", () => {
    const { result } = renderHook(() => useWahapediaFactionId(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("cache key exports", () => {
  it("DATASHEET_KEY returns tuple with unitId", () => {
    expect(DATASHEET_KEY(5)).toEqual(["datasheet", 5]);
  });
  it("DATASHEETS_BY_FACTION_KEY returns tuple with factionId", () => {
    expect(DATASHEETS_BY_FACTION_KEY("SM")).toEqual(["datasheets-by-faction", "SM"]);
  });
  it("WAHAPEDIA_FACTIONS_KEY is correct", () => {
    expect(WAHAPEDIA_FACTIONS_KEY).toEqual(["wahapedia-factions"]);
  });
});
