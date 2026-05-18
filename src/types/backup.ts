/**
 * Phase 81 (RST-03) -- BackupManifest TypeScript interface.
 *
 * Mirrors the Rust `BackupManifest` struct in src-tauri/src/lib.rs (line 621).
 * Used by the restore preview dialog to display backup metadata and by schema
 * compatibility checks (RST-04 / RST-05) to compare versions.
 */
export interface BackupManifest {
  app_version: string;
  schema_version: number;
  created_at: string;
  platform: string;
  db_size_bytes: number;
}
