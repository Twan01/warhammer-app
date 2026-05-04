/**
 * UnitPhoto entity (JOUR-04..06).
 * Mirrors the image_assets table (entity_type='unit') with the stage_label
 * column added in migration 005_hobby_journal.sql.
 *
 * file_path stores ONLY the UUID filename (e.g. "a3f8c1d2-....jpg") relative
 * to appDataDir() — never the absolute path. The UI calls
 * convertFileSrc(await join(await appDataDir(), file_path)) at render time.
 *
 * stage_label is one of the fixed presets ("Primed" | "Base coat" | "Washed"
 * | "Layer" | "Highlighted" | "Finished") OR a free-text custom label when
 * the user selected "Other" in the form. Stored as TEXT, no enum constraint.
 */
export interface UnitPhoto {
  id: number;
  entity_type: "unit";           // narrowed: this type only models unit photos
  entity_id: number;             // = the unit's id
  file_path: string;             // UUID filename relative to appDataDir, NOT absolute
  caption: string | null;
  taken_at: string | null;       // ISO date or null
  stage_label: string | null;    // added in migration 005 — nullable for legacy rows
  created_at: string;            // ISO datetime via SQLite datetime('now')
}

/**
 * Insert payload for createUnitPhoto() — omits id and created_at (DB-generated).
 * entity_type is implicit ('unit') and set by the query module, not the caller.
 */
export interface CreateUnitPhotoInput {
  unit_id: number;               // maps to entity_id in the row; entity_type='unit' set in query module
  file_path: string;
  caption?: string | null;
  taken_at?: string | null;
  stage_label?: string | null;
}
