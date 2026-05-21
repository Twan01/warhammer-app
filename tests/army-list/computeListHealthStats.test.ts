/**
 * Phase 91 — computeListHealthStats enhancement total tests (ENH-03).
 *
 * Pure function tests — no mocks needed. Validates that the optional
 * 4th parameter (enhancementTotal) is correctly added to totalPoints
 * and reflected in the pointsExceeded flag.
 */
import { describe, it, expect } from "vitest";
import { computeListHealthStats } from "@/lib/computeUnitWarnings";
import type { ArmyListUnitRow } from "@/types/armyList";

/** Minimal ArmyListUnitRow fixture with only the fields computeListHealthStats reads. */
function makeUnit(pts: number): ArmyListUnitRow {
  return {
    id: 1,
    list_id: 1,
    unit_id: 1,
    points_override: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    unit_name: "Test Unit",
    unit_points: pts,
    effective_points: pts,
    faction_id: 1,
    status_assembly: 1,
    status_painting: "Not Started",
    painting_percentage: 0,
    tactical_role: null,
    synced_points: null,
    override_points: null,
  };
}

describe("computeListHealthStats — enhancement total (ENH-03)", () => {
  it("includes enhancementTotal in totalPoints", () => {
    const units = [makeUnit(850)];
    const stats = computeListHealthStats(units, 1000, "fresh", 60);
    expect(stats.totalPoints).toBe(910);
  });

  it("triggers pointsExceeded when combined total exceeds limit", () => {
    const units = [makeUnit(950)];
    const stats = computeListHealthStats(units, 1000, "fresh", 60);
    expect(stats.pointsExceeded).toBe(true);
  });

  it("does NOT trigger pointsExceeded when combined is at limit", () => {
    const units = [makeUnit(940)];
    const stats = computeListHealthStats(units, 1000, "fresh", 60);
    expect(stats.pointsExceeded).toBe(false);
  });

  it("backward compat: 3-arg call returns unit points only", () => {
    const units = [makeUnit(500)];
    const stats = computeListHealthStats(units, 1000, "fresh");
    expect(stats.totalPoints).toBe(500);
    expect(stats.pointsExceeded).toBe(false);
  });

  it("enhancementTotal = 0 is same as omit", () => {
    const units = [makeUnit(500)];
    const stats = computeListHealthStats(units, 1000, "fresh", 0);
    expect(stats.totalPoints).toBe(500);
    expect(stats.pointsExceeded).toBe(false);
  });
});
