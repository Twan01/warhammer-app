import { describe, expect, it } from "vitest";
import {
  computeUnitReadiness,
  type ReadinessInput,
  type UnitReadiness,
} from "@/lib/readiness";

// ---------------------------------------------------------------------------
// Factory helper — creates an all-passing (battle-ready) input by default
// ---------------------------------------------------------------------------
function makeInput(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    status_painting: "Completed",
    status_assembly: 1,
    status_basing: 1,
    status_varnished: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeUnitReadiness
// ---------------------------------------------------------------------------
describe("computeUnitReadiness", () => {
  // --- All-pass case ---
  it("returns all true when every condition is met", () => {
    const result = computeUnitReadiness(makeInput());
    expect(result).toEqual<UnitReadiness>({
      assembled: true,
      painted: true,
      based: true,
      varnished: true,
      battleReady: true,
    });
  });

  // --- Each field failing individually ---
  it("assembled is false when status_assembly === 0", () => {
    const result = computeUnitReadiness(makeInput({ status_assembly: 0 }));
    expect(result.assembled).toBe(false);
    expect(result.battleReady).toBe(false);
  });

  it("painted is false when status_painting !== 'Completed'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Primed" }));
    expect(result.painted).toBe(false);
    expect(result.battleReady).toBe(false);
  });

  it("based is false when status_basing === 0", () => {
    const result = computeUnitReadiness(makeInput({ status_basing: 0 }));
    expect(result.based).toBe(false);
    expect(result.battleReady).toBe(false);
  });

  it("varnished is false when status_varnished === 0", () => {
    const result = computeUnitReadiness(makeInput({ status_varnished: 0 }));
    expect(result.varnished).toBe(false);
    expect(result.battleReady).toBe(false);
  });

  // --- All-fail case ---
  it("returns all false when every condition fails", () => {
    const result = computeUnitReadiness(makeInput({
      status_painting: "Not Started",
      status_assembly: 0,
      status_basing: 0,
      status_varnished: 0,
    }));
    expect(result).toEqual<UnitReadiness>({
      assembled: false,
      painted: false,
      based: false,
      varnished: false,
      battleReady: false,
    });
  });

  // --- Non-Completed painting statuses ---
  it("painted is false for 'Not Started'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Not Started" }));
    expect(result.painted).toBe(false);
  });

  it("painted is false for 'Built'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Built" }));
    expect(result.painted).toBe(false);
  });

  it("painted is false for 'Basecoated'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Basecoated" }));
    expect(result.painted).toBe(false);
  });

  it("painted is false for 'Shaded'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Shaded" }));
    expect(result.painted).toBe(false);
  });

  it("painted is false for 'Layered'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Layered" }));
    expect(result.painted).toBe(false);
  });

  it("painted is false for 'Highlighted'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Highlighted" }));
    expect(result.painted).toBe(false);
  });

  it("painted is false for 'Details Done'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Details Done" }));
    expect(result.painted).toBe(false);
  });

  it("painted is false for 'Based'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Based" }));
    expect(result.painted).toBe(false);
  });

  it("painted is false for 'Varnished'", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Varnished" }));
    expect(result.painted).toBe(false);
  });

  // --- battleReady requires ALL four conditions ---
  it("battleReady is false when only painting is incomplete (others pass)", () => {
    const result = computeUnitReadiness(makeInput({ status_painting: "Highlighted" }));
    expect(result.assembled).toBe(true);
    expect(result.based).toBe(true);
    expect(result.varnished).toBe(true);
    expect(result.painted).toBe(false);
    expect(result.battleReady).toBe(false);
  });

  it("battleReady is false when only assembly is incomplete (others pass)", () => {
    const result = computeUnitReadiness(makeInput({ status_assembly: 0 }));
    expect(result.painted).toBe(true);
    expect(result.based).toBe(true);
    expect(result.varnished).toBe(true);
    expect(result.assembled).toBe(false);
    expect(result.battleReady).toBe(false);
  });
});
