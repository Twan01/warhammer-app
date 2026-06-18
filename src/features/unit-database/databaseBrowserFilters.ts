import { create } from "zustand";

interface DatabaseBrowserFiltersState {
  selectedFactionId: string | null;
  searchText: string;
  subFactionFilter: string | null;
  roleFilter: string | null;
  keywordFilter: string;
  pointMin: number | null;
  pointMax: number | null;
  // Phase 138-01 PLAY-01 D-03: compare selection (up to 3 units)
  compareIds: Set<string>;
  setSelectedFactionId: (id: string | null) => void;
  setSearchText: (text: string) => void;
  setSubFactionFilter: (sf: string | null) => void;
  setRoleFilter: (role: string | null) => void;
  setKeywordFilter: (keyword: string) => void;
  setPointMin: (min: number | null) => void;
  setPointMax: (max: number | null) => void;
  clearFilters: () => void;
  // Phase 138-01 PLAY-01 D-03: compare selection actions
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
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
    // Phase 138-01 PLAY-01 D-03: compare selection state
    compareIds: new Set<string>(),
    // Reset all faction-scoped filters on faction change — a role/keyword/points
    // filter from the previous faction would otherwise silently empty the list.
    setSelectedFactionId: (id) =>
      set({ selectedFactionId: id, subFactionFilter: null, roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }),
    setSearchText: (text) => set({ searchText: text }),
    setSubFactionFilter: (sf) => set({ subFactionFilter: sf }),
    setRoleFilter: (role) => set({ roleFilter: role }),
    setKeywordFilter: (keyword) => set({ keywordFilter: keyword }),
    setPointMin: (min) => set({ pointMin: min }),
    setPointMax: (max) => set({ pointMax: max }),
    // clearFilters does NOT reset compareIds — compare selection is independent
    // of search/faction filters (PITFALL #5: clearing happens via the compare
    // page's Clear button only).
    clearFilters: () =>
      set({ searchText: "", subFactionFilter: null, roleFilter: null, keywordFilter: "", pointMin: null, pointMax: null }),
    // Phase 138-01 PLAY-01 D-03: compare selection actions (hard cap at 3)
    addToCompare: (id) =>
      set((s) => {
        if (s.compareIds.size >= 3) return s; // hard cap — 4th distinct add is no-op
        const next = new Set(s.compareIds);
        next.add(id);
        return { compareIds: next };
      }),
    removeFromCompare: (id) =>
      set((s) => {
        const next = new Set(s.compareIds);
        next.delete(id);
        return { compareIds: next };
      }),
    clearCompare: () => set({ compareIds: new Set<string>() }),
  }),
);
