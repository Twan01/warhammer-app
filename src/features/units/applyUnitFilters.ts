import type { Unit, PaintingStatus } from "@/types/unit";

export interface UnitFiltersInput {
  search: string;
  factions: number[];
  statuses: PaintingStatus[];
  categories: string[];
  activeOnly: boolean;
  battleReady: boolean;
}

export function applyUnitFilters(units: Unit[], filters: UnitFiltersInput): Unit[] {
  const search = filters.search.trim().toLowerCase();
  return units.filter((unit) => {
    if (filters.battleReady && !(unit.status_assembly === 1 && unit.status_painting === "Completed")) return false;
    if (filters.activeOnly && unit.is_active_project !== 1) return false;
    if (filters.factions.length > 0 && !filters.factions.includes(unit.faction_id)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(unit.status_painting)) return false;
    if (filters.categories.length > 0) {
      if (unit.category === null) return false;
      if (!filters.categories.includes(unit.category)) return false;
    }
    if (search.length > 0 && !unit.name.toLowerCase().includes(search)) return false;
    return true;
  });
}
