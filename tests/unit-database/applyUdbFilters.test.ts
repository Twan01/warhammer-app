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
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Ultramarines" });
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.name)).toEqual(["Intercessors", "Eradicators"]);
  });

  it("subFactionFilter excludes units with null sub_faction", () => {
    const result = applyUdbFilters(UNITS, { ...NO_FILTER, subFactionFilter: "Dark Angels" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Mystery Unit");
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
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.name)).toEqual(["Intercessors", "Eradicators"]);
  });
});
