import type { UdbStratagem } from "@/types/gameData";
import { normalizePhase } from "@/lib/stratagemStyles";

const STRATAGEM_PHASES = ["Command", "Movement", "Shooting", "Charge", "Fight"] as const;
export type StratagemPhase = (typeof STRATAGEM_PHASES)[number];
export { STRATAGEM_PHASES };

export interface StratagemFilterOptions {
  searchText: string;
  phaseFilter: string | null;
  cpFilter: string | null;
}

export function applyStratagemFilters(
  stratagems: UdbStratagem[],
  options: StratagemFilterOptions
): UdbStratagem[] {
  let result = stratagems;
  if (options.phaseFilter) {
    result = result.filter((s) => normalizePhase(s.phase) === options.phaseFilter);
  }
  if (options.cpFilter) {
    result = result.filter((s) => String(s.cp_cost) === options.cpFilter);
  }
  if (options.searchText) {
    const lower = options.searchText.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        (s.type ?? "").toLowerCase().includes(lower)
    );
  }
  return result;
}
