/**
 * Wahapedia CSV parser -- pipe-delimited, UTF-8, trailing pipe on every row.
 *
 * Extracted from build-unit-db.ts for shared use by both build scripts.
 */

import { readFileSync } from "node:fs";

/**
 * Parse a pipe-delimited Wahapedia CSV string into an array of record objects.
 * Each record maps header names to trimmed string values.
 */
export function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split("|").map((h) => h.trim()).filter(Boolean);
  return lines.slice(1).map((line) => {
    const values = line.split("|");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()])
    );
  });
}

/**
 * Convenience wrapper: read a CSV file from disk and parse it.
 */
export function readCsv(filepath: string): Record<string, string>[] {
  const raw = readFileSync(filepath, "utf-8");
  return parseWahapediaCsv(raw);
}
