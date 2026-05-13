/**
 * Phase 45 — Pre-sync snapshot capture (META-06).
 *
 * Reads each rw_* table from rules.db, writes snapshot rows to hobbyforge.db.
 * CRITICAL: Uses getDb() for writes (hobbyforge.db) and getRulesDb() for reads
 * (rules.db). rules.db is fully DELETEd on every sync — snapshot data MUST
 * live in hobbyforge.db to survive.
 */
import { getDb } from "@/db/client";
import { getRulesDb } from "@/db/rules-client";

export interface RulesSnapshotRow {
  id: number;
  captured_at: string;
  wahapedia_version: string | null;
  table_name: string;
  row_count: number;
  snapshot_data: string | null;
}

/**
 * Tables to snapshot with their extraction queries.
 * Tables with single-column PK get real id+name pairs stored as JSON.
 * Composite-PK tables store full row data as JSON (models, abilities, keywords)
 * or null snapshot_data for row_count only (wargear — out of OVRD-06 scope).
 */
const SNAPSHOT_TABLES: Array<{ table: string; query: string | null }> = [
  { table: "rw_factions",             query: "SELECT id, name FROM rw_factions ORDER BY id" },
  { table: "rw_sources",              query: "SELECT id, name FROM rw_sources ORDER BY id" },
  { table: "rw_datasheets",           query: "SELECT id, name FROM rw_datasheets ORDER BY id" },
  { table: "rw_datasheet_models",
    query: "SELECT datasheet_id, line, name, M, T, Sv, inv_sv, W, Ld, OC FROM rw_datasheet_models ORDER BY datasheet_id, line" },
  { table: "rw_datasheet_abilities",
    query: "SELECT datasheet_id, line, ability_id, name, description, type FROM rw_datasheet_abilities ORDER BY datasheet_id, line" },
  { table: "rw_datasheet_keywords",
    query: "SELECT datasheet_id, keyword, is_faction_keyword FROM rw_datasheet_keywords ORDER BY datasheet_id, keyword" },
  { table: "rw_datasheets_wargear",   query: null },
  { table: "rw_abilities",            query: "SELECT id, name FROM rw_abilities ORDER BY id" },
  { table: "rw_stratagems",           query: "SELECT id, name FROM rw_stratagems ORDER BY id" },
  { table: "rw_detachments",          query: "SELECT id, name FROM rw_detachments ORDER BY id" },
  { table: "rw_detachment_abilities", query: "SELECT id, name FROM rw_detachment_abilities ORDER BY id" },
  { table: "rw_datasheet_points",
    query: "SELECT datasheet_name, faction_id, points FROM rw_datasheet_points ORDER BY datasheet_name" },
];

/**
 * Capture a snapshot of all 11 rw_* tables BEFORE sync.
 * For tables with a simple PK, stores [{id, name}, ...] as JSON in snapshot_data.
 * For composite-PK tables, stores null snapshot_data and row_count from COUNT(*).
 *
 * @param wahapediaVersion - the current (pre-sync) version from syncMeta, or null
 */
export async function capturePreSyncSnapshot(wahapediaVersion?: string | null): Promise<void> {
  const rulesDb = await getRulesDb();
  const hobbyDb = await getDb();
  const capturedAt = new Date().toISOString();

  for (const { table, query } of SNAPSHOT_TABLES) {
    let rowCount: number;
    let snapshotData: string | null;

    if (query) {
      const rows = await rulesDb.select<Record<string, unknown>[]>(query, []);
      rowCount = rows.length;
      snapshotData = JSON.stringify(rows);
    } else {
      if (!SNAPSHOT_TABLES.some((s) => s.table === table)) {
        throw new Error(`Unknown snapshot table: ${table}`);
      }
      const countRows = await rulesDb.select<{ cnt: number }[]>(
        `SELECT COUNT(*) as cnt FROM ${table}`,
        [],
      );
      rowCount = countRows[0]?.cnt ?? 0;
      snapshotData = null;
    }

    await hobbyDb.execute(
      "INSERT INTO rules_snapshot (captured_at, wahapedia_version, table_name, row_count, snapshot_data) VALUES ($1, $2, $3, $4, $5)",
      [capturedAt, wahapediaVersion ?? null, table, rowCount, snapshotData],
    );
  }

  await cleanOldSnapshots(3);
}

/**
 * Delete snapshot groups older than the `keepCount` most recent.
 * Each group shares a `captured_at` timestamp (11 rows per group).
 */
export async function cleanOldSnapshots(keepCount: number): Promise<void> {
  const db = await getDb();
  const cutoffs = await db.select<{ captured_at: string }[]>(
    "SELECT DISTINCT captured_at FROM rules_snapshot ORDER BY captured_at DESC LIMIT $1",
    [keepCount],
  );
  if (cutoffs.length < keepCount) return;
  const oldestKept = cutoffs[cutoffs.length - 1].captured_at;
  await db.execute(
    "DELETE FROM rules_snapshot WHERE captured_at < $1",
    [oldestKept],
  );
}

/** Returns the most recent snapshot group (11 rows, one per table). */
export async function getLatestSnapshot(): Promise<RulesSnapshotRow[]> {
  const db = await getDb();
  return db.select<RulesSnapshotRow[]>(
    `SELECT * FROM rules_snapshot
     WHERE captured_at = (SELECT MAX(captured_at) FROM rules_snapshot)
     ORDER BY table_name`,
    [],
  );
}
