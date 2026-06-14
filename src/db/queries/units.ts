import { getDb } from "@/db/client";
import type { Unit, CreateUnitInput, UpdateUnitInput, EnrichedUnit } from "@/types/unit";

export async function getUnits(): Promise<Unit[]> {
  const db = await getDb();
  return db.select<Unit[]>("SELECT * FROM units ORDER BY name ASC");
}

/**
 * Fetch all units with effective points resolved from the COALESCE chain:
 *   COALESCE(u.points, udb_base.points, 0)
 *
 * Manual points (u.points) win over database points (udb_base.points).
 * is_linked indicates whether the unit has a canonical database entry (udb_unit_id IS NOT NULL).
 *
 * Uses FK-based join through units.udb_unit_id -> udb_unit_points (Phase 106).
 */
export async function getUnitsWithPoints(): Promise<EnrichedUnit[]> {
  const db = await getDb();
  const rows = await db.select<Array<Unit & { udb_base_points: number | null }>>(
    `SELECT u.*,
            COALESCE(udb_tier.points, udb_min.points, udb_flat.base_points) AS udb_base_points
     FROM units u
     LEFT JOIN udb_unit_points udb_tier
       ON udb_tier.unit_id = u.udb_unit_id
       AND udb_tier.model_count = u.model_count
     LEFT JOIN udb_unit_points udb_min
       ON udb_min.unit_id = u.udb_unit_id
       AND udb_min.model_count = (
         SELECT MIN(model_count)
         FROM udb_unit_points
         WHERE unit_id = u.udb_unit_id
       )
     LEFT JOIN udb_units udb_flat
       ON udb_flat.id = u.udb_unit_id
     ORDER BY u.name ASC`,
  );
  return rows.map((row) => ({
    ...row,
    effective_points: row.points ?? row.udb_base_points ?? 0,
    is_linked: row.udb_unit_id != null,
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
       storage_location, main_image_path, notes, lore_notes, undercoat, udb_unit_id
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10,
       $11, $12, $13,
       $14, $15, $16, $17,
       $18, $19, $20, $21, $22, $23
     )`,
    [
      input.faction_id, input.name, input.category ?? null, input.unit_type ?? null,
      input.model_count ?? null, input.owned_count ?? null, input.points ?? null,
      input.status_assembly ? 1 : 0, input.status_painting, input.painting_percentage,
      input.status_basing ? 1 : 0, input.status_varnished ? 1 : 0, input.is_active_project ? 1 : 0,
      input.priority ?? null, input.target_completion_date ?? null,
      input.purchase_date ?? null, input.purchase_price_pence ?? null,
      input.storage_location ?? null, input.main_image_path ?? null, input.notes ?? null,
      input.lore_notes ?? null, input.undercoat ?? null, input.udb_unit_id ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}

/**
 * Columns that updateUnit may set, in input-key order. `bool` columns are
 * coerced to 0/1 when an explicit boolean/number is supplied.
 *
 * The SET clause is built dynamically: a column is only written when its key is
 * explicitly present in the input. This honours the partial-update contract of
 * UpdateUnitInput — callers that omit a field (e.g. the active-project toggle,
 * which sends only { id, is_active_project }) leave every other column intact,
 * instead of nulling it. Callers that DO want to clear a field (e.g. the edit
 * form clearing the category) pass an explicit `null`, which is still applied.
 */
const UPDATABLE_UNIT_COLUMNS = [
  { key: "faction_id", col: "faction_id", bool: false },
  { key: "name", col: "name", bool: false },
  { key: "category", col: "category", bool: false },
  { key: "unit_type", col: "unit_type", bool: false },
  { key: "model_count", col: "model_count", bool: false },
  { key: "owned_count", col: "owned_count", bool: false },
  { key: "points", col: "points", bool: false },
  { key: "status_assembly", col: "status_assembly", bool: true },
  { key: "status_painting", col: "status_painting", bool: false },
  { key: "painting_percentage", col: "painting_percentage", bool: false },
  { key: "status_basing", col: "status_basing", bool: true },
  { key: "status_varnished", col: "status_varnished", bool: true },
  { key: "is_active_project", col: "is_active_project", bool: true },
  { key: "priority", col: "priority", bool: false },
  { key: "target_completion_date", col: "target_completion_date", bool: false },
  { key: "purchase_date", col: "purchase_date", bool: false },
  { key: "purchase_price_pence", col: "purchase_price_pence", bool: false },
  { key: "storage_location", col: "storage_location", bool: false },
  { key: "main_image_path", col: "main_image_path", bool: false },
  { key: "notes", col: "notes", bool: false },
  { key: "lore_notes", col: "lore_notes", bool: false },
  { key: "undercoat", col: "undercoat", bool: false },
  { key: "status_assembly_override", col: "status_assembly_override", bool: true },
  { key: "status_basing_override", col: "status_basing_override", bool: true },
  { key: "status_varnished_override", col: "status_varnished_override", bool: true },
  { key: "udb_unit_id", col: "udb_unit_id", bool: false },
] as const;

export async function updateUnit(input: UpdateUnitInput): Promise<void> {
  const db = await getDb();

  const setClauses: string[] = [];
  const params: unknown[] = [input.id];

  for (const { key, col, bool } of UPDATABLE_UNIT_COLUMNS) {
    if (!(key in input)) continue;
    const value = (input as Record<string, unknown>)[key];
    // Treat an explicit `undefined` the same as an omitted key — preserve column.
    if (value === undefined) continue;
    params.push(bool && value !== null ? (value ? 1 : 0) : value);
    setClauses.push(`${col} = $${params.length}`);
  }

  // Nothing to update beyond the id — skip the write entirely.
  if (setClauses.length === 0) return;

  setClauses.push("updated_at = datetime('now')");

  await db.execute(
    `UPDATE units SET ${setClauses.join(", ")} WHERE id = $1`,
    params,
  );
}

export async function deleteUnit(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM units WHERE id = $1", [id]);
  // FK violation throws — caller catches via error message
}

/**
 * Link a collection unit to a canonical UDB datasheet entry.
 * Pass null to unlink.
 */
export async function linkUdbUnit(
  unitId: number,
  udbUnitId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE units SET udb_unit_id = $1 WHERE id = $2", [
    udbUnitId,
    unitId,
  ]);
}
