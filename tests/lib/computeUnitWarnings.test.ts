import { describe, expect, it } from "vitest";
import {
  computeUnitWarnings,
  computeListWarnings,
  computeListHealthStats,
} from "@/lib/computeUnitWarnings";
import type { WarningContext } from "@/lib/computeUnitWarnings";
import type { ArmyListUnitRow } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Factory helper -- creates a healthy unit by default
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
    sort_order: 0,
    created_at: "2024-01-01",
    unit_name: "Intercessors",
    unit_points: 100,
    udb_unit_id: null,
    effective_points: 100,
    faction_id: 1,
    unit_category: null, unit_model_count: null,
    status_assembly: 1,
    status_painting: "Completed",
    painting_percentage: 100,
    tactical_role: null,
    udb_base_points: null,
    udb_role: null,
    udb_keywords: null,
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
    const result = computeUnitWarnings(unit);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("does NOT return 'Points exceeded' when pointsLimit is null", () => {
    const unit = makeUnit();
    const result = computeUnitWarnings(unit);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("returns soft 'Not painted' when status_painting !== 'Completed'", () => {
    const unit = makeUnit({ status_painting: "Primed" });
    const result = computeUnitWarnings(unit);
    expect(result.soft).toContain("Not painted");
  });

  it("does NOT return 'Not painted' when status_painting === 'Completed'", () => {
    const unit = makeUnit({ status_painting: "Completed" });
    const result = computeUnitWarnings(unit);
    expect(result.soft).not.toContain("Not painted");
  });

  it("returns soft 'Not assembled' when status_assembly === 0", () => {
    const unit = makeUnit({ status_assembly: 0 });
    const result = computeUnitWarnings(unit);
    expect(result.soft).toContain("Not assembled");
  });

  it("does NOT return 'Not assembled' when status_assembly === 1", () => {
    const unit = makeUnit({ status_assembly: 1 });
    const result = computeUnitWarnings(unit);
    expect(result.soft).not.toContain("Not assembled");
  });

  it("returns soft 'Manual override' when points_override !== null", () => {
    const unit = makeUnit({ points_override: 150 });
    const result = computeUnitWarnings(unit);
    expect(result.soft).toContain("Manual override");
  });

  it("does NOT return 'Manual override' when points_override is null", () => {
    const unit = makeUnit({ points_override: null });
    const result = computeUnitWarnings(unit);
    expect(result.soft).not.toContain("Manual override");
  });

  it("returns soft 'Unknown points' when effective_points === 0", () => {
    const unit = makeUnit({ effective_points: 0 });
    const result = computeUnitWarnings(unit);
    expect(result.soft).toContain("Unknown points");
  });

  it("does NOT return 'Unknown points' when effective_points > 0", () => {
    const unit = makeUnit({ effective_points: 100 });
    const result = computeUnitWarnings(unit);
    expect(result.soft).not.toContain("Unknown points");
  });

  it("does NOT return 'Stale points' (moved to list-level)", () => {
    const unit = makeUnit();
    const result = computeUnitWarnings(unit);
    expect(result.soft).not.toContain("Stale points");
    expect(result.soft).not.toContain("Stale points data");
  });

  it("does NOT return 'Stale points' for freshness 'aging' (unit-level only)", () => {
    const unit = makeUnit();
    const result = computeUnitWarnings(unit);
    expect(result.soft).not.toContain("Stale points");
    expect(result.soft).not.toContain("Stale points data");
  });

  it("does NOT return 'Stale points' when freshness is 'fresh'", () => {
    const unit = makeUnit();
    const result = computeUnitWarnings(unit);
    expect(result.soft).not.toContain("Stale points");
  });

  it("does NOT return 'Stale points' when freshness is 'aging'", () => {
    const unit = makeUnit();
    const result = computeUnitWarnings(unit);
    expect(result.soft).not.toContain("Stale points");
  });

  it("returns empty warnings for unlinked unit (udb_role = null)", () => {
    const unit = makeUnit({ udb_role: null, udb_unit_id: null });
    const result = computeUnitWarnings(unit);
    expect(result.hard).toEqual([]);
    expect(result.soft).toEqual([]);
  });

  it("returns no role-based warnings for ghost unit (unit_id = null)", () => {
    const unit = makeUnit({
      unit_id: null,
      ghost_unit_name: "Ghost Intercessors",
      udb_role: null,
      status_painting: "Completed",
      status_assembly: 1,
    });
    const result = computeUnitWarnings(unit);
    expect(result.hard).toEqual([]);
    expect(result.soft).toEqual([]);
  });

  it("returns empty hard and soft for a fully healthy unit", () => {
    const unit = makeUnit();
    const result = computeUnitWarnings(unit);
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
    const result = computeUnitWarnings(unit);
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
    const result = computeListWarnings(ctx, []);
    expect(result.hard).toContain("Points exceeded");
  });

  it("does NOT return 'Points exceeded' when pointsLimit is null", () => {
    const ctx = makeContext({ totalPoints: 9999, pointsLimit: null });
    const result = computeListWarnings(ctx, []);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("does NOT return 'Points exceeded' when totalPoints <= pointsLimit", () => {
    const ctx = makeContext({ totalPoints: 2000, pointsLimit: 2000 });
    const result = computeListWarnings(ctx, []);
    expect(result.hard).not.toContain("Points exceeded");
  });

  it("does NOT return 'Stale points data' even when freshness is 'stale' (removed in Phase 107)", () => {
    const ctx = makeContext({ freshness: "stale" });
    const result = computeListWarnings(ctx, []);
    expect(result.soft).not.toContain("Stale points data");
  });

  it("does NOT return 'Stale points data' when freshness is 'fresh'", () => {
    const ctx = makeContext({ freshness: "fresh" });
    const result = computeListWarnings(ctx, []);
    expect(result.soft).not.toContain("Stale points data");
  });

  it("does NOT return 'Stale points data' when freshness is 'aging'", () => {
    const ctx = makeContext({ freshness: "aging" });
    const result = computeListWarnings(ctx, []);
    expect(result.soft).not.toContain("Stale points data");
  });

  it("returns empty hard and soft for a healthy list", () => {
    const ctx = makeContext({ totalPoints: 1500, pointsLimit: 2000, freshness: "fresh" });
    const units = [
      { udb_role: "Battleline", unit_id: 1 },
      { udb_role: "Battleline", unit_id: 2 },
      { udb_role: "Battleline", unit_id: 3 },
    ];
    const result = computeListWarnings(ctx, units);
    expect(result.hard).toEqual([]);
    expect(result.soft).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // BATTLELINE count validation (Phase 106, D-08)
  // -------------------------------------------------------------------------
  it("returns soft warning when 2000pt list has fewer than 3 Battleline units", () => {
    const units = [
      { udb_role: "Battleline", unit_id: 1 },
    ];
    const ctx = makeContext({ totalPoints: 1500, pointsLimit: 2000 });
    const result = computeListWarnings(ctx, units);
    expect(result.soft).toContain("Needs 3 Battleline (have 1)");
  });

  it("returns soft warning when 1000pt list has 0 Battleline units", () => {
    const units = [
      { udb_role: "Character", unit_id: 1 },
    ];
    const ctx = makeContext({ totalPoints: 800, pointsLimit: 1000 });
    const result = computeListWarnings(ctx, units);
    expect(result.soft).toContain("Needs 2 Battleline (have 0)");
  });

  it("returns no Battleline warning when threshold is met (3 battleline at 2000pt)", () => {
    const units = [
      { udb_role: "Battleline", unit_id: 1 },
      { udb_role: "Battleline", unit_id: 2 },
      { udb_role: "Battleline", unit_id: 3 },
    ];
    const ctx = makeContext({ totalPoints: 1800, pointsLimit: 2000 });
    const result = computeListWarnings(ctx, units);
    const battlelineWarnings = result.soft.filter(w => w.includes("Battleline"));
    expect(battlelineWarnings).toHaveLength(0);
  });

  it("skips Battleline check when pointsLimit is null", () => {
    const units = [
      { udb_role: "Character", unit_id: 1 },
    ];
    const ctx = makeContext({ pointsLimit: null });
    const result = computeListWarnings(ctx, units);
    const battlelineWarnings = result.soft.filter(w => w.includes("Battleline"));
    expect(battlelineWarnings).toHaveLength(0);
  });

  it("counts Battleline case-insensitively", () => {
    const units = [
      { udb_role: "battleline", unit_id: 1 },
      { udb_role: "BATTLELINE", unit_id: 2 },
    ];
    const ctx = makeContext({ pointsLimit: 1500 });
    const result = computeListWarnings(ctx, units);
    const battlelineWarnings = result.soft.filter(w => w.includes("Battleline"));
    expect(battlelineWarnings).toHaveLength(0); // 2 >= 2 required for 1000-1999
  });

  it("skips unlinked units (unit_id = null) when counting Battleline", () => {
    const units = [
      { udb_role: "Battleline", unit_id: null },  // ghost/unlinked — skipped
      { udb_role: "Battleline", unit_id: 1 },
    ];
    const ctx = makeContext({ pointsLimit: 2000 });
    const result = computeListWarnings(ctx, units);
    // Only 1 linked battleline, need 3 for 2000pt
    expect(result.soft).toContain("Needs 3 Battleline (have 1)");
  });

  // -------------------------------------------------------------------------
  // DEDICATED TRANSPORT cap (Phase 110, D-09)
  // -------------------------------------------------------------------------
  describe("DEDICATED TRANSPORT cap", () => {
    it("returns soft warning when transport count (3) exceeds non-transport non-character count (2) at 2000pts", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Dedicated Transport", udb_unit_id: "t1", udb_keywords: "Transport" }),
        makeUnit({ unit_id: 2, udb_role: "Dedicated Transport", udb_unit_id: "t2", udb_keywords: "Transport" }),
        makeUnit({ unit_id: 3, udb_role: "Dedicated Transport", udb_unit_id: "t3", udb_keywords: "Transport" }),
        makeUnit({ unit_id: 4, udb_role: "Battleline", udb_unit_id: "u1", udb_keywords: null }),
        makeUnit({ unit_id: 5, udb_role: "Battleline", udb_unit_id: "u2", udb_keywords: null }),
      ];
      const ctx = makeContext({ pointsLimit: 2000 });
      const result = computeListWarnings(ctx, units);
      expect(result.soft).toContain("DEDICATED TRANSPORT count exceeds non-transport, non-character units");
    });

    it("no warning when transport count (1) does not exceed non-transport non-character count (3) at 2000pts", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Dedicated Transport", udb_unit_id: "t1", udb_keywords: "Transport" }),
        makeUnit({ unit_id: 2, udb_role: "Battleline", udb_unit_id: "u1", udb_keywords: null }),
        makeUnit({ unit_id: 3, udb_role: "Battleline", udb_unit_id: "u2", udb_keywords: null }),
        makeUnit({ unit_id: 4, udb_role: "Battleline", udb_unit_id: "u3", udb_keywords: null }),
      ];
      const ctx = makeContext({ pointsLimit: 2000 });
      const result = computeListWarnings(ctx, units);
      const transportWarnings = result.soft.filter(w => w.includes("DEDICATED TRANSPORT"));
      expect(transportWarnings).toHaveLength(0);
    });

    it("no warning when transport count is 0", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Battleline", udb_unit_id: "u1", udb_keywords: null }),
        makeUnit({ unit_id: 2, udb_role: "Battleline", udb_unit_id: "u2", udb_keywords: null }),
      ];
      const ctx = makeContext({ pointsLimit: 2000 });
      const result = computeListWarnings(ctx, units);
      const transportWarnings = result.soft.filter(w => w.includes("DEDICATED TRANSPORT"));
      expect(transportWarnings).toHaveLength(0);
    });

    it("skips check when pointsLimit is null", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Dedicated Transport", udb_unit_id: "t1", udb_keywords: "Transport" }),
        makeUnit({ unit_id: 2, udb_role: "Dedicated Transport", udb_unit_id: "t2", udb_keywords: "Transport" }),
        makeUnit({ unit_id: 3, udb_role: "Dedicated Transport", udb_unit_id: "t3", udb_keywords: "Transport" }),
      ];
      const ctx = makeContext({ pointsLimit: null });
      const result = computeListWarnings(ctx, units);
      const transportWarnings = result.soft.filter(w => w.includes("DEDICATED TRANSPORT"));
      expect(transportWarnings).toHaveLength(0);
    });

    it("ghost units (unit_id = null) are excluded from transport counting", () => {
      const units = [
        makeUnit({ unit_id: null, udb_role: "Dedicated Transport", udb_unit_id: "t1", udb_keywords: "Transport" }),
        makeUnit({ unit_id: null, udb_role: "Dedicated Transport", udb_unit_id: "t2", udb_keywords: "Transport" }),
        makeUnit({ unit_id: null, udb_role: "Dedicated Transport", udb_unit_id: "t3", udb_keywords: "Transport" }),
        makeUnit({ unit_id: 1, udb_role: "Battleline", udb_unit_id: "u1", udb_keywords: null }),
        makeUnit({ unit_id: 2, udb_role: "Battleline", udb_unit_id: "u2", udb_keywords: null }),
      ];
      const ctx = makeContext({ pointsLimit: 2000 });
      const result = computeListWarnings(ctx, units);
      const transportWarnings = result.soft.filter(w => w.includes("DEDICATED TRANSPORT"));
      expect(transportWarnings).toHaveLength(0); // ghost transports not counted
    });
  });

  // -------------------------------------------------------------------------
  // EPIC HERO uniqueness (Phase 110, D-09)
  // -------------------------------------------------------------------------
  describe("EPIC HERO uniqueness", () => {
    it("returns soft warning when two units share same udb_unit_id and both have 'Epic Hero' in udb_keywords", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Character", udb_unit_id: "epic-hero-001", udb_keywords: "Epic Hero, Character" }),
        makeUnit({ unit_id: 2, udb_role: "Character", udb_unit_id: "epic-hero-001", udb_keywords: "Epic Hero, Character" }),
        makeUnit({ unit_id: 3, udb_role: "Battleline", udb_unit_id: "u1", udb_keywords: null }),
      ];
      const ctx = makeContext({ pointsLimit: 2000 });
      const result = computeListWarnings(ctx, units);
      expect(result.soft).toContain("EPIC HERO must be unique (duplicate detected)");
    });

    it("no warning when Epic Hero appears only once", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Character", udb_unit_id: "epic-hero-001", udb_keywords: "Epic Hero, Character" }),
        makeUnit({ unit_id: 2, udb_role: "Battleline", udb_unit_id: "u1", udb_keywords: null }),
      ];
      const ctx = makeContext({ pointsLimit: 2000 });
      const result = computeListWarnings(ctx, units);
      const epicWarnings = result.soft.filter(w => w.includes("EPIC HERO"));
      expect(epicWarnings).toHaveLength(0);
    });

    it("no warning when no units have 'Epic Hero' keyword", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Character", udb_unit_id: "char-001", udb_keywords: "Character, Infantry" }),
        makeUnit({ unit_id: 2, udb_role: "Battleline", udb_unit_id: "u1", udb_keywords: "Infantry, Battleline" }),
      ];
      const ctx = makeContext({ pointsLimit: 2000 });
      const result = computeListWarnings(ctx, units);
      const epicWarnings = result.soft.filter(w => w.includes("EPIC HERO"));
      expect(epicWarnings).toHaveLength(0);
    });

    it("skips check when pointsLimit is null", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Character", udb_unit_id: "epic-hero-001", udb_keywords: "Epic Hero, Character" }),
        makeUnit({ unit_id: 2, udb_role: "Character", udb_unit_id: "epic-hero-001", udb_keywords: "Epic Hero, Character" }),
      ];
      const ctx = makeContext({ pointsLimit: null });
      const result = computeListWarnings(ctx, units);
      const epicWarnings = result.soft.filter(w => w.includes("EPIC HERO"));
      expect(epicWarnings).toHaveLength(0);
    });

    it("case-insensitive match on 'epic hero' keyword", () => {
      const units = [
        makeUnit({ unit_id: 1, udb_role: "Character", udb_unit_id: "epic-hero-001", udb_keywords: "EPIC HERO, Character" }),
        makeUnit({ unit_id: 2, udb_role: "Character", udb_unit_id: "epic-hero-001", udb_keywords: "epic hero, Character" }),
      ];
      const ctx = makeContext({ pointsLimit: 2000 });
      const result = computeListWarnings(ctx, units);
      expect(result.soft).toContain("EPIC HERO must be unique (duplicate detected)");
    });
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

  it("counts hardWarnings -- points exceeded counted once at list level", () => {
    const units = [makeUnit(), makeUnit()];
    // Points exceeded is list-level, counted once (not per-unit)
    const stats = computeListHealthStats(units, 100, "fresh");
    // totalPoints = 200 > 100, list-level hard warning counted once
    expect(stats.hardWarningCount).toBe(1);
  });

  it("counts softWarnings across all units plus list-level", () => {
    const units = [
      makeUnit({ status_painting: "Not Started", udb_role: "Battleline" }), // 1 soft (unit)
      makeUnit({ status_assembly: 0, udb_role: "Battleline" }), // 1 soft (unit)
      makeUnit({ udb_role: "Battleline" }), // healthy unit for battleline threshold
    ];
    const stats = computeListHealthStats(units, 2000, "fresh");
    // 2 unit-level + 0 list-level (3 Battleline meets 2000pt threshold, fresh)
    expect(stats.softWarningCount).toBe(2);
  });

  it("counts list-level soft warnings (Battleline) in addition to unit-level", () => {
    const units = [
      makeUnit({ status_painting: "Not Started", udb_role: "Battleline" }), // 1 soft (unit)
      makeUnit({ udb_role: "Battleline" }),
      makeUnit({ udb_role: "Battleline" }),
    ];
    const stats = computeListHealthStats(units, 2000, "fresh");
    // 1 unit-level (Not painted) + 0 list-level (3 Battleline meets threshold, no stale)
    expect(stats.softWarningCount).toBe(1);
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
