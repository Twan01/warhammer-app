/**
 * PINV-02, PINV-03, PINV-04 — applyPaintFilters helper unit tests.
 * Tests Phase 7 plan 07-01 Task 2.
 *
 * SQLite boolean discipline asserted: `running_low === 1` and `wishlist === 1`.
 */
import type { PaintWithRecipeCount } from "@/types/paint";
import { applyPaintFilters } from "@/features/paints/applyPaintFilters";

function paint(overrides: Partial<PaintWithRecipeCount> = {}): PaintWithRecipeCount {
  return {
    id: 1,
    brand: "Citadel",
    name: "Abaddon Black",
    paint_type: "Base",
    color_family: "Black",
    hex_color: "#000000",
    owned: 1,
    quantity: null,
    running_low: 0,
    wishlist: 0,
    notes: null,
    purchase_price_pence: null,
    purchase_date: null,
    created_at: "2026-04-30",
    updated_at: "2026-04-30",
    recipe_count: 0,
    ...overrides,
  };
}

const empty = {
  brands: [],
  types: [],
  colorFamilies: [],
  runningLow: false,
  wishlist: false,
};

describe("applyPaintFilters", () => {
  it("returns paints unchanged when all filters are at defaults", () => {
    const list = [
      paint({ id: 1, brand: "Citadel" }),
      paint({ id: 2, brand: "Vallejo" }),
      paint({ id: 3, brand: "Army Painter" }),
    ];
    const result = applyPaintFilters(list, empty);
    expect(result).toEqual(list);
  });

  it("brand filter narrows to selected brands only (AND when multiple, OR within field)", () => {
    const list = [
      paint({ id: 1, brand: "Citadel" }),
      paint({ id: 2, brand: "Vallejo" }),
      paint({ id: 3, brand: "Army Painter" }),
    ];
    const result = applyPaintFilters(list, { ...empty, brands: ["Citadel", "Vallejo"] });
    expect(result.map((p) => p.id)).toEqual([1, 2]);
  });

  it("runningLow filter checks paint.running_low === 1 — paints with running_low: 0 are excluded", () => {
    const list = [
      paint({ id: 1, running_low: 1 }),
      paint({ id: 2, running_low: 0 }),
      paint({ id: 3, running_low: 1 }),
    ];
    const result = applyPaintFilters(list, { ...empty, runningLow: true });
    expect(result.map((p) => p.id)).toEqual([1, 3]);
  });

  it("wishlist filter checks paint.wishlist === 1 — paints with wishlist: 0 are excluded", () => {
    const list = [
      paint({ id: 1, wishlist: 0 }),
      paint({ id: 2, wishlist: 1 }),
      paint({ id: 3, wishlist: 0 }),
    ];
    const result = applyPaintFilters(list, { ...empty, wishlist: true });
    expect(result.map((p) => p.id)).toEqual([2]);
  });

  it("multiple filters AND-combine — Citadel + Shade narrows to the intersection", () => {
    const list = [
      paint({ id: 1, brand: "Citadel", paint_type: "Shade" }),
      paint({ id: 2, brand: "Citadel", paint_type: "Layer" }),
      paint({ id: 3, brand: "Vallejo", paint_type: "Shade" }),
    ];
    const result = applyPaintFilters(list, { ...empty, brands: ["Citadel"], types: ["Shade"] });
    expect(result.map((p) => p.id)).toEqual([1]);
  });
});
