/**
 * Phase 120 — Game data query layer.
 *
 * Query functions for udb_stratagems, udb_enhancements, udb_detachments,
 * and udb_detachment_abilities (migrations 042 + 043).
 *
 * All queries target hobbyforge.db via getDb() — NEVER getRulesDb().
 * Uses $1/$2 positional parameterized syntax (Tauri plugin-sql requirement).
 */
import { getDb } from "@/db/client";
import type {
  UdbStratagem,
  UdbEnhancement,
  UdbDetachment,
  UdbDetachmentAbility,
  UdbDetachmentAbilityWithDetachment,
} from "@/types/gameData";

/**
 * Returns stratagems for a detachment, including universal stratagems
 * (those with no faction_id and no detachment_id — per D-02/D-04).
 * Ordered by phase then name.
 */
export async function getStratagemsByDetachment(
  detachmentId: string,
): Promise<UdbStratagem[]> {
  const db = await getDb();
  return db.select<UdbStratagem[]>(
    `SELECT id, faction_id, detachment_id, name, type, cp_cost, turn, phase, description
     FROM udb_stratagems
     WHERE detachment_id = $1
        OR (faction_id IS NULL AND detachment_id IS NULL)
     ORDER BY phase, name`,
    [detachmentId],
  );
}

/**
 * Returns stratagems for a faction, including universal stratagems
 * (those with no faction_id and no detachment_id — per D-07).
 * Ordered by phase then name.
 */
export async function getStratagemsByFaction(
  factionId: string,
): Promise<UdbStratagem[]> {
  const db = await getDb();
  return db.select<UdbStratagem[]>(
    `SELECT id, faction_id, detachment_id, name, type, cp_cost, turn, phase, description
     FROM udb_stratagems
     WHERE faction_id = $1
        OR (faction_id IS NULL AND detachment_id IS NULL)
     ORDER BY phase, name`,
    [factionId],
  );
}

/**
 * Returns enhancements for a detachment — per D-09.
 * Ordered by name.
 */
export async function getEnhancementsByDetachment(
  detachmentId: string,
): Promise<UdbEnhancement[]> {
  const db = await getDb();
  return db.select<UdbEnhancement[]>(
    `SELECT id, faction_id, detachment_id, name, cost, description
     FROM udb_enhancements
     WHERE detachment_id = $1
     ORDER BY name`,
    [detachmentId],
  );
}

/**
 * Returns detachments for a faction — per D-12.
 * Ordered by name.
 */
export async function getDetachmentsByFaction(
  factionId: string,
): Promise<UdbDetachment[]> {
  const db = await getDb();
  return db.select<UdbDetachment[]>(
    `SELECT id, faction_id, name
     FROM udb_detachments
     WHERE faction_id = $1
     ORDER BY name`,
    [factionId],
  );
}

/**
 * Returns all detachment abilities for a faction, with detachment_name joined
 * from udb_detachments — per D-14. Ordered by detachment name then ability name.
 */
export async function getDetachmentAbilitiesByFaction(
  factionId: string,
): Promise<UdbDetachmentAbilityWithDetachment[]> {
  const db = await getDb();
  return db.select<UdbDetachmentAbilityWithDetachment[]>(
    `SELECT a.id, a.detachment_id, a.faction_id, a.name, a.description,
            d.name AS detachment_name
     FROM udb_detachment_abilities a
     JOIN udb_detachments d ON d.id = a.detachment_id
     WHERE a.faction_id = $1
     ORDER BY d.name, a.name`,
    [factionId],
  );
}

/**
 * Returns detachment abilities for a single detachment.
 * Used by DetachmentCard for per-card fetching.
 * Ordered by name.
 */
export async function getDetachmentAbilitiesByDetachment(
  detachmentId: string,
): Promise<UdbDetachmentAbility[]> {
  const db = await getDb();
  return db.select<UdbDetachmentAbility[]>(
    `SELECT id, detachment_id, faction_id, name, description
     FROM udb_detachment_abilities
     WHERE detachment_id = $1
     ORDER BY name`,
    [detachmentId],
  );
}
