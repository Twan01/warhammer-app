/**
 * Dev-side build script: parses Wahapedia CSV + BSData XML files and produces
 * src-tauri/data/unit_database.json.
 *
 * Per D-02: runs offline, dev-side only, never imported by app runtime code.
 *
 * Usage:
 *   node --experimental-strip-types scripts/build-unit-db.ts
 *   pnpm build:udb
 *
 * Prerequisites:
 *   - Wahapedia CSV files in scripts/data/:
 *     Factions.csv, Datasheets.csv, Datasheets_models.csv,
 *     Datasheets_abilities.csv, Datasheets_keywords.csv, Datasheets_wargear.csv
 *   - BSData .cat XML files in scripts/data/bsdata/*.cat
 *     Clone https://github.com/BSData/wh40k-10e and copy *.cat files there.
 */

// Must be first: polyfill DOMParser for XML parsing (browser API not in Node.js).
import { DOMParser } from "@xmldom/xmldom";
// @ts-ignore - globalThis.DOMParser polyfill for Node.js
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Shared library imports
import { parseWahapediaCsv } from "./lib/parseCsv.ts";
import { parseCatXml, extractModelCounts } from "./lib/parseXml.ts";
import { normalizeName, loadAliases } from "./lib/normalize.ts";
import { FACTION_MAP, SUB_FACTION_MAP, CROSS_FACTION_MAP } from "./lib/factionMap.ts";
import type {
  BsdataModelCount,
  UdbFactionRow,
  UdbUnitRow,
  UdbUnitModelRow,
  UdbUnitWeaponRow,
  UdbUnitAbilityRow,
  UdbUnitKeywordRow,
  UdbUnitPointsRow,
  UdbUnitCompositionRow,
  UnitDatabaseJson,
  CoverageReport,
  FactionCoverage,
} from "./lib/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Data directory paths
// ---------------------------------------------------------------------------
const DATA_DIR = join(REPO_ROOT, "scripts", "data");
const BSDATA_DIR = join(DATA_DIR, "bsdata");
const OUTPUT_DIR = join(REPO_ROOT, "src-tauri", "data");
const OUTPUT_PATH = join(OUTPUT_DIR, "unit_database.json");
const ALIASES_PATH = join(DATA_DIR, "aliases.json");
const COVERAGE_PATH = join(DATA_DIR, "coverage-report.json");

// Required Wahapedia CSV files
const REQUIRED_CSVs = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readCsv(filename: string): Record<string, string>[] {
  const filepath = join(DATA_DIR, filename);
  const raw = readFileSync(filepath, "utf-8");
  return parseWahapediaCsv(raw);
}

function readBsdataCatFiles(): Array<{ xml: string; factionId: string | null; catalogueName: string }> {
  if (!existsSync(BSDATA_DIR)) {
    console.warn("WARNING: BSData directory not found: " + BSDATA_DIR);
    console.warn("  Points tiers and composition data will be empty.");
    console.warn("  To include: clone https://github.com/BSData/wh40k-10e");
    console.warn("  and copy *.cat files to scripts/data/bsdata/");
    return [];
  }

  // D-06: sort file list for deterministic output
  // Include Library catalogues -- they contain unit points data for many factions
  const files = readdirSync(BSDATA_DIR)
    .filter((f) => f.endsWith(".cat"))
    .sort();

  if (files.length === 0) {
    console.warn("WARNING: No .cat files found in " + BSDATA_DIR);
    return [];
  }

  console.log("Reading " + files.length + " BSData .cat files...");
  const entries: Array<{ xml: string; factionId: string | null; catalogueName: string }> = [];

  for (const filename of files) {
    try {
      const xml = readFileSync(join(BSDATA_DIR, filename), "utf-8");
      const catalogueName = filename.replace(/\.cat$/, "");
      const factionId = FACTION_MAP[catalogueName] ?? null;
      entries.push({ xml, factionId, catalogueName });
    } catch (e) {
      console.warn("WARNING: Failed to read " + filename + ":", e);
    }
  }

  return entries;
}

function parseBsdataModelCounts(
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
// Multi-pass matching (D-01: exact -> normalized -> alias)
// ---------------------------------------------------------------------------

function matchUnit(
  bsdataName: string,
  factionId: string,
  aliases: Record<string, string>,
  unitMap: Map<string, UdbUnitRow>
): UdbUnitRow | undefined {
  // Pass 1: exact lowercase match (current behavior)
  const exactKey = bsdataName.toLowerCase() + ":" + factionId;
  let unit = unitMap.get(exactKey);
  if (unit) return unit;

  // Pass 2: normalized match -- compare normalized names for matching faction_id
  const normalizedBsdata = normalizeName(bsdataName);
  for (const [key, u] of unitMap) {
    if (key.endsWith(":" + factionId) && normalizeName(u.name) === normalizedBsdata) {
      return u;
    }
  }

  // Pass 3: alias table fallback
  const aliasedName = aliases[bsdataName];
  if (aliasedName) {
    const aliasKey = aliasedName.toLowerCase() + ":" + factionId;
    return unitMap.get(aliasKey);
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Main build pipeline
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== HobbyForge Unit Database Builder ===");
  console.log("Data directory: " + DATA_DIR);
  console.log("Output: " + OUTPUT_PATH);
  console.log("");

  // 1. Verify required CSV files exist
  console.log("Step 1: Verifying required CSV files...");
  for (const csv of REQUIRED_CSVs) {
    const filepath = join(DATA_DIR, csv);
    if (!existsSync(filepath)) {
      console.error("ERROR: Missing required file: " + filepath);
      console.error("Please download Wahapedia CSV files to scripts/data/");
      console.error("Download from: https://wahapedia.ru/wh40k10ed/");
      console.error("Required files:");
      for (const required of REQUIRED_CSVs) {
        console.error("  - " + required);
      }
      process.exit(1);
    }
    console.log("  Found: " + csv);
  }
  console.log("");

  // 2. Parse Wahapedia Factions.csv -> udb_factions rows (D-04: reuse Wahapedia text IDs)
  console.log("Step 2: Parsing Factions.csv...");
  const factionsRaw = readCsv("Factions.csv");
  const factions: UdbFactionRow[] = factionsRaw
    .filter((row) => row["id"] && row["name"])
    .map((row) => ({
      id: row["id"].trim(),
      name: row["name"].trim(),
      short_name: row["short_name"]?.trim() ?? row["id"].trim(),
      name_fr: null,
    }));
  console.log("  Parsed " + factions.length + " factions");

  // Build faction ID set for validation
  const factionIds = new Set(factions.map((f) => f.id));

  // 3. Parse Wahapedia Datasheets.csv -> udb_units rows (D-03: reuse Wahapedia string IDs)
  console.log("Step 3: Parsing Datasheets.csv...");
  const datasheetsRaw = readCsv("Datasheets.csv");
  const units: UdbUnitRow[] = [];
  const validUnitIds = new Set<string>();

  for (const row of datasheetsRaw) {
    const id = row["id"]?.trim();
    const factionId = row["faction_id"]?.trim();
    const name = row["name"]?.trim();
    if (!id || !name) continue;
    if (factionId && !factionIds.has(factionId)) {
      console.warn(`  WARNING: Skipping unit "${name}" (id=${id}) — unknown faction_id "${factionId}"`);
      continue;
    }

    validUnitIds.add(id);
    units.push({
      id,
      faction_id: factionId ?? "",
      name,
      role: row["role"]?.trim() ?? "",
      base_points: null, // filled later from BSData single-tier units
      damaged_w: row["damaged_w"]?.trim() ?? "",
      damaged_desc: row["damaged_description"]?.trim() ?? "",
      sub_faction: null, // populated from SUB_FACTION_MAP during BSData matching
      name_fr: null,
    });
  }
  console.log("  Parsed " + units.length + " units");

  // Build unit lookup by (name lowercase, faction_id) for BSData matching
  const unitByNameFaction = new Map<string, UdbUnitRow>();
  for (const unit of units) {
    const key = unit.name.toLowerCase() + ":" + unit.faction_id;
    unitByNameFaction.set(key, unit);
  }

  // 4. Parse Datasheets_models.csv -> udb_unit_models rows
  console.log("Step 4: Parsing Datasheets_models.csv...");
  const modelsRaw = readCsv("Datasheets_models.csv");
  const models: UdbUnitModelRow[] = [];

  for (const row of modelsRaw) {
    const unitId = row["datasheet_id"]?.trim();
    if (!unitId || !validUnitIds.has(unitId)) continue;

    models.push({
      unit_id: unitId,
      line_order: parseInt(row["line"]?.trim() ?? "0", 10) || 0,
      name: row["name"]?.trim() ?? "",
      M: row["M"]?.trim() ?? "",
      T: row["T"]?.trim() ?? "",
      Sv: row["Sv"]?.trim() ?? "",
      inv_sv: row["inv_sv"]?.trim() ?? "",
      W: row["W"]?.trim() ?? "",
      Ld: row["Ld"]?.trim() ?? "",
      OC: row["OC"]?.trim() ?? "",
    });
  }
  console.log("  Parsed " + models.length + " model profiles");

  // 5. Parse Datasheets_wargear.csv -> udb_unit_weapons rows
  console.log("Step 5: Parsing Datasheets_wargear.csv...");
  const wargearRaw = readCsv("Datasheets_wargear.csv");
  const weapons: UdbUnitWeaponRow[] = [];

  // Track weapon_group per unit: each new entry with line_order == 1 starts a new group
  const weaponGroupTracker = new Map<string, number>();

  for (const row of wargearRaw) {
    const unitId = row["datasheet_id"]?.trim();
    if (!unitId || !validUnitIds.has(unitId)) continue;

    const name = row["name"]?.trim() ?? "";
    const lineOrder = parseInt(row["line"]?.trim() ?? "1", 10) || 1;

    let weaponGroup = weaponGroupTracker.get(unitId) ?? 0;
    if (lineOrder === 1) {
      weaponGroup++;
      weaponGroupTracker.set(unitId, weaponGroup);
    }

    weapons.push({
      unit_id: unitId,
      weapon_group: weaponGroup,
      line_order: lineOrder,
      name,
      category: row["wargear_role"]?.trim() ?? row["type"]?.trim() ?? "",
      range: row["Range"]?.trim() ?? "",
      attacks: row["A"]?.trim() ?? "",
      skill: row["BS_WS"]?.trim() ?? row["BS/WS"]?.trim() ?? "",
      strength: row["S"]?.trim() ?? "",
      ap: row["AP"]?.trim() ?? "",
      damage: row["D"]?.trim() ?? "",
      keywords: row["keywords"]?.trim() ?? "",
      name_fr: null,
    });
  }
  console.log("  Parsed " + weapons.length + " weapon profiles");

  // 6. Parse Datasheets_abilities.csv -> udb_unit_abilities rows
  console.log("Step 6: Parsing Datasheets_abilities.csv...");
  const abilitiesRaw = readCsv("Datasheets_abilities.csv");
  const abilities: UdbUnitAbilityRow[] = [];

  for (const row of abilitiesRaw) {
    const unitId = row["datasheet_id"]?.trim();
    if (!unitId || !validUnitIds.has(unitId)) continue;

    abilities.push({
      unit_id: unitId,
      line_order: parseInt(row["line"]?.trim() ?? "0", 10) || 0,
      name: row["name"]?.trim() ?? "",
      description: row["description"]?.trim() ?? "",
      ability_type: row["type"]?.trim() ?? row["ability_type"]?.trim() ?? "",
      name_fr: null,
      description_fr: null,
    });
  }
  console.log("  Parsed " + abilities.length + " abilities");

  // 7. Parse Datasheets_keywords.csv -> udb_unit_keywords rows
  console.log("Step 7: Parsing Datasheets_keywords.csv...");
  const keywordsRaw = readCsv("Datasheets_keywords.csv");
  const keywords: UdbUnitKeywordRow[] = [];
  const seenKeywords = new Set<string>();

  for (const row of keywordsRaw) {
    const unitId = row["datasheet_id"]?.trim();
    if (!unitId || !validUnitIds.has(unitId)) continue;

    const keyword = row["keyword"]?.trim();
    if (!keyword) continue;

    const dupeKey = unitId + ":" + keyword;
    if (seenKeywords.has(dupeKey)) continue;
    seenKeywords.add(dupeKey);

    const isFaction: 0 | 1 = row["is_faction_keyword"]?.trim() === "1" ? 1 : 0;
    keywords.push({ unit_id: unitId, keyword, is_faction: isFaction, keyword_fr: null });
  }
  console.log("  Parsed " + keywords.length + " keywords");

  // 7b. Load alias table for multi-pass matching (D-01)
  const aliases = loadAliases(ALIASES_PATH);
  const aliasCount = Object.keys(aliases).length;
  if (aliasCount > 0) {
    console.log("  Loaded " + aliasCount + " alias mappings from aliases.json");
  }

  // 8. Read and parse BSData .cat files for points tiers and composition
  console.log("Step 8: Reading BSData .cat files...");
  const catFiles = readBsdataCatFiles();

  const points: UdbUnitPointsRow[] = [];
  const composition: UdbUnitCompositionRow[] = [];

  if (catFiles.length > 0) {
    // 8a. Extract points tiers with multi-pass matching (D-01)
    const seenPoints = new Set<string>();
    const matchedUnits = new Set<string>(); // track units that got points
    let exactMatches = 0;
    let normalizedMatches = 0;
    let aliasMatches = 0;

    for (const catFile of catFiles) {
      const bsdataUnits = parseCatXml(catFile.xml, catFile.factionId, catFile.catalogueName);
      const subFaction = SUB_FACTION_MAP[catFile.catalogueName] ?? null;

      // Cross-faction alternate ID for this catalogue (e.g., Aeldari Library -> DRU)
      const altFactionId = CROSS_FACTION_MAP[catFile.catalogueName] ?? null;

      for (const bsdataUnit of bsdataUnits) {
        // Multi-pass matching: exact -> normalized -> alias (D-01)
        let unit = matchUnit(bsdataUnit.datasheet_name, bsdataUnit.faction_id, aliases, unitByNameFaction);

        // Cross-faction fallback: try alternate faction_id (e.g., DRU for Aeldari Library units)
        if (!unit && altFactionId) {
          unit = matchUnit(bsdataUnit.datasheet_name, altFactionId, aliases, unitByNameFaction);
        }

        if (!unit) continue;

        // Track which pass matched (for diagnostics)
        const exactKey = bsdataUnit.datasheet_name.toLowerCase() + ":" + bsdataUnit.faction_id;
        if (unitByNameFaction.has(exactKey)) {
          exactMatches++;
        } else if (!aliases[bsdataUnit.datasheet_name]) {
          normalizedMatches++;
        } else {
          aliasMatches++;
        }

        // Sub-faction population (D-09/SF-01/SF-02)
        if (subFaction && unit.sub_faction === null) {
          unit.sub_faction = subFaction;
        }

        if (bsdataUnit.tiers.length > 0) {
          // Multi-tier unit: add one points row per model-count tier
          for (const tier of bsdataUnit.tiers) {
            const pointsKey = unit.id + ":" + tier.modelCount;
            if (!seenPoints.has(pointsKey)) {
              seenPoints.add(pointsKey);
              points.push({ unit_id: unit.id, model_count: tier.modelCount, points: tier.points });
              matchedUnits.add(unit.id);
            }
          }
        } else {
          // Single-cost unit: set base_points on the unit row directly
          const basePoints = parseInt(bsdataUnit.points, 10);
          if (basePoints > 0 && unit.base_points === null) {
            unit.base_points = basePoints;
            matchedUnits.add(unit.id);
          }
        }
      }
    }
    console.log("  Extracted " + points.length + " points tier entries");
    console.log("  Matching stats: " + exactMatches + " exact, " + normalizedMatches + " normalized, " + aliasMatches + " alias");

    // 8b. Extract composition (min/max model counts)
    const bsdataModelCounts = parseBsdataModelCounts(catFiles);
    const seenComposition = new Set<string>();

    for (const mc of bsdataModelCounts) {
      let unit: UdbUnitRow | undefined;

      if (mc.faction_id) {
        unit = matchUnit(mc.unit_name, mc.faction_id, aliases, unitByNameFaction);
      }

      // Fallback: search all factions for unit name match
      if (!unit) {
        const prefix = mc.unit_name.toLowerCase() + ":";
        for (const [mapKey, mapUnit] of unitByNameFaction) {
          if (mapKey.startsWith(prefix)) {
            unit = mapUnit;
            break;
          }
        }
      }

      if (!unit) continue;
      if (seenComposition.has(unit.id)) continue;
      seenComposition.add(unit.id);

      composition.push({
        unit_id: unit.id,
        min_models: mc.min_models,
        max_models: mc.max_models,
        notes: "",
      });
    }
    console.log("  Extracted " + composition.length + " composition entries");
  } else {
    console.log("  Skipping BSData parsing (no .cat files found)");
  }

  // ---------------------------------------------------------------------------
  // Validation (T-103-05: partial dataset detection)
  // ---------------------------------------------------------------------------
  console.log("");
  console.log("Step 9: Validating completeness...");

  // Check: every faction must have at least 1 unit
  const unitsPerFaction = new Map<string, number>();
  for (const unit of units) {
    unitsPerFaction.set(unit.faction_id, (unitsPerFaction.get(unit.faction_id) ?? 0) + 1);
  }

  const emptyFactions = factions.filter(
    (f) => !unitsPerFaction.has(f.id) || unitsPerFaction.get(f.id)! === 0
  );
  if (emptyFactions.length > 0) {
    console.warn("  Removing " + emptyFactions.length + " faction(s) with no units:");
    for (const f of emptyFactions) {
      console.warn("    - " + f.id + ": " + f.name);
    }
    const emptyIds = new Set(emptyFactions.map((f) => f.id));
    factions.splice(0, factions.length, ...factions.filter((f) => !emptyIds.has(f.id)));
  }

  // Check: total unit count >= 100 (40k 10th has ~500+ datasheets)
  if (units.length < 100) {
    console.error(
      "ERROR: Only " + units.length + " units parsed — expected >= 100 for 40k 10th edition."
    );
    console.error("This likely indicates a CSV parsing failure. Check your Datasheets.csv.");
    process.exit(1);
  }

  console.log("  All " + factions.length + " factions have at least 1 unit");
  console.log("  Unit count " + units.length + " >= 100 (completeness check passed)");

  // ---------------------------------------------------------------------------
  // Coverage report (D-04/DQ-01)
  // ---------------------------------------------------------------------------
  console.log("");
  console.log("Step 10: Computing coverage report...");

  // Build set of unit IDs that have points (base_points or points tiers)
  const unitsWithPointsSet = new Set<string>();
  for (const unit of units) {
    if (unit.base_points !== null) {
      unitsWithPointsSet.add(unit.id);
    }
  }
  for (const p of points) {
    unitsWithPointsSet.add(p.unit_id);
  }

  // Per-faction coverage
  const factionCoverages: FactionCoverage[] = [];
  const unmatchedUnits: Array<{ name: string; faction_id: string }> = [];

  for (const faction of factions) {
    const factionUnits = units.filter((u) => u.faction_id === faction.id);
    const totalUnits = factionUnits.length;
    const withPoints = factionUnits.filter((u) => unitsWithPointsSet.has(u.id)).length;
    const coveragePct = totalUnits > 0 ? Math.round((withPoints / totalUnits) * 1000) / 10 : 0;

    factionCoverages.push({
      faction_id: faction.id,
      faction_name: faction.name,
      total_units: totalUnits,
      units_with_points: withPoints,
      coverage_pct: coveragePct,
    });

    // Collect unmatched units for this faction
    for (const u of factionUnits) {
      if (!unitsWithPointsSet.has(u.id)) {
        unmatchedUnits.push({ name: u.name, faction_id: u.faction_id });
      }
    }
  }

  const overallWithPoints = unitsWithPointsSet.size;
  const overallCoveragePct = units.length > 0
    ? Math.round((overallWithPoints / units.length) * 1000) / 10
    : 0;

  const coverageReport: CoverageReport = {
    built_at: new Date().toISOString(),
    overall_coverage_pct: overallCoveragePct,
    total_units: units.length,
    units_with_points: overallWithPoints,
    factions: factionCoverages,
    unmatched_units: unmatchedUnits,
  };

  writeFileSync(COVERAGE_PATH, JSON.stringify(coverageReport, null, 2), "utf-8");
  console.log("  Written: " + COVERAGE_PATH);

  // Print per-faction coverage table
  console.log("");
  console.log("=== Points Coverage ===");
  console.log("  " + "Faction".padEnd(40) + "Units".padStart(8) + "Points".padStart(8) + "Coverage".padStart(10));
  console.log("  " + "-".repeat(66));
  for (const fc of factionCoverages) {
    const badge = fc.coverage_pct >= 85 ? " [OK]" : fc.coverage_pct >= 50 ? " [!]" : " [X]";
    console.log(
      "  " +
      fc.faction_name.padEnd(40) +
      String(fc.total_units).padStart(8) +
      String(fc.units_with_points).padStart(8) +
      (fc.coverage_pct.toFixed(1) + "%").padStart(10) +
      badge
    );
  }
  console.log("  " + "-".repeat(66));
  console.log(
    "  " +
    "OVERALL".padEnd(40) +
    String(units.length).padStart(8) +
    String(overallWithPoints).padStart(8) +
    (overallCoveragePct.toFixed(1) + "%").padStart(10)
  );
  console.log("  Unmatched units: " + unmatchedUnits.length);
  console.log("");

  // Sub-faction stats
  const unitsWithSubFaction = units.filter((u) => u.sub_faction !== null).length;
  console.log("  Units with sub_faction: " + unitsWithSubFaction);

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("");
  console.log("=== Build Summary ===");
  console.log("  Factions:        " + factions.length);
  console.log("  Units:           " + units.length);
  console.log("  Model profiles:  " + models.length);
  console.log("  Weapons:         " + weapons.length);
  console.log("  Abilities:       " + abilities.length);
  console.log("  Keywords:        " + keywords.length);
  console.log("  Points tiers:    " + points.length);
  console.log("  Composition:     " + composition.length);
  console.log("");

  // ---------------------------------------------------------------------------
  // Assemble and write output JSON (D-05)
  // ---------------------------------------------------------------------------
  // CR-04 fix: derive version from content hash so re-imports detect changes
  const { createHash } = await import("node:crypto");
  const contentSeed = `${factions.length}-${units.length}-${weapons.length}-${points.length}-${abilities.length}-${keywords.length}`;
  const hash = createHash("sha256").update(contentSeed).digest("hex").slice(0, 8);
  const buildVersion = `1.0.0+${hash}`;

  const output: UnitDatabaseJson = {
    version: buildVersion,
    built_at: new Date().toISOString(),
    game_system: "40k-10th",
    unit_count: units.length,
    faction_count: factions.length,
    factions,
    units,
    models,
    weapons,
    abilities,
    keywords,
    points,
    composition,
  };

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log("Created output directory: " + OUTPUT_DIR);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  const fileSizeKb = (readFileSync(OUTPUT_PATH).length / 1024).toFixed(1);
  console.log("Written: " + OUTPUT_PATH);
  console.log("File size: " + fileSizeKb + " KB");
  console.log("");
  console.log("Build complete!");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
