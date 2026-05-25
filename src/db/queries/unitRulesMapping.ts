import { getDb } from "@/db/client";
import { getRulesDb } from "@/db/rules-client";
import type {
  UnitRulesMapping,
  UpsertUnitRulesMappingInput,
} from "@/types/unitRulesMapping";

/** Escape LIKE special characters so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * UnitRulesMapping queries (PV-03..05, D-07).
 *
 * One mapping row per unit in hobbyforge.db. Links a collection unit
 * to its rules datasheet entry (from rules.db sync or manual selection).
 *
 * upsertUnitRulesMapping uses select-then-insert/update pattern
 * (same as unitOverrides.ts) because unit_id has a UNIQUE constraint.
 */

export async function getUnitRulesMapping(
  unitId: number,
): Promise<UnitRulesMapping | null> {
  const db = await getDb();
  const rows = await db.select<UnitRulesMapping[]>(
    "SELECT * FROM unit_rules_mapping WHERE unit_id = $1 LIMIT 1",
    [unitId],
  );
  return rows[0] ?? null;
}

export async function getUnitRulesMappings(): Promise<UnitRulesMapping[]> {
  const db = await getDb();
  return db.select<UnitRulesMapping[]>(
    "SELECT * FROM unit_rules_mapping ORDER BY unit_id ASC",
  );
}

export async function upsertUnitRulesMapping(
  input: UpsertUnitRulesMappingInput,
): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM unit_rules_mapping WHERE unit_id = $1",
    [input.unit_id],
  );
  if (existing.length > 0) {
    await db.execute(
      `UPDATE unit_rules_mapping SET
         rules_datasheet_id=$2, match_status=$3, source=$4, datasheet_name=$5,
         updated_at=datetime('now')
       WHERE unit_id=$1`,
      [
        input.unit_id,
        input.rules_datasheet_id,
        input.match_status,
        input.source ?? null,
        input.datasheet_name ?? null,
      ],
    );
  } else {
    await db.execute(
      `INSERT INTO unit_rules_mapping
         (unit_id, rules_datasheet_id, match_status, source, datasheet_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.unit_id,
        input.rules_datasheet_id,
        input.match_status,
        input.source ?? null,
        input.datasheet_name ?? null,
      ],
    );
  }
}

export async function deleteUnitRulesMapping(unitId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM unit_rules_mapping WHERE unit_id = $1", [
    unitId,
  ]);
}

/**
 * Find matching datasheets in the synced_unit_points cache (hobbyforge.db).
 * Used for ambiguity detection (D-10) — checks if multiple entries share
 * the unit's name, which indicates the auto-match may be ambiguous.
 *
 * T-76-02: Uses parameterized queries ($1/$2) for SQL injection prevention.
 */
export async function findMatchingDatasheets(
  unitName: string,
  _factionId: number | null,
): Promise<
  Array<{ unit_name: string; faction_id: string | null; points: number }>
> {
  const db = await getDb();
  return db.select(
    `SELECT unit_name, faction_id, points
     FROM synced_unit_points
     WHERE unit_name = $1
       OR unit_name LIKE $2 ESCAPE '\\'`,
    [unitName, `%${escapeLike(unitName)}%`],
  );
}

/**
 * Search rules.db datasheets for the RulesMappingSheet search UI.
 * Queries rw_datasheets in rules.db (separate connection).
 *
 * T-76-01: Uses parameterized query ($1) with LIMIT 20 for safety.
 */
export async function findRulesDatasheets(
  searchTerm: string,
): Promise<Array<{ id: string; name: string; faction_id: string | null }>> {
  const db = await getRulesDb();
  return db.select(
    `SELECT id, name, faction_id FROM rw_datasheets
     WHERE name LIKE $1 ESCAPE '\\' ORDER BY name LIMIT 20`,
    [`%${escapeLike(searchTerm)}%`],
  );
}
