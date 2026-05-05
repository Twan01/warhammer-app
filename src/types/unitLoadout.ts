/**
 * Phase 24 — Named wargear loadout per unit.
 * Mirrors unit_loadouts + unit_loadout_wargear tables in 011_point_tiers_loadouts.sql.
 *
 * is_active follows 0|1 integer boolean discipline.
 * weapon_name is a TEXT copy of rw_datasheets_wargear.name (cross-DB, no FK).
 */
export interface UnitLoadout {
  id: number;
  unit_id: number;
  name: string;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
  /** Populated by getUnitLoadouts — nested wargear for this loadout. */
  wargear: LoadoutWargear[];
}

export interface LoadoutWargear {
  id: number;
  loadout_id: number;
  weapon_name: string;
  weapon_line: number | null;
  is_manual: 0 | 1;
  created_at: string;
}

export interface CreateLoadoutInput {
  unit_id: number;
  name: string;
}

export interface AddWargearToLoadoutInput {
  loadout_id: number;
  weapon_name: string;
  weapon_line: number | null;
  is_manual: boolean;
}
