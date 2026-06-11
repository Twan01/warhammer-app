/**
 * Phase 32 — Army Readiness data layer tests.
 * Phase 122 — Updated: useArmyReadinessTarget now reads from app_settings (not localStorage).
 *
 * Tests the SQL contract for getArmyReadinessByFaction and the
 * useArmyReadinessTarget hook behaviour (app_settings default/read/fallback/session override).
 */
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock @/db/client so the query function resolves without tauri IPC.
const dbSelectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: dbSelectMock }),
}));

// Phase 122: useArmyReadinessTarget reads from useAppSettings
let mockSettingsData: Record<string, string> = {};

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(() => ({
    data: mockSettingsData,
    isLoading: false,
    isError: false,
  })),
  useUpdateSetting: vi.fn(() => ({ mutate: vi.fn() })),
}));

import { getArmyReadinessByFaction } from "@/db/queries/dashboard";
import {
  ARMY_READINESS_KEY,
  ARMY_READINESS_TARGETS,
  useArmyReadinessTarget,
} from "@/hooks/useArmyReadiness";

beforeEach(() => {
  dbSelectMock.mockReset();
  mockSettingsData = {};
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

  it("Test 4: SQL uses 5-level COALESCE(udb_tier.points, udb_base.points, uo.points, u.points, 0) for tier-aware points resolution", async () => {
    dbSelectMock.mockResolvedValueOnce([]);
    await getArmyReadinessByFaction();

    const [sql] = dbSelectMock.mock.calls[0] as [string];
    expect(sql).toMatch(/COALESCE\(udb_tier\.points, udb_base\.points, uo\.points, u\.points, 0\)/);
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

// ---- useArmyReadinessTarget hook tests (Phase 122: migrated from localStorage to app_settings) ----

describe("useArmyReadinessTarget hook (Phase 32 + 122)", () => {
  it("Test 7: defaults to 2000 when no app_settings value exists", () => {
    mockSettingsData = {};
    const { result } = renderHook(() => useArmyReadinessTarget());
    expect(result.current[0]).toBe(2000);
  });

  it("Test 8: reads valid stored value from app_settings", () => {
    mockSettingsData = { army_readiness_target: "1000" };
    const { result } = renderHook(() => useArmyReadinessTarget());
    expect(result.current[0]).toBe(1000);
  });

  it("Test 9: falls back to 2000 for invalid app_settings value", () => {
    mockSettingsData = { army_readiness_target: "bad" };
    const { result } = renderHook(() => useArmyReadinessTarget());
    expect(result.current[0]).toBe(2000);
  });

  it("Test 10: session override changes target without persisting", () => {
    mockSettingsData = { army_readiness_target: "2000" };
    const { result } = renderHook(() => useArmyReadinessTarget());

    act(() => {
      result.current[1](500);
    });

    expect(result.current[0]).toBe(500);
  });

  it("Test 11: supports custom numeric values (D-10)", () => {
    mockSettingsData = { army_readiness_target: "1250" };
    const { result } = renderHook(() => useArmyReadinessTarget());
    expect(result.current[0]).toBe(1250);
  });
});
