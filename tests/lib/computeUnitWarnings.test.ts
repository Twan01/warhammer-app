import { describe, expect, it } from "vitest";
import {
  computeUnitWarnings,
  computeListHealthStats,
} from "@/lib/computeUnitWarnings";
import type { WarningContext } from "@/lib/computeUnitWarnings";
import type { ArmyListUnitRow } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Factory helper — creates a healthy unit by default
// ---------------------------------------------------------------------------
function makeUnit(overrides: Partial<ArmyListUnitRow> = {}): ArmyListUnitRow {
  return {
    id: 1,
    list_id: 1,
    unit_id: 1,
    points_override: null,
    notes: null,
    created_at: "2024-01-01",
    unit_name: "Intercessors",
    unit_points: 100,
    effective_points: 100,
    faction_id: 1,
    status_assembly: 1,
    status_painting: "Completed",
    painting_percentage: 100,
    tactical_role: null,
    synced_points: null,
    override_points: null,
    ...overrides,
  };
}

function makeContext(overrides: Partial<WarningContext> = {}): WarningContext {
  return {
    totalPoints: 1500,
    pointsLimit: 2000,
    freshness: "fresh",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeUnitWarnings
// ---------------------------------------------------------------------------
describe("computeUnitWarnings", () => {
  it("returns hard 'Points exceeded' when totalPoints > pointsLimit", () => {
    const unit = makeUnit();
    const ctx = makeContext({ totalPoints: 2100, pointsLimit: 2000 });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.hard).toContain("Points exceeded");
  });

  it("does NOT return 'Points exceeded' when pointsLimit is null", () => {
    const unit = makeUnit();
    const ctx = makeContext({ totalPoints: 9999, pointsLimit: null });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("does NOT return 'Points exceeded' when totalPoints <= pointsLimit", () => {
    const unit = makeUnit();
    const ctx = makeContext({ totalPoints: 2000, pointsLimit: 2000 });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("returns soft 'Not painted' when status_painting !== 'Completed'", () => {
    const unit = makeUnit({ status_painting: "Primed" });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).toContain("Not painted");
  });

  it("does NOT return 'Not painted' when status_painting === 'Completed'", () => {
    const unit = makeUnit({ status_painting: "Completed" });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Not painted");
  });

  it("returns soft 'Not assembled' when status_assembly === 0", () => {
    const unit = makeUnit({ status_assembly: 0 });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).toContain("Not assembled");
  });

  it("does NOT return 'Not assembled' when status_assembly === 1", () => {
    const unit = makeUnit({ status_assembly: 1 });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Not assembled");
  });

  it("returns soft 'Manual override' when points_override !== null", () => {
    const unit = makeUnit({ points_override: 150 });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).toContain("Manual override");
  });

  it("does NOT return 'Manual override' when points_override is null", () => {
    const unit = makeUnit({ points_override: null });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Manual override");
  });

  it("returns soft 'Unknown points' when effective_points === 0", () => {
    const unit = makeUnit({ effective_points: 0 });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).toContain("Unknown points");
  });

  it("does NOT return 'Unknown points' when effective_points > 0", () => {
    const unit = makeUnit({ effective_points: 100 });
    const ctx = makeContext();
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Unknown points");
  });

  it("returns soft 'Stale points' when freshness is 'stale'", () => {
    const unit = makeUnit();
    const ctx = makeContext({ freshness: "stale" });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).toContain("Stale points");
  });

  it("returns soft 'Stale points' when freshness is 'never'", () => {
    const unit = makeUnit();
    const ctx = makeContext({ freshness: "never" });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).toContain("Stale points");
  });

  it("does NOT return 'Stale points' when freshness is 'fresh'", () => {
    const unit = makeUnit();
    const ctx = makeContext({ freshness: "fresh" });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Stale points");
  });

  it("does NOT return 'Stale points' when freshness is 'aging'", () => {
    const unit = makeUnit();
    const ctx = makeContext({ freshness: "aging" });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Stale points");
  });

  it("returns empty hard and soft for a fully healthy unit", () => {
    const unit = makeUnit();
    const ctx = makeContext({ freshness: "fresh" });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.hard).toEqual([]);
    expect(result.soft).toEqual([]);
  });

  it("can accumulate multiple soft warnings", () => {
    const unit = makeUnit({
      status_painting: "Not Started",
      status_assembly: 0,
      points_override: 50,
      effective_points: 0,
    });
    const ctx = makeContext({ freshness: "stale" });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).toContain("Not painted");
    expect(result.soft).toContain("Not assembled");
    expect(result.soft).toContain("Manual override");
    expect(result.soft).toContain("Unknown points");
    expect(result.soft).toContain("Stale points");
    expect(result.soft).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// computeListHealthStats
// ---------------------------------------------------------------------------
describe("computeListHealthStats", () => {
  it("computes totalPoints as sum of effective_points", () => {
    const units = [
      makeUnit({ effective_points: 100 }),
      makeUnit({ effective_points: 200 }),
      makeUnit({ effective_points: 50 }),
    ];
    const stats = computeListHealthStats(units, 2000, "fresh");
    expect(stats.totalPoints).toBe(350);
  });

  it("ownershipPct is always 100", () => {
    const units = [makeUnit(), makeUnit()];
    const stats = computeListHealthStats(units, 2000, "fresh");
    expect(stats.ownershipPct).toBe(100);
  });

  it("computes battleReadyPct correctly", () => {
    const units = [
      makeUnit({ effective_points: 100, status_painting: "Completed" }),
      makeUnit({ effective_points: 100, status_painting: "Primed" }),
    ];
    const stats = computeListHealthStats(units, 2000, "fresh");
    expect(stats.battleReadyPct).toBe(50);
  });

  it("battleReadyPct is 0 when totalPoints is 0", () => {
    const units = [
      makeUnit({ effective_points: 0, status_painting: "Completed" }),
    ];
    const stats = computeListHealthStats(units, 2000, "fresh");
    expect(stats.battleReadyPct).toBe(0);
  });

  it("battleReadyPct is 0 for empty list", () => {
    const stats = computeListHealthStats([], 2000, "fresh");
    expect(stats.battleReadyPct).toBe(0);
  });

  it("pointsExceeded is true when totalPoints > pointsLimit", () => {
    const units = [makeUnit({ effective_points: 2500 })];
    const stats = computeListHealthStats(units, 2000, "fresh");
    expect(stats.pointsExceeded).toBe(true);
  });

  it("pointsExceeded is false when totalPoints <= pointsLimit", () => {
    const units = [makeUnit({ effective_points: 2000 })];
    const stats = computeListHealthStats(units, 2000, "fresh");
    expect(stats.pointsExceeded).toBe(false);
  });

  it("pointsExceeded is false when pointsLimit is null", () => {
    const units = [makeUnit({ effective_points: 9999 })];
    const stats = computeListHealthStats(units, null, "fresh");
    expect(stats.pointsExceeded).toBe(false);
  });

  it("counts hardWarnings — points exceeded counted once at list level", () => {
    const units = [makeUnit(), makeUnit()];
    // Points exceeded is list-level, counted once (not per-unit)
    const stats = computeListHealthStats(units, 100, "fresh");
    // totalPoints = 200 > 100, but points exceeded is deduplicated to 1
    expect(stats.hardWarningCount).toBe(1);
  });

  it("counts softWarnings across all units", () => {
    const units = [
      makeUnit({ status_painting: "Not Started" }), // 1 soft
      makeUnit({ status_assembly: 0 }), // 1 soft
    ];
    const stats = computeListHealthStats(units, 2000, "fresh");
    expect(stats.softWarningCount).toBe(2);
  });

  it("preserves pointsLimit in stats", () => {
    const stats = computeListHealthStats([makeUnit()], 1500, "fresh");
    expect(stats.pointsLimit).toBe(1500);
  });

  it("preserves null pointsLimit in stats", () => {
    const stats = computeListHealthStats([makeUnit()], null, "fresh");
    expect(stats.pointsLimit).toBeNull();
  });
});
