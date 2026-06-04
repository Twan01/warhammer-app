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
  UnitDatabaseJson,
} from "./lib/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

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
// Data directory paths
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
// Build pipeline (reuses shared lib)
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
  const factionsRaw = readCsvFile(DATA_DIR, "Factions.csv");
  const factions: UdbFactionRow[] = factionsRaw
    .filter((row) => row["id"] && row["name"])
    .map((row) => ({
      id: row["id"].trim(),
      name: row["name"].trim(),
      short_name: row["short_name"]?.trim() ?? row["id"].trim(),
      name_fr: null,
    }));
  const factionIds = new Set(factions.map((f) => f.id));

  // Parse units
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
      base_points: null,
      damaged_w: row["damaged_w"]?.trim() ?? "",
      damaged_desc: row["damaged_description"]?.trim() ?? "",
      sub_faction: null,
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

  const unitByNameFaction = new Map<string, UdbUnitRow>();
  for (const unit of units) {
    unitByNameFaction.set(unit.name.toLowerCase() + ":" + unit.faction_id, unit);
  }

  // Parse models
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

  // Parse weapons
  const wargearRaw = readCsvFile(DATA_DIR, "Datasheets_wargear.csv");
  const weapons: UdbUnitWeaponRow[] = [];
  for (const row of wargearRaw) {
    const unitId = row["datasheet_id"]?.trim();
    if (!unitId || !validUnitIds.has(unitId)) continue;
    const mapped = mapWeaponRow(row);
    weapons.push({ ...mapped, name_fr: null });
  }

  // Parse abilities
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

  // Parse keywords
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

  // 8. Parse Datasheets_models_cost.csv for points and composition (D-01, D-02, D-03)
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

  for (const [unitId, tiers] of costByUnit) {
    const unit = units.find(u => u.id === unitId);
    if (!unit) continue;

    if (tiers.length === 1) {
      // Single-tier: set base_points directly (D-03)
      if (unit.base_points === null) {
        unit.base_points = tiers[0].cost;
      }
    } else {
      // Multi-tier: create one UdbUnitPointsRow per tier (D-02)
      for (const tier of tiers) {
        const modelCount = extractModelCount(tier.description, tier.line);
        points.push({ unit_id: unitId, model_count: modelCount, points: tier.cost });
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

  // 8b. Assign sub-factions from keywords (D-10)
  const subFactionValues = new Set(Object.values(SUB_FACTION_MAP));
  const unitById = new Map(units.map(u => [u.id, u]));

  for (const kw of keywords) {
    if (subFactionValues.has(kw.keyword)) {
      const unit = unitById.get(kw.unit_id);
      if (unit && unit.sub_faction === null) {
        unit.sub_faction = kw.keyword;
      }
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

  // Derive version from content hash so re-imports detect any data change
  const crypto = await import("node:crypto");
  const hash = crypto.createHash("sha256").update(JSON.stringify({ factions: filteredFactions, units, weapons, points, abilities, keywords, composition })).digest("hex").slice(0, 8);
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
