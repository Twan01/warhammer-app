/**
 * Phase 138-03 PLAY-04 D-06: applyUnitFilters udbUnitIdFilter tests.
 *
 * Extends the existing unitFilters.test.ts coverage with the new
 * udbUnitIdFilter clause for the Collection deep-link feature.
 *
 * Also re-exports the existing filter tests (combined file).
 */
import { describe, it, expect } from "vitest";
import { applyUnitFilters } from "@/features/units/applyUnitFilters";
import type { Unit } from "@/types/unit";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

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
    status_assembly_override: 0 as 0 | 1,
    status_basing_override: 0 as 0 | 1,
    status_varnished_override: 0 as 0 | 1,
    udb_unit_id: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...over,
  };
}

const empty = {
  search: "",
  factions: [],
  statuses: [],
  categories: [],
  activeOnly: false,
  battleReady: false,
};

// ---------------------------------------------------------------------------
// udbUnitIdFilter
// ---------------------------------------------------------------------------

describe("applyUnitFilters — udbUnitIdFilter (D-06 deep-link)", () => {
  it("null udbUnitIdFilter is a no-op (all units pass through)", () => {
    const data = [
      u({ id: 1, udb_unit_id: "udb-1" }),
      u({ id: 2, udb_unit_id: "udb-2" }),
      u({ id: 3, udb_unit_id: null }),
    ];
    const result = applyUnitFilters(data, { ...empty, udbUnitIdFilter: null });
    expect(result).toHaveLength(3);
  });

  it("undefined udbUnitIdFilter is a no-op (backward compatibility)", () => {
    const data = [
      u({ id: 1, udb_unit_id: "udb-1" }),
      u({ id: 2, udb_unit_id: null }),
    ];
    // udbUnitIdFilter absent from the object entirely
    const result = applyUnitFilters(data, { ...empty });
    expect(result).toHaveLength(2);
  });

  it("filters to only units whose udb_unit_id === the filter value", () => {
    const data = [
      u({ id: 1, udb_unit_id: "udb-intercessors" }),
      u({ id: 2, udb_unit_id: "udb-terminators" }),
      u({ id: 3, udb_unit_id: null }),
    ];
    const result = applyUnitFilters(data, {
      ...empty,
      udbUnitIdFilter: "udb-intercessors",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("excludes units with null udb_unit_id when filter is active", () => {
    const data = [
      u({ id: 1, udb_unit_id: "udb-1" }),
      u({ id: 2, udb_unit_id: null }),
    ];
    const result = applyUnitFilters(data, {
      ...empty,
      udbUnitIdFilter: "udb-1",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns empty when no unit matches the udb id", () => {
    const data = [
      u({ id: 1, udb_unit_id: "udb-1" }),
      u({ id: 2, udb_unit_id: "udb-2" }),
    ];
    const result = applyUnitFilters(data, {
      ...empty,
      udbUnitIdFilter: "udb-999",
    });
    expect(result).toHaveLength(0);
  });

  it("composes with other filters (AND logic)", () => {
    const data = [
      u({ id: 1, udb_unit_id: "udb-1", faction_id: 1 }),
      u({ id: 2, udb_unit_id: "udb-1", faction_id: 2 }),
      u({ id: 3, udb_unit_id: "udb-2", faction_id: 1 }),
    ];
    // udbUnitIdFilter="udb-1" AND faction=1 → only id 1
    const result = applyUnitFilters(data, {
      ...empty,
      factions: [1],
      udbUnitIdFilter: "udb-1",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});
