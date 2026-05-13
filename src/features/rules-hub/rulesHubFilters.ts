import { create } from "zustand";

interface RulesHubFiltersState {
  selectedFactionId: string | null;
  searchText: string;
  phaseFilter: string | null; // "Command"|"Movement"|"Shooting"|"Charge"|"Fight"|null
  cpFilter: string | null;   // "1"|"2"|"3"|null (cp_cost is TEXT)
  setSelectedFactionId: (id: string | null) => void;
  setSearchText: (text: string) => void;
  setPhaseFilter: (phase: string | null) => void;
  setCpFilter: (cp: string | null) => void;
  clearFilters: () => void;
}

export const useRulesHubFilters = create<RulesHubFiltersState>((set) => ({
  selectedFactionId: null,
  searchText: "",
  phaseFilter: null,
  cpFilter: null,
  setSelectedFactionId: (id) => set({ selectedFactionId: id }),
  setSearchText: (text) => set({ searchText: text }),
  setPhaseFilter: (phase) => set({ phaseFilter: phase }),
  setCpFilter: (cp) => set({ cpFilter: cp }),
  clearFilters: () => set({ searchText: "", phaseFilter: null, cpFilter: null }),
}));
