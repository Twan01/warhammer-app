/**
 * Shared TypeScript interfaces for the unit database build pipeline.
 *
 * Used by both build-unit-db.ts and update-unit-database.ts.
 */

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

export interface UdbDetachmentRow {
  id: string;           // Wahapedia detachment_id (TEXT PK)
  faction_id: string;
  name: string;
}

export interface UdbDetachmentAbilityRow {
  id: string;           // Wahapedia ability id (TEXT PK)
  detachment_id: string;
  faction_id: string;
  name: string;
  description: string;  // Raw HTML from Wahapedia — kept as-is for UI rendering (Phase 120)
}

export interface UdbStratagemRow {
  id: string;
  faction_id: string | null;      // NULL for universal/core stratagems (Boarding Actions etc.)
  detachment_id: string | null;   // NULL for universal/core stratagems
  name: string;
  type: string;                   // e.g. "Battle Tactic Stratagem", "Epic Deed Stratagem"
  cp_cost: number;
  turn: string;                   // e.g. "Your turn", "Either player's turn"
  phase: string;                  // e.g. "Shooting phase", "Any phase"
  description: string;            // Raw HTML — kept as-is for UI rendering (Phase 120)
}

export interface UdbEnhancementRow {
  id: string;
  faction_id: string;             // always populated (NOT NULL in schema)
  detachment_id: string | null;   // nullable safety measure
  name: string;
  cost: number;
  description: string;            // Raw HTML — kept as-is
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
  /** Names of units that have no points data. */
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
  detachments: UdbDetachmentRow[];
  detachment_abilities: UdbDetachmentAbilityRow[];
  stratagems: UdbStratagemRow[];
  enhancements: UdbEnhancementRow[];
}
