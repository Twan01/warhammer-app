import { create } from "zustand";
import type { PaintType } from "@/types/paint";

interface PaintInventoryFiltersState {
  brands: string[];
  types: PaintType[];
  colorFamilies: string[];
  runningLow: boolean;
  wishlist: boolean;
  toggleBrand: (b: string) => void;
  toggleType: (t: PaintType) => void;
  toggleColorFamily: (cf: string) => void;
  toggleRunningLow: () => void;
  toggleWishlist: () => void;
  clearAll: () => void;
}

export const usePaintInventoryFilters = create<PaintInventoryFiltersState>((set) => ({
  brands: [],
  types: [],
  colorFamilies: [],
  runningLow: false,
  wishlist: false,
  toggleBrand: (b) =>
    set((s) => ({
      brands: s.brands.includes(b) ? s.brands.filter((x) => x !== b) : [...s.brands, b],
    })),
  toggleType: (t) =>
    set((s) => ({
      types: s.types.includes(t) ? s.types.filter((x) => x !== t) : [...s.types, t],
    })),
  toggleColorFamily: (cf) =>
    set((s) => ({
      colorFamilies: s.colorFamilies.includes(cf)
        ? s.colorFamilies.filter((x) => x !== cf)
        : [...s.colorFamilies, cf],
    })),
  toggleRunningLow: () => set((s) => ({ runningLow: !s.runningLow })),
  toggleWishlist: () => set((s) => ({ wishlist: !s.wishlist })),
  clearAll: () =>
    set({ brands: [], types: [], colorFamilies: [], runningLow: false, wishlist: false }),
}));
