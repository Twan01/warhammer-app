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
  sub_faction: string | null;
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

/**
 * Phase 105 COL-02: Aggregated ownership per udb_unit_id within a faction.
 * owned_count: number of collection units linked to this udb_unit
 * all_statuses: pipe-separated painting statuses for all linked units (GROUP_CONCAT)
 */
export interface UdbOwnershipEntry {
  udb_unit_id: string;
  owned_count: number;
  all_statuses: string;
}

export interface UdbKeywordsMapEntry {
  unit_id: string;
  keywords: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all factions in the unit database, ordered by name.
 * When locale='fr', uses COALESCE(name_fr, name) for display names.
 */
export async function getUdbFactions(locale?: "en" | "fr"): Promise<UdbFaction[]> {
  const db = await getDb();
  const nameSql = locale === "fr" ? "COALESCE(name_fr, name) AS name" : "name";
  return db.select<UdbFaction[]>(
    `SELECT id, ${nameSql}, short_name FROM udb_factions ORDER BY name ASC`,
  );
}

/**
 * Returns unit summaries for a faction, with MIN(points) as base_points
 * and MIN/MAX model counts from composition. Ordered by role then name.
 * When locale='fr', uses COALESCE(u.name_fr, u.name) for display names.
 */
export async function getUdbUnitsByFaction(
  factionId: string,
  locale?: "en" | "fr",
): Promise<UdbUnitSummary[]> {
  const db = await getDb();
  const nameSql = locale === "fr" ? "COALESCE(u.name_fr, u.name)" : "u.name";
  return db.select<UdbUnitSummary[]>(
    `SELECT
       u.id,
       u.faction_id,
       ${nameSql} AS name,
       u.role,
       u.sub_faction,
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
 * When locale='fr', uses COALESCE for unit name, ability names/descriptions, and weapon names.
 */
export async function getUdbUnitDetail(
  unitId: string,
  locale?: "en" | "fr",
): Promise<UdbUnitDetail | null> {
  const db = await getDb();
  const fr = locale === "fr";
  const unitNameSql = fr ? "COALESCE(name_fr, name) AS name" : "name";
  const abilityFieldsSql = fr
    ? "COALESCE(name_fr, name) AS name, COALESCE(description_fr, description) AS description"
    : "name, description";
  const weaponNameSql = fr ? "COALESCE(name_fr, name) AS name" : "name";

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
    `SELECT id, faction_id, ${unitNameSql}, role, base_points, damaged_w, damaged_desc FROM udb_units WHERE id = $1`,
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
        `SELECT id, unit_id, weapon_group, line_order, ${weaponNameSql}, category, range, attacks, skill, strength, ap, damage, keywords FROM udb_unit_weapons WHERE unit_id = $1 ORDER BY weapon_group, line_order`,
        [unitId],
      ),
      db.select<UdbAbility[]>(
        `SELECT id, unit_id, line_order, ${abilityFieldsSql}, ability_type FROM udb_unit_abilities WHERE unit_id = $1 ORDER BY line_order`,
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

export async function getUdbOwnershipForUnit(
  udbUnitId: string,
): Promise<UdbOwnershipEntry | null> {
  const db = await getDb();
  const rows = await db.select<UdbOwnershipEntry[]>(
    `SELECT u.udb_unit_id,
            COUNT(*) AS owned_count,
            GROUP_CONCAT(u.status_painting, '|') AS all_statuses
     FROM units u
     WHERE u.udb_unit_id = $1
     GROUP BY u.udb_unit_id`,
    [udbUnitId],
  );
  return rows[0] ?? null;
}

/**
 * Phase 105 COL-02/COL-04: Returns aggregated ownership data per udb_unit_id
 * for a given faction. Joins collection units to udb_units via the FK column.
 *
 * Uses GROUP_CONCAT (not MIN) for status aggregation — SQLite MIN on TEXT is
 * alphabetical, not semantic. JS resolves worst status via PAINTING_STATUS_ORDER.
 *
 * factionId is the udb_factions.id string (e.g. "SM", "NEC").
 */
export async function getUdbOwnershipByFaction(
  factionId: string,
): Promise<UdbOwnershipEntry[]> {
  const db = await getDb();
  return db.select<UdbOwnershipEntry[]>(
    `SELECT u.udb_unit_id,
            COUNT(*) AS owned_count,
            GROUP_CONCAT(u.status_painting, '|') AS all_statuses
     FROM units u
     JOIN udb_units uu ON uu.id = u.udb_unit_id
     WHERE uu.faction_id = $1
       AND u.udb_unit_id IS NOT NULL
     GROUP BY u.udb_unit_id`,
    [factionId],
  );
}

export async function getUdbKeywordsByFaction(
  factionId: string,
): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.select<UdbKeywordsMapEntry[]>(
    `SELECT k.unit_id, GROUP_CONCAT(k.keyword, ', ') AS keywords
     FROM udb_unit_keywords k
     JOIN udb_units u ON u.id = k.unit_id
     WHERE u.faction_id = $1
     GROUP BY k.unit_id`,
    [factionId],
  );
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.unit_id, row.keywords);
  }
  return map;
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

  const sanitized = trimmed
    .replace(/["'*^(){}:+\-]/g, "")
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
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

/**
 * Phase 109 — Returns distinct non-null sub-faction names for a faction,
 * sorted alphabetically. Returns empty array for factions without sub-factions.
 */
export async function getDistinctSubFactions(
  factionId: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ sub_faction: string }[]>(
    `SELECT DISTINCT sub_faction FROM udb_units
     WHERE faction_id = $1 AND sub_faction IS NOT NULL
     ORDER BY sub_faction`,
    [factionId],
  );
  return rows.map((r) => r.sub_faction);
}

/**
 * Phase 109 — Returns UDB unit IDs matching a specific sub-faction within a faction.
 * Used for Set-based client-side filtering in collection/picker surfaces.
 */
export async function getUdbUnitIdsBySubFaction(
  factionId: string,
  subFaction: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM udb_units WHERE faction_id = $1 AND sub_faction = $2`,
    [factionId, subFaction],
  );
  return rows.map((r) => r.id);
}
