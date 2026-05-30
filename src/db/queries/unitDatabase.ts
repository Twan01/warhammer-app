/**
 * Phase 104 — Unit Database query layer.
 *
 * All queries target hobbyforge.db (udb_* tables seeded by the unit_database.json
 * import in Phase 103). Uses getDb() — NEVER getRulesDb().
 */
import { getDb } from "@/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UdbFaction {
  id: string;
  name: string;
  short_name: string | null;
}

export interface UdbUnitSummary {
  id: string;
  faction_id: string;
  name: string;
  role: string | null;
  base_points: number | null;
  min_models: number | null;
  max_models: number | null;
}

export interface UdbModel {
  id: number;
  unit_id: string;
  line_order: number;
  name: string | null;
  M: string | null;
  T: number | null;
  Sv: string | null;
  inv_sv: string | null;
  W: number | null;
  Ld: string | null;
  OC: number | null;
}

export interface UdbWeapon {
  id: number;
  unit_id: string;
  weapon_group: number;
  line_order: number;
  name: string;
  category: string | null;
  range: string | null;
  attacks: string | null;
  skill: string | null;
  strength: string | null;
  ap: string | null;
  damage: string | null;
  keywords: string | null;
}

export interface UdbAbility {
  id: number;
  unit_id: string;
  line_order: number;
  name: string;
  description: string | null;
  ability_type: string | null;
}

export interface UdbKeyword {
  unit_id: string;
  keyword: string;
  is_faction: number;
}

export interface UdbPointsTier {
  id: number;
  unit_id: string;
  model_count: number;
  points: number;
}

export interface UdbComposition {
  id: number;
  unit_id: string;
  min_models: number;
  max_models: number;
  notes: string | null;
}

export interface UdbUnitDetail {
  id: string;
  faction_id: string;
  name: string;
  role: string | null;
  base_points: number | null;
  damaged_w: string | null;
  damaged_desc: string | null;
  models: UdbModel[];
  weapons: UdbWeapon[];
  abilities: UdbAbility[];
  keywords: UdbKeyword[];
  points: UdbPointsTier[];
  composition: UdbComposition[];
}

export interface UdbSearchResult {
  unit_id: string;
  name: string;
  faction_name: string;
  keywords: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all factions in the unit database, ordered by name.
 */
export async function getUdbFactions(): Promise<UdbFaction[]> {
  const db = await getDb();
  return db.select<UdbFaction[]>(
    "SELECT id, name, short_name FROM udb_factions ORDER BY name ASC",
  );
}

/**
 * Returns unit summaries for a faction, with MIN(points) as base_points
 * and MIN/MAX model counts from composition. Ordered by role then name.
 */
export async function getUdbUnitsByFaction(
  factionId: string,
): Promise<UdbUnitSummary[]> {
  const db = await getDb();
  return db.select<UdbUnitSummary[]>(
    `SELECT
       u.id,
       u.faction_id,
       u.name,
       u.role,
       (SELECT MIN(p.points) FROM udb_unit_points p WHERE p.unit_id = u.id) AS base_points,
       (SELECT MIN(c.min_models) FROM udb_unit_composition c WHERE c.unit_id = u.id) AS min_models,
       (SELECT MAX(c.max_models) FROM udb_unit_composition c WHERE c.unit_id = u.id) AS max_models
     FROM udb_units u
     WHERE u.faction_id = $1
     ORDER BY u.role, u.name ASC`,
    [factionId],
  );
}

/**
 * Returns the full detail for a single unit, including all sub-tables.
 * Returns null if the unit does not exist.
 */
export async function getUdbUnitDetail(
  unitId: string,
): Promise<UdbUnitDetail | null> {
  const db = await getDb();
  const unitRows = await db.select<
    {
      id: string;
      faction_id: string;
      name: string;
      role: string | null;
      base_points: number | null;
      damaged_w: string | null;
      damaged_desc: string | null;
    }[]
  >(
    "SELECT id, faction_id, name, role, base_points, damaged_w, damaged_desc FROM udb_units WHERE id = $1",
    [unitId],
  );
  const unit = unitRows[0];
  if (!unit) return null;

  const [models, weapons, abilities, keywords, points, composition] =
    await Promise.all([
      db.select<UdbModel[]>(
        "SELECT * FROM udb_unit_models WHERE unit_id = $1 ORDER BY line_order",
        [unitId],
      ),
      db.select<UdbWeapon[]>(
        "SELECT * FROM udb_unit_weapons WHERE unit_id = $1 ORDER BY weapon_group, line_order",
        [unitId],
      ),
      db.select<UdbAbility[]>(
        "SELECT * FROM udb_unit_abilities WHERE unit_id = $1 ORDER BY line_order",
        [unitId],
      ),
      db.select<UdbKeyword[]>(
        "SELECT * FROM udb_unit_keywords WHERE unit_id = $1 ORDER BY is_faction DESC, keyword",
        [unitId],
      ),
      db.select<UdbPointsTier[]>(
        "SELECT * FROM udb_unit_points WHERE unit_id = $1 ORDER BY model_count",
        [unitId],
      ),
      db.select<UdbComposition[]>(
        "SELECT * FROM udb_unit_composition WHERE unit_id = $1",
        [unitId],
      ),
    ]);

  return {
    ...unit,
    models,
    weapons,
    abilities,
    keywords,
    points,
    composition,
  };
}

/**
 * Full-text search across the udb_search FTS5 table.
 * Returns empty array for queries shorter than 2 characters.
 * Strips FTS5 special characters and appends * for prefix matching.
 */
export async function searchUdbUnits(
  query: string,
): Promise<UdbSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Strip FTS5 special characters that could cause syntax errors
  const sanitized = trimmed.replace(/["'*^()]/g, "");
  if (sanitized.length === 0) return [];

  const ftsQuery = sanitized + "*";
  const db = await getDb();
  return db.select<UdbSearchResult[]>(
    `SELECT unit_id, name, faction_name, keywords
     FROM udb_search
     WHERE udb_search MATCH $1
     LIMIT 50`,
    [ftsQuery],
  );
}
