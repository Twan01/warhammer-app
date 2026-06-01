import { create } from "zustand";
import { toggleArrayItem } from "@/lib/utils";
import type { PaintingStatus } from "@/types/unit";

interface CollectionFiltersState {
  search: string;
  factions: number[];
  statuses: PaintingStatus[];
  categories: string[];
  activeOnly: boolean;
  battleReady: boolean;
  subFactionFilter: string | null;
  setSearch: (v: string) => void;
  toggleFaction: (id: number) => void;
  toggleStatus: (s: PaintingStatus) => void;
  toggleCategory: (c: string) => void;
  toggleActiveOnly: () => void;
  toggleBattleReady: () => void;
  setSubFactionFilter: (sf: string | null) => void;
  clearAll: () => void;
}

export const useCollectionFilters = create<CollectionFiltersState>((set) => ({
  search: "",
  factions: [],
  statuses: [],
  categories: [],
  activeOnly: false,
  battleReady: false,
  subFactionFilter: null,
  setSearch: (v) => set({ search: v }),
  toggleFaction: (id) =>
    set((s) => ({ factions: toggleArrayItem(s.factions, id), subFactionFilter: null })),
  toggleStatus: (status) =>
    set((s) => ({ statuses: toggleArrayItem(s.statuses, status) })),
  toggleCategory: (cat) =>
    set((s) => ({ categories: toggleArrayItem(s.categories, cat) })),
  toggleActiveOnly: () => set((s) => ({ activeOnly: !s.activeOnly })),
  toggleBattleReady: () => set((s) => ({ battleReady: !s.battleReady })),
  setSubFactionFilter: (sf) => set({ subFactionFilter: sf }),
  clearAll: () =>
    set({ search: "", factions: [], statuses: [], categories: [], activeOnly: false, battleReady: false, subFactionFilter: null }),
}));
