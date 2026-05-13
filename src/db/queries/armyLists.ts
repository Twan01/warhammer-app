import { getDb } from "@/db/client";
import type {
  ArmyList,
  ArmyListUnitRow,
  CreateArmyListInput,
  UpdateArmyListInput,
  AddUnitToListInput,
  UpdateArmyListUnitInput,
} from "@/types/armyList";

/**
 * Army list queries (ARMY-01..07).
 *
 * Critical contracts:
 * - updateArmyListUnit uses full-replacement UPDATE (SET points_override=$2, notes=$3)
 *   so points_override can be cleared back to NULL. Do NOT use COALESCE for the join row.
 * - addUnitToList allows the same unit_id to appear multiple times in one list
 *   (no UNIQUE constraint on (list_id, unit_id) — intentional per CONTEXT.md).
 * - getArmyListWithUnits JOINs units to read live unit.points and computes
 *   effective_points = COALESCE(alu.points_override, uo.points, u.points, 0) in SQL.
 *   Never cache unit.points — it changes when the user edits the unit.
 */

export async function getArmyLists(): Promise<ArmyList[]> {
  const db = await getDb();
  return db.select<ArmyList[]>("SELECT * FROM army_lists ORDER BY name ASC");
}

export async function getArmyListById(id: number): Promise<ArmyList | null> {
  const db = await getDb();
  const rows = await db.select<ArmyList[]>(
    "SELECT * FROM army_lists WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function getArmyListWithUnits(listId: number): Promise<ArmyListUnitRow[]> {
  const db = await getDb();
  return db.select<ArmyListUnitRow[]>(
    `SELECT
       alu.id, alu.list_id, alu.unit_id, alu.points_override, alu.notes, alu.created_at,
       u.name AS unit_name,
       u.points AS unit_points,
       u.faction_id,
       u.status_assembly,
       u.status_painting,
       u.painting_percentage,
       COALESCE(alu.points_override, sup.points, uo.points, u.points, 0) AS effective_points
     FROM army_list_units alu
     JOIN units u ON u.id = alu.unit_id
     LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
     LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
       AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
     WHERE alu.list_id = $1
     ORDER BY alu.created_at ASC`,
    [listId]
  );
}

export async function createArmyList(input: CreateArmyListInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO army_lists (name, faction_id, points_limit, list_type, notes, detachment_id, detachment_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.name, input.faction_id, input.points_limit, input.list_type, input.notes, input.detachment_id ?? null, input.detachment_name ?? null]
  );
  return result.lastInsertId ?? 0;
}

export async function updateArmyList(input: UpdateArmyListInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE army_lists
        SET name            = COALESCE($2, name),
            faction_id      = COALESCE($3, faction_id),
            points_limit    = COALESCE($4, points_limit),
            list_type       = COALESCE($5, list_type),
            notes           = COALESCE($6, notes),
            detachment_id   = COALESCE($7, detachment_id),
            detachment_name = COALESCE($8, detachment_name),
            updated_at      = datetime('now')
      WHERE id = $1`,
    [
      input.id,
      input.name ?? null,
      input.faction_id ?? null,
      input.points_limit ?? null,
      input.list_type ?? null,
      input.notes ?? null,
      input.detachment_id ?? null,
      input.detachment_name ?? null,
    ]
  );
}

/**
 * Phase 52 — explicit NULL-clearing for detachment columns.
 * Separate from updateArmyList because COALESCE blocks NULL passthrough.
 * Called when user deselects a detachment from an army list.
 */
export async function clearArmyListDetachment(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE army_lists
        SET detachment_id = NULL,
            detachment_name = NULL,
            updated_at = datetime('now')
      WHERE id = $1`,
    [id]
  );
}

export async function deleteArmyList(id: number): Promise<void> {
  const db = await getDb();
  // CASCADE on army_list_units removes the unit memberships automatically.
  await db.execute("DELETE FROM army_lists WHERE id = $1", [id]);
}

export async function addUnitToList(input: AddUnitToListInput): Promise<number> {
  const db = await getDb();
  // Plain INSERT — duplicates (same unit_id in same list_id) are allowed.
  const result = await db.execute(
    `INSERT INTO army_list_units (list_id, unit_id, points_override, notes)
     VALUES ($1, $2, $3, $4)`,
    [input.list_id, input.unit_id, input.points_override ?? null, input.notes ?? null]
  );
  return result.lastInsertId ?? 0;
}

export async function removeUnitFromList(armyListUnitId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_list_units WHERE id = $1", [armyListUnitId]);
}

/**
 * Full-replacement UPDATE — NULL passthrough.
 * points_override must be clearable back to NULL ("inherit from unit.points").
 * Do NOT copy the COALESCE pattern from updateUnit/updatePaint here.
 */
export async function updateArmyListUnit(input: UpdateArmyListUnitInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET points_override=$2, notes=$3 WHERE id=$1",
    [input.id, input.points_override, input.notes]
  );
}

/**
 * ARMY-05 — Returns the army lists that contain a given unit.
 * Used by the enhanced UnitDeleteDialog to warn before deleting a unit that
 * belongs to one or more active army lists. Returns an empty array when the
 * unit is not in any list.
 *
 * Note: a single unit_id can appear multiple times in the same list (the
 * army_list_units table has no UNIQUE constraint per CONTEXT.md). This SQL
 * does NOT de-duplicate — if "Intercessors" appears in "List A" twice, the
 * caller will see "List A" twice. Plan 04 should de-dup by id at the call
 * site if needed for display.
 */
export async function getArmyListsByUnitId(
  unitId: number,
): Promise<{ id: number; name: string }[]> {
  const db = await getDb();
  return db.select<{ id: number; name: string }[]>(
    `SELECT al.id, al.name
     FROM army_list_units alu
     JOIN army_lists al ON al.id = alu.list_id
     WHERE alu.unit_id = $1`,
    [unitId],
  );
}

/**
 * PLAY-02 — batch readiness query.
 *
 * Returns total and battle-ready points per army list for a set of list IDs.
 * Uses a single GROUP BY query — no N+1 per list.
 *
 * Battle-ready = units with status_painting = 'Completed' (canonical value from
 * PAINTING_STATUS_ORDER — NOT 'Complete', Pitfall 1).
 * Effective points = COALESCE(alu.points_override, uo.points, u.points, 0) — never computed in JS.
 * Returns empty array immediately for empty ids — avoids SQL IN () error (Pitfall 2).
 */
export interface ArmyListReadiness {
  id: number;
  total_points: number;
  battle_ready_points: number;
}

export async function getArmyListReadiness(
  ids: number[]
): Promise<ArmyListReadiness[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  return db.select<ArmyListReadiness[]>(
    `SELECT al.id,
       SUM(COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)) AS total_points,
       SUM(CASE WHEN u.status_painting = 'Completed'
                THEN COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)
                ELSE 0 END) AS battle_ready_points
     FROM army_lists al
     JOIN army_list_units alu ON alu.list_id = al.id
     JOIN units u ON u.id = alu.unit_id
     LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
     LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
       AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
     WHERE al.id IN (${placeholders})
     GROUP BY al.id`,
    ids,
  );
}
