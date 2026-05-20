import { getDb } from "@/db/client";
import type {
  BsdataEnhancement,
  BsdataLoadoutOption,
  BsdataModelCount,
  BsdataLeaderTarget,
} from "@/lib/parseBsdataExtended";

export async function replaceSyncedEnhancements(
  rows: BsdataEnhancement[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    await db.execute("DELETE FROM synced_enhancements", []);
    for (const row of rows) {
      await db.execute(
        `INSERT INTO synced_enhancements (name, faction_id, detachment_name, points, synced_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.name, row.faction_id, row.detachment_name, row.points, syncedAt],
      );
    }
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}

export async function replaceSyncedLoadoutOptions(
  rows: BsdataLoadoutOption[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    await db.execute("DELETE FROM synced_loadout_options", []);
    for (const row of rows) {
      await db.execute(
        `INSERT INTO synced_loadout_options (unit_name, faction_id, group_name, option_name, is_default, is_exclusive, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          row.unit_name,
          row.faction_id,
          row.group_name,
          row.option_name,
          row.is_default ? 1 : 0,
          row.is_exclusive ? 1 : 0,
          syncedAt,
        ],
      );
    }
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}

export async function replaceSyncedModelCounts(
  rows: BsdataModelCount[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    await db.execute("DELETE FROM synced_model_counts", []);
    for (const row of rows) {
      await db.execute(
        `INSERT INTO synced_model_counts (unit_name, faction_id, min_models, max_models, synced_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.unit_name, row.faction_id, row.min_models, row.max_models, syncedAt],
      );
    }
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}

export async function replaceSyncedLeaderTargets(
  rows: BsdataLeaderTarget[],
  syncedAt: string,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    await db.execute("DELETE FROM synced_leader_targets", []);
    for (const row of rows) {
      await db.execute(
        `INSERT INTO synced_leader_targets (leader_name, faction_id, target_name, synced_at)
         VALUES ($1, $2, $3, $4)`,
        [row.leader_name, row.faction_id, row.target_name, syncedAt],
      );
    }
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
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
