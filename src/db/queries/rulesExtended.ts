/**
 * Phase 43 — extended rules query functions for rw_stratagems, rw_detachments,
 * rw_detachment_abilities, and rw_abilities (shared faction abilities).
 *
 * All four functions read from rules.db only via getRulesDb().
 * Follows the exact pattern of getDatasheetsByFaction in datasheets.ts.
 */
import { getRulesDb } from "@/db/rules-client";
import type { RwAbility, RwStratagem, RwDetachment, RwDetachmentAbility } from "@/types/datasheet";

/**
 * Returns all stratagems for the given Wahapedia faction_id, ordered by name.
 */
export async function getStratagemsByFaction(factionId: string): Promise<RwStratagem[]> {
  const db = await getRulesDb();
  return db.select<RwStratagem[]>(
    "SELECT * FROM rw_stratagems WHERE faction_id = $1 ORDER BY name",
    [factionId]
  );
}

/**
 * Returns all detachments for the given Wahapedia faction_id, ordered by name.
 */
export async function getDetachmentsByFaction(factionId: string): Promise<RwDetachment[]> {
  const db = await getRulesDb();
  return db.select<RwDetachment[]>(
    "SELECT * FROM rw_detachments WHERE faction_id = $1 ORDER BY name",
    [factionId]
  );
}

/**
 * Returns all detachment abilities for the given detachment_id, ordered by name.
 */
export async function getDetachmentAbilitiesByDetachment(detachmentId: string): Promise<RwDetachmentAbility[]> {
  const db = await getRulesDb();
  return db.select<RwDetachmentAbility[]>(
    "SELECT * FROM rw_detachment_abilities WHERE detachment_id = $1 ORDER BY name",
    [detachmentId]
  );
}

/**
 * Returns all shared faction abilities for the given Wahapedia faction_id, ordered by name.
 * Reuses the existing RwAbility interface (rw_abilities table).
 */
export async function getSharedAbilitiesByFaction(factionId: string): Promise<RwAbility[]> {
  const db = await getRulesDb();
  return db.select<RwAbility[]>(
    "SELECT * FROM rw_abilities WHERE faction_id = $1 ORDER BY name",
    [factionId]
  );
}
