/**
 * Phase 77 -- React Query hooks for the Data Health page diagnostics.
 *
 * Three independent useQuery hooks load in parallel so the page can
 * render sections progressively as data arrives:
 *   - useTableCounts() -- row counts for 5 key tables
 *   - useDiagnosticFlags() -- orphaned progress, ambiguous points
 *   - useSchemaVersions() -- PRAGMA user_version for both DBs
 *
 * useBackupStatus() reads from localStorage (not a useQuery hook)
 * since backup metadata is not stored in the database.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getDiagnosticFlags,
  getSchemaVersions,
  getTableCounts,
} from "@/db/queries/diagnostics";

// ── Query key constants ─────────────────────────────────────────────────────

export const TABLE_COUNTS_KEY = ["diagnostics", "table-counts"] as const;
export const DIAGNOSTIC_FLAGS_KEY = ["diagnostics", "flags"] as const;
export const SCHEMA_VERSIONS_KEY = ["diagnostics", "schema-versions"] as const;

// ── localStorage key for backup status ──────────────────────────────────────

export const BACKUP_STORAGE_KEY = "lastBackup";

// ── Hooks ───────────────────────────────────────────────────────────────────

export function useTableCounts() {
  return useQuery({
    queryKey: TABLE_COUNTS_KEY,
    queryFn: getTableCounts,
  });
}

export function useDiagnosticFlags() {
  return useQuery({
    queryKey: DIAGNOSTIC_FLAGS_KEY,
    queryFn: getDiagnosticFlags,
  });
}

export function useSchemaVersions() {
  return useQuery({
    queryKey: SCHEMA_VERSIONS_KEY,
    queryFn: getSchemaVersions,
  });
}

// ── Backup status (localStorage, not React Query) ───────────────────────────

export interface BackupStatus {
  date: string;
  path: string;
  success: boolean;
}

/**
 * D-06: Reads the last backup metadata from localStorage.
 * Returns null when no backup has been performed yet.
 */
export function useBackupStatus(): BackupStatus | null {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackupStatus;
  } catch {
    return null;
  }
}
