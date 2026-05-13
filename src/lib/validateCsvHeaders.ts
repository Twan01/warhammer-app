/**
 * Phase 44 — CSV column header validation for Wahapedia sync (SYNC-03).
 *
 * Checks that parsed CSV rows contain all required column headers for each
 * known CSV file type. Throws with filename and missing column names if
 * validation fails. Unknown filenames pass through without validation.
 *
 * Called after parseWahapediaCsv() returns rows, before data is sent to Rust.
 */

const REQUIRED_HEADERS: Record<string, string[]> = {
  "Factions.csv":              ["id", "name"],
  "Source.csv":                ["id", "name"],
  "Datasheets.csv":            ["id", "name", "faction_id"],
  "Datasheets_models.csv":     ["datasheet_id", "line"],
  "Datasheets_abilities.csv":  ["datasheet_id", "line", "name"],
  "Datasheets_keywords.csv":   ["datasheet_id", "keyword"],
  "Datasheets_wargear.csv":    ["datasheet_id", "line", "name"],
  "Abilities.csv":             ["id", "name"],
  "Stratagems.csv":            ["id", "name"],
  "Detachments.csv":           ["id", "name"],
  "Detachment_abilities.csv":  ["id", "name"],
  "Datasheets_points.csv":     ["datasheet_name", "points"],
};

export function validateCsvHeaders(
  filename: string,
  rows: Record<string, string>[],
): void {
  const required = REQUIRED_HEADERS[filename];
  if (!required) return;
  if (rows.length === 0) {
    throw new Error(`${filename}: CSV is empty or header-only`);
  }
  const present = new Set(Object.keys(rows[0]));
  const missing = required.filter((h) => !present.has(h));
  if (missing.length > 0) {
    throw new Error(
      `${filename}: missing required columns: ${missing.join(", ")}`,
    );
  }
}
