/**
 * Shared BSData parsing and matching functions for the unit database build pipeline.
 *
 * Used by both build-unit-db.ts and update-unit-database.ts.
 *
 * IMPORTANT: parseBsdataModelCounts requires a DOMParser global to be set
 * before calling. Entry-point scripts must polyfill it before importing:
 *
 *   import { DOMParser } from "@xmldom/xmldom";
 *   // @ts-ignore
 *   globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
 *
 * This matches the polyfill pattern used in parseXml.ts.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { parseWahapediaCsv } from "./parseCsv.ts";
import { parseCatXml, extractModelCounts } from "./parseXml.ts";
import { normalizeName } from "./normalize.ts";
import { FACTION_MAP } from "./factionMap.ts";
import type { BsdataModelCount, UdbUnitRow } from "./types.ts";

// ---------------------------------------------------------------------------
// Match method types
// ---------------------------------------------------------------------------

/** The pass that succeeded during 3-pass unit matching. */
export type MatchMethod = "exact" | "normalized" | "alias";

/** Result of matchUnit: the matched unit row plus which pass matched it. */
export interface MatchResult {
  unit: UdbUnitRow;
  method: MatchMethod;
}

// ---------------------------------------------------------------------------
// readCsvFile
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// readBsdataCatFiles
// ---------------------------------------------------------------------------

/**
 * Read all *.cat BSData files from bsdataDir, sorted for deterministic output.
 * Returns an array of { xml, factionId, catalogueName } entries.
 * Emits warnings (not errors) for missing directory or empty directory.
 * Library catalogues (e.g. Astra Militarum - Library) are included since
 * they contain points data referenced by faction-specific catalogues.
 *
 * @param bsdataDir - Directory containing *.cat files
 */
export function readBsdataCatFiles(
  bsdataDir: string
): Array<{ xml: string; factionId: string | null; catalogueName: string }> {
  if (!existsSync(bsdataDir)) {
    console.warn("WARNING: BSData directory not found: " + bsdataDir);
    console.warn("  Points tiers and composition data will be empty.");
    console.warn("  To include: clone https://github.com/BSData/wh40k-10e");
    console.warn("  and copy *.cat files to scripts/data/bsdata/");
    return [];
  }

  // Sort file list for deterministic output (D-06)
  // Include Library catalogues -- they contain unit points data for many factions
  const files = readdirSync(bsdataDir)
    .filter((f) => f.endsWith(".cat"))
    .sort();

  if (files.length === 0) {
    console.warn("WARNING: No .cat files found in " + bsdataDir);
    return [];
  }

  console.log("Reading " + files.length + " BSData .cat files...");
  const entries: Array<{ xml: string; factionId: string | null; catalogueName: string }> = [];

  for (const filename of files) {
    try {
      const xml = readFileSync(join(bsdataDir, filename), "utf-8");
      const catalogueName = filename.replace(/\.cat$/, "");
      const factionId = FACTION_MAP[catalogueName] ?? null;
      entries.push({ xml, factionId, catalogueName });
    } catch (e) {
      console.warn("WARNING: Failed to read " + filename + ":", e);
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// parseBsdataModelCounts
// ---------------------------------------------------------------------------

/**
 * Extract model count ranges (min/max) from an array of parsed cat file entries.
 *
 * REQUIRES: globalThis.DOMParser must be set to @xmldom/xmldom's DOMParser
 * before calling. See module header for the polyfill pattern.
 *
 * @param catFiles - Array of { xml, factionId, catalogueName } from readBsdataCatFiles
 */
export function parseBsdataModelCounts(
  catFiles: Array<{ xml: string; factionId: string | null; catalogueName: string }>
): BsdataModelCount[] {
  const results: BsdataModelCount[] = [];
  for (const entry of catFiles) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(entry.xml, "text/xml") as unknown as Document;
    results.push(...extractModelCounts(doc, entry.factionId));
  }
  return results;
}

// ---------------------------------------------------------------------------
// matchUnit — 3-pass matching (exact -> normalized -> alias)
// ---------------------------------------------------------------------------

/**
 * Attempt to match a BSData unit name to a Wahapedia unit in three passes:
 *  1. Exact lowercase match: `bsdataName.toLowerCase() + ":" + factionId`
 *  2. Normalized match: compare normalizeName() of both sides for the same faction
 *  3. Alias table fallback: aliases[bsdataName] -> Wahapedia name -> exact match
 *
 * Returns a MatchResult with the matched UdbUnitRow and the method used,
 * or undefined if no match was found.
 *
 * @param bsdataName - Unit name from BSData .cat file
 * @param factionId  - Wahapedia faction_id to match within
 * @param aliases    - Alias table from loadAliases() (BSData name -> Wahapedia name)
 * @param unitMap    - Map keyed by `name.toLowerCase() + ":" + faction_id`
 */
export function matchUnit(
  bsdataName: string,
  factionId: string,
  aliases: Record<string, string>,
  unitMap: Map<string, UdbUnitRow>
): MatchResult | undefined {
  // Pass 1: exact lowercase match
  const exactKey = bsdataName.toLowerCase() + ":" + factionId;
  const exactUnit = unitMap.get(exactKey);
  if (exactUnit) return { unit: exactUnit, method: "exact" };

  // Pass 2: normalized match — compare normalized names for matching faction_id
  const normalizedBsdata = normalizeName(bsdataName);
  for (const [key, u] of unitMap) {
    if (key.endsWith(":" + factionId) && normalizeName(u.name) === normalizedBsdata) {
      return { unit: u, method: "normalized" };
    }
  }

  // Pass 3: alias table fallback
  const aliasedName = aliases[bsdataName];
  if (aliasedName) {
    const aliasKey = aliasedName.toLowerCase() + ":" + factionId;
    const aliasUnit = unitMap.get(aliasKey);
    if (aliasUnit) return { unit: aliasUnit, method: "alias" };
  }

  return undefined;
}
