import { describe, it, expect } from "vitest";
import { applyStratagemFilters, STRATAGEM_PHASES } from "@/features/rules-hub/applyRulesHubFilters";
import type { RwStratagem } from "@/types/datasheet";

function makeStratagem(overrides: Partial<RwStratagem> = {}): RwStratagem {
  return {
    id: "s1",
    faction_id: "SM",
    name: "Test Stratagem",
    type: null,
    cp_cost: "1",
    legend: null,
    turn: null,
    phase: "Command",
    detachment: null,
    detachment_id: null,
    description: null,
    ...overrides,
  };
}

const STRATAGEMS: RwStratagem[] = [
  makeStratagem({ id: "s1", name: "Command Shroud", phase: "Command", cp_cost: "1", legend: "use in command phase" }),
  makeStratagem({ id: "s2", name: "Move Move Move", phase: "Movement", cp_cost: "2", legend: "advance further" }),
  makeStratagem({ id: "s3", name: "Rapid Fire", phase: "Shooting", cp_cost: "1", legend: "double shots" }),
  makeStratagem({ id: "s4", name: "Heroic Charge", phase: "Charge", cp_cost: "2", legend: null }),
  makeStratagem({ id: "s5", name: "Death Blow", phase: "Fight", cp_cost: "3", legend: "lethal strike" }),
  makeStratagem({ id: "s6", name: "Null Phase", phase: null, cp_cost: "1", legend: null }),
];

describe("applyStratagemFilters", () => {
  it("returns all stratagems when no filters are active", () => {
    const result = applyStratagemFilters(STRATAGEMS, { searchText: "", phaseFilter: null, cpFilter: null });
    expect(result).toHaveLength(STRATAGEMS.length);
  });

  it("filters by phase — keeps only Command stratagems", () => {
    const result = applyStratagemFilters(STRATAGEMS, { searchText: "", phaseFilter: "Command", cpFilter: null });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("filters by CP cost — keeps only cp_cost='1' stratagems", () => {
    const result = applyStratagemFilters(STRATAGEMS, { searchText: "", phaseFilter: null, cpFilter: "1" });
    expect(result.every((s) => s.cp_cost === "1")).toBe(true);
    expect(result.map((s) => s.id)).toEqual(expect.arrayContaining(["s1", "s3", "s6"]));
  });

  it("searches by name — case-insensitive", () => {
    const result = applyStratagemFilters(STRATAGEMS, { searchText: "rapid", phaseFilter: null, cpFilter: null });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s3");
  });

  it("searches by legend field — case-insensitive", () => {
    const result = applyStratagemFilters(STRATAGEMS, { searchText: "ADVANCE", phaseFilter: null, cpFilter: null });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s2");
  });

  it("combines phase and search filters — both must match", () => {
    const result = applyStratagemFilters(STRATAGEMS, { searchText: "double", phaseFilter: "Shooting", cpFilter: null });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s3");
  });

  it("combines phase and CP filters — both must match", () => {
    const result = applyStratagemFilters(STRATAGEMS, { searchText: "", phaseFilter: "Command", cpFilter: "1" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("returns empty array when no stratagems match filters", () => {
    const result = applyStratagemFilters(STRATAGEMS, { searchText: "", phaseFilter: "Fight", cpFilter: "1" });
    expect(result).toHaveLength(0);
  });

  it("STRATAGEM_PHASES contains all expected phases", () => {
    expect(STRATAGEM_PHASES).toEqual(["Command", "Movement", "Shooting", "Charge", "Fight"]);
  });
});
