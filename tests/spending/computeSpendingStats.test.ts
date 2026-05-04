/**
 * Phase 14 — computeSpendingStats pure aggregation tests.
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
    created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

function f(over: Partial<Faction>): Faction {
  return {
    id: 1, name: "F", game_system: "Warhammer 40K",
    description: null, color_theme: "#3a4f96",
    icon_path: null,
    created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

describe("computeSpendingStats — SPEND-04 (faction breakdown + Paints row)", () => {
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

  it("groups unit pence by faction_id — one FactionSpend entry per faction in input order", () => {
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
