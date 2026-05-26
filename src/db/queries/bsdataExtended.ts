import { getDb } from "@/db/client";
import type {
  BsdataEnhancement,
  BsdataLoadoutOption,
  BsdataModelCount,
  BsdataLeaderTarget,
} from "@/lib/parseBsdataExtended";

/**
 * NOTE: All replace* functions use auto-commit per statement (no explicit
 * transaction) because tauri-plugin-sql uses sqlx::Pool<Sqlite> — each
 * db.execute() may run on a different connection from the pool.
 */

export async function replaceSyncedEnhancements(
  rows: BsdataEnhancement[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM synced_enhancements", []);
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
    const params = batch.flatMap(row => [row.name, row.faction_id, row.detachment_name, row.points, syncedAt]);
    await db.execute(
      `INSERT INTO synced_enhancements (name, faction_id, detachment_name, points, synced_at) VALUES ${placeholders}`,
      params,
    );
  }
}

export async function replaceSyncedLoadoutOptions(
  rows: BsdataLoadoutOption[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM synced_loadout_options", []);
  if (rows.length === 0) {
    return;
  }
  const BATCH_SIZE = 200;
  const COL_COUNT = 7;
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const placeholders = batch.map((_, i) => {
      const base = i * COL_COUNT;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
    }).join(", ");
    const params = batch.flatMap(row => [
      row.unit_name,
      row.faction_id,
      row.group_name,
      row.option_name,
      row.is_default ? 1 : 0,
      row.is_exclusive ? 1 : 0,
      syncedAt,
    ]);
    await db.execute(
      `INSERT INTO synced_loadout_options (unit_name, faction_id, group_name, option_name, is_default, is_exclusive, synced_at) VALUES ${placeholders}`,
      params,
    );
  }
}

export async function replaceSyncedModelCounts(
  rows: BsdataModelCount[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM synced_model_counts", []);
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
    const params = batch.flatMap(row => [row.unit_name, row.faction_id, row.min_models, row.max_models, syncedAt]);
    await db.execute(
      `INSERT INTO synced_model_counts (unit_name, faction_id, min_models, max_models, synced_at) VALUES ${placeholders}`,
      params,
    );
  }
}

export async function replaceSyncedLeaderTargets(
  rows: BsdataLeaderTarget[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM synced_leader_targets", []);
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
    const params = batch.flatMap(row => [row.leader_name, row.faction_id, row.target_name, syncedAt]);
    await db.execute(
      `INSERT INTO synced_leader_targets (leader_name, faction_id, target_name, synced_at) VALUES ${placeholders}`,
      params,
    );
  }
}

export interface SyncedEnhancementRow {
  name: string;
  faction_id: string | null;
  detachment_name: string;
  points: number;
}

export async function getEnhancementsByFaction(
  factionId: string,
): Promise<SyncedEnhancementRow[]> {
  const db = await getDb();
  return db.select<SyncedEnhancementRow[]>(
    `SELECT name, faction_id, detachment_name, points
     FROM synced_enhancements
     WHERE faction_id = $1
     ORDER BY detachment_name, name`,
    [factionId],
  );
}

export interface SyncedLoadoutOptionRow {
  unit_name: string;
  faction_id: string | null;
  group_name: string;
  option_name: string;
  is_default: number;
  is_exclusive: number;
}

export async function getLoadoutOptionsByFaction(
  factionId: string,
): Promise<SyncedLoadoutOptionRow[]> {
  const db = await getDb();
  return db.select<SyncedLoadoutOptionRow[]>(
    `SELECT unit_name, faction_id, group_name, option_name, is_default, is_exclusive
     FROM synced_loadout_options
     WHERE faction_id = $1
     ORDER BY unit_name, group_name, option_name`,
    [factionId],
  );
}

export interface SyncedModelCountRow {
  unit_name: string;
  faction_id: string | null;
  min_models: number;
  max_models: number;
}

export async function getModelCountsByFaction(
  factionId: string,
): Promise<SyncedModelCountRow[]> {
  const db = await getDb();
  return db.select<SyncedModelCountRow[]>(
    `SELECT unit_name, faction_id, min_models, max_models
     FROM synced_model_counts
     WHERE faction_id = $1
     ORDER BY unit_name`,
    [factionId],
  );
}

export interface SyncedLeaderTargetRow {
  leader_name: string;
  faction_id: string | null;
  target_name: string;
}

export async function getLeaderTargetsByFaction(
  factionId: string,
): Promise<SyncedLeaderTargetRow[]> {
  const db = await getDb();
  return db.select<SyncedLeaderTargetRow[]>(
    `SELECT leader_name, faction_id, target_name
     FROM synced_leader_targets
     WHERE faction_id = $1
     ORDER BY leader_name, target_name`,
    [factionId],
  );
}

/**
 * Phase 90 — Get loadout options for a specific unit by name and faction.
 * Used by LoadoutBuilderSheet to display wargear options (DL-02).
 * faction_id is TEXT in synced tables — never pass a number (Pitfall 1).
 */
export async function getLoadoutOptionsForUnit(
  unitName: string,
  factionId: string | null,
): Promise<SyncedLoadoutOptionRow[]> {
  const db = await getDb();
  return db.select<SyncedLoadoutOptionRow[]>(
    `SELECT group_name, option_name, is_default, is_exclusive
     FROM synced_loadout_options
     WHERE unit_name = $1
       AND (faction_id IS NULL OR faction_id = $2)
     ORDER BY group_name, option_name`,
    [unitName, factionId],
  );
}
