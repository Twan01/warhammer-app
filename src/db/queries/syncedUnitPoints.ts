/**
 * Phase 65 — Synced unit points cache (PI-05 cross-DB solution).
 *
 * Manages the synced_unit_points denormalized cache table in hobbyforge.db.
 * This cache is populated after each Wahapedia sync with points data from
 * rw_datasheet_points in rules.db, enabling the 5-level COALESCE LEFT JOIN
 * without cross-database queries (Research Pitfall 1 Option B).
 *
 * CRITICAL: Uses getDb() (hobbyforge.db), NOT getRulesDb().
 */
import { getDb } from "@/db/client";

export interface SyncedUnitPointsRow {
  unit_name: string;
  faction_id: string | null;
  points: number;
}

/**
 * Replace all synced unit points with fresh data from the latest sync.
 * DELETEs all existing rows, then INSERTs the new set.
 * Small table (hundreds of rows), so a loop is fine.
 */
export async function replaceSyncedUnitPoints(
  rows: SyncedUnitPointsRow[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    await db.execute("DELETE FROM synced_unit_points", []);
    for (const row of rows) {
      await db.execute(
        `INSERT INTO synced_unit_points (unit_name, faction_id, points, synced_at)
         VALUES ($1, $2, $3, $4)`,
        [row.unit_name, row.faction_id, row.points, syncedAt],
      );
    }
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}

/**
 * Read all synced unit points into a Map keyed by "unit_name:faction_id".
 * Used by computePointsDelta to build before/after snapshots.
 */
export async function getSyncedUnitPointsMap(): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db.select<{ unit_name: string; faction_id: string | null; points: number }[]>(
    "SELECT unit_name, faction_id, points FROM synced_unit_points",
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(`${row.unit_name}:${row.faction_id}`, row.points);
  }
  return map;
}
