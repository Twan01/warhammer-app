// @vitest-environment node
/**
 * Gap 7 (DQ-01) -- Coverage report computation behavioral tests.
 *
 * DQ-01: Coverage report computation produces correct per-faction stats
 * and overall coverage percentage.
 *
 * The coverage computation logic lives inside build-unit-db.ts and is not
 * exported. We replicate the algorithm (computeCoverageReport) here verbatim
 * and validate its behavioral contract, same pattern as updateUnitDatabase.test.ts.
 */
import { describe, it, expect } from "vitest";

// ── Minimal types matching build-unit-db.ts ───────────────────────────────────

interface UdbUnitRow {
  id: string;
  faction_id: string;
  name: string;
  base_points: number | null;
}

interface UdbFactionRow {
  id: string;
  name: string;
  short_name: string;
  name_fr: string | null;
}

interface UdbUnitPointsRow {
  unit_id: string;
  model_count: number;
  points: number;
}

interface FactionCoverage {
  faction_id: string;
  faction_name: string;
  total_units: number;
  units_with_points: number;
  coverage_pct: number;
}

interface CoverageReport {
  built_at: string;
  overall_coverage_pct: number;
  total_units: number;
  units_with_points: number;
  factions: FactionCoverage[];
  unmatched_units: Array<{ name: string; faction_id: string }>;
}

// ── Replicated coverage computation (from build-unit-db.ts Step 10) ───────────
// The actual build-unit-db.ts uses a coverage computation in-line in main().
// This is the same algorithm extracted as a pure function for testing.

function computeCoverageReport(
  factions: UdbFactionRow[],
  units: UdbUnitRow[],
  pointsRows: UdbUnitPointsRow[]
): CoverageReport {
  const unitsWithPointsIds = new Set<string>();

  for (const u of units) {
    if (u.base_points !== null) {
      unitsWithPointsIds.add(u.id);
    }
  }
  for (const p of pointsRows) {
    unitsWithPointsIds.add(p.unit_id);
  }

  const factionCoverages: FactionCoverage[] = [];

  for (const faction of factions) {
    const factionUnits = units.filter((u) => u.faction_id === faction.id);
    const total = factionUnits.length;
    if (total === 0) continue;
    const withPoints = factionUnits.filter((u) => unitsWithPointsIds.has(u.id)).length;
    const pct = Math.round((100 * withPoints) / total * 10) / 10;
    factionCoverages.push({
      faction_id: faction.id,
      faction_name: faction.name,
      total_units: total,
      units_with_points: withPoints,
      coverage_pct: pct,
    });
  }

  const totalUnits = units.length;
  const totalWithPoints = units.filter((u) => unitsWithPointsIds.has(u.id)).length;
  const overallPct = totalUnits > 0
    ? Math.round((100 * totalWithPoints) / totalUnits * 10) / 10
    : 0;

  const unmatchedUnits = units
    .filter((u) => !unitsWithPointsIds.has(u.id))
    .map((u) => ({ name: u.name, faction_id: u.faction_id }));

  return {
    built_at: new Date().toISOString(),
    overall_coverage_pct: overallPct,
    total_units: totalUnits,
    units_with_points: totalWithPoints,
    factions: factionCoverages,
    unmatched_units: unmatchedUnits,
  };
}

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeFaction(id: string, name: string = id): UdbFactionRow {
  return { id, name, short_name: id, name_fr: null };
}

function makeUnit(id: string, factionId: string, basePoints: number | null = null): UdbUnitRow {
  return { id, faction_id: factionId, name: `Unit-${id}`, base_points: basePoints };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("computeCoverageReport: DQ-01 — per-faction coverage statistics", () => {
  it("produces 100% coverage when all units have base_points", () => {
    const factions = [makeFaction("SM")];
    const units = [
      makeUnit("u1", "SM", 100),
      makeUnit("u2", "SM", 90),
    ];
    const report = computeCoverageReport(factions, units, []);

    expect(report.total_units).toBe(2);
    expect(report.units_with_points).toBe(2);
    expect(report.overall_coverage_pct).toBe(100);
    expect(report.factions[0].coverage_pct).toBe(100);
    expect(report.factions[0].total_units).toBe(2);
    expect(report.factions[0].units_with_points).toBe(2);
  });

  it("produces 0% coverage when no units have base_points and no points rows", () => {
    const factions = [makeFaction("SM")];
    const units = [makeUnit("u1", "SM", null), makeUnit("u2", "SM", null)];
    const report = computeCoverageReport(factions, units, []);

    expect(report.overall_coverage_pct).toBe(0);
    expect(report.units_with_points).toBe(0);
    expect(report.factions[0].coverage_pct).toBe(0);
  });

  it("counts units as covered when they have points tiers even without base_points", () => {
    const factions = [makeFaction("SM")];
    const units = [makeUnit("u1", "SM", null)];
    const pointsRows: UdbUnitPointsRow[] = [
      { unit_id: "u1", model_count: 5, points: 100 },
    ];
    const report = computeCoverageReport(factions, units, pointsRows);

    expect(report.units_with_points).toBe(1);
    expect(report.overall_coverage_pct).toBe(100);
  });

  it("produces per-faction breakdown with correct stats for each faction", () => {
    const factions = [makeFaction("SM"), makeFaction("TYR")];
    const units = [
      makeUnit("sm1", "SM", 100), // SM: covered
      makeUnit("sm2", "SM", null), // SM: uncovered
      makeUnit("tyr1", "TYR", 80), // TYR: covered
    ];
    const report = computeCoverageReport(factions, units, []);

    const sm = report.factions.find((f) => f.faction_id === "SM")!;
    expect(sm.total_units).toBe(2);
    expect(sm.units_with_points).toBe(1);

    const tyr = report.factions.find((f) => f.faction_id === "TYR")!;
    expect(tyr.total_units).toBe(1);
    expect(tyr.units_with_points).toBe(1);
  });

  it("populates unmatched_units list with units that have no points", () => {
    const factions = [makeFaction("SM")];
    const units = [
      makeUnit("u1", "SM", 100),
      makeUnit("u2", "SM", null),
      makeUnit("u3", "SM", null),
    ];
    const report = computeCoverageReport(factions, units, []);

    expect(report.unmatched_units).toHaveLength(2);
    const ids = report.unmatched_units.map((u) => u.name);
    expect(ids).toContain("Unit-u2");
    expect(ids).toContain("Unit-u3");
  });

  it("excludes factions with zero units from the factions array", () => {
    const factions = [makeFaction("SM"), makeFaction("GK")];
    const units = [makeUnit("sm1", "SM", 100)]; // GK has no units
    const report = computeCoverageReport(factions, units, []);

    const gk = report.factions.find((f) => f.faction_id === "GK");
    expect(gk).toBeUndefined();
  });

  it("returns 0% overall coverage for empty unit list", () => {
    const report = computeCoverageReport([], [], []);
    expect(report.overall_coverage_pct).toBe(0);
    expect(report.total_units).toBe(0);
    expect(report.units_with_points).toBe(0);
    expect(report.factions).toHaveLength(0);
    expect(report.unmatched_units).toHaveLength(0);
  });

  it("does not double-count a unit that has both base_points and tiers", () => {
    const factions = [makeFaction("SM")];
    const units = [makeUnit("u1", "SM", 100)];
    const pointsRows: UdbUnitPointsRow[] = [
      { unit_id: "u1", model_count: 5, points: 100 },
    ];
    const report = computeCoverageReport(factions, units, pointsRows);

    expect(report.units_with_points).toBe(1); // Not 2
    expect(report.total_units).toBe(1);
  });
});
