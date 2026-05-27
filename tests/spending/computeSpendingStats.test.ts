/**
 * Phase 14 â€” computeSpendingStats pure aggregation tests.
 *
 * Verifies SPEND-04 contract: per-faction breakdown + Paints row.
 * Test fixture pattern mirrors tests/dashboard/computeStats.test.ts.
 */
import { describe, it, expect } from "vitest";
import { computeSpendingStats } from "@/features/spending/computeSpendingStats";
import type { Unit, PaintingStatus } from "@/types/unit";
import type { Faction } from "@/types/faction";

function u(over: Partial<Unit>): Unit {
  return {
    id: 1, faction_id: 1, name: "X",
    category: null, unit_type: null,
    model_count: null, owned_count: null, points: null,
    status_assembly: 0, status_painting: "Not Started" as PaintingStatus,
    painting_percentage: 0,
    status_basing: 0, status_varnished: 0, is_active_project: 0,
    priority: null, target_completion_date: null,
    purchase_date: null, purchase_price_pence: null,
    storage_location: null, main_image_path: null, notes: null,
    lore_notes: null, undercoat: null,
    created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function f(over: Partial<Faction>): Faction {
  return {
    id: 1, name: "F", game_system: "Warhammer 40K",
    description: null, color_theme: "#3a4f96",
    icon_path: null, lore_notes: null,
    created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

describe("computeSpendingStats â€” DATA-03/04 (cost per model + value split)", () => {
  it("Test 1: costPerCompletedModelPence is null when no units have status_painting === 'Completed'", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: 1500, status_painting: "Not Started" }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 2500, status_painting: "Built" }),
    ];
    const result = computeSpendingStats(units, [tau], 0);
    expect(result.costPerCompletedModelPence).toBeNull();
  });

  it("Test 2: costPerCompletedModelPence equals Math.round(paintedValuePence / completedCount) when Completed units exist", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: 1500, status_painting: "Not Started" }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 2500, status_painting: "Completed" }),
    ];
    // paintedValuePence = 2500 (only completed unit), completedCount = 1 => 2500/1 = 2500
    const result = computeSpendingStats(units, [tau], 0);
    expect(result.costPerCompletedModelPence).toBe(2500);
  });

  it("Test 3: costPerCompletedModelPence is Math.round'd when not evenly divisible (10000 / 3 Completed = 3333)", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: 3000, status_painting: "Completed" }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 4000, status_painting: "Completed" }),
      u({ id: 3, faction_id: 1, purchase_price_pence: 3000, status_painting: "Completed" }),
    ];
    // unitTotalPence = 10000, completedCount = 3 => Math.round(10000/3) = Math.round(3333.33) = 3333
    const result = computeSpendingStats(units, [tau], 0);
    expect(result.costPerCompletedModelPence).toBe(Math.round(10000 / 3));
  });

  it("Test 4: paintedValuePence equals sum of purchase_price_pence for Completed units only", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: 1500, status_painting: "Not Started" }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 2500, status_painting: "Completed" }),
      u({ id: 3, faction_id: 1, purchase_price_pence: 3000, status_painting: "Completed" }),
    ];
    const result = computeSpendingStats(units, [tau], 0);
    expect(result.paintedValuePence).toBe(5500);
  });

  it("Test 5: unpaintedValuePence equals unitTotalPence minus paintedValuePence (excludes paintsPence)", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: 1500, status_painting: "Not Started" }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 2500, status_painting: "Completed" }),
    ];
    // unitTotalPence = 4000, paintedValuePence = 2500, unpaintedValuePence = 4000 - 2500 = 1500
    const result = computeSpendingStats(units, [tau], 9999); // paintsPence intentionally high â€” must not count
    expect(result.unpaintedValuePence).toBe(1500);
  });

  it("Test 6: paintedValuePence + unpaintedValuePence === unitTotalPence (invariant)", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: 1500, status_painting: "Not Started" }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 2500, status_painting: "Completed" }),
      u({ id: 3, faction_id: 1, purchase_price_pence: 3000, status_painting: "Primed" }),
    ];
    const result = computeSpendingStats(units, [tau], 5000);
    const unitTotalPence = 1500 + 2500 + 3000;
    expect(result.paintedValuePence + result.unpaintedValuePence).toBe(unitTotalPence);
  });

  it("Test 7: null purchase_price_pence on a Completed unit is treated as 0 (not NaN)", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: null, status_painting: "Completed" }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 2000, status_painting: "Completed" }),
    ];
    const result = computeSpendingStats(units, [tau], 0);
    expect(result.paintedValuePence).toBe(2000);
    expect(Number.isNaN(result.paintedValuePence)).toBe(false);
    expect(Number.isNaN(result.costPerCompletedModelPence)).toBe(false);
  });
});

describe("computeSpendingStats â€” SPEND-04 (faction breakdown + Paints row)", () => {
  it("returns empty factionBreakdown entries (paintedPence=0) when no units exist for any faction (CONTEXT.md: all 4 factions always shown)", () => {
    const factions = [f({ id: 1, name: "Tau" }), f({ id: 2, name: "Ultra" })];
    const result = computeSpendingStats([], factions, 0);
    expect(result.factionBreakdown).toHaveLength(2);
    expect(result.factionBreakdown.every(b => b.pence === 0)).toBe(true);
    expect(result.totalPence).toBe(0);
    expect(result.paintsPence).toBe(0);
  });

  it("totalPence equals sum of all unit purchase_price_pence + paintsPence parameter", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: 1500 }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 2500 }),
    ];
    const result = computeSpendingStats(units, [tau], 5500);
    expect(result.totalPence).toBe(9500);
    expect(result.paintsPence).toBe(5500);
  });

  it("treats null purchase_price_pence as 0 (does not throw, does not return NaN)", () => {
    const tau = f({ id: 1, name: "Tau" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: null }),
      u({ id: 2, faction_id: 1, purchase_price_pence: 1000 }),
    ];
    const result = computeSpendingStats(units, [tau], 0);
    expect(result.totalPence).toBe(1000);
    expect(result.factionBreakdown[0].pence).toBe(1000);
    expect(Number.isNaN(result.totalPence)).toBe(false);
  });

  it("groups unit pence by faction_id â€” one FactionSpend entry per faction in input order", () => {
    const tau = f({ id: 1, name: "Tau" });
    const ultra = f({ id: 2, name: "Ultra" });
    const units = [
      u({ id: 1, faction_id: 1, purchase_price_pence: 8500 }),
      u({ id: 2, faction_id: 2, purchase_price_pence: 6250 }),
      u({ id: 3, faction_id: 1, purchase_price_pence: 0 }),
    ];
    const result = computeSpendingStats(units, [tau, ultra], 0);
    expect(result.factionBreakdown).toHaveLength(2);
    expect(result.factionBreakdown[0]).toMatchObject({ faction: tau, pence: 8500 });
    expect(result.factionBreakdown[1]).toMatchObject({ faction: ultra, pence: 6250 });
  });

  it("ignores units whose faction_id does not appear in factions array (orphans excluded from breakdown but still counted in totalPence)", () => {
    const tau = f({ id: 1, name: "Tau" });
    const orphanUnit = u({ id: 99, faction_id: 999, purchase_price_pence: 1000 });
    const taggedUnit = u({ id: 1, faction_id: 1, purchase_price_pence: 500 });
    const result = computeSpendingStats([orphanUnit, taggedUnit], [tau], 0);
    expect(result.factionBreakdown).toHaveLength(1);
    expect(result.factionBreakdown[0].pence).toBe(500);
    expect(result.totalPence).toBe(1500);  // orphan still counted in grand total
  });

  it("paintsPence pass-through is unchanged when units are empty", () => {
    const result = computeSpendingStats([], [], 5500);
    expect(result.totalPence).toBe(5500);
    expect(result.paintsPence).toBe(5500);
    expect(result.factionBreakdown).toHaveLength(0);
  });
});
