/**
 * ArmyList entities (ARMY-01..07).
 * Mirrors army_lists and army_list_units tables in 001_core_schema.sql.
 *
 * Notes:
 * - army_lists: faction_id is nullable (SET NULL on faction delete).
 * - army_list_units: NO updated_at column. Only created_at exists.
 * - Same unit_id may appear multiple times in one list (no UNIQUE constraint;
 *   intentional per 06-CONTEXT.md to support multi-squad model).
 * - points_override is nullable. NULL means "inherit unit.points".
 *   Update flow MUST allow clearing back to NULL — use full-replacement
 *   UPDATE in updateArmyListUnit, NOT COALESCE.
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
  unit_id: number;
  points_override: number | null;
  notes: string | null;
  created_at: string;
  // Intentionally no updated_at — the schema does not have one.
}

/**
 * Joined row returned by getArmyListWithUnits().
 * Includes live unit fields (JOIN units) and a SQL-computed effective_points
 * via COALESCE(alu.points_override, u.points, 0). The UI sums effective_points
 * directly — never reimplements the COALESCE in JS.
 */
export interface ArmyListUnitRow extends ArmyListUnit {
  unit_name: string;
  unit_points: number | null;
  effective_points: number;
  faction_id: number;
  status_assembly: number;
  status_painting: string;
  painting_percentage: number;
  tactical_role: string | null;
  synced_points: number | null;
  override_points: number | null;
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

/**
 * Phase 66 — Tactical role tags (LV-02, D-07/D-08).
 *
 * Fixed enum of 7 roles. Single role per unit (TEXT column on army_list_units).
 * Follows the PAINTING_STATUS_ORDER const-array pattern from src/types/unit.ts.
 */
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
