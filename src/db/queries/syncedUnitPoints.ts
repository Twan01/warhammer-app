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

// Stub — TDD RED
export async function replaceSyncedUnitPoints(
  _rows: SyncedUnitPointsRow[],
  _syncedAt: string,
): Promise<void> {
  const _db = await getDb();
  // Not implemented yet
}

// Stub — TDD RED
export async function getSyncedUnitPointsMap(): Promise<Map<string, number>> {
  const _db = await getDb();
  return new Map();
}
