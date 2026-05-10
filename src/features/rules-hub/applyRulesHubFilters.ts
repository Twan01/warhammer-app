import type { RwStratagem } from "@/types/datasheet";

const STRATAGEM_PHASES = ["Command", "Movement", "Shooting", "Charge", "Fight"] as const;
export type StratagemPhase = (typeof STRATAGEM_PHASES)[number];
export { STRATAGEM_PHASES };

export interface StratagemFilterOptions {
  searchText: string;
  phaseFilter: string | null;
  cpFilter: string | null;
}

export function applyStratagemFilters(
  stratagems: RwStratagem[],
  options: StratagemFilterOptions
): RwStratagem[] {
  let result = stratagems;
  if (options.phaseFilter) {
    result = result.filter((s) => s.phase === options.phaseFilter);
  }
  if (options.cpFilter) {
    result = result.filter((s) => s.cp_cost === options.cpFilter);
  }
  if (options.searchText) {
    const lower = options.searchText.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        (s.legend ?? "").toLowerCase().includes(lower)
    );
  }
  return result;
}
