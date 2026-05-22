import { getDb } from "@/db/client";
import type {
  ArmyList,
  ArmyListUnitRow,
  ArmyListEnhancement,
  CreateArmyListInput,
  UpdateArmyListInput,
  AddUnitToListInput,
  UpdateArmyListUnitInput,
  AddGhostUnitToListInput,
  AddEnhancementInput,
} from "@/types/armyList";

/**
 * Army list queries (ARMY-01..07).
 *
 * Critical contracts:
 * - updateArmyListUnit uses full-replacement UPDATE (SET points_override=$2, notes=$3)
 *   so points_override can be cleared back to NULL. Do NOT use COALESCE for the join row.
 * - addUnitToList allows the same unit_id to appear multiple times in one list
 *   (no UNIQUE constraint on (list_id, unit_id) — intentional per CONTEXT.md).
 * - getArmyListWithUnits LEFT JOINs units to support ghost/planned units (unit_id IS NULL).
 *   Computes effective_points via 6-level COALESCE chain in SQL (Phase 89):
 *   COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)
 *   Never cache unit.points — it changes when the user edits the unit.
 * - New nullable columns (leader_attached_to_id, selected_model_count) each have dedicated
 *   clear functions following the clearArmyListDetachment pattern (D-13).
 */

export async function getArmyLists(): Promise<ArmyList[]> {
  const db = await getDb();
  return db.select<ArmyList[]>("SELECT * FROM army_lists ORDER BY name ASC");
}

/** Lightweight projection: army list id/name + unit names for delta impact analysis.
 * Uses LEFT JOIN to include ghost units (unit_id IS NULL) via COALESCE on unit_name. */
export async function getArmyListUnitNames(): Promise<
  Array<{ list_id: number; list_name: string; unit_name: string }>
> {
  const db = await getDb();
  return db.select(
    `SELECT al.id AS list_id, al.name AS list_name,
            COALESCE(u.name, alu.ghost_unit_name) AS unit_name
     FROM army_lists al
     JOIN army_list_units alu ON alu.list_id = al.id
     LEFT JOIN units u ON u.id = alu.unit_id
     ORDER BY al.id`,
  );
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
  const rows = await db.select<ArmyListUnitRow[]>(
    `SELECT
       alu.id, alu.list_id, alu.unit_id, alu.ghost_unit_name,
       alu.is_warlord, alu.selected_model_count, alu.leader_attached_to_id,
       alu.points_override, alu.notes, alu.tactical_role, alu.created_at,
       COALESCE(u.name, alu.ghost_unit_name) AS unit_name,
       u.points AS unit_points,
       u.faction_id,
       u.status_assembly,
       u.status_painting,
       u.painting_percentage,
       sup.points AS synced_points,
       uo.points AS override_points,
       tier.points AS tier_points,
       COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0) AS effective_points
     FROM army_list_units alu
     LEFT JOIN units u ON u.id = alu.unit_id
     LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
     LEFT JOIN synced_unit_points sup
       ON sup.unit_name = COALESCE(u.name, alu.ghost_unit_name)
       AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
     LEFT JOIN synced_unit_point_tiers tier
       ON tier.unit_name = COALESCE(u.name, alu.ghost_unit_name)
       AND tier.model_count = alu.selected_model_count
       AND (tier.faction_id IS NULL OR tier.faction_id = CAST(u.faction_id AS TEXT))
     WHERE alu.list_id = $1
     ORDER BY alu.created_at ASC, alu.id ASC`,
    [listId]
  );
  return rows;
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
            list_type       = $5,
            notes           = $6,
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

/**
 * Phase 66 — explicit NULL-clearing for points_limit.
 * Separate from updateArmyList because COALESCE blocks NULL passthrough.
 * Called when user removes the points limit from an army list.
 */
export async function clearArmyListPointsLimit(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE army_lists
        SET points_limit = NULL,
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
    "UPDATE army_list_units SET points_override=$2, notes=$3, tactical_role=$4 WHERE id=$1",
    [input.id, input.points_override, input.notes, input.tactical_role]
  );
}

/**
 * Phase 89 — Warlord designation (D-10).
 * Sets is_warlord = 1 for the target row and 0 for all other rows in the same list.
 * Single UPDATE with CASE WHEN scoped by list_id to prevent cross-list mutation (Pitfall 4).
 */
export async function setWarlord(armyListUnitId: number, listId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE army_list_units
        SET is_warlord = CASE WHEN id = $1 THEN 1 ELSE 0 END
      WHERE list_id = $2`,
    [armyListUnitId, listId],
  );
}

/**
 * Phase 89 — Clear warlord designation for all units in a list.
 * Used when the user explicitly deselects the warlord.
 */
export async function clearWarlord(listId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE army_list_units SET is_warlord = 0 WHERE list_id = $1`,
    [listId],
  );
}

/**
 * Phase 89 — Add a ghost/planned unit to an army list (D-04).
 * Ghost units have unit_id = NULL and ghost_unit_name set to the canonical unit name
 * (must match BSData/Wahapedia canonical name for points to resolve via name join).
 */
export async function addGhostUnitToList(input: AddGhostUnitToListInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO army_list_units (list_id, unit_id, ghost_unit_name, points_override, notes)
     VALUES ($1, NULL, $2, $3, $4)`,
    [input.list_id, input.ghost_unit_name, input.points_override ?? null, input.notes ?? null],
  );
  return result.lastInsertId ?? 0;
}

/**
 * Phase 89 — Set leader attachment (D-03).
 * Records that the given army_list_units row is attached to the target unit row.
 * The FK uses ON DELETE SET NULL so removing the target unlinks the leader.
 */
export async function setLeaderAttachment(armyListUnitId: number, targetId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET leader_attached_to_id = $2 WHERE id = $1",
    [armyListUnitId, targetId],
  );
}

/**
 * Phase 89 — Clear leader attachment (D-13).
 * Separate from setLeaderAttachment so NULL can be passed through explicitly.
 */
export async function clearLeaderAttachment(armyListUnitId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET leader_attached_to_id = NULL WHERE id = $1",
    [armyListUnitId],
  );
}

/**
 * Phase 89 — Set selected model count for tier-based points resolution (D-08).
 * When set, the COALESCE chain resolves tier.points from synced_unit_point_tiers
 * matching (unit_name, faction_id, model_count).
 */
export async function setSelectedModelCount(armyListUnitId: number, count: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET selected_model_count = $2 WHERE id = $1",
    [armyListUnitId, count],
  );
}

/**
 * Phase 89 — Clear selected model count back to NULL (D-13).
 * NULL means "use default/min tier" — points fall through to synced_unit_points.
 */
export async function clearSelectedModelCount(armyListUnitId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE army_list_units SET selected_model_count = NULL WHERE id = $1",
    [armyListUnitId],
  );
}

/**
 * Phase 89 — Add an enhancement to an army list unit (D-01, D-02).
 * Stores TEXT/INTEGER copies of enhancement name and points at assignment time
 * (denormalized — survives rules.db DELETE-all + re-INSERT on next sync).
 * Enhancement points are tracked separately from the per-unit COALESCE chain.
 */
export async function addEnhancement(input: AddEnhancementInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO army_list_enhancements (list_id, army_list_unit_id, enhancement_name, enhancement_points)
     VALUES ($1, $2, $3, $4)`,
    [input.list_id, input.army_list_unit_id, input.enhancement_name, input.enhancement_points],
  );
  return result.lastInsertId ?? 0;
}

/**
 * Phase 89 — Remove an enhancement assignment by its own id.
 */
export async function removeEnhancement(enhancementId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_list_enhancements WHERE id = $1", [enhancementId]);
}

/**
 * Phase 89 — Get all enhancements assigned to units in an army list.
 * Ordered by created_at ASC for stable display.
 */
export async function getEnhancementsByList(listId: number): Promise<ArmyListEnhancement[]> {
  const db = await getDb();
  return db.select<ArmyListEnhancement[]>(
    "SELECT * FROM army_list_enhancements WHERE list_id = $1 ORDER BY created_at ASC",
    [listId],
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
 * Effective points = COALESCE(alu.points_override, sup.points, uo.points, u.points, 0) — never computed in JS.
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
       SUM(COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)) AS total_points,
       SUM(CASE WHEN u.status_painting = 'Completed'
                THEN COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)
                ELSE 0 END) AS battle_ready_points
     FROM army_lists al
     JOIN army_list_units alu ON alu.list_id = al.id
     LEFT JOIN units u ON u.id = alu.unit_id
     LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
     LEFT JOIN synced_unit_points sup
       ON sup.unit_name = COALESCE(u.name, alu.ghost_unit_name)
       AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
     LEFT JOIN synced_unit_point_tiers tier
       ON tier.unit_name = COALESCE(u.name, alu.ghost_unit_name)
       AND tier.model_count = alu.selected_model_count
       AND (tier.faction_id IS NULL OR tier.faction_id = CAST(u.faction_id AS TEXT))
     WHERE al.id IN (${placeholders})
     GROUP BY al.id`,
    ids,
  );
}
