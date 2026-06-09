/**
 * Phase 119 — Stratagem & Enhancement CSV parsing tests.
 *
 * Tests the transformation logic used by build-unit-db.ts Steps 12 & 13:
 * - STR-01: Stratagems.csv parsed correctly, legends filtered, correct shape/count
 * - STR-02: Universal stratagems with empty faction_id/detachment_id -> null
 * - ENH-01: Enhancements.csv parsed correctly, legends filtered, rows without faction_id skipped
 *
 * Uses parseWahapediaCsv (the actual CSV parser) with synthetic pipe-delimited data,
 * then applies the same transformation logic as the build script.
 */

import { describe, it, expect } from "vitest";
import { parseWahapediaCsv } from "../../scripts/lib/parseCsv.ts";
import type { UdbStratagemRow, UdbEnhancementRow } from "../../scripts/lib/types.ts";

// ---------------------------------------------------------------------------
// Helpers: replicate the exact transformation logic from build-unit-db.ts
// ---------------------------------------------------------------------------

/**
 * Transform parsed CSV rows into UdbStratagemRow[], applying the same logic
 * as build-unit-db.ts Step 12.
 */
function transformStratagems(
  rows: Record<string, string>[]
): { stratagems: UdbStratagemRow[]; legendsSkipped: number } {
  const stratagems: UdbStratagemRow[] = [];
  let legendsSkipped = 0;

  for (const row of rows) {
    const id = row["id"]?.trim();
    const name = row["name"]?.trim();
    if (!id || !name) continue;

    const isLegend = row["legend"] === "1" || row["legend"] === "true";
    if (isLegend) {
      legendsSkipped++;
      continue;
    }

    stratagems.push({
      id,
      faction_id: row["faction_id"]?.trim() || null,
      detachment_id: row["detachment_id"]?.trim() || null,
      name,
      type: row["type"]?.trim() ?? "",
      cp_cost: parseInt(row["cp_cost"]?.trim() ?? "0", 10) || 0,
      turn: row["turn"]?.trim() ?? "",
      phase: row["phase"]?.trim() ?? "",
      description: row["description"]?.trim() ?? "",
    });
  }

  return { stratagems, legendsSkipped };
}

/**
 * Transform parsed CSV rows into UdbEnhancementRow[], applying the same logic
 * as build-unit-db.ts Step 13.
 */
function transformEnhancements(
  rows: Record<string, string>[]
): { enhancements: UdbEnhancementRow[]; legendsSkipped: number } {
  const enhancements: UdbEnhancementRow[] = [];
  let legendsSkipped = 0;

  for (const row of rows) {
    const id = row["id"]?.trim();
    const name = row["name"]?.trim();
    const faction_id = row["faction_id"]?.trim();
    if (!id || !name || !faction_id) continue;

    const isLegend = row["legend"] === "1" || row["legend"] === "true";
    if (isLegend) {
      legendsSkipped++;
      continue;
    }

    enhancements.push({
      id,
      faction_id,
      detachment_id: row["detachment_id"]?.trim() || null,
      name,
      cost: parseInt(row["cost"]?.trim() ?? "0", 10) || 0,
      description: row["description"]?.trim() ?? "",
    });
  }

  return { enhancements, legendsSkipped };
}

// ---------------------------------------------------------------------------
// STR-01: Stratagem CSV parsing
// ---------------------------------------------------------------------------

describe("STR-01: Stratagem CSV parsing", () => {
  const STRATAGEM_CSV = [
    "faction_id|name|id|type|cp_cost|legend|turn|phase|detachment|detachment_id|description",
    "SM|Honour the Chapter|str001|Battle Tactic Stratagem|1|0|Your turn|Fight phase|Gladius Task Force|det001|<b>WHEN:</b> Fight phase.",
    "SM|Legends Strat|str002|Epic Deed Stratagem|2|1|Either player's turn|Any phase|Gladius Task Force|det001|<b>Old strat</b>",
    "CSM|Dark Pact|str003|Battle Tactic Stratagem|1|0|Your turn|Shooting phase|Black Legion|det002|<b>Pact.</b>",
    "NEC|Protocol of Conquest|str004|Strategic Ploy Stratagem|1|true|Your turn|Command phase|Awakened Dynasty|det003|<b>Legend strat NEC</b>",
    "|Core Strat Universal|str005|Battle Tactic Stratagem|1|0|Either player's turn|Any phase||str_det_empty|<b>Universal</b>",
  ].join("\n");

  it("parses non-legend stratagems and excludes legends rows", () => {
    const rows = parseWahapediaCsv(STRATAGEM_CSV);
    const { stratagems, legendsSkipped } = transformStratagems(rows);

    // 5 data rows: 2 legends (str002 legend=1, str004 legend=true), 3 non-legend
    expect(legendsSkipped).toBe(2);
    expect(stratagems).toHaveLength(3);
  });

  it("produces correct shape for each stratagem row", () => {
    const rows = parseWahapediaCsv(STRATAGEM_CSV);
    const { stratagems } = transformStratagems(rows);

    const first = stratagems.find((s) => s.id === "str001");
    expect(first).toBeDefined();
    expect(first!.id).toBe("str001");
    expect(first!.faction_id).toBe("SM");
    expect(first!.detachment_id).toBe("det001");
    expect(first!.name).toBe("Honour the Chapter");
    expect(first!.type).toBe("Battle Tactic Stratagem");
    expect(first!.cp_cost).toBe(1);
    expect(first!.turn).toBe("Your turn");
    expect(first!.phase).toBe("Fight phase");
    expect(first!.description).toBe("<b>WHEN:</b> Fight phase.");
  });

  it("parses cp_cost as a number, not a string", () => {
    const rows = parseWahapediaCsv(STRATAGEM_CSV);
    const { stratagems } = transformStratagems(rows);

    for (const s of stratagems) {
      expect(typeof s.cp_cost).toBe("number");
    }
  });

  it("handles cp_cost of 0 for free stratagems", () => {
    const csv = [
      "faction_id|name|id|type|cp_cost|legend|turn|phase|detachment|detachment_id|description",
      "SM|Free Strat|str_free|Battle Tactic|0|0|Your turn|Any phase|Det|det1|desc",
    ].join("\n");
    const rows = parseWahapediaCsv(csv);
    const { stratagems } = transformStratagems(rows);

    expect(stratagems[0].cp_cost).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// STR-02: Universal stratagems — empty string FK -> null
// ---------------------------------------------------------------------------

describe("STR-02: Universal stratagems — empty faction_id/detachment_id to null", () => {
  it("converts empty string faction_id to null for universal stratagems", () => {
    const csv = [
      "faction_id|name|id|type|cp_cost|legend|turn|phase|detachment|detachment_id|description",
      "|Boarding Action Strat|str_universal|Battle Tactic|1|0|Either|Any||boarding_det_empty|<b>Universal</b>",
    ].join("\n");
    const rows = parseWahapediaCsv(csv);
    const { stratagems } = transformStratagems(rows);

    expect(stratagems).toHaveLength(1);
    expect(stratagems[0].faction_id).toBeNull();
  });

  it("converts empty string detachment_id to null for universal stratagems", () => {
    const csv = [
      "faction_id|name|id|type|cp_cost|legend|turn|phase|detachment|detachment_id|description",
      "|Universal Core|str_core|Battle Tactic|1|0|Either|Any|||<b>Core</b>",
    ].join("\n");
    const rows = parseWahapediaCsv(csv);
    const { stratagems } = transformStratagems(rows);

    expect(stratagems).toHaveLength(1);
    expect(stratagems[0].faction_id).toBeNull();
    expect(stratagems[0].detachment_id).toBeNull();
  });

  it("does NOT convert non-empty faction_id to null", () => {
    const csv = [
      "faction_id|name|id|type|cp_cost|legend|turn|phase|detachment|detachment_id|description",
      "SM|SM Strat|str_sm|Battle Tactic|1|0|Your turn|Fight|Gladius|det001|desc",
    ].join("\n");
    const rows = parseWahapediaCsv(csv);
    const { stratagems } = transformStratagems(rows);

    expect(stratagems[0].faction_id).toBe("SM");
    expect(stratagems[0].detachment_id).toBe("det001");
  });

  it("verifies actual unit_database.json has universal stratagems with null faction_id", () => {
    // This test reads the real built JSON to confirm the pipeline output
    const fs = require("node:fs");
    const path = require("node:path");
    const jsonPath = path.join(__dirname, "..", "..", "src-tauri", "data", "unit_database.json");

    let data: { stratagems?: Array<{ faction_id: string | null; detachment_id: string | null }> };
    try {
      data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    } catch {
      // If JSON file doesn't exist (CI environment), skip gracefully
      console.warn("unit_database.json not found — skipping real data assertion");
      return;
    }

    const universalStratagems = data.stratagems?.filter((s) => s.faction_id === null) ?? [];
    expect(universalStratagems.length).toBeGreaterThanOrEqual(1);

    // Every universal stratagem must have faction_id === null (not empty string)
    for (const s of universalStratagems) {
      expect(s.faction_id).toBeNull();
      // faction_id must not be empty string — that would be a bug
      expect(s.faction_id).not.toBe("");
    }
  });
});

// ---------------------------------------------------------------------------
// ENH-01: Enhancement CSV parsing
// ---------------------------------------------------------------------------

describe("ENH-01: Enhancement CSV parsing", () => {
  const ENHANCEMENT_CSV = [
    "faction_id|id|name|cost|detachment|detachment_id|legend|description",
    "SM|enh001|Bolter Discipline|25|Gladius Task Force|det001|0|<b>Enhancement desc</b>",
    "SM|enh002|Legends Enhancement|30|Gladius Task Force|det001|1|<b>Old enh</b>",
    "CSM|enh003|Dark Blessing|20|Black Legion|det002|0|<b>CSM enh</b>",
    "|enh004|No Faction Enhancement|15|Unknown|det003|0|<b>Should be skipped</b>",
    "NEC|enh005|Legend NEC Enh|10|Awakened|det004|true|<b>NEC legend</b>",
  ].join("\n");

  it("parses non-legend enhancements and excludes legends rows", () => {
    const rows = parseWahapediaCsv(ENHANCEMENT_CSV);
    const { enhancements, legendsSkipped } = transformEnhancements(rows);

    // 5 data rows: 2 legends (enh002 legend=1, enh005 legend=true), 1 skipped (no faction_id), 2 kept
    expect(legendsSkipped).toBe(2);
    expect(enhancements).toHaveLength(2);
  });

  it("skips rows without faction_id", () => {
    const rows = parseWahapediaCsv(ENHANCEMENT_CSV);
    const { enhancements } = transformEnhancements(rows);

    // enh004 has empty faction_id — must be skipped
    const noFactionEnh = enhancements.find((e) => e.id === "enh004");
    expect(noFactionEnh).toBeUndefined();
  });

  it("produces correct shape for each enhancement row", () => {
    const rows = parseWahapediaCsv(ENHANCEMENT_CSV);
    const { enhancements } = transformEnhancements(rows);

    const first = enhancements.find((e) => e.id === "enh001");
    expect(first).toBeDefined();
    expect(first!.id).toBe("enh001");
    expect(first!.faction_id).toBe("SM");
    expect(first!.detachment_id).toBe("det001");
    expect(first!.name).toBe("Bolter Discipline");
    expect(first!.cost).toBe(25);
    expect(first!.description).toBe("<b>Enhancement desc</b>");
  });

  it("parses cost as a number, not a string", () => {
    const rows = parseWahapediaCsv(ENHANCEMENT_CSV);
    const { enhancements } = transformEnhancements(rows);

    for (const e of enhancements) {
      expect(typeof e.cost).toBe("number");
    }
  });

  it("converts empty detachment_id to null for enhancements", () => {
    const csv = [
      "faction_id|id|name|cost|detachment|detachment_id|legend|description",
      "SM|enh_nodet|No Det Enh|10|Some Det||0|desc",
    ].join("\n");
    const rows = parseWahapediaCsv(csv);
    const { enhancements } = transformEnhancements(rows);

    expect(enhancements).toHaveLength(1);
    expect(enhancements[0].detachment_id).toBeNull();
  });

  it("all enhancements in real JSON have non-empty faction_id", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const jsonPath = path.join(__dirname, "..", "..", "src-tauri", "data", "unit_database.json");

    let data: { enhancements?: Array<{ faction_id: string }> };
    try {
      data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    } catch {
      console.warn("unit_database.json not found — skipping real data assertion");
      return;
    }

    const badEnhancements = data.enhancements?.filter((e) => !e.faction_id) ?? [];
    expect(badEnhancements).toHaveLength(0);

    // Verify we actually have enhancements to test
    expect(data.enhancements?.length).toBeGreaterThan(800);
  });
});
