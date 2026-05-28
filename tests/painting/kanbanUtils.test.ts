/**
 * PROJ-01, PROJ-02, PROJ-07 — Kanban pure-function utilities.
 */
import { describe, it, expect } from "vitest";
import {
  applyActiveFilter,
  groupByStatus,
  sortKanbanCards,
  getVisibleColumns,
} from "@/features/painting-projects/kanbanUtils";
import { PAINTING_STATUS_ORDER, type Unit } from "@/types/unit";

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
    lore_notes: null, undercoat: null, status_assembly_override: 0 as 0 | 1, status_basing_override: 0 as 0 | 1, status_varnished_override: 0 as 0 | 1,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...over,
  };
}

describe("PROJ-01 applyActiveFilter", () => {
  it("returns [] for empty input", () => {
    expect(applyActiveFilter([])).toEqual([]);
  });
  it("returns only units with is_active_project === 1", () => {
    const data = [u({ id: 1, is_active_project: 1 }), u({ id: 2, is_active_project: 0 })];
    expect(applyActiveFilter(data)).toHaveLength(1);
    expect(applyActiveFilter(data)[0].id).toBe(1);
  });
  it("excludes units with is_active_project === 0", () => {
    const data = [u({ id: 1, is_active_project: 0 }), u({ id: 2, is_active_project: 0 })];
    expect(applyActiveFilter(data)).toEqual([]);
  });
});

describe("PROJ-02 groupByStatus", () => {
  it("returns object with every PaintingStatus key present", () => {
    const grouped = groupByStatus([]);
    for (const status of PAINTING_STATUS_ORDER) {
      expect(grouped[status]).toEqual([]);
    }
  });
  it("buckets units by status_painting", () => {
    const data = [
      u({ id: 1, status_painting: "Built" }),
      u({ id: 2, status_painting: "Built" }),
      u({ id: 3, status_painting: "Layered" }),
    ];
    const grouped = groupByStatus(data);
    expect(grouped["Built"]).toHaveLength(2);
    expect(grouped["Layered"]).toHaveLength(1);
    expect(grouped["Not Started"]).toEqual([]);
  });
});

describe("PROJ-07 sortKanbanCards", () => {
  it("sorts by priority ASC", () => {
    const data = [u({ id: 1, priority: 3 }), u({ id: 2, priority: 1 }), u({ id: 3, priority: 2 })];
    expect(sortKanbanCards(data).map((x) => x.id)).toEqual([2, 3, 1]);
  });
  it("places null priority last", () => {
    const data = [u({ id: 1, priority: null }), u({ id: 2, priority: 1 })];
    expect(sortKanbanCards(data).map((x) => x.id)).toEqual([2, 1]);
  });
  it("breaks priority ties by target_completion_date ASC", () => {
    const data = [
      u({ id: 1, priority: 1, target_completion_date: "2026-12-31" }),
      u({ id: 2, priority: 1, target_completion_date: "2026-01-01" }),
    ];
    expect(sortKanbanCards(data).map((x) => x.id)).toEqual([2, 1]);
  });
  it("places null target_completion_date last among same priority", () => {
    const data = [
      u({ id: 1, priority: 1, target_completion_date: null }),
      u({ id: 2, priority: 1, target_completion_date: "2026-06-15" }),
    ];
    expect(sortKanbanCards(data).map((x) => x.id)).toEqual([2, 1]);
  });
  it("does not mutate input array", () => {
    const data = [u({ id: 1, priority: 3 }), u({ id: 2, priority: 1 })];
    const before = data.map((x) => x.id);
    sortKanbanCards(data);
    expect(data.map((x) => x.id)).toEqual(before);
  });
});

describe("getVisibleColumns", () => {
  it("returns only statuses with at least one unit", () => {
    const grouped = groupByStatus([
      u({ id: 1, status_painting: "Built" }),
      u({ id: 2, status_painting: "Layered" }),
    ]);
    expect(getVisibleColumns(grouped)).toEqual(["Built", "Layered"]);
  });
  it("preserves PAINTING_STATUS_ORDER", () => {
    const grouped = groupByStatus([
      u({ id: 1, status_painting: "Layered" }),
      u({ id: 2, status_painting: "Built" }),
    ]);
    expect(getVisibleColumns(grouped)).toEqual(["Built", "Layered"]); // Built before Layered
  });
  it("returns [] when grouped is fully empty", () => {
    expect(getVisibleColumns(groupByStatus([]))).toEqual([]);
  });
});
