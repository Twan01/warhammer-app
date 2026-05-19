export interface BackupManifest {
  app_version: string;
  schema_version: number;
  created_at: string;
  platform: string;
  db_size_bytes: number;
  rules_schema_version: number;
  includes_rules_db: boolean;
  notes?: string;
}
