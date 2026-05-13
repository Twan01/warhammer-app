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

// Stub — TDD RED
export async function insertPointsImportHistory(
  _input: InsertPointsImportHistoryInput,
): Promise<void> {
  const _db = await getDb();
  // Not implemented yet
}

// Stub — TDD RED
export async function getLatestPointsImportHistory(): Promise<PointsImportHistoryRow | null> {
  const _db = await getDb();
  return null;
}
