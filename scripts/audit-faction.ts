/**
 * Faction data audit script: compares unit_database.json against Wahapedia CSV
 * source data for a single faction (or all 25), producing a structured error report.
 *
 * Usage:
 *   node --experimental-strip-types scripts/audit-faction.ts SM
 *   node --experimental-strip-types scripts/audit-faction.ts --all
 *   node --experimental-strip-types scripts/audit-faction.ts SM --output-dir=/path/to/reports
 *
 * Output:
 *   .planning/phases/139-data-quality-at-scale/reports/{faction}-audit.json
 *   .planning/phases/139-data-quality-at-scale/reports/{faction}-audit.md
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { readCsvFile } from "./lib/parseCsv.ts";
import type {
  UnitDatabaseJson,
  CoverageReport,
  UdbUnitRow,
  UdbUnitModelRow,
  UdbUnitWeaponRow,
  UdbUnitAbilityRow,
  UdbUnitKeywordRow,
} from "./lib/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditError {
  unit_id: string;
  unit_name: string;
  field: string;
  expected: string;
  actual: string;
  source: "wahapedia_csv" | "translations_fr";
  severity: "error" | "missing" | "extra";
}

interface SystematicIssue {
  field: string;
  description: string;
  affected_count: number;
}

interface UnmatchedClassification {
  unit_name: string;
  faction_id: string;
  category: "legends" | "forge_world" | "missing_alias" | "genuinely_missing";
  evidence: string;
}

interface FactionAuditReport {
  faction_id: string;
  faction_name: string;
  audited_at: string;
  systematic_issues: SystematicIssue[];
  unit_errors: AuditError[];
  unmatched_classifications: UnmatchedClassification[];
  translation_gaps: {
    units_missing: number;
    weapons_missing: number;
    abilities_missing: number;
  };
  summary: {
    total_matched: number;
    total_unmatched: number;
    total_errors: number;
    errors_by_field: Record<string, number>;
    errors_by_severity: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Known Forge World / Legends patterns
// ---------------------------------------------------------------------------

/** Units with these exact name suffixes or patterns are Legends datasheets */
const LEGENDS_PATTERNS = [
  /\(legendary\)$/i,
];

/**
 * Known Forge World unit names (appear across multiple factions).
 * These units are from Imperial Armour / Forge World ranges.
 */
const FORGE_WORLD_NAMES = new Set([
  // Vehicles & Flyers (shared across SM, DG, CSM, WE, etc.)
  "Fire Raptor Gunship",
  "Spartan",
  "Mastodon",
  "Leviathan Dreadnought",
  "Deredeo Dreadnought",
  "Relic Contemptor Dreadnought",
  "Fellblade",
  "Falchion",
  "Cerberus",
  "Typhon",
  "Kratos",
  "Sicaran Battle Tank",
  "Sicaran Venator",
  "Sicaran Punisher",
  "Sicaran Arcus",
  "Sicaran Omega",
  "Whirlwind Scorpius",
  "Xiphon Interceptor",
  "Rapier Carrier",
  "Storm Eagle Gunship",
  "Sokar-pattern Stormbird",
  "Terrax-pattern Termite",
  "Land Raider Achilles",
  "Land Raider Proteus",
  "Deimos Predator",
  "Thunderhawk Transporter",
  "Caestus Assault Ram",
  "Land Raider Excelsior",
  "Land Raider Helios",
  "Land Raider Prometheus",
  "Javelin Attack Speeder",
  "Relic Terminator Squad",
  "Mortis Dreadnought",
  "Dreadnought Drop Pod",
  "Deathstorm Drop Pod",
  "Vindicator Laser Destroyer",
  "Land Speeder Tempest",
  "Relic Razorback",
  "Terminus Ultra",
  // SM-specific FW
  "Chaplain Venerable Dreadnought",
  "Tarantula Sentry Battery",
  "Tarantula Air Defence Battery",
  "Carab Culln The Risen",
  // NEC FW
  "Canoptek Tomb Stalker",
  "Canoptek Tomb Sentinel",
  "Canoptek Acanthrites",
  "Night Shroud",
  "Sentry Pylon",
  "Tesseract Ark",
  "Gauss Pylon",
  // DG / Chaos FW
  "Greater Blight Drone",
  "Hell Blade",
  "Hell Talon",
  "Chaos Thunderhawk",
  "Blood Slaughterer",
  "Greater Brass Scorpion",
  "Kytan Ravager",
]);

/**
 * Known shared Chaos vehicles that exist under CSM but Wahapedia
 * lists under each Chaos faction separately.
 */
const SHARED_CHAOS_VEHICLES = new Set([
  "Spartan",
  "Mastodon",
  "Fellblade",
  "Falchion",
  "Cerberus",
  "Typhon",
  "Kratos",
  "Sicaran Battle Tank",
  "Sicaran Venator",
  "Sicaran Punisher",
  "Whirlwind Scorpius",
  "Xiphon Interceptor",
  "Rapier Carrier",
  "Storm Eagle Gunship",
  "Sokar-pattern Stormbird",
  "Terrax-pattern Termite",
  "Land Raider Achilles",
  "Land Raider Proteus",
  "Fire Raptor Gunship",
  "Deredeo Dreadnought",
  "Leviathan Dreadnought",
  "Relic Contemptor Dreadnought",
]);

// ---------------------------------------------------------------------------
// FACTION_NAMES for human-readable reports (all 25 factions)
// ---------------------------------------------------------------------------

const FACTION_NAMES: Record<string, string> = {
  SM: "Space Marines",
  NEC: "Necrons",
  DG: "Death Guard",
  AC: "Adeptus Custodes",
  AdM: "Adeptus Mechanicus",
  AE: "Aeldari",
  AM: "Astra Militarum",
  AoI: "Agents of the Imperium",
  AS: "Adepta Sororitas",
  CD: "Chaos Daemons",
  CSM: "Chaos Space Marines",
  DRU: "Drukhari",
  EC: "Emperor's Children",
  GC: "Genestealer Cults",
  GK: "Grey Knights",
  LoV: "Leagues of Votann",
  ORK: "Orks",
  QI: "Imperial Knights",
  QT: "Chaos Knights",
  TAU: "T'au Empire",
  TL: "The Legion of the Damned",
  TS: "Thousand Sons",
  TYR: "Tyranids",
  UN: "Unaligned",
  WE: "World Eaters",
};

// ---------------------------------------------------------------------------
// Per-faction audit logic
// ---------------------------------------------------------------------------

function auditFaction(
  factionId: string,
  udb: UnitDatabaseJson,
  coverage: CoverageReport,
  DATA_DIR: string,
  REPORTS_DIR: string,
): void {
  const factionName = FACTION_NAMES[factionId] ?? factionId;
  console.log(`\n=== Auditing ${factionName} (${factionId}) ===\n`);

  // Load CSV data
  const datasheets = readCsvFile(DATA_DIR, "Datasheets.csv");
  const csvModels = readCsvFile(DATA_DIR, "Datasheets_models.csv");
  const csvWargear = readCsvFile(DATA_DIR, "Datasheets_wargear.csv");
  const csvAbilities = readCsvFile(DATA_DIR, "Datasheets_abilities.csv");
  const csvKeywords = readCsvFile(DATA_DIR, "Datasheets_keywords.csv");

  // Filter to target faction
  const factionUnits = udb.units.filter((u) => u.faction_id === factionId);
  const factionUnitIds = new Set(factionUnits.map((u) => u.id));

  // Build CSV lookup maps (by datasheet_id)
  const csvDatasheetMap = new Map<string, Record<string, string>>();
  for (const row of datasheets) {
    if (row["faction_id"]?.trim() === factionId) {
      csvDatasheetMap.set(row["id"]?.trim() ?? "", row);
    }
  }

  // Also build a name -> CSV row map for unmatched classification
  const csvNameMap = new Map<string, Record<string, string>>();
  for (const [_id, row] of csvDatasheetMap) {
    const name = row["name"]?.trim();
    if (name) csvNameMap.set(name.toLowerCase(), row);
  }

  const csvModelsByUnit = groupBy(csvModels, "datasheet_id");
  const csvWargearByUnit = groupBy(csvWargear, "datasheet_id");
  const csvAbilitiesByUnit = groupBy(csvAbilities, "datasheet_id");
  const csvKeywordsByUnit = groupBy(csvKeywords, "datasheet_id");

  // DB data by unit
  const dbModelsByUnit = groupByField(udb.models.filter((m) => factionUnitIds.has(m.unit_id)), "unit_id");
  const dbWeaponsByUnit = groupByField(udb.weapons.filter((w) => factionUnitIds.has(w.unit_id)), "unit_id");
  const dbAbilitiesByUnit = groupByField(udb.abilities.filter((a) => factionUnitIds.has(a.unit_id)), "unit_id");
  const dbKeywordsByUnit = groupByField(udb.keywords.filter((k) => factionUnitIds.has(k.unit_id)), "unit_id");

  // Coverage data
  const factionCoverage = coverage.factions.find((f) => f.faction_id === factionId);
  const unmatchedNames = factionCoverage?.unmatched_names ?? [];

  // ---------------------------------------------------------------------------
  // Step 1: Detect systematic pipeline issues
  // ---------------------------------------------------------------------------
  console.log("Checking for systematic pipeline issues...");
  const systematicIssues: SystematicIssue[] = [];

  // Check weapon range: all empty means parsing bug (row["Range"] vs row["range"])
  const factionWeapons = udb.weapons.filter((w) => factionUnitIds.has(w.unit_id));
  const weaponsWithRange = factionWeapons.filter((w) => w.range !== "");
  const csvWeaponsWithRange = csvWargear
    .filter((r) => factionUnitIds.has(r["datasheet_id"]?.trim() ?? ""))
    .filter((r) => (r["range"]?.trim() ?? "") !== "");

  if (weaponsWithRange.length === 0 && csvWeaponsWithRange.length > 0) {
    systematicIssues.push({
      field: "weapon.range",
      description: `All ${factionWeapons.length} weapons have empty range in DB, but ${csvWeaponsWithRange.length} CSV rows have range data. Pipeline bug: reads row["Range"] but CSV header is "range" (lowercase).`,
      affected_count: factionWeapons.length,
    });
  }

  // Check weapon keywords: all empty means parsing bug (row["keywords"] vs row["description"])
  const weaponsWithKeywords = factionWeapons.filter((w) => w.keywords !== "");
  const csvWeaponsWithKeywords = csvWargear
    .filter((r) => factionUnitIds.has(r["datasheet_id"]?.trim() ?? ""))
    .filter((r) => (r["description"]?.trim() ?? "") !== "");

  if (weaponsWithKeywords.length === 0 && csvWeaponsWithKeywords.length > 0) {
    systematicIssues.push({
      field: "weapon.keywords",
      description: `All ${factionWeapons.length} weapons have empty keywords in DB, but ${csvWeaponsWithKeywords.length} CSV rows have keyword/special rules data. Pipeline bug: reads row["keywords"] but CSV field is "description".`,
      affected_count: factionWeapons.length,
    });
  }

  // Track which fields are systematic bugs (skip in per-unit audit)
  const systematicFields = new Set(systematicIssues.map((i) => i.field));

  console.log(`  Found ${systematicIssues.length} systematic issues`);

  // ---------------------------------------------------------------------------
  // Step 2: Per-unit field-by-field comparison (matched units only)
  // ---------------------------------------------------------------------------
  console.log("Auditing matched units field-by-field...");
  const unitErrors: AuditError[] = [];
  let matchedCount = 0;

  for (const unit of factionUnits) {
    const csvRow = csvDatasheetMap.get(unit.id);
    if (!csvRow) continue; // Unit ID not found in CSV (should not happen for faction-filtered units)
    matchedCount++;

    // 2a. Role comparison
    const csvRole = csvRow["role"]?.trim() ?? "";
    if (csvRole !== unit.role && csvRole !== "") {
      unitErrors.push({
        unit_id: unit.id,
        unit_name: unit.name,
        field: "role",
        expected: csvRole,
        actual: unit.role,
        source: "wahapedia_csv",
        severity: unit.role === "" ? "missing" : "error",
      });
    }

    // 2b. Model stats comparison
    const dbModels = dbModelsByUnit.get(unit.id) ?? [];
    const csvUnitModels = csvModelsByUnit.get(unit.id) ?? [];

    for (const dbModel of dbModels) {
      const csvModel = csvUnitModels.find(
        (r) => (r["datasheet_id"]?.trim() ?? "") === unit.id &&
               parseInt(r["line"]?.trim() ?? "0", 10) === dbModel.line_order
      );
      if (!csvModel) continue;

      const statFields: Array<{ dbField: keyof UdbUnitModelRow; csvField: string }> = [
        { dbField: "M", csvField: "M" },
        { dbField: "T", csvField: "T" },
        { dbField: "Sv", csvField: "Sv" },
        { dbField: "inv_sv", csvField: "inv_sv" },
        { dbField: "W", csvField: "W" },
        { dbField: "Ld", csvField: "Ld" },
        { dbField: "OC", csvField: "OC" },
      ];

      for (const { dbField, csvField } of statFields) {
        const csvVal = csvModel[csvField]?.trim() ?? "";
        const dbVal = String(dbModel[dbField] ?? "");
        if (csvVal !== dbVal && csvVal !== "") {
          unitErrors.push({
            unit_id: unit.id,
            unit_name: unit.name,
            field: `model.${dbField}`,
            expected: csvVal,
            actual: dbVal,
            source: "wahapedia_csv",
            severity: dbVal === "" ? "missing" : "error",
          });
        }
      }
    }

    // 2c. Weapon comparison (skip systematic fields)
    const dbWeapons = dbWeaponsByUnit.get(unit.id) ?? [];
    const csvUnitWargear = csvWargearByUnit.get(unit.id) ?? [];

    for (const dbWeapon of dbWeapons) {
      // Match by (line + line_in_wargear + name) to avoid false positives when
      // a "line=N" option-group weapon collides by position with a DB weapon
      // that has a different name (e.g. Fellblade crew Combi-weapon vs vehicle
      // main weapons, or Bolt pistol option-group vs always-available weapons).
      // Position match requires name agreement; only then fall back to:
      //   (a) name + category match (handles duplicate names like "Corrupted stave"
      //       with both Melee and Ranged versions — picks the correct one by type),
      //   (b) name-only match (legacy fallback for unique weapon names).
      const csvWeapon = csvUnitWargear.find(
        (r) =>
          parseInt(r["line"]?.trim() ?? "0", 10) === dbWeapon.weapon_group &&
          parseInt(r["line_in_wargear"]?.trim() ?? "0", 10) === dbWeapon.line_order &&
          (r["name"]?.trim() ?? "").toLowerCase() === dbWeapon.name.toLowerCase()
      ) ?? csvUnitWargear.find(
        (r) =>
          (r["name"]?.trim() ?? "").toLowerCase() === dbWeapon.name.toLowerCase() &&
          (r["type"]?.trim() ?? "").toLowerCase() === dbWeapon.category.toLowerCase()
      ) ?? csvUnitWargear.find(
        (r) => (r["name"]?.trim() ?? "").toLowerCase() === dbWeapon.name.toLowerCase()
      );
      if (!csvWeapon) continue;

      const weaponFields: Array<{ field: string; csvCol: string; dbVal: string }> = [
        { field: "weapon.category", csvCol: "type", dbVal: dbWeapon.category },
        { field: "weapon.attacks", csvCol: "A", dbVal: dbWeapon.attacks },
        { field: "weapon.skill", csvCol: "BS_WS", dbVal: dbWeapon.skill },
        { field: "weapon.strength", csvCol: "S", dbVal: dbWeapon.strength },
        { field: "weapon.ap", csvCol: "AP", dbVal: dbWeapon.ap },
        { field: "weapon.damage", csvCol: "D", dbVal: dbWeapon.damage },
      ];

      // Only add range and keywords if NOT systematic
      if (!systematicFields.has("weapon.range")) {
        weaponFields.push({ field: "weapon.range", csvCol: "range", dbVal: dbWeapon.range });
      }
      if (!systematicFields.has("weapon.keywords")) {
        weaponFields.push({ field: "weapon.keywords", csvCol: "description", dbVal: dbWeapon.keywords });
      }

      for (const { field, csvCol, dbVal } of weaponFields) {
        const csvVal = csvWeapon[csvCol]?.trim() ?? "";
        if (csvVal !== dbVal && csvVal !== "") {
          unitErrors.push({
            unit_id: unit.id,
            unit_name: unit.name,
            field,
            expected: csvVal,
            actual: dbVal,
            source: "wahapedia_csv",
            severity: dbVal === "" ? "missing" : "error",
          });
        }
      }
    }

    // 2d. Abilities comparison (skip Core/Faction placeholders per Pitfall 2)
    const dbAbilities = dbAbilitiesByUnit.get(unit.id) ?? [];
    const csvUnitAbilities = csvAbilitiesByUnit.get(unit.id) ?? [];

    for (const dbAbility of dbAbilities) {
      // Skip empty Core/Faction ability_id references (Pitfall 2)
      if ((dbAbility.ability_type === "Core" || dbAbility.ability_type === "Faction") && dbAbility.name === "") {
        continue;
      }

      const csvAbility = csvUnitAbilities.find(
        (r) =>
          (r["datasheet_id"]?.trim() ?? "") === unit.id &&
          parseInt(r["line"]?.trim() ?? "0", 10) === dbAbility.line_order
      );
      if (!csvAbility) continue;

      // Skip if CSV row is a Core/Faction ability_id reference (empty name is expected)
      const csvType = csvAbility["type"]?.trim() ?? "";
      if ((csvType === "Core" || csvType === "Faction") && (csvAbility["name"]?.trim() ?? "") === "") {
        continue;
      }

      const abilityFields: Array<{ field: string; csvCol: string; dbVal: string }> = [
        { field: "ability.name", csvCol: "name", dbVal: dbAbility.name },
        { field: "ability.description", csvCol: "description", dbVal: dbAbility.description },
        { field: "ability.type", csvCol: "type", dbVal: dbAbility.ability_type },
      ];

      for (const { field, csvCol, dbVal } of abilityFields) {
        const csvVal = csvAbility[csvCol]?.trim() ?? "";
        if (csvVal !== dbVal && csvVal !== "") {
          unitErrors.push({
            unit_id: unit.id,
            unit_name: unit.name,
            field,
            expected: csvVal,
            actual: dbVal,
            source: "wahapedia_csv",
            severity: dbVal === "" ? "missing" : "error",
          });
        }
      }
    }

    // 2e. Keywords comparison
    const dbKws = dbKeywordsByUnit.get(unit.id) ?? [];
    const csvUnitKeywords = csvKeywordsByUnit.get(unit.id) ?? [];

    for (const dbKw of dbKws) {
      const csvKw = csvUnitKeywords.find(
        (r) =>
          (r["datasheet_id"]?.trim() ?? "") === unit.id &&
          (r["keyword"]?.trim() ?? "") === dbKw.keyword
      );
      if (!csvKw) continue;

      const csvIsFaction = csvKw["is_faction_keyword"]?.trim() === "1" ? 1 : 0;
      if (csvIsFaction !== dbKw.is_faction) {
        unitErrors.push({
          unit_id: unit.id,
          unit_name: unit.name,
          field: "keyword.is_faction",
          expected: String(csvIsFaction),
          actual: String(dbKw.is_faction),
          source: "wahapedia_csv",
          severity: "error",
        });
      }
    }
  }

  console.log(`  Audited ${matchedCount} matched units, found ${unitErrors.length} per-unit errors`);

  // ---------------------------------------------------------------------------
  // Step 3: Unmatched unit classification
  // ---------------------------------------------------------------------------
  console.log("Classifying unmatched units...");
  const unmatchedClassifications: UnmatchedClassification[] = [];

  for (const name of unmatchedNames) {
    const classification = classifyUnmatchedUnit(name, factionId, csvNameMap);
    unmatchedClassifications.push(classification);
  }

  const categoryCounts: Record<string, number> = {};
  for (const c of unmatchedClassifications) {
    categoryCounts[c.category] = (categoryCounts[c.category] ?? 0) + 1;
  }
  console.log(`  Classified ${unmatchedClassifications.length} unmatched units:`, categoryCounts);

  // ---------------------------------------------------------------------------
  // Step 4: Translation gaps
  // ---------------------------------------------------------------------------
  console.log("Computing translation gaps...");
  const unitsMissingFr = factionUnits.filter((u) => !u.name_fr || u.name_fr === "").length;
  const weaponsMissingFr = factionWeapons.filter((w) => !w.name_fr || w.name_fr === "").length;
  const factionAbilities = udb.abilities.filter((a) => factionUnitIds.has(a.unit_id));
  const abilitiesMissingFr = factionAbilities.filter(
    (a) => a.name !== "" && (!a.name_fr || a.name_fr === "")
  ).length;

  const translationGaps = {
    units_missing: unitsMissingFr,
    weapons_missing: weaponsMissingFr,
    abilities_missing: abilitiesMissingFr,
  };

  console.log(`  Translation gaps: ${unitsMissingFr} units, ${weaponsMissingFr} weapons, ${abilitiesMissingFr} abilities missing French`);

  // ---------------------------------------------------------------------------
  // Step 5: Build summary
  // ---------------------------------------------------------------------------
  const errorsByField: Record<string, number> = {};
  const errorsBySeverity: Record<string, number> = {};
  for (const err of unitErrors) {
    errorsByField[err.field] = (errorsByField[err.field] ?? 0) + 1;
    errorsBySeverity[err.severity] = (errorsBySeverity[err.severity] ?? 0) + 1;
  }

  const report: FactionAuditReport = {
    faction_id: factionId,
    faction_name: factionName,
    audited_at: new Date().toISOString(),
    systematic_issues: systematicIssues,
    unit_errors: unitErrors,
    unmatched_classifications: unmatchedClassifications,
    translation_gaps: translationGaps,
    summary: {
      total_matched: matchedCount,
      total_unmatched: unmatchedNames.length,
      total_errors: unitErrors.length,
      errors_by_field: errorsByField,
      errors_by_severity: errorsBySeverity,
    },
  };

  // ---------------------------------------------------------------------------
  // Step 6: Write reports
  // ---------------------------------------------------------------------------
  const jsonPath = join(REPORTS_DIR, `${factionId.toLowerCase()}-audit.json`);
  const mdPath = join(REPORTS_DIR, `${factionId.toLowerCase()}-audit.md`);

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nJSON report: ${jsonPath}`);

  const md = generateMarkdown(report);
  writeFileSync(mdPath, md, "utf-8");
  console.log(`Markdown report: ${mdPath}`);

  console.log(`\n=== Audit complete for ${factionName} ===`);
  console.log(`  Matched: ${matchedCount}, Unmatched: ${unmatchedNames.length}`);
  console.log(`  Per-unit errors: ${unitErrors.length}, Systematic issues: ${systematicIssues.length}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupBy(rows: Record<string, string>[], keyField: string): Map<string, Record<string, string>[]> {
  const map = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const key = row[keyField]?.trim() ?? "";
    if (!key) continue;
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(row);
  }
  return map;
}

function groupByField<T extends Record<string, unknown>>(items: T[], field: string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = String(item[field] ?? "");
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(item);
  }
  return map;
}

function classifyUnmatchedUnit(
  name: string,
  factionId: string,
  csvNameMap: Map<string, Record<string, string>>
): UnmatchedClassification {
  // Check Legends pattern
  for (const pattern of LEGENDS_PATTERNS) {
    if (pattern.test(name)) {
      return {
        unit_name: name,
        faction_id: factionId,
        category: "legends",
        evidence: `Name matches Legends pattern: ${pattern}`,
      };
    }
  }

  // Check Forge World known names
  if (FORGE_WORLD_NAMES.has(name)) {
    // For Chaos factions, also note if it's a shared vehicle
    if (["DG", "WE", "TS", "EC"].includes(factionId) && SHARED_CHAOS_VEHICLES.has(name)) {
      return {
        unit_name: name,
        faction_id: factionId,
        category: "forge_world",
        evidence: `Known FW/Heresy unit; shared Chaos vehicle (listed under CSM)`,
      };
    }
    return {
      unit_name: name,
      faction_id: factionId,
      category: "forge_world",
      evidence: `Known Forge World / Imperial Armour unit`,
    };
  }

  // Check if unit exists in Wahapedia CSV for this faction (missing alias)
  const csvRow = csvNameMap.get(name.toLowerCase());
  if (csvRow) {
    return {
      unit_name: name,
      faction_id: factionId,
      category: "missing_alias",
      evidence: `Unit exists in Wahapedia CSV (id: ${csvRow["id"]?.trim()}) but not matched in unit database.`,
    };
  }

  // Genuinely missing
  return {
    unit_name: name,
    faction_id: factionId,
    category: "genuinely_missing",
    evidence: `No matching CSV row found for this faction. May be a cross-faction unit.`,
  };
}

// ---------------------------------------------------------------------------
// Markdown report generation
// ---------------------------------------------------------------------------

function generateMarkdown(report: FactionAuditReport): string {
  const lines: string[] = [];

  lines.push(`# ${report.faction_name} (${report.faction_id}) Data Audit Report`);
  lines.push("");
  lines.push(`**Audited:** ${report.audited_at}`);
  lines.push(`**Matched units:** ${report.summary.total_matched}`);
  lines.push(`**Unmatched units:** ${report.summary.total_unmatched}`);
  lines.push(`**Per-unit errors:** ${report.summary.total_errors}`);
  lines.push(`**Systematic issues:** ${report.systematic_issues.length}`);
  lines.push("");

  // Systematic Issues
  lines.push("## Systematic Issues");
  lines.push("");
  if (report.systematic_issues.length === 0) {
    lines.push("None found.");
  } else {
    lines.push("| Field | Description | Affected Count |");
    lines.push("|-------|-------------|----------------|");
    for (const issue of report.systematic_issues) {
      lines.push(`| ${issue.field} | ${issue.description} | ${issue.affected_count} |`);
    }
  }
  lines.push("");

  // Error Summary
  lines.push("## Error Summary");
  lines.push("");
  if (report.summary.total_errors === 0) {
    lines.push("No per-unit errors found (excluding systematic issues).");
  } else {
    lines.push("### Errors by Field");
    lines.push("");
    lines.push("| Field | Count |");
    lines.push("|-------|-------|");
    const sortedFields = Object.entries(report.summary.errors_by_field).sort((a, b) => b[1] - a[1]);
    for (const [field, count] of sortedFields) {
      lines.push(`| ${field} | ${count} |`);
    }
    lines.push("");

    lines.push("### Errors by Severity");
    lines.push("");
    lines.push("| Severity | Count |");
    lines.push("|----------|-------|");
    for (const [severity, count] of Object.entries(report.summary.errors_by_severity)) {
      lines.push(`| ${severity} | ${count} |`);
    }
    lines.push("");

    // Top 20 per-unit errors
    lines.push("### Top 20 Per-Unit Errors (sample)");
    lines.push("");
    lines.push("| Unit | Field | Expected | Actual | Severity |");
    lines.push("|------|-------|----------|--------|----------|");
    const sorted = [...report.unit_errors].sort((a, b) => a.unit_name.localeCompare(b.unit_name));
    for (const err of sorted.slice(0, 20)) {
      const expected = truncate(err.expected, 60);
      const actual = truncate(err.actual, 60);
      lines.push(`| ${err.unit_name} | ${err.field} | ${expected} | ${actual} | ${err.severity} |`);
    }
  }
  lines.push("");

  // Unmatched Unit Classification
  lines.push("## Unmatched Unit Classification");
  lines.push("");
  if (report.unmatched_classifications.length === 0) {
    lines.push("No unmatched units.");
  } else {
    // Summary counts
    const cats: Record<string, number> = {};
    for (const c of report.unmatched_classifications) {
      cats[c.category] = (cats[c.category] ?? 0) + 1;
    }
    lines.push("### Summary");
    lines.push("");
    lines.push("| Category | Count |");
    lines.push("|----------|-------|");
    for (const [cat, count] of Object.entries(cats)) {
      lines.push(`| ${cat} | ${count} |`);
    }
    lines.push("");

    lines.push("### Details");
    lines.push("");
    lines.push("| Unit Name | Category | Evidence |");
    lines.push("|-----------|----------|----------|");
    for (const c of report.unmatched_classifications) {
      lines.push(`| ${c.unit_name} | ${c.category} | ${truncate(c.evidence, 80)} |`);
    }
  }
  lines.push("");

  // French Translation Gaps
  lines.push("## French Translation Gaps");
  lines.push("");
  lines.push("| Entity Type | Missing Count |");
  lines.push("|-------------|---------------|");
  lines.push(`| Units (name_fr) | ${report.translation_gaps.units_missing} |`);
  lines.push(`| Weapons (name_fr) | ${report.translation_gaps.weapons_missing} |`);
  lines.push(`| Abilities (name_fr) | ${report.translation_gaps.abilities_missing} |`);
  lines.push("");

  return lines.join("\n");
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  return s.slice(0, maxLen - 3).replace(/\|/g, "\\|").replace(/\n/g, " ") + "...";
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const DATA_DIR = join(__dirname, "data");
  const UDB_PATH = join(REPO_ROOT, "src-tauri", "data", "unit_database.json");
  const COVERAGE_PATH = join(DATA_DIR, "coverage-report.json");

  // Resolve output directory: --output-dir=<path> flag overrides default Phase 139 dir
  const outputDirArg = process.argv.find((a) => a.startsWith("--output-dir="))?.split("=")[1];
  const REPORTS_DIR = outputDirArg
    ? outputDirArg
    : join(REPO_ROOT, ".planning", "phases", "139-data-quality-at-scale", "reports");

  mkdirSync(REPORTS_DIR, { recursive: true });

  const udb: UnitDatabaseJson = JSON.parse(readFileSync(UDB_PATH, "utf-8"));
  const coverage: CoverageReport = JSON.parse(readFileSync(COVERAGE_PATH, "utf-8"));

  const arg = process.argv[2]?.toUpperCase();

  if (arg === "--ALL") {
    const factionIds = udb.factions.map((f) => f.id);
    console.log(`\nBatch audit: ${factionIds.length} factions`);
    for (const id of factionIds) {
      auditFaction(id, udb, coverage, DATA_DIR, REPORTS_DIR);
    }
    console.log(`\n=== Batch audit complete: ${factionIds.length} factions ===`);
    return;
  }

  // Single faction mode
  const knownFactionIds = new Set(udb.factions.map((f) => f.id));
  if (!arg || !knownFactionIds.has(arg)) {
    console.error(`Usage: node --experimental-strip-types scripts/audit-faction.ts <FACTION_ID|--all>`);
    console.error(`Known faction IDs: ${[...knownFactionIds].sort().join(", ")}`);
    process.exit(1);
  }

  auditFaction(arg, udb, coverage, DATA_DIR, REPORTS_DIR);
}

// Run
main();
