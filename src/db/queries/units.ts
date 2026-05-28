import { getDb } from "@/db/client";
import type { Unit, CreateUnitInput, UpdateUnitInput, EnrichedUnit } from "@/types/unit";

export async function getUnits(): Promise<Unit[]> {
  const db = await getDb();
  return db.select<Unit[]>("SELECT * FROM units ORDER BY name ASC");
}

/**
 * Fetch all units with effective points resolved from the COALESCE chain:
 *   COALESCE(u.points, sup.points, 0)
 *
 * Manual points (u.points) win over synced rules points (sup.points).
 * is_synced indicates whether the unit has a matching entry in synced_unit_points.
 *
 * Uses the same join pattern as getArmyListWithUnits:
 *   unit_rules_mapping → synced_unit_points via COALESCE(urm.datasheet_name, u.name)
 */
export async function getUnitsWithPoints(): Promise<EnrichedUnit[]> {
  const db = await getDb();
  const rows = await db.select<Array<Unit & { synced_points: number | null }>>(
    `SELECT u.*,
            sup.points AS synced_points
     FROM units u
     LEFT JOIN unit_rules_mapping urm ON urm.unit_id = u.id
     LEFT JOIN synced_unit_points sup
       ON sup.unit_name = COALESCE(urm.datasheet_name, u.name)
     ORDER BY u.name ASC`,
  );
  return rows.map((row) => ({
    ...row,
    effective_points: row.points ?? row.synced_points ?? 0,
    is_synced: row.synced_points !== null,
  }));
}

export async function getUnitById(id: number): Promise<Unit | null> {
  const db = await getDb();
  const rows = await db.select<Unit[]>("SELECT * FROM units WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createUnit(input: CreateUnitInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO units (
       faction_id, name, category, unit_type, model_count, owned_count, points,
       status_assembly, status_painting, painting_percentage,
       status_basing, status_varnished, is_active_project,
       priority, target_completion_date, purchase_date, purchase_price_pence,
       storage_location, main_image_path, notes, lore_notes, undercoat
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10,
       $11, $12, $13,
       $14, $15, $16, $17,
       $18, $19, $20, $21, $22
     )`,
    [
      input.faction_id, input.name, input.category ?? null, input.unit_type ?? null,
      input.model_count ?? null, input.owned_count ?? null, input.points ?? null,
      input.status_assembly ? 1 : 0, input.status_painting, input.painting_percentage,
      input.status_basing ? 1 : 0, input.status_varnished ? 1 : 0, input.is_active_project ? 1 : 0,
      input.priority ?? null, input.target_completion_date ?? null,
      input.purchase_date ?? null, input.purchase_price_pence ?? null,
      input.storage_location ?? null, input.main_image_path ?? null, input.notes ?? null,
      input.lore_notes ?? null, input.undercoat ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}

export async function updateUnit(input: UpdateUnitInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE units
        SET faction_id              = COALESCE($2, faction_id),
            name                    = COALESCE($3, name),
            category                = $4,
            unit_type               = $5,
            model_count             = $6,
            owned_count             = $7,
            points                  = $8,
            status_assembly         = COALESCE($9, status_assembly),
            status_painting         = COALESCE($10, status_painting),
            painting_percentage     = COALESCE($11, painting_percentage),
            status_basing           = COALESCE($12, status_basing),
            status_varnished        = COALESCE($13, status_varnished),
            is_active_project       = COALESCE($14, is_active_project),
            priority                = $15,
            target_completion_date  = $16,
            purchase_date           = $17,
            purchase_price_pence    = $18,
            storage_location        = $19,
            main_image_path         = $20,
            notes                   = $21,
            lore_notes              = $22,
            undercoat               = $23,
            status_assembly_override  = COALESCE($24, status_assembly_override),
            status_basing_override    = COALESCE($25, status_basing_override),
            status_varnished_override = COALESCE($26, status_varnished_override),
            updated_at              = datetime('now')
      WHERE id = $1`,
    [
      input.id,
      input.faction_id ?? null, input.name ?? null,
      input.category ?? null, input.unit_type ?? null,
      input.model_count ?? null, input.owned_count ?? null, input.points ?? null,
      input.status_assembly ?? null, input.status_painting ?? null, input.painting_percentage ?? null,
      input.status_basing ?? null, input.status_varnished ?? null, input.is_active_project ?? null,
      input.priority ?? null, input.target_completion_date ?? null,
      input.purchase_date ?? null, input.purchase_price_pence ?? null,
      input.storage_location ?? null, input.main_image_path ?? null, input.notes ?? null,
      input.lore_notes ?? null, input.undercoat ?? null,
      input.status_assembly_override ?? null, input.status_basing_override ?? null, input.status_varnished_override ?? null,
    ]
  );
}

export async function deleteUnit(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM units WHERE id = $1", [id]);
  // FK violation throws — caller catches via error message
}
