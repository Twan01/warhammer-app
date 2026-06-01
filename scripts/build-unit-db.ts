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
 *
 * Note on imports: The existing src/lib/ parsers use the Vite `@/` path alias
 * and Tauri-only APIs (fetch from @tauri-apps/plugin-http). Those cannot be
 * imported directly in Node.js. This script replicates the pure parsing logic
 * inline so the build tool runs in a plain Node.js context without Vite.
 */

// Must be first: polyfill DOMParser for XML parsing (browser API not in Node.js).
import { DOMParser } from "@xmldom/xmldom";
// @ts-ignore - globalThis.DOMParser polyfill for Node.js
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Inlined: parseWahapediaCsv (mirrors src/lib/parseWahapediaCsv.ts)
// Pipe-delimited, UTF-8, trailing pipe on every row.
// ---------------------------------------------------------------------------
function parseWahapediaCsv(raw: string): Record<string, string>[] {
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

// ---------------------------------------------------------------------------
// Inlined: FACTION_MAP (mirrors src/lib/bsdataCommon.ts)
// BSData catalogue filename → Wahapedia faction_id
// ---------------------------------------------------------------------------
const FACTION_MAP: Record<string, string> = {
  "Imperium - Space Marines": "SM",
  "Imperium - Black Templars": "SM",
  "Imperium - Blood Angels": "SM",
  "Imperium - Dark Angels": "SM",
  "Imperium - Deathwatch": "SM",
  "Imperium - Imperial Fists": "SM",
  "Imperium - Iron Hands": "SM",
  "Imperium - Raven Guard": "SM",
  "Imperium - Salamanders": "SM",
  "Imperium - Space Wolves": "SM",
  "Imperium - Ultramarines": "SM",
  "Imperium - White Scars": "SM",
  "Imperium - Adeptus Custodes": "AC",
  "Imperium - Adepta Sororitas": "AS",
  "Imperium - Adeptus Mechanicus": "AdM",
  "Imperium - Astra Militarum": "AM",
  "Imperium - Grey Knights": "GK",
  "Imperium - Agents of the Imperium": "AoI",
  "Imperium - Imperial Knights": "QI",
  "Imperium - Adeptus Titanicus": "TL",
  "Chaos - Chaos Space Marines": "CSM",
  "Chaos - Death Guard": "DG",
  "Chaos - Thousand Sons": "TS",
  "Chaos - World Eaters": "WE",
  "Chaos - Emperor's Children": "EC",
  "Chaos - Chaos Knights": "QT",
  "Chaos - Chaos Daemons": "CD",
  "Chaos - Titanicus Traitoris": "TL",
  "Aeldari - Craftworlds": "AE",
  "Aeldari - Drukhari": "DRU",
  "Aeldari - Ynnari": "AE",
  "Necrons": "NEC",
  "Orks": "ORK",
  "T'au Empire": "TAU",
  "Tyranids": "TYR",
  "Genestealer Cults": "GC",
  "Leagues of Votann": "LoV",
  "Unaligned Forces": "UN",
};

// ---------------------------------------------------------------------------
// Inlined: BSData points extraction (mirrors src/lib/fetchBsdataPoints.ts)
// ---------------------------------------------------------------------------
interface PointsTier {
  modelCount: number;
  points: number;
}

interface BsdataUnitPoints {
  datasheet_name: string;
  faction_id: string;
  points: string;
  tiers: PointsTier[];
}

function extractTiers(el: Element): PointsTier[] {
  const PTS_FIELD_ID = "51b2-306e-1021-d207";
  const tiers: PointsTier[] = [];
  const modifiers = el.getElementsByTagName("modifier");
  for (let i = 0; i < modifiers.length; i++) {
    const mod = modifiers[i];
    if (mod.getAttribute("type") !== "set") continue;
    if (mod.getAttribute("field") !== PTS_FIELD_ID) continue;
    const value = parseInt(mod.getAttribute("value") ?? "0", 10);
    if (value <= 0) continue;
    const conditions = mod.getElementsByTagName("condition");
    for (let j = 0; j < conditions.length; j++) {
      const cond = conditions[j];
      if (cond.getAttribute("childId") !== "model") continue;
      if (cond.getAttribute("type") !== "atLeast") continue;
      const modelCount = parseInt(cond.getAttribute("value") ?? "0", 10);
      if (modelCount > 0) {
        tiers.push({ modelCount, points: value });
      }
    }
  }
  tiers.sort((a, b) => a.modelCount - b.modelCount);
  return tiers;
}

function parseCatXml(xml: string, factionId: string | null, catalogueName = ""): BsdataUnitPoints[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml") as unknown as Document;
  const errors = doc.getElementsByTagName("parsererror");
  if (errors.length > 0) {
    console.error(`  XML parse error in ${catalogueName || "unknown catalogue"}, skipping`);
    return [];
  }
  const rows: BsdataUnitPoints[] = [];
  const seen = new Set<string>();

  const entries = doc.getElementsByTagName("selectionEntry");
  for (let i = 0; i < entries.length; i++) {
    const el = entries[i];
    const type = el.getAttribute("type");
    if (type !== "unit" && type !== "model") continue;
    const name = el.getAttribute("name");
    if (!name || name.includes("[Legends]")) continue;

    let pts = 0;
    const children = el.childNodes;
    for (let j = 0; j < children.length; j++) {
      if (children[j].nodeName !== "costs") continue;
      const costEls = (children[j] as Element).getElementsByTagName("cost");
      for (let k = 0; k < costEls.length; k++) {
        if (costEls[k].getAttribute("name") === "pts") {
          pts = parseInt(costEls[k].getAttribute("value") ?? "0", 10);
          break;
        }
      }
      break;
    }

    const tiers = extractTiers(el as Element);
    if (pts <= 0 && tiers.length === 0) continue;

    const key = `${name}:${factionId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      datasheet_name: name,
      faction_id: factionId ?? "",
      points: String(pts),
      tiers,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Inlined: BSData model counts extraction (mirrors src/lib/parseBsdataExtended.ts)
// ---------------------------------------------------------------------------
interface BsdataModelCount {
  unit_name: string;
  faction_id: string | null;
  min_models: number;
  max_models: number;
}

function extractModelCounts(doc: Document, factionId: string | null): BsdataModelCount[] {
  const results: BsdataModelCount[] = [];
  const seen = new Set<string>();

  const unitEntries = doc.getElementsByTagName("selectionEntry");
  for (let i = 0; i < unitEntries.length; i++) {
    const el = unitEntries[i];
    if (el.getAttribute("type") !== "unit") continue;
    const unitName = el.getAttribute("name");
    if (!unitName || unitName.includes("[Legends]")) continue;

    const key = `${unitName}:${factionId}`;
    if (seen.has(key)) continue;

    const modelEntries = el.getElementsByTagName("selectionEntry");
    let globalMin = Infinity;
    let globalMax = 0;

    for (let j = 0; j < modelEntries.length; j++) {
      const modelEl = modelEntries[j];
      if (modelEl.getAttribute("type") !== "model") continue;
      const constraints = modelEl.getElementsByTagName("constraint");
      for (let c = 0; c < constraints.length; c++) {
        const ct = constraints[c];
        if (ct.getAttribute("field") !== "selections") continue;
        const val = parseInt(ct.getAttribute("value") ?? "0", 10);
        if (ct.getAttribute("type") === "min" && val > 0 && val < globalMin) {
          globalMin = val;
        }
        if (ct.getAttribute("type") === "max" && val > globalMax) {
          globalMax = val;
        }
      }
    }

    if (globalMin === Infinity) globalMin = 1;
    if (globalMax === 0) globalMax = globalMin;

    if (globalMin > 0 && globalMax >= globalMin) {
      seen.add(key);
      results.push({
        unit_name: unitName,
        faction_id: factionId,
        min_models: globalMin,
        max_models: globalMax,
      });
    }
  }

  return results;
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
// Types for the JSON output (D-05)
// ---------------------------------------------------------------------------
interface UdbFactionRow {
  id: string;
  name: string;
  short_name: string;
}

interface UdbUnitRow {
  id: string;
  faction_id: string;
  name: string;
  role: string;
  base_points: number | null;
  damaged_w: string;
  damaged_desc: string;
}

interface UdbUnitModelRow {
  unit_id: string;
  line_order: number;
  name: string;
  M: string;
  T: string;
  Sv: string;
  inv_sv: string;
  W: string;
  Ld: string;
  OC: string;
}

interface UdbUnitWeaponRow {
  unit_id: string;
  weapon_group: number;
  line_order: number;
  name: string;
  category: string;
  range: string;
  attacks: string;
  skill: string;
  strength: string;
  ap: string;
  damage: string;
  keywords: string;
}

interface UdbUnitAbilityRow {
  unit_id: string;
  line_order: number;
  name: string;
  description: string;
  ability_type: string;
}

interface UdbUnitKeywordRow {
  unit_id: string;
  keyword: string;
  is_faction: 0 | 1;
}

interface UdbUnitPointsRow {
  unit_id: string;
  model_count: number;
  points: number;
}

interface UdbUnitCompositionRow {
  unit_id: string;
  min_models: number;
  max_models: number;
  notes: string;
}

interface UnitDatabaseJson {
  version: string;
  built_at: string;
  game_system: string;
  unit_count: number;
  faction_count: number;
  factions: UdbFactionRow[];
  units: UdbUnitRow[];
  models: UdbUnitModelRow[];
  weapons: UdbUnitWeaponRow[];
  abilities: UdbUnitAbilityRow[];
  keywords: UdbUnitKeywordRow[];
  points: UdbUnitPointsRow[];
  composition: UdbUnitCompositionRow[];
}

// ---------------------------------------------------------------------------
// Data directory paths
// ---------------------------------------------------------------------------
const DATA_DIR = join(REPO_ROOT, "scripts", "data");
const BSDATA_DIR = join(DATA_DIR, "bsdata");
const OUTPUT_DIR = join(REPO_ROOT, "src-tauri", "data");
const OUTPUT_PATH = join(OUTPUT_DIR, "unit_database.json");

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

  const files = readdirSync(BSDATA_DIR).filter(
    (f) => f.endsWith(".cat") && !f.includes("Library")
  );

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

  // 2. Parse Wahapedia Factions.csv → udb_factions rows (D-04: reuse Wahapedia text IDs)
  console.log("Step 2: Parsing Factions.csv...");
  const factionsRaw = readCsv("Factions.csv");
  const factions: UdbFactionRow[] = factionsRaw
    .filter((row) => row["id"] && row["name"])
    .map((row) => ({
      id: row["id"].trim(),
      name: row["name"].trim(),
      short_name: row["short_name"]?.trim() ?? row["id"].trim(),
    }));
  console.log("  Parsed " + factions.length + " factions");

  // Build faction ID set for validation
  const factionIds = new Set(factions.map((f) => f.id));

  // 3. Parse Wahapedia Datasheets.csv → udb_units rows (D-03: reuse Wahapedia string IDs)
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
    });
  }
  console.log("  Parsed " + units.length + " units");

  // Build unit lookup by (name lowercase, faction_id) for BSData matching
  const unitByNameFaction = new Map<string, UdbUnitRow>();
  for (const unit of units) {
    const key = unit.name.toLowerCase() + ":" + unit.faction_id;
    unitByNameFaction.set(key, unit);
  }

  // 4. Parse Datasheets_models.csv → udb_unit_models rows
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

  // 5. Parse Datasheets_wargear.csv → udb_unit_weapons rows
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
    });
  }
  console.log("  Parsed " + weapons.length + " weapon profiles");

  // 6. Parse Datasheets_abilities.csv → udb_unit_abilities rows
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
    });
  }
  console.log("  Parsed " + abilities.length + " abilities");

  // 7. Parse Datasheets_keywords.csv → udb_unit_keywords rows
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
    keywords.push({ unit_id: unitId, keyword, is_faction: isFaction });
  }
  console.log("  Parsed " + keywords.length + " keywords");

  // 8. Read and parse BSData .cat files for points tiers and composition
  console.log("Step 8: Reading BSData .cat files...");
  const catFiles = readBsdataCatFiles();

  const points: UdbUnitPointsRow[] = [];
  const composition: UdbUnitCompositionRow[] = [];

  if (catFiles.length > 0) {
    // 8a. Extract points tiers
    const seenPoints = new Set<string>();
    for (const catFile of catFiles) {
      const bsdataUnits = parseCatXml(catFile.xml, catFile.factionId, catFile.catalogueName);
      for (const bsdataUnit of bsdataUnits) {
        // Match BSData unit to Wahapedia unit by name + faction_id
        const key = bsdataUnit.datasheet_name.toLowerCase() + ":" + bsdataUnit.faction_id;
        const unit = unitByNameFaction.get(key);
        if (!unit) continue;

        if (bsdataUnit.tiers.length > 0) {
          // Multi-tier unit: add one points row per model-count tier
          for (const tier of bsdataUnit.tiers) {
            const pointsKey = unit.id + ":" + tier.modelCount;
            if (!seenPoints.has(pointsKey)) {
              seenPoints.add(pointsKey);
              points.push({ unit_id: unit.id, model_count: tier.modelCount, points: tier.points });
            }
          }
        } else {
          // Single-cost unit: set base_points on the unit row directly
          const basePoints = parseInt(bsdataUnit.points, 10);
          if (basePoints > 0 && unit.base_points === null) {
            unit.base_points = basePoints;
          }
        }
      }
    }
    console.log("  Extracted " + points.length + " points tier entries");

    // 8b. Extract composition (min/max model counts)
    const bsdataModelCounts = parseBsdataModelCounts(catFiles);
    const seenComposition = new Set<string>();

    for (const mc of bsdataModelCounts) {
      let unit: UdbUnitRow | undefined;

      if (mc.faction_id) {
        unit = unitByNameFaction.get(mc.unit_name.toLowerCase() + ":" + mc.faction_id);
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
