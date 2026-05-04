/**
 * Phase 14 — computeSpendingStats pure aggregation tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 14-03 will:
 *   1. Create src/features/spending/computeSpendingStats.ts exporting
 *      `computeSpendingStats(units, factions, paintsPence): SpendingStats`
 *      per 14-RESEARCH.md §Pattern 3 (FactionSpend[] per faction; paintsPence
 *      separate; totalPence = sum(units) + paintsPence).
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions covering all 6 described cases plus the `u()` / `f()`
 *      builder fixtures from tests/dashboard/computeStats.test.ts.
 *
 * The stub exists in Wave 0 so Plan 14-03 has a concrete failing target to flip green.
 */
import { describe, it } from "vitest";

describe.skip("computeSpendingStats — SPEND-04 (faction breakdown + Paints row)", () => {
  it("returns empty factionBreakdown entries (paintedPence=0) when no units exist for any faction (CONTEXT.md: all 4 factions always shown)", () => {
    // Plan 14-03 will:
    //   - import { computeSpendingStats } from "@/features/spending/computeSpendingStats";
    //   - const factions = [f({ id: 1, name: "Tau" }), f({ id: 2, name: "Ultra" })];
    //   - const result = computeSpendingStats([], factions, 0);
    //   - expect(result.factionBreakdown).toHaveLength(2);
    //   - expect(result.factionBreakdown.every(b => b.pence === 0)).toBe(true);
    //   - expect(result.totalPence).toBe(0);
    //   - expect(result.paintsPence).toBe(0);
  });

  it("totalPence equals sum of all unit purchase_price_pence + paintsPence parameter", () => {
    // Plan 14-03 will:
    //   - const tau = f({ id: 1, name: "Tau" });
    //   - const units = [
    //       u({ id: 1, faction_id: 1, purchase_price_pence: 1500 }),
    //       u({ id: 2, faction_id: 1, purchase_price_pence: 2500 }),
    //     ];
    //   - const result = computeSpendingStats(units, [tau], 5500);
    //   - expect(result.totalPence).toBe(9500);     // 1500 + 2500 + 5500
    //   - expect(result.paintsPence).toBe(5500);    // pass-through
  });

  it("treats null purchase_price_pence as 0 (does not throw, does not return NaN)", () => {
    // Plan 14-03 will:
    //   - const tau = f({ id: 1, name: "Tau" });
    //   - const units = [
    //       u({ id: 1, faction_id: 1, purchase_price_pence: null }),
    //       u({ id: 2, faction_id: 1, purchase_price_pence: 1000 }),
    //     ];
    //   - const result = computeSpendingStats(units, [tau], 0);
    //   - expect(result.totalPence).toBe(1000);
    //   - expect(result.factionBreakdown[0].pence).toBe(1000);
    //   - expect(Number.isNaN(result.totalPence)).toBe(false);
  });

  it("groups unit pence by faction_id — one FactionSpend entry per faction in input order", () => {
    // Plan 14-03 will:
    //   - const tau = f({ id: 1, name: "Tau" });
    //   - const ultra = f({ id: 2, name: "Ultra" });
    //   - const units = [
    //       u({ id: 1, faction_id: 1, purchase_price_pence: 8500 }),
    //       u({ id: 2, faction_id: 2, purchase_price_pence: 6250 }),
    //       u({ id: 3, faction_id: 1, purchase_price_pence: 0 }),
    //     ];
    //   - const result = computeSpendingStats(units, [tau, ultra], 0);
    //   - expect(result.factionBreakdown).toHaveLength(2);
    //   - expect(result.factionBreakdown[0]).toMatchObject({ faction: tau, pence: 8500 });
    //   - expect(result.factionBreakdown[1]).toMatchObject({ faction: ultra, pence: 6250 });
  });

  it("ignores units whose faction_id does not appear in factions array (orphans excluded from breakdown but still counted in totalPence)", () => {
    // Plan 14-03 will:
    //   - const tau = f({ id: 1, name: "Tau" });
    //   - const orphanUnit = u({ id: 99, faction_id: 999, purchase_price_pence: 1000 });
    //   - const taggedUnit = u({ id: 1, faction_id: 1, purchase_price_pence: 500 });
    //   - const result = computeSpendingStats([orphanUnit, taggedUnit], [tau], 0);
    //   - expect(result.factionBreakdown).toHaveLength(1);
    //   - expect(result.factionBreakdown[0].pence).toBe(500);
    //   - expect(result.totalPence).toBe(1500);  // orphan still counted in grand total
    //   - // Note: confirm with implementer that orphan handling matches CONTEXT.md
    //   -        intent (or adjust assertions if implementation excludes orphans).
  });

  it("paintsPence pass-through is unchanged when units are empty", () => {
    // Plan 14-03 will:
    //   - const result = computeSpendingStats([], [], 5500);
    //   - expect(result.totalPence).toBe(5500);
    //   - expect(result.paintsPence).toBe(5500);
    //   - expect(result.factionBreakdown).toHaveLength(0);
  });
});
