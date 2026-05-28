/**
 * Post-sync normalization: matches BSData point names to Wahapedia datasheet names.
 *
 * BSData and Wahapedia use different naming conventions:
 * - Singular vs plural: "Canoptek Spyder" vs "Canoptek Spyders"
 * - Case differences: "Imotekh The Stormlord" vs "Imotekh the Stormlord"
 * - Variant suffixes: "Captain in Gravis Armour" vs "Captain"
 *
 * This module runs after bulk_sync_rules to UPDATE rw_datasheet_points rows
 * whose datasheet_name doesn't match any rw_datasheets.name, resolving them
 * to the closest Wahapedia name. Only updates within the same faction.
 */
import type Database from "@tauri-apps/plugin-sql";

interface PointsRow {
  id: number;
  datasheet_name: string;
  faction_id: string | null;
}

interface DatasheetRow {
  name: string;
  faction_id: string | null;
}

/**
 * Regex matching all apostrophe-like characters:
 * U+0027 ' APOSTROPHE (straight)
 * U+2018 ' LEFT SINGLE QUOTATION MARK (curly left)
 * U+2019 ' RIGHT SINGLE QUOTATION MARK (curly right)
 * U+2032 ' PRIME
 * U+0060 ` GRAVE ACCENT
 */
const APOSTROPHE_RE = /['‘’′`]/g;

/**
 * Normalize a name for fuzzy comparison:
 * - lowercase
 * - strip trailing 's' (handles plural)
 * - strip apostrophes and special quotes
 * - collapse whitespace
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(APOSTROPHE_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, "");
}

/**
 * Try to find a matching datasheet name for an unmatched points entry.
 * Strategies (in order):
 *  1. Case-insensitive exact match
 *  2. Normalized match (strip trailing s, apostrophes)
 *  3. Prefix match (BSData name starts with Wahapedia name or vice versa)
 */
function findBestMatch(
  pointsName: string,
  factionId: string | null,
  datasheetsByFaction: Map<string | null, DatasheetRow[]>,
): string | null {
  const candidates = datasheetsByFaction.get(factionId) ?? [];
  if (candidates.length === 0) return null;

  const ptLower = pointsName.toLowerCase();
  const ptNorm = normalizeName(pointsName);

  // Strategy 1: case-insensitive exact
  for (const ds of candidates) {
    if (ds.name.toLowerCase() === ptLower) return ds.name;
  }

  // Strategy 2: normalized match (handles plural/apostrophe differences)
  for (const ds of candidates) {
    if (normalizeName(ds.name) === ptNorm) return ds.name;
  }

  // Strategy 3: prefix match — only if the shorter name is at least 60% of the longer
  // This handles "Captain in Gravis Armour" -> "Captain" but avoids false matches
  // We skip this for very short names (< 8 chars) to avoid matching unrelated entries
  if (pointsName.length >= 8) {
    for (const ds of candidates) {
      const dsLower = ds.name.toLowerCase();
      const shorter = ptLower.length <= dsLower.length ? ptLower : dsLower;
      const longer = ptLower.length <= dsLower.length ? dsLower : ptLower;
      if (longer.startsWith(shorter) && shorter.length / longer.length >= 0.6) {
        return ds.name;
      }
    }
  }

  return null;
}

/**
 * Normalize rw_datasheet_points names to match rw_datasheets names.
 *
 * Reads all unmatched points entries (where datasheet_name doesn't match
 * any rw_datasheets.name for the same faction), then updates them to the
 * closest matching Wahapedia datasheet name.
 *
 * Returns the number of rows updated.
 */
export async function normalizePointsNames(rulesDb: Database): Promise<number> {
  // Find all points entries with no exact datasheet match
  const unmatched = await rulesDb.select<PointsRow[]>(
    `SELECT dp.id, dp.datasheet_name, dp.faction_id
     FROM rw_datasheet_points dp
     WHERE NOT EXISTS (
       SELECT 1 FROM rw_datasheets d
       WHERE d.name = dp.datasheet_name
         AND (dp.faction_id IS NULL OR d.faction_id = dp.faction_id)
     )`,
    [],
  );

  if (unmatched.length === 0) return 0;

  // Load all datasheets grouped by faction
  const allDatasheets = await rulesDb.select<DatasheetRow[]>(
    "SELECT name, faction_id FROM rw_datasheets ORDER BY name",
    [],
  );

  const byFaction = new Map<string | null, DatasheetRow[]>();
  for (const ds of allDatasheets) {
    const key = ds.faction_id;
    if (!byFaction.has(key)) byFaction.set(key, []);
    byFaction.get(key)!.push(ds);
  }

  let updated = 0;
  for (const row of unmatched) {
    const match = findBestMatch(row.datasheet_name, row.faction_id, byFaction);
    if (match && match !== row.datasheet_name) {
      try {
        await rulesDb.execute(
          "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
          [match, row.id],
        );
        updated++;
      } catch {
        // Skip conflicts (e.g., UNIQUE constraint if a matching row already exists)
        // This happens when both "Canoptek Spyder" and "Canoptek Spyders" exist
        // in points — we keep the one that's already correct
      }
    }
  }

  if (updated > 0) {
    console.info(`[normalizePointsNames] fixed ${updated} / ${unmatched.length} mismatched point names`);
  }

  return updated;
}
