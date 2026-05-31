/**
 * Dev-side update script: re-runs the data acquisition pipeline from
 * build-unit-db.ts, compares old vs new unit_database.json, and prints
 * a human-readable diff report.
 *
 * Usage:
 *   node --experimental-strip-types scripts/update-unit-database.ts
 *   node --experimental-strip-types scripts/update-unit-database.ts --write
 *
 * Without --write: dry-run mode -- shows what changed but does NOT modify
 * unit_database.json.
 *
 * With --write: writes the new unit_database.json to src-tauri/data/.
 *
 * Prerequisites: same as build-unit-db.ts (Wahapedia CSVs + BSData .cat files).
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
// Inlined: parseWahapediaCsv (mirrors build-unit-db.ts)
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
// FACTION_MAP (mirrors build-unit-db.ts)
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
// BSData points extraction (mirrors build-unit-db.ts)
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

function parseCatXml(xml: string, factionId: string | null): BsdataUnitPoints[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml") as unknown as Document;
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

    if (pts <= 0) continue;

    const key = `${name}:${factionId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const tiers = extractTiers(el as Element);
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
// BSData model counts extraction (mirrors build-unit-db.ts)
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
// Types for the JSON output (same as build-unit-db.ts)
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
// Diff report types
// ---------------------------------------------------------------------------
interface DiffReport {
  newUnits: Array<{ id: string; name: string; faction_id: string }>;
  removedUnits: Array<{ id: string; name: string; faction_id: string }>;
  pointsChanges: Array<{
    id: string;
    name: string;
    faction_id: string;
    oldPoints: string;
    newPoints: string;
  }>;
  abilityChanges: Array<{
    id: string;
    name: string;
    faction_id: string;
    added: string[];
    removed: string[];
  }>;
  keywordChanges: Array<{
    id: string;
    name: string;
    faction_id: string;
    added: string[];
    removed: string[];
  }>;
}

// ---------------------------------------------------------------------------
// Data directory paths (same as build-unit-db.ts)
// ---------------------------------------------------------------------------
const DATA_DIR = join(REPO_ROOT, "scripts", "data");
const BSDATA_DIR = join(DATA_DIR, "bsdata");
const OUTPUT_DIR = join(REPO_ROOT, "src-tauri", "data");
const OUTPUT_PATH = join(OUTPUT_DIR, "unit_database.json");

const REQUIRED_CSVs = [
  "Factions.csv",
  "Datasheets.csv",
  "Datasheets_models.csv",
  "Datasheets_abilities.csv",
  "Datasheets_keywords.csv",
  "Datasheets_wargear.csv",
] as const;

// ---------------------------------------------------------------------------
// Helpers (same as build-unit-db.ts)
// ---------------------------------------------------------------------------
function readCsv(filename: string): Record<string, string>[] {
  const filepath = join(DATA_DIR, filename);
  const raw = readFileSync(filepath, "utf-8");
  return parseWahapediaCsv(raw);
}

function readBsdataCatFiles(): Array<{ xml: string; factionId: string | null; catalogueName: string }> {
  if (!existsSync(BSDATA_DIR)) return [];

  const files = readdirSync(BSDATA_DIR).filter(
    (f) => f.endsWith(".cat") && !f.includes("Library")
  );
  if (files.length === 0) return [];

  const entries: Array<{ xml: string; factionId: string | null; catalogueName: string }> = [];
  for (const filename of files) {
    try {
      const xml = readFileSync(join(BSDATA_DIR, filename), "utf-8");
      const catalogueName = filename.replace(/\.cat$/, "");
      const factionId = FACTION_MAP[catalogueName] ?? null;
      entries.push({ xml, factionId, catalogueName });
    } catch (_e) {
      // Skip unreadable files
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Build pipeline (reuses logic from build-unit-db.ts)
// ---------------------------------------------------------------------------
async function buildUnitDatabase(): Promise<UnitDatabaseJson> {
  // Verify required CSV files
  for (const csv of REQUIRED_CSVs) {
    const filepath = join(DATA_DIR, csv);
    if (!existsSync(filepath)) {
      console.error("ERROR: Missing required file: " + filepath);
      console.error("Please download Wahapedia CSV files to scripts/data/");
      process.exit(1);
    }
  }

  // Parse factions
  const factionsRaw = readCsv("Factions.csv");
  const factions: UdbFactionRow[] = factionsRaw
    .filter((row) => row["id"] && row["name"])
    .map((row) => ({
      id: row["id"].trim(),
      name: row["name"].trim(),
      short_name: row["short_name"]?.trim() ?? row["id"].trim(),
    }));
  const factionIds = new Set(factions.map((f) => f.id));

  // Parse units
  const datasheetsRaw = readCsv("Datasheets.csv");
  const units: UdbUnitRow[] = [];
  const validUnitIds = new Set<string>();

  for (const row of datasheetsRaw) {
    const id = row["id"]?.trim();
    const factionId = row["faction_id"]?.trim();
    const name = row["name"]?.trim();
    if (!id || !name) continue;
    if (factionId && !factionIds.has(factionId)) continue;

    validUnitIds.add(id);
    units.push({
      id,
      faction_id: factionId ?? "",
      name,
      role: row["role"]?.trim() ?? "",
      base_points: null,
      damaged_w: row["damaged_w"]?.trim() ?? "",
      damaged_desc: row["damaged_description"]?.trim() ?? "",
    });
  }

  const unitByNameFaction = new Map<string, UdbUnitRow>();
  for (const unit of units) {
    unitByNameFaction.set(unit.name.toLowerCase() + ":" + unit.faction_id, unit);
  }

  // Parse models
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

  // Parse weapons
  const wargearRaw = readCsv("Datasheets_wargear.csv");
  const weapons: UdbUnitWeaponRow[] = [];
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

  // Parse abilities
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

  // Parse keywords
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

  // Parse BSData
  const catFiles = readBsdataCatFiles();
  const points: UdbUnitPointsRow[] = [];
  const composition: UdbUnitCompositionRow[] = [];

  if (catFiles.length > 0) {
    const seenPoints = new Set<string>();
    for (const catFile of catFiles) {
      const bsdataUnits = parseCatXml(catFile.xml, catFile.factionId);
      for (const bsdataUnit of bsdataUnits) {
        const key = bsdataUnit.datasheet_name.toLowerCase() + ":" + bsdataUnit.faction_id;
        const unit = unitByNameFaction.get(key);
        if (!unit) continue;

        if (bsdataUnit.tiers.length > 0) {
          for (const tier of bsdataUnit.tiers) {
            const pointsKey = unit.id + ":" + tier.modelCount;
            if (!seenPoints.has(pointsKey)) {
              seenPoints.add(pointsKey);
              points.push({ unit_id: unit.id, model_count: tier.modelCount, points: tier.points });
            }
          }
        } else {
          const basePoints = parseInt(bsdataUnit.points, 10);
          if (basePoints > 0 && unit.base_points === null) {
            unit.base_points = basePoints;
          }
        }
      }
    }

    const bsdataModelCounts = parseBsdataModelCounts(catFiles);
    const seenComposition = new Set<string>();
    for (const mc of bsdataModelCounts) {
      let unit: UdbUnitRow | undefined;
      if (mc.faction_id) {
        unit = unitByNameFaction.get(mc.unit_name.toLowerCase() + ":" + mc.faction_id);
      }
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
  }

  // Remove empty factions
  const unitsPerFaction = new Map<string, number>();
  for (const unit of units) {
    unitsPerFaction.set(unit.faction_id, (unitsPerFaction.get(unit.faction_id) ?? 0) + 1);
  }
  const emptyIds = new Set(
    factions.filter((f) => !unitsPerFaction.has(f.id) || unitsPerFaction.get(f.id)! === 0).map((f) => f.id)
  );
  const filteredFactions = factions.filter((f) => !emptyIds.has(f.id));

  // Derive version from content hash
  const crypto = await import("node:crypto");
  const contentSeed = `${filteredFactions.length}-${units.length}-${weapons.length}-${points.length}-${new Date().toISOString().slice(0, 10)}`;
  const hash = crypto.createHash("sha256").update(contentSeed).digest("hex").slice(0, 8);
  const buildVersion = `1.0.0+${hash}`;

  return {
    version: buildVersion,
    built_at: new Date().toISOString(),
    game_system: "40k-10th",
    unit_count: units.length,
    faction_count: filteredFactions.length,
    factions: filteredFactions,
    units,
    models,
    weapons,
    abilities,
    keywords,
    points,
    composition,
  };
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------
function computeDiff(oldDb: UnitDatabaseJson, newDb: UnitDatabaseJson): DiffReport {
  const report: DiffReport = {
    newUnits: [],
    removedUnits: [],
    pointsChanges: [],
    abilityChanges: [],
    keywordChanges: [],
  };

  // Build unit maps by id
  const oldUnits = new Map(oldDb.units.map((u) => [u.id, u]));
  const newUnits = new Map(newDb.units.map((u) => [u.id, u]));

  // New units
  for (const [id, unit] of newUnits) {
    if (!oldUnits.has(id)) {
      report.newUnits.push({ id, name: unit.name, faction_id: unit.faction_id });
    }
  }

  // Removed units
  for (const [id, unit] of oldUnits) {
    if (!newUnits.has(id)) {
      report.removedUnits.push({ id, name: unit.name, faction_id: unit.faction_id });
    }
  }

  // Points changes: compare base_points + tiers
  const oldPointsMap = new Map<string, UdbUnitPointsRow[]>();
  for (const p of oldDb.points) {
    const arr = oldPointsMap.get(p.unit_id) ?? [];
    arr.push(p);
    oldPointsMap.set(p.unit_id, arr);
  }
  const newPointsMap = new Map<string, UdbUnitPointsRow[]>();
  for (const p of newDb.points) {
    const arr = newPointsMap.get(p.unit_id) ?? [];
    arr.push(p);
    newPointsMap.set(p.unit_id, arr);
  }

  for (const [id, unit] of newUnits) {
    const oldUnit = oldUnits.get(id);
    if (!oldUnit) continue; // new unit, already tracked

    const oldTiers = (oldPointsMap.get(id) ?? []).sort((a, b) => a.model_count - b.model_count);
    const newTiers = (newPointsMap.get(id) ?? []).sort((a, b) => a.model_count - b.model_count);
    const oldTiersStr = JSON.stringify(oldTiers.map((t) => `${t.model_count}:${t.points}`));
    const newTiersStr = JSON.stringify(newTiers.map((t) => `${t.model_count}:${t.points}`));

    const oldBase = oldUnit.base_points;
    const newBase = unit.base_points;

    if (oldTiersStr !== newTiersStr || oldBase !== newBase) {
      const formatPts = (base: number | null, tiers: UdbUnitPointsRow[]) => {
        const parts: string[] = [];
        if (base !== null) parts.push(`base:${base}`);
        for (const t of tiers) parts.push(`${t.model_count}m:${t.points}pts`);
        return parts.length > 0 ? parts.join(", ") : "none";
      };
      report.pointsChanges.push({
        id,
        name: unit.name,
        faction_id: unit.faction_id,
        oldPoints: formatPts(oldBase, oldTiers),
        newPoints: formatPts(newBase, newTiers),
      });
    }
  }

  // Ability changes
  const oldAbilitiesMap = new Map<string, string[]>();
  for (const a of oldDb.abilities) {
    const arr = oldAbilitiesMap.get(a.unit_id) ?? [];
    arr.push(a.name);
    oldAbilitiesMap.set(a.unit_id, arr);
  }
  const newAbilitiesMap = new Map<string, string[]>();
  for (const a of newDb.abilities) {
    const arr = newAbilitiesMap.get(a.unit_id) ?? [];
    arr.push(a.name);
    newAbilitiesMap.set(a.unit_id, arr);
  }

  for (const [id, unit] of newUnits) {
    if (!oldUnits.has(id)) continue;
    const oldAbilities = new Set(oldAbilitiesMap.get(id) ?? []);
    const newAbilities = new Set(newAbilitiesMap.get(id) ?? []);

    const added = [...newAbilities].filter((a) => !oldAbilities.has(a));
    const removed = [...oldAbilities].filter((a) => !newAbilities.has(a));

    if (added.length > 0 || removed.length > 0) {
      report.abilityChanges.push({ id, name: unit.name, faction_id: unit.faction_id, added, removed });
    }
  }

  // Keyword changes
  const oldKeywordsMap = new Map<string, string[]>();
  for (const k of oldDb.keywords) {
    const arr = oldKeywordsMap.get(k.unit_id) ?? [];
    arr.push(k.keyword);
    oldKeywordsMap.set(k.unit_id, arr);
  }
  const newKeywordsMap = new Map<string, string[]>();
  for (const k of newDb.keywords) {
    const arr = newKeywordsMap.get(k.unit_id) ?? [];
    arr.push(k.keyword);
    newKeywordsMap.set(k.unit_id, arr);
  }

  for (const [id, unit] of newUnits) {
    if (!oldUnits.has(id)) continue;
    const oldKws = new Set((oldKeywordsMap.get(id) ?? []).sort());
    const newKws = new Set((newKeywordsMap.get(id) ?? []).sort());

    const added = [...newKws].filter((k) => !oldKws.has(k));
    const removed = [...oldKws].filter((k) => !newKws.has(k));

    if (added.length > 0 || removed.length > 0) {
      report.keywordChanges.push({ id, name: unit.name, faction_id: unit.faction_id, added, removed });
    }
  }

  return report;
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------
function formatReport(report: DiffReport, oldDb: UnitDatabaseJson, newDb: UnitDatabaseJson): string {
  const lines: string[] = [];

  lines.push("# Unit Database Update Report");
  lines.push("");
  lines.push(`Old version: ${oldDb.version} (built ${oldDb.built_at})`);
  lines.push(`New version: ${newDb.version} (built ${newDb.built_at})`);
  lines.push("");
  lines.push(`Units: ${oldDb.unit_count} -> ${newDb.unit_count}`);
  lines.push(`Factions: ${oldDb.faction_count} -> ${newDb.faction_count}`);
  lines.push("");

  const totalChanges =
    report.newUnits.length +
    report.removedUnits.length +
    report.pointsChanges.length +
    report.abilityChanges.length +
    report.keywordChanges.length;

  if (totalChanges === 0) {
    lines.push("No changes detected.");
    return lines.join("\n");
  }

  lines.push(`Total changes: ${totalChanges}`);
  lines.push("");

  if (report.newUnits.length > 0) {
    lines.push("## New Units");
    lines.push("");
    lines.push("| Faction | Unit Name | ID |");
    lines.push("|---------|-----------|-----|");
    for (const u of report.newUnits) {
      lines.push(`| ${u.faction_id} | ${u.name} | ${u.id} |`);
    }
    lines.push("");
  }

  if (report.removedUnits.length > 0) {
    lines.push("## Removed Units");
    lines.push("");
    lines.push("| Faction | Unit Name | ID |");
    lines.push("|---------|-----------|-----|");
    for (const u of report.removedUnits) {
      lines.push(`| ${u.faction_id} | ${u.name} | ${u.id} |`);
    }
    lines.push("");
  }

  if (report.pointsChanges.length > 0) {
    lines.push("## Points Changes");
    lines.push("");
    lines.push("| Faction | Unit Name | Old Points | New Points |");
    lines.push("|---------|-----------|------------|------------|");
    for (const c of report.pointsChanges) {
      lines.push(`| ${c.faction_id} | ${c.name} | ${c.oldPoints} | ${c.newPoints} |`);
    }
    lines.push("");
  }

  if (report.abilityChanges.length > 0) {
    lines.push("## Ability Changes");
    lines.push("");
    lines.push("| Faction | Unit Name | Added | Removed |");
    lines.push("|---------|-----------|-------|---------|");
    for (const c of report.abilityChanges) {
      lines.push(`| ${c.faction_id} | ${c.name} | ${c.added.join(", ") || "-"} | ${c.removed.join(", ") || "-"} |`);
    }
    lines.push("");
  }

  if (report.keywordChanges.length > 0) {
    lines.push("## Keyword Changes");
    lines.push("");
    lines.push("| Faction | Unit Name | Added | Removed |");
    lines.push("|---------|-----------|-------|---------|");
    for (const c of report.keywordChanges) {
      lines.push(`| ${c.faction_id} | ${c.name} | ${c.added.join(", ") || "-"} | ${c.removed.join(", ") || "-"} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const writeMode = process.argv.includes("--write");

  console.log("=== HobbyForge Unit Database Updater ===");
  console.log("Mode: " + (writeMode ? "WRITE (will update unit_database.json)" : "DRY RUN (read-only)"));
  console.log("");

  // 1. Read old database
  if (!existsSync(OUTPUT_PATH)) {
    console.error("ERROR: No existing unit_database.json found at: " + OUTPUT_PATH);
    console.error("Run `node --experimental-strip-types scripts/build-unit-db.ts` first.");
    process.exit(1);
  }

  console.log("Reading existing unit_database.json...");
  const oldDb: UnitDatabaseJson = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
  console.log(`  Old version: ${oldDb.version} (${oldDb.unit_count} units, ${oldDb.faction_count} factions)`);
  console.log("");

  // 2. Re-run build pipeline
  console.log("Re-running build pipeline from source data...");
  const newDb = await buildUnitDatabase();
  console.log(`  New version: ${newDb.version} (${newDb.unit_count} units, ${newDb.faction_count} factions)`);
  console.log("");

  // 3. Compare
  console.log("Computing diff...");
  const diff = computeDiff(oldDb, newDb);
  console.log("");

  // 4. Print report
  const report = formatReport(diff, oldDb, newDb);
  console.log(report);

  // 5. Optionally write
  if (writeMode) {
    const totalChanges =
      diff.newUnits.length +
      diff.removedUnits.length +
      diff.pointsChanges.length +
      diff.abilityChanges.length +
      diff.keywordChanges.length;

    if (totalChanges === 0) {
      console.log("No changes to write.");
    } else {
      if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      writeFileSync(OUTPUT_PATH, JSON.stringify(newDb, null, 2), "utf-8");
      const fileSizeKb = (readFileSync(OUTPUT_PATH).length / 1024).toFixed(1);
      console.log("Written: " + OUTPUT_PATH);
      console.log("File size: " + fileSizeKb + " KB");
    }
  } else {
    console.log("Dry run complete. Use --write to apply changes.");
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
