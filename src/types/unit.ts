/**
 * Unit entity (DATA-06, UNIT-01..06).
 * Mirrors the units table in 001_core_schema.sql.
 *
 * UNIT-06: PAINTING_STATUS_ORDER drives Kanban column ordering and form dropdown
 * order. Defined here (in src/types/) so both UI and DB code can import it.
 */
export const PAINTING_STATUS_ORDER = [
  "Not Started",
  "Built",
  "Primed",
  "Basecoated",
  "Shaded",
  "Layered",
  "Highlighted",
  "Details Done",
  "Based",
  "Varnished",
  "Completed",
] as const;

export type PaintingStatus = typeof PAINTING_STATUS_ORDER[number];

export interface Unit {
  id: number;
  faction_id: number;
  name: string;
  category: string | null;
  unit_type: string | null;
  model_count: number | null;
  owned_count: number | null;
  points: number | null;
  // SQLite stores booleans as INTEGER 0/1 (Pitfall 1)
  status_assembly: 0 | 1;
  status_painting: PaintingStatus;
  painting_percentage: number;
  status_basing: 0 | 1;
  status_varnished: 0 | 1;
  is_active_project: 0 | 1;
  priority: number | null;
  target_completion_date: string | null;
  purchase_date: string | null;
  purchase_price_pence: number | null;
  storage_location: string | null;
  main_image_path: string | null;
  notes: string | null;
  lore_notes: string | null;    // migration 008 — Phase 17 ENRCH-02
  undercoat: string | null;     // migration 008 — Phase 17 ENRCH-03
  // migration 037 — Phase 100 SAD-04: manual-override guard for auto-derived boolean statuses
  status_assembly_override: 0 | 1;
  status_basing_override: 0 | 1;
  status_varnished_override: 0 | 1;
  created_at: string;
  updated_at: string;
}

export type CreateUnitInput = Omit<Unit, "id" | "created_at" | "updated_at">;
export type UpdateUnitInput = Partial<CreateUnitInput> & { id: number };

/**
 * Enriched unit returned by getUnitsWithPoints() — includes effective_points
 * computed from the COALESCE chain (manual points > synced rules points)
 * and a flag indicating whether the unit has a matching datasheet in rules.db.
 */
export interface EnrichedUnit extends Unit {
  /** Points resolved via COALESCE(u.points, sup.points, 0). Manual wins over synced. */
  effective_points: number;
  /** Points from synced_unit_points (rules.db cache). NULL = no match found. */
  synced_points: number | null;
  /** Whether the unit has a matching entry in synced_unit_points (is linked to rules). */
  is_synced: boolean;
}
