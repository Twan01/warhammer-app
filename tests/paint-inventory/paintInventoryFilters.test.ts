/**
 * PINV-02, PINV-03, PINV-04 — Zustand paint inventory filters store (ephemeral).
 * Tests Phase 7 plan 07-01.
 */
import { usePaintInventoryFilters } from "@/features/paints/paintInventoryFilters";
import type { PaintType } from "@/types/paint";

const initial = {
  brands: [] as string[],
  types: [] as PaintType[],
  colorFamilies: [] as string[],
  runningLow: false,
  wishlist: false,
};

describe("paintInventoryFilters store", () => {
  beforeEach(() => usePaintInventoryFilters.setState(initial));

  it("starts with empty filters", () => {
    const s = usePaintInventoryFilters.getState();
    expect(s.brands).toEqual([]);
    expect(s.types).toEqual([]);
    expect(s.colorFamilies).toEqual([]);
    expect(s.runningLow).toBe(false);
    expect(s.wishlist).toBe(false);
  });

  it("toggleBrand adds and removes brand strings", () => {
    const { toggleBrand } = usePaintInventoryFilters.getState();
    toggleBrand("Citadel");
    toggleBrand("Vallejo");
    expect(usePaintInventoryFilters.getState().brands).toEqual(["Citadel", "Vallejo"]);
    toggleBrand("Citadel");
    expect(usePaintInventoryFilters.getState().brands).toEqual(["Vallejo"]);
  });

  it("toggleType adds and removes PaintType values", () => {
    const { toggleType } = usePaintInventoryFilters.getState();
    toggleType("Layer");
    toggleType("Shade");
    expect(usePaintInventoryFilters.getState().types).toEqual(["Layer", "Shade"]);
    toggleType("Layer");
    expect(usePaintInventoryFilters.getState().types).toEqual(["Shade"]);
  });

  it("toggleColorFamily adds and removes color family strings", () => {
    const { toggleColorFamily } = usePaintInventoryFilters.getState();
    toggleColorFamily("Red");
    toggleColorFamily("Blue");
    expect(usePaintInventoryFilters.getState().colorFamilies).toEqual(["Red", "Blue"]);
    toggleColorFamily("Red");
    expect(usePaintInventoryFilters.getState().colorFamilies).toEqual(["Blue"]);
  });

  it("toggleRunningLow flips the boolean", () => {
    usePaintInventoryFilters.getState().toggleRunningLow();
    expect(usePaintInventoryFilters.getState().runningLow).toBe(true);
    usePaintInventoryFilters.getState().toggleRunningLow();
    expect(usePaintInventoryFilters.getState().runningLow).toBe(false);
  });

  it("toggleWishlist flips the boolean", () => {
    usePaintInventoryFilters.getState().toggleWishlist();
    expect(usePaintInventoryFilters.getState().wishlist).toBe(true);
    usePaintInventoryFilters.getState().toggleWishlist();
    expect(usePaintInventoryFilters.getState().wishlist).toBe(false);
  });

  it("clearAll resets every field to defaults", () => {
    const s = usePaintInventoryFilters.getState();
    s.toggleBrand("Citadel");
    s.toggleType("Layer");
    s.toggleColorFamily("Red");
    s.toggleRunningLow();
    s.toggleWishlist();
    s.clearAll();
    const after = usePaintInventoryFilters.getState();
    expect(after).toMatchObject(initial);
  });
});
