import { create } from "zustand";
import type { PaintingStatus } from "@/types/unit";

interface CollectionFiltersState {
  search: string;
  factions: number[];
  statuses: PaintingStatus[];
  categories: string[];
  activeOnly: boolean;
  setSearch: (v: string) => void;
  toggleFaction: (id: number) => void;
  toggleStatus: (s: PaintingStatus) => void;
  toggleCategory: (c: string) => void;
  toggleActiveOnly: () => void;
  clearAll: () => void;
}

export const useCollectionFilters = create<CollectionFiltersState>((set) => ({
  search: "",
  factions: [],
  statuses: [],
  categories: [],
  activeOnly: false,
  setSearch: (v) => set({ search: v }),
  toggleFaction: (id) =>
    set((s) => ({
      factions: s.factions.includes(id)
        ? s.factions.filter((f) => f !== id)
        : [...s.factions, id],
    })),
  toggleStatus: (status) =>
    set((s) => ({
      statuses: s.statuses.includes(status)
        ? s.statuses.filter((x) => x !== status)
        : [...s.statuses, status],
    })),
  toggleCategory: (cat) =>
    set((s) => ({
      categories: s.categories.includes(cat)
        ? s.categories.filter((c) => c !== cat)
        : [...s.categories, cat],
    })),
  toggleActiveOnly: () => set((s) => ({ activeOnly: !s.activeOnly })),
  clearAll: () =>
    set({ search: "", factions: [], statuses: [], categories: [], activeOnly: false }),
}));
