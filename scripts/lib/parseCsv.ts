/**
 * Wahapedia CSV parser -- pipe-delimited, UTF-8, trailing pipe on every row.
 *
 * Extracted from build-unit-db.ts for shared use by both build scripts.
 * Also provides readCsvFile (file I/O wrapper) and extractModelCount (cost CSV helper).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Parse a pipe-delimited Wahapedia CSV string into an array of record objects.
 * Each record maps header names to trimmed string values.
 */
export function parseWahapediaCsv(raw: string): Record<string, string>[] {
  const cleaned = raw.replace(/^﻿/, "");
  const lines = cleaned.trim().split("\n");
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
 * Read a Wahapedia pipe-delimited CSV file from dataDir and parse it.
 *
 * @param dataDir - Directory containing Wahapedia CSV files
 * @param filename - CSV filename (e.g. "Factions.csv")
 */
export function readCsvFile(dataDir: string, filename: string): Record<string, string>[] {
  const filepath = join(dataDir, filename);
  const raw = readFileSync(filepath, "utf-8");
  return parseWahapediaCsv(raw);
}

/**
 * Extract total model count from a cost CSV description.
 * Sums all numbers found in the description string.
 * Falls back to `line` field (tier index) if no numbers found.
 *
 * Handles patterns like:
 * - "10 models" -> 10
 * - "1 Spanner and 4 Burna Boyz" -> 5
 * - "1 Sword Brother, 5 Initiates and 4 Neophytes" -> 10
 */
export function extractModelCount(description: string, line: number): number {
  const numbers = description.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    return numbers.reduce((sum, n) => sum + parseInt(n, 10), 0);
  }
  return line;
}
