/**
 * ArmyList entities (ARMY-01..07).
 * Mirrors army_lists and army_list_units tables in 001_core_schema.sql,
 * extended for Army Lists 3.0 (migration 031_army_list_v3.sql, Phase 89).
 *
 * Notes:
 * - army_lists: faction_id is nullable (SET NULL on faction delete).
 * - army_list_units: NO updated_at column. Only created_at exists.
 * - Same unit_id may appear multiple times in one list (no UNIQUE constraint;
 *   intentional per 06-CONTEXT.md to support multi-squad model).
 * - points_override is nullable. NULL means "inherit unit.points".
 *   Update flow MUST allow clearing back to NULL — use full-replacement
 *   UPDATE in updateArmyListUnit, NOT COALESCE.
 * - unit_id is nullable for ghost/planned units. When unit_id IS NULL,
 *   ghost_unit_name must be set (enforced by DB CHECK constraint).
 */
export interface ArmyList {
  id: number;
  name: string;
  faction_id: number | null;
  points_limit: number | null;
  list_type: string | null;
  notes: string | null;
  detachment_id: string | null;    // Wahapedia rw_detachments.id
  detachment_name: string | null;  // Denormalized copy, survives rules.db re-sync
  created_at: string;
  updated_at: string;
}

export interface ArmyListUnit {
  id: number;
  list_id: number;
  unit_id: number | null;               // NULLABLE for ghost/planned units (Phase 89)
  ghost_unit_name: string | null;       // NOT NULL when unit_id IS NULL (Phase 89)
  is_warlord: number;                   // 0 | 1 integer per SQLite boolean pattern (Phase 89)
  selected_model_count: number | null;  // NULL = default/min tier (Phase 89)
  leader_attached_to_id: number | null; // FK to army_list_units.id, ON DELETE SET NULL (Phase 89)
  points_override: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  // Intentionally no updated_at — the schema does not have one.
}

/**
 * Joined row returned by getArmyListWithUnits().
 * Includes live unit fields (LEFT JOIN units) and a SQL-computed effective_points
 * via COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0).
 * The UI sums effective_points directly — never reimplements the COALESCE in JS.
 *
 * Ghost units (unit_id IS NULL) have null faction_id, status_assembly,
 * status_painting, painting_percentage, and unit_category since they have no units row.
 */
export interface ArmyListUnitRow extends ArmyListUnit {
  unit_name: string;
  canonical_name: string | null;
  unit_points: number | null;
  effective_points: number;
  faction_id: number | null;          // null for ghost units (Phase 89)
  unit_category: string | null;       // unit category (e.g. "HQ", "Battleline") for points grouping
  unit_model_count: number | null;   // number of models in the unit from collection
  status_assembly: number | null;     // null for ghost units (Phase 89)
  status_painting: string | null;     // null for ghost units (Phase 89)
  painting_percentage: number | null; // null for ghost units (Phase 89)
  tactical_role: string | null;
  synced_points: number | null;
  override_points: number | null;
  tier_points: number | null;         // from synced_unit_point_tiers (Phase 89)
}

export interface ArmyListWithUnits {
  list: ArmyList;
  units: ArmyListUnitRow[];
}

export type CreateArmyListInput = Omit<ArmyList, "id" | "created_at" | "updated_at">;
export type UpdateArmyListInput = Partial<CreateArmyListInput> & { id: number };

export interface AddUnitToListInput {
  list_id: number;
  unit_id: number;
  points_override?: number | null;
  notes?: string | null;
}

/**
 * Input for adding a ghost/planned unit to an army list (Phase 89).
 * Ghost units have no collection entry — they represent units the player
 * plans to acquire or proxy. ghost_unit_name should match the canonical
 * BSData/Wahapedia name so points can be resolved via the name-based join.
 */
export interface AddGhostUnitToListInput {
  list_id: number;
  ghost_unit_name: string;
  points_override?: number | null;
  notes?: string | null;
}

/**
 * Update payload for army_list_units.
 * Both fields are non-optional and nullable (full replacement, NOT partial)
 * so the caller can clear points_override back to NULL.
 */
export interface UpdateArmyListUnitInput {
  id: number;
  points_override: number | null;
  notes: string | null;
  tactical_role: string | null;
}

export interface ArmyListEnhancement {
  id: number;
  list_id: number;
  army_list_unit_id: number;
  enhancement_name: string;
  enhancement_points: number;
  created_at: string;
}

/**
 * Input for assigning an enhancement to a unit in an army list (Phase 89).
 */
export interface AddEnhancementInput {
  list_id: number;
  army_list_unit_id: number;
  enhancement_name: string;
  enhancement_points: number;
}

/**
 * Phase 66 — Tactical role tags (LV-02, D-07/D-08).
 *
 * Fixed enum of 7 roles. Single role per unit (TEXT column on army_list_units).
 * Follows the PAINTING_STATUS_ORDER const-array pattern from src/types/unit.ts.
 */
/**
 * Phase 95 — Version snapshot row (D-01).
 * Excludes snapshot_data from list queries (D-03 / Pitfall 2).
 * snapshot_data is fetched separately via getSnapshotData when needed.
 */
export interface ArmyListSnapshot {
  id: number;
  list_id: number;
  label: string;
  total_points: number;
  created_at: string;
}

/**
 * Phase 95 — Input for creating a new snapshot.
 * snapshot_data is the JSON blob from buildJsonFormat.
 */
export interface CreateSnapshotInput {
  list_id: number;
  label: string;
  snapshot_data: string;
  total_points: number;
}

/**
 * Phase 95 — Input for restoring a snapshot (D-09..D-12).
 * faction_id is needed to resolve unit names back to unit_ids.
 */
export interface RestoreSnapshotInput {
  snapshot_id: number;
  list_id: number;
  faction_id: number;
}

export const TACTICAL_ROLES = [
  "anti_tank",
  "screening",
  "objective_holder",
  "fire_support",
  "melee_threat",
  "utility",
  "transport",
] as const;

export type TacticalRole = typeof TACTICAL_ROLES[number];

export const TACTICAL_ROLES_DISPLAY: Record<TacticalRole, string> = {
  anti_tank: "Anti-Tank",
  screening: "Screening",
  objective_holder: "Obj. Holder",
  fire_support: "Fire Support",
  melee_threat: "Melee Threat",
  utility: "Utility",
  transport: "Transport",
};
