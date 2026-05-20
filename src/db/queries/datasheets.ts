/**
 * Phase 15 — datasheet queries spanning rules.db (rw_* tables) AND
 * hobbyforge.db (unit_strategy_notes.datasheet_id link column).
 *
 * Reads:
 *   - getDatasheetsByFaction → rules.db (faction-pre-filtered list for picker)
 *   - getFullDatasheet → rules.db (5 sub-queries joined into FullDatasheet)
 *   - getRulesSyncMeta → rules.db (single rw_sync_meta row, may not exist yet)
 *   - getDatasheetIdForUnit → hobbyforge.db (the link column on unit_strategy_notes)
 *
 * Writes:
 *   - upsertDatasheetLink → hobbyforge.db (sets unit_strategy_notes.datasheet_id;
 *     creates the strategy_notes row if missing, mirrors strategyNotes.ts pattern)
 *
 * Bulk insert (BEGIN/COMMIT transaction for ~5000 rows during sync) lives in
 * Plan 15-04's useRulesSync hook, not here — that's a sync-only path that
 * touches all 6 rw_* tables in one transaction.
 */
import { getDb } from "@/db/client";
import { getRulesDb } from "@/db/rules-client";
import { stripHtml } from "@/lib/stripHtml";
import type {
  DatasheetSummary,
  FullDatasheet,
  RulesSyncMeta,
  RwDatasheet,
  RwDatasheetAbility,
  RwDatasheetKeyword,
  RwDatasheetModel,
  RwDatasheetWargear,
  RwSource,
} from "@/types/datasheet";

/**
 * DS-04: faction-pre-filtered list shown in DatasheetPicker.
 * Returns the 3-column projection used by the picker (id, name, role).
 * Ordered by name ASC — picker uses client-side substring filter on top.
 */
export async function getDatasheetsByFaction(
  factionId: string
): Promise<DatasheetSummary[]> {
  const db = await getRulesDb();
  return db.select<DatasheetSummary[]>(
    "SELECT id, name, role FROM rw_datasheets WHERE faction_id = $1 ORDER BY name ASC",
    [factionId]
  );
}

/**
 * DS-07: full datasheet payload — 5 queries joined client-side into FullDatasheet.
 * Returns null when the datasheetId does not exist in rules.db (e.g. user re-synced
 * and the datasheet was removed upstream). Wargear / Wargear profile / Fortification
 * abilities are filtered out per the Wahapedia type-mapping table in 15-RESEARCH.md.
 *
 * stripHtml is applied to ability description and ability name on the way out so
 * UI consumers receive plain readable text without HTML tags or entities.
 */
export async function getFullDatasheet(
  datasheetId: string
): Promise<FullDatasheet | null> {
  const db = await getRulesDb();
  const dsRows = await db.select<RwDatasheet[]>(
    "SELECT * FROM rw_datasheets WHERE id = $1",
    [datasheetId]
  );
  const ds = dsRows[0];
  if (!ds) return null;

  const models = await db.select<RwDatasheetModel[]>(
    "SELECT * FROM rw_datasheet_models WHERE datasheet_id = $1 ORDER BY line",
    [datasheetId]
  );
  const abilitiesRaw = await db.select<RwDatasheetAbility[]>(
    `SELECT * FROM rw_datasheet_abilities
     WHERE datasheet_id = $1
       AND type NOT IN ('Wargear', 'Wargear profile', 'Fortification (левая колонка)')
     ORDER BY line`,
    [datasheetId]
  );
  // Sanitize description + name (Wahapedia stores HTML markup in some rows).
  const abilities: RwDatasheetAbility[] = abilitiesRaw.map((a) => ({
    ...a,
    name: stripHtml(a.name ?? ""),
    description: a.description !== null ? stripHtml(a.description) : null,
  }));
  const keywords = await db.select<RwDatasheetKeyword[]>(
    "SELECT * FROM rw_datasheet_keywords WHERE datasheet_id = $1 ORDER BY is_faction_keyword DESC, keyword",
    [datasheetId]
  );
  const sourceRows = ds.source_id
    ? await db.select<RwSource[]>("SELECT * FROM rw_sources WHERE id = $1", [ds.source_id])
    : [];
  const wargear = await db.select<RwDatasheetWargear[]>(
    "SELECT * FROM rw_datasheets_wargear WHERE datasheet_id = $1 ORDER BY line, line_in_wargear",
    [datasheetId]
  );
  return { ds, models, abilities, keywords, source: sourceRows[0] ?? null, wargear };
}

/**
 * DS-02 + DS-03: returns the single rw_sync_meta row, or null when rules.db is
 * empty/uninitialized. The try/catch swallows the "no such table" error which
 * occurs when the schema preload didn't run yet (Pitfall 3).
 */
export async function getRulesSyncMeta(): Promise<RulesSyncMeta | null> {
  try {
    const db = await getRulesDb();
    const rows = await db.select<RulesSyncMeta[]>(
      "SELECT * FROM rw_sync_meta WHERE id = 1"
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * DS-06: returns the datasheet_id stored on unit_strategy_notes for the given
 * unit, or null if the unit has no strategy note yet OR the strategy note has
 * no datasheet link.
 */
export async function getDatasheetIdForUnit(unitId: number): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ datasheet_id: string | null }[]>(
    "SELECT datasheet_id FROM unit_strategy_notes WHERE unit_id = $1 LIMIT 1",
    [unitId]
  );
  return rows[0]?.datasheet_id ?? null;
}

/**
 * DS-06: writes the unit→datasheet link to hobbyforge.db.
 *
 * Select-then-insert/update mirrors strategyNotes.ts (no UNIQUE constraint on
 * unit_strategy_notes.unit_id). When no strategy_note row exists yet, INSERTs
 * a row with ONLY unit_id and datasheet_id populated — all the playbook fields
 * remain NULL, just like a brand-new manually-created strategy note.
 */
export async function upsertDatasheetLink(input: {
  unit_id: number;
  datasheet_id: string;
}): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM unit_strategy_notes WHERE unit_id = $1",
    [input.unit_id]
  );
  if (existing.length > 0) {
    await db.execute(
      "UPDATE unit_strategy_notes SET datasheet_id = $2, updated_at = datetime('now') WHERE unit_id = $1",
      [input.unit_id, input.datasheet_id]
    );
  } else {
    await db.execute(
      "INSERT INTO unit_strategy_notes (unit_id, datasheet_id) VALUES ($1, $2)",
      [input.unit_id, input.datasheet_id]
    );
  }
}

/**
 * Alias map: local faction names that don't match any Wahapedia faction name
 * directly. Maps LOWERCASE local name → LOWERCASE Wahapedia rw_factions.name.
 *
 * Covers two categories:
 *  1. Subfactions (Space Marines chapters, Astra Militarum regiments, etc.)
 *  2. Spelling variants (Tau vs T'au, Grey Knights vs Gray Knights, etc.)
 *
 * This list is intentionally kept small and static — only names known to cause
 * mismatch are included. Users with truly custom faction names will still get
 * the null-branch fallback (empty state or full-text search).
 */
const FACTION_ALIAS_MAP: Record<string, string> = {
  // Space Marines chapters → parent faction
  "ultramarines": "space marines",
  "blood angels": "space marines",
  "dark angels": "space marines",
  "space wolves": "space marines",
  "black templars": "space marines",
  "imperial fists": "space marines",
  "iron hands": "space marines",
  "salamanders": "space marines",
  "raven guard": "space marines",
  "white scars": "space marines",
  "deathwatch": "space marines",
  "crimson fists": "space marines",
  // Chaos Space Marines warbands
  "world eaters": "world eaters",
  "death guard": "death guard",
  "thousand sons": "thousand sons",
  "emperor's children": "chaos space marines",
  "black legion": "chaos space marines",
  "iron warriors": "chaos space marines",
  "night lords": "chaos space marines",
  "word bearers": "chaos space marines",
  "alpha legion": "chaos space marines",
  // T'au spelling variants
  "tau empire": "t'au empire",
  "tau": "t'au empire",
  "t'au": "t'au empire",
  // Astra Militarum aliases
  "imperial guard": "astra militarum",
  "astra militarum": "astra militarum",
  // Aeldari aliases
  "craftworlds": "aeldari",
  "craftworld eldar": "aeldari",
  "eldar": "aeldari",
  "ynnari": "aeldari",
  // Drukhari aliases
  "dark eldar": "drukhari",
  // Orks aliases
  "orks": "orks",
  // Grey Knights
  "gray knights": "grey knights",
  // Adeptus Custodes
  "custodes": "adeptus custodes",
  // Adeptus Mechanicus
  "ad mech": "adeptus mechanicus",
  "admech": "adeptus mechanicus",
  // Sisters of Battle
  "sisters of battle": "adepta sororitas",
  "sororitas": "adepta sororitas",
};

/**
 * Strip apostrophes, dashes, and extra whitespace for normalized comparison.
 * "T'au Empire" → "tau empire", "Chaos Space Marines" → "chaos space marines"
 */
function normalizeFactionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['‘’′]/g, "") // strip curly/straight apostrophes
    .replace(/[-]/g, " ")                    // dash to space
    .replace(/\s+/g, " ")                    // collapse whitespace
    .trim();
}

/**
 * DS-04 cross-DB faction lookup.
 *
 * HobbyForge factions store full names ("Space Marines", "Necrons") while Wahapedia
 * uses faction codes (SM, NEC). The DatasheetPicker pre-filter requires a Wahapedia
 * faction id, so we look up rw_factions.name (case-insensitive equality) against
 * the user's HobbyForge faction name. Returns null when no match — the picker
 * then either falls back to "all factions" or surfaces a friendly empty state
 * (PlaybookTab handles the null branch).
 *
 * Resolution strategy (tried in order):
 *  1. Direct SQL match (exact, contains, or contained-by — case insensitive)
 *  2. Alias map lookup → re-query with the canonical Wahapedia faction name
 *  3. Normalized match (strip apostrophes/dashes) via REPLACE in SQL
 *
 * Returns null when no match — the caller falls back gracefully.
 */
export interface WahapediaFaction {
  id: string;
  name: string;
}

export async function getWahapediaFactions(): Promise<WahapediaFaction[]> {
  const db = await getRulesDb();
  return db.select<WahapediaFaction[]>(
    "SELECT id, name FROM rw_factions ORDER BY name ASC"
  );
}

export async function resolveWahapediaFactionIdByName(
  name: string
): Promise<string | null> {
  const db = await getRulesDb();

  // Step 1: Direct SQL match (exact or substring-contains, case-insensitive)
  const directRows = await db.select<{ id: string }[]>(
    `SELECT id FROM rw_factions
     WHERE LOWER(name) = LOWER($1)
        OR LOWER($1) LIKE '%' || LOWER(name) || '%'
        OR LOWER(name) LIKE '%' || LOWER($1) || '%'
     LIMIT 1`,
    [name]
  );
  if (directRows[0]) return directRows[0].id;

  // Step 2: Alias map — resolve known subfaction/variant names to parent faction
  const aliasTarget = FACTION_ALIAS_MAP[name.toLowerCase()];
  if (aliasTarget) {
    const aliasRows = await db.select<{ id: string }[]>(
      `SELECT id FROM rw_factions
       WHERE LOWER(name) = $1
       LIMIT 1`,
      [aliasTarget]
    );
    if (aliasRows[0]) return aliasRows[0].id;
  }

  // Step 3: Normalized match — strip apostrophes and compare
  // Handles "Tau Empire" matching "T'au Empire" even without alias entry
  const normalized = normalizeFactionName(name);
  const normalizedRows = await db.select<{ id: string }[]>(
    `SELECT id FROM rw_factions
     WHERE LOWER(REPLACE(REPLACE(REPLACE(name, '''', ''), '’', ''), '-', ' ')) = $1
     LIMIT 1`,
    [normalized]
  );
  if (normalizedRows[0]) return normalizedRows[0].id;

  return null;
}

export interface DatasheetWithPoints {
  id: string;
  name: string;
  role: string | null;
  points: number | null;
}

export async function getDatasheetsByFactionWithPoints(
  factionId: string,
): Promise<DatasheetWithPoints[]> {
  const db = await getRulesDb();
  return db.select<DatasheetWithPoints[]>(
    `SELECT d.id, d.name, d.role, dp.points
     FROM rw_datasheets d
     LEFT JOIN rw_datasheet_points dp
       ON dp.datasheet_name = d.name
       AND (dp.faction_id IS NULL OR dp.faction_id = d.faction_id)
     WHERE d.faction_id = $1
     ORDER BY d.role, d.name ASC`,
    [factionId],
  );
}

/**
 * DS-04 fallback: search datasheets by name substring when no faction match.
 * Requires at least 2 characters to avoid returning the full 2500-row table.
 */
export async function searchAllDatasheets(
  query: string
): Promise<DatasheetSummary[]> {
  if (query.trim().length < 2) return [];
  const db = await getRulesDb();
  return db.select<DatasheetSummary[]>(
    "SELECT id, name, role FROM rw_datasheets WHERE LOWER(name) LIKE '%' || LOWER($1) || '%' ORDER BY name ASC LIMIT 100",
    [query.trim()]
  );
}
