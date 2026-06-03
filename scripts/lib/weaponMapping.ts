/**
 * Weapon CSV row mapping — extracted from build-unit-db.ts for testability.
 *
 * Maps a raw Wahapedia Datasheets_wargear.csv row (Record<string, string>)
 * to the fields needed for UdbUnitWeaponRow.
 */

export interface WeaponMappingResult {
  unit_id: string;
  weapon_group: number;
  line_order: number;
  name: string;
  category: string;
  range: string;
  attacks: string;
  skill: string;
  strength: string;
  ap: string;
  damage: string;
  keywords: string;
}

/**
 * Maps a single CSV row from Datasheets_wargear.csv to weapon fields.
 *
 * CSV headers: datasheet_id|line|line_in_wargear|dice|name|description|range|type|A|BS_WS|S|AP|D|
 *
 * - weapon_group = CSV "line" column (group number per unit)
 * - line_order   = CSV "line_in_wargear" column (sub-profile within group)
 * - range        = CSV "range" column (lowercase)
 * - keywords     = CSV "description" column (weapon special rules)
 */
export function mapWeaponRow(row: Record<string, string>): WeaponMappingResult {
  const unitId = row["datasheet_id"]?.trim() ?? "";
  const name = row["name"]?.trim() ?? "";

  // BUG: reads "Range" (uppercase) instead of "range" (lowercase CSV header)
  const range = row["Range"]?.trim() ?? "";

  const weaponGroup = parseInt(row["line"]?.trim() ?? "1", 10) || 1;
  const lineOrder = parseInt(row["line_in_wargear"]?.trim() ?? "1", 10) || 1;

  return {
    unit_id: unitId,
    weapon_group: weaponGroup,
    line_order: lineOrder,
    name,
    category: row["wargear_role"]?.trim() ?? row["type"]?.trim() ?? "",
    range,
    attacks: row["A"]?.trim() ?? "",
    skill: row["BS_WS"]?.trim() ?? row["BS/WS"]?.trim() ?? "",
    strength: row["S"]?.trim() ?? "",
    ap: row["AP"]?.trim() ?? "",
    damage: row["D"]?.trim() ?? "",
    // BUG: reads "keywords" instead of "description"
    keywords: row["keywords"]?.trim() ?? "",
  };
}
