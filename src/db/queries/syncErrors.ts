/**
 * Phase 44 — Sync error persistence (SYNC-04).
 *
 * Reads and writes the sync_errors table in hobbyforge.db.
 * CRITICAL: Uses getDb() (hobbyforge.db), NOT getRulesDb() (rules.db).
 * rules.db is fully DELETEd on every sync — errors stored there would be lost.
 *
 * Phase 45 (META-04) will surface error history in the UI. This module
 * provides the write path (called from useRulesSync onError) and the read
 * path (for future display).
 */
import { getDb } from "@/db/client";

export interface SyncError {
  id: number;
  occurred_at: string;
  error_type: string;
  message: string;
  csv_file: string | null;
}

export interface InsertSyncErrorInput {
  occurred_at: string;
  error_type: "fetch_failed" | "parse_error" | "validation_error" | "sync_error";
  message: string;
  csv_file?: string | null;
}

export async function insertSyncError(input: InsertSyncErrorInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO sync_errors (occurred_at, error_type, message, csv_file) VALUES ($1, $2, $3, $4)",
    [input.occurred_at, input.error_type, input.message, input.csv_file ?? null],
  );
}

export async function getSyncErrors(): Promise<SyncError[]> {
  const db = await getDb();
  return db.select<SyncError[]>(
    "SELECT * FROM sync_errors ORDER BY occurred_at DESC",
  );
}
