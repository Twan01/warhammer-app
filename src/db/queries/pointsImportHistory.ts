/**
 * Phase 65 — Points import history persistence (PI-04).
 *
 * Reads and writes the points_import_history table in hobbyforge.db.
 * CRITICAL: Uses getDb() (hobbyforge.db), NOT getRulesDb() (rules.db).
 * Import history must survive rules.db re-syncs.
 */
import { getDb } from "@/db/client";

export interface PointsImportHistoryRow {
  id: number;
  imported_at: string;
  source_file: string | null;
  version: string | null;
  row_count: number;
  delta_added: number;
  delta_removed: number;
  delta_changed: number;
}

export interface InsertPointsImportHistoryInput {
  source_file: string | null;
  version: string | null;
  row_count: number;
  delta_added: number;
  delta_removed: number;
  delta_changed: number;
}

export async function insertPointsImportHistory(
  input: InsertPointsImportHistoryInput,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO points_import_history
       (source_file, version, row_count, delta_added, delta_removed, delta_changed)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.source_file, input.version, input.row_count,
     input.delta_added, input.delta_removed, input.delta_changed],
  );
}

export async function getLatestPointsImportHistory(): Promise<PointsImportHistoryRow | null> {
  const db = await getDb();
  const rows = await db.select<PointsImportHistoryRow[]>(
    "SELECT * FROM points_import_history ORDER BY imported_at DESC LIMIT 1",
  );
  return rows[0] ?? null;
}
