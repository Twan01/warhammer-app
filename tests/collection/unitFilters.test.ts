/**
 * COLL-02..06 — pre-filter logic for the unit table.
 * Tests for applyUnitFilters pure function.
 */
import { describe, it, expect } from "vitest";
import { applyUnitFilters } from "@/features/units/applyUnitFilters";
import type { Unit } from "@/types/unit";

function u(over: Partial<Unit>): Unit {
  return {
    id: 1, faction_id: 1, name: "X",
    category: null, unit_type: null,
    model_count: null, owned_count: null, points: null,
    status_assembly: 0, status_painting: "Not Started",
    painting_percentage: 0,
    status_basing: 0, status_varnished: 0, is_active_project: 0,
    priority: null, target_completion_date: null,
    purchase_date: null, purchase_price_pence: null,
    storage_location: null, main_image_path: null, notes: null,
    lore_notes: null, undercoat: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...over,
  };
}
const empty = { search: "", factions: [], statuses: [], categories: [], activeOnly: false };

describe("unitFilters", () => {
  describe("search", () => {
    it("COLL-02: returns all units when search is empty", () => {
      const data = [u({ id: 1, name: "Fire Warriors" }), u({ id: 2, name: "Crisis" })];
      expect(applyUnitFilters(data, empty)).toHaveLength(2);
    });
    it("COLL-02: filters case-insensitive substring on name", () => {
      const data = [u({ id: 1, name: "Tau Fire Warriors" }), u({ id: 2, name: "Crisis" })];
      expect(applyUnitFilters(data, { ...empty, search: "tau" })).toHaveLength(1);
      expect(applyUnitFilters(data, { ...empty, search: "TAU" })).toHaveLength(1);
      expect(applyUnitFilters(data, { ...empty, search: "warri" })).toHaveLength(1);
      expect(applyUnitFilters(data, { ...empty, search: "zzz" })).toHaveLength(0);
    });
  });
  describe("faction", () => {
    it("COLL-03: empty factions array returns all", () => {
      const data = [u({ id: 1, faction_id: 1 }), u({ id: 2, faction_id: 2 })];
      expect(applyUnitFilters(data, empty)).toHaveLength(2);
    });
    it("COLL-03: filters by single faction id", () => {
      const data = [u({ id: 1, faction_id: 1 }), u({ id: 2, faction_id: 2 })];
      expect(applyUnitFilters(data, { ...empty, factions: [1] })).toHaveLength(1);
      expect(applyUnitFilters(data, { ...empty, factions: [1] })[0].id).toBe(1);
    });
    it("COLL-03: filters by multi-select faction ids (OR)", () => {
      const data = [u({ id: 1, faction_id: 1 }), u({ id: 2, faction_id: 2 }), u({ id: 3, faction_id: 3 })];
      expect(applyUnitFilters(data, { ...empty, factions: [1, 3] })).toHaveLength(2);
    });
  });
  describe("status", () => {
    it("COLL-04: empty statuses returns all", () => {
      const data = [u({ id: 1, status_painting: "Built" }), u({ id: 2, status_painting: "Primed" })];
      expect(applyUnitFilters(data, empty)).toHaveLength(2);
    });
    it("COLL-04: filters by multi-select statuses (OR)", () => {
      const data = [
        u({ id: 1, status_painting: "Built" }),
        u({ id: 2, status_painting: "Primed" }),
        u({ id: 3, status_painting: "Completed" }),
      ];
      expect(applyUnitFilters(data, { ...empty, statuses: ["Built", "Completed"] })).toHaveLength(2);
    });
  });
  describe("category", () => {
    it("COLL-05: empty categories returns all", () => {
      const data = [u({ id: 1, category: "Infantry" }), u({ id: 2, category: null })];
      expect(applyUnitFilters(data, empty)).toHaveLength(2);
    });
    it("COLL-05: filters by multi-select categories", () => {
      const data = [
        u({ id: 1, category: "Infantry" }),
        u({ id: 2, category: "Vehicle" }),
        u({ id: 3, category: "Elite" }),
      ];
      expect(applyUnitFilters(data, { ...empty, categories: ["Infantry", "Elite"] })).toHaveLength(2);
    });
    it("COLL-05: excludes null category when categories filter is active", () => {
      const data = [u({ id: 1, category: "Infantry" }), u({ id: 2, category: null })];
      expect(applyUnitFilters(data, { ...empty, categories: ["Infantry"] })).toHaveLength(1);
    });
  });
  describe("active", () => {
    it("COLL-06: activeOnly=false returns all", () => {
      const data = [u({ id: 1, is_active_project: 1 }), u({ id: 2, is_active_project: 0 })];
      expect(applyUnitFilters(data, empty)).toHaveLength(2);
    });
    it("COLL-06: activeOnly=true keeps only is_active_project=1", () => {
      const data = [u({ id: 1, is_active_project: 1 }), u({ id: 2, is_active_project: 0 })];
      const out = applyUnitFilters(data, { ...empty, activeOnly: true });
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe(1);
    });
  });
  describe("composition", () => {
    it("AND combines multiple filters", () => {
      const data = [
        u({ id: 1, name: "Tau Fire Warriors", faction_id: 1, status_painting: "Built", category: "Infantry", is_active_project: 1 }),
        u({ id: 2, name: "Tau Crisis",        faction_id: 1, status_painting: "Built", category: "Elite",    is_active_project: 0 }),
        u({ id: 3, name: "Necron Warriors",   faction_id: 2, status_painting: "Built", category: "Infantry", is_active_project: 1 }),
      ];
      const out = applyUnitFilters(data, {
        search: "tau", factions: [1], statuses: ["Built"], categories: ["Infantry"], activeOnly: true,
      });
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe(1);
    });
  });
});
