import { create } from "zustand";
import { toggleArrayItem } from "@/lib/utils";
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
  toggleBrand: (b) => set((s) => ({ brands: toggleArrayItem(s.brands, b) })),
  toggleType: (t) => set((s) => ({ types: toggleArrayItem(s.types, t) })),
  toggleColorFamily: (cf) => set((s) => ({ colorFamilies: toggleArrayItem(s.colorFamilies, cf) })),
  toggleRunningLow: () => set((s) => ({ runningLow: !s.runningLow })),
  toggleWishlist: () => set((s) => ({ wishlist: !s.wishlist })),
  clearAll: () =>
    set({ brands: [], types: [], colorFamilies: [], runningLow: false, wishlist: false }),
}));
