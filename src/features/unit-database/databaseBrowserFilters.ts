import { create } from "zustand";

interface DatabaseBrowserFiltersState {
  selectedFactionId: string | null;
  searchText: string;
  subFactionFilter: string | null;
  roleFilter: string | null;
  keywordFilter: string;
  pointMin: number | null;
  pointMax: number | null;
  setSelectedFactionId: (id: string | null) => void;
  setSearchText: (text: string) => void;
  setSubFactionFilter: (sf: string | null) => void;
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
    subFactionFilter: null,
    roleFilter: null,
    keywordFilter: "",
    pointMin: null,
    pointMax: null,
    setSelectedFactionId: (id) => set({ selectedFactionId: id, subFactionFilter: null }),
    setSearchText: (text) => set({ searchText: text }),
    setSubFactionFilter: (sf) => set({ subFactionFilter: sf }),
    setRoleFilter: (role) => set({ roleFilter: role }),
    setKeywordFilter: (keyword) => set({ keywordFilter: keyword }),
    setPointMin: (min) => set({ pointMin: min }),
    setPointMax: (max) => set({ pointMax: max }),
    clearFilters: () =>
      set({ searchText: "", subFactionFilter: null, roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }),
  }),
);
