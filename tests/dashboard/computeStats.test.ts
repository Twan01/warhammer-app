/**
 * DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-08 —
 * Pure-function tests for computeStats() aggregation.
 *
 * Test fixture pattern mirrors tests/painting/kanbanUtils.test.ts: a
 * `u()` builder with all Unit fields defaulted, callers override only
 * what their assertion cares about.
 */
import { describe, it, expect } from "vitest";
import { computeStats } from "@/features/dashboard/computeStats";
import type { Unit, PaintingStatus } from "@/types/unit";
import type { Faction } from "@/types/faction";

function u(over: Partial<Unit>): Unit {
  return {
    id: 1, faction_id: 1, name: "X",
    category: null, unit_type: null,
    model_count: null, owned_count: null, points: null,
    status_assembly: 0, status_painting: "Not Started" as PaintingStatus,
    painting_percentage: 0,
    status_basing: 0, status_varnished: 0, is_active_project: 0,
    priority: null, target_completion_date: null,
    purchase_date: null, purchase_price_pence: null,
    storage_location: null, main_image_path: null, notes: null,
    lore_notes: null, undercoat: null,
    created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function f(over: Partial<Faction>): Faction {
  return {
    id: 1, name: "F", game_system: "Warhammer 40K",
    description: null, color_theme: "#3a4f96",
    icon_path: null, lore_notes: null,
    created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

describe("DASH-08 empty state", () => {
  it("returns hasUnits=false when units array is empty", () => {
    const result = computeStats([], []);
    expect(result.hasUnits).toBe(false);
    expect(result.totalModels).toBe(0);
    expect(result.fullyPainted).toBe(0);
    expect(result.battleReadyPoints).toBe(0);
    expect(result.activeProjectsCount).toBe(0);
    expect(result.paintingPct).toBe(0);
    expect(result.assemblyPct).toBe(0);
    expect(result.basingPct).toBe(0);
    expect(result.activeProjects).toEqual([]);
    expect(result.recentlyUpdated).toEqual([]);
  });

  it("empty state with factions still produces factionStats entries (DASH-02)", () => {
    const tau = f({ id: 1, name: "Tau" });
    const ultra = f({ id: 2, name: "Ultra" });
    const result = computeStats([], [tau, ultra]);
    expect(result.hasUnits).toBe(false);
    expect(result.factionStats).toHaveLength(2);
    expect(result.factionStats[0]).toMatchObject({
      modelCount: 0, paintedPct: 0, pointsOwned: 0, pointsPainted: 0,
    });
  });
});

describe("DASH-01 totalModels / fullyPainted / battleReadyPoints / activeProjectsCount", () => {
  it("totalModels equals units.length", () => {
    const units = [u({ id: 1 }), u({ id: 2 }), u({ id: 3 })];
    expect(computeStats(units, []).totalModels).toBe(3);
  });

  it("fullyPainted counts only units with status_painting === 'Completed'", () => {
    const units = [
      u({ id: 1, status_painting: "Completed" }),
      u({ id: 2, status_painting: "Completed" }),
      u({ id: 3, status_painting: "Built" }),
      u({ id: 4, status_painting: "Layered" }),
    ];
    expect(computeStats(units, []).fullyPainted).toBe(2);
  });

  it("battleReadyPoints sums points only for Completed units", () => {
    const units = [
      u({ id: 1, status_painting: "Completed", points: 100 }),
      u({ id: 2, status_painting: "Completed", points: 250 }),
      u({ id: 3, status_painting: "Built", points: 999 }), // excluded
    ];
    expect(computeStats(units, []).battleReadyPoints).toBe(350);
  });

  it("battleReadyPoints handles null points (treats as 0)", () => {
    const units = [
      u({ id: 1, status_painting: "Completed", points: null }),
      u({ id: 2, status_painting: "Completed", points: 100 }),
    ];
    expect(computeStats(units, []).battleReadyPoints).toBe(100);
  });

  it("activeProjectsCount counts only units with is_active_project === 1", () => {
    const units = [
      u({ id: 1, is_active_project: 1 }),
      u({ id: 2, is_active_project: 1 }),
      u({ id: 3, is_active_project: 0 }),
    ];
    expect(computeStats(units, []).activeProjectsCount).toBe(2);
  });
});

describe("DASH-03 paintingPct (average of painting_percentage)", () => {
  it("returns Math.round of average painting_percentage", () => {
    const units = [
      u({ id: 1, painting_percentage: 0 }),
      u({ id: 2, painting_percentage: 50 }),
      u({ id: 3, painting_percentage: 100 }),
    ];
    expect(computeStats(units, []).paintingPct).toBe(50);
  });

  it("rounds correctly (33.33... → 33)", () => {
    const units = [
      u({ id: 1, painting_percentage: 0 }),
      u({ id: 2, painting_percentage: 0 }),
      u({ id: 3, painting_percentage: 100 }),
    ];
    expect(computeStats(units, []).paintingPct).toBe(33);
  });
});

describe("DASH-04 assemblyPct and basingPct", () => {
  it("assemblyPct equals percentage of units where status_assembly === 1", () => {
    const units = [
      u({ id: 1, status_assembly: 1 }),
      u({ id: 2, status_assembly: 1 }),
      u({ id: 3, status_assembly: 0 }),
      u({ id: 4, status_assembly: 0 }),
    ];
    expect(computeStats(units, []).assemblyPct).toBe(50);
  });

  it("basingPct equals percentage of units where status_basing === 1", () => {
    const units = [
      u({ id: 1, status_basing: 1 }),
      u({ id: 2, status_basing: 0 }),
      u({ id: 3, status_basing: 0 }),
      u({ id: 4, status_basing: 0 }),
    ];
    expect(computeStats(units, []).basingPct).toBe(25);
  });
});

describe("DASH-05 activeProjects list", () => {
  it("returns at most 5 entries even when more exist", () => {
    const units = Array.from({ length: 7 }, (_, i) =>
      u({
        id: i + 1,
        is_active_project: 1,
        updated_at: `2026-05-0${i + 1} 00:00:00`,
      })
    );
    expect(computeStats(units, []).activeProjects).toHaveLength(5);
  });

  it("returns only units with is_active_project === 1", () => {
    const units = [
      u({ id: 1, is_active_project: 1, updated_at: "2026-05-01 00:00:00" }),
      u({ id: 2, is_active_project: 0, updated_at: "2026-05-02 00:00:00" }),
      u({ id: 3, is_active_project: 1, updated_at: "2026-05-03 00:00:00" }),
    ];
    const result = computeStats(units, []).activeProjects;
    expect(result).toHaveLength(2);
    expect(result.every((unit) => unit.is_active_project === 1)).toBe(true);
  });

  it("sorts by updated_at DESC (most recent first)", () => {
    const units = [
      u({ id: 1, is_active_project: 1, updated_at: "2026-05-01 00:00:00" }),
      u({ id: 2, is_active_project: 1, updated_at: "2026-05-03 00:00:00" }),
      u({ id: 3, is_active_project: 1, updated_at: "2026-05-02 00:00:00" }),
    ];
    const ids = computeStats(units, []).activeProjects.map((unit) => unit.id);
    expect(ids).toEqual([2, 3, 1]);
  });
});

describe("DASH-06 recentlyUpdated list", () => {
  it("returns at most 5 entries even when more exist", () => {
    const units = Array.from({ length: 6 }, (_, i) =>
      u({ id: i + 1, updated_at: `2026-05-0${i + 1} 00:00:00` })
    );
    expect(computeStats(units, []).recentlyUpdated).toHaveLength(5);
  });

  it("sorts by updated_at DESC (most recent first)", () => {
    const units = [
      u({ id: 1, updated_at: "2026-05-01 00:00:00" }),
      u({ id: 2, updated_at: "2026-05-03 00:00:00" }),
      u({ id: 3, updated_at: "2026-05-02 00:00:00" }),
    ];
    const ids = computeStats(units, []).recentlyUpdated.map((unit) => unit.id);
    expect(ids).toEqual([2, 3, 1]);
  });

  it("includes units regardless of is_active_project (unlike activeProjects)", () => {
    const units = [
      u({ id: 1, is_active_project: 0, updated_at: "2026-05-02 00:00:00" }),
      u({ id: 2, is_active_project: 1, updated_at: "2026-05-01 00:00:00" }),
    ];
    const ids = computeStats(units, []).recentlyUpdated.map((unit) => unit.id);
    expect(ids).toEqual([1, 2]);
  });
});

describe("DASH-02 factionStats", () => {
  it("returns one entry per faction in the input array", () => {
    const tau = f({ id: 1, name: "Tau" });
    const ultra = f({ id: 2, name: "Ultra" });
    const units = [u({ id: 1, faction_id: 1 })];
    const stats = computeStats(units, [tau, ultra]).factionStats;
    expect(stats).toHaveLength(2);
    expect(stats.map((s) => s.faction.id)).toEqual([1, 2]);
  });

  it("modelCount equals count of units belonging to that faction", () => {
    const tau = f({ id: 1, name: "Tau" });
    const ultra = f({ id: 2, name: "Ultra" });
    const units = [
      u({ id: 1, faction_id: 1 }),
      u({ id: 2, faction_id: 1 }),
      u({ id: 3, faction_id: 2 }),
    ];
    const stats = computeStats(units, [tau, ultra]).factionStats;
    expect(stats.find((s) => s.faction.id === 1)?.modelCount).toBe(2);
    expect(stats.find((s) => s.faction.id === 2)?.modelCount).toBe(1);
  });

  it("paintedPct equals percentage of Completed units within faction", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, status_painting: "Completed" }),
      u({ id: 2, faction_id: 1, status_painting: "Built" }),
      u({ id: 3, faction_id: 1, status_painting: "Built" }),
      u({ id: 4, faction_id: 1, status_painting: "Built" }),
    ];
    expect(computeStats(units, [tau]).factionStats[0].paintedPct).toBe(25);
  });

  it("paintedPct is 0 (no NaN) when faction has zero units", () => {
    const tau = f({ id: 1, name: "Tau" });
    const stats = computeStats([], [tau]).factionStats;
    expect(stats[0].paintedPct).toBe(0);
    expect(Number.isNaN(stats[0].paintedPct)).toBe(false);
  });

  it("pointsOwned and pointsPainted sum points correctly", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, points: 100, status_painting: "Completed" }),
      u({ id: 2, faction_id: 1, points: 200, status_painting: "Completed" }),
      u({ id: 3, faction_id: 1, points: 50, status_painting: "Built" }),
    ];
    const stat = computeStats(units, [tau]).factionStats[0];
    expect(stat.pointsOwned).toBe(350);
    expect(stat.pointsPainted).toBe(300);
  });

  it("pointsOwned handles null points (treats as 0)", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, points: null, status_painting: "Completed" }),
      u({ id: 2, faction_id: 1, points: 100, status_painting: "Completed" }),
    ];
    const stat = computeStats(units, [tau]).factionStats[0];
    expect(stat.pointsOwned).toBe(100);
    expect(stat.pointsPainted).toBe(100);
  });
});
