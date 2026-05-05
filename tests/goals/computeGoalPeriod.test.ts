/**
 * Phase 22 — computeGoalPeriod / currentPeriod / deriveGoalStatus pure-function tests.
 *
 * Plan 22-01: Wave 0 stubs activated with real test bodies.
 * todayISO is mocked to "2026-05-05" for deterministic isExpired checks.
 *
 * Covers ANLY-02 (period boundary math: month + quarter start/end/label),
 *         ANLY-03 (deriveGoalStatus ordering: completed before missed before active).
 */

import { describe, it, expect, vi } from "vitest";
import { computeGoalPeriod, currentPeriod, deriveGoalStatus } from "@/features/goals/computeGoalPeriod";

// Mock todayISO to a fixed date for deterministic isExpired tests
vi.mock("@/lib/dates", () => ({
  todayISO: () => "2026-05-05",
}));

describe("computeGoalPeriod (ANLY-02)", () => {
  it("returns correct startDate/endDate for month '2026-05'", () => {
    const result = computeGoalPeriod("month", "2026-05");
    expect(result.startDate).toBe("2026-05-01");
    expect(result.endDate).toBe("2026-05-31");
  });

  it("returns correct startDate/endDate for quarter '2026-Q2'", () => {
    const result = computeGoalPeriod("quarter", "2026-Q2");
    expect(result.startDate).toBe("2026-04-01");
    expect(result.endDate).toBe("2026-06-30");
  });

  it("returns correct endDate for Q4 (December 31)", () => {
    const result = computeGoalPeriod("quarter", "2026-Q4");
    expect(result.endDate).toBe("2026-12-31");
  });

  it("returns label 'May 2026' for month '2026-05'", () => {
    const result = computeGoalPeriod("month", "2026-05");
    expect(result.label).toBe("May 2026");
  });

  it("returns label 'Q2 2026' for quarter '2026-Q2'", () => {
    const result = computeGoalPeriod("quarter", "2026-Q2");
    expect(result.label).toBe("Q2 2026");
  });
});

describe("currentPeriod (ANLY-01)", () => {
  it("returns 'YYYY-MM' format for timeframe 'month'", () => {
    // todayISO() is mocked to "2026-05-05"
    const result = currentPeriod("month");
    expect(result).toMatch(/^\d{4}-\d{2}$/);
    expect(result).toBe("2026-05");
  });

  it("returns 'YYYY-QN' format for timeframe 'quarter'", () => {
    // todayISO() is mocked to "2026-05-05" → Q2
    const result = currentPeriod("quarter");
    expect(result).toMatch(/^\d{4}-Q[1-4]$/);
    expect(result).toBe("2026-Q2");
  });
});

describe("deriveGoalStatus (ANLY-03)", () => {
  it("returns 'completed' when progressCount >= targetCount (even if expired)", () => {
    // Pitfall 4: completed check BEFORE expired
    expect(deriveGoalStatus(5, 3, true)).toBe("completed");
    expect(deriveGoalStatus(3, 3, true)).toBe("completed");
  });

  it("returns 'missed' when expired and progress < target", () => {
    expect(deriveGoalStatus(2, 5, true)).toBe("missed");
  });

  it("returns 'active' when not expired and progress < target", () => {
    expect(deriveGoalStatus(2, 5, false)).toBe("active");
  });
});
