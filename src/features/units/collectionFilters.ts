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
  /** Phase 138-03 D-06: UDB → Collection deep-link filter — set by "Owned xN" badge */
  udbUnitIdFilter: string | null;
  setSearch: (v: string) => void;
  toggleFaction: (id: number) => void;
  toggleStatus: (s: PaintingStatus) => void;
  toggleCategory: (c: string) => void;
  toggleActiveOnly: () => void;
  toggleBattleReady: () => void;
  setSubFactionFilter: (sf: string | null) => void;
  /** Phase 138-03 D-06: Set to a udb unit id to pre-filter the Collection */
  setUdbUnitIdFilter: (id: string | null) => void;
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
  udbUnitIdFilter: null,
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
  setUdbUnitIdFilter: (id) => set({ udbUnitIdFilter: id }),
  clearAll: () =>
    set({ search: "", factions: [], statuses: [], categories: [], activeOnly: false, battleReady: false, subFactionFilter: null, udbUnitIdFilter: null }),
}));
