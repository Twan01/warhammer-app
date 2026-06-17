import { getDb } from "@/db/client";

/**
 * Phase 137 — Canonical leader-attachment query module (PLAY-03).
 *
 * getLeaderTargetsForList joins army_list_units through the canonical
 * udb_leader_targets table (populated by the Rust importer from
 * Datasheets_leader.csv) to return id-keyed (leader_alu_id, target_alu_id)
 * pairs for all valid pairings within a single army list.
 *
 * Units with NULL udb_unit_id produce no rows — handled as the permissive
 * fallback in LeaderAttachmentSheet (D-09).
 *
 * Security: listId is bound via $1 positional param — no string interpolation
 * (T-137-06).
 */

export interface CanonicalLeaderPairRow {
  leader_alu_id: number; // army_list_units.id of the leader unit
  target_alu_id: number; // army_list_units.id of a valid target unit
}

/**
 * Returns all canonical (leader_alu_id, target_alu_id) pairs for units in
 * the given list.
 *
 * Join path:
 *   army_list_units leader_alu
 *   → units leader_u (on unit_id)
 *   → udb_leader_targets lt (on leader_u.udb_unit_id = lt.leader_unit_id)
 *   → units target_u (on target_u.udb_unit_id = lt.target_unit_id)
 *   → army_list_units target_alu (on unit_id AND list_id = $1)
 *   WHERE leader_alu.list_id = $1
 *
 * D-07: call this ONCE at page/sheet level via useLeaderTargets(listId),
 * never per-row (hooks-in-loop / N+1 violation).
 */
export async function getLeaderTargetsForList(
  listId: number,
): Promise<CanonicalLeaderPairRow[]> {
  const db = await getDb();
  return db.select<CanonicalLeaderPairRow[]>(
    `SELECT
       leader_alu.id AS leader_alu_id,
       target_alu.id AS target_alu_id
     FROM army_list_units leader_alu
     JOIN units leader_u ON leader_u.id = leader_alu.unit_id
     JOIN udb_leader_targets lt ON lt.leader_unit_id = leader_u.udb_unit_id
     JOIN units target_u ON target_u.udb_unit_id = lt.target_unit_id
     JOIN army_list_units target_alu
       ON target_alu.unit_id = target_u.id
       AND target_alu.list_id = $1
     WHERE leader_alu.list_id = $1`,
    [listId],
  );
}
