/**
 * Shared TypeScript interfaces for the unit database build pipeline.
 *
 * Used by both build-unit-db.ts and update-unit-database.ts.
 */

// ---------------------------------------------------------------------------
// BSData extraction types
// ---------------------------------------------------------------------------

export interface PointsTier {
  modelCount: number;
  points: number;
}

export interface BsdataUnitPoints {
  datasheet_name: string;
  faction_id: string;
  points: string;
  tiers: PointsTier[];
}

export interface BsdataModelCount {
  unit_name: string;
  faction_id: string | null;
  min_models: number;
  max_models: number;
}

// ---------------------------------------------------------------------------
// Unit database JSON output types
// ---------------------------------------------------------------------------

export interface UdbFactionRow {
  id: string;
  name: string;
  short_name: string;
  name_fr: string | null;
}

export interface UdbUnitRow {
  id: string;
  faction_id: string;
  name: string;
  role: string;
  base_points: number | null;
  damaged_w: string;
  damaged_desc: string;
  sub_faction: string | null;
  name_fr: string | null;
}

export interface UdbUnitModelRow {
  unit_id: string;
  line_order: number;
  name: string;
  M: string;
  T: string;
  Sv: string;
  inv_sv: string;
  W: string;
  Ld: string;
  OC: string;
}

export interface UdbUnitWeaponRow {
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
  name_fr: string | null;
}

export interface UdbUnitAbilityRow {
  unit_id: string;
  line_order: number;
  name: string;
  description: string;
  ability_type: string;
  name_fr: string | null;
  description_fr: string | null;
}

export interface UdbUnitKeywordRow {
  unit_id: string;
  keyword: string;
  is_faction: 0 | 1;
  keyword_fr: string | null;
}

export interface UdbUnitPointsRow {
  unit_id: string;
  model_count: number;
  points: number;
}

export interface UdbUnitCompositionRow {
  unit_id: string;
  min_models: number;
  max_models: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Coverage report types
// ---------------------------------------------------------------------------

export interface FactionCoverage {
  faction_id: string;
  faction_name: string;
  total_units: number;
  units_with_points: number;
  coverage_pct: number;
  /** Number of BSData units matched via exact lowercase key (Plan 02 BPH-01). */
  matched_exact?: number;
  /** Number of BSData units matched via normalized name comparison (Plan 02 BPH-01). */
  matched_normalized?: number;
  /** Number of BSData units matched via aliases.json lookup (Plan 02 BPH-01). */
  matched_alias?: number;
  /** Names of BSData units that could not be matched to any Wahapedia unit (Plan 02 BPH-01). */
  unmatched_names?: string[];
}

export interface CoverageReport {
  built_at: string;
  overall_coverage_pct: number;
  total_units: number;
  units_with_points: number;
  factions: FactionCoverage[];
  unmatched_units: Array<{ name: string; faction_id: string }>;
}

// ---------------------------------------------------------------------------
// Translation overlay types
// ---------------------------------------------------------------------------

export interface TranslationsFrOverlay {
  factions?: Record<string, string>;
  units?: Record<string, string>;
  abilities?: Record<string, { name_fr?: string | null; description_fr?: string | null }>;
  weapons?: Record<string, string>;
  keywords?: Record<string, string>;
}

export interface UnitDatabaseJson {
  version: string;
  built_at: string;
  game_system: string;
  unit_count: number;
  faction_count: number;
  factions: UdbFactionRow[];
  units: UdbUnitRow[];
  models: UdbUnitModelRow[];
  weapons: UdbUnitWeaponRow[];
  abilities: UdbUnitAbilityRow[];
  keywords: UdbUnitKeywordRow[];
  points: UdbUnitPointsRow[];
  composition: UdbUnitCompositionRow[];
}
