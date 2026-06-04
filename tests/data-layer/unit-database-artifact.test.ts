// @vitest-environment node

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const JSON_PATH = join(__dirname, "../../src-tauri/data/unit_database.json");

function loadDb(): Record<string, unknown> {
  const raw = readFileSync(JSON_PATH, "utf-8");
  return JSON.parse(raw);
}

describe("DAS-01: unit_database.json artifact structure", () => {
  const db = loadDb();

  it("has all required top-level keys", () => {
    const requiredKeys = [
      "version",
      "built_at",
      "game_system",
      "unit_count",
      "faction_count",
      "factions",
      "units",
      "models",
      "weapons",
      "abilities",
      "keywords",
      "points",
      "composition",
      "detachments",
      "detachment_abilities",
    ];
    for (const key of requiredKeys) {
      expect(db).toHaveProperty(key);
    }
  });

  it("version is a non-empty string", () => {
    expect(typeof db.version).toBe("string");
    expect((db.version as string).length).toBeGreaterThan(0);
  });

  it("game_system is '40k-10th'", () => {
    expect(db.game_system).toBe("40k-10th");
  });
});

describe("DAS-04: data completeness", () => {
  const db = loadDb();
  const factions = db.factions as { id: string; name: string }[];
  const units = db.units as { id: string; faction_id: string; name: string }[];

  it("faction_count >= 20", () => {
    expect(db.faction_count).toBeGreaterThanOrEqual(20);
    expect(factions.length).toBeGreaterThanOrEqual(20);
  });

  it("unit_count >= 100", () => {
    expect(db.unit_count).toBeGreaterThanOrEqual(100);
    expect(units.length).toBeGreaterThanOrEqual(100);
  });

  it("every faction has at least 1 unit", () => {
    const unitsByFaction = new Map<string, number>();
    for (const u of units) {
      unitsByFaction.set(u.faction_id, (unitsByFaction.get(u.faction_id) ?? 0) + 1);
    }

    const emptyFactions: string[] = [];
    for (const f of factions) {
      if (!unitsByFaction.has(f.id) || unitsByFaction.get(f.id)! < 1) {
        emptyFactions.push(`${f.id} (${f.name})`);
      }
    }
    expect(emptyFactions, `Factions with no units: ${emptyFactions.join(", ")}`).toHaveLength(0);
  });

  it("no unit has an empty faction_id", () => {
    const badUnits = units.filter(
      (u) => u.faction_id === "" || u.faction_id === null || u.faction_id === undefined,
    );
    expect(badUnits, `Units with empty faction_id: ${badUnits.map((u) => u.id).join(", ")}`).toHaveLength(0);
  });
});

describe("DAS-05: points tiers with model_count brackets", () => {
  const db = loadDb();
  const points = db.points as { unit_id: string; model_count: number; points: number }[];

  it("points array has at least 50 entries", () => {
    expect(points.length).toBeGreaterThanOrEqual(50);
  });

  it("every points entry has unit_id, model_count, and points fields", () => {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      expect(p.unit_id, `points[${i}] missing unit_id`).toBeDefined();
      expect(p.unit_id, `points[${i}] empty unit_id`).not.toBe("");
      expect(p.model_count, `points[${i}] missing model_count`).toBeDefined();
      expect(p.points, `points[${i}] missing points`).toBeDefined();
    }
  });

  it("model_count values are positive integers", () => {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      expect(Number.isInteger(p.model_count), `points[${i}].model_count=${p.model_count} is not integer`).toBe(true);
      expect(p.model_count, `points[${i}].model_count=${p.model_count} not positive`).toBeGreaterThan(0);
    }
  });

  it("points values are positive integers", () => {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      expect(Number.isInteger(p.points), `points[${i}].points=${p.points} is not integer`).toBe(true);
      expect(p.points, `points[${i}].points=${p.points} not positive`).toBeGreaterThan(0);
    }
  });
});

describe("DAS-06: composition data (min/max models)", () => {
  const db = loadDb();
  const composition = db.composition as { unit_id: string; min_models: number; max_models: number }[];

  it("composition array has at least 10 entries", () => {
    expect(composition.length).toBeGreaterThanOrEqual(10);
  });

  it("every composition entry with unit_id has valid fields", () => {
    const valid = composition.filter(c => c.unit_id);
    expect(valid.length).toBeGreaterThan(0);
    for (let i = 0; i < valid.length; i++) {
      const c = valid[i];
      expect(c.unit_id, `composition[${i}] empty unit_id`).not.toBe("");
      expect(c.min_models, `composition[${i}] missing min_models`).toBeDefined();
      expect(c.max_models, `composition[${i}] missing max_models`).toBeDefined();
    }
  });

  it("min_models <= max_models for all entries", () => {
    const violations: string[] = [];
    for (let i = 0; i < composition.length; i++) {
      const c = composition[i];
      if (c.min_models > c.max_models) {
        violations.push(`composition[${i}] unit=${c.unit_id}: min=${c.min_models} > max=${c.max_models}`);
      }
    }
    expect(violations, `min > max violations:\n${violations.join("\n")}`).toHaveLength(0);
  });
});

describe("DET-01: detachments array structure", () => {
  const db = loadDb();
  const detachments = db.detachments as { id: string; faction_id: string; name: string }[];

  it("detachments array has at least 200 entries", () => {
    expect(Array.isArray(detachments)).toBe(true);
    expect(detachments.length).toBeGreaterThanOrEqual(200);
  });

  it("every detachment has non-empty string id, faction_id, and name fields", () => {
    const violations: string[] = [];
    for (let i = 0; i < detachments.length; i++) {
      const d = detachments[i];
      if (typeof d.id !== "string" || d.id === "") {
        violations.push(`detachments[${i}] missing or empty id`);
      }
      if (typeof d.faction_id !== "string" || d.faction_id === "") {
        violations.push(`detachments[${i}] (id=${d.id}) missing or empty faction_id`);
      }
      if (typeof d.name !== "string" || d.name === "") {
        violations.push(`detachments[${i}] (id=${d.id}) missing or empty name`);
      }
    }
    expect(violations, `Field violations:\n${violations.join("\n")}`).toHaveLength(0);
  });
});

describe("DET-02: detachment_abilities array structure", () => {
  const db = loadDb();
  const abilities = db.detachment_abilities as {
    id: string;
    detachment_id: string;
    faction_id: string;
    name: string;
    description: string | null;
  }[];

  it("detachment_abilities array has at least 200 entries", () => {
    expect(Array.isArray(abilities)).toBe(true);
    expect(abilities.length).toBeGreaterThanOrEqual(200);
  });

  it("every detachment_ability has non-empty string id, detachment_id, faction_id, and name fields", () => {
    const violations: string[] = [];
    for (let i = 0; i < abilities.length; i++) {
      const a = abilities[i];
      if (typeof a.id !== "string" || a.id === "") {
        violations.push(`detachment_abilities[${i}] missing or empty id`);
      }
      if (typeof a.detachment_id !== "string" || a.detachment_id === "") {
        violations.push(`detachment_abilities[${i}] (id=${a.id}) missing or empty detachment_id`);
      }
      if (typeof a.faction_id !== "string" || a.faction_id === "") {
        violations.push(`detachment_abilities[${i}] (id=${a.id}) missing or empty faction_id`);
      }
      if (typeof a.name !== "string" || a.name === "") {
        violations.push(`detachment_abilities[${i}] (id=${a.id}) missing or empty name`);
      }
    }
    expect(violations, `Field violations:\n${violations.join("\n")}`).toHaveLength(0);
  });

  it("every detachment_ability has a description field (may be null or empty)", () => {
    const violations: string[] = [];
    for (let i = 0; i < abilities.length; i++) {
      const a = abilities[i];
      if (!Object.prototype.hasOwnProperty.call(a, "description")) {
        violations.push(`detachment_abilities[${i}] (id=${a.id}) has no description property`);
      }
    }
    expect(violations, `Missing description property:\n${violations.join("\n")}`).toHaveLength(0);
  });
});

describe("DET-01: detachment FK integrity — every detachment.faction_id exists in factions", () => {
  const db = loadDb();
  const factions = db.factions as { id: string; name: string }[];
  const detachments = db.detachments as { id: string; faction_id: string; name: string }[];

  it("every detachment faction_id references a known faction", () => {
    const factionIds = new Set(factions.map((f) => f.id));
    const violations: string[] = [];
    for (let i = 0; i < detachments.length; i++) {
      const d = detachments[i];
      if (!factionIds.has(d.faction_id)) {
        violations.push(`detachments[${i}] id=${d.id} name="${d.name}" has unknown faction_id="${d.faction_id}"`);
      }
    }
    expect(violations, `FK violations:\n${violations.join("\n")}`).toHaveLength(0);
  });
});
