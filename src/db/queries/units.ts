import { getDb } from "@/db/client";
import type { Unit, CreateUnitInput, UpdateUnitInput } from "@/types/unit";

export async function getUnits(): Promise<Unit[]> {
  const db = await getDb();
  return db.select<Unit[]>("SELECT * FROM units ORDER BY name ASC");
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
      input.status_assembly, input.status_painting, input.painting_percentage,
      input.status_basing, input.status_varnished, input.is_active_project,
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
            category                = COALESCE($4, category),
            unit_type               = COALESCE($5, unit_type),
            model_count             = COALESCE($6, model_count),
            owned_count             = COALESCE($7, owned_count),
            points                  = COALESCE($8, points),
            status_assembly         = COALESCE($9, status_assembly),
            status_painting         = COALESCE($10, status_painting),
            painting_percentage     = COALESCE($11, painting_percentage),
            status_basing           = COALESCE($12, status_basing),
            status_varnished        = COALESCE($13, status_varnished),
            is_active_project       = COALESCE($14, is_active_project),
            priority                = COALESCE($15, priority),
            target_completion_date  = COALESCE($16, target_completion_date),
            purchase_date           = COALESCE($17, purchase_date),
            purchase_price_pence    = $18,
            storage_location        = COALESCE($19, storage_location),
            main_image_path         = COALESCE($20, main_image_path),
            notes                   = COALESCE($21, notes),
            lore_notes              = $22,
            undercoat               = $23,
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
    ]
  );
}

export async function deleteUnit(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM units WHERE id = $1", [id]);
  // FK violation throws — caller catches via error message
}
