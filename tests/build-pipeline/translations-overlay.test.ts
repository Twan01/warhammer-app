// @vitest-environment node
/**
 * FR-02: French translation overlay loading and application tests.
 *
 * Tests the loadTranslationsFr() function behavior and overlay application logic
 * for the build-unit-db.ts pipeline step 10.5.
 *
 * Since loadTranslationsFr() is an internal function (not separately exported),
 * we test the overlay loading and application logic directly using the
 * TranslationsFrOverlay type and matching behavior patterns.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { TranslationsFrOverlay } from "../../scripts/lib/types.ts";

// ---------------------------------------------------------------------------
// Helper: simulate loadTranslationsFr logic (mirrors build-unit-db.ts)
// The function itself is not exported, so we replicate the logic here.
// ---------------------------------------------------------------------------

function loadTranslationsFrFromPath(filePath: string): TranslationsFrOverlay | null {
  if (!existsSync(filePath)) {
    console.warn("WARNING: translations_fr.json not found — _fr fields will be null");
    return null;
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as TranslationsFrOverlay;
  } catch (e) {
    console.warn("WARNING: Failed to parse translations_fr.json:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const VALID_OVERLAY: TranslationsFrOverlay = {
  factions: {
    SM: "Space Marines",
    NEC: "Necrons",
  },
  units: {
    "000000001": "Unité française",
  },
  abilities: {
    "000000001:Strike Hard": {
      name_fr: "Frapper Fort",
      description_fr: "Description en français.",
    },
  },
  weapons: {
    "000000001:Bolt Rifle": "Fusil Bolter",
  },
  keywords: {
    INFANTRY: "INFANTERIE",
    CHARACTER: "PERSONNAGE",
  },
};

// ---------------------------------------------------------------------------
// loadTranslationsFr: loading behavior
// ---------------------------------------------------------------------------

describe("loadTranslationsFr: overlay loading", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), "hobbyforge-fr-test-" + Date.now());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns overlay object when file exists and is valid JSON", () => {
    const filePath = join(tmpDir, "translations_fr.json");
    writeFileSync(filePath, JSON.stringify(VALID_OVERLAY), "utf-8");

    const result = loadTranslationsFrFromPath(filePath);

    expect(result).not.toBeNull();
    expect(result?.factions?.SM).toBe("Space Marines");
    expect(result?.keywords?.INFANTRY).toBe("INFANTERIE");
  });

  it("returns null when file is missing", () => {
    const result = loadTranslationsFrFromPath(join(tmpDir, "nonexistent.json"));
    expect(result).toBeNull();
  });

  it("returns null when file contains malformed JSON", () => {
    const filePath = join(tmpDir, "translations_fr.json");
    writeFileSync(filePath, "{ this is not valid json }", "utf-8");

    const result = loadTranslationsFrFromPath(filePath);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Overlay application logic: faction, unit, ability, weapon, keyword
// ---------------------------------------------------------------------------

describe("overlay application: faction rows", () => {
  it("sets name_fr on faction rows when overlay has a matching key", () => {
    const factions: Array<{ id: string; name: string; short_name: string; name_fr: string | null }> = [
      { id: "SM", name: "Space Marines", short_name: "SM", name_fr: null },
      { id: "NEC", name: "Necrons", short_name: "NEC", name_fr: null },
    ];
    const overlay: TranslationsFrOverlay = {
      factions: { SM: "Space Marines", NEC: "Nécrons" },
    };

    for (const f of factions) {
      if (overlay.factions?.[f.id]) f.name_fr = overlay.factions[f.id];
    }

    expect(factions[0].name_fr).toBe("Space Marines");
    expect(factions[1].name_fr).toBe("Nécrons");
  });

  it("leaves name_fr as null when there is no overlay match", () => {
    const factions: Array<{ id: string; name: string; short_name: string; name_fr: string | null }> = [
      { id: "ORK", name: "Orks", short_name: "ORK", name_fr: null },
    ];
    const overlay: TranslationsFrOverlay = { factions: { SM: "Space Marines" } };

    for (const f of factions) {
      if (overlay.factions?.[f.id]) f.name_fr = overlay.factions[f.id];
    }

    expect(factions[0].name_fr).toBeNull();
  });
});

describe("overlay application: unit rows", () => {
  it("sets name_fr on unit rows when overlay has a matching unit id", () => {
    const units: Array<{
      id: string;
      faction_id: string;
      name: string;
      role: string;
      base_points: number | null;
      damaged_w: string;
      damaged_desc: string;
      sub_faction: string | null;
      name_fr: string | null;
    }> = [
      {
        id: "000000001",
        faction_id: "SM",
        name: "Intercessors",
        role: "Battleline",
        base_points: 80,
        damaged_w: "",
        damaged_desc: "",
        sub_faction: null,
        name_fr: null,
      },
    ];
    const overlay: TranslationsFrOverlay = { units: { "000000001": "Intercesseurs" } };

    for (const u of units) {
      if (overlay.units?.[u.id]) u.name_fr = overlay.units[u.id];
    }

    expect(units[0].name_fr).toBe("Intercesseurs");
  });

  it("leaves name_fr as null when no overlay match", () => {
    const units: Array<{
      id: string;
      faction_id: string;
      name: string;
      role: string;
      base_points: number | null;
      damaged_w: string;
      damaged_desc: string;
      sub_faction: string | null;
      name_fr: string | null;
    }> = [
      {
        id: "000000002",
        faction_id: "SM",
        name: "Unknown Unit",
        role: "Other",
        base_points: null,
        damaged_w: "",
        damaged_desc: "",
        sub_faction: null,
        name_fr: null,
      },
    ];
    const overlay: TranslationsFrOverlay = { units: { "000000001": "Intercesseurs" } };

    for (const u of units) {
      if (overlay.units?.[u.id]) u.name_fr = overlay.units[u.id];
    }

    expect(units[0].name_fr).toBeNull();
  });
});

describe("overlay application: ability rows", () => {
  it("sets name_fr and description_fr when composite key matches", () => {
    const abilities: Array<{
      unit_id: string;
      line_order: number;
      name: string;
      description: string;
      ability_type: string;
      name_fr: string | null;
      description_fr: string | null;
    }> = [
      {
        unit_id: "000000001",
        line_order: 1,
        name: "Strike Hard",
        description: "Hit roll bonus.",
        ability_type: "Datasheet",
        name_fr: null,
        description_fr: null,
      },
    ];
    const overlay: TranslationsFrOverlay = {
      abilities: {
        "000000001:Strike Hard": {
          name_fr: "Frapper Fort",
          description_fr: "Bonus au jet de touche.",
        },
      },
    };

    for (const a of abilities) {
      const key = `${a.unit_id}:${a.name}`;
      const t = overlay.abilities?.[key];
      if (t) {
        a.name_fr = t.name_fr ?? null;
        a.description_fr = t.description_fr ?? null;
      }
    }

    expect(abilities[0].name_fr).toBe("Frapper Fort");
    expect(abilities[0].description_fr).toBe("Bonus au jet de touche.");
  });
});

describe("overlay application: weapon rows", () => {
  it("sets name_fr when composite weapon key matches", () => {
    const weapons: Array<{
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
      name_fr: string | null;
    }> = [
      {
        unit_id: "000000001",
        weapon_group: 1,
        line_order: 1,
        name: "Bolt Rifle",
        category: "Ranged",
        range: "24",
        attacks: "2",
        skill: "3",
        strength: "4",
        ap: "0",
        damage: "1",
        keywords: "",
        name_fr: null,
      },
    ];
    const overlay: TranslationsFrOverlay = {
      weapons: { "000000001:Bolt Rifle": "Fusil Bolter" },
    };

    for (const w of weapons) {
      const key = `${w.unit_id}:${w.name}`;
      if (overlay.weapons?.[key]) w.name_fr = overlay.weapons[key];
    }

    expect(weapons[0].name_fr).toBe("Fusil Bolter");
  });
});

describe("overlay application: keyword rows", () => {
  it("sets keyword_fr when keyword matches", () => {
    const keywords: Array<{
      unit_id: string;
      keyword: string;
      is_faction: 0 | 1;
      keyword_fr: string | null;
    }> = [
      { unit_id: "000000001", keyword: "INFANTRY", is_faction: 0, keyword_fr: null },
      { unit_id: "000000001", keyword: "CHARACTER", is_faction: 0, keyword_fr: null },
      { unit_id: "000000001", keyword: "FLY", is_faction: 0, keyword_fr: null },
    ];
    const overlay: TranslationsFrOverlay = {
      keywords: { INFANTRY: "INFANTERIE", CHARACTER: "PERSONNAGE" },
    };

    for (const k of keywords) {
      if (overlay.keywords?.[k.keyword]) k.keyword_fr = overlay.keywords[k.keyword];
    }

    expect(keywords[0].keyword_fr).toBe("INFANTERIE");
    expect(keywords[1].keyword_fr).toBe("PERSONNAGE");
    expect(keywords[2].keyword_fr).toBeNull(); // FLY not in overlay
  });
});

// ---------------------------------------------------------------------------
// TranslationsFrOverlay type shape validation
// ---------------------------------------------------------------------------

describe("TranslationsFrOverlay: type shape", () => {
  it("accepts an overlay with all sections defined", () => {
    const overlay: TranslationsFrOverlay = VALID_OVERLAY;
    expect(overlay.factions).toBeDefined();
    expect(overlay.units).toBeDefined();
    expect(overlay.abilities).toBeDefined();
    expect(overlay.weapons).toBeDefined();
    expect(overlay.keywords).toBeDefined();
  });

  it("accepts an overlay with only some sections (all sections are optional)", () => {
    const partial: TranslationsFrOverlay = { factions: { SM: "Space Marines" } };
    expect(partial.factions?.SM).toBe("Space Marines");
    expect(partial.units).toBeUndefined();
  });

  it("accepts an ability entry with null name_fr and description_fr", () => {
    const overlay: TranslationsFrOverlay = {
      abilities: {
        "unit-1:Some Ability": { name_fr: null, description_fr: null },
      },
    };
    expect(overlay.abilities?.["unit-1:Some Ability"]?.name_fr).toBeNull();
    expect(overlay.abilities?.["unit-1:Some Ability"]?.description_fr).toBeNull();
  });
});
