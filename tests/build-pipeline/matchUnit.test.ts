// @vitest-environment node
/**
 * Gap 6 (DQ-05) -- Three-pass matching cascade behavioral tests.
 *
 * DQ-05: matchUnit implements exact -> normalized -> alias three-pass cascade.
 *
 * matchUnit is not exported from build-unit-db.ts, so we replicate the
 * algorithm here verbatim (same pattern as tests/scripts/updateUnitDatabase.test.ts).
 * The test validates the behavioral contract of the matching cascade.
 */
import { describe, it, expect } from "vitest";
import { normalizeName } from "../../scripts/lib/normalize.ts";

// ── Minimal UdbUnitRow matching the build script's type ──────────────────────

interface UdbUnitRow {
  id: string;
  faction_id: string;
  name: string;
  role: string;
  base_points: number | null;
  damaged_w: string;
  damaged_desc: string;
  sub_faction: string | null;
  name_fr: string | null;
}

// ── Replicated matchUnit algorithm (verbatim from build-unit-db.ts lines 135-162) ──

function matchUnit(
  bsdataName: string,
  factionId: string,
  aliases: Record<string, string>,
  unitMap: Map<string, UdbUnitRow>
): UdbUnitRow | undefined {
  // Pass 1: exact lowercase match
  const exactKey = bsdataName.toLowerCase() + ":" + factionId;
  let unit = unitMap.get(exactKey);
  if (unit) return unit;

  // Pass 2: normalized match
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

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeUnit(name: string, factionId: string, id: string = "u1"): UdbUnitRow {
  return {
    id,
    faction_id: factionId,
    name,
    role: "Battleline",
    base_points: 100,
    damaged_w: "",
    damaged_desc: "",
    sub_faction: null,
    name_fr: null,
  };
}

function buildMap(units: UdbUnitRow[]): Map<string, UdbUnitRow> {
  const map = new Map<string, UdbUnitRow>();
  for (const u of units) {
    map.set(u.name.toLowerCase() + ":" + u.faction_id, u);
  }
  return map;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("matchUnit: Pass 1 — exact lowercase match", () => {
  it("finds a unit by exact case-insensitive name and faction_id", () => {
    const unit = makeUnit("Intercessors", "SM");
    const map = buildMap([unit]);

    const result = matchUnit("Intercessors", "SM", {}, map);
    expect(result).toBe(unit);
  });

  it("matches regardless of BSData name capitalisation", () => {
    const unit = makeUnit("Intercessors", "SM");
    const map = buildMap([unit]);

    // BSData uses "INTERCESSORS" capitalization
    const result = matchUnit("INTERCESSORS", "SM", {}, map);
    expect(result).toBe(unit);
  });

  it("does NOT match a unit from a different faction", () => {
    const unit = makeUnit("Intercessors", "SM");
    const map = buildMap([unit]);

    const result = matchUnit("Intercessors", "GK", {}, map);
    expect(result).toBeUndefined();
  });

  it("returns undefined when no unit matches", () => {
    const map = buildMap([makeUnit("Intercessors", "SM")]);
    const result = matchUnit("Hellblasters", "SM", {}, map);
    expect(result).toBeUndefined();
  });
});

describe("matchUnit: Pass 2 — normalized match", () => {
  it("matches when BSData name has extra whitespace vs Wahapedia name", () => {
    // Wahapedia: "Intercessor Squad" — BSData: "Intercessor  Squad" (extra space)
    const unit = makeUnit("Intercessor Squad", "SM");
    const map = buildMap([unit]);

    const result = matchUnit("Intercessor  Squad", "SM", {}, map);
    expect(result).toBe(unit);
  });

  it("matches when BSData name has smart quote vs Wahapedia straight apostrophe", () => {
    // Wahapedia: "Emperor's Champion" — BSData: "Emperor’s Champion"
    const unit = makeUnit("Emperor's Champion", "SM");
    const map = buildMap([unit]);

    const result = matchUnit("Emperor’s Champion", "SM", {}, map);
    expect(result).toBe(unit);
  });

  it("matches when BSData name has trailing whitespace that normalization trims", () => {
    // Wahapedia: "Crisis Battlesuits" — BSData: "Crisis Battlesuits  " (trailing spaces)
    // normalizeName trims trailing whitespace so both normalize to "crisis battlesuits"
    const unit = makeUnit("Crisis Battlesuits", "TAU");
    const map = buildMap([unit]);

    const result = matchUnit("Crisis Battlesuits  ", "TAU", {}, map);
    expect(result).toBe(unit);
  });

  it("does NOT match normalized name across different factions", () => {
    const unit = makeUnit("Intercessor Squad", "SM");
    const map = buildMap([unit]);

    const result = matchUnit("Intercessor  Squad", "GK", {}, map);
    expect(result).toBeUndefined();
  });
});

describe("matchUnit: Pass 3 — alias table fallback", () => {
  it("matches via alias when exact and normalized both fail", () => {
    // Wahapedia: "Biovores" — BSData: "Biovore" (singular, not normalizable to same)
    const unit = makeUnit("Biovores", "TYR");
    const map = buildMap([unit]);
    const aliases = { "Biovore": "Biovores" };

    const result = matchUnit("Biovore", "TYR", aliases, map);
    expect(result).toBe(unit);
  });

  it("matches when alias maps to a different casing in the map key", () => {
    // Alias value lowercase should still match (aliasKey uses .toLowerCase())
    const unit = makeUnit("Mek Gunz", "ORK");
    const map = buildMap([unit]);
    const aliases = { "Mek Gun w/ Smasha gun": "Mek Gunz" };

    const result = matchUnit("Mek Gun w/ Smasha gun", "ORK", aliases, map);
    expect(result).toBe(unit);
  });

  it("returns undefined when alias key exists but target not in map", () => {
    const map = buildMap([makeUnit("Other Unit", "SM")]);
    const aliases = { "Missing Unit": "Also Missing" };

    const result = matchUnit("Missing Unit", "SM", aliases, map);
    expect(result).toBeUndefined();
  });

  it("returns undefined when no pass succeeds", () => {
    const map = buildMap([makeUnit("Intercessors", "SM")]);
    const result = matchUnit("Completely Unknown Unit", "SM", {}, map);
    expect(result).toBeUndefined();
  });
});

describe("matchUnit: cascade priority", () => {
  it("returns Pass 1 match without consulting alias even when alias exists", () => {
    const exactUnit = makeUnit("Biovores", "TYR", "exact-unit");
    const aliasUnit = makeUnit("Mucolid Spores", "TYR", "alias-unit");
    const map = buildMap([exactUnit, aliasUnit]);
    // Alias points to aliasUnit but exact match should win
    const aliases = { "Biovores": "Mucolid Spores" };

    const result = matchUnit("Biovores", "TYR", aliases, map);
    expect(result!.id).toBe("exact-unit");
  });
});
