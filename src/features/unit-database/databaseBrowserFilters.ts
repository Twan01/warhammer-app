import { create } from "zustand";

interface DatabaseBrowserFiltersState {
  selectedFactionId: string | null;
  searchText: string;
  roleFilter: string | null;
  keywordFilter: string;
  pointMin: number | null;
  pointMax: number | null;
  setSelectedFactionId: (id: string | null) => void;
  setSearchText: (text: string) => void;
  setRoleFilter: (role: string | null) => void;
  setKeywordFilter: (keyword: string) => void;
  setPointMin: (min: number | null) => void;
  setPointMax: (max: number | null) => void;
  clearFilters: () => void;
}

export const useDatabaseBrowserFilters = create<DatabaseBrowserFiltersState>(
  (set) => ({
    selectedFactionId: null,
    searchText: "",
    roleFilter: null,
    keywordFilter: "",
    pointMin: null,
    pointMax: null,
    setSelectedFactionId: (id) => set({ selectedFactionId: id }),
    setSearchText: (text) => set({ searchText: text }),
    setRoleFilter: (role) => set({ roleFilter: role }),
    setKeywordFilter: (keyword) => set({ keywordFilter: keyword }),
    setPointMin: (min) => set({ pointMin: min }),
    setPointMax: (max) => set({ pointMax: max }),
    clearFilters: () =>
      set({ roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }),
  }),
);
