import { describe, expect, it } from "vitest";
import {
  computeUnitWarnings,
  computeListWarnings,
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
    ghost_unit_name: null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
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
    tier_points: null,
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
// computeUnitWarnings (unit-level only after split)
// ---------------------------------------------------------------------------
describe("computeUnitWarnings", () => {
  it("does NOT return 'Points exceeded' even when totalPoints > pointsLimit (list-level)", () => {
    const unit = makeUnit();
    const ctx = makeContext({ totalPoints: 2100, pointsLimit: 2000 });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("does NOT return 'Points exceeded' when pointsLimit is null", () => {
    const unit = makeUnit();
    const ctx = makeContext({ totalPoints: 9999, pointsLimit: null });
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

  it("does NOT return 'Stale points' (moved to list-level)", () => {
    const unit = makeUnit();
    const ctx = makeContext({ freshness: "stale" });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Stale points");
    expect(result.soft).not.toContain("Stale points data");
  });

  it("does NOT return 'Stale points' for freshness 'never' (moved to list-level)", () => {
    const unit = makeUnit();
    const ctx = makeContext({ freshness: "never" });
    const result = computeUnitWarnings(unit, ctx);
    expect(result.soft).not.toContain("Stale points");
    expect(result.soft).not.toContain("Stale points data");
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

  it("can accumulate multiple soft warnings (unit-level only)", () => {
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
    // Stale points moved to list-level, so only 4 unit-level warnings
    expect(result.soft).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// computeListWarnings (list-level only)
// ---------------------------------------------------------------------------
describe("computeListWarnings", () => {
  it("returns hard 'Points exceeded' when totalPoints > pointsLimit", () => {
    const ctx = makeContext({ totalPoints: 2100, pointsLimit: 2000 });
    const result = computeListWarnings(ctx);
    expect(result.hard).toContain("Points exceeded");
  });

  it("does NOT return 'Points exceeded' when pointsLimit is null", () => {
    const ctx = makeContext({ totalPoints: 9999, pointsLimit: null });
    const result = computeListWarnings(ctx);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("does NOT return 'Points exceeded' when totalPoints <= pointsLimit", () => {
    const ctx = makeContext({ totalPoints: 2000, pointsLimit: 2000 });
    const result = computeListWarnings(ctx);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("returns soft 'Stale points data' when freshness is 'stale'", () => {
    const ctx = makeContext({ freshness: "stale" });
    const result = computeListWarnings(ctx);
    expect(result.soft).toContain("Stale points data");
  });

  it("returns soft 'Stale points data' when freshness is 'never'", () => {
    const ctx = makeContext({ freshness: "never" });
    const result = computeListWarnings(ctx);
    expect(result.soft).toContain("Stale points data");
  });

  it("does NOT return 'Stale points data' when freshness is 'fresh'", () => {
    const ctx = makeContext({ freshness: "fresh" });
    const result = computeListWarnings(ctx);
    expect(result.soft).not.toContain("Stale points data");
  });

  it("does NOT return 'Stale points data' when freshness is 'aging'", () => {
    const ctx = makeContext({ freshness: "aging" });
    const result = computeListWarnings(ctx);
    expect(result.soft).not.toContain("Stale points data");
  });

  it("returns empty hard and soft for a healthy list", () => {
    const ctx = makeContext({ totalPoints: 1500, pointsLimit: 2000, freshness: "fresh" });
    const result = computeListWarnings(ctx);
    expect(result.hard).toEqual([]);
    expect(result.soft).toEqual([]);
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
    // totalPoints = 200 > 100, list-level hard warning counted once
    expect(stats.hardWarningCount).toBe(1);
  });

  it("counts softWarnings across all units plus list-level", () => {
    const units = [
      makeUnit({ status_painting: "Not Started" }), // 1 soft (unit)
      makeUnit({ status_assembly: 0 }), // 1 soft (unit)
    ];
    const stats = computeListHealthStats(units, 2000, "fresh");
    expect(stats.softWarningCount).toBe(2);
  });

  it("counts list-level soft warnings (stale) in addition to unit-level", () => {
    const units = [
      makeUnit({ status_painting: "Not Started" }), // 1 soft (unit)
    ];
    const stats = computeListHealthStats(units, 2000, "stale");
    // 1 unit-level (Not painted) + 1 list-level (Stale points data)
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
