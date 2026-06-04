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

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Shared library imports
import { SUB_FACTION_MAP, CROSS_FACTION_MAP } from "./lib/factionMap.ts";
import { readCsvFile, extractModelCount } from "./lib/parseCsv.ts";
import { mapWeaponRow } from "./lib/weaponMapping.ts";

// Legacy BSData imports — kept for compilation, removed in Plan 02
import { parseCatXml } from "./lib/parseXml.ts";
import { loadAliases } from "./lib/normalize.ts";
import { readBsdataCatFiles, parseBsdataModelCounts, matchUnit } from "./lib/bsdata.ts";
import type {
  UdbFactionRow,
  UdbUnitRow,
  UdbUnitModelRow,
  UdbUnitWeaponRow,
  UdbUnitAbilityRow,
  UdbUnitKeywordRow,
  UdbUnitPointsRow,
  UdbUnitCompositionRow,
  UdbDetachmentRow,
  UdbDetachmentAbilityRow,
  UnitDatabaseJson,
  CoverageReport,
  FactionCoverage,
  TranslationsFrOverlay,
} from "./lib/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

/**
 * BPH-05: Minimum acceptable overall coverage percentage.
 *
 * Current coverage is ~60.1%. This threshold is set to 55 (safely below current)
 * to catch regressions without blocking normal builds.
 *
 * Raise this threshold after Phase 113/114 audit work improves coverage.
 * Target: 90% after all faction audits complete.
 */
const MIN_COVERAGE_PCT = 58;

// ---------------------------------------------------------------------------
// Data directory paths
// ---------------------------------------------------------------------------
const DATA_DIR = join(REPO_ROOT, "scripts", "data");
const BSDATA_DIR = join(DATA_DIR, "bsdata");
const OUTPUT_DIR = join(REPO_ROOT, "src-tauri", "data");
const OUTPUT_PATH = join(OUTPUT_DIR, "unit_database.json");
const ALIASES_PATH = join(DATA_DIR, "aliases.json");
const TRANSLATIONS_FR_PATH = join(DATA_DIR, "translations_fr.json");
const COVERAGE_PATH = join(DATA_DIR, "coverage-report.json");

// Required Wahapedia CSV files
const REQUIRED_CSVs = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
  "Detachment_abilities.csv",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load the French translation overlay from translations_fr.json.
 * Returns the overlay object if the file exists and is valid JSON.
 * Returns null and emits a console.warn if the file is missing or malformed.
 * Follows the loadAliases graceful-degrade pattern from scripts/lib/normalize.ts.
 */
function loadTranslationsFr(): TranslationsFrOverlay | null {
  if (!existsSync(TRANSLATIONS_FR_PATH)) {
    console.warn("WARNING: translations_fr.json not found — _fr fields will be null");
    return null;
  }
  try {
    const raw = readFileSync(TRANSLATIONS_FR_PATH, "utf-8");
    return JSON.parse(raw) as TranslationsFrOverlay;
  } catch (e) {
    console.warn("WARNING: Failed to parse translations_fr.json:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// BPH-04: Alias validation
// ---------------------------------------------------------------------------

/**
 * Validates the aliases.json entries against the set of BSData names seen
 * in .cat files and the Wahapedia unit map.
 *
 * Returns counts of: used aliases, unused (stale) aliases, and aliases whose
 * Wahapedia target name is not found in the unit map.
 */
function validateAliases(
  aliases: Record<string, string>,
  allBsdataNames: Set<string>,
  unitByNameFaction: Map<string, UdbUnitRow>
): { used: number; unused: string[]; unknownTargets: string[] } {
  const unused: string[] = [];
  const unknownTargets: string[] = [];
  let used = 0;

  for (const [bsdataName, wahapediaName] of Object.entries(aliases)) {
    const inBsdata = allBsdataNames.has(bsdataName);
    const targetExists = [...unitByNameFaction.keys()].some((key) =>
      key.startsWith(wahapediaName.toLowerCase() + ":")
    );

    if (!inBsdata) {
      unused.push(bsdataName);
    } else if (!targetExists) {
      unknownTargets.push(`"${bsdataName}" -> "${wahapediaName}"`);
    } else {
      used++;
    }
  }

  return { used, unused, unknownTargets };
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
  const factionsRaw = readCsvFile(DATA_DIR, "Factions.csv");
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
  const datasheetsRaw = readCsvFile(DATA_DIR, "Datasheets.csv");
  const units: UdbUnitRow[] = [];
  const validUnitIds = new Set<string>();
  let legendsSkipped = 0;

  for (const row of datasheetsRaw) {
    const id = row["id"]?.trim();
    const factionId = row["faction_id"]?.trim();
    const name = row["name"]?.trim();
    if (!id || !name) continue;

    // PF-03: Filter out Legends (deprecated) units before adding to validUnitIds
    const isLegend = row["legend"] === "1" || row["legend"] === "true";
    if (isLegend) {
      legendsSkipped++;
      continue;
    }

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

  // PF-04: Dedup pass — warn on name+faction duplicates (after Legends filter)
  const dedupMap = new Map<string, UdbUnitRow>();
  let dupsFound = 0;
  for (const unit of units) {
    const key = unit.name.toLowerCase() + ":" + unit.faction_id;
    if (dedupMap.has(key)) {
      console.warn(`  WARNING: Duplicate unit "${unit.name}" (faction_id=${unit.faction_id}) — discarding id=${unit.id}`);
      dupsFound++;
    } else {
      dedupMap.set(key, unit);
    }
  }
  const dedupedUnits = Array.from(dedupMap.values());
  // Replace units array reference for downstream steps
  units.length = 0;
  for (const u of dedupedUnits) units.push(u);
  // Rebuild validUnitIds to match deduped set
  validUnitIds.clear();
  for (const u of units) validUnitIds.add(u.id);

  console.log(`  Parsed ${units.length} units (${legendsSkipped} Legends excluded${dupsFound > 0 ? `, ${dupsFound} duplicates discarded` : ""})`);

  // Build unit lookup by (name lowercase, faction_id) for BSData matching
  const unitByNameFaction = new Map<string, UdbUnitRow>();
  for (const unit of units) {
    const key = unit.name.toLowerCase() + ":" + unit.faction_id;
    unitByNameFaction.set(key, unit);
  }

  // 4. Parse Datasheets_models.csv -> udb_unit_models rows
  console.log("Step 4: Parsing Datasheets_models.csv...");
  const modelsRaw = readCsvFile(DATA_DIR, "Datasheets_models.csv");
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
  const wargearRaw = readCsvFile(DATA_DIR, "Datasheets_wargear.csv");
  const weapons: UdbUnitWeaponRow[] = [];

  for (const row of wargearRaw) {
    const unitId = row["datasheet_id"]?.trim();
    if (!unitId || !validUnitIds.has(unitId)) continue;

    const mapped = mapWeaponRow(row);
    weapons.push({
      ...mapped,
      name_fr: null,
    });
  }
  console.log("  Parsed " + weapons.length + " weapon profiles");

  // 6. Parse Datasheets_abilities.csv -> udb_unit_abilities rows
  console.log("Step 6: Parsing Datasheets_abilities.csv...");
  const abilitiesRaw = readCsvFile(DATA_DIR, "Datasheets_abilities.csv");
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
  const keywordsRaw = readCsvFile(DATA_DIR, "Datasheets_keywords.csv");
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

  // 8. Parse Datasheets_models_cost.csv for points and composition (D-01, D-02, D-03)
  console.log("Step 8: Parsing Datasheets_models_cost.csv...");
  const costRows = readCsvFile(DATA_DIR, "Datasheets_models_cost.csv");

  const points: UdbUnitPointsRow[] = [];
  const composition: UdbUnitCompositionRow[] = [];

  // Group cost rows by datasheet_id
  const costByUnit = new Map<string, Array<{ line: number; description: string; cost: number }>>();
  for (const row of costRows) {
    const id = row["datasheet_id"]?.trim();
    if (!id || !validUnitIds.has(id)) continue;
    const cost = parseInt(row["cost"]?.trim() ?? "0", 10);
    if (cost <= 0) continue;
    const arr = costByUnit.get(id) ?? [];
    arr.push({
      line: parseInt(row["line"]?.trim() ?? "0", 10) || 0,
      description: row["description"]?.trim() ?? "",
      cost,
    });
    costByUnit.set(id, arr);
  }

  const matchedUnits = new Set<string>();

  for (const [unitId, tiers] of costByUnit) {
    const unit = units.find(u => u.id === unitId);
    if (!unit) continue;

    if (tiers.length === 1) {
      // Single-tier: set base_points directly (D-03)
      if (unit.base_points === null) {
        unit.base_points = tiers[0].cost;
        matchedUnits.add(unitId);
      }
    } else {
      // Multi-tier: create one UdbUnitPointsRow per tier (D-02)
      for (const tier of tiers) {
        const modelCount = extractModelCount(tier.description, tier.line);
        points.push({ unit_id: unitId, model_count: modelCount, points: tier.cost });
        matchedUnits.add(unitId);
      }
    }

    // Composition: derive min/max model counts from tier descriptions (D-09)
    const counts = tiers.map(t => extractModelCount(t.description, t.line));
    composition.push({
      unit_id: unitId,
      min_models: Math.min(...counts),
      max_models: Math.max(...counts),
      notes: "",
    });
  }

  console.log(`  Matched ${matchedUnits.size} units via cost CSV (${points.length} tier entries)`);
  console.log(`  Extracted ${composition.length} composition entries`);

  // 8b. Assign sub-factions from keywords (D-10) — replaces BSData catalogue-based assignment
  const subFactionValues = new Set(Object.values(SUB_FACTION_MAP));
  const unitById = new Map(units.map(u => [u.id, u]));
  let subFactionAssigned = 0;

  for (const kw of keywords) {
    if (subFactionValues.has(kw.keyword)) {
      const unit = unitById.get(kw.unit_id);
      if (unit && unit.sub_faction === null) {
        unit.sub_faction = kw.keyword;
        subFactionAssigned++;
      }
    }
  }

  console.log(`  Sub-faction assigned to ${subFactionAssigned} units via keyword matching`);

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

    // BPH-01: Collect unmatched names for this faction
    const factionUnmatchedNames: string[] = [];
    for (const u of factionUnits) {
      if (!unitsWithPointsSet.has(u.id)) {
        factionUnmatchedNames.push(u.name);
        unmatchedUnits.push({ name: u.name, faction_id: u.faction_id });
      }
    }

    factionCoverages.push({
      faction_id: faction.id,
      faction_name: faction.name,
      total_units: totalUnits,
      units_with_points: withPoints,
      coverage_pct: coveragePct,
      unmatched_names: factionUnmatchedNames,
    });
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
  console.log(
    "  " +
    "Faction".padEnd(40) +
    "Units".padStart(7) +
    "WithPts".padStart(9) +
    "Coverage".padStart(10)
  );
  console.log("  " + "-".repeat(66));
  for (const fc of factionCoverages) {
    const badge = fc.coverage_pct >= 85 ? " [OK]" : fc.coverage_pct >= 50 ? " [!]" : " [X]";
    console.log(
      "  " +
      fc.faction_name.padEnd(40) +
      String(fc.total_units).padStart(7) +
      String(fc.units_with_points).padStart(9) +
      (fc.coverage_pct.toFixed(1) + "%").padStart(10) +
      badge
    );
  }
  console.log("  " + "-".repeat(66));
  console.log(
    "  " +
    "OVERALL".padEnd(40) +
    String(units.length).padStart(7) +
    String(overallWithPoints).padStart(9) +
    (overallCoveragePct.toFixed(1) + "%").padStart(10)
  );
  console.log("  Unmatched units: " + unmatchedUnits.length);
  console.log("");

  // BPH-01: Print unmatched unit names grouped by faction (D-02)
  for (const fc of factionCoverages) {
    if (fc.unmatched_names && fc.unmatched_names.length > 0) {
      console.log("  " + fc.faction_name + " — " + fc.unmatched_names.length + " unmatched:");
      for (const name of fc.unmatched_names) {
        console.log("    - " + name);
      }
    }
  }
  console.log("");

  // BPH-05: Coverage failure threshold check (D-09, D-10)
  // Uses overall (all factions combined) percentage, not per-faction.
  if (overallCoveragePct < MIN_COVERAGE_PCT) {
    console.error(
      "ERROR: Overall coverage " + overallCoveragePct.toFixed(1) + "% is below minimum threshold of " + MIN_COVERAGE_PCT + "%"
    );
    console.error("This indicates a regression. Check BSData .cat files or Wahapedia CSV freshness.");
    process.exit(1);
  }

  // Sub-faction stats
  const unitsWithSubFaction = units.filter((u) => u.sub_faction !== null).length;
  console.log("  Units with sub_faction: " + unitsWithSubFaction);

  // ---------------------------------------------------------------------------
  // Step 10.5 — Apply French overlay
  // Applied after all entity arrays are finalized (points backfill, sub_faction
  // assignment, empty faction pruning) and before JSON output assembly.
  // Per RESEARCH Pitfall 5 and PATTERNS Pattern 1.
  // ---------------------------------------------------------------------------
  const frOverlay = loadTranslationsFr();
  let frFactions = 0;
  let frUnits = 0;
  let frAbilities = 0;
  let frWeapons = 0;
  let frKeywords = 0;

  if (frOverlay) {
    for (const f of factions) {
      if (frOverlay.factions?.[f.id]) {
        f.name_fr = frOverlay.factions[f.id];
        frFactions++;
      }
    }
    for (const u of units) {
      if (frOverlay.units?.[u.id]) {
        u.name_fr = frOverlay.units[u.id];
        frUnits++;
      }
    }
    for (const a of abilities) {
      const key = `${a.unit_id}:${a.name}`;
      const t = frOverlay.abilities?.[key];
      if (t) {
        a.name_fr = t.name_fr ?? null;
        a.description_fr = t.description_fr ?? null;
        frAbilities++;
      }
    }
    for (const w of weapons) {
      const key = `${w.unit_id}:${w.name}`;
      if (frOverlay.weapons?.[key]) {
        w.name_fr = frOverlay.weapons[key];
        frWeapons++;
      }
    }
    for (const k of keywords) {
      if (frOverlay.keywords?.[k.keyword]) {
        k.keyword_fr = frOverlay.keywords[k.keyword];
        frKeywords++;
      }
    }
    console.log(
      `  French overlay: ${frFactions} factions, ${frUnits} units, ${frAbilities} abilities, ${frWeapons} weapons, ${frKeywords} keywords translated`,
    );
  }

  // ---------------------------------------------------------------------------
  // Step 11: Parse Detachment_abilities.csv -> udb_detachments + udb_detachment_abilities rows
  // NOTE: No Legends filter — the `legend` column in Detachment_abilities.csv
  // contains lore/flavor text, NOT a boolean flag (unlike Datasheets.csv).
  // ---------------------------------------------------------------------------
  console.log("Step 11: Parsing Detachment_abilities.csv...");
  const detachAbilitiesRaw = readCsvFile(DATA_DIR, "Detachment_abilities.csv");
  const detachments: UdbDetachmentRow[] = [];
  const detachmentAbilities: UdbDetachmentAbilityRow[] = [];
  const seenDetachmentIds = new Set<string>();

  for (const row of detachAbilitiesRaw) {
    const detachmentId = row["detachment_id"]?.trim();
    const factionId = row["faction_id"]?.trim();
    const abilityId = row["id"]?.trim();
    const detachmentName = row["detachment"]?.trim();
    const abilityName = row["name"]?.trim();

    if (!detachmentId || !factionId || !abilityId || !abilityName) continue;

    if (factionId && !factionIds.has(factionId)) {
      console.warn(`  WARNING: Skipping detachment ability "${abilityName}" — unknown faction_id "${factionId}"`);
      continue;
    }

    // Collect unique detachments (first occurrence wins) — D-02: PK = detachment_id TEXT
    if (!seenDetachmentIds.has(detachmentId)) {
      seenDetachmentIds.add(detachmentId);
      detachments.push({ id: detachmentId, faction_id: factionId, name: detachmentName ?? "" });
    }

    // Collect abilities — D-03: PK = ability id TEXT
    detachmentAbilities.push({
      id: abilityId,
      detachment_id: detachmentId,
      faction_id: factionId,
      name: abilityName,
      description: row["description"]?.trim() ?? "",
    });
  }
  console.log(`  Parsed ${detachments.length} detachments, ${detachmentAbilities.length} detachment abilities`);

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
  console.log("  Detachments:     " + detachments.length);
  console.log("  Det. abilities:  " + detachmentAbilities.length);
  console.log("");

  // ---------------------------------------------------------------------------
  // BPH-02: Deterministic output sorting (D-03)
  // Sort BEFORE hash computation so the hash itself is deterministic.
  // ---------------------------------------------------------------------------
  factions.sort((a, b) => a.id.localeCompare(b.id));
  units.sort((a, b) => a.id.localeCompare(b.id));
  models.sort((a, b) => {
    const c = a.unit_id.localeCompare(b.unit_id);
    return c !== 0 ? c : a.line_order - b.line_order;
  });
  weapons.sort((a, b) => {
    const c = a.unit_id.localeCompare(b.unit_id);
    if (c !== 0) return c;
    const g = a.weapon_group - b.weapon_group;
    return g !== 0 ? g : a.line_order - b.line_order;
  });
  abilities.sort((a, b) => {
    const c = a.unit_id.localeCompare(b.unit_id);
    return c !== 0 ? c : a.line_order - b.line_order;
  });
  keywords.sort((a, b) => {
    const c = a.unit_id.localeCompare(b.unit_id);
    return c !== 0 ? c : a.keyword.localeCompare(b.keyword);
  });
  points.sort((a, b) => {
    const c = a.unit_id.localeCompare(b.unit_id);
    return c !== 0 ? c : a.model_count - b.model_count;
  });
  composition.sort((a, b) => a.unit_id.localeCompare(b.unit_id));

  // ---------------------------------------------------------------------------
  // Assemble and write output JSON (D-05)
  // ---------------------------------------------------------------------------
  // Derive version from content hash so re-imports detect any data change
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(JSON.stringify({ factions, units, weapons, points, abilities, keywords, composition, detachments, detachmentAbilities })).digest("hex").slice(0, 8);
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
    detachments,
    detachment_abilities: detachmentAbilities,
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
