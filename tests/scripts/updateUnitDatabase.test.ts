/**
 * Phase 107-02 -- DiffReport computation logic test.
 *
 * The computeDiff function in scripts/update-unit-database.ts is not exported,
 * so we replicate its pure algorithm here and test all 5 diff categories:
 * newUnits, removedUnits, pointsChanges, abilityChanges, keywordChanges.
 *
 * This validates the behavioral contract of the diff logic that the script
 * depends on for its human-readable update reports.
 */
import { describe, it, expect } from "vitest";

// ── Minimal types matching the script's internal interfaces ────────────────

interface UdbUnitRow {
  id: string;
  faction_id: string;
  name: string;
  role: string;
  base_points: number | null;
  damaged_w: string;
  damaged_desc: string;
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

interface UnitDatabaseJson {
  version: string;
  built_at: string;
  game_system: string;
  unit_count: number;
  faction_count: number;
  factions: Array<{ id: string; name: string; short_name: string }>;
  units: UdbUnitRow[];
  models: unknown[];
  weapons: unknown[];
  abilities: UdbUnitAbilityRow[];
  keywords: UdbUnitKeywordRow[];
  points: UdbUnitPointsRow[];
  composition: unknown[];
}

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

// ── Replicated computeDiff (exact algorithm from update-unit-database.ts) ──

function computeDiff(oldDb: UnitDatabaseJson, newDb: UnitDatabaseJson): DiffReport {
  const report: DiffReport = {
    newUnits: [],
    removedUnits: [],
    pointsChanges: [],
    abilityChanges: [],
    keywordChanges: [],
  };

  const oldUnits = new Map(oldDb.units.map((u) => [u.id, u]));
  const newUnits = new Map(newDb.units.map((u) => [u.id, u]));

  for (const [id, unit] of newUnits) {
    if (!oldUnits.has(id)) {
      report.newUnits.push({ id, name: unit.name, faction_id: unit.faction_id });
    }
  }

  for (const [id, unit] of oldUnits) {
    if (!newUnits.has(id)) {
      report.removedUnits.push({ id, name: unit.name, faction_id: unit.faction_id });
    }
  }

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
    if (!oldUnit) continue;

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

// ── Test helpers ───────────────────────────────────────────────────────────

function makeDb(overrides: Partial<UnitDatabaseJson> = {}): UnitDatabaseJson {
  return {
    version: "1.0",
    built_at: "2026-05-30",
    game_system: "Warhammer 40,000",
    unit_count: 0,
    faction_count: 0,
    factions: [],
    units: [],
    models: [],
    weapons: [],
    abilities: [],
    keywords: [],
    points: [],
    composition: [],
    ...overrides,
  };
}

function makeUnit(id: string, name: string, factionId: string = "SM", basePoints: number | null = 100): UdbUnitRow {
  return { id, faction_id: factionId, name, role: "Battleline", base_points: basePoints, damaged_w: "", damaged_desc: "" };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("computeDiff: newUnits", () => {
  it("detects units present in new but not old", () => {
    const oldDb = makeDb({ units: [makeUnit("U1", "Intercessors")] });
    const newDb = makeDb({ units: [makeUnit("U1", "Intercessors"), makeUnit("U2", "Hellblasters")] });

    const report = computeDiff(oldDb, newDb);
    expect(report.newUnits).toEqual([{ id: "U2", name: "Hellblasters", faction_id: "SM" }]);
  });

  it("returns empty when no new units", () => {
    const units = [makeUnit("U1", "Intercessors")];
    const report = computeDiff(makeDb({ units }), makeDb({ units }));
    expect(report.newUnits).toEqual([]);
  });
});

describe("computeDiff: removedUnits", () => {
  it("detects units present in old but not new", () => {
    const oldDb = makeDb({ units: [makeUnit("U1", "Intercessors"), makeUnit("U2", "Hellblasters")] });
    const newDb = makeDb({ units: [makeUnit("U1", "Intercessors")] });

    const report = computeDiff(oldDb, newDb);
    expect(report.removedUnits).toEqual([{ id: "U2", name: "Hellblasters", faction_id: "SM" }]);
  });
});

describe("computeDiff: pointsChanges", () => {
  it("detects base_points change", () => {
    const oldDb = makeDb({ units: [makeUnit("U1", "Intercessors", "SM", 100)] });
    const newDb = makeDb({ units: [makeUnit("U1", "Intercessors", "SM", 110)] });

    const report = computeDiff(oldDb, newDb);
    expect(report.pointsChanges).toHaveLength(1);
    expect(report.pointsChanges[0].oldPoints).toContain("base:100");
    expect(report.pointsChanges[0].newPoints).toContain("base:110");
  });

  it("detects tier change", () => {
    const unit = makeUnit("U1", "Intercessors", "SM", 100);
    const oldDb = makeDb({
      units: [unit],
      points: [{ unit_id: "U1", model_count: 5, points: 100 }],
    });
    const newDb = makeDb({
      units: [unit],
      points: [{ unit_id: "U1", model_count: 5, points: 120 }],
    });

    const report = computeDiff(oldDb, newDb);
    expect(report.pointsChanges).toHaveLength(1);
    expect(report.pointsChanges[0].newPoints).toContain("5m:120pts");
  });

  it("reports no change when points are identical", () => {
    const unit = makeUnit("U1", "Intercessors", "SM", 100);
    const pts = [{ unit_id: "U1", model_count: 5, points: 100 }];
    const report = computeDiff(
      makeDb({ units: [unit], points: pts }),
      makeDb({ units: [unit], points: pts }),
    );
    expect(report.pointsChanges).toEqual([]);
  });

  it("skips new units (not a points change)", () => {
    const oldDb = makeDb({ units: [] });
    const newDb = makeDb({
      units: [makeUnit("U1", "Intercessors", "SM", 100)],
      points: [{ unit_id: "U1", model_count: 5, points: 100 }],
    });

    const report = computeDiff(oldDb, newDb);
    expect(report.pointsChanges).toEqual([]);
    expect(report.newUnits).toHaveLength(1);
  });
});

describe("computeDiff: abilityChanges", () => {
  it("detects added and removed abilities", () => {
    const unit = makeUnit("U1", "Captain");
    const oldDb = makeDb({
      units: [unit],
      abilities: [
        { unit_id: "U1", line_order: 1, name: "Rites of Battle", description: "", ability_type: "core" },
        { unit_id: "U1", line_order: 2, name: "Iron Halo", description: "", ability_type: "core" },
      ],
    });
    const newDb = makeDb({
      units: [unit],
      abilities: [
        { unit_id: "U1", line_order: 1, name: "Rites of Battle", description: "", ability_type: "core" },
        { unit_id: "U1", line_order: 2, name: "Oath of Moment", description: "", ability_type: "core" },
      ],
    });

    const report = computeDiff(oldDb, newDb);
    expect(report.abilityChanges).toHaveLength(1);
    expect(report.abilityChanges[0].added).toEqual(["Oath of Moment"]);
    expect(report.abilityChanges[0].removed).toEqual(["Iron Halo"]);
  });

  it("reports nothing when abilities unchanged", () => {
    const unit = makeUnit("U1", "Captain");
    const abilities = [{ unit_id: "U1", line_order: 1, name: "Rites of Battle", description: "", ability_type: "core" }];
    const report = computeDiff(
      makeDb({ units: [unit], abilities }),
      makeDb({ units: [unit], abilities }),
    );
    expect(report.abilityChanges).toEqual([]);
  });
});

describe("computeDiff: keywordChanges", () => {
  it("detects added and removed keywords", () => {
    const unit = makeUnit("U1", "Captain");
    const oldDb = makeDb({
      units: [unit],
      keywords: [
        { unit_id: "U1", keyword: "Character", is_faction: 0 },
        { unit_id: "U1", keyword: "Infantry", is_faction: 0 },
      ],
    });
    const newDb = makeDb({
      units: [unit],
      keywords: [
        { unit_id: "U1", keyword: "Character", is_faction: 0 },
        { unit_id: "U1", keyword: "Monster", is_faction: 0 },
      ],
    });

    const report = computeDiff(oldDb, newDb);
    expect(report.keywordChanges).toHaveLength(1);
    expect(report.keywordChanges[0].added).toEqual(["Monster"]);
    expect(report.keywordChanges[0].removed).toEqual(["Infantry"]);
  });

  it("reports nothing when keywords unchanged", () => {
    const unit = makeUnit("U1", "Captain");
    const kws = [{ unit_id: "U1", keyword: "Character", is_faction: 0 as const }];
    const report = computeDiff(
      makeDb({ units: [unit], keywords: kws }),
      makeDb({ units: [unit], keywords: kws }),
    );
    expect(report.keywordChanges).toEqual([]);
  });
});

describe("computeDiff: comprehensive", () => {
  it("handles empty databases with no changes", () => {
    const report = computeDiff(makeDb(), makeDb());
    expect(report.newUnits).toEqual([]);
    expect(report.removedUnits).toEqual([]);
    expect(report.pointsChanges).toEqual([]);
    expect(report.abilityChanges).toEqual([]);
    expect(report.keywordChanges).toEqual([]);
  });

  it("tracks multiple change types simultaneously", () => {
    const existingUnit = makeUnit("U1", "Captain", "SM", 100);
    const oldDb = makeDb({
      units: [existingUnit, makeUnit("U2", "Scouts", "SM", 65)],
      keywords: [{ unit_id: "U1", keyword: "Infantry", is_faction: 0 }],
    });
    const newDb = makeDb({
      units: [
        makeUnit("U1", "Captain", "SM", 120), // points change
        makeUnit("U3", "Eliminators", "SM", 95), // new unit
      ],
      keywords: [
        { unit_id: "U1", keyword: "Infantry", is_faction: 0 },
        { unit_id: "U1", keyword: "Gravis", is_faction: 0 }, // keyword added
      ],
    });

    const report = computeDiff(oldDb, newDb);
    expect(report.newUnits).toHaveLength(1);
    expect(report.removedUnits).toHaveLength(1);
    expect(report.pointsChanges).toHaveLength(1);
    expect(report.keywordChanges).toHaveLength(1);
  });
});
