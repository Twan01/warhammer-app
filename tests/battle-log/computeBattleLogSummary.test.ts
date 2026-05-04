/**
 * Phase 18 — computeBattleLogSummary pure-function tests.
 *
 * Covers BATTLE-04 (chronological list summary bar): the W/L/D counts and
 * win-rate percent shown above the log list are derived in JS from the
 * GROUP BY rows returned by getBattleLogSummary().
 *
 * Pure function — no mocks needed. Mirrors tests/spending/computeSpendingStats.test.ts.
 */
import { describe, it, expect } from "vitest";
import { computeBattleLogSummary } from "@/features/battle-log/computeBattleLogSummary";

describe("computeBattleLogSummary — BATTLE-04 (summary bar aggregation)", () => {
  it("returns total=0, wins=0, losses=0, draws=0, winRate=0 for an empty rows array", () => {
    const result = computeBattleLogSummary([]);
    expect(result).toEqual({ total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 });
  });

  it("counts wins, losses, draws separately by exact string match on row.result ('Win', 'Loss', 'Draw')", () => {
    const result = computeBattleLogSummary([
      { result: "Win", count: 5 },
      { result: "Loss", count: 2 },
      { result: "Draw", count: 1 },
    ]);
    expect(result).toEqual({ total: 8, wins: 5, losses: 2, draws: 1, winRate: 63 });
  });

  it("treats missing result categories as 0 (rows array missing a 'Loss' entry returns losses=0, not undefined)", () => {
    const result = computeBattleLogSummary([{ result: "Win", count: 3 }]);
    expect(result).toEqual({ wins: 3, losses: 0, draws: 0, total: 3, winRate: 100 });
  });

  it("computes winRate as Math.round((wins / total) * 100) — integer percent, no decimal", () => {
    const result = computeBattleLogSummary([
      { result: "Win", count: 1 },
      { result: "Loss", count: 2 },
    ]);
    expect(result.winRate).toBe(33);
  });

  it("returns winRate=0 when total=0 (does NOT throw or return NaN from divide-by-zero)", () => {
    const result = computeBattleLogSummary([]);
    expect(result.winRate).toBe(0);
    expect(Number.isNaN(result.winRate)).toBe(false);
  });

  it("ignores rows whose result string does not match 'Win' | 'Loss' | 'Draw' exactly (case-sensitive — 'win' is ignored)", () => {
    const result = computeBattleLogSummary([{ result: "win", count: 5 }]);
    expect(result).toEqual({ wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 });
  });
});
