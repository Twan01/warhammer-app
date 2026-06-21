import type { TechniqueWithCounts } from "@/types/technique";

export interface TechniqueFilterState {
  nameFilter: string;
  effectFilter: string | null;
}

export function applyTechniqueFilters(
  techniques: TechniqueWithCounts[],
  filters: TechniqueFilterState,
): TechniqueWithCounts[] {
  return techniques.filter((t) => {
    const name = filters.nameFilter.trim().toLowerCase();
    if (name.length > 0) {
      if (!t.name.toLowerCase().includes(name)) return false;
    }
    if (filters.effectFilter !== null) {
      if (t.effect !== filters.effectFilter) return false;
    }
    return true;
  });
}
