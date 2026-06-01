/**
 * Name normalization and alias loading for the unit database build pipeline.
 *
 * Per D-01/D-03: normalization handles lowercase, smart quotes, special chars,
 * and whitespace. The alias table provides manual fallback mapping for units
 * that cannot be automatically matched.
 */

import { readFileSync, existsSync } from "node:fs";

/**
 * Normalize a unit name for fuzzy matching:
 * - Lowercase
 * - Replace smart quotes / backticks with straight apostrophe
 * - Strip non-alphanumeric characters (keeping apostrophes and spaces)
 * - Collapse multiple whitespace to single space
 * - Trim leading/trailing whitespace
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’‚‛``´]/g, "'") // smart quotes + backticks
    .replace(/[^a-z0-9' ]/g, "") // strip special chars, keep apostrophes and spaces
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Load the alias table from a JSON file.
 * Returns a Record mapping Wahapedia unit names to BSData unit names.
 * Returns an empty object if the file is missing or malformed.
 */
export function loadAliases(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}
