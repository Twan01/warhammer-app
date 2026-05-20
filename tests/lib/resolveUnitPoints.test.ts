import { describe, expect, it } from "vitest";
import { resolveUnitPoints } from "@/lib/resolveUnitPoints";
import type { ResolvedPoints, PointsSource } from "@/lib/resolveUnitPoints";

describe("resolveUnitPoints", () => {
  it("returns 'override' source when points_override is set", () => {
    const result = resolveUnitPoints({
      points_override: 100,
      tier_points: null,
      synced_points: 95,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 100, source: "override" });
  });

  it("returns 'synced' source when points_override is null", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: null,
      synced_points: 95,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 95, source: "synced" });
  });

  it("returns 'user-override' source when points_override and synced_points are null", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: null,
      synced_points: null,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 80, source: "user-override" });
  });

  it("returns 'base' source when only unit_points is set", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: null,
      synced_points: null,
      override_points: null,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 75, source: "base" });
  });

  it("returns 'unknown' with 0 points when all values are null", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: null,
      synced_points: null,
      override_points: null,
      unit_points: null,
    });
    expect(result).toEqual({ points: 0, source: "unknown" });
  });

  it("handles 0 as a valid value (not null) for points_override", () => {
    const result = resolveUnitPoints({
      points_override: 0,
      tier_points: null,
      synced_points: 95,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 0, source: "override" });
  });

  it("handles 0 as a valid value for synced_points", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: null,
      synced_points: 0,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 0, source: "synced" });
  });

  it("handles 0 as a valid value for override_points", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: null,
      synced_points: null,
      override_points: 0,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 0, source: "user-override" });
  });

  it("handles 0 as a valid value for unit_points", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: null,
      synced_points: null,
      override_points: null,
      unit_points: 0,
    });
    expect(result).toEqual({ points: 0, source: "base" });
  });

  it("satisfies ResolvedPoints type contract", () => {
    const result: ResolvedPoints = resolveUnitPoints({
      points_override: 100,
      tier_points: null,
      synced_points: null,
      override_points: null,
      unit_points: null,
    });
    const source: PointsSource = result.source;
    expect(typeof result.points).toBe("number");
    expect(["override", "tier", "synced", "user-override", "base", "unknown"]).toContain(source);
  });

  // Phase 89: tier_points tests
  it("returns 'tier' source when points_override is null and tier_points is set", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: 110,
      synced_points: 95,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 110, source: "tier" });
  });

  it("tier_points takes priority over synced_points but not points_override", () => {
    const result = resolveUnitPoints({
      points_override: 200,
      tier_points: 110,
      synced_points: 95,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 200, source: "override" });
  });

  it("handles 0 as a valid value for tier_points (strict != null check)", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: 0,
      synced_points: 95,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 0, source: "tier" });
  });

  it("tier_points null falls through to synced_points", () => {
    const result = resolveUnitPoints({
      points_override: null,
      tier_points: null,
      synced_points: 95,
      override_points: 80,
      unit_points: 75,
    });
    expect(result).toEqual({ points: 95, source: "synced" });
  });
});
