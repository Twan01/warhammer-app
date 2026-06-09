/**
 * Phase 104 — BUI-05: applyUdbFilters pure filter function tests.
 *
 * Verifies AND logic, role filtering, keyword filtering (case-insensitive),
 * point range filtering, and null base_points handling.
 */
import { describe, it, expect } from "vitest";
import { applyUdbFilters, type UdbFiltersInput } from "@/features/unit-database/applyUdbFilters";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const UNITS: UdbUnitSummary[] = [
  { id: "u1", faction_id: "SM", name: "Intercessors", role: "Battleline", sub_faction: "Ultramarines", base_points: 80, min_models: 5, max_models: 10 },
  { id: "u2", faction_id: "SM", name: "Captain", role: "Character", sub_faction: null, base_points: 80, min_models: 1, max_models: 1 },
  { id: "u3", faction_id: "SM", name: "Eradicators", role: "Battleline", sub_faction: "Ultramarines", base_points: 95, min_models: 3, max_models: 6 },
  { id: "u4", faction_id: "SM", name: "Repulsor", role: "Transport", sub_faction: null, base_points: 200, min_models: 1, max_models: 1 },
  { id: "u5", faction_id: "SM", name: "Mystery Unit", role: "Epic Hero", sub_faction: "Dark Angels", base_points: null, min_models: null, max_models: null },
];

const NO_FILTER: UdbFiltersInput = {
  subFactionFilter: null,
  roleFilter: null,
  keywordFilter: "",
  pointMin: null,
  pointMax: null,
};

const KEYWORDS_MAP = new Map<string, string>([
  ["u1", "Infantry, Primaris, Tacticus"],
  ["u2", "Infantry, Character, Primaris"],
  ["u3", "Infantry, Primaris, Gravis"],
  ["u4", "Vehicle, Fly, Transport"],
  ["u5", "Infantry, Primaris"],
]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("applyUdbFilters", () => {
  it("returns all units when no filters are active", () => {
    const result = applyUdbFilters(UNITS, NO_FILTER);
    expect(result).toHaveLength(5);
    expect(result).toEqual(UNITS);
  });

  it("filters by role", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, roleFilter: "Battleline" });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.name)).toEqual(["Intercessors", "Eradicators"]);
  });

  it("filters by keyword case-insensitively", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, keywordFilter: "gravis" }, KEYWORDS_MAP);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Eradicators");
  });

  it("filters by pointMin", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, pointMin: 90 });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.name)).toEqual(["Eradicators", "Repulsor"]);
  });

  it("filters by pointMax", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, pointMax: 80 });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.name)).toEqual(["Intercessors", "Captain"]);
  });

  it("AND logic combining multiple filters", () => {
    const result = applyUdbFilters(
      UNITS,
      { subFactionFilter: null, roleFilter: "Battleline", keywordFilter: "tacticus", pointMin: null, pointMax: 90 },
      KEYWORDS_MAP,
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Intercessors");
  });

  it("handles null base_points — excluded by pointMin filter", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, pointMin: 50 });
    // Mystery Unit has null base_points — should be excluded
    expect(result.find((u) => u.id === "u5")).toBeUndefined();
    expect(result).toHaveLength(4);
  });

  it("handles null base_points — excluded by pointMax filter", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, pointMax: 300 });
    // Mystery Unit has null base_points — should be excluded
    expect(result.find((u) => u.id === "u5")).toBeUndefined();
    expect(result).toHaveLength(4);
  });

  it("keyword filter without keywordsMap excludes all units", () => {
    // When keywordsMap is not provided but keyword filter is set,
    // the keyword check returns false for all units (no map to match against)
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, keywordFilter: "Infantry" });
    expect(result).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Phase 109: Sub-faction filter tests
  // ---------------------------------------------------------------------------

  it("filters by subFactionFilter", () => {
    // After fix: sub-faction filter includes specific units AND generic (null sub_faction) units
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
    expect(result).toHaveLength(4);
    expect(result.map((u) => u.name)).toEqual(["Intercessors", "Captain", "Eradicators", "Repulsor"]);
  });

  it("subFactionFilter includes generic (null sub_faction) units", () => {
    // Dark Angels filter returns: Mystery Unit (Dark Angels specific) + Captain + Repulsor (generic null)
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Dark Angels" });
    expect(result).toHaveLength(3);
    expect(result.map((u) => u.name)).toEqual(["Captain", "Repulsor", "Mystery Unit"]);
  });

  it("subFactionFilter null returns all units", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: null });
    expect(result).toHaveLength(5);
  });

  it("AND logic with subFactionFilter and roleFilter", () => {
    const result = applyUdbFilters(UNITS, {
      ...NO_FILTER,
      subFactionFilter: "Ultramarines",
      roleFilter: "Battleline",
    });
    // After fix, Ultramarines filter includes generic (null) units, but no generic fixture has role Battleline -- count stays 2.
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.name)).toEqual(["Intercessors", "Eradicators"]);
  });

  it("subFactionFilter: includes sub-faction-specific AND null sub_faction units, excludes other sub-factions", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
    const names = result.map((u) => u.name);
    // Sub-faction-specific units included
    expect(names).toContain("Intercessors");
    expect(names).toContain("Eradicators");
    // Generic (null sub_faction) units included
    expect(names).toContain("Captain");
    expect(names).toContain("Repulsor");
    // Other sub-faction units excluded
    expect(names).not.toContain("Mystery Unit");
  });

  // Regression: Deathwing (Dark Angels) must not appear under Ultramarines
  it("excludes cross-chapter units — Deathwing must not appear under Ultramarines", () => {
    const smUnits: UdbUnitSummary[] = [
      { id: "sm01", faction_id: "SM", name: "Intercessor Squad", role: "Battleline", sub_faction: null, base_points: 80, min_models: 5, max_models: 10 },
      { id: "sm02", faction_id: "SM", name: "Calgar", role: "Character", sub_faction: "Ultramarines", base_points: 200, min_models: 1, max_models: 1 },
      { id: "sm03", faction_id: "SM", name: "Deathwing Knights", role: "Other", sub_faction: "Dark Angels", base_points: 235, min_models: 5, max_models: 10 },
      { id: "sm04", faction_id: "SM", name: "Deathwing Terminator Squad", role: "Other", sub_faction: "Dark Angels", base_points: 205, min_models: 5, max_models: 10 },
      { id: "sm05", faction_id: "SM", name: "Blood Claws", role: "Battleline", sub_faction: "Space Wolves", base_points: 110, min_models: 5, max_models: 15 },
      { id: "sm06", faction_id: "SM", name: "Bladeguard Veterans", role: "Other", sub_faction: null, base_points: 90, min_models: 3, max_models: 6 },
    ];

    const result = applyUdbFilters(smUnits, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
    const names = result.map((u) => u.name);

    // Ultramarines-specific unit included
    expect(names).toContain("Calgar");
    // Generic (null sub_faction) units included
    expect(names).toContain("Intercessor Squad");
    expect(names).toContain("Bladeguard Veterans");
    // Dark Angels units excluded
    expect(names).not.toContain("Deathwing Knights");
    expect(names).not.toContain("Deathwing Terminator Squad");
    // Space Wolves units excluded
    expect(names).not.toContain("Blood Claws");

    expect(result).toHaveLength(3);
  });

  // Regression: units with NULL sub_faction must pass through any sub-faction filter
  it("null sub_faction units always pass sub-faction filter (they are shared across chapters)", () => {
    const units: UdbUnitSummary[] = [
      { id: "g1", faction_id: "SM", name: "Generic Marine", role: "Battleline", sub_faction: null, base_points: 80, min_models: 5, max_models: 10 },
      { id: "g2", faction_id: "SM", name: "Specific Marine", role: "Battleline", sub_faction: "Iron Hands", base_points: 80, min_models: 5, max_models: 10 },
    ];

    for (const chapter of ["Ultramarines", "Dark Angels", "Space Wolves", "Iron Hands"]) {
      const result = applyUdbFilters(units, { ...NO_FILTER, subFactionFilter: chapter });
      expect(result.map((u) => u.name)).toContain("Generic Marine");
    }

    // Iron Hands filter should include both
    const ironHandsResult = applyUdbFilters(units, { ...NO_FILTER, subFactionFilter: "Iron Hands" });
    expect(ironHandsResult).toHaveLength(2);

    // Ultramarines filter should exclude Iron Hands-specific unit
    const umResult = applyUdbFilters(units, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
    expect(umResult).toHaveLength(1);
    expect(umResult[0].name).toBe("Generic Marine");
  });
});
