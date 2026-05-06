/**
 * Phase 32 — Army Readiness data layer tests.
 *
 * Tests the SQL contract for getArmyReadinessByFaction and the
 * useArmyReadinessTarget hook behaviour (localStorage default/read/fallback/persist).
 */
import React from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock @/db/client so the query function resolves without tauri IPC.
const dbSelectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: dbSelectMock }),
}));

import { getArmyReadinessByFaction } from "@/db/queries/dashboard";
import {
  ARMY_READINESS_KEY,
  ARMY_READINESS_TARGETS,
  useArmyReadinessTarget,
} from "@/hooks/useArmyReadiness";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, wrapper };
}

beforeEach(() => {
  dbSelectMock.mockReset();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---- SQL contract tests ----

describe("getArmyReadinessByFaction (Phase 32)", () => {
  it("Test 1: returns FactionReadiness objects with required fields", async () => {
    const mockRows = [
      {
        faction_id: 1,
        faction_name: "Space Marines",
        color_theme: "#1F3D73",
        points_owned: 1500,
        points_painted: 800,
      },
    ];
    dbSelectMock.mockResolvedValueOnce(mockRows);

    const result = await getArmyReadinessByFaction();

    expect(dbSelectMock).toHaveBeenCalledOnce();
    expect(result).toEqual(mockRows);
    const row = result[0];
    expect(row).toHaveProperty("faction_id");
    expect(row).toHaveProperty("faction_name");
    expect(row).toHaveProperty("color_theme");
    expect(row).toHaveProperty("points_owned");
    expect(row).toHaveProperty("points_painted");
  });

  it("Test 2: SQL uses 'Completed' (not 'Complete') in CASE WHEN", async () => {
    dbSelectMock.mockResolvedValueOnce([]);
    await getArmyReadinessByFaction();

    const [sql] = dbSelectMock.mock.calls[0] as [string];
    expect(sql).toMatch(/'Completed'/);
    // Must NOT match 'Complete' without the trailing 'd'
    expect(sql).not.toMatch(/'Complete'[^d]/);
  });

  it("Test 3: SQL uses INNER JOIN (no LEFT JOIN) to exclude factions with 0 units", async () => {
    dbSelectMock.mockResolvedValueOnce([]);
    await getArmyReadinessByFaction();

    const [sql] = dbSelectMock.mock.calls[0] as [string];
    expect(sql).toMatch(/JOIN units u ON/);
    // Should not have a LEFT prefix before JOIN units
    expect(sql).not.toMatch(/LEFT\s+JOIN units u ON/i);
  });

  it("Test 4: SQL uses COALESCE(u.points, 0) to handle null points", async () => {
    dbSelectMock.mockResolvedValueOnce([]);
    await getArmyReadinessByFaction();

    const [sql] = dbSelectMock.mock.calls[0] as [string];
    expect(sql).toMatch(/COALESCE\(u\.points, 0\)/);
  });
});

// ---- Constants tests ----

describe("ARMY_READINESS_KEY constant (Phase 32)", () => {
  it("Test 5: ARMY_READINESS_KEY equals ['army-readiness']", () => {
    expect(ARMY_READINESS_KEY).toEqual(["army-readiness"]);
  });
});

describe("ARMY_READINESS_TARGETS constant (Phase 32)", () => {
  it("Test 6: ARMY_READINESS_TARGETS equals [500, 1000, 1500, 2000]", () => {
    expect(ARMY_READINESS_TARGETS).toEqual([500, 1000, 1500, 2000]);
  });
});

// ---- useArmyReadinessTarget hook tests ----

describe("useArmyReadinessTarget hook (Phase 32)", () => {
  it("Test 7: defaults to 2000 when no localStorage value exists", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useArmyReadinessTarget(), { wrapper });
    expect(result.current[0]).toBe(2000);
  });

  it("Test 8: reads valid stored value from localStorage", () => {
    localStorage.setItem("army-readiness:target", "1000");
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useArmyReadinessTarget(), { wrapper });
    expect(result.current[0]).toBe(1000);
  });

  it("Test 9: falls back to 2000 for invalid/corrupt localStorage value", () => {
    localStorage.setItem("army-readiness:target", "750");
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useArmyReadinessTarget(), { wrapper });
    expect(result.current[0]).toBe(2000);
  });

  it("Test 10: persists new value to localStorage on change", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useArmyReadinessTarget(), { wrapper });

    act(() => {
      result.current[1](500);
    });

    expect(localStorage.getItem("army-readiness:target")).toBe("500");
    expect(result.current[0]).toBe(500);
  });
});
