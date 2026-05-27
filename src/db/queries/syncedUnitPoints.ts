/**
 * Phase 65 — Synced unit points cache (PI-05 cross-DB solution).
 *
 * Manages the synced_unit_points denormalized cache table in hobbyforge.db.
 * This cache is populated after each Wahapedia sync with points data from
 * rw_datasheet_points in rules.db, enabling the 5-level COALESCE LEFT JOIN
 * without cross-database queries (Research Pitfall 1 Option B).
 *
 * CRITICAL: Uses getDb() (hobbyforge.db), NOT getRulesDb().
 *
 * NOTE: Uses auto-commit per statement (no explicit transaction) because
 * tauri-plugin-sql uses sqlx::Pool<Sqlite> — each db.execute() may run on
 * a different connection from the pool.
 */
import { getDb } from "@/db/client";

export interface SyncedUnitPointsRow {
  unit_name: string;
  faction_id: string | null;
  points: number;
}

/**
 * Replace all synced unit points with fresh data from the latest sync.
 * DELETEs all existing rows, then INSERTs the new set using multi-row
 * batched VALUES statements (DBH-04) — ceil(N/200) INSERT calls instead of N.
 */
export async function replaceSyncedUnitPoints(
  rows: SyncedUnitPointsRow[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM synced_unit_points", []);
  if (rows.length === 0) {
    return;
  }
  const BATCH_SIZE = 200;
  const COL_COUNT = 4;
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const placeholders = batch.map((_, i) => {
      const base = i * COL_COUNT;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    }).join(", ");
    const params = batch.flatMap(row => [row.unit_name, row.faction_id, row.points, syncedAt]);
    await db.execute(
      `INSERT INTO synced_unit_points (unit_name, faction_id, points, synced_at) VALUES ${placeholders}`,
      params,
    );
  }
}

export interface SyncedUnitPointTier {
  unit_name: string;
  faction_id: string | null;
  model_count: number;
  points: number;
}

export async function replaceSyncedUnitPointTiers(
  rows: SyncedUnitPointTier[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM synced_unit_point_tiers", []);
  if (rows.length === 0) {
    return;
  }
  const BATCH_SIZE = 200;
  const COL_COUNT = 5;
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const placeholders = batch.map((_, i) => {
      const base = i * COL_COUNT;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(", ");
    const params = batch.flatMap(row => [row.unit_name, row.faction_id, row.model_count, row.points, syncedAt]);
    await db.execute(
      `INSERT INTO synced_unit_point_tiers (unit_name, faction_id, model_count, points, synced_at) VALUES ${placeholders}`,
      params,
    );
  }
}

export async function getPointTiersByFaction(
  factionId: string,
): Promise<SyncedUnitPointTier[]> {
  const db = await getDb();
  return db.select<SyncedUnitPointTier[]>(
    `SELECT unit_name, faction_id, model_count, points
     FROM synced_unit_point_tiers
     WHERE faction_id = $1
     ORDER BY unit_name, model_count`,
    [factionId],
  );
}

/**
 * Phase 90 — Get point tiers for a specific unit by name and faction.
 * Used by LoadoutBuilderSheet tier selector (DL-01).
 * Supports ghost units via name-based lookup (D-10).
 * faction_id is TEXT in synced tables — never pass a number (Pitfall 1).
 */
export async function getTiersByUnitName(
  unitName: string,
  factionId: string | null,
): Promise<Array<{ model_count: number; points: number }>> {
  const db = await getDb();
  return db.select(
    `SELECT model_count, points
     FROM synced_unit_point_tiers
     WHERE unit_name = $1
       AND (faction_id IS NULL OR faction_id = $2)
     ORDER BY model_count ASC`,
    [unitName, factionId],
  );
}

export async function getSyncedUnitPointsList(): Promise<{ unit_name: string; faction_id: string | null; points: number }[]> {
  const db = await getDb();
  return db.select(
    "SELECT unit_name, faction_id, points FROM synced_unit_points ORDER BY unit_name",
  );
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
